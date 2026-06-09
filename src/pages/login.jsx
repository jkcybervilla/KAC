import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { markSessionActive } from '../context/AppLockContext';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometricCredential,
  authenticateWithBiometric
} from '../utils/pwa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [lastUserId, setLastUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function checkBiometric() {
      // Check if we have a stored credential and platform authenticator
      const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
      const userIds = Object.keys(stored);
      if (userIds.length > 0) {
        setLastUserId(userIds[0]);
      }

      const available = localStorage.getItem('kac_biometric_available') === 'true';
      if (available) {
        setBiometricAvailable(true);
        return;
      }

      // Fallback to runtime check
      const hasBiometric = await isPlatformAuthenticatorAvailable();
      setBiometricAvailable(hasBiometric);
    }
    checkBiometric();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userIdText = String(userCredential.user.uid); 
      const userDoc = await getDoc(doc(db, "users", userIdText));

      if (userDoc.exists()) {
        // Mark session as active — prevents PIN on refresh
        markSessionActive();

        // Check if biometric is available and offer to set up
        const hasBiometric = await isPlatformAuthenticatorAvailable();
        if (hasBiometric) {
          const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
          if (!stored[userIdText]) {
            setShowBiometricSetup(true);
          }
        }
        navigate('/dashboard');
      }
    } catch (error) {
      alert("Verification Failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!lastUserId) return;
    setBiometricLoading(true);
    try {
      const result = await authenticateWithBiometric(lastUserId);
      if (result) {
        // Biometric verified — now sign in with stored email
        const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
        const credData = stored[lastUserId];
        // Re-fetch user data and navigate
        const userDoc = await getDoc(doc(db, "users", lastUserId));
        if (userDoc.exists()) {
          navigate('/dashboard');
        }
      } else {
        alert('Biometric authentication failed. Please use email & password.');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      alert('Biometric authentication failed.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSetupBiometric = async () => {
    if (!lastUserId) return;
    await registerBiometricCredential(lastUserId, email);
    setShowBiometricSetup(false);
  };

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.mainCard,
        flexDirection: isMobile ? 'column' : 'row',
        width: isMobile ? '100%' : '1000px',
        height: isMobile ? '100vh' : '600px',
      }}>
        
        {/* বাম পাশ: ব্র্যান্ডিং (কালো অংশ) */}
        <div style={{
          ...styles.leftSection,
          padding: isMobile ? '60px 30px' : '100px',
          justifyContent: isMobile ? 'flex-start' : 'center'
        }}>
          <p style={styles.brandTag}>CORE MANAGEMENT</p>
          <h1 style={{...styles.brandName, fontSize: isMobile ? '50px' : '80px'}}>
            KUDDUS<br />ALI
          </h1>
          <div style={styles.blueBar}></div>
          <p style={styles.brandSub}>CONSTRUCTION</p>
          <p style={styles.description}>
            A high-precision ecosystem designed for large-scale industrial oversight and architectural orchestration.
          </p>
        </div>

        {/* ডান পাশ: লগইন ফর্ম (সাদা অংশ) */}
        <div style={{
          ...styles.rightSection,
          padding: isMobile ? '40px 30px' : '80px'
        }}>
          <h2 style={styles.gateWay}>GATE WAY<span style={{color: '#0055ff'}}>.</span></h2>
          <p style={styles.authText}>AUTHENTICATION</p>
          
          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>ACCESS IDENTITY</label>
              <input 
                type="email" 
                style={styles.input} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>SECURITY KEY</label>
              <input 
                type="password" 
                style={styles.input} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button 
              type="submit"
              style={styles.button}
              disabled={loading}
            >
              {loading ? "VERIFYING..." : "AUTHORIZE ENTRY"}
            </button>
          </form>

          {/* Biometric Login Button */}
          {biometricAvailable && lastUserId && !showBiometricSetup && (
            <button
              onClick={handleBiometricLogin}
              style={styles.biometricButton}
              disabled={biometricLoading}
            >
              {biometricLoading ? 'AUTHENTICATING...' : '🔒 SIGN IN WITH BIOMETRIC'}
            </button>
          )}

          {/* Divider */}
          {(biometricAvailable || showBiometricSetup) && (
            <div style={styles.divider}>
              <span style={styles.dividerText}>OR</span>
            </div>
          )}

          {/* Biometric Setup (shown after first login if biometric available) */}
          {showBiometricSetup && (
            <button
              onClick={handleSetupBiometric}
              style={styles.biometricSetupButton}
            >
              ✨ ENABLE FINGERPRINT / FACE LOGIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
    fontFamily: '"Inter", sans-serif',
    colorScheme: 'light',
  },
  mainCard: {
    display: 'flex',
    backgroundColor: '#fff',
    color: '#000',
    colorScheme: 'light',
    overflow: 'hidden',
  },
  leftSection: {
    flex: 1.3,
    backgroundColor: '#000',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  blueBar: {
    width: '4px',
    height: '100px',
    backgroundColor: '#0055ff',
    position: 'absolute',
    left: '0',
    top: '35%',
  },
  rightSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#fff',
    color: '#000',
    colorScheme: 'light',
  },
  brandTag: { color: '#0055ff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '15px' },
  brandName: { margin: '0', lineHeight: '0.8', fontWeight: '900', letterSpacing: '-2px' },
  brandSub: { letterSpacing: '8px', fontSize: '14px', marginTop: '20px', color: '#0055ff', fontWeight: 'bold' },
  description: { fontSize: '14px', color: '#555', marginTop: '40px', lineHeight: '1.6', maxWidth: '350px' },
  gateWay: { fontSize: '40px', fontWeight: '900', margin: '0', color: '#000', letterSpacing: '-1px' },
  authText: { fontSize: '12px', letterSpacing: '4px', color: '#ccc', marginBottom: '60px', fontWeight: 'bold' },
  inputGroup: { marginBottom: '35px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '10px', display: 'block', letterSpacing: '1px' },
  input: { width: '100%', border: 'none', borderBottom: '1px solid #eee', padding: '10px 0', outline: 'none', fontSize: '16px', backgroundColor: '#fff', color: '#000', colorScheme: 'light' },
  button: { 
    width: '100%', 
    padding: '22px', 
    backgroundColor: '#000', 
    color: '#fff', 
    border: 'none', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '13px', 
    letterSpacing: '2px',
    marginTop: '20px'
  },
  biometricButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    letterSpacing: '1px',
    marginTop: '16px',
    borderRadius: '4px',
  },
  biometricSetupButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#f0f4ff',
    color: '#0055ff',
    border: '1px solid #0055ff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
    letterSpacing: '1px',
    marginTop: '8px',
    borderRadius: '4px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '16px 0',
  },
  dividerText: {
    fontSize: '11px',
    color: '#ccc',
    letterSpacing: '2px',
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
  },
};

export default Login;