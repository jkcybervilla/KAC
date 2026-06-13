import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { ArrowLeft, Check, X, Search, Truck, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  APPROVED: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  PENDING: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  default: { bg: 'var(--surface-2)', text: 'var(--muted)', border: 'var(--border)' },
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif',
    color: 'var(--text)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  statCard: (bg, textColor) => ({
    background: bg,
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  }),
  statNumber: (color) => ({
    fontSize: '28px',
    fontWeight: '800',
    color: color,
    lineHeight: 1.1,
    marginBottom: 4,
  }),
  statLabel: (color) => ({
    fontSize: '12px',
    fontWeight: 600,
    color: color,
    opacity: 0.8,
  }),
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--surface-2)',
    borderRadius: '10px',
    padding: '0 14px',
    border: '1px solid var(--border)',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text)',
    padding: '12px 0',
    fontFamily: 'Inter, sans-serif',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    overflowX: 'auto',
  },
  filterChip: (active) => ({
    padding: '8px 18px',
    borderRadius: '20px',
    border: active ? '2px solid #0055ff' : '2px solid var(--border)',
    background: active ? 'var(--accent-soft)' : 'var(--surface)',
    color: active ? '#0055ff' : 'var(--muted)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'Inter, sans-serif',
  }),
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  th: {
    padding: '12px 14px',
    backgroundColor: 'var(--surface-2)',
    borderBottom: '2px solid var(--border)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'left',
  },
  td: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px',
    color: 'var(--text)',
    backgroundColor: 'var(--surface)',
  },
  statusBadge: (bg, text, borderColor) => ({
    background: bg,
    color: text,
    border: `1px solid ${borderColor}`,
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    letterSpacing: '0.3px',
    display: 'inline-block',
  }),
  actionBtn: (bg, color) => ({
    background: bg,
    color: color,
    border: `1px solid ${color}30`,
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginRight: 6,
    transition: 'all 0.15s ease',
  }),
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--muted)',
    fontSize: '14px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--muted)',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, padding: '16px',
  },
  modalBox: {
    backgroundColor: 'var(--surface)', color: 'var(--text)', padding: '24px',
    borderRadius: '16px', width: '100%', maxWidth: '520px',
    border: '1px solid var(--border-strong)', maxHeight: '90vh', overflowY: 'auto',
  },
  detailRow: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid var(--border)',
  },
  detailLabel: { color: 'var(--muted)', fontSize: 13 },
  detailValue: { color: 'var(--text)', fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' },
};

const VehicleManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    try {
      const vSnap = await getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc')));
      const all = vSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVehicles(all);
      setLoading(false);
    } catch (err) {
      console.error('Error loading vehicles:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approveVehicle = useCallback(async (vehicle) => {
    const confirmed = window.confirm(`Approve vehicle "${vehicle.vehicleName}" (${vehicle.vehicleNumber})?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'APPROVED' });

      await addDoc(collection(db, 'notifications'), {
        type: 'VEHICLE_APPROVED',
        message: `Vehicle "${vehicle.vehicleName}" (${vehicle.vehicleNumber}) has been approved.`,
        workerName: vehicle.vehicleName,
        empId: vehicle.vehicleNumber,
        project: vehicle.project || '',
        performedBy: profile?.name || profile?.email || 'ADMIN',
        recipientRole: 'accountant',
        recipientProject: vehicle.project || '',
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      });

      alert('Vehicle approved successfully!');
      load();
    } catch (err) {
      alert('Error approving vehicle: ' + err.message);
    }
  }, [profile, load]);

  const rejectVehicle = useCallback(async (vehicle) => {
    const confirmed = window.confirm(`Reject vehicle "${vehicle.vehicleName}" (${vehicle.vehicleNumber})?`);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'REJECTED' });

      await addDoc(collection(db, 'notifications'), {
        type: 'VEHICLE_REJECTED',
        message: `Vehicle "${vehicle.vehicleName}" (${vehicle.vehicleNumber}) has been rejected.`,
        workerName: vehicle.vehicleName,
        empId: vehicle.vehicleNumber,
        project: vehicle.project || '',
        performedBy: profile?.name || profile?.email || 'ADMIN',
        recipientRole: 'accountant',
        recipientProject: vehicle.project || '',
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      });

      alert('Vehicle rejected.');
      load();
    } catch (err) {
      alert('Error rejecting vehicle: ' + err.message);
    }
  }, [profile, load]);

  const setPendingVehicle = useCallback(async (vehicle) => {
    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'PENDING' });
      load();
    } catch (err) {
      alert('Error setting vehicle to pending: ' + err.message);
    }
  }, [load]);

  const openDetails = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetails(true);
  }, []);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const approved = vehicles.filter((v) => v.status === 'APPROVED').length;
    const pending = vehicles.filter((v) => v.status === 'PENDING').length;
    const rejected = vehicles.filter((v) => v.status === 'REJECTED').length;
    return { total, approved, pending, rejected };
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    let data = vehicles;
    if (activeFilter !== 'ALL') {
      data = data.filter((v) => v.status === activeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter((v) =>
        (v.vehicleName || '').toLowerCase().includes(q) ||
        (v.vehicleNumber || '').toLowerCase().includes(q) ||
        (v.project || '').toLowerCase().includes(q) ||
        (v.createdByName || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [vehicles, activeFilter, searchText]);

  const getStatusStyle = (status) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.default;
    return styles.statusBadge(s.bg, s.text, s.border);
  };

  if (loading) return <div style={styles.loadingState}>Loading vehicles...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={styles.title}>
            VEHICLE <span style={{ color: '#0055ff' }}>MANAGEMENT</span>
          </h2>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard('rgba(0,85,255,0.1)', '#0055ff')}>
          <div style={styles.statNumber('#0055ff')}>{stats.total}</div>
          <div style={styles.statLabel('#0055ff')}>Total</div>
        </div>
        <div style={styles.statCard('rgba(34,197,94,0.12)', '#22c55e')}>
          <div style={styles.statNumber('#22c55e')}>{stats.approved}</div>
          <div style={styles.statLabel('#22c55e')}>Approved</div>
        </div>
        <div style={styles.statCard('rgba(245,158,11,0.15)', '#f59e0b')}>
          <div style={styles.statNumber('#f59e0b')}>{stats.pending}</div>
          <div style={styles.statLabel('#f59e0b')}>Pending</div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchBox}>
        <Search size={16} color="var(--muted)" />
        <input
          type="text"
          placeholder="Search by vehicle name, number, project, or added by..."
          style={styles.searchInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
          <button
            key={f}
            type="button"
            style={styles.filterChip(activeFilter === f)}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredVehicles.length === 0 ? (
        <div style={styles.emptyState}>
          {searchText ? 'No vehicles match your search.' : 'No vehicles found.'}
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>SL</th>
              <th style={styles.th}>Vehicle Name</th>
              <th style={styles.th}>Vehicle Number</th>
              <th style={styles.th}>Join Date</th>
              <th style={styles.th}>Rate/Day</th>
              <th style={styles.th}>Project</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.map((vehicle, idx) => (
              <tr key={vehicle.id}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{vehicle.vehicleName || '—'}</td>
                <td style={styles.td}>{vehicle.vehicleNumber || '—'}</td>
                <td style={styles.td}>{vehicle.joinDate || '—'}</td>
                <td style={styles.td}>₹{vehicle.ratePerDay || 0}</td>
                <td style={styles.td}>{vehicle.project || '—'}</td>
                <td style={styles.td}>
                  <span style={getStatusStyle(vehicle.status)}>
                    {vehicle.status || 'PENDING'}
                  </span>
                </td>
                <td style={styles.td}>
                  {/* Approve button */}
                  <button
                    type="button"
                    style={styles.actionBtn('rgba(34,197,94,0.12)', '#22c55e')}
                    onClick={() => approveVehicle(vehicle)}
                    disabled={vehicle.status === 'APPROVED'}
                  >
                    <Check size={12} /> Approve
                  </button>
                  {/* Reject button */}
                  <button
                    type="button"
                    style={styles.actionBtn('rgba(239,68,68,0.12)', '#ef4444')}
                    onClick={() => rejectVehicle(vehicle)}
                    disabled={vehicle.status === 'REJECTED'}
                  >
                    <X size={12} /> Reject
                  </button>
                  {/* Details button */}
                  <button
                    type="button"
                    style={styles.actionBtn('rgba(0,85,255,0.1)', '#0055ff')}
                    onClick={() => openDetails(vehicle)}
                  >
                    <Eye size={12} /> Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Details Modal */}
      {showDetails && selectedVehicle && (
        <div style={styles.modalOverlay} onClick={() => { setShowDetails(false); setSelectedVehicle(null); }}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={18} color="#0055ff" /> Vehicle Details
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => { setShowDetails(false); setSelectedVehicle(null); }} />
            </div>

            <div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Vehicle Name</span>
                <span style={styles.detailValue}>{selectedVehicle.vehicleName}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Vehicle Number</span>
                <span style={styles.detailValue}>{selectedVehicle.vehicleNumber}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Join Date</span>
                <span style={styles.detailValue}>{selectedVehicle.joinDate}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Rate Per Day</span>
                <span style={styles.detailValue}>₹{selectedVehicle.ratePerDay || 0}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status</span>
                <span style={styles.detailValue}>{selectedVehicle.status || 'PENDING'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Project</span>
                <span style={styles.detailValue}>{selectedVehicle.project || '—'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Added By</span>
                <span style={styles.detailValue}>{selectedVehicle.createdByName || selectedVehicle.createdBy || '—'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Added On</span>
                <span style={styles.detailValue}>
                  {selectedVehicle.createdAt
                    ? new Date(selectedVehicle.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            </div>

            {/* Action buttons in details modal */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              {selectedVehicle.status !== 'APPROVED' && (
                <button
                  type="button"
                  style={{
                    background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
                    padding: '10px 20px', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onClick={() => { approveVehicle(selectedVehicle); setShowDetails(false); setSelectedVehicle(null); }}
                >
                  <Check size={14} /> Approve
                </button>
              )}
              {selectedVehicle.status !== 'REJECTED' && (
                <button
                  type="button"
                  style={{
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                    padding: '10px 20px', fontWeight: 700, fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onClick={() => { rejectVehicle(selectedVehicle); setShowDetails(false); setSelectedVehicle(null); }}
                >
                  <X size={14} /> Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;