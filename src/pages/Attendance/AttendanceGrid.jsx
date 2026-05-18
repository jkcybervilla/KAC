import React, { useState, useEffect, useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Save, Search } from 'lucide-react';
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

  const rowData = useMemo(() => {
    return workers
      .filter((w) => (w.STATUS || 'ACTIVE') === 'ACTIVE')
      .filter((w) => !project || (w.PROJECT || '') === project)
      .filter((w) => !designation || (w.DESIGNATION || '') === designation)
      .map((w, i) => {
        const savedRow = saved[w.EMPID];
        const days = savedRow?.days || defaultDayMap(daysInMonth, 'P');
        return {
          id: w.id,
          SLNO: w.SLNO ?? i + 1,
          EMPID: w.EMPID,
          REFFERENCE: w.REFFERENCE || '',
          WORKER_NAME: w.WORKER_NAME,
          FATHER_NAME: w.FATHER_NAME || '',
          DESIGNATION: w.DESIGNATION || 'LABOUR',
          PROJECT: w.PROJECT || '',
          ...days,
        };
      });
  }, [workers, saved, daysInMonth, project, designation]);

  const columnDefs = useMemo(() => {
    const base = [
      { field: 'SLNO', headerName: 'SL NO', width: 70, pinned: 'left', editable: false },
      { field: 'EMPID', headerName: 'EMP ID', width: 90, pinned: 'left', editable: false },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 110, editable: false },
      { field: 'WORKER_NAME', headerName: 'NAME', width: 140, pinned: 'left', editable: false },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 130, editable: false },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120, editable: true },
    ];
    const dayCols = Array.from({ length: daysInMonth }, (_, i) => ({
      field: String(i + 1),
      headerName: String(i + 1),
      width: 48,
      editable: true,
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
    return [...base, ...dayCols];
  }, [daysInMonth]);

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
            onGridReady={(p) => setGridApi(p.api)}
            quickFilterText={searchText}
            singleClickEdit
            stopEditingWhenCellsLoseFocus
            animateRows
            theme={darkQuartzTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceGrid;