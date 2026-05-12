import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [newAttendance, setNewAttendance] = useState("");
  const [pgcilAtt, setPgcilAtt] = useState("");
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getProjectData = async () => {
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProject(data);
        setPgcilAtt(data.PGCIL_ATT || "");
      }
    };
    getProjectData();
  }, [id]);

  // স্টাফ মডিফাই
  const handleModifyStaff = async (fieldName) => {
    const currentName = project[fieldName];
    const newName = prompt(`Enter new name for ${fieldName.replace('_', ' ')}:`, currentName);
    if (newName && newName !== currentName) {
      try {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, { [fieldName]: newName.toUpperCase() });
        setProject({ ...project, [fieldName]: newName.toUpperCase() });
        alert("Staff updated!");
      } catch (error) { alert("Update failed!"); }
    }
  };

  // এটেনডেন্স এবং PGCIL ডাটা আপডেট
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
    } catch (error) { console.error(error); }
    finally { setUpdating(false); }
  };

  // প্রজেক্ট ডিলিট (Admin Only)
  const handleDeleteProject = async () => {
    if (window.confirm("WARNING: Are you sure you want to PERMANENTLY DELETE this project?")) {
      await deleteDoc(doc(db, "projects", id));
      navigate('/all-projects');
    }
  };

  const toggleDPR = async () => {
    const newStatus = project.DPR_STATUS === "SUBMITTED" ? "NOT SUBMITTED" : "SUBMITTED";
    const docRef = doc(db, "projects", id);
    await updateDoc(docRef, { DPR_STATUS: newStatus });
    setProject({ ...project, DPR_STATUS: newStatus });
  };

  if (!project) return <div style={styles.loading}>Accessing Secure Data...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.topNav}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← BACK</button>
        <button onClick={handleDeleteProject} style={styles.delBtn}>DELETE PROJECT</button>
      </div>
      
      <div style={styles.header}>
        <h1 style={styles.projTitle}>{project.PROJECT_NAME}</h1>
        <span style={styles.typeBadge}>{project.TYPE}</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.infoCard}>
          <div style={styles.cardHead}>
            <h3>Site Assignment</h3>
            <span style={styles.tag}>ADMIN</span>
          </div>
          <hr style={styles.hr} />
          <div style={styles.staffRow}>
            <p style={styles.p}><strong>Coordinator:</strong> {project.CO_ORDINATOR}</p>
            <button onClick={() => handleModifyStaff("CO_ORDINATOR")} style={styles.editBtn}>EDIT</button>
          </div>
          <div style={styles.staffRow}>
            <p style={styles.p}><strong>Accountant:</strong> {project.ACCOUNTANT}</p>
            <button onClick={() => handleModifyStaff("ACCOUNTANT")} style={styles.editBtn}>EDIT</button>
          </div>
          <p style={styles.p}><strong>Region:</strong> {project.REGION}</p>
          <p style={styles.p}><strong>District:</strong> {project.DISTRICT || "Not Specified"}</p>
        </div>

        <div style={styles.statsCard}>
          <h3>Manpower Intelligence</h3>
          <hr style={styles.hr} />
          <div style={styles.statRow}><span>Requirement:</span><span style={styles.val}>{project.REQ_MANPOWER}</span></div>
          <div style={styles.statRow}><span>KAC Active:</span><span style={{...styles.val, color: '#22c55e'}}>{project.KAC_ACTIVE}</span></div>
          <div style={styles.statRow}><span>PGCIL Reported:</span><span style={{...styles.val, color: '#3b82f6'}}>{project.PGCIL_ATT || 0}</span></div>
          <div style={styles.statRow}><span>Gap Status:</span><span style={{...styles.val, color: '#ef4444'}}>{project.GAP}</span></div>
        </div>
      </div>

      <div style={styles.actionSection}>
        <div style={styles.actionCard}>
          <h4>UPDATE MANPOWER</h4>
          <input type="number" placeholder="Today's KAC Active" style={styles.input} value={newAttendance} onChange={(e)=>setNewAttendance(e.target.value)}/>
          <input type="number" placeholder="PGCIL Attendance" style={styles.input} value={pgcilAtt} onChange={(e)=>setPgcilAtt(e.target.value)}/>
          <button onClick={handleUpdateData} style={styles.updateBtn} disabled={updating}>{updating ? "SAVING..." : "SYNC DATA"}</button>
        </div>

        <div style={styles.actionCard}>
          <h4>DPR STATUS</h4>
          <p>Current: <b style={{color: project.DPR_STATUS === 'SUBMITTED' ? '#22c55e' : '#ef4444'}}>{project.DPR_STATUS}</b></p>
          <button onClick={toggleDPR} style={{...styles.updateBtn, backgroundColor: '#111', border: '1px solid #333'}}>
            TOGGLE SUBMISSION
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
  topNav: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  loading: { color: '#fff', textAlign: 'center', marginTop: '20%' },
  backBtn: { background: 'none', border: '1px solid #222', color: '#888', padding: '8px 20px', cursor: 'pointer', borderRadius: '4px' },
  delBtn: { background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 20px', cursor: 'pointer', borderRadius: '4px', fontSize: '11px' },
  header: { marginBottom: '40px' },
  projTitle: { fontSize: '32px', fontWeight: '900', margin: '0' },
  typeBadge: { backgroundColor: '#0055ff', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' },
  infoCard: { backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '8px', border: '1px solid #1a1a1a' },
  statsCard: { backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '8px', border: '1px solid #1a1a1a' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: '9px', color: '#0055ff', border: '1px solid #0055ff', padding: '2px 6px', borderRadius: '3px' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #111' },
  staffRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  editBtn: { background: 'none', border: 'none', color: '#0055ff', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' },
  val: { fontWeight: 'bold', fontSize: '18px' },
  hr: { borderColor: '#111', margin: '15px 0' },
  p: { margin: '10px 0', color: '#888' },
  actionSection: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '25px' },
  actionCard: { backgroundColor: '#0d0d0d', padding: '30px', borderRadius: '8px', border: '1px dotted #222' },
  input: { backgroundColor: '#000', border: '1px solid #222', padding: '12px', borderRadius: '5px', color: '#fff', width: '100%', marginBottom: '15px' },
  updateBtn: { width: '100%', padding: '12px', backgroundColor: '#0055ff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }
};

export default ProjectDetails;