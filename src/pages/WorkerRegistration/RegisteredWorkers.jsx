import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Search, Settings2, X, Edit3, Trash2 } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';

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

const STORAGE_KEY = 'kac_worker_column_visibility';

const WORKER_COLUMNS = [
  { key: 'slno', label: 'SL NO' },
  { key: 'empid', label: 'EMP ID' },
  { key: 'reference', label: 'Reference' },
  { key: 'name', label: 'Name' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'dob', label: 'DOB' },
  { key: 'phone', label: 'PH Number' },
  { key: 'aadhaar', label: 'Aadhaar No' },
  { key: 'joiningClient', label: 'Joining (Client)' },
  { key: 'joiningOffice', label: 'Joining (Office)' },
  { key: 'address', label: 'Address' },
  { key: 'pan', label: 'PAN Number' },
  { key: 'panPhoto', label: 'PAN Photo' },
  { key: 'bank', label: 'Bank' },
  { key: 'account', label: 'Account No' },
  { key: 'ifsc', label: 'IFSC' },
  { key: 'bankPhoto', label: 'Bank Photo' },
  { key: 'uan', label: 'UAN No' },
  { key: 'esic', label: 'ESIC No' },
  { key: 'project', label: 'Project' },
];

const DEFAULT_VISIBILITY = {
  slno: true,
  empid: true,
  reference: true,
  name: true,
  fatherName: true,
  designation: true,
  dob: true,
  phone: true,
  aadhaar: true,
  joiningClient: true,
  joiningOffice: true,
  address: false,
  pan: false,
  panPhoto: false,
  bank: false,
  account: false,
  ifsc: false,
  bankPhoto: false,
  uan: false,
  esic: false,
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

const WorkerColumnSettings = ({ isOpen, onClose, visibility, onVisibilityChange }) => {
  useEffect(() => {
    if (visibility) {
      saveSettings(visibility);
    }
  }, [visibility]);

  if (!isOpen) return null;

  const allVisible = WORKER_COLUMNS.every((col) => visibility[col.key]);

  const toggleAll = () => {
    const newVal = !allVisible;
    const updated = {};
    WORKER_COLUMNS.forEach((col) => {
      updated[col.key] = newVal;
    });
    onVisibilityChange(updated);
  };

  const toggleColumn = (key) => {
    onVisibilityChange({ ...visibility, [key]: !visibility[key] });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>WORKER COLUMN VISIBILITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>
        <p style={styles.subtitle}>Show / hide columns in the worker info grid.</p>

        <button type="button" onClick={toggleAll} style={styles.toggleAllBtn}>
          {allVisible ? 'HIDE ALL' : 'SHOW ALL'}
        </button>

        <div style={styles.grid}>
          {WORKER_COLUMNS.map((col) => (
            <label key={col.key} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!!visibility[col.key]}
                onChange={() => toggleColumn(col.key)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>{col.label}</span>
            </label>
          ))}
        </div>

        <button type="button" onClick={onClose} style={styles.doneBtn}>
          DONE
        </button>
      </div>
    </div>
  );
};

// Worker Properties Modal — View, Edit & Delete
const WorkerPropertiesModal = ({ worker, onClose, onSave, onDelete, projects }) => {
  const [data, setData] = useState({ ...worker });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fields = [
    { label: 'SL NO', key: 'SLNO', type: 'text' },
    { label: 'EMP ID', key: 'EMPID', type: 'text' },
    { label: 'REFERENCE', key: 'REFFERENCE', type: 'text' },
    { label: 'WORKER NAME', key: 'WORKER_NAME', type: 'text' },
    { label: 'FATHER NAME', key: 'FATHER_NAME', type: 'text' },
    { label: 'DESIGNATION', key: 'DESIGNATION', type: 'text' },
    { label: 'DOB', key: 'DOB', type: 'text' },
    { label: 'MOBILE NO', key: 'MOBILE_NO', type: 'text' },
    { label: 'AADHAAR NO', key: 'AADHAR_NO', type: 'text' },
    { label: 'JOINING (CLIENT)', key: 'JOINING_DATE_CLIENT', type: 'text' },
    { label: 'JOINING (OFFICE)', key: 'JOINING_DATE_OFFICE', type: 'text' },
    { label: 'ADDRESS', key: 'ADDRESS', type: 'text' },
    { label: 'PAN NUMBER', key: 'PAN_NO', type: 'text' },
    { label: 'PAN PHOTO', key: 'PAN_PHOTO', type: 'text' },
    { label: 'BANK', key: 'BANK', type: 'text' },
    { label: 'ACCOUNT NO', key: 'ACCOUNT_NO', type: 'text' },
    { label: 'IFSC', key: 'IFSC', type: 'text' },
    { label: 'BANK PHOTO', key: 'BANK_PHOTO', type: 'text' },
    { label: 'UAN NO', key: 'UAN_NO', type: 'text' },
    { label: 'ESIC NO', key: 'ESIC_NO', type: 'text' },
    { label: 'PROJECT', key: 'PROJECT', type: 'select', options: projects },
    { label: 'STATUS', key: 'STATUS', type: 'text' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'workers', worker.id), data);
      onSave();
    } catch (err) {
      alert('Update error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete worker "${worker.WORKER_NAME || worker.EMPID}"?`)) return;
    try {
      await deleteDoc(doc(db, 'workers', worker.id));
      onDelete();
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.modal, maxWidth: '720px' }}>
        <div style={styles.header}>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            WORKER PROPERTIES — {worker.WORKER_NAME || worker.EMPID}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleDelete}
              style={{
                background: 'none', border: '1px solid #7f1d1d', color: '#ef4444',
                padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold'
              }}
            >
              <Trash2 size={14} /> DELETE
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: 'none', border: '1px solid #333', color: '#0055ff',
                padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold'
              }}
            >
              <Edit3 size={14} /> {isEditing ? 'VIEW' : 'EDIT'}
            </button>
            <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
          {fields.map((f) => {
            const val = data[f.key];
            return (
              <div key={f.key} style={{ gridColumn: f.key === 'ADDRESS' ? 'span 2' : undefined }}>
                <span style={s.label}>{f.label}</span>
                {isEditing ? (
                  f.type === 'select' ? (
                    <select
                      style={s.formInput}
                      value={data[f.key] || ''}
                      onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                    >
                      <option value="">— Select —</option>
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={s.formInput}
                      value={data[f.key] || ''}
                      onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                    />
                  )
                ) : (
                  <p style={{ margin: '4px 0 0', color: '#ccc' }}>{val ?? '—'}</p>
                )}
              </div>
            );
          })}
        </div>

        {isEditing && (
          <button type="button" style={{ ...s.submitBtn, marginTop: 20 }} onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'UPDATE WORKER'}
          </button>
        )}
      </div>
    </div>
  );
};

const RegisteredWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [gridApi, setGridApi] = useState(null);
  const [columnApi, setColumnApi] = useState(null);

  const loadData = async () => {
    try {
      const [wSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'workers'), orderBy('SLNO', 'asc'))),
        getDocs(collection(db, 'projects')),
      ]);
      setWorkers(wSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProjects(pSnap.docs.map((d) => d.data().PROJECT_NAME).filter(Boolean));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO', width: 80, pinned: 'left', hide: !columnVisibility.slno },
      { field: 'EMPID', headerName: 'EMP ID', width: 100, pinned: 'left', hide: !columnVisibility.empid },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 120, hide: !columnVisibility.reference },
      { field: 'WORKER_NAME', headerName: 'NAME', minWidth: 160, flex: 1, hide: !columnVisibility.name },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 140, hide: !columnVisibility.fatherName },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120, hide: !columnVisibility.designation },
      { field: 'DOB', headerName: 'DOB', width: 110, hide: !columnVisibility.dob },
      { field: 'MOBILE_NO', headerName: 'PH NUMBER', width: 120, hide: !columnVisibility.phone },
      { field: 'AADHAR_NO', headerName: 'AADHAAR NO', width: 140, hide: !columnVisibility.aadhaar },
      { field: 'JOINING_DATE_CLIENT', headerName: 'JOINING (CLIENT)', width: 130, hide: !columnVisibility.joiningClient },
      { field: 'JOINING_DATE_OFFICE', headerName: 'JOINING (OFFICE)', width: 130, hide: !columnVisibility.joiningOffice },
      { field: 'ADDRESS', headerName: 'ADDRESS', width: 180, hide: !columnVisibility.address },
      { field: 'PAN_NO', headerName: 'PAN NUMBER', width: 120, hide: !columnVisibility.pan },
      { field: 'PAN_PHOTO', headerName: 'PAN PHOTO', width: 110, hide: !columnVisibility.panPhoto },
      { field: 'BANK', headerName: 'BANK', width: 100, hide: !columnVisibility.bank },
      { field: 'ACCOUNT_NO', headerName: 'ACCOUNT NO', width: 120, hide: !columnVisibility.account },
      { field: 'IFSC', headerName: 'IFSC', width: 100, hide: !columnVisibility.ifsc },
      { field: 'BANK_PHOTO', headerName: 'BANK PHOTO', width: 110, hide: !columnVisibility.bankPhoto },
      { field: 'UAN_NO', headerName: 'UAN NO', width: 100, hide: !columnVisibility.uan },
      { field: 'ESIC_NO', headerName: 'ESIC NO', width: 100, hide: !columnVisibility.esic },
      { field: 'PROJECT', headerName: 'PROJECT', width: 140, hide: !columnVisibility.project },
      {
        headerName: 'DETAILS',
        width: 100,
        pinned: 'right',
        cellRenderer: (params) => (
          <button
            type="button"
            style={{
              background: 'none',
              border: '1px solid #222',
              color: '#0055ff',
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            onClick={() => setSelectedWorker(params.data)}
          >
            VIEW
          </button>
        ),
      },
    ],
    [columnVisibility]
  );

  const handleGridReady = useCallback((params) => {
    setGridApi(params.api);
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
  }, [autoSizeAllColumns, columnDefs, workers]);

  if (loading) return <div style={{ color: '#666', padding: 20 }}>Loading register...</div>;

  return (
    <div>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter workers..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <ExportToolbar rows={workers} columnDefs={columnDefs} title="Worker Register" filename="worker-register" />
        <button type="button" onClick={() => setShowSettings(true)} style={s.secondaryBtn}>
          <Settings2 size={16} /> COLUMNS
        </button>
      </div>
      <div style={s.gridSection}>
        <div style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            rowData={workers}
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

      <WorkerColumnSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        visibility={columnVisibility}
        onVisibilityChange={setColumnVisibility}
      />

      {selectedWorker && (
        <WorkerPropertiesModal
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onSave={() => {
            setSelectedWorker(null);
            loadData();
          }}
          onDelete={() => {
            setSelectedWorker(null);
            loadData();
          }}
          projects={projects}
        />
      )}
    </div>
  );
};

const styles = {
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

export default RegisteredWorkers;