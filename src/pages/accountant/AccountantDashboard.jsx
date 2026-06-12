import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { performLogout } from '../../utils/logout';
import {
  Home,
  UserPlus,
  ClipboardCheck,
  FileText,
  ReceiptText,
  LogOut,
  Bell,
  Link2,
  ClipboardList,
  MessageSquare,
  MoreVertical,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterProjectsByUser } from '../../utils/projectAccess';
import { getBatchId } from '../../utils/attendance';
import { pageStyles as s } from '../../styles/pageStyles';
import ThemeToggle from '../../components/ThemeToggle';
import SecuritySettings from '../../components/SecuritySettings';
import { isTwaMode } from '../../utils/pwa';
import useSwipeToOpenSidebar from '../../hooks/useSwipeToOpenSidebar';
import ExportToolbar from '../../components/ExportToolbar';
import AccountantWorkerRegistration from './AccountantWorkerRegistration';
import AccountantDailyAttendance from './AccountantDailyAttendance';
import AccountantWorkActivity from './AccountantWorkActivity';
import DprView from '../project/DprView';
import AdminChat from '../../components/AdminChat';
import AccountantHelp from './AccountantHelp';

const MENU = [
  { id: 'home', label: 'HOME', icon: Home },
  { id: 'workers', label: 'WORKER REGISTRATION', icon: UserPlus },
  { id: 'client', label: 'CLIENT ATTENDANCE', icon: ClipboardCheck },
  { id: 'office', label: 'OFFICE ATTENDANCE', icon: ClipboardCheck },
  { id: 'dpr', label: 'DPR', icon: FileText },
  { id: 'activity', label: 'WORK ACTIVITY', icon: ClipboardList },
  { id: 'expense', label: 'EXPENSE', icon: ReceiptText },
  { id: 'chat', label: 'CHAT WITH ADMIN', icon: MessageSquare },
  { id: 'help', label: 'HELP', icon: HelpCircle },
];

const Placeholder = ({ title }) => (
  <div style={{ ...s.chartBox, textAlign: 'center', padding: 60 }}>
    <Link2 size={40} color="#0055ff" style={{ marginBottom: 16 }} />
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ color: 'var(--muted-2)', fontSize: 13 }}>Connected — Comming soon .</p>
  </div>
);

const AccountantDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState('home');
  const [project, setProject] = useState(null);
  const [clientMp, setClientMp] = useState(0);
  const [officeMp, setOfficeMp] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const twaMode = isTwaMode();

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Auto-open triggers for child components
  const [autoOpenWorkerModal, setAutoOpenWorkerModal] = useState(false);
  const [autoOpenActivityForm, setAutoOpenActivityForm] = useState(false);

  // More options menu (3-dot)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Refs for attendance child components (client/office)
  const clientAttendanceRef = useRef(null);
  const officeAttendanceRef = useRef(null);

  const getAttendanceRef = () => {
    if (menu === 'client') return clientAttendanceRef.current;
    if (menu === 'office') return officeAttendanceRef.current;
    return null;
  };

  const moreMenuActions = {
    search: () => {
      const attRef = getAttendanceRef();
      if (attRef && attRef.openSearchPanel) {
        attRef.openSearchPanel();
      }
      setShowMoreMenu(false);
    },
    referenceFilter: () => {
      const attRef = getAttendanceRef();
      if (attRef && attRef.openReferencePanel) {
        attRef.openReferencePanel();
      }
      setShowMoreMenu(false);
    },
    statusFilter: () => {
      const attRef = getAttendanceRef();
      if (attRef && attRef.openStatusPanel) {
        attRef.openStatusPanel();
      }
      setShowMoreMenu(false);
    },
    download: () => {
      setShowMoreMenu(false);
      setShowExportMenu((prev) => !prev);
    },
    settings: () => {
      const attRef = getAttendanceRef();
      if (attRef && attRef.openSettings) {
        attRef.openSettings();
      } else {
        console.log('Settings clicked (no attendance page)');
      }
      setShowMoreMenu(false);
    },
    refresh: () => { console.log('Refresh clicked'); setShowMoreMenu(false); },
  };

  useEffect(() => {
    const pname = project?.PROJECT_NAME || '';
    if (!pname) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientRole', '==', 'accountant'),
      where('recipientProject', '==', pname),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    }, (err) => {
      console.error('Notification listener error:', err);
    });

    return () => unsub();
  }, [project]);

  const unreadCount = notifications.length;

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    const ids = notifications.map((n) => n.id);
    try {
      await Promise.all(ids.map((id) => updateDoc(doc(db, 'notifications', id), { read: true })));
      setNotifications([]);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  // Right swipe from left edge opens sidebar (Android TWA only)
  useSwipeToOpenSidebar(() => setMenuOpen(true));

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const batchId = getBatchId(today.getMonth() + 1, today.getFullYear());
  const day = today.getDate();

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'projects'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = filterProjectsByUser(all, profile);
      if (mine.length) setProject(mine[0]);
    })();
  }, [profile]);

  useEffect(() => {
    if (!project) return;
    (async () => {
      const pname = project.PROJECT_NAME;
      const [wSnap, cSnap, oSnap] = await Promise.all([
        getDocs(collection(db, 'workers')),
        getDocs(collection(db, 'attendance_client')),
        getDocs(collection(db, 'attendance_office')),
      ]);
      const emps = wSnap.docs
        .map((d) => d.data())
        .filter((w) => w.PROJECT === pname && (w.STATUS || 'ACTIVE') === 'ACTIVE')
        .map((w) => w.EMPID);

      let client = 0;
      let office = 0;
      cSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId && emps.includes(data.EMPID) && data.days?.[String(day)] === 'P') client++;
      });
      oSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.batchId === batchId && emps.includes(data.EMPID) && data.days?.[String(day)] === 'P') office++;
      });
      if (!cSnap.size) client = emps.length;
      setClientMp(client);
      setOfficeMp(office);
    })();
  }, [project, batchId, day]);

  const logout = () => {
    performLogout();
    navigate('/');
  };

  const handleGoToWorkers = () => {
    setAutoOpenWorkerModal(true);
    setMenu('workers');
    setMenuOpen(false);
  };

  const handleGoToActivity = () => {
    setAutoOpenActivityForm(true);
    setMenu('activity');
    setMenuOpen(false);
  };

  const renderContent = () => {
    const pname = project?.PROJECT_NAME || '';
    switch (menu) {
      case 'home':
        return (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Welcome card */}
            <div style={{ padding: 24, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Welcome back, {profile?.name || 'Accountant'}.</h2>
              <p style={{ margin: '12px 0 0', color: 'var(--text-soft)', fontSize: 14 }}>
                This is your dashboard home. Select a module from the left menu to manage attendance, worker registration, or expenses.
              </p>
            </div>

            {/* Shortcut buttons */}
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <button
                type="button"
                onClick={handleGoToWorkers}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: '2px solid #0055ff',
                  background: '#0055ff',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0040cc'; e.currentTarget.style.borderColor = '#0040cc'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0055ff'; e.currentTarget.style.borderColor = '#0055ff'; }}
              >
                <UserPlus size={18} />
                Add Worker
              </button>
              <button
                type="button"
                onClick={handleGoToActivity}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: '2px solid #0055ff',
                  background: 'transparent',
                  color: '#0055ff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,85,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Send size={18} />
                Send Activity
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 20, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>Today's Date</span>
                <p style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 700 }}>{dateStr}</p>
              </div>
              <div style={{ padding: 20, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>Current Project</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 18 }}>{project?.PROJECT_NAME || 'No project assigned'}</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>{project?.LINE_NAME ? `Line: ${project.LINE_NAME}` : 'Assign a project to start'}</p>
              </div>
              <div
                style={{ padding: 20, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
              >
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>Attendance Today</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div
                    onClick={() => { setMenu('client'); setMenuOpen(false); }}
                    style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s ease', marginLeft: -8 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{clientMp}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>Client Present</p>
                  </div>
                  <div
                    onClick={() => { setMenu('office'); setMenuOpen(false); }}
                    style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.15s ease', marginRight: -8 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{officeMp}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>Office Present</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'workers':
        return (
          <AccountantWorkerRegistration
            projectName={pname}
            autoOpenModal={autoOpenWorkerModal}
            onAutoOpened={() => setAutoOpenWorkerModal(false)}
          />
        );
      case 'client':
        return <AccountantDailyAttendance ref={clientAttendanceRef} type="client" projectName={pname} />;
      case 'office':
        return <AccountantDailyAttendance ref={officeAttendanceRef} type="office" projectName={pname} />;
      case 'dpr':
        return <DprView />;
      case 'activity':
        return (
          <AccountantWorkActivity
            projectName={pname}
            autoOpenForm={autoOpenActivityForm}
            onAutoOpened={() => setAutoOpenActivityForm(false)}
          />
        );
      case 'expense':
        return <Placeholder title="EXPENSE MODULE" />;
      case 'chat':
        return <AdminChat user={profile} />;
      case 'help':
        return <AccountantHelp projectName={pname} />;
      default:
        return null;
    }
  };

  return (
    <div className="accountant-layout page-container" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className={menuOpen ? 'slidebar-backdrop open' : 'slidebar-backdrop'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'page-aside slidebar open' : 'page-aside slidebar'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, padding: 0, margin: 0 }}>
            KAC <span style={{ color: '#0055ff' }}>ACCOUNTANT</span>
          </h2>
          <button className="slidebar-close-btn" type="button" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        {MENU.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMenu(m.id);
              setMenuOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 4,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: menu === m.id ? 'var(--accent-soft)' : 'transparent',
              color: menu === m.id ? 'var(--text)' : 'var(--text-soft)',
              fontWeight: 'bold',
              fontSize: 12,
              textAlign: 'left',
              width: '100%',
            }}
          >
            <m.icon size={16} />
            {m.label}
          </button>
        ))}

        {twaMode && (
          <button
            type="button"
            onClick={() => {
              setShowSecuritySettings(true);
              setMenuOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 4,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-soft)',
              fontWeight: 'bold',
              fontSize: 12,
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span role="img" aria-label="security">🔒</span>
            Security
          </button>
        )}

        <ThemeToggle style={{ marginTop: 'auto' }} />

        <button type="button" onClick={logout} style={{ ...s.secondaryBtn, width: '100%' }}>
          <LogOut size={14} /> Logout
        </button>
      </aside>

      <main className="page-main" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <header className="page-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--surface)' }}>
          <div className="page-header-inner" style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 0, justifyContent: 'flex-start' }}>
            <button className="slidebar-toggle-btn" type="button" onClick={() => setMenuOpen(!menuOpen)} style={{ flexShrink: 0 }}>
              ☰
            </button>
            {menu !== 'home' && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 10, flexShrink: 1, minWidth: 0 }}>
              {MENU.find((m) => m.id === menu)?.label || ''}
            </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
              {menu !== 'home' && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{dateStr}</span>
              )}
              <div ref={notifRef} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
                  <Bell size={22} color="var(--muted)" />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: '#ef4444',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      minWidth: '18px',
                      textAlign: 'center',
                      color: '#fff',
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {showNotifications && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 12,
                    width: 380,
                    maxHeight: 480,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            color: '#0055ff',
                            padding: '4px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            style={{
                              display: 'flex',
                              gap: 12,
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              transition: 'background 0.2s',
                              backgroundColor: 'rgba(0,85,255,0.05)',
                              borderLeft: '3px solid #0055ff',
                            }}
                          >
                            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                              {n.status === 'APPROVED' ? '✅' : '❌'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{n.message}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                                {n.createdAt ? new Date(n.createdAt.seconds ? n.createdAt.seconds * 1000 : n.createdAt).toLocaleString('en-IN') : ''}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {menu !== 'home' && (
                <div ref={moreMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                    onClick={() => setShowMoreMenu((prev) => !prev)}
                  >
                    <MoreVertical size={22} color="var(--muted)" />
                  </div>
                  {showMoreMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 12,
                      minWidth: 150,
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}>
                      <button
                        type="button"
                        onClick={moreMenuActions.download}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={moreMenuActions.settings}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Settings
                      </button>
                      <button
                        type="button"
                        onClick={moreMenuActions.search}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={moreMenuActions.referenceFilter}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Reference filter
                      </button>
                      <button
                        type="button"
                        onClick={moreMenuActions.statusFilter}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Status filter
                      </button>
                      <button
                        type="button"
                        onClick={moreMenuActions.refresh}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Export menu (separate from 3-dot menu) */}
          {showExportMenu && (() => {
            const attRef = getAttendanceRef();
            const exportData = attRef?.getExportData?.();
            if (!exportData) return null;
            return (
              <div ref={exportMenuRef} style={{ position: 'absolute', top: '100%', right: 12, marginTop: 8, zIndex: 1001 }}>
                <ExportToolbar
                  rows={exportData.rows}
                  columnDefs={exportData.columnDefs}
                  title={exportData.title}
                  filename={exportData.filename}
                  fullMonthRows={exportData.fullMonthRows}
                  month={exportData.month}
                  year={exportData.year}
                  projectName={exportData.projectName}
                  isIconOnly={false}
                />
              </div>
            );
          })()}
        </header>

        <div className="page-box" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>{renderContent()}</div>
      </main>
      {twaMode && showSecuritySettings && (
        <SecuritySettings onClose={() => setShowSecuritySettings(false)} />
      )}
    </div>
  );
};

export default AccountantDashboard;
