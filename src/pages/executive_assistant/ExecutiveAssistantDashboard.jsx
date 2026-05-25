import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { Calendar, FileText, Mail, MessageSquare, LogOut, Clock, CheckSquare, AlertCircle, Users } from 'lucide-react';

const ExecutiveAssistantDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div style={styles.layout}>
      <style>{`
        .ea-card { transition: all 0.3s ease; cursor: pointer; }
        .ea-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
      `}</style>

      <header style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <h2 style={styles.logo}>KAC <span style={{ color: '#06b6d4' }}>EXEC</span></h2>
        </div>
        <div style={styles.topBarRight}>
          <div style={styles.profile}>
            <div style={{ ...styles.avatar, backgroundColor: '#06b6d4' }}>EA</div>
            <span style={styles.profileName}>{profile?.name || 'EXECUTIVE ASSISTANT'}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogOut size={18} /> LOGOUT
          </button>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.welcomeSection}>
          <div>
            <h1 style={styles.welcomeTitle}>Executive Assistant Dashboard</h1>
            <p style={styles.welcomeSub}>Administrative Support & Task Management</p>
          </div>
          <div style={styles.badge}>
            <Users size={16} />
            <span>EXECUTIVE ASSISTANT</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#06b6d420', color: '#06b6d4' }}>
              <Calendar size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Today's Schedule</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Pending Tasks</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, backgroundColor: '#22c55e20', color: '#22c55e' }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <p style={styles.statLabel}>Completed</p>
              <h3 style={styles.statValue}>--</h3>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div style={styles.menuGrid}>
          <div className="ea-card" style={styles.menuCard} onClick={() => alert('Calendar module coming soon for Executive Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#06b6d420', color: '#06b6d4' }}>
              <Calendar size={32} />
            </div>
            <h3 style={styles.menuTitle}>Calendar & Scheduling</h3>
            <p style={styles.menuDesc}>Manage appointments, meetings, and admin schedule</p>
          </div>
          <div className="ea-card" style={styles.menuCard} onClick={() => alert('Tasks module coming soon for Executive Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
              <CheckSquare size={32} />
            </div>
            <h3 style={styles.menuTitle}>Task Management</h3>
            <p style={styles.menuDesc}>Track and manage administrative tasks and follow-ups</p>
          </div>
          <div className="ea-card" style={styles.menuCard} onClick={() => alert('Communication module coming soon for Executive Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#22c55e20', color: '#22c55e' }}>
              <MessageSquare size={32} />
            </div>
            <h3 style={styles.menuTitle}>Communications</h3>
            <p style={styles.menuDesc}>Manage emails, messages, and internal communications</p>
          </div>
          <div className="ea-card" style={styles.menuCard} onClick={() => alert('Documents module coming soon for Executive Assistant')}>
            <div style={{ ...styles.menuIcon, backgroundColor: '#8b5cf620', color: '#8b5cf6' }}>
              <FileText size={32} />
            </div>
            <h3 style={styles.menuTitle}>Documents & Reports</h3>
            <p style={styles.menuDesc}>Prepare, review and organize administrative documents</p>
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
    backgroundColor: '#06b6d420', color: '#06b6d4', borderRadius: '20px',
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

export default ExecutiveAssistantDashboard;