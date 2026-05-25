import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { Shield, Users, Settings, LogOut, Activity, Database, Globe, Sliders, Bell, MessageSquare, Folder } from 'lucide-react';

const SuperAdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const [activeSection, setActiveSection] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} />, color: '#ef4444' },
    { id: 'users', label: 'User Management', icon: <Users size={18} />, color: '#8b5cf6' },
    { id: 'settings', label: 'System Settings', icon: <Settings size={18} />, color: '#06b6d4' },
    { id: 'audit', label: 'Audit Log', icon: <Activity size={18} />, color: '#f59e0b' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div>
            <h3 style={styles.sectionTitle}>System Overview</h3>
            <div style={styles.statGrid}>
              <div style={styles.statCard}>
                <Shield size={24} color="#ef4444" />
                <div>
                  <p style={styles.statLabel}>Super Admin Access</p>
                  <p style={styles.statValue}>Full System Control</p>
                </div>
              </div>
              <div style={styles.statCard}>
                <Users size={24} color="#8b5cf6" />
                <div>
                  <p style={styles.statLabel}>User Roles Managed</p>
                  <p style={styles.statValue}>5 Roles Active</p>
                </div>
              </div>
              <div style={styles.statCard}>
                <Database size={24} color="#06b6d4" />
                <div>
                  <p style={styles.statLabel}>System Status</p>
                  <p style={styles.statValue}>All Systems Operational</p>
                </div>
              </div>
            </div>

            <div style={styles.infoCard}>
              <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Super Admin Privileges</h4>
              <ul style={{ margin: 0, padding: '0 0 0 20px', lineHeight: 2.2, color: '#999', fontSize: 13 }}>
                <li>Full access to all system modules and features</li>
                <li>User role management and permission control</li>
                <li>System configuration and settings</li>
                <li>Audit log and activity monitoring</li>
                <li>Data backup and export capabilities</li>
                <li>Cross-project oversight and reporting</li>
              </ul>
            </div>

            <div style={{ ...styles.infoCard, marginTop: 16 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Quick Actions</h4>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={styles.actionBtn} onClick={() => navigate('/user-manager')}>
                  <Users size={16} /> Manage Users
                </button>
                <button style={styles.actionBtn} onClick={() => navigate('/admin')}>
                  <Shield size={16} /> Admin Panel
                </button>
                <button style={styles.actionBtn} onClick={() => navigate('/activity-log')}>
                  <Activity size={16} /> Activity Log
                </button>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div>
            <h3 style={styles.sectionTitle}>User Management</h3>
            <p style={{ color: '#666', fontSize: 13 }}>Manage all users and their role-based access permissions.</p>
            <div style={{ ...styles.infoCard, marginTop: 16 }}>
              <p style={{ color: '#999', fontSize: 13 }}>Go to <strong style={{ color: '#fff' }}>User Manager</strong> to create, edit, delete users and change passwords.</p>
              <button style={{ ...styles.actionBtn, marginTop: 12 }} onClick={() => navigate('/user-manager')}>
                <Users size={16} /> Open User Manager
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div>
            <h3 style={styles.sectionTitle}>System Settings</h3>
            <p style={{ color: '#666', fontSize: 13 }}>Configure system preferences and global settings.</p>
            <div style={{ ...styles.infoCard, marginTop: 16 }}>
              <p style={{ color: '#999', fontSize: 13 }}>Access all system settings from the <strong style={{ color: '#fff' }}>Admin Panel → Settings</strong>.</p>
              <button style={{ ...styles.actionBtn, marginTop: 12 }} onClick={() => navigate('/admin')}>
                <Settings size={16} /> Open Admin Panel
              </button>
            </div>
          </div>
        );
      case 'audit':
        return (
          <div>
            <h3 style={styles.sectionTitle}>Audit Log</h3>
            <p style={{ color: '#666', fontSize: 13 }}>Monitor all system activities and user actions.</p>
            <div style={{ ...styles.infoCard, marginTop: 16 }}>
              <p style={{ color: '#999', fontSize: 13 }}>View detailed activity logs from the <strong style={{ color: '#fff' }}>Activity Log</strong> page.</p>
              <button style={{ ...styles.actionBtn, marginTop: 12 }} onClick={() => navigate('/activity-log')}>
                <Activity size={16} /> View Activity Log
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.layout}>
      <style>{`
        .sa-menu-item { transition: all 0.2s; cursor: pointer; border-radius: 8px; }
        .sa-menu-item:hover { background-color: rgba(239,68,68,0.1); transform: translateX(4px); }
      `}</style>

      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <h2 style={styles.logo}>KAC <span style={{ color: '#ef4444' }}>SUPER</span></h2>
        </div>
        <div style={styles.topBarRight}>
          <div style={styles.profile}>
            <div style={{ ...styles.avatar, backgroundColor: '#ef4444' }}>SA</div>
            <span style={styles.profileName}>{profile?.name || 'SUPER ADMIN'}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={18} /> LOGOUT
          </button>
        </div>
      </header>

      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="sa-menu-item"
                onClick={() => setActiveSection(item.id)}
                style={{
                  ...styles.menuItem,
                  backgroundColor: activeSection === item.id ? 'rgba(239,68,68,0.1)' : 'transparent',
                  borderLeft: activeSection === item.id ? '3px solid #ef4444' : '3px solid transparent',
                  color: activeSection === item.id ? '#ef4444' : '#666',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        <main style={styles.main}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const styles = {
  layout: { minHeight: '100vh', backgroundColor: '#050505', color: '#fff', fontFamily: '"Inter", sans-serif' },
  topBar: {
    height: '70px', borderBottom: '1px solid #1a1a1a', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', padding: '0 30px', backgroundColor: '#0a0a0a',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  logo: { fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-1px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '12px' },
  profileName: { fontSize: '13px', fontWeight: '600' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef444430',
    borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
  },
  body: { display: 'flex', height: 'calc(100vh - 70px)' },
  sidebar: {
    width: '240px', borderRight: '1px solid #1a1a1a', padding: '20px 12px',
    backgroundColor: '#0a0a0a',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
    fontSize: '13px', fontWeight: '600', border: 'none', background: 'none', width: '100%', textAlign: 'left',
  },
  main: { flex: 1, padding: '40px', overflowY: 'auto' },
  sectionTitle: { margin: '0 0 20px', fontSize: '20px', fontWeight: '700', color: '#ef4444' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: {
    backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px',
    border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '16px',
  },
  statLabel: { margin: 0, fontSize: '11px', color: '#666', fontWeight: '600', letterSpacing: '1px' },
  statValue: { margin: '4px 0 0', fontSize: '14px', fontWeight: '700', color: '#fff' },
  infoCard: {
    backgroundColor: '#0a0a0a', padding: '24px', borderRadius: '12px',
    border: '1px solid #1a1a1a',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
    backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef444430',
    borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
    transition: 'all 0.2s',
  },
};

export default SuperAdminDashboard;