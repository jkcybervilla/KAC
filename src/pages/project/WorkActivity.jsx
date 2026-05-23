import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Plus, Search, X, Settings2, Edit3, Trash2 } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';

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
});

const EMPTY_FORM = {
  PROJECT_ID: '',
  PROJECT_NAME: '',
  REG: '',
  TYPE: '',
  ERECTION: '',
  CALENDER: '',
  LINE_NAME: '',
  MAN: '',
  PKG_NO: '',
  AGENCY: '',
  DISTRICT: '',
  SENDER: '',
  SUPERVISOR: '',
  DETAILS: '',
  DATE: '',
};

const COLUMNS_CONFIG = [
  { key: 'sl', label: 'SL NO' },
  { key: 'reg', label: 'REG' },
  { key: 'type', label: 'TYPE' },
  { key: 'erection', label: 'ERECTION' },
  { key: 'calender', label: 'CALENDER' },
  { key: 'lineName', label: 'LINE NAME' },
  { key: 'man', label: 'MAN' },
  { key: 'pkgNo', label: 'PKG NO' },
  { key: 'agency', label: 'AGENCY' },
  { key: 'district', label: 'DISTRICT' },
  { key: 'sender', label: 'SENDER' },
  { key: 'supervisor', label: 'SUPERVISOR' },
  { key: 'details', label: 'DETAILS' },
  { key: 'date', label: 'DATE' },
];

const DEFAULT_VISIBILITY = COLUMNS_CONFIG.reduce((acc, col) => {
  acc[col.key] = true;
  return acc;
}, {});

const STORAGE_KEY = 'kac_work_activity_columns';

const loadColumnSettings = () => {
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

const saveColumnSettings = (visibility) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // ignore
  }
};

const ColumnSettings = ({ isOpen, onClose, visibility, onVisibilityChange }) => {
  useEffect(() => {
    if (visibility) {
      saveColumnSettings(visibility);
    }
  }, [visibility]);

  if (!isOpen) return null;

  const allVisible = COLUMNS_CONFIG.every((col) => visibility[col.key]);

  const toggleAll = () => {
    const newVal = !allVisible;
    const updated = {};
    COLUMNS_CONFIG.forEach((col) => {
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
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>COLUMN VISIBILITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>
        <p style={styles.subtitle}>Show / hide columns in the work activity grid.</p>

        <button type="button" onClick={toggleAll} style={styles.toggleAllBtn}>
          {allVisible ? 'HIDE ALL' : 'SHOW ALL'}
        </button>

        <div style={styles.checkboxGrid}>
          {COLUMNS_CONFIG.map((col) => (
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

const WorkActivity = () => {
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showSettings, setShowSettings] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(loadColumnSettings);

  const loadInitialData = useCallback(async () => {
    try {
      const pSnap = await getDocs(query(collection(db, 'projects'), orderBy('SL', 'asc')));
      const projectsList = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsList);

      const aSnap = await getDocs(query(collection(db, 'workActivities'), orderBy('DATE', 'desc')));
      setActivities(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Data Load Error:", err);
      alert("Error loading data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const handleProjectChange = (projectId) => {
    const selected = projects.find(p => p.id === projectId);
    if (selected) {
      setFormData({
        ...formData,
        PROJECT_ID: projectId,
        PROJECT_NAME: selected.PROJECT_NAME || '',
        REG: selected.REGION || '',
        TYPE: selected.TYPE || '',
        LINE_NAME: selected.LINE_NAME || '',
        MAN: selected.CLIENT || '',
        PKG_NO: selected.PO_NUMBER || '',
        AGENCY: selected.VENDORS || (Array.isArray(selected.VENDORS_LIST) ? selected.VENDORS_LIST.join(', ') : ''),
        DISTRICT: selected.DISTRICT || '',
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.PROJECT_ID) {
      alert('Please select a Project');
      return;
    }
    try {
      const activityData = { ...formData, timestamp: new Date() };
      if (editingId) {
        await updateDoc(doc(db, 'workActivities', editingId), activityData);
      } else {
        await addDoc(collection(db, 'workActivities'), activityData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      loadInitialData();
    } catch (err) {
      alert("Error saving activity: " + err.message);
    }
  };

  const handleEdit = (activity) => {
    setFormData(activity);
    setEditingId(activity.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await deleteDoc(doc(db, 'workActivities', id));
        loadInitialData();
      } catch (err) {
        alert("Error deleting activity: " + err.message);
      }
    }
  };

  const columnDefs = useMemo(() => [
    { headerName: "SL", width: 60, pinned: 'left', hide: !columnVisibility.sl, valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : '') },
    { field: "REG", headerName: "REG", width: 110, hide: !columnVisibility.reg },
    { field: "TYPE", headerName: "TYPE", width: 80, hide: !columnVisibility.type },
    { field: "ERECTION", headerName: "ERECTION", width: 130, hide: !columnVisibility.erection },
    { field: "CALENDER", headerName: "CALENDER", width: 120, hide: !columnVisibility.calender, cellRenderer: (p) => p.value ? new Date(p.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { field: "LINE_NAME", headerName: "LINE NAME", width: 130, hide: !columnVisibility.lineName },
    { field: "MAN", headerName: "MAN", width: 100, hide: !columnVisibility.man },
    { field: "PKG_NO", headerName: "PKG NO", width: 110, hide: !columnVisibility.pkgNo },
    { field: "AGENCY", headerName: "AGENCY", width: 140, hide: !columnVisibility.agency },
    { field: "DISTRICT", headerName: "DISTRICT", width: 120, hide: !columnVisibility.district },
    { field: "SENDER", headerName: "SENDER", width: 120, hide: !columnVisibility.sender },
    { field: "SUPERVISOR", headerName: "SUPERVISOR", width: 140, hide: !columnVisibility.supervisor },
    { field: "DETAILS", headerName: "DETAILS", width: 220, hide: !columnVisibility.details },
    { field: "DATE", headerName: "DATE", width: 120, hide: !columnVisibility.date, cellRenderer: (p) => p.value ? new Date(p.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { field: "ACTIONS", headerName: "ACTION", width: 100, pinned: 'right', cellRenderer: (p) => (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
        <button onClick={() => handleEdit(p.data)} style={{ background: '#0055ff', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}><Edit3 size={14} /></button>
        <button onClick={() => handleDelete(p.data.id)} style={{ background: '#f44336', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={14} /></button>
      </div>
    )}
  ], [columnVisibility]);

  const workTypeOptions = useMemo(() => {
    const types = new Set(activities.map(a => a.TYPE).filter(Boolean));
    return ['', ...types];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = !searchText || Object.values(activity).some(value => String(value).toLowerCase().includes(searchText.toLowerCase()));
      const matchesType = !workTypeFilter || activity.TYPE === workTypeFilter;
      const matchesDate = !dateFilter || activity.DATE === dateFilter;
      return matchesSearch && matchesType && matchesDate;
    });
  }, [activities, searchText, workTypeFilter, dateFilter]);

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '20%' }}>Loading Work Activities...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--surface)', padding: '8px 15px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Quick Search..." style={{ background: 'none', border: 'none', color: 'var(--text)', outline: 'none', fontSize: '13px', width: '200px' }} value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
        <select style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '13px' }} value={workTypeFilter} onChange={e => setWorkTypeFilter(e.target.value)}>
          <option value="">ALL WORK TYPE</option>
          {workTypeOptions.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '13px', fontFamily: 'inherit' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <ExportToolbar rows={filteredActivities} columnDefs={columnDefs} title="Work Activity" filename="work_activity" />
        <button onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); }} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Plus size={18} /> NEW ACTIVITY
        </button>
        <button type="button" onClick={() => setShowSettings(true)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <Settings2 size={16} /> COLUMNS
        </button>
      </div>

      <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ height: '75vh', width: '100%' }}>
          <AgGridReact
            rowData={filteredActivities}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            quickFilterText={searchText}
            animateRows={true}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', width: '750px', border: '1px solid #1a1a1a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>{editingId ? 'EDIT' : 'NEW'} WORK ACTIVITY</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={() => { setShowModal(false); setEditingId(null); }} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROJECT *</label>
                  <select required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.PROJECT_ID} onChange={e => handleProjectChange(e.target.value)}>
                    <option value="">-- SELECT PROJECT --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.PROJECT_NAME || 'Unknown'} - {p.PO_NUMBER || 'N/A'}</option>)}
                  </select>
                </div>
                {[
                  ['REG', 'REG'], ['TYPE', 'TYPE'], ['LINE NAME', 'LINE_NAME'], ['MAN (CLIENT)', 'MAN'], ['PKG NO', 'PKG_NO'], ['AGENCY', 'AGENCY'], ['DISTRICT', 'DISTRICT']
                ].map(([label, field]) => (
                  <div key={field}>
                    <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                    <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#888', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', fontStyle: 'italic' }} value={formData[field]} readOnly />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ERECTION</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Erection details" value={formData.ERECTION} onChange={e => setFormData({ ...formData, ERECTION: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CALENDER</label>
                  <input type="date" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.CALENDER} onChange={e => setFormData({ ...formData, CALENDER: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SENDER</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Sender name" value={formData.SENDER} onChange={e => setFormData({ ...formData, SENDER: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUPERVISOR</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Supervisor name" value={formData.SUPERVISOR} onChange={e => setFormData({ ...formData, SUPERVISOR: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE</label>
                  <input type="date" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.DATE} onChange={e => setFormData({ ...formData, DATE: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '10px', color: '#888', marginBottom: '4px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DETAILS</label>
                  <textarea style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }} placeholder="Enter activity details..." value={formData.DETAILS} onChange={e => setFormData({ ...formData, DETAILS: e.target.value })} />
                </div>
              </div>
              <button type="submit" style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px', fontSize: '13px' }}>
                {editingId ? 'UPDATE' : 'SAVE'} ACTIVITY
              </button>
            </form>
          </div>
        </div>
      )}

      <ColumnSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        visibility={columnVisibility}
        onVisibilityChange={setColumnVisibility}
      />
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, padding: '20px',
  },
  modal: {
    backgroundColor: '#0a0a0a', padding: '28px', borderRadius: '15px',
    width: '100%', maxWidth: '480px', border: '1px solid #1a1a1a',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #111', paddingBottom: '15px' },
  modalTitle: { margin: 0, fontSize: '16px', fontWeight: '800', color: '#fff' },
  subtitle: { margin: '0 0 16px 0', color: '#9ca3af', fontSize: '13px' },
  toggleAllBtn: { backgroundColor: '#111', border: '1px solid #222', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', marginBottom: '16px', display: 'inline-block' },
  checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', backgroundColor: '#000', border: '1px solid #1a1a1a', borderRadius: '6px', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px', accentColor: '#0055ff', cursor: 'pointer' },
  checkboxText: { color: '#ccc', fontSize: '12px', fontWeight: '500' },
  doneBtn: { width: '100%', backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', fontSize: '13px' },
};

export default WorkActivity;