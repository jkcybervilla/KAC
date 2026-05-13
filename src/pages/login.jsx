import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userIdText = String(userCredential.user.uid); 
      const userDoc = await getDoc(doc(db, "users", userIdText));

      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === 'admin') navigate('/admin');
        else if (role === 'accountant') navigate('/accountant');
        else navigate('/coordinator');
      }
    } catch (error) {
      alert("Verification Failed!");
    } finally {
      setLoading(false);
    }
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
  },
  mainCard: {
    display: 'flex',
    backgroundColor: '#fff',
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
  },
  brandTag: { color: '#0055ff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '15px' },
  brandName: { margin: '0', lineHeight: '0.8', fontWeight: '900', letterSpacing: '-2px' },
  brandSub: { letterSpacing: '8px', fontSize: '14px', marginTop: '20px', color: '#0055ff', fontWeight: 'bold' },
  description: { fontSize: '14px', color: '#555', marginTop: '40px', lineHeight: '1.6', maxWidth: '350px' },
  gateWay: { fontSize: '40px', fontWeight: '900', margin: '0', color: '#000', letterSpacing: '-1px' },
  authText: { fontSize: '12px', letterSpacing: '4px', color: '#ccc', marginBottom: '60px', fontWeight: 'bold' },
  inputGroup: { marginBottom: '35px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#bbb', marginBottom: '10px', display: 'block', letterSpacing: '1px' },
  input: { width: '100%', border: 'none', borderBottom: '1px solid #eee', padding: '10px 0', outline: 'none', fontSize: '16px' },
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
  }
};

export default Login;