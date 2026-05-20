import React, { useState, useEffect, useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ArrowLeft, UserPlus, Search, X } from 'lucide-react';

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

const WorkerRegister = () => {
  const [workers, setWorkers] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const [workerData, setWorkerData] = useState({
    SLNO: '',
    EMPID: '',
    REFFERENCE: '',
    WORKER_NAME: '',
    FATHER_NAME: '',
    DESIGNATION: 'LABOUR',
    AADHAR_NO: '',
    DOB: '',
    MOBILE_NO: '',
    AGE: '',
    PAN_NO: '',
    ADDRESS: '',
    PROJECT: '',
    JOINING_DATE: '',
    COMMENT: '',
    STATUS: 'ACTIVE'
  });

  const loadInitialData = async () => {
    try {
      const wSnap = await getDocs(query(collection(db, "workers"), orderBy("SLNO", "asc")));
      setWorkers(wSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const pSnap = await getDocs(collection(db, "projects"));
      setProjectsList(pSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().PROJECT_NAME || doc.data().name || "Unknown"
      })));
    } catch (err) {
      console.error("Data Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (workerData.AADHAR_NO.length === 12) {
      const exist = workers.find(w => String(w.AADHAR_NO) === String(workerData.AADHAR_NO));
      
      if (exist) {
        alert(`Worker already exists with ID: ${exist.EMPID}`);
        setWorkerData(prev => ({
          ...prev,
          EMPID: exist.EMPID,
          WORKER_NAME: exist.WORKER_NAME,
          FATHER_NAME: exist.FATHER_NAME,
          SLNO: exist.SLNO,
          MOBILE_NO: exist.MOBILE_NO || '',
          PROJECT: exist.PROJECT || '',
          ADDRESS: exist.ADDRESS || ''
        }));
      } else {
        const nextSL = workers.length > 0 ? Math.max(...workers.map(w => Number(w.SLNO) || 0)) + 1 : 1;
        setWorkerData(prev => ({
          ...prev,
          SLNO: nextSL,
          EMPID: `KAC${String(nextSL).padStart(4, '0')}`
        }));
      }
    }
  }, [workerData.AADHAR_NO, workers]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "workers"), {
        ...workerData,
        SLNO: Number(workerData.SLNO),
        timestamp: new Date()
      });
      alert("Registration Successful!");
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const columnDefs = useMemo(() => [
    { field: "SLNO", headerName: "SL", width: 70, pinned: 'left' },
    { field: "EMPID", headerName: "EMP ID", width: 100, pinned: 'left' },
    { field: "WORKER_NAME", headerName: "WORKER NAME", minWidth: 200, flex: 2 },
    { field: "FATHER_NAME", headerName: "FATHER NAME", width: 150 },
    { field: "DESIGNATION", headerName: "DESIGNATION", width: 130 },
    { field: "MOBILE_NO", headerName: "MOBILE", width: 130 },
    { field: "AADHAR_NO", headerName: "AADHAAR", width: 150 },
    { field: "PAN_NO", headerName: "PAN NO", width: 130 },
    { field: "PROJECT", headerName: "PROJECT", width: 150 },
    { field: "JOINING_DATE", headerName: "JOINING", width: 120 },
    { field: "REFFERENCE", headerName: "REFERENCE", width: 150 },
    { field: "ADDRESS", headerName: "ADDRESS", width: 200 },
    { field: "COMMENT", headerName: "COMMENT", width: 200 },
  ], []);

  if (loading) return <div style={styles.loading}>Accessing Master Register...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/admin')} style={styles.backBtn}><ArrowLeft size={18} /></button>
          <h2 style={styles.title}>WORKER <span style={{color: '#0055ff'}}>REGISTER</span></h2>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.searchBox}>
            <Search size={16} color="#444" />
            <input type="text" placeholder="Quick Search..." style={styles.searchInput} onChange={e => setSearchText(e.target.value)} />
          </div>
          <button onClick={() => setShowModal(true)} style={styles.addBtn}><UserPlus size={18}/> NEW ENTRY</button>
        </div>
      </header>

      <div style={styles.gridSection}>
        <div style={{ height: '78vh', width: '100%' }}>
          <AgGridReact 
            rowData={workers} 
            columnDefs={columnDefs} 
            defaultColDef={{sortable:true, filter:true, resizable:true}} 
            quickFilterText={searchText}
            animateRows={true}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{margin:0}}>WORKER REGISTRATION</h3>
              <X size={20} style={{cursor:'pointer'}} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={styles.form}>
              <div style={styles.inputGrid}>
                <div style={{gridColumn: 'span 2'}}>
                  <label style={styles.label}>AADHAAR NO (12 DIGIT)</label>
                  <input type="number" required style={styles.formInput} value={workerData.AADHAR_NO} 
                    onChange={e => setWorkerData({...workerData, AADHAR_NO: e.target.value})} />
                </div>

                <input type="text" placeholder="SL" readOnly value={workerData.SLNO} style={styles.readOnlyInput} />
                <input type="text" placeholder="EMP ID" readOnly value={workerData.EMPID} style={styles.readOnlyInput} />

                <input type="text" placeholder="WORKER NAME" required style={{gridColumn:'span 2', ...styles.formInput}} 
                  value={workerData.WORKER_NAME} onChange={e => setWorkerData({...workerData, WORKER_NAME: e.target.value.toUpperCase()})} />

                <input type="text" placeholder="FATHER NAME" style={styles.formInput} value={workerData.FATHER_NAME}
                  onChange={e => setWorkerData({...workerData, FATHER_NAME: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="REFERENCE" style={styles.formInput} onChange={e => setWorkerData({...workerData, REFFERENCE: e.target.value})} />

                <select style={styles.formInput} value={workerData.DESIGNATION} onChange={e => setWorkerData({...workerData, DESIGNATION: e.target.value})}>
                    <option value="LABOUR">LABOUR</option>
                    <option value="SKILLED">SKILLED</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                </select>
                <input type="number" placeholder="MOBILE NO" value={workerData.MOBILE_NO} style={styles.formInput} onChange={e => setWorkerData({...workerData, MOBILE_NO: e.target.value})} />

                <input type="text" placeholder="PAN NO" style={styles.formInput} onChange={e => setWorkerData({...workerData, PAN_NO: e.target.value.toUpperCase()})} />
                <input type="number" placeholder="AGE" style={styles.formInput} onChange={e => setWorkerData({...workerData, AGE: e.target.value})} />

                <input type="date" placeholder="DOB" style={styles.formInput} onChange={e => setWorkerData({...workerData, DOB: e.target.value})} />
                <input type="date" placeholder="JOINING DATE" style={styles.formInput} onChange={e => setWorkerData({...workerData, JOINING_DATE: e.target.value})} />

                <div style={{gridColumn: 'span 2'}}>
                  <label style={styles.label}>ASSIGN PROJECT</label>
                  <select required style={styles.formInput} value={workerData.PROJECT} onChange={e => setWorkerData({...workerData, PROJECT: e.target.value})}>
                    <option value="">-- SELECT PROJECT --</option>
                    {projectsList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>

                <input type="text" placeholder="ADDRESS" style={{gridColumn: 'span 2', ...styles.formInput}} onChange={e => setWorkerData({...workerData, ADDRESS: e.target.value})} />
                <input type="text" placeholder="COMMENT" style={{gridColumn: 'span 2', ...styles.formInput}} onChange={e => setWorkerData({...workerData, COMMENT: e.target.value})} />
              </div>
              <button type="submit" style={styles.submitBtn}>SAVE TO REGISTER</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '30px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff' },
  loading: { color: '#444', textAlign: 'center', marginTop: '20%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  headerRight: { display: 'flex', gap: '15px' },
  title: { fontSize: '20px', fontWeight: '900', margin: 0 },
  backBtn: { background: '#0a0a0a', border: '1px solid #111', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0a0a0a', padding: '8px 15px', borderRadius: '8px', border: '1px solid #111' },
  searchInput: { background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '13px', width: '200px' },
  addBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  gridSection: { borderRadius: '12px', overflow: 'hidden' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalContent: { backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', width: '600px', border: '1px solid #1a1a1a', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #111', paddingBottom: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  label: { fontSize: '10px', color: '#555', marginBottom: '3px', display: 'block' },
  formInput: { width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none' },
  readOnlyInput: { width: '100%', backgroundColor: '#111', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#666', fontSize: '12px' },
  submitBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }
};

export default WorkerRegister;
