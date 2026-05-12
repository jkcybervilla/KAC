import React from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.mainTitle}>KAC <span style={{color: '#0055ff'}}>OFFICIAL</span></h1>
        <p style={styles.subText}>OPERATIONAL COMMAND CENTER | MAY 2026</p>
      </header>

      {/* মেইন ৩টি একশন বাটন গ্রিড */}
      <div style={styles.buttonGrid}>
        
        {/* ১. প্রজেক্ট ম্যানেজমেন্ট */}
        <div style={styles.actionCard} onClick={() => navigate('/all-projects')}>
          <div style={{...styles.iconBox, backgroundColor: 'rgba(0, 85, 255, 0.1)'}}>
            <span style={{color: '#0055ff', fontSize: '40px'}}>📁</span>
          </div>
          <h2 style={styles.cardTitle}>PROJECTS</h2>
          <p style={styles.cardDesc}>View, Search & Modify All Project Lines</p>
          <div style={styles.footerLink}>OPEN REPOSITORY →</div>
        </div>

        {/* ২. ওয়ার্কার রেজিস্ট্রেশন */}
        <div style={styles.actionCard} onClick={() => navigate('/register-worker')}>
          <div style={{...styles.iconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)'}}>
            <span style={{color: '#f59e0b', fontSize: '40px'}}>➕</span>
          </div>
          <h2 style={styles.cardTitle}>REGISTER WORKER</h2>
          <p style={styles.cardDesc}>Enroll New Workers & Field Staff</p>
          <div style={{...styles.footerLink, color: '#f59e0b'}}>ADD NEW STAFF →</div>
        </div>

        {/* ৩. এটেনডেন্স এনালিটিক্স */}
        <div style={styles.actionCard} onClick={() => navigate('/attendance')}>
          <div style={{...styles.iconBox, backgroundColor: 'rgba(34, 197, 94, 0.1)'}}>
            <span style={{color: '#22c55e', fontSize: '40px'}}>👷</span>
          </div>
          <h2 style={styles.cardTitle}>ATTENDANCE</h2>
          <p style={styles.cardDesc}>Daily Manpower & Gap Analysis Reports</p>
          <div style={{...styles.footerLink, color: '#22c55e'}}>VIEW REPORTS →</div>
        </div>

      </div>

      <div style={styles.systemStatus}>
        <span style={styles.pulse}></span> SYSTEM SECURE & ONLINE
      </div>
    </div>
  );
};

const styles = {
  container: { 
    padding: '80px 40px', 
    backgroundColor: '#050505', 
    minHeight: '100vh', 
    color: '#fff', 
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  header: { textAlign: 'center', marginBottom: '80px' },
  mainTitle: { fontSize: '48px', fontWeight: '900', margin: 0, letterSpacing: '-2px' },
  subText: { color: '#444', fontSize: '12px', letterSpacing: '4px', marginTop: '10px', fontWeight: 'bold', textTransform: 'uppercase' },
  
  buttonGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
    gap: '30px', 
    width: '100%',
    maxWidth: '1100px'
  },
  
  actionCard: { 
    backgroundColor: '#0a0a0a', 
    border: '1px solid #151515', 
    padding: '60px 30px', 
    borderRadius: '20px', 
    textAlign: 'center', 
    cursor: 'pointer', 
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    position: 'relative',
    overflow: 'hidden'
  },
  
  iconBox: { 
    width: '90px', 
    height: '90px', 
    borderRadius: '24px', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: '30px'
  },
  
  cardTitle: { fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '1px' },
  cardDesc: { fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '30px', maxWidth: '220px' },
  
  footerLink: { 
    fontSize: '11px', 
    fontWeight: 'bold', 
    color: '#0055ff', 
    letterSpacing: '1px',
    borderTop: '1px solid #111',
    width: '100%',
    paddingTop: '20px'
  },

  systemStatus: { marginTop: 'auto', color: '#222', fontSize: '10px', letterSpacing: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  pulse: { width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'inline-block' }
};

export default AdminDashboard;