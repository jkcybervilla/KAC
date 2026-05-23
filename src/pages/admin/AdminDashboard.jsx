import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  LayoutDashboard, Folder, Users, ClipboardCheck,
  UserPlus, Wallet, Package, ReceiptText,
  MessageSquare, Bell, LogOut, ChevronLeft, ChevronRight,
  Building2, Clock, UserCheck, CreditCard, FileText, UserMinus, Edit3, Activity,
  UserX, ClipboardList, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../../components/ThemeToggle';
import AdminChat from '../../components/AdminChat';
import { useAuth } from '../../context/AuthContext';
import KACLogo from '../../assets/LOGO 1.png';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [selectedAdminMenu, setSelectedAdminMenu] = useState('overview');

  // Stats from Firestore
  const [stats, setStats] = useState({
    totalWorkers: 0,
    attendanceSubmitted: 0,
    attendancePending: 0,
    activitySubmitted: 0,
    activityPending: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Get current batch
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const currentBatchId = `batch_${currentMonth}_${currentYear}`;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch workers
        const wSnap = await getDocs(collection(db, 'workers'));
        const allWorkers = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const activeWorkers = allWorkers.filter(w => (w.STATUS || 'ACTIVE') === 'ACTIVE');
        const totalActive = activeWorkers.length;

        // Fetch attendance for today
        const [aClientSnap, aOfficeSnap] = await Promise.all([
          getDocs(collection(db, 'attendance_client')),
          getDocs(collection(db, 'attendance_office')),
        ]);

        // Collect EMPIDs who have attendance today
        const attendanceEmpIds = new Set();
        [...aClientSnap.docs, ...aOfficeSnap.docs].forEach(d => {
          const data = d.data();
          if (data.batchId === currentBatchId && data.days?.[String(currentDay)] === 'P' && data.EMPID) {
            attendanceEmpIds.add(data.EMPID);
          }
        });

        const attSubmitted = activeWorkers.filter(w => attendanceEmpIds.has(w.EMPID)).length;

        // Fetch work activity for today
        const activitySnap = await getDocs(collection(db, 'work_activity'));
        const activityEmpIds = new Set();
        activitySnap.docs.forEach(d => {
          const data = d.data();
          // Check if activity exists for today's date
          const todayStr = now.toISOString().split('T')[0];
          if (data.date === todayStr && data.EMPID) {
            activityEmpIds.add(data.EMPID);
          }
        });

        const actSubmitted = activeWorkers.filter(w => activityEmpIds.has(w.EMPID)).length;

        setStats({
          totalWorkers: totalActive,
          attendanceSubmitted: attSubmitted,
          attendancePending: totalActive - attSubmitted,
          activitySubmitted: actSubmitted,
          activityPending: totalActive - actSubmitted,
        });
      } catch (err) {
        console.error('Stats fetch error:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentBatchId, currentDay]);

  const data = [
    { name: 'NR 1', workers: 131 },
    { name: 'NER', workers: 48 },
    { name: 'WR 2', workers: 151 },
    { name: 'WR 1', workers: 76 },
    { name: 'SR 1', workers: 16 },
  ];

  const activities = [
    { id: 1, user: 'Rahul Sharma', action: 'added', target: 'Worker Reg.', detail: 'New worker: Mukesh Kumar', time: '2 min ago', icon: <UserPlus size={14} />, color: '#22c55e' },
    { id: 2, user: 'Priya Patel', action: 'updated', target: 'Payroll', detail: 'Salary slip March 2026', time: '15 min ago', icon: <CreditCard size={14} />, color: '#3b82f6' },
    { id: 3, user: 'Amit Singh', action: 'marked', target: 'Attendance', detail: 'Worker attendance: 45 present, 3 absent', time: '32 min ago', icon: <UserCheck size={14} />, color: '#f59e0b' },
    { id: 4, user: 'Sneha Reddy', action: 'submitted', target: 'DPR Status', detail: 'Daily Progress Report - NR 1', time: '1 hr ago', icon: <FileText size={14} />, color: '#8b5cf6' },
    { id: 5, user: 'Vikram Joshi', action: 'updated', target: 'Inventory', detail: 'Cement stock: +200 bags', time: '2 hr ago', icon: <Package size={14} />, color: '#06b6d4' },
    { id: 6, user: 'Ananya Gupta', action: 'approved', target: 'Expense', detail: 'Site material purchase: ₹12,500', time: '3 hr ago', icon: <ReceiptText size={14} />, color: '#ec4899' },
    { id: 7, user: 'Rohit Verma', action: 'edited', target: 'Vendors', detail: 'Updated vendor: Shree Cement Ltd.', time: '4 hr ago', icon: <Edit3 size={14} />, color: '#f97316' },
    { id: 8, user: 'Neha Kapoor', action: 'removed', target: 'Worker Reg.', detail: 'Removed worker: Sunil Yadav', time: '5 hr ago', icon: <UserMinus size={14} />, color: '#ef4444' },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

const menuItems = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/admin' },
  { name: 'Projects', icon: <Folder size={20}/>, path: '/all-projects' },
  { name: 'Work Activity', icon: <ReceiptText size={20}/>, path: '/work-activity' },
  { name: 'Attendance', icon: <ClipboardCheck size={20}/>, path: '/attendance-sheet' }, 
  { name: 'DPR Status', icon: <ReceiptText size={20}/> },
  { name: 'Worker Reg.', icon: <UserPlus size={20}/>, path: '/register-worker' },
  { name: 'User Manager', icon: <Users size={20}/>, path: '/user-manager' },
  { name: 'Vendors', icon: <Building2 size={20}/>, path: '/vendor-management' },
  { name: 'Payroll', icon: <Wallet size={20}/> },
  { name: 'Inventory', icon: <Package size={20}/> },
  { name: 'Expense', icon: <ReceiptText size={20}/> },
  { name: 'Activity Log', icon: <Activity size={20}/>, path: '/activity-log' },
  { name: 'Live Chat', icon: <MessageSquare size={20}/> },
];

  const handleMenuClick = (item) => {
    setActiveMenu(item.name);
    if (item.name === 'Live Chat') {
      setSelectedAdminMenu('chat');
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const formatDate = () => {
    return now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={styles.layout}>
      <style>{`
        .sidebar-nav-item { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .sidebar-nav-item:hover { background-color: var(--surface-2) !important; transform: translateX(4px); color: var(--text) !important; }
        .sidebar-nav-item:hover svg { color: #0055ff !important; }
        .sidebar-toggle-btn { transition: all 0.25s ease !important; }
        .sidebar-toggle-btn:hover { background-color: var(--border-strong) !important; transform: scale(1.05); }
        .sidebar-logout-btn { transition: all 0.25s ease !important; border-radius: 8px !important; padding: 12px 15px !important; }
        .sidebar-logout-btn:hover { background-color: rgba(239, 68, 68, 0.1) !important; transform: translateX(4px); }
        .activity-item { transition: all 0.2s ease !important; }
        .activity-item:hover { background-color: var(--surface-2) !important; transform: translateX(4px); }
        .activity-log-container { max-height: 500px; overflow-y: auto; }
        .activity-log-container::-webkit-scrollbar { width: 6px; }
        .activity-log-container::-webkit-scrollbar-track { background: transparent; }
        .activity-log-container::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
      `}</style>
      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <aside style={{ ...styles.sidebar, width: isCollapsed ? '80px' : '260px' }}>
        <div style={styles.sidebarHeader}>
          <button onClick={() => setIsCollapsed(!isCollapsed)} style={styles.toggleBtn} className="sidebar-toggle-btn">
            {isCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <div 
              key={item.name} 
              onClick={() => handleMenuClick(item)}
              style={activeMenu === item.name ? styles.activeNavItem : styles.navItem}
              className="sidebar-nav-item"
            >
              {item.icon}
              {!isCollapsed && <span style={{marginLeft: '15px'}}>{item.name}</span>}
            </div>
          ))}
        </nav>

        <ThemeToggle collapsed={isCollapsed} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', marginBottom: 8 }} />

        <button onClick={handleLogout} style={styles.logoutBtn} className="sidebar-logout-btn">
          <LogOut size={20} />
          {!isCollapsed && <span style={{marginLeft: '15px'}}>Logout</span>}
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={styles.main}>
        <header style={styles.topBar}>
          <div style={styles.topBarBranding}>
            <img src={KACLogo} alt="KAC CORE Logo" style={{ height: '50px', marginRight: '10px' }} />
            <h2 style={styles.logo}>KAC <span style={{ color: '#0055ff' }}>CORE</span></h2>
          </div>
          <div style={styles.topIcons}>
            <div style={styles.notifIcon}>
              <Bell size={20} />
              <span style={styles.badge}>3</span>
            </div>
            <div style={styles.profile}>
              <div style={styles.avatar}>A</div>
              <span>ADMIN</span>
            </div>
          </div>
        </header>

        {/* Dashboard Home Content */}
        <div style={styles.content}>
          {selectedAdminMenu === 'chat' ? (
            <div style={{ height: 'calc(100vh - 160px)' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquare size={24} color="#0055ff" /> Live Chat
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted-2)' }}>
                  Reply to messages from accountants and coordinators
                </p>
              </div>
              <AdminChat user={profile} />
            </div>
          ) : (
          <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{margin: 0}}>Operational Overview</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>{formatDate()}</span>
          </div>
          
          <div style={styles.statGrid}>
            <div style={styles.card}>
              <small>ACTIVE PROJECTS</small>
              <h3>20</h3>
            </div>
            <div style={styles.card}>
              <small>ON-SITE WORKFORCE</small>
              <h3 style={{color: '#22c55e'}}>540</h3>
            </div>
            <div style={styles.card}>
              <small>TOTAL EXPENSE (MAY)</small>
              <h3 style={{color: '#f59e0b'}}>₹ 45,200</h3>
            </div>
            {/* Attendance Pending Box */}
            <div style={{...styles.card, borderLeft: '4px solid #ef4444'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <small style={{ color: '#ef4444', fontWeight: '700' }}>ATTENDANCE PENDING</small>
                  <h3 style={{ color: '#ef4444', fontSize: '28px', margin: '8px 0 0' }}>
                    {loadingStats ? '...' : stats.attendancePending}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#ef444415', padding: '10px', borderRadius: '10px' }}>
                  <UserX size={24} color="#ef4444" />
                </div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--muted-2)' }}>
                out of {loadingStats ? '...' : stats.totalWorkers} active workers
                {!loadingStats && stats.attendanceSubmitted > 0 && (
                  <span> · {stats.attendanceSubmitted} submitted</span>
                )}
              </p>
            </div>
            {/* Work Activity Pending Box */}
            <div style={{...styles.card, borderLeft: '4px solid #f59e0b'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <small style={{ color: '#f59e0b', fontWeight: '700' }}>WORK ACTIVITY PENDING</small>
                  <h3 style={{ color: '#f59e0b', fontSize: '28px', margin: '8px 0 0' }}>
                    {loadingStats ? '...' : stats.activityPending}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#f59e0b15', padding: '10px', borderRadius: '10px' }}>
                  <ClipboardList size={24} color="#f59e0b" />
                </div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--muted-2)' }}>
                out of {loadingStats ? '...' : stats.totalWorkers} active workers
                {!loadingStats && stats.activitySubmitted > 0 && (
                  <span> · {stats.activitySubmitted} submitted</span>
                )}
              </p>
            </div>
          </div>

          <div style={styles.chartActivityRow}>
            <div style={styles.chartBox}>
              <h3>Regional Workforce Distribution</h3>
              <div style={{height: '300px', width: '100%', marginTop: '20px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
                    <YAxis stroke="var(--muted)" fontSize={12} />
                    <Tooltip contentStyle={{backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-strong)'}} />
                    <Bar dataKey="workers" fill="#0055ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.activityLogBox}>
              <div style={styles.activityLogHeader}>
                <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Clock size={18} /> Recent Activity
                </h3>
                <span style={styles.activityCount}>{activities.length} updates</span>
              </div>
              <div className="activity-log-container">
                {activities.map((activity) => (
                  <div key={activity.id} className="activity-item" style={styles.activityItem}>
                    <div style={{...styles.activityIconWrapper, backgroundColor: activity.color + '20', color: activity.color}}>
                      {activity.icon}
                    </div>
                    <div style={styles.activityContent}>
                      <div style={styles.activityText}>
                        <strong>{activity.user}</strong> {activity.action} <span style={{color: '#0055ff'}}>{activity.target}</span>
                      </div>
                      <div style={styles.activityDetail}>{activity.detail}</div>
                    </div>
                    <div style={styles.activityTime}>{activity.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },
  
  sidebar: { background: 'linear-gradient(180deg, rgba(0, 85, 255, 0.05) 0%, transparent 50%, transparent 100%)', borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding: '20px 10px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 10px' },
  logo: { fontSize: '18px', fontWeight: '900', margin: 0 },
  toggleBtn: { background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', padding: '5px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted-2)', transition: '0.2s' },
  activeNavItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', backgroundColor: 'var(--surface-2)', borderLeft: '4px solid #0055ff' },
  logoutBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },

  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { height: '70px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px' },
  topBarBranding: { display: 'flex', alignItems: 'center' },
  input: { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text)', padding: '10px 20px', borderRadius: '30px', width: '300px' },
  topIcons: { display: 'flex', alignItems: 'center', gap: '25px' },
  notifIcon: { position: 'relative', cursor: 'pointer' },
  badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', fontSize: '9px', padding: '2px 5px', borderRadius: '10px' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0055ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },

  content: { padding: '40px', overflowY: 'auto', flex: 1 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  card: { backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border)' },
  
  chartActivityRow: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '40px' },
  chartBox: { backgroundColor: 'var(--surface)', padding: '30px', borderRadius: '15px', border: '1px solid var(--border)' },
  
  activityLogBox: { backgroundColor: 'var(--surface)', borderRadius: '15px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '470px' },
  activityLogHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 15px', borderBottom: '1px solid var(--border)' },
  activityCount: { fontSize: '12px', color: 'var(--muted-2)', backgroundColor: 'var(--surface-2)', padding: '4px 10px', borderRadius: '20px' },
  activityItem: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  activityIconWrapper: { width: '32px', height: '32px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, fontSize: '14px' },
  activityContent: { flex: 1, minWidth: 0 },
  activityText: { fontSize: '13px', lineHeight: '1.4', color: 'var(--text)' },
  activityDetail: { fontSize: '12px', color: 'var(--muted-2)', marginTop: '3px' },
  activityTime: { fontSize: '11px', color: 'var(--muted-2)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' }
};

export default AdminDashboard;