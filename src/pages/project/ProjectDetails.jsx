import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase'; // পাথটি আপনার ফোল্ডার অনুযায়ী চেক করুন
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, Trash2 } from 'lucide-react';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [newAttendance, setNewAttendance] = useState("");
  const [pgcilAtt, setPgcilAtt] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const getProjectData = async () => {
      try {
        const docRef = doc(db, "projects", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProject(data);
          setPgcilAtt(data.PGCIL_ATT || "");
        } else {
          alert("No such project found!");
          navigate('/all-projects');
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };
    getProjectData();
  }, [id, navigate]);

  // ডাটা আপডেট ফাংশন
  const handleUpdateData = async () => {
    setUpdating(true);
    try {
      const docRef = doc(db, "projects", id);
      const reqMan = parseInt(project.REQ_MANPOWER) || 0;
      const activeKAC = newAttendance !== "" ? parseInt(newAttendance) : project.KAC_ACTIVE;
      const updatedGap = reqMan - activeKAC;

      const updatePayload = {
        KAC_ACTIVE: activeKAC,
        GAP: updatedGap.toString(),
        PGCIL_ATT: pgcilAtt
      };

      await updateDoc(docRef, updatePayload);
      setProject({ ...project, ...updatePayload });
      setNewAttendance("");
      alert("Data Synchronized!");
    } catch (error) {
      console.error(error);
      alert("Update failed!");
    } finally {
      setUpdating(false);
    }
  };

  // ডিলিট ফাংশন
  const handleDeleteProject = async () => {
    if (window.confirm("WARNING: Are you sure you want to PERMANENTLY DELETE this project?")) {
      await deleteDoc(doc(db, "projects", id));
      navigate('/all-projects');
    }
  };

  if (!project) return <div style={styles.loading}>Accessing Secure Data...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.topNav}>
        <button onClick={() => navigate('/all-projects')} style={styles.backBtn}><ArrowLeft size={16}/> BACK</button>
        <button onClick={handleDeleteProject} style={styles.delBtn}><Trash2 size={16}/> DELETE</button>
      </header>
      
      <div style={styles.header}>
        <span style={styles.pageLabel}>PROJECT DETAILS</span>
        <div style={styles.titleRow}>
          <h1 style={styles.projTitle}>{project.PROJECT_NAME}</h1>
          <span style={styles.typeBadge}>{project.TYPE}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>Project Type</p>
          <p style={styles.headerValue}>{project.TYPE}</p>
        </div>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>Status</p>
          <p style={{...styles.headerValue, color: project.ACTIVE_STATUS === 'ACTIVE' ? '#22c55e' : '#ef4444'}}>{project.ACTIVE_STATUS || 'INACTIVE'}</p>
        </div>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>Client</p>
          <p style={styles.headerValue}>{project.CLIENT || 'N/A'}</p>
        </div>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>PO Number</p>
          <p style={styles.headerValue}>{project.PO_NUMBER || 'N/A'}</p>
        </div>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>District</p>
          <p style={styles.headerValue}>{project.DISTRICT || 'N/A'}</p>
        </div>
        <div style={styles.headerCard}>
          <p style={styles.headerLabel}>Manpower Req</p>
          <p style={styles.headerValue}>{project.REQ_MANPOWER}</p>
        </div>
      </div>

      <div style={styles.sectionIntro}>
        <h2 style={styles.sectionTitle}>Project Overview</h2>
        <p style={styles.sectionSubtitle}>Quick view of assignment, manpower and attendance status.</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.infoCard}>
          <h3>Site Assignment</h3>
          <hr style={styles.hr} />
          <p style={styles.p}><strong>Coordinator:</strong> {project.CO_ORDINATOR || 'N/A'}</p>
          <p style={styles.p}><strong>Accountant:</strong> {project.ACCOUNTANT || 'N/A'}</p>
          <p style={styles.p}><strong>Region:</strong> {project.REGION}</p>
          <p style={styles.p}><strong>Line Name:</strong> {project.LINE_NAME || 'N/A'}</p>
          <p style={styles.p}><strong>District:</strong> {project.DISTRICT || 'N/A'}</p>
          <p style={styles.p}><strong>Status:</strong> <span style={{color: project.DPR_STATUS === 'SUBMITTED' ? '#22c55e' : '#ef4444'}}>{project.DPR_STATUS}</span></p>
        </div>

        <div style={styles.statsCard}>
          <h3>Manpower Intelligence</h3>
          <hr style={styles.hr} />
          <div style={styles.statRow}><span>Requirement:</span><span style={styles.val}>{project.REQ_MANPOWER}</span></div>
          <div style={styles.statRow}><span>KAC Active:</span><span style={{...styles.val, color: '#22c55e'}}>{project.KAC_ACTIVE}</span></div>
          
          <div style={styles.statRow}><span>Gap Status:</span><span style={{...styles.val, color: '#ef4444'}}>{project.GAP}</span></div>
          <div style={styles.statRow}><span>Total Attendance:</span><span style={{...styles.val, color: '#22c55e'}}>{project.KAC_ACTIVE}</span></div>
        </div>
      </div>

      <div style={styles.actionCard}>
        <h4>Update Site Data</h4>
        <div style={styles.inputGroup}>
          <input type="number" placeholder="Today's KAC Active" style={styles.input} value={newAttendance} onChange={(e)=>setNewAttendance(e.target.value)}/>
          <input type="number" placeholder="PGCIL Attendance" style={styles.input} value={pgcilAtt} onChange={(e)=>setPgcilAtt(e.target.value)}/>
          <button onClick={handleUpdateData} style={styles.updateBtn} disabled={updating}>
            {updating ? "SAVING..." : "SYNC NOW"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', backgroundColor: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },
  topNav: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' },
  loading: { color: 'var(--text)', textAlign: 'center', marginTop: '20%', fontSize: '14px' },
  backBtn: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' },
  delBtn: { background: 'none', border: '1px solid #7f1d1d', color: '#ef4444', padding: '8px 15px', cursor: 'pointer', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' },
  header: { marginBottom: '20px' },
  pageLabel: { display: 'inline-block', marginBottom: '10px', fontSize: '12px', letterSpacing: '1.4px', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  projTitle: { fontSize: '32px', fontWeight: '900', margin: '0' },
  typeBadge: { backgroundColor: '#0055ff', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' },
  headerCard: { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '12px 16px' },
  headerLabel: { margin: '0 0 6px 0', color: 'var(--muted)', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  headerValue: { margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0055ff' },
  sectionIntro: { marginBottom: '30px' },
  sectionTitle: { margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800' },
  sectionSubtitle: { margin: 0, color: 'var(--muted)', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' },
  infoCard: { backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border)' },
  statsCard: { backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border)' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  val: { fontWeight: 'bold', fontSize: '18px' },
  hr: { borderColor: 'var(--border)', margin: '15px 0' },
  p: { margin: '10px 0', color: 'var(--muted)', fontSize: '14px' },
  actionCard: { backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '12px', border: '1px dotted var(--border-strong)' },
  inputGroup: { display: 'flex', gap: '15px', marginTop: '15px' },
  input: { backgroundColor: 'var(--surface-3)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '6px', color: 'var(--text)', flex: 1 },
  updateBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '0 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default ProjectDetails;
