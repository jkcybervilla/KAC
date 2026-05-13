import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const AccountantDashboard = () => {
  const navigate = useNavigate();

  // এক্সপেন্স ডাটা (এটি পরবর্তীতে ফায়ারবেস থেকে আসবে)
  const [rowData] = useState([
    { date: '2026-05-12', description: 'Office Rent', amount: 15000, status: 'Paid' },
    { date: '2026-05-13', description: 'Labor Transport', amount: 4500, status: 'Pending' },
  ]);

  const [columnDefs] = useState([
    { field: 'date', headerName: 'Date', filter: true },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'amount', headerName: 'Amount', sortable: true },
    { 
      field: 'status', 
      cellStyle: params => params.value === 'Paid' ? {color: '#22c55e'} : {color: '#ef4444'} 
    }
  ]);

  const defaultColDef = useMemo(() => ({ resizable: true }), []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>Accountant <span style={{color: '#0055ff'}}>Panel</span></h2>
        <button onClick={() => navigate('/')} style={styles.logoutBtn}>Logout</button>
      </header>

      <div style={styles.content}>
        <div style={styles.card}>
          <h3>Expense Management</h3>
          <div className="ag-theme-alpine-dark" style={{ height: '400px', width: '100%' }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#050505', minHeight: '100vh', color: '#fff', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #111', paddingBottom: '15px' },
  logoutBtn: { backgroundColor: '#ef4444', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
  content: { marginTop: '30px' },
  card: { backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #111' }
};

export default AccountantDashboard;