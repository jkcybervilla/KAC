import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Plus, Search, X, Edit3, Trash2 } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { Columns2, Eye, EyeOff } from 'lucide-react';

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

const EMPTY_FORM = {
  PROJECT_ID: '',
  PROJECT_NAME: '',
  WORK_TYPE: '',
  DATE: '',
  WORK_DESCRIPTION: '',
  PROGRESS: '0',
  ISSUES_REMARKS: '',
  STATUS: 'Not Started',
  SENDER: '',
  SUPERVISOR: '',
  APPROVER: '',
};

const STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Rejected'];

const DprView = () => {
  const [dprs, setDprs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const allColumnFields = useMemo(() => [
    'SL',
    'PROJECT_NAME',
    'WORK_TYPE',
    'DATE',
    'WORK_DESCRIPTION',
    'PROGRESS',
    'ISSUES_REMARKS',
    'STATUS',
    'SENDER',
    'SUPERVISOR',
    'APPROVER',
    'ACTIONS',
  ], []);
  const [visibleColumns, setVisibleColumns] = useState(allColumnFields);

  const loadData = useCallback(async () => {
    try {
      const [pSnap, dSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('SL', 'asc'))),
        getDocs(query(collection(db, 'dpr'), orderBy('DATE', 'desc'))),
      ]);
      setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDprs(dSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("DPR Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleProjectChange = (projectId) => {
    const selected = projects.find(p => p.id === projectId);
    if (selected) {
      setFormData({
        ...formData,
        PROJECT_ID: projectId,
        PROJECT_NAME: selected.PROJECT_NAME || '',
        WORK_TYPE: selected.TYPE || '',
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
      const data = { ...formData, PROGRESS: Number(formData.PROGRESS) || 0, timestamp: new Date() };
      if (editingId) {
        await updateDoc(doc(db, 'dpr', editingId), data);
      } else {
        await addDoc(collection(db, 'dpr'), data);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      alert("Error saving DPR: " + err.message);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this DPR entry?')) {
      try {
        await deleteDoc(doc(db, 'dpr', id));
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const columnDefs = useMemo(() => [
    {
      headerName: "SL",
      width: 60,
      pinned: 'left',
      hide: !visibleColumns.includes('SL'),
      valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : ''),
    },
    { field: "PROJECT_NAME", headerName: "PROJECT", width: 180, pinned: 'left', hide: !visibleColumns.includes('PROJECT_NAME') },
    { field: "WORK_TYPE", headerName: "WORK TYPE", width: 90, hide: !visibleColumns.includes('WORK_TYPE') },
    {
      field: "DATE",
      headerName: "DATE",
      width: 120,
      hide: !visibleColumns.includes('DATE'),
      cellRenderer: (params) => {
        if (!params.value) return '';
        try { return new Date(params.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return params.value; }
      },
    },
    { field: "WORK_DESCRIPTION", headerName: "WORK DESCRIPTION", width: 250, hide: !visibleColumns.includes('WORK_DESCRIPTION') },
    { field: "PROGRESS", headerName: "PROGRESS (%)", width: 110, valueFormatter: (p) => `${p.value}%`, hide: !visibleColumns.includes('PROGRESS') },
    { field: "ISSUES_REMARKS", headerName: "ISSUES / REMARKS", width: 220, hide: !visibleColumns.includes('ISSUES_REMARKS') },
    {
      field: "STATUS",
      headerName: "STATUS",
      width: 130,
      hide: !visibleColumns.includes('STATUS'),
      cellStyle: (params) => {
        const colors = {
          'Not Started': '#666',
          'In Progress': '#ff9800',
          'Submitted': '#2196F3',
          'Approved': '#4CAF50',
          'Rejected': '#f44336'
        };
        return { backgroundColor: colors[params.value] || '#555', color: '#fff', textAlign: 'center', fontWeight: 'bold', borderRadius: '4px' };
      },
    },
    { field: "SENDER", headerName: "SENDER", width: 130, hide: !visibleColumns.includes('SENDER') },
    { field: "SUPERVISOR", headerName: "SUPERVISOR", width: 140, hide: !visibleColumns.includes('SUPERVISOR') },
    { field: "APPROVER", headerName: "APPROVER", width: 140, hide: !visibleColumns.includes('APPROVER') },
    {
      field: "ACTIONS",
      headerName: "ACTION",
      width: 100,
      pinned: 'right',
      hide: !visibleColumns.includes('ACTIONS'),
      cellRenderer: (params) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '100%' }}>
          <button onClick={() => handleEdit(params.data)} style={{ background: '#0055ff', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}>
            <Edit3 size={14} />
          </button>
          <button onClick={() => handleDelete(params.data.id)} style={{ background: '#f44336', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [visibleColumns]);

  const workTypeOptions = useMemo(() => {
    const types = new Set(dprs.map(d => d.WORK_TYPE).filter(Boolean));
    return ['', ...types];
  }, [dprs]);

  const dateOptions = useMemo(() => {
    const dates = new Set(dprs.map(d => d.DATE).filter(Boolean));
    return ['', ...Array.from(dates).sort().reverse()];
  }, [dprs]);

  const filtered = useMemo(() => {
    return dprs.filter(d => {
      const matchesSearch = !searchText || Object.values(d).some(v => String(v).toLowerCase().includes(searchText.toLowerCase()));
      const matchesType = !workTypeFilter || d.WORK_TYPE === workTypeFilter;
      const matchesDate = !dateFilter || d.DATE === dateFilter;
      const matchesStatus = !statusFilter || d.STATUS === statusFilter;
      return matchesSearch && matchesType && matchesDate && matchesStatus;
    });
  }, [dprs, searchText, workTypeFilter, dateFilter, statusFilter]);

  if (loading) return <div style={s.loading}>Loading DPR...</div>;

  return (
    <div>
      <div style={s.filterRow}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Search DPR..." style={s.searchInput} value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowColumnToggle(!showColumnToggle)} style={s.settingsBtn}>
            <Columns2 size={16} /> COLUMNS
          </button>
          {showColumnToggle && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 999,
              backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: '8px', padding: '8px', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              {allColumnFields.map(field => {
                const isVisible = visibleColumns.includes(field);
                return (
                  <label key={field} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
                    borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)',
                    background: isVisible ? 'var(--surface-2)' : 'transparent'
                  }}>
                    <input type="checkbox" checked={isVisible} onChange={() => {
                      setVisibleColumns(prev =>
                        isVisible ? prev.filter(f => f !== field) : [...prev, field]
                      );
                    }} />
                    {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    {field === 'SL' ? 'SL' :
                     field === 'PROJECT_NAME' ? 'PROJECT' :
                     field === 'WORK_TYPE' ? 'WORK TYPE' :
                     field === 'WORK_DESCRIPTION' ? 'WORK DESCRIPTION' :
                     field === 'ISSUES_REMARKS' ? 'ISSUES / REMARKS' :
                     field === 'ACTIONS' ? 'ACTION' :
                     field}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <select style={s.select} value={workTypeFilter} onChange={e => setWorkTypeFilter(e.target.value)}>
          <option value="">ALL WORK TYPE</option>
          {workTypeOptions.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" style={s.select} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select style={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">ALL STATUS</option>
          {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <ExportToolbar rows={filtered} columnDefs={columnDefs} title="DPR" filename="dpr" />
        <button onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); }} style={s.primaryBtn}>
          <Plus size={18} /> NEW DPR
        </button>
      </div>

      <div style={s.gridSection}>
        <div style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            rowData={filtered}
            columnDefs={columnDefs}
        defaultColDef={{ sortable: true, filter: true, resizable: true, wrapHeaderText: true, autoHeaderHeight: true }}
        quickFilterText={searchText}
        animateRows
        rowHeight={34}
        headerHeight={48}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showModal && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.modalContent, maxWidth: '700px' }}>
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, color: '#fff' }}>{editingId ? 'EDIT' : 'NEW'} DPR</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={() => { setShowModal(false); setEditingId(null); }} />
            </div>
            <form onSubmit={handleSave} style={s.form}>
              <div style={s.inputGrid}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>PROJECT *</label>
                  <select required style={s.formInput} value={formData.PROJECT_ID} onChange={e => handleProjectChange(e.target.value)}>
                    <option value="">-- SELECT PROJECT --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.PROJECT_NAME || 'Unknown'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>WORK TYPE</label>
                  <input type="text" style={{ ...s.formInput, fontStyle: 'italic', opacity: 0.7 }} value={formData.WORK_TYPE} readOnly />
                </div>
                <div>
                  <label style={s.label}>DATE</label>
                  <input type="date" style={s.formInput} value={formData.DATE} onChange={e => setFormData({ ...formData, DATE: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>STATUS</label>
                  <select style={s.formInput} value={formData.STATUS} onChange={e => setFormData({ ...formData, STATUS: e.target.value })}>
                    {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>WORK DESCRIPTION</label>
                  <textarea style={{ ...s.formInput, minHeight: '70px', resize: 'vertical' }} placeholder="Describe the work done" value={formData.WORK_DESCRIPTION} onChange={e => setFormData({ ...formData, WORK_DESCRIPTION: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>PROGRESS (%)</label>
                  <input type="number" min="0" max="100" style={s.formInput} placeholder="0-100" value={formData.PROGRESS} onChange={e => setFormData({ ...formData, PROGRESS: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>ISSUES / REMARKS</label>
                  <input type="text" style={s.formInput} placeholder="Issues or remarks" value={formData.ISSUES_REMARKS} onChange={e => setFormData({ ...formData, ISSUES_REMARKS: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>SENDER</label>
                  <input type="text" style={s.formInput} placeholder="Sender name" value={formData.SENDER} onChange={e => setFormData({ ...formData, SENDER: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={s.label}>SUPERVISOR</label>
                  <input type="text" style={s.formInput} placeholder="Supervisor name" value={formData.SUPERVISOR} onChange={e => setFormData({ ...formData, SUPERVISOR: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={s.label}>APPROVER</label>
                  <input type="text" style={s.formInput} placeholder="Approver name" value={formData.APPROVER} onChange={e => setFormData({ ...formData, APPROVER: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <button type="submit" style={s.submitBtn}>{editingId ? 'UPDATE' : 'SAVE'} DPR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DprView;