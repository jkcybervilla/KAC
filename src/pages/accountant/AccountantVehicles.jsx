import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Plus, Search, X, Eye, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const styles = {
  container: {
    padding: '16px',
    maxWidth: '100%',
    fontFamily: 'Inter, sans-serif',
    color: 'var(--text)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  projectName: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--muted)',
    margin: '2px 0 0 0',
    fontWeight: 400,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  statCard: (bg, textColor) => ({
    background: bg,
    borderRadius: '12px',
    padding: '14px 12px',
    textAlign: 'center',
  }),
  statNumber: (color) => ({
    fontSize: '26px',
    fontWeight: '800',
    color: color,
    lineHeight: 1.1,
    marginBottom: 4,
  }),
  statLabel: (color) => ({
    fontSize: '11px',
    fontWeight: 600,
    color: color,
    opacity: 0.8,
    letterSpacing: '0.3px',
  }),
  toolbar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--surface-2)',
    borderRadius: '10px',
    padding: '0 14px',
    border: '1px solid var(--border)',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: 'var(--text)',
    width: '100%',
    padding: '12px 0',
    fontFamily: 'Inter, sans-serif',
  },
  addBtn: {
    background: '#0055ff',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '0 18px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    fontFamily: 'Inter, sans-serif',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    overflowX: 'auto',
    paddingBottom: 4,
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
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
    transition: 'all 0.15s ease',
  }),
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: 'var(--surface-2)',
    borderRadius: '10px 10px 0 0',
    borderBottom: '2px solid var(--border)',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  listBody: {
    borderRadius: '0 0 10px 10px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    borderTop: 'none',
  },
  vehicleRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    transition: 'background 0.15s ease',
  },
  slCol: {
    width: '36px',
    fontSize: '12px',
    color: 'var(--muted)',
    fontWeight: 500,
    flexShrink: 0,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  vehicleName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  vehicleMeta: {
    fontSize: '12px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  numberCol: {
    width: '130px',
    flexShrink: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    textAlign: 'center',
  },
  dateCol: {
    width: '90px',
    flexShrink: 0,
    fontSize: '12px',
    color: 'var(--muted)',
    textAlign: 'center',
  },
  rateCol: {
    width: '80px',
    flexShrink: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    textAlign: 'center',
  },
  statusCol: {
    width: '90px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  eyeCol: {
    width: '40px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
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
  }),
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--muted)',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    transition: 'all 0.15s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--muted)',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    borderRadius: '0 0 10px 10px',
    border: '1px solid var(--border)',
    borderTop: 'none',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--muted)',
    fontSize: '14px',
  },
};

const STATUS_COLORS = {
  APPROVED: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  PENDING: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  REJECTED: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  default: { bg: 'var(--surface-2)', text: 'var(--muted)', border: 'var(--border)' },
};

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
    <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</span>
  </div>
);

const modalOverlay = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 9999, padding: '16px',
};

const modalBox = {
  backgroundColor: 'var(--surface)', color: 'var(--text)', padding: '24px',
  borderRadius: '16px', width: '100%', maxWidth: '520px',
  border: '1px solid var(--border-strong)', maxHeight: '90vh', overflowY: 'auto',
};

const formInput = {
  width: '100%', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)',
  padding: '11px', borderRadius: '8px', color: 'var(--text)', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box',
};

const EMPTY_FORM = {
  vehicleName: '',
  vehicleNumber: '',
  joinDate: '',
  ratePerDay: '',
};

const AccountantVehicles = ({ projectName }) => {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const load = useCallback(async () => {
    try {
      const vSnap = await getDocs(query(collection(db, 'vehicles'), orderBy('createdAt', 'desc')));
      const all = vSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVehicles(all.filter((v) => v.project === projectName || v.createdBy === profile?.uid));
      setLoading(false);
    } catch (err) {
      console.error('Error loading vehicles:', err);
      setLoading(false);
    }
  }, [projectName, profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Format vehicle number to uppercase XX-00-XX-0000
  const formatVehicleNumber = (value) => {
    let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += '-' + cleaned.substring(2, 4);
    if (cleaned.length > 4) formatted += '-' + cleaned.substring(4, 6);
    if (cleaned.length > 6) formatted += '-' + cleaned.substring(6, 10);
    return formatted;
  };

  const handleFormChange = (field, value) => {
    if (field === 'vehicleNumber') {
      value = formatVehicleNumber(value);
      if (value.replace(/-/g, '').length > 10) return; // max 10 alphanumeric chars
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.vehicleName.trim()) {
      alert('Vehicle Name is required.');
      return;
    }
    if (!form.vehicleNumber.trim()) {
      alert('Vehicle Number is required.');
      return;
    }
    if (!form.joinDate) {
      alert('Join Date is required.');
      return;
    }
    if (!form.ratePerDay || parseFloat(form.ratePerDay) <= 0) {
      alert('Rate Per Day must be a positive number.');
      return;
    }

    try {
      await addDoc(collection(db, 'vehicles'), {
        vehicleName: form.vehicleName.trim().toUpperCase(),
        vehicleNumber: form.vehicleNumber.trim(),
        joinDate: form.joinDate,
        ratePerDay: parseFloat(form.ratePerDay),
        project: projectName,
        status: 'PENDING',
        createdBy: profile?.email || profile?.uid || '',
        createdByName: profile?.name || '',
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
      });

      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
      alert('Vehicle added successfully! Waiting for admin approval.');
    } catch (err) {
      alert('Error adding vehicle: ' + err.message);
    }
  };

  const openDetails = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = vehicles.length;
    const approved = vehicles.filter((v) => v.status === 'APPROVED').length;
    const pending = vehicles.filter((v) => v.status === 'PENDING').length;
    return { total, approved, pending };
  }, [vehicles]);

  // Filtered data
  const filteredVehicles = useMemo(() => {
    let data = vehicles;
    if (activeFilter !== 'ALL') {
      data = data.filter((v) => v.status === activeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter((v) =>
        (v.vehicleName || '').toLowerCase().includes(q) ||
        (v.vehicleNumber || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [vehicles, activeFilter, searchText]);

  const getStatusStyle = (status) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.default;
    return styles.statusBadge(s.bg, s.text, s.border);
  };

  if (!projectName) return <p style={styles.loadingState}>Select a project from the header.</p>;
  if (loading) return <p style={styles.loadingState}>Loading...</p>;

  const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div style={styles.container}>
      {/* Stats Row */}
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

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            placeholder="Search by vehicle name or number..."
            style={styles.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" style={styles.addBtn} onClick={() => { setShowModal(true); setForm(EMPTY_FORM); }}>
          <Plus size={16} /> ADD VEHICLE
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {filters.map((f) => (
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

      {/* List Header */}
      <div style={styles.listHeader}>
        <span style={styles.slCol}>SL</span>
        <span style={styles.nameCol}>Vehicle Name · {filteredVehicles.length} vehicles</span>
        <span style={styles.numberCol}>Number</span>
        <span style={styles.dateCol}>Join Date</span>
        <span style={styles.rateCol}>Rate/Day</span>
        <span style={styles.statusCol}>Status</span>
        <span style={styles.eyeCol}>
          <Eye size={14} />
        </span>
      </div>

      {/* List Body */}
      <div style={styles.listBody}>
        {filteredVehicles.length === 0 ? (
          <div style={styles.emptyState}>
            {searchText ? 'No vehicles match your search.' : 'No vehicles found. Add your first vehicle!'}
          </div>
        ) : (
          filteredVehicles.map((vehicle, idx) => (
            <div key={vehicle.id} style={styles.vehicleRow}>
              {/* SL Number */}
              <span style={styles.slCol}>{idx + 1}</span>

              {/* Vehicle Name */}
              <div style={styles.nameCol}>
                <div style={styles.vehicleName}>{vehicle.vehicleName || '—'}</div>
                <div style={styles.vehicleMeta}>
                  Added by {vehicle.createdByName || vehicle.createdBy || '—'}
                </div>
              </div>

              {/* Vehicle Number */}
              <span style={styles.numberCol}>{vehicle.vehicleNumber || '—'}</span>

              {/* Join Date */}
              <span style={styles.dateCol}>{vehicle.joinDate || '—'}</span>

              {/* Rate / Day */}
              <span style={styles.rateCol}>₹{vehicle.ratePerDay || 0}</span>

              {/* Status Badge */}
              <div style={styles.statusCol}>
                <span style={getStatusStyle(vehicle.status)}>
                  {vehicle.status || 'PENDING'}
                </span>
              </div>

              {/* Eye Button */}
              <div style={styles.eyeCol}>
                <button
                  type="button"
                  title="View Details"
                  style={styles.eyeBtn}
                  onClick={() => openDetails(vehicle)}
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showModal && (
        <div style={modalOverlay} onClick={() => setShowModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={18} color="#0055ff" /> Add Vehicle
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Vehicle Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Vehicle Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TATA TRUCK"
                  style={formInput}
                  value={form.vehicleName}
                  onChange={(e) => handleFormChange('vehicleName', e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Vehicle Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="XX-00-XX-0000"
                  style={{ ...formInput, textTransform: 'uppercase' }}
                  value={form.vehicleNumber}
                  onChange={(e) => handleFormChange('vehicleNumber', e.target.value)}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 2, display: 'block' }}>
                  Format: XX-00-XX-0000 (e.g. HR-55-AB-1234)
                </span>
              </div>

              {/* Join Date */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Join Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  style={formInput}
                  value={form.joinDate}
                  onChange={(e) => handleFormChange('joinDate', e.target.value)}
                  required
                />
              </div>

              {/* Rate Per Day */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Rate Per Day (₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  min="1"
                  step="0.01"
                  style={formInput}
                  value={form.ratePerDay}
                  onChange={(e) => handleFormChange('ratePerDay', e.target.value)}
                  required
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                style={{
                  background: '#0055ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  marginTop: 4,
                }}
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedVehicle && (
        <div style={modalOverlay} onClick={() => { setShowDetailsModal(false); setSelectedVehicle(null); }}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={18} color="#0055ff" /> Vehicle Details
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => { setShowDetailsModal(false); setSelectedVehicle(null); }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <DetailRow label="Vehicle Name" value={selectedVehicle.vehicleName} />
              <DetailRow label="Vehicle Number" value={selectedVehicle.vehicleNumber} />
              <DetailRow label="Join Date" value={selectedVehicle.joinDate} />
              <DetailRow label="Rate Per Day" value={`₹${selectedVehicle.ratePerDay || 0}`} />
              <DetailRow label="Status" value={selectedVehicle.status || 'PENDING'} />
              <DetailRow label="Project" value={selectedVehicle.project} />
              <DetailRow label="Added By" value={selectedVehicle.createdByName || selectedVehicle.createdBy || '—'} />
              <DetailRow label="Added On" value={
                selectedVehicle.createdAt
                  ? new Date(selectedVehicle.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '—'
              } />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantVehicles;