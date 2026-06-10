import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { UserPlus, Search, X, Check, Clock, Eye } from 'lucide-react';
import PhotoUpload from '../../components/PhotoUpload';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../utils/notifications';
import { pageStyles as s } from '../../styles/pageStyles';
import { nextSerial } from '../../utils/serial';

ModuleRegistry.registerModules([AllCommunityModule]);

const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--text-soft)',
  headerBackgroundColor: 'var(--surface-2)',
  headerTextColor: 'var(--text)',
  borderColor: 'var(--border-strong)',
  rowHoverColor: 'var(--surface-2)',
  oddRowBackgroundColor: 'var(--surface)',
  fontFamily: 'Inter, sans-serif',
  rowHeight: 36,
  headerHeight: 40,
  wrapperBorderRadius: '12px',
  borderRadius: 0,
});

const DetailRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a3a' }}>
    <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}</span>
    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
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

const AccountantWorkerRegistration = ({ projectName }) => {
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
    load();
  }, [workers, profile, load]);

  const actionIconBtn = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
  };

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
    setOpenStatusRow(null);
    load();
  }, [profile, load]);

  const setPendingRequest = useCallback(async (row) => {
    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'PENDING' });
    setOpenStatusRow(null);
    load();
  }, [load]);

  const openDetails = useCallback((row) => {
    setSelectedWorker(row);
    // Initialize editForm with existing values — only blank fields will be editable
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
      // Build update payload — only include fields that have a value
      const payload = {
        ...editForm,
        STATUS: 'PENDING',
        updatedAt: Timestamp.now(),
        updatedBy: profile?.uid || '',
        updatedByName: profile?.name || profile?.email || 'ACCOUNTANT',
      };
      // Remove empty strings for fields that were intentionally left blank
      // but keep STATUS and metadata
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

  const StatusDropdown = ({ data, onClose }) => {
    const dropdownRef = useRef(null);
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e1e2e',
          border: '1px solid #3a3a5c',
          borderRadius: '8px',
          padding: '4px',
          zIndex: 1000,
          minWidth: '110px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <button
          type="button"
          style={{
            ...actionIconBtn,
            color: '#22c55e',
            width: '100%',
            justifyContent: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '13px',
          }}
          onClick={() => { approveRequest(data); onClose(); }}
        >
          <Check size={14} /> Approve
        </button>
        <button
          type="button"
          style={{
            ...actionIconBtn,
            color: '#f59e0b',
            width: '100%',
            justifyContent: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '13px',
          }}
          onClick={() => { setPendingRequest(data); onClose(); }}
        >
          <Clock size={14} /> Pending
        </button>
        <button
          type="button"
          style={{
            ...actionIconBtn,
            color: '#ef4444',
            width: '100%',
            justifyContent: 'flex-start',
            gap: '8px',
            padding: '8px 12px',
            fontSize: '13px',
          }}
          onClick={() => { rejectRequest(data); onClose(); }}
        >
          <X size={14} /> Reject
        </button>
      </div>
    );
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
    load();
    alert('Worker request submitted for approval.');
  };

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL', width: 70 },
      { field: 'WORKER_NAME', headerName: 'NAME', flex: 1 },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', flex: 1 },
      { field: 'REFFERENCE', headerName: 'REF', width: 100 },
      { field: 'AADHAR_NO', headerName: 'AADHAAR', width: 130 },
      { field: 'DESIGNATION', headerName: 'DESIG', width: 100 },
      {
        field: 'STATUS',
        headerName: 'APPROVAL',
        width: 110,
        cellStyle: (p) => ({ color: p.value === 'APPROVED' ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }),
      },
    ],
    []
  );

  if (!projectName) return <p style={{ color: '#666' }}>Select a project from the header.</p>;
  if (loading) return <p style={{ color: '#666' }}>Loading...</p>;

  return (
    <>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <button type="button" style={s.primaryBtn} onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> ADD WORKER
        </button>
      </div>
      <div style={s.gridSection}>
        {isAccountant ? (
          <div style={{ height: '55vh', width: '100%' }}>
            <AgGridReact
              rowData={rows}
              columnDefs={[
                  ...columnDefs.filter((c) => ['SLNO', 'WORKER_NAME', 'FATHER_NAME'].includes(c.field)),
                  {
                    headerName: 'ACTION',
                    width: 110,
                    cellRenderer: (p) => {
                      const data = p.data;
                      const isOpen = openStatusRow === data.id;
                      const statusColor = data?.STATUS === 'APPROVED' ? '#22c55e' : data?.STATUS === 'REJECTED' ? '#ef4444' : '#f59e0b';
                      const StatusIcon = data?.STATUS === 'APPROVED' ? Check : data?.STATUS === 'REJECTED' ? X : Clock;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '100%', position: 'relative' }}>
                          <button
                            type="button"
                            title={`Status: ${data?.STATUS || 'PENDING'}`}
                            style={{
                              ...actionIconBtn,
                              color: statusColor,
                              width: 36,
                              height: 36,
                              minWidth: 36,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenStatusRow(isOpen ? null : data.id);
                            }}
                          >
                            <StatusIcon size={16} />
                          </button>
                          <button
                            type="button"
                            title="View Details"
                            style={{
                              ...actionIconBtn,
                              color: '#94a3b8',
                              width: 36,
                              height: 36,
                              minWidth: 36,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(data);
                            }}
                          >
                            <Eye size={16} />
                          </button>
                          {isOpen && (
                            <StatusDropdown
                              data={data}
                              onClose={() => setOpenStatusRow(null)}
                            />
                          )}
                        </div>
                      );
                    },
                  },
              ]}
              defaultColDef={{ filter: false, sortable: true }}
              quickFilterText={searchText}
              rowHeight={34}
              headerHeight={38}
              theme={darkQuartzTheme}
            />
          </div>
        ) : (
          <div style={{ height: '55vh', width: '100%' }}>
            <AgGridReact rowData={rows} columnDefs={columnDefs} defaultColDef={{ filter: true }} quickFilterText={searchText} rowHeight={34} headerHeight={38} theme={darkQuartzTheme} />
          </div>
        )}
      </div>

      {showEditModal && selectedWorker && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 560 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>EDIT WORKER — {selectedWorker.WORKER_NAME || ''}</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => { setShowEditModal(false); setSelectedWorker(null); setEditForm({}); }} />
            </div>
            <form onSubmit={handleEditSubmit} style={s.form}>
              {/* PHOTO */}
              <PhotoUpload label="PHOTO" value={editForm.PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, PHOTO: val })} folder="worker-photos" aspect={1} />

              {/* Pre-filled fields shown as read-only (disabled input) */}
              <input
                placeholder="NAME"
                style={{ ...s.formInput, ...(editForm.WORKER_NAME ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={editForm.WORKER_NAME}
                onChange={(e) => setEditForm({ ...editForm, WORKER_NAME: e.target.value.toUpperCase() })}
                disabled={!!editForm.WORKER_NAME}
                readOnly={!!editForm.WORKER_NAME}
              />
              <input
                placeholder="FATHER NAME"
                style={{ ...s.formInput, ...(editForm.FATHER_NAME ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={editForm.FATHER_NAME}
                onChange={(e) => setEditForm({ ...editForm, FATHER_NAME: e.target.value.toUpperCase() })}
                disabled={!!editForm.FATHER_NAME}
                readOnly={!!editForm.FATHER_NAME}
              />
              <input
                placeholder="AADHAAR NO"
                style={{ ...s.formInput, ...(editForm.AADHAR_NO ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={editForm.AADHAR_NO}
                onChange={(e) => setEditForm({ ...editForm, AADHAR_NO: e.target.value })}
                disabled={!!editForm.AADHAR_NO}
                readOnly={!!editForm.AADHAR_NO}
              />
              <select
                style={{ ...s.formInput, ...(editForm.DESIGNATION ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                value={editForm.DESIGNATION}
                onChange={(e) => setEditForm({ ...editForm, DESIGNATION: e.target.value })}
                disabled={!!editForm.DESIGNATION}
              >
                <option value="LABOUR">LABOUR</option>
                <option value="SKILLED">SKILLED</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
              </select>

              {/* Blank / empty fields — editable */}
              {!editForm.DOB && (
                <input type="date" placeholder="DOB" style={s.formInput} value={editForm.DOB} onChange={(e) => setEditForm({ ...editForm, DOB: e.target.value })} />
              )}
              {!editForm.MOBILE_NO && (
                <input placeholder="MOBILE NO" style={s.formInput} value={editForm.MOBILE_NO} onChange={(e) => setEditForm({ ...editForm, MOBILE_NO: e.target.value })} />
              )}
              {!editForm.REFFERENCE && (
                <input placeholder="REFERENCE" style={s.formInput} value={editForm.REFFERENCE} onChange={(e) => setEditForm({ ...editForm, REFFERENCE: e.target.value })} />
              )}
              {!editForm.JOINING_DATE_CLIENT && (
                <input type="date" placeholder="JOINING DATE (CLIENT)" style={s.formInput} value={editForm.JOINING_DATE_CLIENT} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_CLIENT: e.target.value })} />
              )}
              {!editForm.JOINING_DATE_OFFICE && (
                <input type="date" placeholder="JOINING DATE (OFFICE)" style={s.formInput} value={editForm.JOINING_DATE_OFFICE} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_OFFICE: e.target.value })} />
              )}
              {!editForm.CLOSE_DATE && (
                <input type="date" placeholder="CLOSE DATE" style={s.formInput} value={editForm.CLOSE_DATE} onChange={(e) => setEditForm({ ...editForm, CLOSE_DATE: e.target.value })} />
              )}
              {!editForm.ADDRESS && (
                <input placeholder="ADDRESS" style={s.formInput} value={editForm.ADDRESS} onChange={(e) => setEditForm({ ...editForm, ADDRESS: e.target.value })} />
              )}
              {!editForm.PAN_NO && (
                <input placeholder="PAN NO (optional)" style={s.formInput} value={editForm.PAN_NO} onChange={(e) => setEditForm({ ...editForm, PAN_NO: e.target.value })} />
              )}
              {!editForm.BANK && (
                <input placeholder="BANK (optional)" style={s.formInput} value={editForm.BANK} onChange={(e) => setEditForm({ ...editForm, BANK: e.target.value })} />
              )}
              {!editForm.ACCOUNT_NO && (
                <input placeholder="ACCOUNT NO (optional)" style={s.formInput} value={editForm.ACCOUNT_NO} onChange={(e) => setEditForm({ ...editForm, ACCOUNT_NO: e.target.value })} />
              )}
              {!editForm.IFSC && (
                <input placeholder="IFSC (optional)" style={s.formInput} value={editForm.IFSC} onChange={(e) => setEditForm({ ...editForm, IFSC: e.target.value })} />
              )}

              {/* Photo uploads — always editable */}
              {!editForm.AADHAR_PHOTO && (
                <PhotoUpload label="AADHAAR PHOTO" value={editForm.AADHAR_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, AADHAR_PHOTO: val })} folder="aadhaar-photos" aspect={1.4} />
              )}
              {!editForm.PAN_PHOTO && (
                <PhotoUpload label="PAN PHOTO (optional)" value={editForm.PAN_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, PAN_PHOTO: val })} folder="pan-photos" aspect={1.4} />
              )}
              {!editForm.BANK_PHOTO && (
                <PhotoUpload label="BANK PHOTO (optional)" value={editForm.BANK_PHOTO || ''} onChange={(val) => setEditForm({ ...editForm, BANK_PHOTO: val })} folder="bank-photos" aspect={1.4} />
              )}

              <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Fields with existing data are pre-filled and read-only. Fill in the blank fields above.
                On save, worker status will reset to <strong>PENDING</strong> for admin approval.
              </div>
              <button type="submit" style={s.submitBtn}>SAVE & SEND FOR APPROVAL</button>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 560 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>ADD WORKER</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} style={s.form}>
              <select required style={s.formInput} value={form.REFFERENCE} onChange={(e) => setForm({ ...form, REFFERENCE: e.target.value })}>
                <option value="">SELECT VENDOR (REFERENCE) *</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.vendorName}>
                    {v.vendorName}
                  </option>
                ))}
              </select>
              <input required placeholder="AADHAAR NO (12 digit) *" style={s.formInput} value={form.AADHAR_NO} onChange={(e) => setForm({ ...form, AADHAR_NO: e.target.value })} />
              <input required placeholder="NAME *" style={s.formInput} value={form.WORKER_NAME} onChange={(e) => setForm({ ...form, WORKER_NAME: e.target.value.toUpperCase() })} />
              <input required placeholder="FATHER NAME *" style={s.formInput} value={form.FATHER_NAME} onChange={(e) => setForm({ ...form, FATHER_NAME: e.target.value.toUpperCase() })} />
              <select style={s.formInput} value={form.DESIGNATION} onChange={(e) => setForm({ ...form, DESIGNATION: e.target.value })}>
                <option value="LABOUR">LABOUR</option>
                <option value="SKILLED">SKILLED</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
              </select>
              <input required type="date" style={s.formInput} onChange={(e) => setForm({ ...form, DOB: e.target.value })} />
              <input required placeholder="PH NUMBER *" style={s.formInput} value={form.MOBILE_NO} onChange={(e) => setForm({ ...form, MOBILE_NO: e.target.value })} />
              <PhotoUpload label="AADHAAR PHOTO *" value={form.AADHAR_PHOTO} onChange={(val) => setForm({ ...form, AADHAR_PHOTO: val })} folder="aadhaar-photos" aspect={1.4} />
              <PhotoUpload label="WORKER PHOTO (optional)" value={form.PHOTO} onChange={(val) => setForm({ ...form, PHOTO: val })} folder="worker-photos" aspect={1} />
              <input required placeholder="ADDRESS *" style={s.formInput} value={form.ADDRESS} onChange={(e) => setForm({ ...form, ADDRESS: e.target.value })} />
              <input type="date" placeholder="JOINING CLIENT" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_CLIENT: e.target.value })} />
              <input type="date" placeholder="JOINING OFFICE" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_OFFICE: e.target.value })} />
              <input placeholder="PAN (optional)" style={s.formInput} onChange={(e) => setForm({ ...form, PAN_NO: e.target.value })} />
              <PhotoUpload label="PAN PHOTO (optional)" value={form.PAN_PHOTO} onChange={(val) => setForm({ ...form, PAN_PHOTO: val })} folder="pan-photos" aspect={1.4} />
              <input placeholder="BANK (optional)" style={s.formInput} value={form.BANK} onChange={(e) => setForm({ ...form, BANK: e.target.value })} />
              <input placeholder="ACCOUNT NO (optional)" style={s.formInput} value={form.ACCOUNT_NO} onChange={(e) => setForm({ ...form, ACCOUNT_NO: e.target.value })} />
              <input placeholder="IFSC (optional)" style={s.formInput} value={form.IFSC} onChange={(e) => setForm({ ...form, IFSC: e.target.value })} />
              <PhotoUpload label="BANK PHOTO (optional)" value={form.BANK_PHOTO} onChange={(val) => setForm({ ...form, BANK_PHOTO: val })} folder="bank-photos" aspect={1.4} />
              <button type="submit" style={s.submitBtn}>SUBMIT REQUEST</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountantWorkerRegistration;
