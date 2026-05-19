import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { 
  LayoutDashboard, Folder, Users, ClipboardCheck, 
  UserPlus, Wallet, Package, ReceiptText, 
  MessageSquare, Bell, LogOut, ChevronLeft, ChevronRight,
  Building2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar State
  const [activeMenu, setActiveMenu] = useState('Dashboard');

  // চার্ট ডাটা
  const data = [
    { name: 'NR 1', workers: 131 },
    { name: 'NER', workers: 48 },
    { name: 'WR 2', workers: 151 },
    { name: 'WR 1', workers: 76 },
    { name: 'SR 1', workers: 16 },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

 // সাইডবার মেনু আইটেম
const menuItems = [
  { name: 'Dashboard', icon: <LayoutDashboard size={20}/>, path: '/admin' },
  { name: 'Projects', icon: <Folder size={20}/>, path: '/all-projects' },
  // এখানে path যোগ করা হয়েছে
  { name: 'Attendance', icon: <ClipboardCheck size={20}/>, path: '/attendance-sheet' }, 
  { name: 'DPR Status', icon: <ReceiptText size={20}/> },
  { name: 'Worker Reg.', icon: <UserPlus size={20}/>, path: '/register-worker' },
  { name: 'User Manager', icon: <Users size={20}/>, path: '/user-manager' },
  { name: 'Vendors', icon: <Building2 size={20}/>, path: '/vendor-management' },
  { name: 'Payroll', icon: <Wallet size={20}/> },
  { name: 'Inventory', icon: <Package size={20}/> },
  { name: 'Expense', icon: <ReceiptText size={20}/> },
  { name: 'Live Chat', icon: <MessageSquare size={20}/> },
];

  return (
    <div style={styles.layout}>
      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <aside style={{ ...styles.sidebar, width: isCollapsed ? '80px' : '260px' }}>
        <div style={styles.sidebarHeader}>
          {!isCollapsed && <h2 style={styles.logo}>KAC <span style={{color: '#0055ff'}}>CORE</span></h2>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} style={styles.toggleBtn}>
            {isCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <div 
              key={item.name} 
              onClick={() => {
                setActiveMenu(item.name);
                if(item.path) navigate(item.path);
              }}
              style={activeMenu === item.name ? styles.activeNavItem : styles.navItem}
            >
              {item.icon}
              {!isCollapsed && <span style={{marginLeft: '15px'}}>{item.name}</span>}
            </div>
          ))}
        </nav>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} />
          {!isCollapsed && <span style={{marginLeft: '15px'}}>Logout</span>}
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
       
      <div style={styles.main}>
        {/* Top Notification Bar */}
        <header style={styles.topBar}>
          
          <div style={styles.searchBox}>
            <input type="text" placeholder="Global Search..." style={styles.input} />
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
          <h2 style={{marginBottom: '30px'}}>Operational Overview</h2>
          
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
          </div>

          {/* Chart Area */}
          <div style={styles.chartBox}>
            <h3>Regional Workforce Distribution</h3>
            <div style={{height: '300px', width: '100%', marginTop: '20px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                  <XAxis dataKey="name" stroke="#444" fontSize={12} />
                  <YAxis stroke="#444" fontSize={12} />
                  <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #222'}} />
                  <Bar dataKey="workers" fill="#0055ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: 'flex', height: '100vh', backgroundColor: '#050505', color: '#fff', fontFamily: 'Inter, sans-serif' },
  
  // Sidebar
  sidebar: { backgroundColor: '#0a0a0a', borderRight: '1px solid #111', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding: '20px 10px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 10px' },
  logo: { fontSize: '18px', fontWeight: '900', margin: 0 },
  toggleBtn: { background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '6px', cursor: 'pointer', padding: '5px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: '#555', transition: '0.2s' },
  activeNavItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: '#fff', backgroundColor: '#111', borderLeft: '4px solid #0055ff' },
  logoutBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },

  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { height: '70px', borderBottom: '1px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px' },
  input: { backgroundColor: '#0a0a0a', border: '1px solid #222', color: '#0a0a0a', padding: '10px 20px', borderRadius: '30px', width: '300px' },
  topIcons: { display: 'flex', alignItems: 'center', gap: '25px' },
  notifIcon: { position: 'relative', cursor: 'pointer' },
  badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', fontSize: '9px', padding: '2px 5px', borderRadius: '10px' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0055ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },

  content: { padding: '40px', overflowY: 'auto', flex: 1 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  card: { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '15px', border: '1px solid #111' },
  chartBox: { backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '15px', border: '1px solid #111' }
};

export default AdminDashboard;