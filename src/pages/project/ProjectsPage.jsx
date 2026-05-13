import React, { useState, useEffect, useMemo } from 'react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { db } from '../../config/firebase'; 
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';

// AG Grid মডিউল রেজিস্টার করা
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    SL: '',
    PROJECT_NAME: '',
    TYPE: 'SS',
    REGION: '',
    ACCOUNTANT: '',
    CO_ORDINATOR: '',
    REQ_MANPOWER: '',
    DPR_STATUS: 'PENDING',
    KAC_ACTIVE: 0,
    GAP: '0'
  });

  const fetchProjects = async () => {
    try {
      const q = query(collection(db, "projects"), orderBy("SL", "asc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // কলাম অটো-ফিট করার ফাংশন
  const onGridReady = (params) => {
    params.api.sizeColumnsToFit();
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const reqMan = parseInt(formData.REQ_MANPOWER) || 0;
      await addDoc(collection(db, "projects"), {
        ...formData,
        SL: parseInt(formData.SL),
        GAP: reqMan.toString(),
        timestamp: new Date()
      });
      alert("New Project Registered Successfully!");
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const columnDefs = [
    { field: "SL", headerName: "SL", width: 70, sortable: true },
    { field: "PROJECT_NAME", headerName: "PROJECT / LINE NAME", minWidth: 200, flex: 2 },
    { field: "TYPE", headerName: "TYPE", width: 100 },
    { field: "REGION", headerName: "REGION", width: 120 },
    { field: "KAC_ACTIVE", headerName: "ACTIVE", width: 100, cellStyle: { color: '#22c55e', fontWeight: 'bold' } },
    { 
      field: "DPR_STATUS", 
      headerName: "STATUS",
      width: 130,
      cellRenderer: (params) => (
        <div style={{ 
          backgroundColor: params.value === 'SUBMITTED' ? '#166534' : '#7f1d1d',
          color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold'
        }}>
          {params.value || 'PENDING'}
        </div>
      )
    },
    {
      headerName: "ACTION",
      width: 110,
      pinned: 'right',
      cellRenderer: (params) => (
        <button onClick={() => navigate(`/project/${params.data.id}`)} style={styles.viewBtn}>
          DETAILS
        </button>
      )
    }
  ];

  const defaultColDef = useMemo(() => ({
    resizable: true,
    filter: true,
    sortable: true,
    flex: 1
  }), []);

  if (loading) return <div style={styles.loading}>Accessing Project Database...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/admin')} style={styles.backBtn}><ArrowLeft size={18} /></button>
          <h2 style={styles.title}>PROJECT <span style={{color: '#0055ff'}}>INVENTORY</span></h2>
        </div>
        
        <div style={styles.headerRight}>
          <div style={styles.searchContainer}>
            <Search size={16} color="#444" />
            <input 
              type="text" 
              placeholder="Filter sites..." 
              style={styles.searchInput}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button onClick={() => setShowModal(true)} style={styles.addBtn}>
            <Plus size={18}/> NEW SITE
          </button>
        </div>
      </header>

      <div style={styles.gridSection}>
  {/* এখানে ag-theme-alpine-dark ক্লাসটি নিশ্চিত করুন */}
  <div className="ag-theme-quartz-dark" style={{ height: '78vh', width: '100%' }}>
    <AgGridReact
      rowData={projects}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      quickFilterText={searchText}
      onGridReady={params => params.api.sizeColumnsToFit()}
      pagination={false}
      animateRows={true}
    />
  </div>
</div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{margin:0}}>REGISTER NEW PROJECT</h3>
              <X size={20} style={{cursor:'pointer', color:'#555'}} onClick={() => setShowModal(false)} />
            </div>
            
            <form onSubmit={handleAddProject} style={styles.form}>
                <div style={{...styles.inputField, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Project Name</label>
                  <input type="text" required placeholder="Enter site name" style={styles.formInput} 
                    onChange={e => setFormData({...formData, PROJECT_NAME: e.target.value})} />
                </div> 

                <div style={styles.inputGrid}>
                    <div style={styles.inputField}>
                    <label style={styles.label}>Type</label>
                    <select style={styles.formInput} onChange={e => setFormData({...formData, TYPE: e.target.value})}>
                        <option value="SS">Substation (SS)</option>
                        <option value="TL">Transmission Line (TL)</option>
                    </select>
                    </div>

                    <div style={styles.inputField}>
                    <label style={styles.label}>Serial No (SL)</label>
                    <input type="number" required placeholder="e.g. 58" style={styles.formInput} 
                        onChange={e => setFormData({...formData, SL: e.target.value})} />
                    </div>
                    
                    <div style={styles.inputField}>
                    <label style={styles.label}>Region</label>
                    <input type="text" required placeholder="e.g. NR-1" style={styles.formInput} 
                        onChange={e => setFormData({...formData, REGION: e.target.value})} />
                    </div>

                    <div style={styles.inputField}>
                    <label style={styles.label}>Manpower Req.</label>
                    <input type="number" required placeholder="Required" style={styles.formInput} 
                        onChange={e => setFormData({...formData, REQ_MANPOWER: e.target.value})} />
                    </div>

                    <div style={{...styles.inputField, gridColumn: 'span 2'}}>
                    <label style={styles.label}>Accountant Name</label>
                    <input type="text" required placeholder="Accountant" style={styles.formInput} 
                        onChange={e => setFormData({...formData, ACCOUNTANT: e.target.value})} />
                    </div>

                    <div style={{...styles.inputField, gridColumn: 'span 2'}}>
                    <label style={styles.label}>Coordinator Name</label>
                    <input type="text" required placeholder="Coordinator" style={styles.formInput} 
                        onChange={e => setFormData({...formData, CO_ORDINATOR: e.target.value})} />
                    </div>
                </div>
              <button type="submit" style={styles.submitBtn}>REGISTER PROJECT</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '30px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff' },
  loading: { color: '#444', textAlign: 'center', marginTop: '20%', letterSpacing: '2px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  title: { fontSize: '20px', fontWeight: '900', margin: 0 },
  backBtn: { background: '#0a0a0a', border: '1px solid #111', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' },
  headerRight: { display: 'flex', gap: '15px' },
  searchContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#0a0a0a', padding: '8px 15px', borderRadius: '8px', border: '1px solid #111' },
  searchInput: { background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '13px', width: '200px' },
  addBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  gridSection: { borderRadius: '12px', overflow: 'hidden' },
  viewBtn: { backgroundColor: '#0a0a0a', border: '1px solid #222', color: '#0055ff', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalContent: { backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', width: '500px', border: '1px solid #1a1a1a', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #111', paddingBottom: '15px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  inputField: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '11px', color: '#555', fontWeight: 'bold', letterSpacing: '0.5px' },
  formInput: { backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' },
  submitBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};

export default ProjectsPage;