import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, updateDoc, deleteField } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';

const StaffManagement = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'accountant' });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [pSnap, uSnap] = await Promise.all([
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'users')),
    ]);
    setProjects(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleProject = (id) => {
    setSelectedProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = String(userCredential.user.uid);
      const staffName = formData.name.toUpperCase();

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: staffName,
        email: formData.email,
        role: formData.role,
        assignedProjectIds: selectedProjectIds,
        canEdit: false,
        canDelete: false,
        createdAt: new Date(),
      });

      for (const pid of selectedProjectIds) {
        const field = formData.role === 'accountant' ? 'ACCOUNTANT' : 'CO_ORDINATOR';
        await updateDoc(doc(db, 'projects', pid), { [field]: staffName });
      }

      alert('User created and projects assigned.');
      setFormData({ name: '', email: '', password: '', role: 'accountant' });
      setSelectedProjectIds([]);
      load();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignProjectsToUser = async (userId, projectIds, role) => {
    const u = users.find((x) => x.uid === userId || x.id === userId);
    if (!u) return;
    const staffName = (u.name || '').toUpperCase();
    await updateDoc(doc(db, 'users', userId), { assignedProjectIds: projectIds });
    for (const p of projects) {
      const field = role === 'accountant' ? 'ACCOUNTANT' : 'CO_ORDINATOR';
      if (projectIds.includes(p.id)) {
        await updateDoc(doc(db, 'projects', p.id), { [field]: staffName });
      } else if ((role === 'accountant' && p.ACCOUNTANT === staffName) || (role === 'coordinator' && p.CO_ORDINATOR === staffName)) {
        await updateDoc(doc(db, 'projects', p.id), { [field]: deleteField() });
      }
    }
    load();
    alert('Project assignment updated.');
  };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            USER <span style={{ color: '#0055ff' }}>MANAGER</span>
          </h2>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ ...s.modalContent, maxWidth: 'none', position: 'relative' }}>
          <h3 style={{ marginTop: 0, color: '#0055ff' }}>CREATE USER</h3>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
            Coordinator: assigned projects — view only. Accountant: submit only (no edit/delete).
          </p>
          <form onSubmit={handleCreate} style={s.form}>
            <label style={s.label}>FULL NAME</label>
            <input type="text" style={s.formInput} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <label style={s.label}>EMAIL</label>
            <input type="email" style={s.formInput} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <label style={s.label}>PASSWORD</label>
            <input type="password" style={s.formInput} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            <label style={s.label}>ROLE</label>
            <select style={s.formInput} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
              <option value="accountant">Accountant</option>
              <option value="coordinator">Coordinator</option>
            </select>
            <label style={s.label}>ASSIGN PROJECTS</label>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
              {projects.map((p) => (
                <label key={p.id} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedProjectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                  {p.PROJECT_NAME}
                </label>
              ))}
            </div>
            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading ? 'CREATING...' : 'CREATE USER'}
            </button>
          </form>
        </div>

        <div style={{ ...s.modalContent, maxWidth: 'none' }}>
          <h3 style={{ marginTop: 0 }}>EXISTING USERS</h3>
          {users
            .filter((u) => u.role !== 'admin')
            .map((u) => (
              <UserAssignCard key={u.uid || u.id} user={u} projects={projects} onSave={assignProjectsToUser} />
            ))}
        </div>
      </div>
    </div>
  );
};

const UserAssignCard = ({ user, projects, onSave }) => {
  const [ids, setIds] = useState(user.assignedProjectIds || []);

  useEffect(() => {
    setIds(user.assignedProjectIds || []);
  }, [user]);

  return (
    <div style={{ border: '1px solid #222', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>{user.name}</strong>
        <span style={{ fontSize: 10, color: user.role === 'coordinator' ? '#f59e0b' : '#0055ff' }}>{user.role?.toUpperCase()}</span>
      </div>
      <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>{user.email}</p>
      <div style={{ maxHeight: 100, overflowY: 'auto' }}>
        {projects.map((p) => (
          <label key={p.id} style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={ids.includes(p.id)}
              onChange={() => setIds((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
            />
            {p.PROJECT_NAME}
          </label>
        ))}
      </div>
      <button type="button" style={{ ...s.secondaryBtn, marginTop: 8 }} onClick={() => onSave(user.uid || user.id, ids, user.role)}>
        UPDATE ASSIGNMENT
      </button>
    </div>
  );
};

export default StaffManagement;
