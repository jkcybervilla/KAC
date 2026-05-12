import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserDataAndProjects = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        // ১. লগইন করা ইউজারের ডাটা (Role এবং Name) আনা
        const userDoc = await getDoc(doc(db, "users", String(user.uid)));
        if (userDoc.exists()) {
          const userDetails = userDoc.data();
          setUserData(userDetails);

          // ২. রোলের ওপর ভিত্তি করে প্রজেক্ট ফেচ করা
          let q;
          if (userDetails.role === 'admin') {
            // অ্যাডমিন হলে সব প্রজেক্ট দেখবে
            q = query(collection(db, "projects"));
          } else if (userDetails.role === 'accountant') {
            // অ্যাকাউন্ট্যান্ট হলে শুধু তার নামের প্রজেক্ট দেখবে
            // নিশ্চিত করুন Firestore-এ ACCOUNTANT ফিল্ডের নাম এবং ইউজারের নাম একই
            q = query(collection(db, "projects"), where("ACCOUNTANT", "==", userDetails.name));
          } else if (userDetails.role === 'coordinator') {
            // কো-অর্ডিনেটর হলে তার প্রজেক্ট দেখবে
            q = query(collection(db, "projects"), where("CO_ORDINATOR", "==", userDetails.name));
          }

          const querySnapshot = await getDocs(q);
          const projectList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProjects(projectList);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndProjects();
  }, [navigate]);

  if (loading) return <div style={styles.loading}>Authenticating Gateway...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>KAC <span style={{color: '#0055ff'}}>DASHBOARD</span></h1>
        <p style={styles.userGreet}>Welcome, {userData?.name} ({userData?.role})</p>
      </header>

      <div style={styles.tableWrapper}>
        <h3 style={styles.sectionTitle}>
          {userData?.role === 'admin' ? "All Projects Summary" : "Your Assigned Projects"}
        </h3>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thr}>
              <th>PROJECT NAME</th>
              <th>TYPE</th>
              <th>GAP</th>
              <th>DPR STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => (
              <tr key={proj.id} style={styles.tr}>
                <td style={styles.projName}>{proj.PROJECT_NAME}</td>
                <td style={styles.td}>{proj.TYPE}</td>
                <td style={{...styles.td, color: parseInt(proj.GAP) > 0 ? '#ef4444' : '#22c55e'}}>
                  {proj.GAP}
                </td>
                <td style={styles.td}>{proj.DPR_STATUS || 'PENDING'}</td>
                <td>
                  <button 
                    style={styles.viewBtn}
                    onClick={() => navigate(`/project/${proj.id}`)}
                  >
                    MANAGE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && <p style={styles.noData}>No projects assigned to you yet.</p>}
      </div>
    </div>
  );
};

// স্টাইলগুলো আগের মতোই থাকবে, শুধু কিছু ছোট পরিবর্তন:
const styles = {
  container: { padding: '40px', backgroundColor: '#050505', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
  header: { marginBottom: '30px', borderBottom: '1px solid #111', paddingBottom: '20px' },
  title: { fontSize: '24px', fontWeight: '900', margin: 0 },
  userGreet: { fontSize: '12px', color: '#555', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' },
  loading: { color: '#fff', textAlign: 'center', marginTop: '20%', fontFamily: 'Inter' },
  tableWrapper: { backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '8px', border: '1px solid #111' },
  sectionTitle: { fontSize: '14px', color: '#888', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thr: { textAlign: 'left', color: '#444', fontSize: '11px', borderBottom: '1px solid #111' },
  tr: { borderBottom: '1px solid #0f0f0f' },
  projName: { padding: '15px 0', fontSize: '14px', fontWeight: '600' },
  td: { fontSize: '13px', color: '#888' },
  viewBtn: { backgroundColor: '#0055ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  noData: { textAlign: 'center', color: '#444', marginTop: '20px', fontSize: '14px' }
};

export default Dashboard;