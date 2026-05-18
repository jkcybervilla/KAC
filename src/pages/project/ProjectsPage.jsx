import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ArrowLeft, Plus, Search, X, Settings2 } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import ColumnSettings, { loadSettings } from '../../components/ColumnSettings';
import { nextSerial } from '../../utils/serial';
import { getBatchId, countPresent, getDaysInMonth } from '../../utils/attendance';

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

const EMPTY_FORM = {
  PROJECT_NAME: '',
  TYPE: 'SS',
  CLIENT: '',
  PO_NUMBER: '',
  GEM_ID: '',
  DISTRICT: '',
  REGION: '',
  LINE_NAME: '',
  REQ_MANPOWER: '',
  CO_ORDINATOR: '',
  ACCOUNTANT: '',
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [clientAttendance, setClientAttendance] = useState([]);
  const [officeAttendance, setOfficeAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [propertiesProject, setPropertiesProject] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showSettings, setShowSettings] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(loadSettings);
  const [gridApi, setGridApi] = useState(null);
  const [columnApi, setColumnApi] = useState(null);
  const navigate = useNavigate();

  const now = new Date();
  const batchId = getBatchId(now.getMonth() + 1, now.getFullYear());
  const daysInMonth = getDaysInMonth(now.getMonth() + 1, now.getFullYear());

  const loadData = async () => {
    try {
      const [pSnap, wSnap, cSnap, oSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('SL', 'asc'))),
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'attendance_client')),
        getDocs(collection(db, 'attendance_office')),
      ]);
      setProjects(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setWorkers(wSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClientAttendance(cSnap.docs.map((d) => d.data()));
      setOfficeAttendance(oSnap.docs.map((d) => d.data()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const enrichProject = useCallback(
    (p) => {
      const name = p.PROJECT_NAME || '';
      const projectWorkers = workers.filter(
        (w) => (w.PROJECT || '') === name && (w.STATUS || 'ACTIVE') === 'ACTIVE'
      );
      const activeStatus = projectWorkers.length > 0 ? 'ACTIVE' : 'INACTIVE';

      const clientRows = clientAttendance.filter(
        (a) => a.batchId === batchId && projectWorkers.some((w) => w.EMPID === a.EMPID)
      );
      const officeRows = officeAttendance.filter(
        (a) => a.batchId === batchId && projectWorkers.some((w) => w.EMPID === a.EMPID)
      );

      const currentManpower =
        clientRows.length > 0
          ? clientRows.filter((r) => countPresent(r.days || {}, daysInMonth) > 0).length
          : projectWorkers.length;

      const manpower =
        officeRows.length > 0
          ? officeRows.filter((r) => countPresent(r.days || {}, daysInMonth) > 0).length
          : projectWorkers.filter((w) => w.REFFERENCE).length;

      const vendors = [...new Set(projectWorkers.map((w) => w.REFFERENCE).filter(Boolean))].join(', ');

      return {
        ...p,
        ACTIVE_STATUS: p.ACTIVE_STATUS || activeStatus,
        CURRENT_MANPOWER: currentManpower,
        MANPOWER: manpower,
        VENDORS: p.VENDORS || vendors,
      };
    },
    [workers, clientAttendance, officeAttendance, batchId, daysInMonth]
  );

  const enrichedProjects = useMemo(() => projects.map(enrichProject), [projects, enrichProject]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === 'ACTIVE') return enrichedProjects.filter((p) => p.ACTIVE_STATUS === 'ACTIVE');
    if (statusFilter === 'INACTIVE') return enrichedProjects.filter((p) => p.ACTIVE_STATUS === 'INACTIVE');
    return enrichedProjects;
  }, [enrichedProjects, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const sl = nextSerial(projects, 'SL');
      await addDoc(collection(db, 'projects'), {
        ...formData,
        SL: sl,
        ACTIVE_STATUS: 'INACTIVE',
        REQ_MANPOWER: Number(formData.REQ_MANPOWER) || 0,
        KAC_ACTIVE: 0,
        GAP: String(formData.REQ_MANPOWER || 0),
        DPR_STATUS: 'PENDING',
        timestamp: new Date(),
      });
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const buildColumnDefs = useCallback(
    (visibility) => [
      {
        headerName: 'SL NO',
        flex: 0.6,
        minWidth: 70,
        pinned: 'left',
        hide: !visibility.sl,
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : ''),
      },
      { field: 'PROJECT_NAME', headerName: 'PROJECT NAME', flex: 1.8, minWidth: 180, pinned: 'left', hide: !visibility.projectName },
      { field: 'TYPE', headerName: 'TYPE', flex: 0.7, minWidth: 80, hide: !visibility.type },
      { field: 'CO_ORDINATOR', headerName: 'CO-ORDINATOR', flex: 1, minWidth: 120, hide: !visibility.coordinator },
      { field: 'ACCOUNTANT', headerName: 'ACCOUNTANT', flex: 1, minWidth: 120, hide: !visibility.accountant },
      { field: 'CURRENT_MANPOWER', headerName: 'CURRENT MANPOWER', flex: 1, minWidth: 130, hide: !visibility.currentManpower },
      {
        field: 'ACTIVE_STATUS',
        headerName: 'ACTIVE STATUS',
        flex: 0.9,
        minWidth: 110,
        hide: !visibility.activeStatus,
        cellRenderer: (params) => (
          <span style={params.value === 'ACTIVE' ? s.badgeActive : s.badgeInactive}>
            {params.value || 'INACTIVE'}
          </span>
        ),
      },
      {
        headerName: 'ACTION',
        flex: 0.8,
        minWidth: 110,
        pinned: 'right',
        cellRenderer: (params) => (
          <button type="button" style={s.actionBtn} onClick={() => setPropertiesProject(params.data)}>
            PROPERTIES
          </button>
        ),
      },
      {
        headerName: 'MORE DETAILS',
        children: [
          { field: 'MANPOWER', headerName: 'MANPOWER', flex: 0.8, minWidth: 100, hide: !visibility.manpower },
          { field: 'LINE_NAME', headerName: 'LINE NAME', flex: 0.9, minWidth: 110, hide: !visibility.lineName },
          { field: 'DISTRICT', headerName: 'DISTRICT', flex: 0.8, minWidth: 100, hide: !visibility.district },
          { field: 'CLIENT', headerName: 'CLIENT', flex: 0.9, minWidth: 110, hide: !visibility.client },
          { field: 'VENDORS', headerName: 'VENDORS', flex: 1, minWidth: 120, hide: !visibility.vendors },
          { field: 'PO_NUMBER', headerName: 'PO NUMBER', flex: 0.8, minWidth: 100, hide: !visibility.poNumber },
          { field: 'GEM_ID', headerName: 'GEM ID', flex: 0.75, minWidth: 90, hide: !visibility.gemId },
          { field: 'REGION', headerName: 'REGION', flex: 0.75, minWidth: 90, hide: !visibility.region },
          { field: 'REQ_MANPOWER', headerName: 'REQUIRED MANPOWER', flex: 1, minWidth: 130, hide: !visibility.reqManpower },
        ],
      },
    ],
    []
  );

  const columnDefs = useMemo(() => buildColumnDefs(columnVisibility), [buildColumnDefs, columnVisibility]);

  const defaultColDef = useMemo(
    () => ({ resizable: true, filter: true, sortable: true, wrapHeaderText: true, autoHeaderHeight: true }),
    []
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
  }, [autoSizeAllColumns, columnDefs, filteredProjects]);

  if (loading) return <div style={s.loading}>Loading projects...</div>;

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            PROJECT <span style={{ color: '#0055ff' }}>INVENTORY</span>
          </h2>
        </div>
        <div style={s.headerRight}>
          <div style={s.searchBox}>
            <Search size={16} color="#444" />
            <input
              type="text"
              placeholder="Filter projects..."
              style={s.searchInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="ALL">All Projects</option>
          </select>
          <ExportToolbar rows={filteredProjects} columnDefs={columnDefs} title="Project Inventory" filename="projects" />
          <button type="button" onClick={() => setShowCreateModal(true)} style={s.primaryBtn}>
            <Plus size={18} /> CREATE NEW PROJECT
          </button>
          <button type="button" onClick={() => setShowSettings(true)} style={s.secondaryBtn}>
            <Settings2 size={16} /> COLUMNS
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0055ff' }}>{enrichedProjects.length}</p>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{enrichedProjects.filter(p => p.ACTIVE_STATUS === 'ACTIVE').length}</p>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{enrichedProjects.filter(p => p.ACTIVE_STATUS === 'INACTIVE').length}</p>
        </div>
        <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Manpower</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{enrichedProjects.reduce((sum, p) => sum + (p.CURRENT_MANPOWER || 0), 0)}</p>
        </div>
      </div>

      <div style={s.gridSection}>
        <div style={{ height: '78vh', width: '100%' }}>
          <AgGridReact
            rowData={filteredProjects}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchText}
            animateRows
            theme={darkQuartzTheme}
            onGridReady={handleGridReady}
            autoSizeStrategy={{ type: 'fitCellContents' }}
          />
        </div>
      </div>

      {showCreateModal && (
        <ProjectFormModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowCreateModal(false);
            setFormData(EMPTY_FORM);
          }}
          onSubmit={handleCreate}
        />
      )}

      {propertiesProject && (
        <ProjectPropertiesModal
          project={propertiesProject}
          onClose={() => setPropertiesProject(null)}
          onSave={async (updated) => {
            await updateDoc(doc(db, 'projects', propertiesProject.id), updated);
            setPropertiesProject(null);
            loadData();
          }}
          navigate={navigate}
        />
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

const ProjectFormModal = ({ formData, setFormData, onClose, onSubmit }) => (
  <div style={s.modalOverlay}>
    <div style={{ ...s.modalContent, maxWidth: '560px' }}>
      <div style={s.modalHeader}>
        <h3 style={{ margin: 0 }}>CREATE NEW PROJECT</h3>
        <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
      </div>
      <form onSubmit={onSubmit} style={s.form}>
        <FormField label="PROJECT TITLE" span={2}>
          <input
            required
            style={s.formInput}
            value={formData.PROJECT_NAME}
            onChange={(e) => setFormData({ ...formData, PROJECT_NAME: e.target.value })}
          />
        </FormField>
        <div style={s.inputGrid}>
          <FormField label="TYPE">
            <select style={s.formInput} value={formData.TYPE} onChange={(e) => setFormData({ ...formData, TYPE: e.target.value })}>
              <option value="SS">Substation (SS)</option>
              <option value="TL">Transmission Line (TL)</option>
            </select>
          </FormField>
          <FormField label="CLIENT">
            <input style={s.formInput} value={formData.CLIENT} onChange={(e) => setFormData({ ...formData, CLIENT: e.target.value })} />
          </FormField>
          <FormField label="PO NUMBER">
            <input style={s.formInput} value={formData.PO_NUMBER} onChange={(e) => setFormData({ ...formData, PO_NUMBER: e.target.value })} />
          </FormField>
          <FormField label="GEM ID">
            <input style={s.formInput} value={formData.GEM_ID} onChange={(e) => setFormData({ ...formData, GEM_ID: e.target.value })} />
          </FormField>
          <FormField label="DISTRICT">
            <input style={s.formInput} value={formData.DISTRICT} onChange={(e) => setFormData({ ...formData, DISTRICT: e.target.value })} />
          </FormField>
          <FormField label="REGION">
            <input style={s.formInput} value={formData.REGION} onChange={(e) => setFormData({ ...formData, REGION: e.target.value })} />
          </FormField>
          <FormField label="LINE NAME">
            <input style={s.formInput} value={formData.LINE_NAME} onChange={(e) => setFormData({ ...formData, LINE_NAME: e.target.value })} />
          </FormField>
          <FormField label="REQUIRED MANPOWER">
            <input
              type="number"
              style={s.formInput}
              value={formData.REQ_MANPOWER}
              onChange={(e) => setFormData({ ...formData, REQ_MANPOWER: e.target.value })}
            />
          </FormField>
          <FormField label="CO-ORDINATOR">
            <input style={s.formInput} value={formData.CO_ORDINATOR} onChange={(e) => setFormData({ ...formData, CO_ORDINATOR: e.target.value })} />
          </FormField>
          <FormField label="ACCOUNTANT">
            <input style={s.formInput} value={formData.ACCOUNTANT} onChange={(e) => setFormData({ ...formData, ACCOUNTANT: e.target.value })} />
          </FormField>
        </div>
        <button type="submit" style={s.submitBtn}>
          SAVE PROJECT
        </button>
      </form>
    </div>
  </div>
);

const ProjectPropertiesModal = ({ project, onClose, onSave, navigate }) => {
  const [data, setData] = useState({ ...project });

  const details = [
    ['TYPE', data.TYPE],
    ['CLIENT', data.CLIENT],
    ['PO NUMBER', data.PO_NUMBER],
    ['GEM ID', data.GEM_ID],
    ['DISTRICT', data.DISTRICT],
    ['REGION', data.REGION],
    ['LINE NAME', data.LINE_NAME],
    ['REQUIRED MANPOWER', data.REQ_MANPOWER],
    ['CO-ORDINATOR', data.CO_ORDINATOR],
    ['ACCOUNTANT', data.ACCOUNTANT],
    ['CURRENT MANPOWER', data.CURRENT_MANPOWER],
    ['MANPOWER', data.MANPOWER],
    ['VENDORS', data.VENDORS],
    ['ACTIVE STATUS', data.ACTIVE_STATUS],
  ];

  return (
    <div style={s.modalOverlay}>
      <div style={{ ...s.modalContent, maxWidth: '720px' }}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0 }}>PROJECT PROPERTIES — {project.PROJECT_NAME}</h3>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
          {details.map(([label, val]) => (
            <div key={label}>
              <span style={s.label}>{label}</span>
              <p style={{ margin: '4px 0 0', color: '#ccc' }}>{val ?? '—'}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            type="button"
            style={s.primaryBtn}
            onClick={() => navigate(`/attendance-sheet?tab=client&project=${encodeURIComponent(project.PROJECT_NAME)}`)}
          >
            CURRENT MANPOWER
          </button>
          <button
            type="button"
            style={s.primaryBtn}
            onClick={() => navigate(`/attendance-sheet?tab=office&project=${encodeURIComponent(project.PROJECT_NAME)}`)}
          >
            MANPOWER
          </button>
        </div>

        <div style={s.inputGrid}>
          <FormField label="PROJECT TITLE">
            <input style={s.formInput} value={data.PROJECT_NAME || ''} onChange={(e) => setData({ ...data, PROJECT_NAME: e.target.value })} />
          </FormField>
          <FormField label="TYPE">
            <select style={s.formInput} value={data.TYPE || 'SS'} onChange={(e) => setData({ ...data, TYPE: e.target.value })}>
              <option value="SS">SS</option>
              <option value="TL">TL</option>
            </select>
          </FormField>
          <FormField label="CLIENT">
            <input style={s.formInput} value={data.CLIENT || ''} onChange={(e) => setData({ ...data, CLIENT: e.target.value })} />
          </FormField>
          <FormField label="PO NUMBER">
            <input style={s.formInput} value={data.PO_NUMBER || ''} onChange={(e) => setData({ ...data, PO_NUMBER: e.target.value })} />
          </FormField>
          <FormField label="GEM ID">
            <input style={s.formInput} value={data.GEM_ID || ''} onChange={(e) => setData({ ...data, GEM_ID: e.target.value })} />
          </FormField>
          <FormField label="DISTRICT">
            <input style={s.formInput} value={data.DISTRICT || ''} onChange={(e) => setData({ ...data, DISTRICT: e.target.value })} />
          </FormField>
          <FormField label="REGION">
            <input style={s.formInput} value={data.REGION || ''} onChange={(e) => setData({ ...data, REGION: e.target.value })} />
          </FormField>
          <FormField label="LINE NAME">
            <input style={s.formInput} value={data.LINE_NAME || ''} onChange={(e) => setData({ ...data, LINE_NAME: e.target.value })} />
          </FormField>
          <FormField label="REQUIRED MANPOWER">
            <input
              type="number"
              style={s.formInput}
              value={data.REQ_MANPOWER || ''}
              onChange={(e) => setData({ ...data, REQ_MANPOWER: e.target.value })}
            />
          </FormField>
          <FormField label="CO-ORDINATOR">
            <input style={s.formInput} value={data.CO_ORDINATOR || ''} onChange={(e) => setData({ ...data, CO_ORDINATOR: e.target.value })} />
          </FormField>
          <FormField label="ACCOUNTANT">
            <input style={s.formInput} value={data.ACCOUNTANT || ''} onChange={(e) => setData({ ...data, ACCOUNTANT: e.target.value })} />
          </FormField>
        </div>

        <button type="button" style={s.submitBtn} onClick={() => onSave(data)}>
          UPDATE PROJECT
        </button>
      </div>
    </div>
  );
};

const FormField = ({ label, children, span }) => (
  <div style={span === 2 ? { gridColumn: 'span 2' } : undefined}>
    <label style={s.label}>{label}</label>
    {children}
  </div>
);

export default ProjectsPage;