import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserPlus, Search, X, Check, Clock, Eye, ChevronLeft, ChevronRight, SkipForward, User, CreditCard, Camera, Pencil } from 'lucide-react';
import PhotoUpload from '../../components/PhotoUpload';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../utils/notifications';
import { nextSerial } from '../../utils/serial';

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
  bellBtn: {
    background: 'var(--surface-2)',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--muted)',
    flexShrink: 0,
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
  workerRow: {
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
  workerName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  workerMeta: {
    fontSize: '12px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  statusCol: {
    width: '80px',
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

const EMPTY = {
  REFFERENCE: '',
  WORKER_NAME: '',
  FATHER_NAME: '',
  DESIGNATION: 'LABOUR',
  DOB: '',
  MOBILE_NO: '',
  AADHAR_NO: '',
  PHOTO: '',
  AADHAR_PHOTO: '',
  AADHAR_BACK_PHOTO: '',
  JOINING_DATE_CLIENT: '',
  JOINING_DATE_OFFICE: '',
  ADDRESS: '',
  PAN_NO: '',
  PAN_PHOTO: '',
  BANK: '',
  ACCOUNT_NO: '',
  IFSC: '',
  BANK_PHOTO: '',
};

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

const AccountantWorkerRegistration = ({ projectName, autoOpenModal, onAutoOpened }) => {
  const { profile, isAccountant } = useAuth();
  const [rows, setRows] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [openStatusRow, setOpenStatusRow] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [statusDropdownId, setStatusDropdownId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showEditForm, setShowEditForm] = useState(false);
  const dropdownRef = useRef(null);

  // Auto-open modal when triggered from dashboard shortcut
  useEffect(() => {
    if (autoOpenModal) {
      setShowModal(true);
      setCurrentStep(0);
      setForm(EMPTY);
      if (onAutoOpened) onAutoOpened();
    }
  }, [autoOpenModal, onAutoOpened]);

  const load = useCallback(async () => {
    const [rSnap, wSnap, vSnap] = await Promise.all([
      getDocs(query(collection(db, 'worker_requests'), orderBy('SLNO', 'asc'))),
      getDocs(collection(db, 'workers')),
      getDocs(collection(db, 'vendors')),
    ]);
    const all = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setRows(all.filter((r) => r.REQUESTED_BY === profile?.uid || r.PROJECT === projectName));
    setWorkers(wSnap.docs.map((d) => d.data()));
    setVendors(vSnap.docs.map((d) => ({ id: d.id, vendorName: d.data().vendorName || '' })));
    setLoading(false);
  }, [profile, projectName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (form.AADHAR_NO.length === 12) {
      const exist = workers.find((w) => String(w.AADHAR_NO) === String(form.AADHAR_NO));
      if (exist) {
        setForm((prev) => ({
          ...prev,
          WORKER_NAME: exist.WORKER_NAME || prev.WORKER_NAME,
          FATHER_NAME: exist.FATHER_NAME || prev.FATHER_NAME,
          DESIGNATION: exist.DESIGNATION || prev.DESIGNATION,
          DOB: exist.DOB || prev.DOB,
          MOBILE_NO: exist.MOBILE_NO || prev.MOBILE_NO,
          ADDRESS: exist.ADDRESS || prev.ADDRESS,
          PAN_NO: exist.PAN_NO || prev.PAN_NO,
          BANK: exist.BANK || prev.BANK,
          ACCOUNT_NO: exist.ACCOUNT_NO || prev.ACCOUNT_NO,
          IFSC: exist.IFSC || prev.IFSC,
        }));
      }
    }
  }, [form.AADHAR_NO, workers]);

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const approveRequest = useCallback(async (row) => {
    const exist = workers.find((w) => String(w.AADHAR_NO) === String(row.AADHAR_NO));
    const slno = exist ? exist.SLNO : nextSerial(workers, 'SLNO');
    const empid = exist ? exist.EMPID : `KAC${String(slno).padStart(4, '0')}`;

    if (!exist) {
      await addDoc(collection(db, 'workers'), {
        SLNO: slno,
        EMPID: empid,
        REFFERENCE: row.REFFERENCE || '',
        WORKER_NAME: row.WORKER_NAME,
        FATHER_NAME: row.FATHER_NAME || '',
        DESIGNATION: row.DESIGNATION || 'LABOUR',
        DOB: row.DOB || '',
        MOBILE_NO: row.MOBILE_NO || '',
        AADHAR_NO: row.AADHAR_NO,
        JOINING_DATE_CLIENT: row.JOINING_DATE_CLIENT || '',
        JOINING_DATE_OFFICE: row.JOINING_DATE_OFFICE || '',
        ADDRESS: row.ADDRESS || '',
        PAN_NO: row.PAN_NO || '',
        PAN_PHOTO: row.PAN_PHOTO || '',
        BANK: row.BANK || '',
        ACCOUNT_NO: row.ACCOUNT_NO || '',
        IFSC: row.IFSC || '',
        BANK_PHOTO: row.BANK_PHOTO || '',
        PROJECT: row.PROJECT || '',
        STATUS: 'ACTIVE',
        timestamp: new Date(),
      });
    }

    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'APPROVED', EMPID: empid });

    await createNotification({
      type: 'WORKER_ADDED',
      message: `New worker "${row.WORKER_NAME}" has been approved and added to the register.`,
      workerName: row.WORKER_NAME,
      empId: empid,
      project: row.PROJECT || '',
      performedBy: profile?.name || profile?.email || 'ACCOUNTANT',
    });

    alert(`Approved — EMP ID: ${empid}`);
    setStatusDropdownId(null);
    load();
  }, [workers, profile, load]);

  const rejectRequest = useCallback(async (row) => {
    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'REJECTED' });
    await createNotification({
      type: 'WORKER_REJECTED',
      message: `Worker request for "${row.WORKER_NAME}" has been rejected.`,
      workerName: row.WORKER_NAME,
      empId: row.EMPID || '',
      project: row.PROJECT || '',
      performedBy: profile?.name || profile?.email || 'ACCOUNTANT',
    });
    alert('Request rejected.');
    setStatusDropdownId(null);
    setOpenStatusRow(null);
    load();
  }, [profile, load]);

  const setPendingRequest = useCallback(async (row) => {
    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'PENDING' });
    setStatusDropdownId(null);
    setOpenStatusRow(null);
    load();
  }, [load]);

  const openDetails = useCallback((row) => {
    setSelectedWorker(row);
    setShowEditForm(false);
    setEditForm({
      WORKER_NAME: row.WORKER_NAME || '',
      FATHER_NAME: row.FATHER_NAME || '',
      AADHAR_NO: row.AADHAR_NO || '',
      DESIGNATION: row.DESIGNATION || 'LABOUR',
      REFFERENCE: row.REFFERENCE || '',
      JOINING_DATE_CLIENT: row.JOINING_DATE_CLIENT || '',
      JOINING_DATE_OFFICE: row.JOINING_DATE_OFFICE || '',
      CLOSE_DATE: row.CLOSE_DATE || '',
      PHOTO: row.PHOTO || '',
      DOB: row.DOB || '',
      MOBILE_NO: row.MOBILE_NO || '',
      ADDRESS: row.ADDRESS || '',
      PAN_NO: row.PAN_NO || '',
      PAN_PHOTO: row.PAN_PHOTO || '',
      BANK: row.BANK || '',
      ACCOUNT_NO: row.ACCOUNT_NO || '',
      IFSC: row.IFSC || '',
      BANK_PHOTO: row.BANK_PHOTO || '',
      AADHAR_PHOTO: row.AADHAR_PHOTO || '',
    });
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorker) return;
    try {
      const payload = {
        ...editForm,
        STATUS: 'PENDING',
        updatedAt: Timestamp.now(),
        updatedBy: profile?.uid || '',
        updatedByName: profile?.name || profile?.email || 'ACCOUNTANT',
      };
      await updateDoc(doc(db, 'worker_requests', selectedWorker.id), payload);
      setShowEditModal(false);
      setSelectedWorker(null);
      setEditForm({});
      load();
      alert('Worker updated. Sent for admin approval.');
    } catch (err) {
      alert('Error updating worker: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.JOINING_DATE_CLIENT && !form.JOINING_DATE_OFFICE) {
      alert('At least one joining date (Client or Office) is required.');
      return;
    }
    const slno = nextSerial(rows, 'SLNO');
    await addDoc(collection(db, 'worker_requests'), {
      ...form,
      SLNO: slno,
      PROJECT: projectName,
      STATUS: 'PENDING',
      REQUESTED_BY: profile.uid,
      REQUESTED_BY_NAME: profile.name,
      SOURCE: 'ACCOUNTANT',
      timestamp: new Date(),
    });
    setShowModal(false);
    setForm(EMPTY);
    setCurrentStep(0);
    load();
    alert('Worker request submitted for approval.');
  };

  // Filtered and searched data
  const filteredRows = useMemo(() => {
    let data = rows;
    if (activeFilter !== 'ALL') {
      data = data.filter((r) => r.STATUS === activeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      data = data.filter((r) =>
        (r.WORKER_NAME || '').toLowerCase().includes(q) ||
        (r.EMPID || '').toLowerCase().includes(q) ||
        (r.FATHER_NAME || '').toLowerCase().includes(q)
      );
    }
    return data;
  }, [rows, activeFilter, searchText]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const approved = rows.filter((r) => r.STATUS === 'APPROVED').length;
    const pending = rows.filter((r) => r.STATUS === 'PENDING').length;
    return { total, approved, pending };
  }, [rows]);

  const getStatusStyle = (status) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.default;
    return styles.statusBadge(s.bg, s.text, s.border);
  };

  const isStatusOpen = (id) => statusDropdownId === id;

  // Wizard navigation
  const handleNextStep = () => {
    if (currentStep === 0) {
      if (!form.REFFERENCE) {
        alert('Please select a vendor (reference).');
        return;
      }
      if (!form.JOINING_DATE_CLIENT && !form.JOINING_DATE_OFFICE) {
        alert('At least one joining date (Client or Office) is required.');
        return;
      }
    }
    if (currentStep === 1) {
      if (!form.AADHAR_NO || form.AADHAR_NO.length !== 12) {
        alert('Please enter a valid 12-digit Aadhaar number.');
        return;
      }
      if (!form.WORKER_NAME) {
        alert('Please enter the worker name.');
        return;
      }
      if (!form.FATHER_NAME) {
        alert('Please enter the father name.');
        return;
      }
      if (!form.DOB) {
        alert('Please select date of birth.');
        return;
      }
      if (!form.MOBILE_NO) {
        alert('Please enter phone number.');
        return;
      }
      if (!form.ADDRESS) {
        alert('Please enter the address.');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkipStep = () => {
    setCurrentStep(3);
  };

  const handleWizardSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  const inputBase = {
    width: '100%',
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border)',
    padding: '11px',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--muted)',
    marginBottom: '4px',
    display: 'block',
  };

  const steps = [
    { label: 'Joining', icon: 'Building' },
    { label: 'Personal', icon: 'User' },
    { label: 'Bank', icon: 'CreditCard' },
    { label: 'Photos', icon: 'Camera' },
  ];

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
            placeholder="Search by name, EMP ID or father name..."
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
        <button type="button" style={styles.addBtn} onClick={() => { setShowModal(true); setCurrentStep(0); setForm(EMPTY); }}>
          <UserPlus size={16} /> Add
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
        <span style={styles.nameCol}>Name · {filteredRows.length} workers</span>
        <span style={styles.statusCol}>Status</span>
        <span style={styles.eyeCol}>
          <Eye size={14} />
        </span>
      </div>

      {/* List Body */}
      <div style={styles.listBody}>
        {filteredRows.length === 0 ? (
          <div style={styles.emptyState}>
            {searchText ? 'No workers match your search.' : 'No workers found.'}
          </div>
        ) : (
          filteredRows.map((row, idx) => {
            const isOpen = isStatusOpen(row.id);

            return (
              <div key={row.id} style={styles.workerRow}>
                {/* SL Number */}
                <span style={styles.slCol}>{row.SLNO || idx + 1}</span>

                {/* Name + Meta */}
                <div style={styles.nameCol}>
                  <div style={styles.workerName}>{row.WORKER_NAME || '—'}</div>
                  <div style={styles.workerMeta}>
                    {row.EMPID && `${row.EMPID} · `}{row.FATHER_NAME || ''}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={styles.statusCol}>
                  <span style={getStatusStyle(row.STATUS)}>
                    {row.STATUS || 'PENDING'}
                  </span>
                </div>

                {/* Eye + Status Dropdown */}
                <div style={{ ...styles.eyeCol, position: 'relative', flexDirection: 'column', gap: 0 }}>
                  
                  <button
                    type="button"
                    title="View Details"
                    style={{
                      ...styles.eyeBtn,
                      background: 'transparent',
                    }}
                    onClick={() => openDetails(row)}
                  >
                    <Eye size={15} />
                  </button>

                  {/* Status Dropdown */}
                  {isOpen && isAccountant && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '4px',
                        zIndex: 1000,
                        minWidth: '120px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: '#22c55e',
                          fontWeight: 600,
                          width: '100%',
                          borderRadius: 6,
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={() => { approveRequest(row); }}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: '#f59e0b',
                          fontWeight: 600,
                          width: '100%',
                          borderRadius: 6,
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={() => { setPendingRequest(row); }}
                      >
                        <Clock size={14} /> Pending
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          color: '#ef4444',
                          fontWeight: 600,
                          width: '100%',
                          borderRadius: 6,
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={() => { rejectRequest(row); }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal - Details + Edit */}
      {showEditModal && selectedWorker && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: '500px' }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Worker details</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!showEditForm && (
                  <button
                    type="button"
                    onClick={() => setShowEditForm(true)}
                    style={{
                      background: 'var(--accent-soft)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: '#0055ff', fontWeight: 600, fontSize: '12px',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }}
                  onClick={() => { setShowEditModal(false); setSelectedWorker(null); setEditForm({}); setShowEditForm(false); }} />
              </div>
            </div>

            {/* Read-only details view (profile card) */}
            {!showEditForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {selectedWorker.PHOTO && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <img src={selectedWorker.PHOTO} alt="Worker"
                      style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} />
                  </div>
                )}
                <DetailRow label="Name" value={selectedWorker.WORKER_NAME} />
                <DetailRow label="EMP ID" value={selectedWorker.EMPID} />
                <DetailRow label="Aadhaar No" value={selectedWorker.AADHAR_NO} />
                <DetailRow label="Designation" value={selectedWorker.DESIGNATION} />
                <DetailRow label="Father Name" value={selectedWorker.FATHER_NAME} />
                <DetailRow label="Joining Date (Client)" value={selectedWorker.JOINING_DATE_CLIENT} />
                <DetailRow label="Joining Date (Office)" value={selectedWorker.JOINING_DATE_OFFICE} />
                <DetailRow label="Close Date" value={selectedWorker.CLOSE_DATE} />
                <DetailRow label="Phone" value={selectedWorker.MOBILE_NO} />
                <DetailRow label="Address" value={selectedWorker.ADDRESS} />
                <DetailRow label="PAN No" value={selectedWorker.PAN_NO} />
                <DetailRow label="Bank" value={selectedWorker.BANK} />
                <DetailRow label="Account No" value={selectedWorker.ACCOUNT_NO} />
                <DetailRow label="IFSC" value={selectedWorker.IFSC} />
                <DetailRow label="Reference" value={selectedWorker.REFFERENCE} />
                <div style={{ marginTop: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {selectedWorker.AADHAR_PHOTO && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Aadhaar Photo</div>
                      <img src={selectedWorker.AADHAR_PHOTO} alt="Aadhaar" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                  {selectedWorker.PAN_PHOTO && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>PAN Photo</div>
                      <img src={selectedWorker.PAN_PHOTO} alt="PAN" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                  {selectedWorker.BANK_PHOTO && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Bank Photo</div>
                      <img src={selectedWorker.BANK_PHOTO} alt="Bank" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Edit form (shown below details when Edit is clicked) */}
            {showEditForm && (
              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <PhotoUpload label="PHOTO" value={editForm.PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, PHOTO: val })} folder="worker-photos" aspect={1} />

                <input
                  placeholder="NAME"
                  style={{
                    ...formInput,
                    ...(editForm.WORKER_NAME ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}
                  value={editForm.WORKER_NAME}
                  onChange={(e) => setEditForm({ ...editForm, WORKER_NAME: e.target.value.toUpperCase() })}
                  disabled={!!editForm.WORKER_NAME}
                  readOnly={!!editForm.WORKER_NAME}
                />
                <input
                  placeholder="FATHER NAME"
                  style={{
                    ...formInput,
                    ...(editForm.FATHER_NAME ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}
                  value={editForm.FATHER_NAME}
                  onChange={(e) => setEditForm({ ...editForm, FATHER_NAME: e.target.value.toUpperCase() })}
                  disabled={!!editForm.FATHER_NAME}
                  readOnly={!!editForm.FATHER_NAME}
                />
                <input
                  placeholder="AADHAAR NO"
                  style={{
                    ...formInput,
                    ...(editForm.AADHAR_NO ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}
                  value={editForm.AADHAR_NO}
                  onChange={(e) => setEditForm({ ...editForm, AADHAR_NO: e.target.value })}
                  disabled={!!editForm.AADHAR_NO}
                  readOnly={!!editForm.AADHAR_NO}
                />
                <select
                  style={{
                    ...formInput,
                    ...(editForm.DESIGNATION ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}
                  value={editForm.DESIGNATION}
                  onChange={(e) => setEditForm({ ...editForm, DESIGNATION: e.target.value })}
                  disabled={!!editForm.DESIGNATION}
                >
                  <option value="LABOUR">LABOUR</option>
                  <option value="SKILLED">SKILLED</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                </select>

                {!editForm.DOB && (
                  <input type="date" placeholder="DOB" style={formInput}
                    value={editForm.DOB} onChange={(e) => setEditForm({ ...editForm, DOB: e.target.value })} />
                )}
                {!editForm.MOBILE_NO && (
                  <input placeholder="MOBILE NO" style={formInput}
                    value={editForm.MOBILE_NO} onChange={(e) => setEditForm({ ...editForm, MOBILE_NO: e.target.value })} />
                )}
                {!editForm.REFFERENCE && (
                  <input placeholder="REFERENCE" style={formInput}
                    value={editForm.REFFERENCE} onChange={(e) => setEditForm({ ...editForm, REFFERENCE: e.target.value })} />
                )}
                {!editForm.JOINING_DATE_CLIENT && (
                  <input type="date" placeholder="JOINING DATE (CLIENT)" style={formInput}
                    value={editForm.JOINING_DATE_CLIENT} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_CLIENT: e.target.value })} />
                )}
                {!editForm.JOINING_DATE_OFFICE && (
                  <input type="date" placeholder="JOINING DATE (OFFICE)" style={formInput}
                    value={editForm.JOINING_DATE_OFFICE} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_OFFICE: e.target.value })} />
                )}
                {!editForm.CLOSE_DATE && (
                  <input type="date" placeholder="CLOSE DATE" style={formInput}
                    value={editForm.CLOSE_DATE} onChange={(e) => setEditForm({ ...editForm, CLOSE_DATE: e.target.value })} />
                )}
                {!editForm.ADDRESS && (
                  <input placeholder="ADDRESS" style={formInput}
                    value={editForm.ADDRESS} onChange={(e) => setEditForm({ ...editForm, ADDRESS: e.target.value })} />
                )}
                {!editForm.PAN_NO && (
                  <input placeholder="PAN NO (optional)" style={formInput}
                    value={editForm.PAN_NO} onChange={(e) => setEditForm({ ...editForm, PAN_NO: e.target.value })} />
                )}
                {!editForm.BANK && (
                  <input placeholder="BANK (optional)" style={formInput}
                    value={editForm.BANK} onChange={(e) => setEditForm({ ...editForm, BANK: e.target.value })} />
                )}
                {!editForm.ACCOUNT_NO && (
                  <input placeholder="ACCOUNT NO (optional)" style={formInput}
                    value={editForm.ACCOUNT_NO} onChange={(e) => setEditForm({ ...editForm, ACCOUNT_NO: e.target.value })} />
                )}
                {!editForm.IFSC && (
                  <input placeholder="IFSC (optional)" style={formInput}
                    value={editForm.IFSC} onChange={(e) => setEditForm({ ...editForm, IFSC: e.target.value })} />
                )}

                {!editForm.AADHAR_PHOTO && (
                  <PhotoUpload label="AADHAAR PHOTO" value={editForm.AADHAR_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, AADHAR_PHOTO: val })} folder="aadhaar-photos" aspect={1.4} />
                )}
                {!editForm.PAN_PHOTO && (
                  <PhotoUpload label="PAN PHOTO (optional)" value={editForm.PAN_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, PAN_PHOTO: val })} folder="pan-photos" aspect={1.4} />
                )}
                {!editForm.BANK_PHOTO && (
                  <PhotoUpload label="BANK PHOTO (optional)" value={editForm.BANK_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, BANK_PHOTO: val })} folder="bank-photos" aspect={1.4} />
                )}

                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  Fields with existing data are pre-filled and read-only. Fill in the blank fields above.
                  On save, worker status will reset to <strong>PENDING</strong> for admin approval.
                </div>
                <button type="submit" style={{
                  backgroundColor: '#0055ff', color: '#fff', border: 'none',
                  padding: '14px', borderRadius: '8px', fontWeight: 700,
                  cursor: 'pointer', marginTop: '4px', fontSize: '13px', fontFamily: 'Inter, sans-serif',
                }}>Update</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Worker Modal — 4-Step Wizard */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>ADD WORKER</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setShowModal(false); setCurrentStep(0); }} />
            </div>

            {/* Stepper */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '24px', padding: '0 4px',
            }}>
              {steps.map((step, idx) => (
                <React.Fragment key={idx}>
                  {/* Step Circle + Label */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    flex: idx < steps.length - 1 ? 1 : undefined,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px',
                      backgroundColor: currentStep === idx ? '#0055ff' : currentStep > idx ? '#22c55e' : 'var(--surface-2)',
                      color: currentStep >= idx ? '#fff' : 'var(--muted)',
                      transition: 'all 0.2s ease',
                    }}>
                      {currentStep > idx ? <Check size={16} /> : idx + 1}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      color: currentStep === idx ? '#0055ff' : currentStep > idx ? '#22c55e' : 'var(--muted)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                      {step.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div style={{
                      flex: 1, height: 2,
                      backgroundColor: currentStep > idx ? '#22c55e' : 'var(--border)',
                      margin: '0 4px', marginBottom: 22,
                      borderRadius: 1,
                      transition: 'background 0.2s ease',
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ===== STEP 1: JOINING DETAILS ===== */}
              {currentStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Vendor Dropdown */}
                  <div>
                    <label style={labelStyle}>Vendor (Reference) *</label>
                    <select required style={inputBase}
                      value={form.REFFERENCE} onChange={(e) => setForm({ ...form, REFFERENCE: e.target.value })}>
                      <option value="">SELECT VENDOR (REFERENCE) *</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.vendorName}>{v.vendorName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Joining Dates */}
                  <div>
                    <label style={labelStyle}>Client joining date</label>
                    <input type="date" style={inputBase}
                      value={form.JOINING_DATE_CLIENT} onChange={(e) => setForm({ ...form, JOINING_DATE_CLIENT: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Office joining date</label>
                    <input type="date" style={inputBase}
                      value={form.JOINING_DATE_OFFICE} onChange={(e) => setForm({ ...form, JOINING_DATE_OFFICE: e.target.value })} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-4px' }}>
                    At least one joining date (Client or Office) must be filled.
                  </div>
                </div>
              )}

              {/* ===== STEP 2: PERSONAL DETAILS ===== */}
              {currentStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Aadhaar Number *</label>
                    <input required placeholder="AADHAAR NO (12 digit) *" style={inputBase}
                      value={form.AADHAR_NO} onChange={(e) => setForm({ ...form, AADHAR_NO: e.target.value })} maxLength={12} />
                  </div>
                  <div>
                    <label style={labelStyle}>Name *</label>
                    <input required placeholder="NAME *" style={inputBase}
                      value={form.WORKER_NAME} onChange={(e) => setForm({ ...form, WORKER_NAME: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Father Name *</label>
                    <input required placeholder="FATHER NAME *" style={inputBase}
                      value={form.FATHER_NAME} onChange={(e) => setForm({ ...form, FATHER_NAME: e.target.value.toUpperCase() })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Designation *</label>
                    <select style={inputBase}
                      value={form.DESIGNATION} onChange={(e) => setForm({ ...form, DESIGNATION: e.target.value })}>
                      <option value="LABOUR">LABOUR</option>
                      <option value="SKILLED">SKILLED</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth *</label>
                    <input required type="date" style={inputBase}
                      value={form.DOB} onChange={(e) => setForm({ ...form, DOB: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input required placeholder="PH NUMBER *" style={inputBase}
                      value={form.MOBILE_NO} onChange={(e) => setForm({ ...form, MOBILE_NO: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Address *</label>
                    <input required placeholder="ADDRESS *" style={inputBase}
                      value={form.ADDRESS} onChange={(e) => setForm({ ...form, ADDRESS: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: 'var(--muted-2)' }}>PAN (optional)</label>
                    <input placeholder="PAN (optional)" style={inputBase}
                      value={form.PAN_NO} onChange={(e) => setForm({ ...form, PAN_NO: e.target.value })} />
                  </div>
                </div>
              )}

              {/* ===== STEP 3: BANK DETAILS (OPTIONAL) ===== */}
              {currentStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#22c55e',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <Check size={16} color="#22c55e" />
                    <span>Bank details are optional. You can skip this step.</span>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: 'var(--muted-2)' }}>Bank Name (optional)</label>
                    <input placeholder="BANK NAME" style={inputBase}
                      value={form.BANK} onChange={(e) => setForm({ ...form, BANK: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: 'var(--muted-2)' }}>Account Number (optional)</label>
                    <input placeholder="ACCOUNT NO" style={inputBase}
                      value={form.ACCOUNT_NO} onChange={(e) => setForm({ ...form, ACCOUNT_NO: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: 'var(--muted-2)' }}>IFSC Code (optional)</label>
                    <input placeholder="IFSC" style={inputBase}
                      value={form.IFSC} onChange={(e) => setForm({ ...form, IFSC: e.target.value })} />
                  </div>
                </div>
              )}

              {/* ===== STEP 4: PHOTO UPLOADS ===== */}
              {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Worker Photo */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', borderRadius: '12px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '10px',
                      backgroundColor: 'rgba(0,85,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Camera size={22} color="#0055ff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Worker Photo *</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: 8 }}>Upload a recent photo of the worker</div>
                      <PhotoUpload variant="light" label="" value={form.PHOTO} onChange={(val) => setForm({ ...form, PHOTO: val })} folder="worker-photos" aspect={1} />
                    </div>
                  </div>

                  {/* Aadhaar Front */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', borderRadius: '12px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '10px',
                      backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <User size={22} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Aadhaar Front *</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: 8 }}>Front side of Aadhaar card</div>
                      <PhotoUpload variant="light" label="" value={form.AADHAR_PHOTO} onChange={(val) => setForm({ ...form, AADHAR_PHOTO: val })} folder="aadhaar-photos" aspect={1.4} />
                    </div>
                  </div>

                  {/* Aadhaar Back */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', borderRadius: '12px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '10px',
                      backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <User size={22} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Aadhaar Back *</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: 8 }}>Back side of Aadhaar card</div>
                      <PhotoUpload variant="light" label="" value={form.AADHAR_BACK_PHOTO} onChange={(val) => setForm({ ...form, AADHAR_BACK_PHOTO: val })} folder="aadhaar-photos" aspect={1.4} />
                    </div>
                  </div>

                  {/* PAN Photo (optional) */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', borderRadius: '12px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '10px',
                      backgroundColor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <CreditCard size={22} color="#22c55e" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>PAN Photo (optional)</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: 8 }}>Upload PAN card image if available</div>
                      <PhotoUpload variant="light" label="" value={form.PAN_PHOTO} onChange={(val) => setForm({ ...form, PAN_PHOTO: val })} folder="pan-photos" aspect={1.4} />
                    </div>
                  </div>

                  {/* Bank Passbook (optional) */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px', borderRadius: '12px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '10px',
                      backgroundColor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <CreditCard size={22} color="#22c55e" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Bank Passbook (optional)</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: 8 }}>Upload bank passbook or cheque copy</div>
                      <PhotoUpload variant="light" label="" value={form.BANK_PHOTO} onChange={(val) => setForm({ ...form, BANK_PHOTO: val })} folder="bank-photos" aspect={1.4} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== FOOTER NAVIGATION ===== */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '20px', paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}>
                {/* Back Button — hidden on step 0 */}
                <div>
                  {currentStep > 0 && (
                    <button type="button" onClick={handlePrevStep} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 18px', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                      color: 'var(--text)', fontWeight: 600, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <ChevronLeft size={16} /> Back
                    </button>
                  )}
                </div>

                {/* Right side buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Step 3 (Bank) shows Skip button */}
                  {currentStep === 2 && (
                    <button type="button" onClick={handleSkipStep} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 18px', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--surface)',
                      color: 'var(--muted)', fontWeight: 600, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <SkipForward size={16} /> Skip
                    </button>
                  )}

                  {/* Next or Submit */}
                  {currentStep < 3 ? (
                    <button type="button" onClick={handleNextStep} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 22px', borderRadius: '8px',
                      border: 'none', backgroundColor: '#0055ff',
                      color: '#fff', fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '10px 22px', borderRadius: '8px',
                      border: 'none', backgroundColor: '#0055ff',
                      color: '#fff', fontWeight: 700, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                      <Check size={16} /> Submit
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantWorkerRegistration;