import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Search } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { getBatchId, countPresent } from '../../utils/attendance';

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

const AccountantDailyAttendance = ({ type, projectName }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  const dateObj = new Date(selectedDate);
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const day = dateObj.getDate();
  const batchId = getBatchId(month, year);
  const coll = type === 'office' ? 'attendance_office' : 'attendance_client';

  useEffect(() => {
    if (!projectName) return;
    (async () => {
      setLoading(true);
      try {
        const [wSnap, aSnap] = await Promise.all([
          getDocs(collection(db, 'workers')),
          getDocs(collection(db, coll)),
        ]);
        const workers = wSnap.docs
          .map((d) => d.data())
          .filter((w) => (w.PROJECT || '') === projectName && (w.STATUS || 'ACTIVE') === 'ACTIVE');
        const attMap = {};
        aSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.batchId === batchId) attMap[data.EMPID] = data;
        });

        const built = workers.map((w, i) => {
          const days = attMap[w.EMPID]?.days || {};
          const dayVal = days[String(day)] || '—';
          const total = countPresent(days, day);
          return {
            SLNO: w.SLNO ?? i + 1,
            WORKER_NAME: w.WORKER_NAME,
            FATHER_NAME: w.FATHER_NAME || '',
            CLOSE_DATE: w.CLOSE_DATE || w.JOINING_DATE_OFFICE || '—',
            ATTENDANCE: dayVal,
            TOTAL_DAY: total,
          };
        });
        setRows(built);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedDate, projectName, coll, batchId, day]);

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO', width: 80 },
      { field: 'WORKER_NAME', headerName: 'NAME', flex: 1 },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 140 },
      { field: 'CLOSE_DATE', headerName: 'CLOSE DATE', width: 120 },
      { field: 'ATTENDANCE', headerName: 'ATTENDANCE', width: 110 },
      { field: 'TOTAL_DAY', headerName: 'TOTAL DAY', width: 110 },
    ],
    []
  );

  const subtotal = rows.reduce((s, r) => s + (Number(r.TOTAL_DAY) || 0), 0);

  if (!projectName) return <p style={{ color: '#666' }}>Select a project from the header.</p>;
  if (loading) return <p style={{ color: '#666' }}>Loading...</p>;

  return (
    <>
      <div style={{ ...s.filterRow, marginBottom: 16 }}>
        <label style={s.label}>DATE (view only)</label>
        <input type="date" style={s.select} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <ExportToolbar rows={rows} columnDefs={columnDefs} title={`${type} ${selectedDate}`} filename={`${type}-${selectedDate}`} />
      </div>
      <div style={s.gridSection}>
        <div style={{ height: '60vh', width: '100%' }}>
          <AgGridReact
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ filter: true, sortable: true, editable: false }}
            quickFilterText={searchText}
            theme={darkQuartzTheme}
          />
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: 13, color: '#888' }}>
        Subtotal TOTAL DAY: <strong style={{ color: '#0055ff' }}>{subtotal}</strong> (read-only)
      </p>
    </>
  );
};

export default AccountantDailyAttendance;
