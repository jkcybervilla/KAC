import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, addDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { Send, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBatchId } from '../../utils/attendance';

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

const WORK_TYPES = ['EXCAVATION', 'CONCRETING', 'REINFORCEMENT', 'FORMWORK', 'BRICKWORK', 'PLASTERING', 'PAINTING', 'FLOORING', 'WATERPROOFING', 'ELECTRICAL', 'PLUMBING', 'OTHER'];

/* ──────────────── ACTIVITY FORM ──────────────── */
const ActivityForm = ({ project, onClose, onSaved }) => {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gangLeaders, setGangLeaders] = useState([]);
  const [manpowerList, setManpowerList] = useState([]);
  const [gangLeader, setGangLeader] = useState('');
  const [workType, setWorkType] = useState('');
  const [details, setDetails] = useState('');
  const [selectedManpower, setSelectedManpower] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load gang leaders (from office attendance) and manpower (from client+office attendance) for selected date
  useEffect(() => {
    if (!date || !project) return;
    (async () => {
      const dateObj = new Date(date);
      const batchId = getBatchId(dateObj.getMonth() + 1, dateObj.getFullYear());
      const day = dateObj.getDate();
      const pname = project.PROJECT_NAME;

      const [wSnap, oSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'attendance_office')),
        getDocs(collection(db, 'attendance_client')),
      ]);

      // All active workers for this project
      const workers = wSnap.docs
        .map((d) => d.data())
        .filter((w) => w.PROJECT === pname && (w.STATUS || 'ACTIVE') === 'ACTIVE');

      // Office attendance map
      const officeMap = {};
      oSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) officeMap[data.EMPID] = data.days?.[String(day)] === 'P';
      });

      // Client attendance map
      const clientMap = {};
      cSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) clientMap[data.EMPID] = data.days?.[String(day)] === 'P';
      });

      // Gang leaders = workers present in office
      const gl = workers.filter((w) => officeMap[w.EMPID]).map((w) => ({ EMPID: w.EMPID, NAME: w.WORKER_NAME }));
      setGangLeaders(gl);

      // Manpower = workers present in either office or client
      const mp = workers.filter((w) => officeMap[w.EMPID] || clientMap[w.EMPID]).map((w) => ({ EMPID: w.EMPID, NAME: w.WORKER_NAME }));
      setManpowerList(mp);
    })();
  }, [date, project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gangLeader || !workType) {
      alert('Please select Gang Leader and Work Type.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'accountant_activities'), {
        PROJECT_NAME: project.PROJECT_NAME,
        LINE_NAME: project.LINE_NAME || '',
        DISTRICT: project.DISTRICT || '',
        WORKING_DATE: date,
        GANG_LEADER: gangLeader,
        WORKING_TYPE: workType,
        MANPOWER: selectedManpower,
        DETAILS: details,
        CREATED_BY: profile?.uid || '',
        CREATED_BY_NAME: profile?.name || 'Accountant',
        timestamp: new Date(),
      });
      alert('Activity submitted successfully!');
      onSaved();
      onClose();
    } catch (err) {
      alert('Error saving activity: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleManpower = (empId) => {
    setSelectedManpower((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#0a0a0a', padding: 30, borderRadius: 15, width: 700, border: '1px solid #1a1a1a', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #1a1a1a', paddingBottom: 15 }}>
          <h3 style={{ margin: 0, color: '#fff' }}>SEND ACTIVITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>WORKING DATE *</label>
              <input type="date" required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={date} onChange={(e) => { setDate(e.target.value); setGangLeader(''); setSelectedManpower([]); }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>GANG LEADER *</label>
              <select required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={gangLeader} onChange={(e) => setGangLeader(e.target.value)}>
                <option value="">-- SELECT --</option>
                {gangLeaders.map((gl) => <option key={gl.EMPID} value={gl.NAME}>{gl.NAME}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>LINE NAME</label>
              <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: 8, color: '#888', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', fontStyle: 'italic' }} value={project?.LINE_NAME || ''} readOnly />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>DISTRICT</label>
              <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: 8, color: '#888', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', fontStyle: 'italic' }} value={project?.DISTRICT || ''} readOnly />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>WORKING TYPE *</label>
              <input type="text" required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Enter work type" value={workType} onChange={(e) => setWorkType(e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* MANPOWER MULTI-SELECT */}
          <div>
            <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              MANPOWER ({selectedManpower.length} selected — Present on {date})
            </label>
            <div style={{ maxHeight: 150, overflowY: 'auto', backgroundColor: '#000', border: '1px solid #1a1a1a', borderRadius: 8, padding: 4 }}>
              {manpowerList.length === 0 && <p style={{ color: '#666', fontSize: 12, padding: 8, margin: 0 }}>No workers present on this date.</p>}
              {manpowerList.map((w) => (
                <label key={w.EMPID} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 4, background: selectedManpower.includes(w.EMPID) ? 'rgba(0,85,255,0.15)' : 'transparent' }}>
                  <input type="checkbox" checked={selectedManpower.includes(w.EMPID)} onChange={() => toggleManpower(w.EMPID)} style={{ accentColor: '#0055ff' }} />
                  <span style={{ color: '#ccc', fontSize: 12 }}>{w.NAME}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>DETAILS</label>
            <textarea style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 80, resize: 'vertical' }} placeholder="Enter activity details..." value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>

          <button type="submit" disabled={saving} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: 15, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'SUBMITTING...' : 'SUBMIT ACTIVITY'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ──────────────── ACTIVITY TAB ──────────────── */
const ActivityTab = ({ project, profile }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'accountant_activities'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Filter by current user's UID
      setActivities(all.filter((a) => a.CREATED_BY === profile?.uid));
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadActivities(); }, [profile]);

  const columnDefs = useMemo(() => [
    { headerName: "SL", width: 60, pinned: 'left', valueGetter: (p) => (p.node ? p.node.rowIndex + 1 : '') },
    { field: "WORKING_DATE", headerName: "DATE", width: 110, cellRenderer: (p) => p.value ? new Date(p.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { field: "GANG_LEADER", headerName: "GANG LEADER", width: 150 },
    { field: "LINE_NAME", headerName: "LINE NAME", width: 130 },
    { field: "DISTRICT", headerName: "DISTRICT", width: 120 },
    { field: "WORKING_TYPE", headerName: "WORK TYPE", width: 110 },
    { field: "MANPOWER", headerName: "MANPOWER", width: 200, cellRenderer: (p) => Array.isArray(p.value) ? p.value.join(', ') : p.value || '' },
    { field: "DETAILS", headerName: "DETAILS", width: 250, wrapText: true, autoHeight: true },
    { field: "CREATED_BY_NAME", headerName: "SENT BY", width: 130 },
  ], []);

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 60 }}>Loading Activities...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <button type="button" onClick={() => setShowForm(true)} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={16} /> SEND ACTIVITY
        </button>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ height: '60vh', width: '100%' }}>
          <AgGridReact
            rowData={activities}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            animateRows={true}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showForm && <ActivityForm project={project} onClose={() => setShowForm(false)} onSaved={loadActivities} />}
    </div>
  );
};

/* ──────────────── JMC TAB ──────────────── */
const JmcTab = ({ project, profile }) => {
  const [jmcs, setJmcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    DATE: new Date().toISOString().slice(0, 10),
    WORK_TYPE: '',
    MEASUREMENT_DESC: '',
    QUANTITY: '',
    UNIT: 'Nos.',
    LOCATION: '',
    AGENCY_CONTRACTOR: '',
    REMARKS: '',
  });
  const [saving, setSaving] = useState(false);

  const loadJmcs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'accountant_jmc'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJmcs(all.filter((j) => j.CREATED_BY === profile?.uid));
    } catch (err) {
      console.error('Error loading JMC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJmcs(); }, [profile]);

  const handleSaveJmc = async (e) => {
    e.preventDefault();
    if (!formData.WORK_TYPE) {
      alert('Please select Work Type.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'accountant_jmc'), {
        PROJECT_NAME: project?.PROJECT_NAME || '',
        ...formData,
        QUANTITY: Number(formData.QUANTITY) || 0,
        CREATED_BY: profile?.uid || '',
        CREATED_BY_NAME: profile?.name || 'Accountant',
        timestamp: new Date(),
      });
      alert('JMC submitted successfully!');
      setShowForm(false);
      setFormData({ DATE: new Date().toISOString().slice(0, 10), WORK_TYPE: '', MEASUREMENT_DESC: '', QUANTITY: '', UNIT: 'Nos.', LOCATION: '', AGENCY_CONTRACTOR: '', REMARKS: '' });
      loadJmcs();
    } catch (err) {
      alert('Error saving JMC: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const columnDefs = useMemo(() => [
    { headerName: "SL", width: 60, pinned: 'left', valueGetter: (p) => (p.node ? p.node.rowIndex + 1 : '') },
    { field: "WORK_TYPE", headerName: "WORK TYPE", width: 90 },
    { field: "DATE", headerName: "DATE", width: 110, cellRenderer: (p) => p.value ? new Date(p.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' },
    { field: "MEASUREMENT_DESC", headerName: "MEASUREMENT DESCRIPTION", width: 260, wrapText: true, autoHeight: true },
    { field: "QUANTITY", headerName: "QUANTITY", width: 100 },
    { field: "UNIT", headerName: "UNIT", width: 100 },
    { field: "LOCATION", headerName: "LOCATION", width: 160 },
    { field: "AGENCY_CONTRACTOR", headerName: "AGENCY / CONTRACTOR", width: 180 },
    { field: "REMARKS", headerName: "REMARKS", width: 200 },
    { field: "CREATED_BY_NAME", headerName: "SENT BY", width: 130 },
  ], []);

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 60 }}>Loading JMC...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <button type="button" onClick={() => setShowForm(true)} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={16} /> SEND JMC
        </button>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ height: '60vh', width: '100%' }}>
          <AgGridReact
            rowData={jmcs}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            animateRows={true}
            theme={darkQuartzTheme}
          />
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#0a0a0a', padding: 30, borderRadius: 15, width: 700, border: '1px solid #1a1a1a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #1a1a1a', paddingBottom: 15 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>SEND JMC</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#555' }} onClick={() => setShowForm(false)} />
            </div>
            <form onSubmit={handleSaveJmc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>WORK TYPE *</label>
                  <select required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.WORK_TYPE} onChange={(e) => setFormData({ ...formData, WORK_TYPE: e.target.value })}>
                    <option value="">-- SELECT --</option>
                    {WORK_TYPES.map((wt) => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>DATE *</label>
                  <input type="date" required style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.DATE} onChange={(e) => setFormData({ ...formData, DATE: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>UNIT</label>
                  <select style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} value={formData.UNIT} onChange={(e) => setFormData({ ...formData, UNIT: e.target.value })}>
                    {['Nos.', 'Mtr.', 'Sq.Mtr.', 'Cu.Mtr.', 'Kg.', 'Ltr.', 'Days', 'Lumpsum'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>QUANTITY</label>
                  <input type="number" step="0.01" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="0.00" value={formData.QUANTITY} onChange={(e) => setFormData({ ...formData, QUANTITY: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>MEASUREMENT DESCRIPTION</label>
                  <textarea style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 70, resize: 'vertical' }} placeholder="Describe the measurement" value={formData.MEASUREMENT_DESC} onChange={(e) => setFormData({ ...formData, MEASUREMENT_DESC: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>LOCATION</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Location" value={formData.LOCATION} onChange={(e) => setFormData({ ...formData, LOCATION: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>AGENCY / CONTRACTOR</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Agency name" value={formData.AGENCY_CONTRACTOR} onChange={(e) => setFormData({ ...formData, AGENCY_CONTRACTOR: e.target.value.toUpperCase() })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 10, color: '#888', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>REMARKS</label>
                  <input type="text" style={{ width: '100%', backgroundColor: '#000', border: '1px solid #1a1a1a', padding: 12, borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Remarks" value={formData.REMARKS} onChange={(e) => setFormData({ ...formData, REMARKS: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: 15, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SUBMITTING...' : 'SUBMIT JMC'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ──────────────── TABS CONTAINER ──────────────── */
const AccountantWorkActivity = ({ projectName }) => {
  const { profile } = useAuth();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('activity');

  useEffect(() => {
    if (!projectName) return;
    (async () => {
      const snap = await getDocs(collection(db, 'projects'));
      const found = snap.docs.map((d) => ({ id: d.id, ...d.data() })).find((p) => p.PROJECT_NAME === projectName);
      setProject(found || null);
    })();
  }, [projectName]);

  const tabBtn = (isActive) => ({
    padding: '12px 24px',
    borderRadius: '10px',
    border: isActive ? '2px solid #0055ff' : '2px solid transparent',
    background: isActive ? 'rgba(0,85,255,0.12)' : 'var(--surface)',
    color: isActive ? '#fff' : 'var(--muted)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button type="button" style={tabBtn(tab === 'activity')} onClick={() => setTab('activity')}>ACTIVITY</button>
        <button type="button" style={tabBtn(tab === 'jmc')} onClick={() => setTab('jmc')}>JMC</button>
      </div>

      {tab === 'activity' && <ActivityTab project={project} profile={profile} />}
      {tab === 'jmc' && <JmcTab project={project} profile={profile} />}
    </div>
  );
};

export default AccountantWorkActivity;