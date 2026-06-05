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
  MEASUREMENT_DESC: '',
  QUANTITY: '',
  UNIT: 'Nos.',
  LOCATION: '',
  AGENCY_CONTRACTOR: '',
  REMARKS: '',
};

const UNITS = ['Nos.', 'Mtr.', 'Sq.Mtr.', 'Cu.Mtr.', 'Kg.', 'Ltr.', 'Days', 'Lumpsum'];

const JmcView = () => {
  const [jmcs, setJmcs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const allColumnFields = useMemo(() => [
    'SL',
    'PROJECT_NAME',
    'WORK_TYPE',
    'DATE',
    'MEASUREMENT_DESC',
    'QUANTITY',
    'UNIT',
    'LOCATION',
    'AGENCY_CONTRACTOR',
    'REMARKS',
    'ACTIONS',
  ], []);
  const [visibleColumns, setVisibleColumns] = useState(allColumnFields);

  const loadData = useCallback(async () => {
    try {
      const [pSnap, jSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('SL', 'asc'))),
        getDocs(query(collection(db, 'jmc'), orderBy('DATE', 'desc'))),
      ]);
      setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setJmcs(jSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("JMC Load Error:", err);
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
      const data = { ...formData, QUANTITY: Number(formData.QUANTITY) || 0, timestamp: new Date() };
      if (editingId) {
        await updateDoc(doc(db, 'jmc', editingId), data);
      } else {
        await addDoc(collection(db, 'jmc'), data);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      alert("Error saving JMC: " + err.message);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this JMC entry?')) {
      try {
        await deleteDoc(doc(db, 'jmc', id));
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
    { field: "MEASUREMENT_DESC", headerName: "MEASUREMENT DESCRIPTION", width: 260, hide: !visibleColumns.includes('MEASUREMENT_DESC') },
    { field: "QUANTITY", headerName: "QUANTITY", width: 100, hide: !visibleColumns.includes('QUANTITY') },
    { field: "UNIT", headerName: "UNIT", width: 100, hide: !visibleColumns.includes('UNIT') },
    { field: "LOCATION", headerName: "LOCATION", width: 160, hide: !visibleColumns.includes('LOCATION') },
    { field: "AGENCY_CONTRACTOR", headerName: "AGENCY / CONTRACTOR", width: 180, hide: !visibleColumns.includes('AGENCY_CONTRACTOR') },
    { field: "REMARKS", headerName: "REMARKS", width: 200, hide: !visibleColumns.includes('REMARKS') },
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
    const types = new Set(jmcs.map(j => j.WORK_TYPE).filter(Boolean));
    return ['', ...types];
  }, [jmcs]);

  const dateOptions = useMemo(() => {
    const dates = new Set(jmcs.map(j => j.DATE).filter(Boolean));
    return ['', ...Array.from(dates).sort().reverse()];
  }, [jmcs]);

  const filtered = useMemo(() => {
    return jmcs.filter(j => {
      const matchesSearch = !searchText || Object.values(j).some(v => String(v).toLowerCase().includes(searchText.toLowerCase()));
      const matchesType = !workTypeFilter || j.WORK_TYPE === workTypeFilter;
      const matchesDate = !dateFilter || j.DATE === dateFilter;
      return matchesSearch && matchesType && matchesDate;
    });
  }, [jmcs, searchText, workTypeFilter, dateFilter]);

  if (loading) return <div style={s.loading}>Loading JMC...</div>;

  return (
    <div>
      <div style={s.filterRow}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Search JMC..." style={s.searchInput} value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowColumnToggle(!showColumnToggle)} style={s.settingsBtn}>
            <Columns2 size={16} /> COLUMNS
          </button>
          {showColumnToggle && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 999,
              backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)',
              borderRadius: '8px', padding: '8px', minWidth: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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
                     field === 'MEASUREMENT_DESC' ? 'MEASUREMENT DESCRIPTION' :
                     field === 'AGENCY_CONTRACTOR' ? 'AGENCY / CONTRACTOR' :
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
        <ExportToolbar rows={filtered} columnDefs={columnDefs} title="JMC" filename="jmc" />
        <button onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setShowModal(true); }} style={s.primaryBtn}>
          <Plus size={18} /> NEW JMC
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
              <h3 style={{ margin: 0, color: '#fff' }}>{editingId ? 'EDIT' : 'NEW'} JMC</h3>
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
                  <label style={s.label}>UNIT</label>
                  <select style={s.formInput} value={formData.UNIT} onChange={e => setFormData({ ...formData, UNIT: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={s.label}>MEASUREMENT DESCRIPTION</label>
                  <textarea style={{ ...s.formInput, minHeight: '70px', resize: 'vertical' }} placeholder="Describe the measurement" value={formData.MEASUREMENT_DESC} onChange={e => setFormData({ ...formData, MEASUREMENT_DESC: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>QUANTITY</label>
                  <input type="number" step="0.01" style={s.formInput} placeholder="0.00" value={formData.QUANTITY} onChange={e => setFormData({ ...formData, QUANTITY: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>LOCATION</label>
                  <input type="text" style={s.formInput} placeholder="Location" value={formData.LOCATION} onChange={e => setFormData({ ...formData, LOCATION: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={s.label}>AGENCY / CONTRACTOR</label>
                  <input type="text" style={s.formInput} placeholder="Agency or contractor name" value={formData.AGENCY_CONTRACTOR} onChange={e => setFormData({ ...formData, AGENCY_CONTRACTOR: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={s.label}>REMARKS</label>
                  <input type="text" style={s.formInput} placeholder="Remarks" value={formData.REMARKS} onChange={e => setFormData({ ...formData, REMARKS: e.target.value })} />
                </div>
              </div>
              <button type="submit" style={s.submitBtn}>{editingId ? 'UPDATE' : 'SAVE'} JMC</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JmcView;