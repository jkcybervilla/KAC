import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Search, Plus, MoreVertical, Eye, Edit3, X, Check } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import { exportToExcel, getExportColumns } from '../../utils/export';
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

const WORK_TYPES = ['FOUNDATION', 'ERECTION', 'STRINGING', 'RESTORATION', 'OPGW'];
const UNITS = ['KM', 'MT', 'NOS', 'SQM'];

const EMPTY_FORM = {
  companyName: '',
  email: '',
  address: '',
  gstNumber: '',
  projectName: '',
  poNumber: '',
  poDate: '',
  workType: 'FOUNDATION',
  quantity: '',
  unit: 'KM',
  closeDate: '',
};

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingFilters, setFloatingFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [gridApi, setGridApi] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const menuRef = useRef(null);

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

  const loadData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'clients'), orderBy('createdAt', 'desc')));
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'ACTIVE'), [clients]);
  const completedClients = useMemo(() => clients.filter((c) => c.status === 'COMPLETED'), [clients]);

  const filteredClients = useMemo(() => {
    if (!searchText) return clients;
    const q = searchText.toLowerCase();
    return clients.filter(
      (c) =>
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.projectName || '').toLowerCase().includes(q) ||
        (c.poNumber || '').toLowerCase().includes(q)
    );
  }, [clients, searchText]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const sl = nextSerial(clients, 'SL');
      await addDoc(collection(db, 'clients'), {
        ...formData,
        SL: sl,
        quantity: Number(formData.quantity) || 0,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || '',
      email: client.email || '',
      address: client.address || '',
      gstNumber: client.gstNumber || '',
      projectName: client.projectName || '',
      poNumber: client.poNumber || '',
      poDate: client.poDate || '',
      workType: client.workType || 'FOUNDATION',
      quantity: client.quantity || '',
      unit: client.unit || 'KM',
      closeDate: client.closeDate || '',
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const status = formData.closeDate ? 'COMPLETED' : 'ACTIVE';
      await updateDoc(doc(db, 'clients', editingClient.id), {
        ...formData,
        quantity: Number(formData.quantity) || 0,
        status,
      });
      setShowEditModal(false);
      setEditingClient(null);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const columnDefs = useMemo(() => {
    const baseCols = [
      {
        headerName: 'SL',
        width: 70,
        minWidth: 70,
        pinned: 'left',
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : ''),
      },
      { field: 'companyName', headerName: 'COMPANY NAME', width: 200, minWidth: 160, pinned: 'left' },
      { field: 'projectName', headerName: 'PROJECT NAME', width: 200, minWidth: 160 },
      { field: 'workType', headerName: 'WORK TYPE', width: 130, minWidth: 110 },
      { field: 'quantity', headerName: 'QTY', width: 90, minWidth: 80, type: 'numericColumn' },
      { field: 'unit', headerName: 'UNIT', width: 90, minWidth: 80 },
      {
        field: 'status',
        headerName: 'STATUS',
        width: 120,
        minWidth: 110,
        cellRenderer: (params) => (
          <span
            style={{
              backgroundColor: params.value === 'ACTIVE' ? '#166534' : '#374151',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'inline-block',
            }}
          >
            {params.value || 'ACTIVE'}
          </span>
        ),
      },
      {
        headerName: 'ACTION',
        width: 130,
        minWidth: 130,
        pinned: 'right',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
        cellRenderer: (params) => (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedClient(params.data)}
              title="View details"
              style={{
                backgroundColor: 'transparent',
                color: '#0055ff',
                border: '1px solid #0055ff40',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0055ff';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#0055ff';
              }}
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              onClick={() => openEditModal(params.data)}
              title="Edit client"
              style={{
                backgroundColor: 'transparent',
                color: '#f59e0b',
                border: '1px solid #f59e0b40',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f59e0b';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#f59e0b';
              }}
            >
              <Edit3 size={14} />
            </button>
          </div>
        ),
      },
    ];
    return baseCols.map((col) => ({
      ...col,
      ...(floatingFilters ? { filter: true, floatingFilter: true } : {}),
    }));
  }, [floatingFilters]);

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

  const autoSizeAllColumns = useCallback(
    (api = gridApi) => {
      if (!api) return;
      const allColumnIds = api.getAllDisplayedColumns().map((col) => col.getColId());
      if (allColumnIds.length) {
        window.requestAnimationFrame(() => {
          api.autoSizeColumns(allColumnIds, false);
        });
      }
    },
    [gridApi]
  );

  useEffect(() => {
    autoSizeAllColumns();
  }, [autoSizeAllColumns, columnDefs, filteredClients.length]);

  if (loading) return <div style={s.loading}>Loading clients...</div>;

  return (
    <div style={{ ...s.container, padding: '16px 8px' }}>
      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#888',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Total Clients
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0055ff' }}>
            {clients.length}
          </p>
        </div>
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#888',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Active Clients
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
            {activeClients.length}
          </p>
        </div>
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            padding: '18px',
          }}
        >
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#888',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Completed Projects
          </p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#6b7280' }}>
            {completedClients.length}
          </p>
        </div>
      </div>

      {/* Search / Actions Row */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input
            type="text"
            placeholder="Filter clients..."
            style={s.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} style={s.primaryBtn}>
          <Plus size={18} /> ADD CLIENT
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
                {
                  icon: '📥',
                  label: 'Download Excel',
                  action: () => {
                    setMenuOpen(false);
                    exportToExcel(
                      filteredClients,
                      getExportColumns(columnDefs),
                      'clients'
                    );
                  },
                },
                {
                  icon: '🔍',
                  label: floatingFilters ? '✓ Column Filters' : 'Column Filters',
                  action: () => {
                    setMenuOpen(false);
                    setFloatingFilters((prev) => !prev);
                  },
                },
                {
                  icon: '🔄',
                  label: 'Refresh',
                  action: () => {
                    setMenuOpen(false);
                    setLoading(true);
                    loadData();
                  },
                },
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
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'var(--accent-soft, rgba(0,85,255,0.06))')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* AG Grid */}
      <div style={s.gridSection}>
        <div style={{ height: '78vh', width: '100%' }}>
          <AgGridReact
            rowData={filteredClients}
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

      {/* Add Client Modal */}
      {showCreateModal && (
        <ClientFormModal
          title="ADD NEW CLIENT"
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowCreateModal(false);
            setFormData(EMPTY_FORM);
          }}
          onSubmit={handleCreate}
          submitLabel="SAVE CLIENT"
          showCloseDate={false}
        />
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <ClientFormModal
          title="EDIT CLIENT"
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
            setFormData(EMPTY_FORM);
          }}
          onSubmit={handleEdit}
          submitLabel="UPDATE CLIENT"
          showCloseDate={true}
        />
      )}

      {/* View Client Details Modal */}
      {selectedClient && (
        <ViewClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* Toast */}
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

const ClientFormModal = ({ title, formData, setFormData, onClose, onSubmit, submitLabel, showCloseDate }) => {
  return (
    <div style={s.modalOverlay}>
      <div style={{ ...s.modalContent, maxWidth: '620px' }}>
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>

        <form onSubmit={onSubmit} style={s.form}>
          <div style={s.inputGrid}>
            <FormField label="COMPANY NAME" span={2}>
              <input
                style={s.formInput}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </FormField>
            <FormField label="EMAIL" span={2}>
              <input
                type="email"
                style={s.formInput}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
            <FormField label="ADDRESS" span={2}>
              <input
                style={s.formInput}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FormField>
            <FormField label="GST NUMBER" span={2}>
              <input
                style={s.formInput}
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </FormField>
            <FormField label="PROJECT NAME" span={2}>
              <input
                style={s.formInput}
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </FormField>
            <FormField label="PO NUMBER">
              <input
                style={s.formInput}
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
              />
            </FormField>
            <FormField label="PO DATE">
              <input
                type="date"
                style={s.formInput}
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
              />
            </FormField>
            <FormField label="WORK TYPE">
              <select
                style={s.formInput}
                value={formData.workType}
                onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
              >
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="QUANTITY">
              <input
                type="number"
                min="0"
                step="any"
                style={s.formInput}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </FormField>
            <FormField label="UNIT">
              <select
                style={s.formInput}
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </FormField>
            {showCloseDate && (
              <FormField label="CLOSE DATE" span={2}>
                <input
                  type="date"
                  style={s.formInput}
                  value={formData.closeDate}
                  onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                />
              </FormField>
            )}
          </div>

          <button type="submit" style={s.submitBtn}>
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

const ViewClientModal = ({ client, onClose }) => {
  const details = [
    ['Company Name', client.companyName],
    ['Email', client.email],
    ['Address', client.address],
    ['GST Number', client.gstNumber],
    ['Project Name', client.projectName],
    ['PO Number', client.poNumber],
    ['PO Date', client.poDate],
    ['Work Type', client.workType],
    ['Quantity', client.quantity],
    ['Unit', client.unit],
    ['Close Date', client.closeDate],
    ['Status', client.status],
  ];

  return (
    <div style={s.modalOverlay}>
      <div
        style={{
          ...s.modalContent,
          maxWidth: '620px',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        <div style={s.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 15 }}>CLIENT DETAILS</h3>
          <X
            size={20}
            style={{ cursor: 'pointer', color: '#555', flexShrink: 0 }}
            onClick={onClose}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            {details.map(([label, val]) => (
              <div key={label}>
                <span
                  style={{
                    ...s.label,
                    color: 'var(--text)',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {label}
                </span>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {val ?? '—'}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-2)' }}>
              STATUS:
            </span>
            <span
              style={{
                backgroundColor: client.status === 'ACTIVE' ? '#166534' : '#374151',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'inline-block',
              }}
            >
              {client.status || 'ACTIVE'}
            </span>
          </div>
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

export default ClientManagement;