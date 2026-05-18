import React, { useState, useEffect, useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AgGridReact } from 'ag-grid-react';
import { Search } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';
import ExportToolbar from '../../components/ExportToolbar';

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

const RegisteredWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'workers'), orderBy('SLNO', 'asc')));
        setWorkers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columnDefs = useMemo(
    () => [
      { field: 'SLNO', headerName: 'SL NO', width: 80, pinned: 'left' },
      { field: 'EMPID', headerName: 'EMP ID', width: 100, pinned: 'left' },
      { field: 'REFFERENCE', headerName: 'REFERENCE', width: 120 },
      { field: 'WORKER_NAME', headerName: 'NAME', minWidth: 160, flex: 1 },
      { field: 'FATHER_NAME', headerName: 'FATHER NAME', width: 140 },
      { field: 'DESIGNATION', headerName: 'DESIGNATION', width: 120 },
      { field: 'DOB', headerName: 'DOB', width: 110 },
      { field: 'MOBILE_NO', headerName: 'PH NUMBER', width: 120 },
      { field: 'AADHAR_NO', headerName: 'AADHAAR NO', width: 140 },
      { field: 'JOINING_DATE_CLIENT', headerName: 'JOINING (CLIENT)', width: 130 },
      { field: 'JOINING_DATE_OFFICE', headerName: 'JOINING (OFFICE)', width: 130 },
      {
        headerName: 'MORE',
        children: [
          { field: 'ADDRESS', headerName: 'ADDRESS', width: 180, hide: true },
          { field: 'PAN_NO', headerName: 'PAN NUMBER', width: 120, hide: true },
          { field: 'PAN_PHOTO', headerName: 'PAN PHOTO', width: 110, hide: true },
          { field: 'BANK', headerName: 'BANK', width: 100, hide: true },
          { field: 'ACCOUNT_NO', headerName: 'ACCOUNT NO', width: 120, hide: true },
          { field: 'IFSC', headerName: 'IFSC', width: 100, hide: true },
          { field: 'BANK_PHOTO', headerName: 'BANK PHOTO', width: 110, hide: true },
          { field: 'UAN_NO', headerName: 'UAN NO', width: 100, hide: true },
          { field: 'ESIC_NO', headerName: 'ESIC NO', width: 100, hide: true },
          { field: 'PROJECT', headerName: 'PROJECT', width: 140, hide: true },
        ],
      },
    ],
    []
  );

  if (loading) return <div style={{ color: '#666', padding: 20 }}>Loading register...</div>;

  return (
    <div>
      <div style={{ ...s.headerRight, marginBottom: 16 }}>
        <div style={s.searchBox}>
          <Search size={16} color="#444" />
          <input type="text" placeholder="Filter workers..." style={s.searchInput} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <ExportToolbar rows={workers} columnDefs={columnDefs} title="Worker Register" filename="worker-register" />
      </div>
      <div style={s.gridSection}>
        <div style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            rowData={workers}
            columnDefs={columnDefs}
            defaultColDef={{ resizable: true, filter: true, sortable: true }}
            quickFilterText={searchText}
            animateRows
            theme={darkQuartzTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default RegisteredWorkers;