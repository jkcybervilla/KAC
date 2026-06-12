import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { registerModal } from '../../hooks/useBackNavigation';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { getBatchId } from '../../utils/attendance';

const WORK_TYPES = ['EXCAVATION', 'CONCRETING', 'REINFORCEMENT', 'FORMWORK', 'BRICKWORK', 'PLASTERING', 'PAINTING', 'FLOORING', 'WATERPROOFING', 'ELECTRICAL', 'PLUMBING', 'OTHER'];

/* ──────────────── ACTIVITY FORM ──────────────── */
const ActivityForm = ({ project, onClose, onSaved }) => {
  const { profile } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [closeDate, setCloseDate] = useState('');
  const [mistriList, setMistriList] = useState([]);
  const [manpowerList, setManpowerList] = useState([]);
  const [mistri, setMistri] = useState('');
  const [workType, setWorkType] = useState('');
  const [pkg, setPkg] = useState('');
  const [locNo, setLocNo] = useState('');
  const [towerType, setTowerType] = useState('');
  const [details, setDetails] = useState('');
  const [qty, setQty] = useState('');
  const [selectedManpower, setSelectedManpower] = useState([]);
  const [saving, setSaving] = useState(false);

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

      const workers = wSnap.docs
        .map((d) => d.data())
        .filter((w) => w.PROJECT === pname && (w.STATUS || 'ACTIVE') === 'ACTIVE');

      const officeMap = {};
      oSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) officeMap[data.EMPID] = data.days?.[String(day)] === 'P';
      });

      const clientMap = {};
      cSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId) clientMap[data.EMPID] = data.days?.[String(day)] === 'P';
      });

      setMistriList(workers.filter((w) => officeMap[w.EMPID]).map((w) => ({ EMPID: w.EMPID, NAME: w.WORKER_NAME })));
      setManpowerList(workers.filter((w) => officeMap[w.EMPID] || clientMap[w.EMPID]).map((w) => ({ EMPID: w.EMPID, NAME: w.WORKER_NAME })));
    })();
  }, [date, project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mistri || !workType) {
      alert('Please select Mistri and Work Type.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'accountant_activities'), {
        PROJECT_NAME: project.PROJECT_NAME,
        LINE_NAME: project.LINE_NAME || '',
        PKG: pkg || project.PO_NUMBER || '',
        START_DATE: startDate,
        CLOSE_DATE: closeDate,
        DISTRICT: project.DISTRICT || '',
        LOC_NO: locNo,
        TOWER_TYPE: towerType,
        WORKING_DATE: date,
        MISTRI: mistri,
        WORKING_TYPE: workType,
        WORK_DETAILS: details,
        QTY: Number(qty) || 0,
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

  const inputStyle = { width: '100%', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px', borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: 'var(--muted)', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: 'var(--surface)', padding: 30, borderRadius: 15, width: 700, maxWidth: '95vw', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
          <h3 style={{ margin: 0, color: 'var(--text)' }}>SEND ACTIVITY</h3>
          <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={onClose} />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>WORKING DATE *</label>
              <input type="date" required style={inputStyle} value={date} onChange={(e) => { setDate(e.target.value); setMistri(''); setSelectedManpower([]); }} />
            </div>
            <div>
              <label style={labelStyle}>LINE NAME</label>
              <input type="text" style={{ ...inputStyle, color: 'var(--muted)', fontStyle: 'italic' }} value={project?.LINE_NAME || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>PKG</label>
              <input type="text" style={inputStyle} placeholder="Package number" value={pkg} onChange={(e) => setPkg(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>START DATE</label>
              <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>CLOSE DATE</label>
              <input type="date" style={inputStyle} value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>DISTRICT</label>
              <input type="text" style={{ ...inputStyle, color: 'var(--muted)', fontStyle: 'italic' }} value={project?.DISTRICT || ''} readOnly />
            </div>
            <div>
              <label style={labelStyle}>LOC NO</label>
              <input type="text" style={inputStyle} placeholder="Location number" value={locNo} onChange={(e) => setLocNo(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>TOWER TYPE</label>
              <input type="text" style={inputStyle} placeholder="Tower type" value={towerType} onChange={(e) => setTowerType(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>WORK TYPE *</label>
              <input type="text" required style={inputStyle} placeholder="Enter work type" value={workType} onChange={(e) => setWorkType(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={labelStyle}>QTY</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0.00" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>MISTRI (from attendance) *</label>
            <select required style={inputStyle} value={mistri} onChange={(e) => setMistri(e.target.value)}>
              <option value="">-- SELECT --</option>
              {mistriList.map((m) => <option key={m.EMPID} value={m.NAME}>{m.NAME}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>MANPOWER ({selectedManpower.length} selected — Present on {date})</label>
            <div style={{ maxHeight: 150, overflowY: 'auto', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
              {manpowerList.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 12, padding: 8, margin: 0 }}>No workers present on this date.</p>}
              {manpowerList.map((w) => (
                <label key={w.EMPID} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 4, background: selectedManpower.includes(w.EMPID) ? 'rgba(0,85,255,0.15)' : 'transparent' }}>
                  <input type="checkbox" checked={selectedManpower.includes(w.EMPID)} onChange={() => toggleManpower(w.EMPID)} style={{ accentColor: '#0055ff' }} />
                  <span style={{ color: 'var(--text)', fontSize: 12 }}>{w.NAME}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>WORK DETAILS</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Enter work details..." value={details} onChange={(e) => setDetails(e.target.value)} />
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
const ActivityTab = ({ project, profile, autoOpenForm, onAutoOpened }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const showFormRef = useRef(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => { showFormRef.current = showForm; }, [showForm]);
  useEffect(() => {
    return registerModal(showFormRef, () => setShowForm(false));
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'accountant_activities'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setActivities(all.filter((a) => a.CREATED_BY === profile?.uid));
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-open form when triggered from dashboard shortcut
  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
      if (onAutoOpened) onAutoOpened();
    }
  }, [autoOpenForm, onAutoOpened]);

  useEffect(() => { loadActivities(); }, [profile]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 60 }}>Loading Activities...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setShowForm(true)} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={16} /> SEND ACTIVITY
        </button>
      </div>

      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>SL</div>
        <div style={{ flex: 1, paddingLeft: 6 }}>Date</div>
        <div style={{ flex: 2, paddingLeft: 6 }}>Details</div>
        <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}></div>
      </div>

      {activities.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No activities found</div>
      )}

      {activities.map((a, idx) => {
        const isOpen = expanded[a.id];
        const dateStr = a.WORKING_DATE ? new Date(a.WORKING_DATE).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        return (
          <div key={a.id}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => toggleExpand(a.id)}>
              <div style={{ width: 32, textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{idx + 1}</div>
              <div style={{ flex: 1, paddingLeft: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{dateStr}</div>
              </div>
              <div style={{ flex: 2, paddingLeft: 6, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[a.LINE_NAME, a.WORKING_TYPE, a.MISTRI].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ width: 40, textAlign: 'center', flexShrink: 0, color: 'var(--muted)' }}>
                {isOpen ? <EyeOff size={14} /> : <Eye size={14} />}
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '10px 12px 10px 50px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                <div><strong>PKG:</strong> {a.PKG || '—'}</div>
                <div><strong>Line:</strong> {a.LINE_NAME || '—'}</div>
                <div><strong>Start:</strong> {a.START_DATE || '—'} {a.CLOSE_DATE ? `| Close: ${a.CLOSE_DATE}` : ''}</div>
                <div><strong>Location:</strong> {[a.DISTRICT, a.LOC_NO, a.TOWER_TYPE].filter(Boolean).join(' · ') || '—'}</div>
                <div><strong>Work type:</strong> {a.WORKING_TYPE || '—'}</div>
                <div><strong>Qty:</strong> {a.QTY || '—'}</div>
                <div><strong>Mistri:</strong> {a.MISTRI || '—'}</div>
                <div><strong>Manpower:</strong> {Array.isArray(a.MANPOWER) ? a.MANPOWER.join(', ') : a.MANPOWER || '—'}</div>
                {a.WORK_DETAILS && <div><strong>Details:</strong> {a.WORK_DETAILS}</div>}
              </div>
            )}
          </div>
        );
      })}

      {showForm && <ActivityForm project={project} onClose={() => setShowForm(false)} onSaved={loadActivities} />}
    </div>
  );
};

/* ──────────────── JMC TAB ──────────────── */
const JmcTab = ({ project, profile }) => {
  const [jmcs, setJmcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState({});
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

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getMonthYear = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const inputStyle = { width: '100%', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', padding: '12px', borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: 'var(--muted)', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 };

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', marginTop: 60 }}>Loading JMC...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setShowForm(true)} style={{ backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={16} /> SEND JMC
        </button>
      </div>

      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>SL</div>
        <div style={{ flex: 1, paddingLeft: 6 }}>Month-Year</div>
        <div style={{ flex: 2, paddingLeft: 6 }}>Details</div>
        <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}></div>
      </div>

      {jmcs.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No JMC records found</div>
      )}

      {jmcs.map((j, idx) => {
        const isOpen = expanded[j.id];
        const my = getMonthYear(j.DATE);
        return (
          <div key={j.id}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => toggleExpand(j.id)}>
              <div style={{ width: 32, textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{idx + 1}</div>
              <div style={{ flex: 1, paddingLeft: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{my}</div>
              </div>
              <div style={{ flex: 2, paddingLeft: 6, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(j.WORK_TYPE || '') + (j.MEASUREMENT_DESC ? ` — ${j.MEASUREMENT_DESC}` : '')}
                </div>
              </div>
              <div style={{ width: 40, textAlign: 'center', flexShrink: 0, color: 'var(--muted)' }}>
                {isOpen ? <EyeOff size={14} /> : <Eye size={14} />}
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '10px 12px 10px 50px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.6 }}>
                <div><strong>Date:</strong> {j.DATE ? new Date(j.DATE).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                <div><strong>Work type:</strong> {j.WORK_TYPE || '—'}</div>
                <div><strong>Qty:</strong> {j.QUANTITY || '—'} {j.UNIT || ''}</div>
                <div><strong>Location:</strong> {j.LOCATION || '—'}</div>
                <div><strong>Agency/Contractor:</strong> {j.AGENCY_CONTRACTOR || '—'}</div>
                {j.MEASUREMENT_DESC && <div><strong>Measurement:</strong> {j.MEASUREMENT_DESC}</div>}
                {j.REMARKS && <div><strong>Remarks:</strong> {j.REMARKS}</div>}
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--overlay)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: 30, borderRadius: 15, width: 700, maxWidth: '95vw', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>SEND JMC</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setShowForm(false)} />
            </div>
            <form onSubmit={handleSaveJmc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>WORK TYPE *</label>
                  <select required style={inputStyle} value={formData.WORK_TYPE} onChange={(e) => setFormData({ ...formData, WORK_TYPE: e.target.value })}>
                    <option value="">-- SELECT --</option>
                    {WORK_TYPES.map((wt) => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>DATE *</label>
                  <input type="date" required style={inputStyle} value={formData.DATE} onChange={(e) => setFormData({ ...formData, DATE: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>UNIT</label>
                  <select style={inputStyle} value={formData.UNIT} onChange={(e) => setFormData({ ...formData, UNIT: e.target.value })}>
                    {['Nos.', 'Mtr.', 'Sq.Mtr.', 'Cu.Mtr.', 'Kg.', 'Ltr.', 'Days', 'Lumpsum'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>QUANTITY</label>
                  <input type="number" step="0.01" style={inputStyle} placeholder="0.00" value={formData.QUANTITY} onChange={(e) => setFormData({ ...formData, QUANTITY: e.target.value })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>MEASUREMENT DESCRIPTION</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="Describe the measurement" value={formData.MEASUREMENT_DESC} onChange={(e) => setFormData({ ...formData, MEASUREMENT_DESC: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>LOCATION</label>
                  <input type="text" style={inputStyle} placeholder="Location" value={formData.LOCATION} onChange={(e) => setFormData({ ...formData, LOCATION: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label style={labelStyle}>AGENCY / CONTRACTOR</label>
                  <input type="text" style={inputStyle} placeholder="Agency name" value={formData.AGENCY_CONTRACTOR} onChange={(e) => setFormData({ ...formData, AGENCY_CONTRACTOR: e.target.value.toUpperCase() })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>REMARKS</label>
                  <input type="text" style={inputStyle} placeholder="Remarks" value={formData.REMARKS} onChange={(e) => setFormData({ ...formData, REMARKS: e.target.value })} />
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
const AccountantWorkActivity = ({ projectName, autoOpenForm, onAutoOpened }) => {
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
    color: isActive ? '#0055ff' : 'var(--muted)',
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

      {tab === 'activity' && <ActivityTab project={project} profile={profile} autoOpenForm={autoOpenForm} onAutoOpened={onAutoOpened} />}
      {tab === 'jmc' && <JmcTab project={project} profile={profile} />}
    </div>
  );
};

export default AccountantWorkActivity;