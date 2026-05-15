import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Save, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const AttendanceSheet = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState(null);
  const navigate = useNavigate();

  // বর্তমান মাস এবং বছর সেট করা
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
          PROJECT: doc.data().PROJECT,
          // ডিফল্ট ভ্যালু হিসেবে 'P' সেট করা
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
    const baseCols = [
      { field: "EMPID", headerName: "ID", width: 90, pinned: 'left', filter: true, editable: false },
      { field: "WORKER_NAME", headerName: "NAME", width: 150, pinned: 'left', filter: true, editable: false },
      { field: "PROJECT", headerName: "PROJECT", width: 120, filter: true, editable: false },
    ];

    const dayCols = Array.from({ length: daysInMonth }, (_, i) => ({
      field: (i + 1).toString(),
      headerName: (i + 1).toString(),
      width: 55, 
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
  }, [daysInMonth]);

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
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/admin')} style={styles.backBtn}><ChevronLeft size={20} /></button>
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
          <button onClick={saveAttendance} style={styles.saveBtn}><Save size={18} /> SAVE SHEET</button>
        </div>
      </header>

      <div style={styles.gridSection}>
        <div className="ag-theme-quartz-dark" style={{ height: '75vh', width: '100%' }}>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  title: { fontSize: '22px', fontWeight: '900', margin: 0 },
  backBtn: { background: '#0a0a0a', border: '1px solid #111', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  headerRight: { display: 'flex', gap: '15px' },
  monthSelector: { backgroundColor: '#0a0a0a', padding: '5px 15px', borderRadius: '8px', border: '1px solid #111', display: 'flex', gap: '10px' },
  select: { background: 'none', border: 'none', color: '#fff', outline: 'none', cursor: 'pointer', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  gridSection: { borderRadius: '12px', overflow: 'hidden' },
  legend: { marginTop: '15px', display: 'flex', gap: '20px', fontSize: '13px', color: '#777' }
};

export default AttendanceSheet;