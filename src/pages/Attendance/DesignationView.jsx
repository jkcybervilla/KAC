import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';
import { getBatchId, countPresent, getDaysInMonth } from '../../utils/attendance';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const DesignationView = () => {
  const [rows, setRows] = useState([]);

  const now = new Date();
  const batchId = getBatchId(now.getMonth() + 1, now.getFullYear());
  const days = getDaysInMonth(now.getMonth() + 1, now.getFullYear());

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'attendance_client'));
      const list = snap.docs.map((d) => d.data()).filter((r) => r.batchId === batchId);
      const map = {};
      list.forEach((r) => {
        const d = r.DESIGNATION || 'OTHER';
        if (!map[d]) map[d] = { DESIGNATION: d, WORKERS: 0, PRESENT_DAYS: 0, ABSENT: 0 };
        map[d].WORKERS += 1;
        const p = countPresent(r.days || {}, days);
        map[d].PRESENT_DAYS += p;
        map[d].ABSENT += days - p;
      });
      setRows(Object.values(map));
    })();
  }, [batchId, days]);

  const columnDefs = useMemo(
    () => [
      { field: 'DESIGNATION', headerName: 'DESIGNATION', flex: 1 },
      { field: 'WORKERS', headerName: 'WORKERS', width: 120 },
      { field: 'PRESENT_DAYS', headerName: 'PRESENT DAYS', width: 140 },
      { field: 'ABSENT', headerName: 'ABSENT DAYS', width: 130 },
    ],
    []
  );

  return (
    <div>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <ExportToolbar rows={rows} columnDefs={columnDefs} title="Designation Summary" filename="designation-summary" />
      </div>
      <div style={s.gridSection}>
        <div className="ag-theme-quartz-dark" style={{ height: '50vh', width: '100%' }}>
          <AgGridReact rowData={rows} columnDefs={columnDefs} defaultColDef={{ filter: true, sortable: true }} />
        </div>
      </div>
    </div>
  );
};

export default DesignationView;
