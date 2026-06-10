import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { performLogout } from '../../utils/logout';
import { Users, ClipboardCheck, UserPlus, LogOut, ArrowLeft, BarChart3, Clock, UserCheck, FileText } from 'lucide-react';

const HrAssistantDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    performLogout();
    navigate('/');
  };

  return (
    <div style={styles.layout}>
      <style>{`
        .dashboard-card { transition: all 0.3s ease; cursor: pointer; }
        .dashboard-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
      `}</style>

      {/* Top Bar */}
      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <h2 style={styles.logo}>KAC <span style={{ color: '#8b5cf6' }}>HR</span></h2>
        </div>
        <div style={styles.topBarRight}>
          <div style={styles.profile}>
            <div style={{ ...styles.avatar, backgroundColor: '#8b5cf6' }}>H</div>
            <span style={styles.profileName}>{profile?.name || 'HR ASSISTANT'}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={18} /> LOGOUT
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.welcomeSection}>
          <div>
            <h1 style={styles.welcomeTitle}>HR Dashboard</h1>
            <p style={styles.welcomeSub}>Employee Management & Administrative Tools</p>
          </div>
          <div style={styles.badge}>
            <Users size={16} />
            <span>HR ASSISTANT</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Total Employees</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#22c55e20', color: '#22c55e' }}>
              <UserCheck size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Present Today</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Pending</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div style={styles.menuGrid}>
          <div className="dashboard-card" style={styles.menuCard} onClick={() => alert('Worker Registration module coming soon for HR Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              <UserPlus size={32} />
            </div>
            <h3 style={styles.menuTitle}>Worker Registration</h3>
            <p style={styles.menuDesc}>Register new workers and manage existing employee records</p>
          </div>
          <div className="dashboard-card" style={styles.menuCard} onClick={() => alert('Attendance module coming soon for HR Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#22c55e20', color: '#22c55e' }}>
              <ClipboardCheck size={32} />
            </div>
            <h3 style={styles.menuTitle}>Attendance</h3>
            <p style={styles.menuDesc}>View and manage daily employee attendance records</p>
          </div>
          <div className="dashboard-card" style={styles.menuCard} onClick={() => alert('Reports module coming soon for HR Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <BarChart3 size={32} />
            </div>
            <h3 style={styles.menuTitle}>Reports</h3>
            <p style={styles.menuDesc}>Generate HR reports and employee analytics</p>
          </div>
          <div className="dashboard-card" style={styles.menuCard} onClick={() => alert('Documents module coming soon for HR Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#06b6d420', color: '#06b6d4' }}>
              <FileText size={32} />
            </div>
            <h3 style={styles.menuTitle}>Documents</h3>
            <p style={styles.menuDesc}>Manage employee documents and compliance records</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    minHeight: '100vh',
    backgroundColor: '#050505',
    color: '#fff',
    fontFamily: '"Inter", sans-serif',
  },
  topBar: {
    height: '70px',
    borderBottom: '1px solid #1a1a1a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 30px',
    backgroundColor: '#0a0a0a',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  logo: { fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-1px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '14px' },
  profileName: { fontSize: '13px', fontWeight: '600' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef444430',
    borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
    transition: 'all 0.2s',
  },
  content: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  welcomeSection: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '40px',
  },
  welcomeTitle: { margin: 0, fontSize: '28px', fontWeight: '900' },
  welcomeSub: { margin: '8px 0 0', fontSize: '14px', color: '#666' },
  badge: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
    backgroundColor: '#8b5cf620', color: '#8b5cf6', borderRadius: '20px',
    fontSize: '12px', fontWeight: '700',
  },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  statCard: {
    backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px',
    border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '16px',
  },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  statLabel: { margin: 0, fontSize: '11px', color: '#666', fontWeight: '600', letterSpacing: '1px' },
  statValue: { margin: '4px 0 0', fontSize: '24px', fontWeight: '900' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' },
  menuCard: {
    backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px',
    border: '1px solid #1a1a1a',
  },
  menuIcon: { width: '56px', height: '56px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' },
  menuTitle: { margin: '0 0 8px', fontSize: '16px', fontWeight: '700' },
  menuDesc: { margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.5' },
};

export default HrAssistantDashboard;