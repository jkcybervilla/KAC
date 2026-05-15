import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import {
  UserPlus,
  ClipboardCheck,
  FileText,
  ReceiptText,
  LogOut,
  Bell,
  Link2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterProjectsByUser } from '../../utils/projectAccess';
import { getBatchId, countPresent, getDaysInMonth } from '../../utils/attendance';
import { pageStyles as s } from '../../styles/pageStyles';
import AccountantWorkerRegistration from './AccountantWorkerRegistration';
import AccountantDailyAttendance from './AccountantDailyAttendance';

const MENU = [
  { id: 'workers', label: 'WORKER REGISTRATION', icon: UserPlus },
  { id: 'client', label: 'CLIENT ATTENDANCE', icon: ClipboardCheck },
  { id: 'office', label: 'OFFICE ATTENDANCE', icon: ClipboardCheck },
  { id: 'dpr', label: 'DPR', icon: FileText },
  { id: 'expense', label: 'EXPENSE', icon: ReceiptText },
];

const Placeholder = ({ title }) => (
  <div style={{ ...s.chartBox, textAlign: 'center', padding: 60 }}>
    <Link2 size={40} color="#0055ff" style={{ marginBottom: 16 }} />
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ color: '#666', fontSize: 13 }}>Connected — full module deploy hobe pore.</p>
  </div>
);

const AccountantDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState('workers');
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [clientMp, setClientMp] = useState(0);
  const [officeMp, setOfficeMp] = useState(0);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const batchId = getBatchId(today.getMonth() + 1, today.getFullYear());
  const day = today.getDate();
  const daysInMonth = getDaysInMonth(today.getMonth() + 1, today.getFullYear());

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'projects'));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = filterProjectsByUser(all, profile);
      setProjects(mine);
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
    auth.signOut();
    navigate('/');
  };

  const renderContent = () => {
    const pname = project?.PROJECT_NAME || '';
    switch (menu) {
      case 'workers':
        return <AccountantWorkerRegistration projectName={pname} />;
      case 'client':
        return <AccountantDailyAttendance type="client" projectName={pname} />;
      case 'office':
        return <AccountantDailyAttendance type="office" projectName={pname} />;
      case 'dpr':
        return <Placeholder title="DPR MODULE" />;
      case 'expense':
        return <Placeholder title="EXPENSE MODULE" />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'Inter,sans-serif' }}>
      <aside style={{ width: 250, borderRight: '1px solid #111', padding: '16px 10px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 14, fontWeight: 900, padding: '0 12px', marginBottom: 20 }}>
          KAC <span style={{ color: '#0055ff' }}>ACCOUNTANT</span>
        </h2>
        {MENU.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMenu(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              marginBottom: 4,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: menu === m.id ? '#0055ff22' : 'transparent',
              color: menu === m.id ? '#fff' : '#666',
              fontWeight: 'bold',
              fontSize: 11,
              textAlign: 'left',
            }}
          >
            <m.icon size={16} />
            {m.label}
          </button>
        ))}
        <button type="button" onClick={logout} style={{ ...s.secondaryBtn, marginTop: 'auto', width: '100%' }}>
          <LogOut size={14} /> Logout
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ borderBottom: '1px solid #111', padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <select
                style={{ ...s.select, marginBottom: 8, minWidth: 220 }}
                value={project?.id || ''}
                onChange={(e) => setProject(projects.find((p) => p.id === e.target.value))}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.PROJECT_NAME}
                  </option>
                ))}
              </select>
              <h1 style={{ margin: 0, fontSize: 20 }}>{project?.PROJECT_NAME || 'No project assigned'}</h1>
              <p style={{ margin: '4px 0 0', color: '#888', fontSize: 12 }}>
                Line: {project?.LINE_NAME || '—'} | {dateStr}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div>
                  Client MP: <strong style={{ color: '#22c55e' }}>{clientMp}</strong>
                </div>
                <div>
                  Office MP: <strong style={{ color: '#0055ff' }}>{officeMp}</strong>
                </div>
              </div>
              <Bell size={22} color="#888" style={{ cursor: 'pointer' }} />
              <span style={s.badgeActive}>3</span>
            </div>
          </div>
        </header>

        <div style={{ padding: 24, overflow: 'auto', flex: 1 }}>{renderContent()}</div>
      </main>
    </div>
  );
};

export default AccountantDashboard;
