import React, { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

const StaffManagement = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'accountant' });
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);

  // সব প্রজেক্টের লিস্ট আনা যাতে কাউকে অ্যাসাইন করা যায়
  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, "projects"));
      setProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProjects();
  }, []);

  const handleCreateAndAssign = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ১. নতুন ইউজার তৈরি
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      const staffName = formData.name.toUpperCase();

      // ২. Firestore-এ ইউজার ডাটা সেভ
      await setDoc(doc(db, "users", String(user.uid)), {
        uid: String(user.uid),
        name: staffName,
        email: formData.email,
        role: formData.role
      });

      // ৩. যদি কোনো প্রজেক্ট সিলেক্ট করা থাকে, তবে সেই প্রজেক্টে এই নাম আপডেট করা
      if (selectedProject) {
        const projRef = doc(db, "projects", selectedProject);
        const updateData = formData.role === 'accountant' 
          ? { ACCOUNTANT: staffName } 
          : { CO_ORDINATOR: staffName };
        
        await updateDoc(projRef, updateData);
      }

      alert("Staff Created and Project Assigned Successfully!");
      setFormData({ name: '', email: '', password: '', role: 'accountant' });
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2 style={styles.title}>STAFF & PROJECT CONTROL</h2>
        <form onSubmit={handleCreateAndAssign} style={styles.form}>
          <label style={styles.label}>Full Name (Matches CSV)</label>
          <input type="text" style={styles.input} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          
          <label style={styles.label}>Login Email</label>
          <input type="email" style={styles.input} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          
          <label style={styles.label}>Password</label>
          <input type="password" style={styles.input} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />

          <label style={styles.label}>Assign Role</label>
          <select style={styles.input} value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
            <option value="accountant">Accountant</option>
            <option value="coordinator">Coordinator</option>
          </select>

          <label style={styles.label}>Assign to Existing Project (Optional)</label>
          <select style={styles.input} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.PROJECT_NAME}</option>
            ))}
          </select>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "PROCESSING..." : "CREATE & ASSIGN"}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '50px', backgroundColor: '#050505', minHeight: '100vh', display: 'flex', justifyContent: 'center' },
  formCard: { width: '450px', backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #222' },
  title: { color: '#0055ff', fontSize: '18px', fontWeight: '900', marginBottom: '25px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  label: { color: '#555', fontSize: '11px', fontWeight: 'bold' },
  input: { padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '5px' },
  btn: { padding: '15px', backgroundColor: '#0055ff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};

export default StaffManagement;