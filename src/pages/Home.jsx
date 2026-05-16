import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <p style={styles.brandTag}>KAC DIGITAL</p>
          <h1 style={styles.brandTitle}>CORE MANAGEMENT</h1>
          <p style={styles.brandText}>
            Welcome to the Kuddus Ali Construction dashboard. Login to manage projects, attendance, and team operations.
          </p>
        </div>

        <div style={styles.actions}>
          <Link to="/login" style={styles.primaryButton}>
            Login
          </Link>
          <p style={styles.infoText}>Only registered users can access the dashboard.</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #000814 0%, #001d3d 100%)',
    color: '#fff',
    padding: '24px',
    fontFamily: 'Inter, sans-serif',
  },
  card: {
    maxWidth: '880px',
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    boxShadow: '0 40px 120px rgba(0, 0, 0, 0.35)',
    padding: '40px',
    backdropFilter: 'blur(24px)',
  },
  brand: {
    marginBottom: '40px',
  },
  brandTag: {
    color: '#67e8f9',
    fontWeight: '700',
    letterSpacing: '1.8px',
    marginBottom: '18px',
    fontSize: '12px',
  },
  brandTitle: {
    margin: 0,
    fontSize: '52px',
    lineHeight: '1.05',
    letterSpacing: '-2px',
  },
  brandText: {
    marginTop: '20px',
    fontSize: '18px',
    color: '#cbd5e1',
    lineHeight: '1.7',
    maxWidth: '680px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '52px',
    background: '#0055ff',
    color: '#fff',
    padding: '0 24px',
    borderRadius: '999px',
    textDecoration: 'none',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
};

export default Home;
