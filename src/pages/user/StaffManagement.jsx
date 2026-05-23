import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Edit3, Save, X, Search, UserCheck, UserX } from 'lucide-react';
import { pageStyles as s } from '../../styles/pageStyles';

const StaffManagement = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'coordinator' });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editProjectIds, setEditProjectIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    const [pSnap, uSnap] = await Promise.all([
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'users')),
    ]);
    setProjects(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { load(); }, []);

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
        uid, name: staffName, email: formData.email, role: formData.role,
        assignedProjectIds: selectedProjectIds, canEdit: false, canDelete: false, createdAt: new Date(),
      });

      for (const pid of selectedProjectIds) {
        const field = formData.role === 'accountant' ? 'ACCOUNTANT' : 'CO_ORDINATOR';
        await updateDoc(doc(db, 'projects', pid), { [field]: staffName });
      }

      alert('User created and projects assigned.');
      setFormData({ name: '', email: '', password: '', role: 'coordinator' });
      setSelectedProjectIds([]);
      setShowCreateForm(false);
      load();
    } catch (error) {
      alert(error.message);
    } finally { setLoading(false); }
  };

  const handleUpdateProjects = async (userId, projectIds, role, userName) => {
    const staffName = (userName || '').toUpperCase();
    await updateDoc(doc(db, 'users', userId), { assignedProjectIds: projectIds });
    for (const p of projects) {
      const field = role === 'accountant' ? 'ACCOUNTANT' : 'CO_ORDINATOR';
      if (projectIds.includes(p.id)) {
        await updateDoc(doc(db, 'projects', p.id), { [field]: staffName });
      } else if ((role === 'accountant' && p.ACCOUNTANT === staffName) || (role === 'coordinator' && p.CO_ORDINATOR === staffName)) {
        await updateDoc(doc(db, 'projects', p.id), { [field]: deleteField() });
      }
    }
    setEditingUser(null);
    setEditProjectIds([]);
    load();
  };

  const handleDeleteUser = async (userId, userName, role) => {
    try {
      // Remove assignments from projects
      for (const p of projects) {
        const field = role === 'accountant' ? 'ACCOUNTANT' : 'CO_ORDINATOR';
        if ((role === 'accountant' && p.ACCOUNTANT === userName) || (role === 'coordinator' && p.CO_ORDINATOR === userName)) {
          await updateDoc(doc(db, 'projects', p.id), { [field]: deleteField() });
        }
      }
      await deleteDoc(doc(db, 'users', userId));
      setConfirmDelete(null);
      load();
    } catch (error) {
      alert('Delete failed: ' + error.message);
    }
  };

  const startEditing = (user) => {
    setEditingUser(user);
    setEditProjectIds(user.assignedProjectIds || []);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditProjectIds([]);
  };

  const toggleEditProject = (id) => {
    setEditProjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Filter logic
  const filteredUsers = users
    .filter((u) => u.role !== 'admin')
    .filter((u) => {
      const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });

  const getProjectNames = (ids) => {
    if (!ids || ids.length === 0) return <span style={{ color: 'var(--muted-2)', fontSize: '11px' }}>No projects</span>;
    return ids.map((id) => {
      const p = projects.find((proj) => proj.id === id);
      return p ? p.PROJECT_NAME : null;
    }).filter(Boolean).join(', ');
  };

  const getProjectStatus = (userId, ids) => {
    if (!ids || ids.length === 0) return { label: 'Unassigned', color: '#ef4444', bg: '#ef444415' };
    return { label: `${ids.length} Project${ids.length > 1 ? 's' : ''}`, color: '#22c55e', bg: '#22c55e15' };
  };

  return (
    <div style={s.container}>
      {/* Inline styles */}
      <style>{`
        .table-container { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
        .user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .user-table th { background-color: var(--surface-2); padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted-2); letter-spacing: 0.5px; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .user-table td { padding: 14px 16px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .user-table tr:last-child td { border-bottom: none; }
        .user-table tr { transition: background 0.15s; }
        .user-table tbody tr:hover { background-color: var(--surface-2); }
        .project-select { max-height: 200px; overflow-y: auto; border: 1px solid var(--border-strong); border-radius: 8px; padding: 8px; background: var(--surface); min-width: 220px; }
        .project-select label { display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 4px 6px; border-radius: 4px; cursor: pointer; transition: background 0.15s; }
        .project-select label:hover { background: var(--surface-2); }
        .project-select input[type="checkbox"] { accent-color: #0055ff; }
        .edit-actions { display: flex; gap: 6px; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .delete-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
        .delete-modal { background: var(--surface); padding: 28px; border-radius: 15px; border: 1px solid var(--border-strong); max-width: 400px; width: 90%; text-align: center; }
        @media (max-width: 768px) { .user-table { font-size: 12px; } .user-table th, .user-table td { padding: 10px 12px; } }
      `}</style>

      <header style={s.header}>
        <div style={s.headerLeft}>
          <button type="button" onClick={() => navigate('/admin')} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={s.title}>
            USER <span style={{ color: '#0055ff' }}>MANAGER</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={s.searchBox}>
            <Search size={14} color="var(--muted-2)" />
            <input
              type="text"
              placeholder="Search by name or email..."
              style={s.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select style={s.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="coordinator">Coordinator</option>
            <option value="accountant">Accountant</option>
          </select>
          <button style={s.primaryBtn} onClick={() => setShowCreateForm(true)}>
            <Plus size={16} /> CREATE USER
          </button>
        </div>
      </header>

      {/* Create User Modal */}
      {showCreateForm && (
        <div style={s.modalOverlay} onClick={() => setShowCreateForm(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()} className="fade-in">
            <div style={s.modalHeader}>
              <h3 style={{ margin: 0, color: '#0055ff' }}>CREATE NEW USER</h3>
              <button onClick={() => setShowCreateForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-2)', marginBottom: 16 }}>
              Coordinator: assigned projects — view only. Accountant: submit only (no edit/delete).
            </p>
            <form onSubmit={handleCreate} style={s.form}>
              <div style={s.inputGrid}>
                <div>
                  <label style={s.label}>FULL NAME</label>
                  <input type="text" style={s.formInput} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label style={s.label}>ROLE</label>
                  <select style={s.formInput} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="coordinator">Coordinator</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
              </div>
              <div style={s.inputGrid}>
                <div>
                  <label style={s.label}>EMAIL</label>
                  <input type="email" style={s.formInput} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="user@email.com" />
                </div>
                <div>
                  <label style={s.label}>PASSWORD</label>
                  <input type="password" style={s.formInput} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Min 6 characters" />
                </div>
              </div>
              <div>
                <label style={s.label}>ASSIGN PROJECTS</label>
                <div className="project-select">
                  {projects.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center', padding: 10 }}>No projects available</p>
                  ) : (
                    projects.map((p) => (
                      <label key={p.id}>
                        <input type="checkbox" checked={selectedProjectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                        {p.PROJECT_NAME}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? 'CREATING...' : 'CREATE USER'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="delete-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="delete-modal fade-in" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={40} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 8px' }}>Delete User?</h3>
            <p style={{ fontSize: 13, color: 'var(--muted-2)', margin: '0 0 20px' }}>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
              This will remove all project assignments and the user account.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ ...s.secondaryBtn, border: '1px solid var(--border-strong)' }}>
                CANCEL
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete.id, confirmDelete.name, confirmDelete.role)}
                style={{ ...s.primaryBtn, backgroundColor: '#ef4444' }}
              >
                DELETE USER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th style={{ width: '28px' }}>#</th>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>PROJECTS</th>
              <th>STATUS</th>
              <th style={{ width: '180px', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted-2)' }}>
                  <UserX size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => {
                const status = getProjectStatus(u.uid || u.id, u.assignedProjectIds);
                return (
                  <tr key={u.uid || u.id}>
                    <td style={{ color: 'var(--muted-2)', fontSize: '12px' }}>{idx + 1}</td>
                    <td>
                      <strong style={{ fontSize: '13px' }}>{u.name}</strong>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted-2)' }}>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
                        backgroundColor: u.role === 'coordinator' ? '#f59e0b20' : '#0055ff20',
                        color: u.role === 'coordinator' ? '#f59e0b' : '#0055ff'
                      }}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {editingUser && (editingUser.uid === u.uid || editingUser.id === u.id) ? (
                        <div style={{ position: 'relative' }}>
                          <div className="project-select" style={{ maxHeight: '180px', minWidth: '200px' }}>
                            {projects.length === 0 ? (
                              <p style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center', padding: 10 }}>No projects</p>
                            ) : (
                              projects.map((p) => (
                                <label key={p.id}>
                                  <input type="checkbox" checked={editProjectIds.includes(p.id)} onChange={() => toggleEditProject(p.id)} />
                                  {p.PROJECT_NAME}
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        getProjectNames(u.assignedProjectIds)
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                        backgroundColor: status.bg, color: status.color
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {status.label === 'Unassigned' ? <UserX size={12} /> : <UserCheck size={12} />}
                          {status.label}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {editingUser && (editingUser.uid === u.uid || editingUser.id === u.id) ? (
                          <div className="edit-actions">
                            <button
                              onClick={() => handleUpdateProjects(u.uid || u.id, editProjectIds, u.role, u.name)}
                              style={{ ...s.primaryBtn, padding: '6px 12px', fontSize: '11px' }}
                              title="Save changes"
                            >
                              <Save size={14} /> SAVE
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{ ...s.secondaryBtn, padding: '6px 12px', fontSize: '11px' }}
                              title="Cancel"
                            >
                              <X size={14} /> CANCEL
                            </button>
                          </div>
                        ) : (
                          <div className="edit-actions">
                            <button
                              onClick={() => startEditing(u)}
                              style={{ ...s.actionBtn, padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#0055ff', border: '1px solid #0055ff30' }}
                              title="Edit project assignments"
                            >
                              <Edit3 size={12} /> EDIT
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: u.uid || u.id, name: u.name, role: u.role })}
                              style={{ ...s.actionBtn, padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', border: '1px solid #ef444430' }}
                              title="Delete user"
                            >
                              <Trash2 size={12} /> DELETE
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--muted-2)' }}>
        <span>Total: <strong style={{ color: 'var(--text)' }}>{filteredUsers.length}</strong> user{filteredUsers.length !== 1 ? 's' : ''}</span>
        <span>
          <span style={{ color: '#f59e0b' }}>{users.filter(u => u.role === 'coordinator' && u.role !== 'admin').length} Coordinators</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span style={{ color: '#0055ff' }}>{users.filter(u => u.role === 'accountant' && u.role !== 'admin').length} Accountants</span>
        </span>
      </div>
    </div>
  );
};

export default StaffManagement;