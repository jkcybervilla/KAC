import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Save, ChevronLeft, Download, Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

// Inject responsive styles once
if (!document.getElementById('attendance-responsive-styles')) {
  const style = document.createElement('style');
  style.id = 'attendance-responsive-styles';
  style.textContent = `
    @media (max-width: 767px) {
      .attendance-grid .ag-theme-quartz .ag-cell {
        line-height: 38px !important;
        font-size: 12px !important;
        padding: 0 2px !important;
      }
      .attendance-grid .ag-theme-quartz .ag-header-cell {
        font-size: 11px !important;
        padding: 0 2px !important;
      }
      .attendance-grid .ag-theme-quartz .ag-header-cell-label {
        justify-content: center !important;
      }
      .attendance-grid .ag-theme-quartz .ag-header-cell-text {
        font-size: 11px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Inject toggle knob CSS
if (!document.getElementById('attendance-toggle-styles')) {
  const s = document.createElement('style');
  s.id = 'attendance-toggle-styles';
  s.textContent = `
    .att-toggle-label input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .att-toggle-slider::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      top: 2px;
      left: 2px;
      transition: transform 0.2s ease;
    }
    .att-toggle-label input:checked ~ .att-toggle-slider::after {
      transform: translateX(18px);
    }
  `;
  document.head.appendChild(s);
}

const AttendanceSheet = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState(null);
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showReferenceCol, setShowReferenceCol] = useState(true);
  const [showTotalCol, setShowTotalCol] = useState(true);
  const [showEmpIdCol, setShowEmpIdCol] = useState(true);
  const [showFatherNameCol, setShowFatherNameCol] = useState(false);
  const [showDesignationCol, setShowDesignationCol] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [quickFilter, setQuickFilter] = useState('All');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Current month and year
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const monthsList = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "workers"), orderBy("SLNO", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          EMPID: doc.data().EMPID,
          WORKER_NAME: doc.data().WORKER_NAME,
          FATHER_NAME: doc.data().FATHER_NAME || '',
          DESIGNATION: doc.data().DESIGNATION || '',
          PROJECT: doc.data().PROJECT,
          // Default value 'P' for all days
          ...Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, 'P']))
        }));
        setWorkers(data);
      } catch (err) {
        console.error("Firestore Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  const columnDefs = useMemo(() => {
    const baseCols = [];

    // EMPID column — toggleable for all users
    if (showEmpIdCol) {
      baseCols.push({ field: "EMPID", headerName: "ID", width: 90, pinned: 'left', filter: true, editable: false });
    }

    // WORKER_NAME always shown
    baseCols.push({ field: "WORKER_NAME", headerName: "NAME", width: 150, pinned: 'left', filter: true, editable: false });

    // Father Name column — toggleable
    if (showFatherNameCol) {
      baseCols.push({ field: "FATHER_NAME", headerName: "FATHER", width: 140, filter: true, editable: false });
    }

    // Designation column — toggleable
    if (showDesignationCol) {
      baseCols.push({ field: "DESIGNATION", headerName: "DESIG", width: 120, filter: true, editable: false });
    }

    // Reference (PROJECT) column — toggleable
    if (showReferenceCol) {
      baseCols.push({ field: "PROJECT", headerName: "PROJECT", width: 120, filter: true, editable: false });
    }

    // Total column — toggleable for all users
    if (showTotalCol) {
      baseCols.push({
        field: "TOTAL",
        headerName: "TOTAL",
        width: 80,
        pinned: 'left',
        editable: false,
        valueGetter: params => {
          let presents = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            if (params.data[d] === 'P') presents++;
          }
          return presents;
        },
        cellStyle: { display: 'flex', justifyContent: 'center', fontWeight: 'bold', color: '#00ff88' }
      });
    }

    const dayCols = Array.from({ length: daysInMonth }, (_, i) => ({
      field: (i + 1).toString(),
      headerName: (i + 1).toString(),
      width: 55,
      minWidth: 50,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['P', 'A', 'H', 'L']
      },
      cellStyle: params => {
        const styles = { display: 'flex', justifyContent: 'center', cursor: 'pointer' };
        if (params.value === 'A') return { ...styles, color: '#ff4444', fontWeight: 'bold' };
        if (params.value === 'H') return { ...styles, color: '#ffcc00', fontWeight: 'bold' };
        if (params.value === 'L') return { ...styles, color: '#00ccff', fontWeight: 'bold' };
        return { ...styles, color: '#00ff88' };
      }
    }));

    return [...baseCols, ...dayCols];
  }, [daysInMonth, showEmpIdCol, showFatherNameCol, showDesignationCol, showReferenceCol, showTotalCol]);

  const saveAttendance = async () => {
    if (!gridApi) return;
    try {
      const attendanceData = [];
      gridApi.forEachNode(node => attendanceData.push(node.data));
      const batchId = `${monthsList[month - 1]}_${year}`;
      alert(`Saving Attendance for ${batchId}...`);
      // Firebase save logic will go here
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div style={styles.loading}>Loading Worker Data...</div>;

  return (
    <div style={styles.container}>
      {/* ----- HEADER ----- */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/admin')} style={styles.backBtn}>
            <ChevronLeft size={20} />
          </button>
          <h2 style={styles.title}>ATTENDANCE <span style={{ color: '#0055ff' }}>ENTRY</span></h2>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.monthSelector}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={styles.select}>
              {monthsList.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={styles.select}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
          <button onClick={saveAttendance} style={styles.saveBtn}>
            <Save size={18} /> SAVE SHEET
          </button>
        </div>
      </header>

      {/* ----- TOOLBAR (for all users) ----- */}
      <div style={styles.toolbarWrapper}>
        <div style={styles.toolbar}>
          {/* Left: Settings gear icon */}
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={styles.iconBtn}
              title="Settings"
            >
              <span style={styles.settingsGear}>⚙️</span>
            </button>

            {/* Settings dropdown panel */}
            {showSettings && (
              <div style={styles.settingsPanel}>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>Filter bar</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showFilterBar}
                      onChange={() => setShowFilterBar(!showFilterBar)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showFilterBar ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>Reference</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showReferenceCol}
                      onChange={() => setShowReferenceCol(!showReferenceCol)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showReferenceCol ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>Total</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showTotalCol}
                      onChange={() => setShowTotalCol(!showTotalCol)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showTotalCol ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>EMP ID</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showEmpIdCol}
                      onChange={() => setShowEmpIdCol(!showEmpIdCol)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showEmpIdCol ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>Father Name</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showFatherNameCol}
                      onChange={() => setShowFatherNameCol(!showFatherNameCol)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showFatherNameCol ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
                <div style={styles.settingsItem}>
                  <span style={styles.settingsLabel}>Designation</span>
                  <label className="att-toggle-label" style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={showDesignationCol}
                      onChange={() => setShowDesignationCol(!showDesignationCol)}
                    />
                    <span className="att-toggle-slider" style={{...styles.toggleSlider, backgroundColor: showDesignationCol ? '#0055ff' : '#333'}}></span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Download button */}
          <button style={styles.downloadBtn}>
            <Download size={18} />
            <span>Download</span>
          </button>

          {/* Spacer pushes Save to right */}
          <div style={{ flex: 1 }} />

          {/* Save button (mobile style, visible on all sizes) */}
          <button onClick={saveAttendance} style={styles.toolbarSaveBtn}>
            <Save size={18} />
            <span>SAVE</span>
          </button>
        </div>

        {/* ----- FILTER BAR (animated slide) — for all users ----- */}
        <div style={{
          ...styles.filterBar,
          maxHeight: showFilterBar ? '60px' : '0px',
          opacity: showFilterBar ? 1 : 0,
          padding: showFilterBar ? '10px 12px' : '0 12px',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease, padding 0.3s ease',
        }}>
          <div style={styles.filterRow}>
            <Search size={16} style={{ color: '#888', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          <div style={styles.filterQuickActions}>
            <select
              value={quickFilter}
              onChange={e => setQuickFilter(e.target.value)}
              style={styles.quickSelect}
            >
              <option value="All">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Holiday">Holiday</option>
              <option value="Leave">Leave</option>
            </select>
            <ChevronDown size={14} style={{ color: '#888', marginLeft: -20, pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* ----- GRID SECTION ----- */}
      <div style={styles.gridSection} className="attendance-grid">
        <div style={{ height: '75vh', width: '100%' }}>
          <AgGridReact
            rowData={workers}
            columnDefs={columnDefs}
            defaultColDef={{
              resizable: true,
              sortable: true,
              editable: true,
            }}
            onGridReady={params => setGridApi(params.api)}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={true}
            animateRows={true}
            suppressRowClickSelection={true}
            rowHeight={34}
            headerHeight={38}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      <div style={styles.legend}>
        <span><b style={{ color: '#00ff88' }}>P</b>: Present</span>
        <span><b style={{ color: '#ff4444' }}>A</b>: Absent</span>
        <span><b style={{ color: '#ffcc00' }}>H</b>: Holiday</span>
        <span><b style={{ color: '#00ccff' }}>L</b>: Leave</span>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff' },
  loading: { color: '#444', textAlign: 'center', marginTop: '100px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  title: { fontSize: '22px', fontWeight: '900', margin: 0 },
  backBtn: { background: '#0a0a0a', border: '1px solid #111', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerRight: { display: 'flex', gap: '15px', alignItems: 'center' },
  monthSelector: { backgroundColor: '#0a0a0a', padding: '5px 15px', borderRadius: '8px', border: '1px solid #111', display: 'flex', gap: '10px' },
  select: { background: 'none', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  gridSection: { borderRadius: '12px', overflow: 'hidden' },
  legend: { marginTop: '15px', display: 'flex', gap: '20px', fontSize: '13px', color: '#777' },

  // --- Toolbar (for all users) ---
  toolbarWrapper: { marginBottom: '12px' },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0a0a0a',
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #1a1a1a',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  settingsGear: { fontSize: '20px', lineHeight: 1 },
  downloadBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#ccc',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },
  toolbarSaveBtn: {
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },

  // --- Settings dropdown panel ---
  settingsPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '6px',
    backgroundColor: '#121212',
    border: '1px solid #222',
    borderRadius: '10px',
    padding: '8px 0',
    minWidth: '200px',
    zIndex: 1000,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  settingsItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#ddd',
  },
  settingsLabel: { fontWeight: 500 },

  // --- Toggle switch ---
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: 40,
    height: 22,
    cursor: 'pointer',
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '22px',
    transition: 'background-color 0.2s ease',
  },

  // --- Filter bar ---
  filterBar: {
    backgroundColor: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: '8px',
    padding: '6px 10px',
  },
  filterInput: {
    background: 'none',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
  },
  filterQuickActions: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  quickSelect: {
    backgroundColor: '#151515',
    border: '1px solid #333',
    color: '#ccc',
    padding: '6px 28px 6px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
  },
};

export default AttendanceSheet;