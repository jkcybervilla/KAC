import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterProjectsByUser } from '../../utils/projectAccess';
import { pageStyles as s } from '../../styles/pageStyles';

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

const CoordinatorDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'projects'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = filterProjectsByUser(all, profile);
      setProjects(mine);
      if (mine.length) setSelected(mine[0]);
      setLoading(false);
    })();
  }, [profile]);

  const columnDefs = useMemo(
    () => [
      { headerName: 'SL', width: 70, valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : '') },
      { field: 'PROJECT_NAME', headerName: 'PROJECT', flex: 1 },
      { field: 'LINE_NAME', headerName: 'LINE', width: 120 },
      { field: 'TYPE', headerName: 'TYPE', width: 80 },
      { field: 'CLIENT', headerName: 'CLIENT', width: 120 },
      { field: 'DISTRICT', headerName: 'DISTRICT', width: 110 },
      { field: 'REGION', headerName: 'REGION', width: 100 },
      { field: 'CO_ORDINATOR', headerName: 'COORDINATOR', width: 130 },
      { field: 'ACCOUNTANT', headerName: 'ACCOUNTANT', width: 130 },
      { field: 'REQ_MANPOWER', headerName: 'REQ MP', width: 90 },
    ],
    []
  );

  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    auth.signOut();
    navigate('/');
  };

  if (loading) return <div style={s.loading}>Loading...</div>;

  return (
    <div className="coordinator-layout page-container">
      <div className={menuOpen ? 'slidebar-backdrop open' : 'slidebar-backdrop'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'page-aside slidebar open' : 'page-aside slidebar'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>
            COORDINATOR <span style={{ color: '#f59e0b' }}>VIEW</span>
          </h2>
          <button className="slidebar-close-btn" type="button" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#666', marginBottom: 16 }}>View only — assigned projects</p>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelected(p);
              setMenuOpen(false);
            }}
            style={{
              ...s.tab,
              width: '100%',
              textAlign: 'left',
              marginBottom: 8,
              ...(selected?.id === p.id ? s.tabActive : {}),
            }}
          >
            {p.PROJECT_NAME}
          </button>
        ))}
        <button type="button" onClick={logout} style={{ ...s.secondaryBtn, marginTop: 24, width: '100%' }}>
          <LogOut size={14} /> Logout
        </button>
      </aside>

      <main className="page-main">
        <header className="page-header" style={{ marginBottom: 24 }}>
          <div className="page-header-inner">
            <button className="slidebar-toggle-btn" type="button" onClick={() => setMenuOpen(true)}>
              ☰
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 22 }}>{selected?.PROJECT_NAME || 'No project'}</h1>
              <p style={{ margin: '6px 0 0', color: '#888', fontSize: 13 }}>
                Line: {selected?.LINE_NAME || '—'} | View only access
              </p>
            </div>
            <Bell size={20} color="#666" />
          </div>
        </header>

        {selected && (
          <div style={{ ...s.modalContent, maxWidth: 'none', marginBottom: 20 }}>
            <div className="page-info-grid">
              {[
                ['TYPE', selected.TYPE],
                ['CLIENT', selected.CLIENT],
                ['PO', selected.PO_NUMBER],
                ['GEM ID', selected.GEM_ID],
                ['DISTRICT', selected.DISTRICT],
                ['REGION', selected.REGION],
                ['REQUIRED MP', selected.REQ_MANPOWER],
                ['ACCOUNTANT', selected.ACCOUNTANT],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={s.label}>{k}</span>
                  <p style={{ margin: '4px 0 0' }}>{v ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="page-box" style={{ padding: 0 }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ minHeight: '50vh', width: '100%' }}>
              <AgGridReact rowData={projects} columnDefs={columnDefs} defaultColDef={{ filter: true, sortable: true }} theme={darkQuartzTheme} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoordinatorDashboard;