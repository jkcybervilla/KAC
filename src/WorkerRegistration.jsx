import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

const WorkerRegistration = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workerData, setWorkerData] = useState({
    name: '',
    designation: '',
    phone: '',
    projectId: '',
    projectName: ''
  });

  // প্রজেক্ট লিস্ট লোড করা যাতে ড্রপডাউন থেকে সিলেক্ট করা যায়
  useEffect(() => {
    const fetchProjects = async () => {
      const q = query(collection(db, "projects"), orderBy("PROJECT_NAME", "asc"));
      const snap = await getDocs(q);
      setProjects(snap.docs.map(doc => ({ id: doc.id, name: doc.data().PROJECT_NAME })));
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workerData.projectId) return alert("Please select a project!");
    
    setLoading(true);
    try {
      await addDoc(collection(db, "workers"), {
        ...workerData,
        registeredAt: new Date(),
        status: 'ACTIVE'
      });
      alert("Worker Registered Successfully!");
      setWorkerData({ name: '', designation: '', phone: '', projectId: '', projectName: '' });
    } catch (error) {
      console.error("Error adding worker:", error);
      alert("Failed to register worker.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>NEW WORKER ENROLLMENT</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>ASSIGN TO PROJECT</label>
          <select 
            style={styles.select}
            value={workerData.projectId}
            onChange={(e) => {
              const selectedProj = projects.find(p => p.id === e.target.value);
              setWorkerData({...workerData, projectId: e.target.value, projectName: selectedProj?.name});
            }}
            required
          >
            <option value="">-- Select Project Line --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>WORKER FULL NAME</label>
          <input 
            type="text" 
            placeholder="Enter Name" 
            style={styles.input}
            value={workerData.name}
            onChange={(e) => setWorkerData({...workerData, name: e.target.value})}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>DESIGNATION / ROLE</label>
          <input 
            type="text" 
            placeholder="e.g. Fitter, Helper, Electrician" 
            style={styles.input}
            value={workerData.designation}
            onChange={(e) => setWorkerData({...workerData, designation: e.target.value})}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>CONTACT NUMBER</label>
          <input 
            type="tel" 
            placeholder="Mobile Number" 
            style={styles.input}
            value={workerData.phone}
            onChange={(e) => setWorkerData({...workerData, phone: e.target.value})}
            required
          />
        </div>

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? "PROCESSING..." : "REGISTER WORKER"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  formContainer: { width: '100%', maxWidth: '500px', backgroundColor: '#050505', padding: '30px', borderRadius: '12px', border: '1px solid #1a1a1a' },
  formTitle: { fontSize: '18px', fontWeight: '800', color: '#0055ff', marginBottom: '25px', textAlign: 'center', letterSpacing: '1px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '10px', fontWeight: 'bold', color: '#444' },
  input: { backgroundColor: '#0a0a0a', border: '1px solid #222', padding: '12px', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none' },
  select: { backgroundColor: '#0a0a0a', border: '1px solid #222', padding: '12px', borderRadius: '6px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#0055ff', color: '#fff', padding: '15px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '14px', transition: '0.3s' }
};

export default WorkerRegistration;