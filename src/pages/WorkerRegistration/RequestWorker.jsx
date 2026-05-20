import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { UserPlus, Search, Settings2, X, Eye, CheckCircle, XCircle, Trash2, Upload, Edit2 } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { nextSerial } from '../../utils/serial';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const darkQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#0a0a0a',
  foregroundColor: '#cccccc',
  headerBackgroundColor: '#111111',
  headerTextColor: '#ffffff',
  borderColor: '#222222',
  rowHoverColor: '#1a1a1a',
  oddRowBackgroundColor: '#0d0d0d',
  fontFamily: 'Inter, sans-serif',
});

const STORAGE_KEY = 'kac_request_column_visibility';

const REQUEST_COLUMNS = [
  { key: 'slno', label: 'SL NO' },
  { key: 'senderName', label: 'Sender' },
  { key: 'reference', label: 'Reference' },
  { key: 'name', label: 'Name' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'dob', label: 'DOB' },
  { key: 'phone', label: 'PH Number' },
  { key: 'aadhaar', label: 'Aadhaar No' },
  { key: 'photo', label: 'Photo' },
  { key: 'aadhaarPhoto', label: 'Aadhaar Photo' },
  { key: 'joiningClient', label: 'Joining (Client)' },
  { key: 'joiningOffice', label: 'Joining (Office)' },
  { key: 'address', label: 'Address' },
  { key: 'pan', label: 'PAN Number' },
  { key: 'panPhoto', label: 'PAN Photo' },
  { key: 'bank', label: 'Bank' },
  { key: 'account', label: 'Account No' },
  { key: 'ifsc', label: 'IFSC' },
  { key: 'bankPhoto', label: 'Bank Photo' },
  { key: 'project', label: 'Project' },
];

const DEFAULT_VISIBILITY = {
  slno: true,
  senderName: true,
  reference: true,
  name: true,
  fatherName: true,
  designation: true,
  dob: true,
  phone: true,
  aadhaar: true,
  photo: true,
  aadhaarPhoto: true,
  joiningClient: true,
  joiningOffice: true,
  address: false,
  pan: false,
  panPhoto: false,
  bank: false,
  account: false,
  ifsc: false,
  bankPhoto: false,
  project: false,
};

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_VISIBILITY, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_VISIBILITY };
};

const saveSettings = (visibility) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

const RequestColumnSettings = ({ isOpen, onClose, visibility, onVisibilityChange }) => {
  useEffect(() => {
    if (visibility) {
      saveSettings(visibility);
    }
  }, [visibility]);

  if (!isOpen) return null;

  const allVisible = REQUEST_COLUMNS.every((col) => visibility[col.key]);

  const toggleAll = () => {
    const newVal = !allVisible;
    const updated = {};
    REQUEST_COLUMNS.forEach((col) => {
      updated[col.key] = newVal;
    });
    onVisibilityChange(updated);
  };

  const toggleColumn = (key) => {
    onVisibilityChange({ ...visibility, [key]: !visibility[key] });
  };

  return (
    <div style={settingsStyles.overlay}>
      <div style={settingsStyles.modal}>
        <div style={settingsStyles.header}>
          <h3 style={settingsStyles.title}>REQUEST COLUMN VISIBILITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>
        <p style={settingsStyles.subtitle}>Show / hide columns in the worker request grid.</p>

        <button type="button" onClick={toggleAll} style={settingsStyles.toggleAllBtn}>
          {allVisible ? 'HIDE ALL' : 'SHOW ALL'}
        </button>

        <div style={settingsStyles.grid}>
          {REQUEST_COLUMNS.map((col) => (
            <label key={col.key} style={settingsStyles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!!visibility[col.key]}
                onChange={() => toggleColumn(col.key)}
                style={settingsStyles.checkbox}
              />
              <span style={settingsStyles.checkboxText}>{col.label}</span>
            </label>
          ))}
        </div>

        <button type="button" onClick={onClose} style={settingsStyles.doneBtn}>
          DONE
        </button>
      </div>
    </div>
  );
};

const EMPTY = {
  REFFERENCE: '',
  WORKER_NAME: '',
  FATHER_NAME: '',
  DESIGNATION: 'LABOUR',
  DOB: '',
  MOBILE_NO: '',
  AADHAR_NO: '',
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
  PROJECT: '',
  PHOTO: '',
};

// ---------- Detail View Modal ----------
const DetailModal = ({ data, onClose }) => {
  if (!data) return null;

  const fields = [
    { label: 'SL NO', value: data.SLNO },
    { label: 'SENDER', value: data.SENDER_NAME || '—' },
    { label: 'REFERENCE', value: data.REFFERENCE || '—' },
    { label: 'WORKER NAME', value: data.WORKER_NAME },
    { label: 'FATHER NAME', value: data.FATHER_NAME || '—' },
    { label: 'DESIGNATION', value: data.DESIGNATION || '—' },
    { label: 'DOB', value: data.DOB || '—' },
    { label: 'MOBILE NO', value: data.MOBILE_NO || '—' },
    { label: 'AADHAAR NO', value: data.AADHAR_NO || '—' },
    { label: 'JOINING (CLIENT)', value: data.JOINING_DATE_CLIENT || '—' },
    { label: 'JOINING (OFFICE)', value: data.JOINING_DATE_OFFICE || '—' },
    { label: 'ADDRESS', value: data.ADDRESS || '—' },
    { label: 'PAN NO', value: data.PAN_NO || '—' },
    { label: 'BANK', value: data.BANK || '—' },
    { label: 'ACCOUNT NO', value: data.ACCOUNT_NO || '—' },
    { label: 'IFSC', value: data.IFSC || '—' },
    { label: 'PROJECT', value: data.PROJECT || '—' },
    { label: 'STATUS', value: data.STATUS || 'PENDING' },
  ];

  return (
    <div style={s.modalOverlay}>
      <div style={{ ...s.modalContent, maxWidth: 700 }}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={18} /> WORKER DETAILS
          </h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>

        {/* Photo section */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {data.PHOTO && (
            <div>
              <p style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>PHOTO</p>
              <img src={data.PHOTO} alt="worker" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
            </div>
          )}
          {data.AADHAR_PHOTO && (
            <div>
              <p style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>AADHAAR PHOTO</p>
              <img src={data.AADHAR_PHOTO} alt="aadhaar" style={{ width: 120, height: 80, borderRadius: 4, objectFit: 'cover' }} />
            </div>
          )}
          {data.PAN_PHOTO && (
            <div>
              <p style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>PAN PHOTO</p>
              <img src={data.PAN_PHOTO} alt="pan" style={{ width: 120, height: 80, borderRadius: 4, objectFit: 'cover' }} />
            </div>
          )}
          {data.BANK_PHOTO && (
            <div>
              <p style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>BANK PHOTO</p>
              <img src={data.BANK_PHOTO} alt="bank" style={{ width: 120, height: 80, borderRadius: 4, objectFit: 'cover' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {fields.map((f) => (
            <div key={f.label} style={{ padding: '8px 12px', backgroundColor: '#000', borderRadius: 6, border: '1px solid #111' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#666', fontWeight: 600 }}>{f.label}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#fff' }}>{f.value}</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={onClose} style={{ ...s.primaryBtn, marginTop: 16, width: '100%', justifyContent: 'center' }}>
          CLOSE
        </button>
      </div>
    </div>
  );
};

// ---------- Confirm Action Modal ----------
const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmLabel = 'CONFIRM', danger = false }) => (
  <div style={s.modalOverlay}>
    <div style={{ ...s.modalContent, maxWidth: 420 }}>
      <div style={s.modalHeader}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onCancel} />
      </div>
      <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button type="button" onClick={onCancel} style={{ ...s.secondaryBtn, flex: 1, textAlign: 'center', padding: '12px' }}>
          CANCEL
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            flex: 1,
            backgroundColor: danger ? '#dc2626' : '#0055ff',
            color: '#fff',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const RequestWorker = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [columnVisibility, setColumnVisibility] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [columnApi, setColumnApi] = useState(null);

  // Bulk upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Edit state
  const [editData, setEditData] = useState(null); // row being edited
  const [editForm, setEditForm] = useState(EMPTY);

  // Filter & Confirm state
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [detailData, setDetailData] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { type: 'reject'|'delete', data: row }

  const load = async () => {
    try {
      const [rSnap, pSnap, wSnap, vSnap] = await Promise.all([
        getDocs(query(collection(db, 'worker_requests'), orderBy('SLNO', 'asc'))),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'vendors')),
      ]);
      setRows(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProjects(pSnap.docs.map((d) => ({ id: d.id, name: d.data().PROJECT_NAME || d.data().name })));
      setWorkers(wSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setVendors(vSnap.docs.map((d) => ({ id: d.id, vendorName: d.data().vendorName || '' })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    alert(`Approved — EMP ID: ${empid}`);
    load();
  }, [workers]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData) return;
    await updateDoc(doc(db, 'worker_requests', editData.id), {
      REFFERENCE: editForm.REFFERENCE || '',
      WORKER_NAME: editForm.WORKER_NAME,
      FATHER_NAME: editForm.FATHER_NAME || '',
      DESIGNATION: editForm.DESIGNATION || 'LABOUR',
      DOB: editForm.DOB || '',
      MOBILE_NO: editForm.MOBILE_NO || '',
      AADHAR_NO: editForm.AADHAR_NO,
      PHOTO: editForm.PHOTO || '',
      AADHAR_PHOTO: editForm.AADHAR_PHOTO || '',
      JOINING_DATE_CLIENT: editForm.JOINING_DATE_CLIENT || '',
      JOINING_DATE_OFFICE: editForm.JOINING_DATE_OFFICE || '',
      ADDRESS: editForm.ADDRESS || '',
      PAN_NO: editForm.PAN_NO || '',
      PAN_PHOTO: editForm.PAN_PHOTO || '',
      BANK: editForm.BANK || '',
      ACCOUNT_NO: editForm.ACCOUNT_NO || '',
      IFSC: editForm.IFSC || '',
      BANK_PHOTO: editForm.BANK_PHOTO || '',
      PROJECT: editForm.PROJECT || '',
    });
    setEditData(null);
    setEditForm(EMPTY);
    load();
  };

  const rejectRequest = async (row) => {
    await updateDoc(doc(db, 'worker_requests', row.id), { STATUS: 'REJECTED' });
    setConfirmState(null);
    alert(`Request from ${row.WORKER_NAME} has been rejected.`);
    load();
  };

  const deleteRequest = async (row) => {
    await deleteDoc(doc(db, 'worker_requests', row.id));
    setConfirmState(null);
    alert(`Request from ${row.WORKER_NAME} has been deleted.`);
    load();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const slno = nextSerial(workers, 'SLNO');
    const empid = `KAC${String(slno).padStart(4, '0')}`;
    await Promise.all([
      addDoc(collection(db, 'workers'), {
        SLNO: slno,
        EMPID: empid,
        REFFERENCE: form.REFFERENCE || '',
        WORKER_NAME: form.WORKER_NAME,
        FATHER_NAME: form.FATHER_NAME || '',
        DESIGNATION: form.DESIGNATION || 'LABOUR',
        DOB: form.DOB || '',
        MOBILE_NO: form.MOBILE_NO || '',
        AADHAR_NO: form.AADHAR_NO,
        PHOTO: form.PHOTO || '',
        AADHAR_PHOTO: form.AADHAR_PHOTO || '',
        JOINING_DATE_CLIENT: form.JOINING_DATE_CLIENT || '',
        JOINING_DATE_OFFICE: form.JOINING_DATE_OFFICE || '',
        ADDRESS: form.ADDRESS || '',
        PAN_NO: form.PAN_NO || '',
        PAN_PHOTO: form.PAN_PHOTO || '',
        BANK: form.BANK || '',
        ACCOUNT_NO: form.ACCOUNT_NO || '',
        IFSC: form.IFSC || '',
        BANK_PHOTO: form.BANK_PHOTO || '',
        PROJECT: form.PROJECT || '',
        STATUS: 'ACTIVE',
        timestamp: new Date(),
      }),
      addDoc(collection(db, 'worker_requests'), {
        ...form,
        SLNO: slno,
        EMPID: empid,
        SENDER_NAME: profile?.name || profile?.email || 'ADMIN',
        STATUS: 'APPROVED',
        SOURCE: 'ADMIN',
        timestamp: new Date(),
      }),
    ]);
    alert(`Worker added directly — EMP ID: ${empid}`);
    setShowModal(false);
    setForm(EMPTY);
    load();
  };

  const columnDefs = useMemo(
    () => [
      {
        headerName: 'SL NO',
        width: 80,
        pinned: 'left',
        hide: !columnVisibility.slno,
        valueGetter: (params) => (params.data ? params.data.SLNO : ''),
      },
      { field: 'SENDER_NAME', headerName: 'SENDER', width: 130, hide: !columnVisibility.senderName },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 120, hide: !columnVisibility.reference },
      { field: 'WORKER_NAME', headerName: 'NAME', minWidth: 160, flex: 1, hide: !columnVisibility.name },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 140, hide: !columnVisibility.fatherName },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120, hide: !columnVisibility.designation },
      { field: 'DOB', headerName: 'DOB', width: 110, hide: !columnVisibility.dob },
      { field: 'MOBILE_NO', headerName: 'PH NUMBER', width: 120, hide: !columnVisibility.phone },
      { field: 'AADHAR_NO', headerName: 'AADHAAR NO', width: 140, hide: !columnVisibility.aadhaar },
      {
        headerName: 'PHOTO',
        width: 80,
        hide: !columnVisibility.photo,
        cellRenderer: (params) =>
          params.data.PHOTO ? (
            <img src={params.data.PHOTO} alt="worker" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginTop: 4 }} />
          ) : (
            <span style={{ color: '#555', fontSize: 10 }}>—</span>
          ),
      },
      {
        headerName: 'AADHAAR PHOTO',
        width: 80,
        hide: !columnVisibility.aadhaarPhoto,
        cellRenderer: (params) =>
          params.data.AADHAR_PHOTO ? (
            <img src={params.data.AADHAR_PHOTO} alt="aadhaar" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', marginTop: 4 }} />
          ) : (
            <span style={{ color: '#555', fontSize: 10 }}>—</span>
          ),
      },
      { field: 'JOINING_DATE_CLIENT', headerName: 'JOINING (CLIENT)', width: 130, hide: !columnVisibility.joiningClient },
      { field: 'JOINING_DATE_OFFICE', headerName: 'JOINING (OFFICE)', width: 130, hide: !columnVisibility.joiningOffice },
      {
        headerName: 'ACTION',
        width: 280,
        pinned: 'right',
        cellRenderer: (p) => {
          const data = p.data;
          // Already approved → show badge
          if (data?.STATUS === 'APPROVED') {
            return <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 'bold' }}>✓ APPROVED</span>;
          }
          // Rejected → show badge
          if (data?.STATUS === 'REJECTED') {
            return <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>✗ REJECTED</span>;
          }
          // Pending → show action buttons
          return (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: '100%' }}>
              <button
                type="button"
                title="Edit Details"
                style={{ ...actionIconBtn, color: '#f59e0b' }}
                onClick={() => {
                  setEditForm({
                    REFFERENCE: data.REFFERENCE || '',
                    WORKER_NAME: data.WORKER_NAME || '',
                    FATHER_NAME: data.FATHER_NAME || '',
                    DESIGNATION: data.DESIGNATION || 'LABOUR',
                    DOB: data.DOB || '',
                    MOBILE_NO: data.MOBILE_NO || '',
                    AADHAR_NO: data.AADHAR_NO || '',
                    PHOTO: data.PHOTO || '',
                    AADHAR_PHOTO: data.AADHAR_PHOTO || '',
                    JOINING_DATE_CLIENT: data.JOINING_DATE_CLIENT || '',
                    JOINING_DATE_OFFICE: data.JOINING_DATE_OFFICE || '',
                    ADDRESS: data.ADDRESS || '',
                    PAN_NO: data.PAN_NO || '',
                    PAN_PHOTO: data.PAN_PHOTO || '',
                    BANK: data.BANK || '',
                    ACCOUNT_NO: data.ACCOUNT_NO || '',
                    IFSC: data.IFSC || '',
                    BANK_PHOTO: data.BANK_PHOTO || '',
                    PROJECT: data.PROJECT || '',
                  });
                  setEditData(data);
                }}
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                title="Approve"
                style={{ ...actionIconBtn, color: '#22c55e' }}
                onClick={() => approveRequest(data)}
              >
                <CheckCircle size={14} />
              </button>
              <button
                type="button"
                title="Reject"
                style={{ ...actionIconBtn, color: '#f97316' }}
                onClick={() => setConfirmState({ type: 'reject', data })}
              >
                <XCircle size={14} />
              </button>
              <button
                type="button"
                title="Delete"
                style={{ ...actionIconBtn, color: '#ef4444' }}
                onClick={() => setConfirmState({ type: 'delete', data })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
      {
        headerName: 'MORE',
        children: [
          { field: 'ADDRESS', headerName: 'ADDRESS', width: 180, hide: !columnVisibility.address },
          { field: 'PAN_NO', headerName: 'PAN NUMBER', width: 120, hide: !columnVisibility.pan },
          { field: 'PAN_PHOTO', headerName: 'PAN PHOTO', width: 110, hide: !columnVisibility.panPhoto },
          { field: 'BANK', headerName: 'BANK', width: 100, hide: !columnVisibility.bank },
          { field: 'ACCOUNT_NO', headerName: 'ACCOUNT NO', width: 120, hide: !columnVisibility.account },
          { field: 'IFSC', headerName: 'IFSC', width: 100, hide: !columnVisibility.ifsc },
          { field: 'BANK_PHOTO', headerName: 'BANK PHOTO', width: 110, hide: !columnVisibility.bankPhoto },
          { field: 'PROJECT', headerName: 'PROJECT NAME', width: 140, hide: !columnVisibility.project },
        ],
      },
    ],
    [approveRequest, columnVisibility]
  );

  const handleGridReady = useCallback((params) => {
    setColumnApi(params.columnApi);
  }, []);

  const autoSizeAllColumns = useCallback(() => {
    if (!columnApi) return;
    const allColumnIds = columnApi.getAllDisplayedColumns().map((col) => col.getColId());
    if (allColumnIds.length) {
      columnApi.autoSizeColumns(allColumnIds, false);
    }
  }, [columnApi]);

  useEffect(() => {
    autoSizeAllColumns();
  }, [autoSizeAllColumns, columnDefs]);

  const filteredRows = rows.filter((r) => {
    if (statusFilter === 'PENDING') return r.STATUS === 'PENDING' || !r.STATUS;
    if (statusFilter === 'APPROVED') return r.STATUS === 'APPROVED';
    if (statusFilter === 'REJECTED') return r.STATUS === 'REJECTED';
    return true;
  });

  const statusTabs = ['PENDING', 'APPROVED', 'REJECTED'];

  if (loading) return <div style={{ color: '#666', padding: 20 }}>Loading requests...</div>;

  return (
    <div>
      {/* Status Filter Tabs */}
      <div style={s.tabBar}>
        {statusTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            style={statusFilter === tab ? s.tabActive : s.tab}
          >
            {tab === 'PENDING' && '⏳ '}
            {tab === 'APPROVED' && '✅ '}
            {tab === 'REJECTED' && '❌ '}
            {tab} ({rows.filter((r) => (tab === 'PENDING' ? r.STATUS === 'PENDING' || !r.STATUS : r.STATUS === tab)).length})
          </button>
        ))}
      </div>

      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <ExportToolbar rows={filteredRows} columnDefs={columnDefs} title="Worker Requests" filename="worker-requests" />
        <button type="button" onClick={() => setShowSettings(true)} style={s.secondaryBtn}>
          <Settings2 size={16} /> COLUMNS
        </button>
        <button type="button" style={{ ...s.secondaryBtn, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowBulkModal(true)}>
          <Upload size={16} /> BULK UPLOAD
        </button>
        <button type="button" style={s.primaryBtn} onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> ADD WORKER
        </button>
      </div>

      <div style={s.gridSection}>
        <div style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            rowData={filteredRows}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, filter: true, sortable: true }}
            quickFilterText={searchText}
            animateRows
            theme={darkQuartzTheme}
            onGridReady={handleGridReady}
            autoSizeStrategy={{ type: 'fitCellContents' }}
          />
        </div>
      </div>

      <RequestColumnSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        visibility={columnVisibility}
        onVisibilityChange={setColumnVisibility}
      />

      {/* Add Worker Modal */}
      {showModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 600 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>ADD WORKER (DIRECT)</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleAdd} style={s.form}>
              <div style={s.inputGrid}>
                <input required placeholder="AADHAAR NO" style={s.formInput} value={form.AADHAR_NO} onChange={(e) => setForm({ ...form, AADHAR_NO: e.target.value })} />
                <input required placeholder="WORKER NAME" style={s.formInput} value={form.WORKER_NAME} onChange={(e) => setForm({ ...form, WORKER_NAME: e.target.value.toUpperCase() })} />
                <input placeholder="FATHER NAME" style={s.formInput} value={form.FATHER_NAME} onChange={(e) => setForm({ ...form, FATHER_NAME: e.target.value.toUpperCase() })} />
                <select style={s.formInput} value={form.REFFERENCE} onChange={(e) => setForm({ ...form, REFFERENCE: e.target.value })}>
                  <option value="">SELECT VENDOR (REFERENCE)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.vendorName}>
                      {v.vendorName}
                    </option>
                  ))}
                </select>
                <select style={s.formInput} value={form.DESIGNATION} onChange={(e) => setForm({ ...form, DESIGNATION: e.target.value })}>
                  <option value="LABOUR">LABOUR</option>
                  <option value="SKILLED">SKILLED</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                </select>
                <input type="date" placeholder="DOB" style={s.formInput} onChange={(e) => setForm({ ...form, DOB: e.target.value })} />
                <input placeholder="MOBILE" style={s.formInput} value={form.MOBILE_NO} onChange={(e) => setForm({ ...form, MOBILE_NO: e.target.value })} />
                <input type="date" placeholder="JOINING CLIENT" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_CLIENT: e.target.value })} />
                <input type="date" placeholder="JOINING OFFICE" style={s.formInput} onChange={(e) => setForm({ ...form, JOINING_DATE_OFFICE: e.target.value })} />
                <input placeholder="PAN NUMBER" style={s.formInput} value={form.PAN_NO} onChange={(e) => setForm({ ...form, PAN_NO: e.target.value })} />
                <input placeholder="PHOTO URL" style={s.formInput} value={form.PHOTO} onChange={(e) => setForm({ ...form, PHOTO: e.target.value })} />
                <input placeholder="AADHAAR PHOTO URL" style={s.formInput} value={form.AADHAR_PHOTO} onChange={(e) => setForm({ ...form, AADHAR_PHOTO: e.target.value })} />
                <input placeholder="PAN PHOTO URL" style={s.formInput} value={form.PAN_PHOTO} onChange={(e) => setForm({ ...form, PAN_PHOTO: e.target.value })} />
                <input placeholder="BANK NAME" style={s.formInput} value={form.BANK} onChange={(e) => setForm({ ...form, BANK: e.target.value })} />
                <input placeholder="ACCOUNT NO" style={s.formInput} value={form.ACCOUNT_NO} onChange={(e) => setForm({ ...form, ACCOUNT_NO: e.target.value })} />
                <input placeholder="BANK PHOTO URL" style={s.formInput} value={form.BANK_PHOTO} onChange={(e) => setForm({ ...form, BANK_PHOTO: e.target.value })} />
                <select required style={{ gridColumn: 'span 2', ...s.formInput }} value={form.PROJECT} onChange={(e) => setForm({ ...form, PROJECT: e.target.value })}>
                  <option value="">SELECT PROJECT</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" style={s.submitBtn}>
                ADD WORKER DIRECTLY
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {detailData && <DetailModal data={detailData} onClose={() => setDetailData(null)} />}

      {/* Confirm Reject Modal */}
      {confirmState?.type === 'reject' && (
        <ConfirmModal
          title="REJECT REQUEST"
          message={`Are you sure you want to reject the request from "${confirmState.data.WORKER_NAME}" (Aadhaar: ${confirmState.data.AADHAR_NO})? This action can be undone by approving later.`}
          confirmLabel="REJECT"
          danger
          onConfirm={() => rejectRequest(confirmState.data)}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmState?.type === 'delete' && (
        <ConfirmModal
          title="DELETE REQUEST"
            message={`Are you sure you want to permanently delete the request from "${confirmState.data.WORKER_NAME}" (Aadhaar: ${confirmState.data.AADHAR_NO})? This action CANNOT be undone.`}
            confirmLabel="DELETE"
            danger
            onConfirm={() => deleteRequest(confirmState.data)}
            onCancel={() => setConfirmState(null)}
          />
        )}

      {/* Edit Worker Modal */}
      {editData && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 600 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0 }}>EDIT WORKER REQUEST</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => { setEditData(null); setEditForm(EMPTY); }} />
            </div>
            <form onSubmit={handleEditSubmit} style={s.form}>
              <div style={s.inputGrid}>
                <input required placeholder="AADHAAR NO" style={s.formInput} value={editForm.AADHAR_NO} onChange={(e) => setEditForm({ ...editForm, AADHAR_NO: e.target.value })} />
                <input required placeholder="WORKER NAME" style={s.formInput} value={editForm.WORKER_NAME} onChange={(e) => setEditForm({ ...editForm, WORKER_NAME: e.target.value.toUpperCase() })} />
                <input placeholder="FATHER NAME" style={s.formInput} value={editForm.FATHER_NAME} onChange={(e) => setEditForm({ ...editForm, FATHER_NAME: e.target.value.toUpperCase() })} />
                <select style={s.formInput} value={editForm.REFFERENCE} onChange={(e) => setEditForm({ ...editForm, REFFERENCE: e.target.value })}>
                  <option value="">SELECT VENDOR (REFERENCE)</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.vendorName}>
                      {v.vendorName}
                    </option>
                  ))}
                </select>
                <select style={s.formInput} value={editForm.DESIGNATION} onChange={(e) => setEditForm({ ...editForm, DESIGNATION: e.target.value })}>
                  <option value="LABOUR">LABOUR</option>
                  <option value="SKILLED">SKILLED</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                </select>
                <input type="date" placeholder="DOB" style={s.formInput} value={editForm.DOB} onChange={(e) => setEditForm({ ...editForm, DOB: e.target.value })} />
                <input placeholder="MOBILE" style={s.formInput} value={editForm.MOBILE_NO} onChange={(e) => setEditForm({ ...editForm, MOBILE_NO: e.target.value })} />
                <input type="date" placeholder="JOINING CLIENT" style={s.formInput} value={editForm.JOINING_DATE_CLIENT} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_CLIENT: e.target.value })} />
                <input type="date" placeholder="JOINING OFFICE" style={s.formInput} value={editForm.JOINING_DATE_OFFICE} onChange={(e) => setEditForm({ ...editForm, JOINING_DATE_OFFICE: e.target.value })} />
                <input placeholder="PAN NUMBER" style={s.formInput} value={editForm.PAN_NO} onChange={(e) => setEditForm({ ...editForm, PAN_NO: e.target.value })} />
                <input placeholder="PHOTO URL" style={s.formInput} value={editForm.PHOTO} onChange={(e) => setEditForm({ ...editForm, PHOTO: e.target.value })} />
                <input placeholder="AADHAAR PHOTO URL" style={s.formInput} value={editForm.AADHAR_PHOTO} onChange={(e) => setEditForm({ ...editForm, AADHAR_PHOTO: e.target.value })} />
                <input placeholder="PAN PHOTO URL" style={s.formInput} value={editForm.PAN_PHOTO} onChange={(e) => setEditForm({ ...editForm, PAN_PHOTO: e.target.value })} />
                <input placeholder="BANK NAME" style={s.formInput} value={editForm.BANK} onChange={(e) => setEditForm({ ...editForm, BANK: e.target.value })} />
                <input placeholder="ACCOUNT NO" style={s.formInput} value={editForm.ACCOUNT_NO} onChange={(e) => setEditForm({ ...editForm, ACCOUNT_NO: e.target.value })} />
                <input placeholder="BANK PHOTO URL" style={s.formInput} value={editForm.BANK_PHOTO} onChange={(e) => setEditForm({ ...editForm, BANK_PHOTO: e.target.value })} />
                <select required style={{ gridColumn: 'span 2', ...s.formInput }} value={editForm.PROJECT} onChange={(e) => setEditForm({ ...editForm, PROJECT: e.target.value })}>
                  <option value="">SELECT PROJECT</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" style={s.submitBtn}>
                SAVE CHANGES
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: 700 }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} /> BULK UPLOAD WORKERS (EXCEL)
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={() => { setShowBulkModal(false); setBulkPreview([]); }} />
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
              Upload an Excel file (.xlsx) with columns: <strong>NAME</strong>, <strong>AADHAAR NUMBER</strong> (required). Optional: <strong>FATHER NAME</strong>, <strong>DOB</strong>, <strong>PROJECT</strong>.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const data = new Uint8Array(ev.target.result);
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  const json = XLSX.utils.sheet_to_json(sheet);
                  setBulkPreview(json);
                };
                reader.readAsArrayBuffer(file);
              }}
            />

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                style={{ ...s.secondaryBtn, display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} /> SELECT FILE
              </button>
              {bulkPreview.length > 0 && (
                <button
                  type="button"
                  style={{ ...s.secondaryBtn, display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => { setBulkPreview([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  <X size={16} /> CLEAR
                </button>
              )}
              <span style={{ color: '#666', fontSize: 12, alignSelf: 'center' }}>
                {bulkPreview.length > 0 ? `${bulkPreview.length} records found` : 'No file selected'}
              </span>
            </div>

            {bulkPreview.length > 0 && (
              <>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #222', borderRadius: 8, marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#111', color: '#888' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>#</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>AADHAAR NUMBER</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>NAME</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>FATHER NAME</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>DOB</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #222' }}>PROJECT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.slice(0, 50).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '6px 10px', color: '#555' }}>{i + 1}</td>
                          <td style={{ padding: '6px 10px' }}>{row.AADHAR_NO || row.AADHAAR || row.AADHAAR_NO || row['AADHAAR NUMBER'] || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{row.NAME || row.WORKER_NAME || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{row.FATHER_NAME || row['FATHER NAME'] || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{row.DOB || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{row.PROJECT || '—'}</td>
                        </tr>
                      ))}
                      {bulkPreview.length > 50 && (
                        <tr><td colSpan={5} style={{ padding: '8px 10px', color: '#666', textAlign: 'center' }}>... and {bulkPreview.length - 50} more records</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={bulkUploading}
                  onClick={async () => {
                    if (!window.confirm(`Upload ${bulkPreview.length} workers directly to the register? They will appear in the APPROVED tab.`)) return;
                    setBulkUploading(true);
                    let success = 0, errors = 0;
                    let currentSlno = nextSerial(workers, 'SLNO');
                    const senderName = profile?.name || profile?.email || 'ADMIN';
                    for (const row of bulkPreview) {
                      try {
                        const aadhaar = String(row.AADHAR_NO || row.AADHAAR || row.AADHAAR_NO || row['AADHAAR NUMBER'] || row['AADHAAR_NO'] || '').trim();
                        const name = (row.NAME || row.WORKER_NAME || '').toString().toUpperCase().trim();
                        const fatherName = (row.FATHER_NAME || row['FATHER NAME'] || '').toString().toUpperCase().trim() || '';
                        const dob = row.DOB || '';
                        if (!aadhaar || !name) { errors++; continue; }
                        const slno = currentSlno++;
                        const empid = `KAC${String(slno).padStart(4, '0')}`;
                        await Promise.all([
                          addDoc(collection(db, 'workers'), {
                            SLNO: slno,
                            EMPID: empid,
                            REFFERENCE: row.REFFERENCE || '',
                            WORKER_NAME: name,
                            FATHER_NAME: fatherName,
                            DESIGNATION: 'LABOUR',
                            DOB: dob,
                            MOBILE_NO: String(row.MOBILE_NO || row.MOBILE || ''),
                            AADHAR_NO: aadhaar,
                            PHOTO: row.PHOTO || '',
                            AADHAR_PHOTO: row.AADHAR_PHOTO || '',
                            JOINING_DATE_CLIENT: row.JOINING_DATE_CLIENT || '',
                            JOINING_DATE_OFFICE: row.JOINING_DATE_OFFICE || '',
                            ADDRESS: (row.ADDRESS || '').toString().toUpperCase().trim() || '',
                            PAN_NO: (row.PAN_NO || '').toString().toUpperCase().trim() || '',
                            PAN_PHOTO: row.PAN_PHOTO || '',
                            BANK: (row.BANK || '').toString().toUpperCase().trim() || '',
                            ACCOUNT_NO: String(row.ACCOUNT_NO || ''),
                            IFSC: (row.IFSC || '').toString().toUpperCase().trim() || '',
                            BANK_PHOTO: row.BANK_PHOTO || '',
                            PROJECT: (row.PROJECT || '').toString().toUpperCase().trim() || '',
                            STATUS: 'ACTIVE',
                            timestamp: new Date(),
                          }),
                          addDoc(collection(db, 'worker_requests'), {
                            REFFERENCE: row.REFFERENCE || '',
                            WORKER_NAME: name,
                            FATHER_NAME: fatherName,
                            DESIGNATION: 'LABOUR',
                            DOB: dob,
                            MOBILE_NO: String(row.MOBILE_NO || row.MOBILE || ''),
                            AADHAR_NO: aadhaar,
                            PHOTO: row.PHOTO || '',
                            AADHAR_PHOTO: row.AADHAR_PHOTO || '',
                            JOINING_DATE_CLIENT: row.JOINING_DATE_CLIENT || '',
                            JOINING_DATE_OFFICE: row.JOINING_DATE_OFFICE || '',
                            ADDRESS: (row.ADDRESS || '').toString().toUpperCase().trim() || '',
                            PAN_NO: (row.PAN_NO || '').toString().toUpperCase().trim() || '',
                            PAN_PHOTO: row.PAN_PHOTO || '',
                            BANK: (row.BANK || '').toString().toUpperCase().trim() || '',
                            ACCOUNT_NO: String(row.ACCOUNT_NO || ''),
                            IFSC: (row.IFSC || '').toString().toUpperCase().trim() || '',
                            BANK_PHOTO: row.BANK_PHOTO || '',
                            PROJECT: (row.PROJECT || '').toString().toUpperCase().trim() || '',
                            SLNO: slno,
                            EMPID: empid,
                            SENDER_NAME: senderName,
                            STATUS: 'APPROVED',
                            SOURCE: 'ADMIN',
                            timestamp: new Date(),
                          }),
                        ]);
                        success++;
                      } catch (e) {
                        console.error(e);
                        errors++;
                      }
                    }
                    setBulkUploading(false);
                    alert(`Bulk upload complete!\n✅ ${success} workers added\n❌ ${errors} errors`);
                    setShowBulkModal(false);
                    setBulkPreview([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    load();
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#0055ff',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: bulkUploading ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: bulkUploading ? 0.6 : 1,
                  }}
                >
                  {bulkUploading ? 'UPLOADING...' : `UPLOAD ${bulkPreview.length} WORKERS`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const actionIconBtn = {
  background: '#0a0a0a',
  border: '1px solid #222',
  borderRadius: 4,
  padding: '4px 6px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const settingsStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0a0a0a',
    padding: '28px',
    borderRadius: '15px',
    width: '100%',
    maxWidth: '480px',
    border: '1px solid #1a1a1a',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid #111',
    paddingBottom: '15px',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' },
  subtitle: { margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' },
  toggleAllBtn: {
    backgroundColor: '#111',
    border: '1px solid #222',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'inline-block',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#000',
    border: '1px solid #1a1a1a',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#0055ff',
    cursor: 'pointer',
  },
  checkboxText: {
    color: '#ccc',
    fontSize: '12px',
    fontWeight: '500',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
    fontSize: '13px',
  },
};

export default RequestWorker;
