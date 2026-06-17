import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ArrowLeft, Plus, Search, X, Edit3, Trash2, Check, MoreVertical } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import { exportToExcel, getExportColumns } from '../../utils/export';
import ColumnSettings, { loadSettings } from '../../components/ColumnSettings';
import { nextSerial } from '../../utils/serial';
import { getBatchId, countPresent, getDaysInMonth } from '../../utils/attendance';

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
  PROJECT_NAME: '',
  TYPE: 'FOUNDATION',
  CLIENT: '',
  PO_NUMBER: '',
  GEM_ID: '',
  DISTRICT: '',
  REGION: '',
  LINE_NAME: '',
  REQ_MANPOWER: '',
  CO_ORDINATOR: '',
  ACCOUNTANT: '',
  VENDORS_LIST: [],
  STARTING_DATE: '',
  STATE: '',
  PO_DATE: '',
  PO_QTY: '',
  WORK_LOCATION: '',
};

// Checkbox-based multi-select vendor component
const VendorMultiSelect = ({ selected = [], onChange, vendors }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleVendor = (vendorName) => {
    if (selected.includes(vendorName)) {
      onChange(selected.filter((v) => v !== vendorName));
    } else {
      onChange([...selected, vendorName]);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#000',
          border: '1px solid #1a1a1a',
          padding: '11px',
          borderRadius: '8px',
          color: selected.length > 0 ? '#fff' : '#555',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 20,
        }}
      >
        <span>
          {selected.length > 0
            ? `${selected.length} vendor${selected.length > 1 ? 's' : ''} selected`
            : '— Select Vendors —'}
        </span>
        <span style={{ fontSize: 10, color: '#555' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: '#111',
            border: '1px solid #333',
            borderRadius: '8px',
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          {vendors.length === 0 ? (
            <div style={{ padding: 12, color: '#555', fontSize: 12, textAlign: 'center' }}>
              No vendors available
            </div>
          ) : (
            vendors.map((v) => {
              const isChecked = selected.includes(v.vendorName);
              return (
                <div
                  key={v.id}
                  onClick={() => toggleVendor(v.vendorName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? '#1a1a1a' : 'transparent',
                    borderBottom: '1px solid #1a1a1a',
                    transition: '0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#222')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = isChecked ? '#1a1a1a' : 'transparent')
                  }
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isChecked ? '2px solid #0055ff' : '2px solid #444',
                      backgroundColor: isChecked ? '#0055ff' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#fff' }}>{v.vendorName}</div>
                    {v.contactPerson && (
                      <div style={{ fontSize: 10, color: '#666' }}>{v.contactPerson}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Close on click outside */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        />
      )}
    </div>
  );
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [clientAttendance, setClientAttendance] = useState([]);
  const [officeAttendance, setOfficeAttendance] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [propertiesProject, setPropertiesProject] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState(loadSettings);
  const [gridApi, setGridApi] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [floatingFilters, setFloatingFilters] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const clickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const now = new Date();
  const batchId = getBatchId(now.getMonth() + 1, now.getFullYear());
  const daysInMonth = getDaysInMonth(now.getMonth() + 1, now.getFullYear());

  const loadData = async () => {
    try {
      const [pSnap, wSnap, cSnap, oSnap, vSnap, clSnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), orderBy('SL', 'asc'))),
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'attendance_client')),
        getDocs(collection(db, 'attendance_office')),
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'clients')),
      ]);
      setProjects(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setWorkers(wSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClientAttendance(cSnap.docs.map((d) => d.data()));
      setOfficeAttendance(oSnap.docs.map((d) => d.data()));
      setVendors(vSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClients(clSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter out only active vendors for dropdown
  const activeVendorOptions = useMemo(
    () => vendors.filter((v) => v.status !== 'inactive'),
    [vendors]
  );

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

      const vendorsList = [...new Set(projectWorkers.map((w) => w.REFFERENCE).filter(Boolean))].join(', ');

      // Build VENDORS string from VENDORS_LIST array if available
      const vendorsDisplay = Array.isArray(p.VENDORS_LIST) && p.VENDORS_LIST.length > 0
        ? p.VENDORS_LIST.join(', ')
        : (p.VENDORS || vendorsList);

      return {
        ...p,
        ACTIVE_STATUS: p.ACTIVE_STATUS || activeStatus,
        CURRENT_MANPOWER: currentManpower,
        MANPOWER: manpower,
        VENDORS: vendorsDisplay,
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
        PO_QTY: Number(formData.PO_QTY) || 0,
        KAC_ACTIVE: 0,
        GAP: String(formData.REQ_MANPOWER || 0),
        DPR_STATUS: 'PENDING',
        timestamp: new Date(),
      });
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      setCurrentStep(1);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const buildColumnDefs = useCallback(
    (visibility) => [
      {
        headerName: 'SL',
        width: 82,
        minWidth: 82,
        pinned: 'left',
        hide: !visibility.sl,
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : ''),
      },
      { field: 'PROJECT_NAME', headerName: 'PROJECT NAME', width: 260, minWidth: 220, pinned: 'left', hide: !visibility.projectName },
      { field: 'TYPE', headerName: 'TYPE', width: 125, minWidth: 105, hide: !visibility.type },
      { field: 'CO_ORDINATOR', headerName: 'CO-ORDINATOR', width: 155, minWidth: 145, hide: !visibility.coordinator },
      { field: 'ACCOUNTANT', headerName: 'ACCOUNTANT', width: 145, minWidth: 135, hide: !visibility.accountant },
      { field: 'CURRENT_MANPOWER', headerName: 'CURRENT MANPOWER', width: 170, minWidth: 160, hide: !visibility.currentManpower },
      {
        field: 'ACTIVE_STATUS',
        headerName: 'ACTIVE STATUS',
        width: 145,
        minWidth: 135,
        hide: !visibility.activeStatus,
        cellRenderer: (params) => (
          <span style={params.value === 'ACTIVE' ? s.badgeActive : s.badgeInactive}>
            {params.value || 'INACTIVE'}
          </span>
        ),
      },
      { field: 'LINE_NAME', headerName: 'LINE NAME', width: 145, minWidth: 130, hide: !visibility.lineName },
      { field: 'DISTRICT', headerName: 'DISTRICT', width: 130, minWidth: 120, hide: !visibility.district },
      { field: 'STATE', headerName: 'STATE', width: 120, minWidth: 105, hide: !visibility.state },
      { field: 'STARTING_DATE', headerName: 'STARTING DATE', width: 145, minWidth: 130, hide: !visibility.startingDate },
      { field: 'PO_DATE', headerName: 'PO DATE', width: 130, minWidth: 115, hide: !visibility.poDate },
      { field: 'PO_QTY', headerName: 'PO QTY', width: 115, minWidth: 100, hide: !visibility.poQty },
      { field: 'WORK_LOCATION', headerName: 'WORK LOCATION', width: 150, minWidth: 130, hide: !visibility.workLocation },
      {
        headerName: 'ACTION',
        width: 130,
        minWidth: 130,
        pinned: 'right',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => (
          <button
            type="button"
            onClick={() => setPropertiesProject(params.data)}
            style={{
              backgroundColor: '#0055ff',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0040cc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0055ff')}
          >
            PROPERTIES
          </button>
        ),
      },
      { field: 'MANPOWER', headerName: 'MANPOWER', width: 125, minWidth: 120, hide: !visibility.manpower },
      { field: 'CLIENT', headerName: 'CLIENT', width: 135, minWidth: 120, hide: !visibility.client },
      { field: 'VENDORS', headerName: 'VENDORS', width: 160, minWidth: 130, hide: !visibility.vendors },
      { field: 'PO_NUMBER', headerName: 'PO NUMBER', width: 140, minWidth: 125, hide: !visibility.poNumber },
      { field: 'GEM_ID', headerName: 'GEM ID', width: 115, minWidth: 105, hide: !visibility.gemId },
      { field: 'REGION', headerName: 'REGION', width: 120, minWidth: 110, hide: !visibility.region },
      { field: 'REQ_MANPOWER', headerName: 'REQUIRED MANPOWER', width: 170, minWidth: 160, hide: !visibility.reqManpower },
    ],
    []
  );

  const columnDefs = useMemo(
    () => buildColumnDefs(columnVisibility).map(col => ({
      ...col,
      ...(floatingFilters ? { filter: true, floatingFilter: true } : {}),
    })),
    [buildColumnDefs, columnVisibility, floatingFilters]
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      filter: false,
      sortable: true,
      floatingFilter: false,
    }),
    []
  );

  const handleGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  const autoSizeAllColumns = useCallback((api = gridApi) => {
    if (!api) return;
    const allColumnIds = api.getAllDisplayedColumns().map((col) => col.getColId());
    if (allColumnIds.length) {
      window.requestAnimationFrame(() => {
        api.autoSizeColumns(allColumnIds, false);
      });
    }
  }, [gridApi]);

  useEffect(() => {
    autoSizeAllColumns();
  }, [autoSizeAllColumns, columnDefs, filteredProjects.length]);

  if (loading) return <div style={s.loading}>Loading projects...</div>;

  return (
    <div style={{ ...s.container, padding: '16px 8px' }}>
      {/* Stats Cards - Top */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0055ff' }}>{enrichedProjects.length}</p>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>{enrichedProjects.filter(p => p.ACTIVE_STATUS === 'ACTIVE').length}</p>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive Projects</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{enrichedProjects.filter(p => p.ACTIVE_STATUS === 'INACTIVE').length}</p>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '18px' }}>
          <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Manpower</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{enrichedProjects.reduce((sum, p) => sum + (p.CURRENT_MANPOWER || 0), 0)}</p>
        </div>
      </div>

      {/* Search / Filter / Actions Row */}
      <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
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
          <button type="button" onClick={() => setShowCreateModal(true)} style={s.primaryBtn}>
            <Plus size={18} /> CREATE NEW PROJECT
          </button>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                ...s.secondaryBtn,
                padding: '6px',
                minWidth: 32,
                justifyContent: 'center',
              }}
              title="More options"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '4px 0',
                  zIndex: 200,
                  minWidth: 190,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                {[
                  { icon: '📥', label: 'Download Excel', action: () => { setMenuOpen(false); exportToExcel(filteredProjects, getExportColumns(columnDefs), 'projects'); } },
                  { icon: '⚙️', label: 'Column Settings', action: () => { setMenuOpen(false); setShowSettings(true); } },
                  { icon: '🔄', label: 'Refresh', action: () => { setMenuOpen(false); setLoading(true); loadData(); } },
                  { icon: '🔍', label: floatingFilters ? '✓ Column Filters' : 'Column Filters', action: () => { setMenuOpen(false); setFloatingFilters(prev => !prev); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft, rgba(0,85,255,0.06))')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setToast('📊 Export PDF — Coming soon!'); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--text)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft, rgba(0,85,255,0.06))')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  📊 Export PDF
                </button>
              </div>
            )}
          </div>
      </header>

      <div style={s.gridSection}>
        <div style={{ height: '78vh', width: '100%' }}>
          <AgGridReact
            rowData={filteredProjects}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchText}
            animateRows
            rowHeight={34}
            theme={darkQuartzTheme}
            onGridReady={handleGridReady}
            onFirstDataRendered={(params) => autoSizeAllColumns(params.api)}
            onRowDataUpdated={(params) => autoSizeAllColumns(params.api)}
            onColumnVisible={(params) => autoSizeAllColumns(params.api)}
            onGridSizeChanged={(params) => autoSizeAllColumns(params.api)}
            suppressColumnVirtualisation
            autoSizeStrategy={{ type: 'fitCellContents' }}
          />
        </div>
      </div>

      {showCreateModal && (
        <ProjectFormModal
          formData={formData}
          setFormData={setFormData}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          onClose={() => {
            setShowCreateModal(false);
            setFormData(EMPTY_FORM);
            setCurrentStep(1);
          }}
          onSubmit={handleCreate}
          vendors={activeVendorOptions}
          clients={clients}
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
          vendors={activeVendorOptions}
          clients={clients}
        />
      )}

      <ColumnSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        visibility={columnVisibility}
        onVisibilityChange={setColumnVisibility}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

const stepLabels = ['Project Info', 'Client & PO', 'Team'];

const ProjectFormModal = ({ formData, setFormData, currentStep, setCurrentStep, onClose, onSubmit, vendors, clients }) => {
  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(c => c.companyName === clientName);
    if (selectedClient) {
      setFormData({
        ...formData,
        CLIENT: clientName,
        PO_NUMBER: selectedClient.poNumber || formData.PO_NUMBER,
        PROJECT_NAME: selectedClient.projectName || formData.PROJECT_NAME,
        TYPE: selectedClient.workType || formData.TYPE,
        REQ_MANPOWER: selectedClient.quantity || formData.REQ_MANPOWER,
      });
    } else {
      setFormData({ ...formData, CLIENT: clientName });
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={{ ...s.modalContent, maxWidth: '620px' }}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0 }}>CREATE NEW PROJECT</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '16px 0 20px' }}>
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: currentStep >= step ? '#0055ff' : '#222',
                    color: currentStep >= step ? '#fff' : '#555',
                    transition: '0.2s',
                  }}
                >
                  {step}
                </div>
                <span style={{ fontSize: 12, color: currentStep >= step ? '#ccc' : '#444', fontWeight: currentStep >= step ? 600 : 400 }}>
                  {stepLabels[step - 1]}
                </span>
              </div>
              {step < 3 && (
                <div
                  style={{
                    width: 40,
                    height: 2,
                    backgroundColor: currentStep > step ? '#0055ff' : '#222',
                    margin: '0 4px',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={currentStep === 3 ? onSubmit : (e) => e.preventDefault()} style={s.form}>
          {/* Step 1: Project Title, Type, Required Manpower, Starting Date, State, District */}
          {currentStep === 1 && (
            <div style={s.inputGrid}>
              <FormField label="PROJECT TITLE" span={2}>
                <input
                  required
                  style={s.formInput}
                  value={formData.PROJECT_NAME}
                  onChange={(e) => setFormData({ ...formData, PROJECT_NAME: e.target.value })}
                />
              </FormField>
              <FormField label="TYPE">
                <select style={s.formInput} value={formData.TYPE} onChange={(e) => setFormData({ ...formData, TYPE: e.target.value })}>
                  <option value="FOUNDATION">FOUNDATION</option>
                  <option value="ERECTION">ERECTION</option>
                  <option value="STRINGING">STRINGING</option>
                  <option value="RESTORATION">RESTORATION</option>
                  <option value="RE-STRINGING">RE-STRINGING</option>
                  <option value="OPGW">OPGW</option>
                </select>
              </FormField>
              <FormField label="REQUIRED MANPOWER">
                <input
                  type="number"
                  style={s.formInput}
                  value={formData.REQ_MANPOWER}
                  onChange={(e) => setFormData({ ...formData, REQ_MANPOWER: e.target.value })}
                />
              </FormField>
              <FormField label="STARTING DATE">
                <input
                  type="date"
                  style={s.formInput}
                  value={formData.STARTING_DATE}
                  onChange={(e) => setFormData({ ...formData, STARTING_DATE: e.target.value })}
                />
              </FormField>
              <FormField label="STATE">
                <input
                  style={s.formInput}
                  value={formData.STATE}
                  onChange={(e) => setFormData({ ...formData, STATE: e.target.value })}
                />
              </FormField>
              <FormField label="DISTRICT">
                <input
                  style={s.formInput}
                  value={formData.DISTRICT}
                  onChange={(e) => setFormData({ ...formData, DISTRICT: e.target.value })}
                />
              </FormField>
            </div>
          )}

          {/* Step 2: Client, Project / Line Name, PO Number, PO Date, PO Qty, Work Location */}
          {currentStep === 2 && (
            <div style={s.inputGrid}>
              <FormField label="CLIENT">
                <select
                  style={s.formInput}
                  value={formData.CLIENT}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">— Select Client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.companyName}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="PROJECT / LINE NAME">
                <input style={s.formInput} value={formData.LINE_NAME} onChange={(e) => setFormData({ ...formData, LINE_NAME: e.target.value })} />
              </FormField>
              <FormField label="PO NUMBER">
                <input style={s.formInput} value={formData.PO_NUMBER} onChange={(e) => setFormData({ ...formData, PO_NUMBER: e.target.value })} />
              </FormField>
              <FormField label="PO DATE">
                <input
                  type="date"
                  style={s.formInput}
                  value={formData.PO_DATE}
                  onChange={(e) => setFormData({ ...formData, PO_DATE: e.target.value })}
                />
              </FormField>
              <FormField label="PO QTY">
                <input
                  type="number"
                  style={s.formInput}
                  value={formData.PO_QTY}
                  onChange={(e) => setFormData({ ...formData, PO_QTY: e.target.value })}
                />
              </FormField>
              <FormField label="WORK LOCATION">
                <input style={s.formInput} value={formData.WORK_LOCATION} onChange={(e) => setFormData({ ...formData, WORK_LOCATION: e.target.value })} />
              </FormField>
            </div>
          )}

          {/* Step 3: Accountant, Co-ordinator, Vendor */}
          {currentStep === 3 && (
            <div style={s.inputGrid}>
              <FormField label="ACCOUNTANT">
                <input style={s.formInput} value={formData.ACCOUNTANT} onChange={(e) => setFormData({ ...formData, ACCOUNTANT: e.target.value })} />
              </FormField>
              <FormField label="CO-ORDINATOR">
                <input style={s.formInput} value={formData.CO_ORDINATOR} onChange={(e) => setFormData({ ...formData, CO_ORDINATOR: e.target.value })} />
              </FormField>
              <FormField label="VENDORS" span={2}>
                <VendorMultiSelect
                  selected={formData.VENDORS_LIST || []}
                  onChange={(newList) => setFormData({ ...formData, VENDORS_LIST: newList })}
                  vendors={vendors}
                />
              </FormField>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
            <div>
              {currentStep > 1 && (
                <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} style={s.secondaryBtn}>
                  ← PREVIOUS
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {currentStep === 1 && (
                <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} style={s.primaryBtn}>
                  NEXT →
                </button>
              )}
              {currentStep === 2 && (
                <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} style={s.primaryBtn}>
                  NEXT →
                </button>
              )}
              {currentStep === 3 && (
                <button type="submit" style={s.submitBtn}>
                  SAVE PROJECT
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectPropertiesModal = ({ project, onClose, onSave, navigate, vendors, clients }) => {
  const [data, setData] = useState({ ...project });
  const [isEditing, setIsEditing] = useState(false);

  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(c => c.companyName === clientName);
    if (selectedClient) {
      setData({
        ...data,
        CLIENT: clientName,
        PO_NUMBER: selectedClient.poNumber || data.PO_NUMBER,
        PROJECT_NAME: selectedClient.projectName || data.PROJECT_NAME,
        TYPE: selectedClient.workType || data.TYPE,
        REQ_MANPOWER: selectedClient.quantity || data.REQ_MANPOWER,
      });
    } else {
      setData({ ...data, CLIENT: clientName });
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`WARNING: Are you sure you want to PERMANENTLY DELETE "${project.PROJECT_NAME}"?`)) {
      await deleteDoc(doc(db, 'projects', project.id));
      onClose();
      // trigger project list refresh after delete
      setTimeout(() => window.location.reload(), 100);
    }
  };

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
      <div style={{ ...s.modalContent, maxWidth: '720px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 15 }}>PROJECT PROPERTIES — {project.PROJECT_NAME}</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555', flexShrink: 0 }} onClick={onClose} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          {!isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
              {details.map(([label, val]) => (
                <div key={label}>
                  <span style={{ ...s.label, color: 'var(--text)', fontSize: '11px', fontWeight: 700 }}>{label}</span>
                  <p style={{ margin: '4px 0 0', color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>{val ?? '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...s.inputGrid, marginBottom: '20px' }}>
                <FormField label="PROJECT TITLE">
                  <input style={s.formInput} value={data.PROJECT_NAME || ''} onChange={(e) => setData({ ...data, PROJECT_NAME: e.target.value })} />
                </FormField>
                <FormField label="TYPE">
                  <select style={s.formInput} value={data.TYPE || 'FOUNDATION'} onChange={(e) => setData({ ...data, TYPE: e.target.value })}>
                    <option value="FOUNDATION">FOUNDATION</option>
                    <option value="ERECTION">ERECTION</option>
                    <option value="STRINGING">STRINGING</option>
                    <option value="RESTORATION">RESTORATION</option>
                    <option value="RE-STRINGING">RE-STRINGING</option>
                    <option value="OPGW">OPGW</option>
                  </select>
                </FormField>
                <FormField label="CLIENT">
                  <select
                    style={s.formInput}
                    value={data.CLIENT || ''}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    <option value="">— Select Client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
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
                <FormField label="VENDORS" span={2}>
                  <VendorMultiSelect
                    selected={data.VENDORS_LIST || []}
                    onChange={(newList) => setData({ ...data, VENDORS_LIST: newList })}
                    vendors={vendors}
                  />
                </FormField>
            </div>
          )}
        </div>

        {/* Footer action row */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text)',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                onClick={() => onSave(data)}
                style={{
                  backgroundColor: '#0055ff',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                UPDATE PROJECT
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#0055ff',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                EDIT PROJECT
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: '1px solid #7f1d1d',
                  color: '#ef4444',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                DELETE PROJECT
              </button>
            </>
          )}
        </div>
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