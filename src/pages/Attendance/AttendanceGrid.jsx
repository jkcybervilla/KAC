import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Save, Search, X, User, Hash, Building, List, Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { getBatchId, getDaysInMonth, defaultDayMap, MONTHS } from '../../utils/attendance';

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

const overlayBase = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 99999, padding: '20px',
};

const modalBase = {
  backgroundColor: '#0a0a0a', padding: '28px', borderRadius: '15px',
  width: '100%', maxWidth: '750px', border: '1px solid #1a1a1a',
  maxHeight: '90vh', overflowY: 'auto', color: '#fff',
};

const statBadge = {
  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold',
  padding: '8px 14px', borderRadius: '8px', backgroundColor: '#050505', border: '1px solid #1a1a1a',
};

const monthBarStyle = {
  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
  backgroundColor: '#050505', borderRadius: '8px', border: '1px solid #111',
  marginBottom: '6px',
};

const AttendanceGrid = ({ type = 'client', projectFilter = '' }) => {
  const [workers, setWorkers] = useState([]);
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [gridApi, setGridApi] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [project, setProject] = useState(projectFilter || '');
  const [designation, setDesignation] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerHistory, setWorkerHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandDays, setExpandDays] = useState(false);
  const dayColsRef = useRef([]);

  const collectionName = type === 'office' ? 'attendance_office' : 'attendance_client';
  const daysInMonth = getDaysInMonth(month, year);
  const batchId = getBatchId(month, year);

  const load = async () => {
    setLoading(true);
    try {
      const [wSnap, aSnap] = await Promise.all([
        getDocs(query(collection(db, 'workers'), orderBy('SLNO', 'asc'))),
        getDocs(collection(db, collectionName)),
      ]);
      const wList = wSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const attMap = {};
      aSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) attMap[data.EMPID] = data;
      });
      setWorkers(wList);
      setSaved(attMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year, type]);

  useEffect(() => {
    if (projectFilter) setProject(projectFilter);
  }, [projectFilter]);

  // Toggle day columns visibility
  useEffect(() => {
    if (gridApi && dayColsRef.current.length > 0) {
      dayColsRef.current.forEach((colId) => {
        gridApi.getColumnDef(colId) ? gridApi.setColumnsVisible([colId], expandDays) : null;
      });
    }
  }, [expandDays, gridApi, daysInMonth]);

  // Load full attendance history for a worker across all months
  const loadWorkerHistory = async (empId) => {
    setHistoryLoading(true);
    try {
      const aSnap = await getDocs(collection(db, collectionName));
      const allRecords = aSnap.docs
        .map((d) => d.data())
        .filter((r) => r.EMPID === empId)
        .sort((a, b) => {
          const aKey = a.year * 12 + a.month;
          const bKey = b.year * 12 + b.month;
          return aKey - bKey;
        });

      let totalP = 0, totalA = 0, totalH = 0, totalL = 0;
      const monthSummaries = allRecords.map((rec) => {
        const dm = getDaysInMonth(rec.month, rec.year);
        let p = 0, a = 0, h = 0, l = 0;
        for (let d = 1; d <= dm; d++) {
          const val = (rec.days || {})[String(d)] || 'P';
          if (val === 'P') p++;
          else if (val === 'A') a++;
          else if (val === 'H') h++;
          else if (val === 'L') l++;
        }
        totalP += p; totalA += a; totalH += h; totalL += l;
        return { batchId: rec.batchId, month: rec.month, year: rec.year, p, a, h, l, dm };
      });

      setWorkerHistory({ monthSummaries, totalP, totalA, totalH, totalL });
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWorker) {
      loadWorkerHistory(selectedWorker.EMPID);
    } else {
      setWorkerHistory(null);
    }
  }, [selectedWorker]);

  const rowData = useMemo(() => {
    return workers
      .filter((w) => (w.STATUS || 'ACTIVE') === 'ACTIVE')
      .filter((w) => !project || (w.PROJECT || '') === project)
      .filter((w) => !designation || (w.DESIGNATION || '') === designation)
      .map((w) => {
        const savedRow = saved[w.EMPID];
        const days = savedRow?.days || defaultDayMap(daysInMonth, 'P');
        return {
          id: w.id,
          EMPID: w.EMPID,
          REFFERENCE: w.REFFERENCE || '',
          WORKER_NAME: w.WORKER_NAME,
          FATHER_NAME: w.FATHER_NAME || '',
          DESIGNATION: w.DESIGNATION || 'LABOUR',
          JOINING: w.JOINING_DATE || w.JOINING_DATE_OFFICE || '—',
          CLOSE: w.CLOSE_DATE || '—',
          PROJECT: w.PROJECT || '',
          ...days,
        };
      });
  }, [workers, saved, daysInMonth, project, designation]);

  const columnDefs = useMemo(() => {
    const base = [
      {
        field: 'SLNO',
        headerName: 'SL NO',
        width: 70,
        pinned: 'left',
        editable: false,
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : 0),
      },
      { field: 'EMPID', headerName: 'EMP ID', width: 90, pinned: 'left', editable: false },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 110, editable: false },
      { field: 'WORKER_NAME', headerName: 'NAME', width: 140, pinned: 'left', editable: false },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 130, editable: false },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120, editable: true },
      { field: 'JOINING', headerName: 'JOINING', width: 100, editable: false },
      { field: 'CLOSE', headerName: 'CLOSE', width: 100, editable: false },
    ];
    const dayCols = Array.from({ length: daysInMonth }, (_, i) => ({
      field: String(i + 1),
      headerName: String(i + 1),
      width: 48,
      editable: true,
      hide: !expandDays,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['P', 'A', 'H', 'L'] },
      cellStyle: (params) => {
        const st = { display: 'flex', justifyContent: 'center', fontWeight: 'bold' };
        if (params.value === 'A') return { ...st, color: '#ff4444' };
        if (params.value === 'H') return { ...st, color: '#ffcc00' };
        if (params.value === 'L') return { ...st, color: '#00ccff' };
        return { ...st, color: '#00ff88' };
      },
    }));
    dayColsRef.current = dayCols.map((c) => c.field);
    const totalCol = {
      field: 'TOTAL',
      headerName: 'TOTAL',
      width: 80,
      editable: false,
      pinned: 'right',
      cellStyle: { display: 'flex', justifyContent: 'center', fontWeight: 'bold', color: '#0055ff', fontSize: '15px' },
      aggFunc: 'sum',
      valueGetter: (params) => {
        let count = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          if ((params.data[String(d)] || 'P') === 'P') count++;
        }
        return count;
      },
    };
    const detailsBtnCol = {
      field: 'DETAILS',
      headerName: 'DETAILS',
      width: 110,
      editable: false,
      pinned: 'right',
      cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
      cellRenderer: (params) => (
        <button
          onClick={() => setSelectedWorker(params.data)}
          style={{
            background: '#0055ff',
            color: '#fff',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <List size={12} /> VIEW
        </button>
      ),
    };
    return [...base, ...dayCols, totalCol, detailsBtnCol];
  }, [daysInMonth, expandDays]);

  const projects = useMemo(() => [...new Set(workers.map((w) => w.PROJECT).filter(Boolean))], [workers]);
  const designations = useMemo(() => [...new Set(workers.map((w) => w.DESIGNATION).filter(Boolean))], [workers]);

  const saveSheet = async () => {
    if (!gridApi) return;
    try {
      const ops = [];
      gridApi.forEachNode((node) => {
        const row = node.data;
        const days = {};
        for (let d = 1; d <= daysInMonth; d++) days[String(d)] = row[String(d)] || 'P';
        const docId = `${row.EMPID}_${batchId}`;
        ops.push(
          setDoc(doc(db, collectionName, docId), {
            EMPID: row.EMPID,
            WORKER_NAME: row.WORKER_NAME,
            PROJECT: row.PROJECT,
            DESIGNATION: row.DESIGNATION,
            batchId,
            month,
            year,
            type,
            days,
            updatedAt: new Date(),
          })
        );
      });
      await Promise.all(ops);
      alert(`Saved ${type.toUpperCase()} attendance for ${batchId}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ color: '#666', padding: 20 }}>Loading attendance...</div>;

  return (
    <div>
      <div style={{ ...s.filterRow, marginBottom: 16 }}>
        <select style={s.select} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select style={s.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select style={s.select} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select style={s.select} value={designation} onChange={(e) => setDesignation(e.target.value)}>
          <option value="">All Designations</option>
          {designations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Quick filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <button
          type="button"
          style={{
            ...s.secondaryBtn,
            borderColor: expandDays ? '#0055ff' : '#222',
            color: expandDays ? '#fff' : '#888',
          }}
          onClick={() => setExpandDays(!expandDays)}
        >
          {expandDays ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expandDays ? 'HIDE DAYS' : 'SHOW DAYS'}
        </button>
        <ExportToolbar rows={rowData} columnDefs={columnDefs} title={`${type} Attendance ${batchId}`} filename={`attendance-${type}-${batchId}`} />
        <button type="button" style={s.primaryBtn} onClick={saveSheet}>
          <Save size={16} /> SAVE
        </button>
      </div>

      <div style={s.gridSection}>
        <div style={{ height: '68vh', width: '100%' }}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, filter: true, sortable: true }}
            onGridReady={(p) => {
              setGridApi(p.api);
              // Auto-fit all columns on load
              setTimeout(() => {
                p.api.autoSizeAllColumns();
              }, 100);
            }}
            quickFilterText={searchText}
            singleClickEdit
            stopEditingWhenCellsLoseFocus
            animateRows
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedWorker && (
        <div style={overlayBase} onClick={() => setSelectedWorker(null)}>
          <div style={modalBase} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #111', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                <List size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#0055ff' }} />
                Worker Details
              </h3>
              <button
                onClick={() => setSelectedWorker(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Worker Basic Info */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '16px', backgroundColor: '#050505', borderRadius: '10px', border: '1px solid #111' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <User size={14} color="#0055ff" /> {selectedWorker.WORKER_NAME}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <Hash size={14} color="#0055ff" /> {selectedWorker.EMPID}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <User size={14} color="#0055ff" /> {selectedWorker.FATHER_NAME}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <Building size={14} color="#0055ff" /> {selectedWorker.DESIGNATION}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <Calendar size={14} color="#0055ff" /> Joined: {selectedWorker.JOINING}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <Calendar size={14} color="#0055ff" /> Close: {selectedWorker.CLOSE}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc' }}>
                <MapPin size={14} color="#0055ff" /> {selectedWorker.REFFERENCE}
              </div>
            </div>

            {/* Cumulative Stats */}
            <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px 0', color: '#aaa' }}>
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Lifetime Attendance Summary (All Months)
            </h4>

            {historyLoading ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Loading history...</p>
            ) : workerHistory ? (
              <>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div style={{ ...statBadge, color: '#00ff88' }}>✅ Present: {workerHistory.totalP}</div>
                  <div style={{ ...statBadge, color: '#ff4444' }}>❌ Absent: {workerHistory.totalA}</div>
                  <div style={{ ...statBadge, color: '#ffcc00' }}>🎉 Holiday: {workerHistory.totalH}</div>
                  <div style={{ ...statBadge, color: '#00ccff' }}>📋 Leave: {workerHistory.totalL}</div>
                  <div style={{ ...statBadge, color: '#0055ff', border: '1px solid #0055ff' }}>
                    📊 Total Days (Present): {workerHistory.totalP}
                  </div>
                </div>

                {/* Month-by-month history */}
                <h4 style={{ fontSize: '12px', fontWeight: '700', margin: '0 0 8px 0', color: '#888' }}>
                  Month-wise Attendance
                </h4>
                {workerHistory.monthSummaries.map((ms, idx) => (
                  <div key={idx} style={monthBarStyle}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', width: '90px', color: '#fff' }}>
                      {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][ms.month - 1]} {ms.year}
                    </span>
                    <div style={{ flex: 1, display: 'flex', gap: '16px', fontSize: '12px' }}>
                      <span style={{ color: '#00ff88' }}>P: {ms.p}</span>
                      <span style={{ color: '#ff4444' }}>A: {ms.a}</span>
                      <span style={{ color: '#ffcc00' }}>H: {ms.h}</span>
                      <span style={{ color: '#00ccff' }}>L: {ms.l}</span>
                    </div>
                    <span style={{ color: '#555', fontSize: '11px' }}>Days: {ms.dm}</span>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: '#555', fontSize: '13px' }}>No attendance records found for this worker in this category.</p>
            )}

            {/* Current Month Day-wise */}
            <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '18px 0 6px 0', color: '#aaa' }}>
              Current Month Day-wise ({month}/{year})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: '6px' }}>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const val = selectedWorker[String(day)] || 'P';
                let bgColor = '#0a2a0a', txtColor = '#00ff88';
                if (val === 'A') { bgColor = '#2a0a0a'; txtColor = '#ff4444'; }
                else if (val === 'H') { bgColor = '#2a2a00'; txtColor = '#ffcc00'; }
                else if (val === 'L') { bgColor = '#002a2a'; txtColor = '#00ccff'; }
                return (
                  <div key={day} style={{ padding: '6px 2px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', backgroundColor: bgColor, border: '1px solid #1a1a1a', color: txtColor }}>
                    <div style={{ fontSize: '9px', color: '#666' }}>D{day}</div>
                    <div>{val}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceGrid;