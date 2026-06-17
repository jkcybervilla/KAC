import React, { useState, useEffect, useRef, useCallback } from 'react';
import SecuritySettings from '../../components/SecuritySettings';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { performLogout } from '../../utils/logout';
import { isTwaMode } from '../../utils/pwa';
import useSwipeToOpenSidebar from '../../hooks/useSwipeToOpenSidebar';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import {
  LayoutDashboard, Folder, Users, ClipboardCheck,
  UserPlus, Wallet, Package, ReceiptText,
  MessageSquare, Bell, LogOut, ChevronLeft, ChevronRight,
  Building2, Building, Clock, UserCheck, CreditCard, FileText, UserMinus, Edit3, Activity,
  UserX, ClipboardList, AlertTriangle, Settings, Globe, Shield, Database, Sliders,
  Truck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ThemeToggle from '../../components/ThemeToggle';
import AdminChat from '../../components/AdminChat';
import IndiaProjectMap from '../../components/IndiaProjectMap';
import { useAuth } from '../../context/AuthContext';
import KACLogo from '../../assets/logo.png';
import ProjectsPage from '../project/ProjectsPage';
import AttendanceHub from '../Attendance/AttendanceHub';
import WorkActivity from '../project/WorkActivity';
import WorkerRegisterHub from '../WorkerRegistration/WorkerRegisterHub';
import StaffManagement from '../user/StaffManagement';
import VendorManagement from './VendorManagement';
import VehicleManagement from './VehicleManagement';
import ActivityLog from './ActivityLog';
import ClientManagement from './ClientManagement';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [selectedAdminMenu, setSelectedAdminMenu] = useState('overview');

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Stats from Firestore
  const [stats, setStats] = useState({
    totalWorkers: 0,
    attendanceSubmitted: 0,
    attendancePending: 0,
    activitySubmitted: 0,
    activityPending: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const userMenuRef = useRef(null);
  const twaMode = isTwaMode();

  // Debounce ref for sidebar collapse to prevent flicker
  const collapseTimeoutRef = useRef(null);

  const handleSidebarEnter = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setIsCollapsed(false);
  }, []);

  const handleSidebarLeave = useCallback(() => {
    collapseTimeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 50);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  // Right swipe from left edge opens/expands sidebar (Android TWA only)
  useSwipeToOpenSidebar(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  });

  // Get current batch
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  const currentBatchId = `batch_${currentMonth}_${currentYear}`;

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const nSnap = await getDocs(query(collection(db, 'notifications'), orderBy('createdAt', 'desc')));
        const notifs = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotifications(notifs);
      } catch (err) {
        console.error('Notifications fetch error:', err);
      }
    };
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notification panel and user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle browser back/forward button for inline dashboard views
  useEffect(() => {
    const reverseMenuMap = {
      'overview': 'Dashboard', 'projects': 'Projects', 'work-activity': 'Work Activity',
      'attendance': 'Attendance', 'dpr': 'DPR Status', 'worker-reg': 'Worker Reg.',
      'user-manager': 'User Manager', 'vendors': 'Vendors', 'clients': 'Clients', 'vehicles': 'Vehicles',
      'payroll': 'Payroll', 'inventory': 'Inventory', 'expense': 'Expense',
      'activity-log': 'Activity Log', 'chat': 'Live Chat', 'settings': 'Settings',
    };
    const handlePopState = (e) => {
      if (e.state?.menu) {
        setSelectedAdminMenu(e.state.menu);
        setActiveMenu(reverseMenuMap[e.state.menu] || 'Dashboard');
      } else {
        setActiveMenu('Dashboard');
        setSelectedAdminMenu('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'WORKER_ADDED': return '✅';
      case 'WORKER_CLOSED': return '🔒';
      case 'WORKER_REJECTED': return '❌';
      default: return '📌';
    }
  };

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
    performLogout();
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
  { name: 'Clients', icon: <Building size={20}/> },
  { name: 'Vehicles', icon: <Truck size={20}/>, path: '/vehicle-management' },
  { name: 'Payroll', icon: <Wallet size={20}/> },
  { name: 'Inventory', icon: <Package size={20}/> },
  { name: 'Expense', icon: <ReceiptText size={20}/> },
  { name: 'Activity Log', icon: <Activity size={20}/>, path: '/activity-log' },
  { name: 'Live Chat', icon: <MessageSquare size={20}/> },
  { name: 'Settings', icon: <Settings size={20}/> },
];

  const handleMenuClick = (item) => {
    setActiveMenu(item.name);
    const menuMap = {
      'Dashboard': { key: 'overview', path: '/admin' },
      'Projects': { key: 'projects', path: '/admin/projects' },
      'Work Activity': { key: 'work-activity', path: '/admin/work-activity' },
      'Attendance': { key: 'attendance', path: '/admin/attendance' },
      'DPR Status': { key: 'dpr', path: '/admin/dpr' },
      'Worker Reg.': { key: 'worker-reg', path: '/admin/worker-reg' },
      'User Manager': { key: 'user-manager', path: '/admin/user-manager' },
      'Vendors': { key: 'vendors', path: '/admin/vendors' },
      'Clients': { key: 'clients', path: '/admin/clients' },
      'Vehicles': { key: 'vehicles', path: '/admin/vehicles' },
      'Payroll': { key: 'payroll', path: '/admin/payroll' },
      'Inventory': { key: 'inventory', path: '/admin/inventory' },
      'Expense': { key: 'expense', path: '/admin/expense' },
      'Activity Log': { key: 'activity-log', path: '/admin/activity-log' },
      'Live Chat': { key: 'chat', path: '/admin/chat' },
      'Settings': { key: 'settings', path: '/admin/settings' },
    };
    const entry = menuMap[item.name];
    if (entry) {
      setSelectedAdminMenu(entry.key);
      window.history.pushState({ menu: entry.key }, '', entry.path);
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
        .sidebar-nav-scroll { overflow-y: auto; overflow-x: hidden; flex: 1; min-height: 0; -ms-overflow-style: none; scrollbar-width: none; }
        .sidebar-nav-scroll::-webkit-scrollbar { display: none; }
        .sidebar-logout-btn:hover { background-color: rgba(239, 68, 68, 0.1) !important; transform: translateX(4px); }
        .overview-card { transition: all 0.2s ease !important; }
        .overview-card:hover { transform: translateY(-2px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; border-color: #0055ff40 !important; }
        .overview-card:active { transform: translateY(0px) !important; }
        .activity-item { transition: all 0.2s ease !important; }
        .activity-item:hover { background-color: var(--surface-2) !important; transform: translateX(4px); }
        .activity-log-container { max-height: 500px; overflow-y: auto; }
        .activity-log-container::-webkit-scrollbar { width: 6px; }
        .activity-log-container::-webkit-scrollbar-track { background: transparent; }
        .activity-log-container::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
      `}</style>
      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <aside
        style={{ ...styles.sidebar, width: isCollapsed ? '80px' : '260px' }}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
      >
        <div style={styles.sidebarHeader}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '10px' }}>
              <img src={KACLogo} alt="KAC" style={{ height: isCollapsed ? '32px' : '40px', width: isCollapsed ? '32px' : 'auto', borderRadius: '6px', flexShrink: 0 }} />
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', opacity: isCollapsed ? 0 : 1, visibility: isCollapsed ? 'hidden' : 'visible', transition: 'opacity 0.15s ease-in-out, visibility 0.15s ease-in-out' }}>KAC <span style={{ color: '#0055ff' }}>CORE</span></span>
            </div>
        </div>

        <div style={styles.navMenuContainer} className="sidebar-nav-scroll">
          <nav style={styles.nav}>
            {menuItems.map((item) => (
              <div 
                key={item.name} 
                onClick={() => handleMenuClick(item)}
                style={{ ...(activeMenu === item.name ? styles.activeNavItem : styles.navItem), justifyContent: isCollapsed ? 'center' : 'flex-start', paddingLeft: isCollapsed ? '0' : '15px', paddingRight: isCollapsed ? '0' : '15px' }}
                className="sidebar-nav-item"
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ marginLeft: isCollapsed ? '0' : '15px', whiteSpace: 'nowrap', overflow: 'hidden', opacity: isCollapsed ? 0 : 1, visibility: isCollapsed ? 'hidden' : 'visible', transition: 'opacity 0.15s ease-in-out, visibility 0.15s ease-in-out' }}>{item.name}</span>
              </div>
            ))}
          </nav>

          <ThemeToggle collapsed={isCollapsed} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', marginBottom: 8, transition: 'justify-content 0.15s ease-in-out' }} />

          <button onClick={handleLogout} style={{ ...styles.logoutBtn, justifyContent: isCollapsed ? 'center' : 'flex-start' }} className="sidebar-logout-btn">
            <LogOut size={20} style={{ flexShrink: 0 }} />
            <span style={{ marginLeft: isCollapsed ? '0' : '15px', whiteSpace: 'nowrap', overflow: 'hidden', opacity: isCollapsed ? 0 : 1, visibility: isCollapsed ? 'hidden' : 'visible', transition: 'opacity 0.15s ease-in-out, visibility 0.15s ease-in-out' }}>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div style={styles.main}>
        <header style={styles.topBar}>
          <div style={styles.topBarBranding}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, background: 'linear-gradient(135deg, #0055ff, #4a6cf7, #0055ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.3px' }}>{activeMenu}</h2>
          </div>
          <div style={styles.topIcons}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)} ref={notifRef}>
            <div style={styles.notifIcon}>
              <Bell size={20} />
              {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
            </div>
            {showNotifications && (
              <div style={styles.notifPanel}>
                <div style={styles.notifPanelHeader}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} style={styles.markAllReadBtn}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={styles.notifPanelList}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: '#666', fontSize: 13 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 50).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        style={{
                          ...styles.notifItem,
                          backgroundColor: n.read ? 'transparent' : 'rgba(0,85,255,0.05)',
                          borderLeft: n.read ? '3px solid transparent' : '3px solid #0055ff',
                        }}
                      >
                        <div style={styles.notifItemIcon}>{getNotifIcon(n.type)}</div>
                        <div style={styles.notifItemContent}>
                          <p style={styles.notifItemMsg}>{n.message}</p>
                          <p style={styles.notifItemMeta}>
                            {n.performedBy} · {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <div
                style={{ ...styles.profile, cursor: 'pointer' }}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div style={styles.avatar}>A</div>
                <span>ADMIN</span>
              </div>
              {showUserMenu && (
                <div style={styles.userMenu}>
                  {/* Only show Security Settings in TWA mode */}
                  {twaMode && (
                    <>
                      <div style={styles.userMenuItem} onClick={() => { setShowUserMenu(false); setShowSecuritySettings(true); }}>
                        <span style={styles.userMenuIcon}>🔒</span>
                        <span>Security Settings</span>
                      </div>
                      <div style={styles.userMenuDivider} />
                    </>
                  )}
                  <div style={{ ...styles.userMenuItem, color: '#ef4444' }} onClick={() => { setShowUserMenu(false); handleLogout(); }}>
                    <span style={styles.userMenuIcon}>🚪</span>
                    <span>Logout</span>
                  </div>
                </div>
              )}
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
          ) : selectedAdminMenu === 'settings' ? (
            <AdminSettingsView />
          ) : selectedAdminMenu === 'projects' ? (
            <ProjectsPage />
          ) : selectedAdminMenu === 'attendance' ? (
            <AttendanceHub />
          ) : selectedAdminMenu === 'work-activity' ? (
            <WorkActivity />
          ) : selectedAdminMenu === 'worker-reg' ? (
            <WorkerRegisterHub />
          ) : selectedAdminMenu === 'user-manager' ? (
            <StaffManagement />
          ) : selectedAdminMenu === 'vendors' ? (
            <VendorManagement />
          ) : selectedAdminMenu === 'clients' ? (
            <ClientManagement />
          ) : selectedAdminMenu === 'vehicles' ? (
            <VehicleManagement />
          ) : selectedAdminMenu === 'activity-log' ? (
            <ActivityLog />
          ) : (
          <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{margin: 0}}>Operational Overview</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted-2)' }}>{formatDate()}</span>
          </div>
          
          <div style={styles.statGrid}>
            <div style={styles.smallCard} onClick={() => navigate('/all-projects')} className="overview-card">
              <small>ACTIVE PROJECTS</small>
              <h3 style={styles.smallCardValue}>20</h3>
            </div>
            <div style={styles.smallCard} onClick={() => navigate('/workforce')} className="overview-card">
              <small>ON-SITE WORKFORCE</small>
              <h3 style={{...styles.smallCardValue, color: '#22c55e'}}>540</h3>
            </div>
            <div style={styles.smallCard} onClick={() => navigate('/expense')} className="overview-card">
              <small>TOTAL EXPENSE (MAY)</small>
              <h3 style={{...styles.smallCardValue, color: '#f59e0b'}}>₹ 45,200</h3>
            </div>
            {/* Attendance Pending Box */}
            <div style={{...styles.smallCard, borderLeft: '4px solid #ef4444'}} onClick={() => navigate('/attendance-sheet')} className="overview-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <small style={{ color: '#ef4444', fontWeight: '700' }}>ATTENDANCE PENDING</small>
                  <h3 style={{ color: '#ef4444', fontSize: '22px', margin: '6px 0 0' }}>
                    {loadingStats ? '...' : stats.attendancePending}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#ef444415', padding: '8px', borderRadius: '8px' }}>
                  <UserX size={20} color="#ef4444" />
                </div>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'var(--muted-2)' }}>
                out of {loadingStats ? '...' : stats.totalWorkers} active workers
                {!loadingStats && stats.attendanceSubmitted > 0 && (
                  <span> · {stats.attendanceSubmitted} submitted</span>
                )}
              </p>
            </div>
            {/* Work Activity Pending Box */}
            <div style={{...styles.smallCard, borderLeft: '4px solid #f59e0b'}} onClick={() => navigate('/work-activity')} className="overview-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <small style={{ color: '#f59e0b', fontWeight: '700' }}>WORK ACTIVITY PENDING</small>
                  <h3 style={{ color: '#f59e0b', fontSize: '22px', margin: '6px 0 0' }}>
                    {loadingStats ? '...' : stats.activityPending}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#f59e0b15', padding: '8px', borderRadius: '8px' }}>
                  <ClipboardList size={20} color="#f59e0b" />
                </div>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'var(--muted-2)' }}>
                out of {loadingStats ? '...' : stats.totalWorkers} active workers
                {!loadingStats && stats.activitySubmitted > 0 && (
                  <span> · {stats.activitySubmitted} submitted</span>
                )}
              </p>
            </div>
          </div>

          <IndiaProjectMap />

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
      {twaMode && showSecuritySettings && (
        <SecuritySettings onClose={() => setShowSecuritySettings(false)} />
      )}
    </div>
  );
};

// ---------- Admin Settings View ----------
const AdminSettingsView = () => {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', label: 'General', icon: <Sliders size={18} /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'projects', label: 'Projects', icon: <Folder size={18} /> },
    { id: 'users', label: 'Users & Roles', icon: <Users size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'data', label: 'Data & Backup', icon: <Database size={18} /> },
    { id: 'regional', label: 'Regional Config', icon: <Globe size={18} /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sliders size={22} color="#0055ff" /> General Settings
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Application Name</p>
                  <p style={sett.desc}>KAC CORE — Construction Management System</p>
                </div>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Timezone</p>
                  <p style={sett.desc}>Asia/Calcutta (UTC +5:30)</p>
                </div>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Date Format</p>
                  <p style={sett.desc}>DD/MM/YYYY (Indian Standard)</p>
                </div>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Currency</p>
                  <p style={sett.desc}>Indian Rupee (₹)</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <MessageSquare size={22} color="#0055ff" /> Chat Settings
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Enable Live Chat</p>
                  <p style={sett.desc}>Allow accountants and coordinators to send messages to admin</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Auto-Reply to Common Queries</p>
                  <p style={sett.desc}>Send automated responses for frequently asked questions</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Chat History Retention (Days)</p>
                  <p style={sett.desc}>How long to keep chat messages before auto-deletion</p>
                </div>
                <select style={sett.select}>
                  <option>30 days</option>
                  <option>60 days</option>
                  <option selected>90 days</option>
                  <option>180 days</option>
                  <option>Forever</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={22} color="#0055ff" /> Notification Preferences
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Worker Registration</p>
                  <p style={sett.desc}>Get notified when a new worker is added or approved</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Worker Status Changes</p>
                  <p style={sett.desc}>Get notified when a worker is closed or deactivated</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Attendance Alerts</p>
                  <p style={sett.desc}>Get notified when attendance is pending for the day</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Work Activity Alerts</p>
                  <p style={sett.desc}>Get notified when work activity reports are overdue</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Email Notifications</p>
                  <p style={sett.desc}>Receive notification summaries via email</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'projects':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Folder size={22} color="#0055ff" /> Project Settings
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Default Project Status</p>
                  <p style={sett.desc}>Status assigned to newly created projects</p>
                </div>
                <select style={sett.select}>
                  <option>ACTIVE</option>
                  <option>INACTIVE</option>
                  <option>COMPLETED</option>
                  <option>ON HOLD</option>
                </select>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Allow Accountants to Create Projects</p>
                  <p style={sett.desc}>Grant project creation permission to accountant-level users</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Auto-Archive Completed Projects</p>
                  <p style={sett.desc}>Automatically archive projects marked as COMPLETED after 30 days</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={22} color="#0055ff" /> Users & Roles
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>User Registration</p>
                  <p style={sett.desc}>Allow new user registrations (requires admin approval)</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Default User Role</p>
                  <p style={sett.desc}>Role assigned to newly registered users</p>
                </div>
                <select style={sett.select}>
                  <option>Accountant</option>
                  <option>Coordinator</option>
                  <option selected>Viewer</option>
                </select>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Session Timeout (Minutes)</p>
                  <p style={sett.desc}>Auto-logout after period of inactivity</p>
                </div>
                <select style={sett.select}>
                  <option>15 min</option>
                  <option selected>30 min</option>
                  <option>60 min</option>
                  <option>120 min</option>
                  <option>Never</option>
                </select>
              </div>
            </div>

            {/* Role Access Control */}
            <h4 style={{ margin: '24px 0 16px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0055ff' }}>
              <Shield size={18} /> ROLE ACCESS CONTROL
            </h4>
            <div style={sett.card}>
              {[
                { role: 'Coordinator', pages: 'Dashboard, Projects (view only), DPR View' },
                { role: 'Accountant', pages: 'Dashboard, Projects, DPR View, JMC View, Work Activity' },
                { role: 'HR Assistant', pages: 'Dashboard, Worker Registration, Attendance (view)' },
                { role: 'Super Admin', pages: 'Full access to all modules including User Manager, Activity Log' },
                { role: 'Executive Assistant', pages: 'Dashboard, Calendar, Tasks, Communications' },
              ].map((item, i) => (
                <div key={i} style={sett.row}>
                  <div>
                    <p style={sett.label}>{item.role}</p>
                    <p style={sett.desc}>{item.pages}</p>
                  </div>
                  <a href="/user-manager" style={{ ...sett.exportBtn, textDecoration: 'none', fontSize: 10 }}>
                    MANAGE USERS
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      case 'security':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={22} color="#0055ff" /> Security Settings
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Two-Factor Authentication (2FA)</p>
                  <p style={sett.desc}>Require OTP verification for admin login</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Login Alerts</p>
                  <p style={sett.desc}>Get notified via email for new admin logins</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>IP Whitelisting</p>
                  <p style={sett.desc}>Restrict access to specific IP addresses</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'data':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database size={22} color="#0055ff" /> Data & Backup
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Auto-Backup</p>
                  <p style={sett.desc}>Automatically backup data to cloud storage</p>
                </div>
                <label style={sett.toggle}>
                  <input type="checkbox" defaultChecked style={sett.checkbox} />
                  <span style={sett.slider}></span>
                </label>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Backup Frequency</p>
                  <p style={sett.desc}>How often to create automatic backups</p>
                </div>
                <select style={sett.select}>
                  <option>Daily</option>
                  <option selected>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Data Export</p>
                  <p style={sett.desc}>Export all system data (attendance, workers, activities)</p>
                </div>
                <button style={sett.exportBtn}>EXPORT DATA</button>
              </div>
            </div>
          </div>
        );
      case 'regional':
        return (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe size={22} color="#0055ff" /> Regional Configuration
            </h3>
            <div style={sett.card}>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Language</p>
                  <p style={sett.desc}>Application interface language</p>
                </div>
                <select style={sett.select}>
                  <option>English</option>
                  <option>Hindi</option>
                </select>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Regional Zones</p>
                  <p style={sett.desc}>Manage construction zones/regions (NR1, NER, WR1, WR2, SR1)</p>
                </div>
                <button style={sett.exportBtn}>MANAGE ZONES</button>
              </div>
              <div style={sett.row}>
                <div>
                  <p style={sett.label}>Holiday Calendar</p>
                  <p style={sett.desc}>Configure public holidays for attendance calculations</p>
                </div>
                <button style={sett.exportBtn}>MANAGE HOLIDAYS</button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={sett.container}>
      <h2 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Settings size={24} color="#0055ff" /> Settings
      </h2>
      <p style={{ margin: '-12px 0 24px 0', fontSize: 13, color: 'var(--muted-2)' }}>
        Configure system preferences, notifications, users, and more
      </p>
      <div style={sett.layout}>
        <div style={sett.sidebar}>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                ...sett.sidebarItem,
                backgroundColor: activeSection === sec.id ? 'rgba(0,85,255,0.1)' : 'transparent',
                borderLeft: activeSection === sec.id ? '3px solid #0055ff' : '3px solid transparent',
                color: activeSection === sec.id ? '#0055ff' : 'var(--text-soft)',
              }}
            >
              {sec.icon}
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
        <div style={sett.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Settings styles
const sett = {
  container: {},
  layout: { display: 'flex', gap: 24, minHeight: 'calc(100vh - 240px)' },
  sidebar: { width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  sidebarItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    borderRadius: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: 'none', background: 'none', textAlign: 'left', width: '100%',
    transition: 'all 0.2s ease',
  },
  content: { flex: 1 },
  card: {
    backgroundColor: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid var(--border)',
  },
  label: { margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  desc: { margin: '4px 0 0', fontSize: 12, color: 'var(--muted-2)', maxWidth: 400 },
  toggle: { position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' },
  checkbox: { opacity: 0, width: 0, height: 0 },
  slider: {
    position: 'absolute', cursor: 'pointer', inset: 0, backgroundColor: '#333',
    borderRadius: 24, transition: '0.3s',
  },
  select: {
    backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)',
    color: 'var(--text)', padding: '8px 12px', borderRadius: 6, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', outline: 'none',
  },
  exportBtn: {
    backgroundColor: '#0055ff', color: '#fff', border: 'none',
    padding: '8px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
    cursor: 'pointer',
  },
};

const styles = {
  layout: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },
  
  sidebar: { background: 'linear-gradient(180deg, rgba(0, 85, 255, 0.05) 0%, transparent 50%, transparent 100%)', borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', transition: 'all 0.15s ease-in-out', padding: '20px 10px', willChange: 'width', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(0)' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 10px' },
  logo: { fontSize: '18px', fontWeight: '900', margin: 0 },
  toggleBtn: { background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', padding: '5px' },
  navMenuContainer: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' },
  nav: { display: 'flex', flexDirection: 'column', gap: '5px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-soft)', transition: '0.2s' },
  activeNavItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', backgroundColor: 'var(--surface-2)', borderLeft: '4px solid #0055ff' },
  logoutBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },

  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { height: '70px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px' },
  topBarBranding: { display: 'flex', alignItems: 'center' },
  input: { backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text)', padding: '10px 20px', borderRadius: '30px', width: '300px' },
  topIcons: { display: 'flex', alignItems: 'center', gap: '25px' },
  notifIcon: { position: 'relative', cursor: 'pointer' },
  badge: { position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700, minWidth: '18px', textAlign: 'center' },
  notifPanel: { position: 'absolute', top: '100%', right: 0, marginTop: 12, width: 380, maxHeight: 480, backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  notifPanelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #1a1a1a' },
  markAllReadBtn: { background: 'none', border: '1px solid #333', color: '#0055ff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 },
  notifPanelList: { flex: 1, overflowY: 'auto', maxHeight: 400 },
  notifItem: { display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #111', transition: 'background 0.2s' },
  notifItemIcon: { fontSize: 18, flexShrink: 0, marginTop: 2 },
  notifItemContent: { flex: 1, minWidth: 0 },
  notifItemMsg: { margin: 0, fontSize: 13, color: '#ddd', lineHeight: 1.4 },
  notifItemMeta: { margin: '4px 0 0', fontSize: 11, color: '#666' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0055ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
  userMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 12,
    width: 220,
    backgroundColor: '#0a0a0a',
    border: '1px solid #1a1a1a',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  userMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    transition: 'background 0.2s',
  },
  userMenuIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  userMenuDivider: { height: 1, backgroundColor: '#1a1a1a', margin: 0 },

  content: { padding: '40px', overflowY: 'auto', flex: 1 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '30px' },
  card: { backgroundColor: 'var(--surface)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border)' },
  smallCard: { backgroundColor: 'var(--surface)', padding: '16px 18px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s ease' },
  smallCardValue: { fontSize: '24px', margin: '6px 0 0' },
  
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