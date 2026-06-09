import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import {
  LayoutDashboard, Folder, Users, ClipboardCheck,
  UserPlus, Wallet, Package, ReceiptText,
  MessageSquare, Bell, LogOut, ChevronLeft, ChevronRight,
  Building2, Clock, UserCheck, CreditCard, FileText, UserMinus, Edit3,
  Search, Calendar, Filter, ArrowUpDown, Download, ChevronDown, Activity,
  CheckCircle2, XCircle, AlertCircle, Clock4
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import KACLogo from '../../assets/logo.png';

const ActivityLog = () => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Activity Log');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [expandedDate, setExpandedDate] = useState(null);

  // All activities grouped by date
  const allActivities = [
    // May 23, 2026
    { id: 1, date: '2026-05-23', user: 'Rahul Sharma', role: 'Coordinator', action: 'added', target: 'Worker Reg.', detail: 'New worker registered: Mukesh Kumar (Mason)', time: '10:30 AM', icon: <UserPlus size={16} />, color: '#22c55e' },
    { id: 2, date: '2026-05-23', user: 'Priya Patel', role: 'Accountant', action: 'updated', target: 'Payroll', detail: 'Salary slip generated for March 2026 - 45 workers', time: '11:15 AM', icon: <CreditCard size={16} />, color: '#3b82f6' },
    { id: 3, date: '2026-05-23', user: 'Amit Singh', role: 'Coordinator', action: 'marked', target: 'Attendance', detail: 'NR-1 site: 45 present, 3 absent, 2 on leave', time: '09:00 AM', icon: <UserCheck size={16} />, color: '#f59e0b' },
    { id: 4, date: '2026-05-23', user: 'Sneha Reddy', role: 'Coordinator', action: 'submitted', target: 'DPR Status', detail: 'Daily Progress Report submitted for NR-1 project', time: '04:45 PM', icon: <FileText size={16} />, color: '#8b5cf6' },
    { id: 5, date: '2026-05-23', user: 'Vikram Joshi', role: 'Admin', action: 'updated', target: 'Inventory', detail: 'Cement stock increased by +200 bags (Shree Cement)', time: '02:20 PM', icon: <Package size={16} />, color: '#06b6d4' },
    // May 22, 2026
    { id: 6, date: '2026-05-22', user: 'Ananya Gupta', role: 'Accountant', action: 'approved', target: 'Expense', detail: 'Site material purchase approved: ₹12,500', time: '03:10 PM', icon: <ReceiptText size={16} />, color: '#ec4899' },
    { id: 7, date: '2026-05-22', user: 'Rohit Verma', role: 'Admin', action: 'edited', target: 'Vendors', detail: 'Updated vendor details: Shree Cement Ltd.', time: '01:45 PM', icon: <Edit3 size={16} />, color: '#f97316' },
    { id: 8, date: '2026-05-22', user: 'Neha Kapoor', role: 'Coordinator', action: 'removed', target: 'Worker Reg.', detail: 'Removed worker: Sunil Yadav (resigned)', time: '12:00 PM', icon: <UserMinus size={16} />, color: '#ef4444' },
    { id: 9, date: '2026-05-22', user: 'Rahul Sharma', role: 'Coordinator', action: 'added', target: 'Projects', detail: 'New project created: WR-2 Highway Extension', time: '10:00 AM', icon: <Folder size={16} />, color: '#22c55e' },
    { id: 10, date: '2026-05-22', user: 'Priya Patel', role: 'Accountant', action: 'submitted', target: 'Expense', detail: 'Monthly expense report for April 2026', time: '09:30 AM', icon: <FileText size={16} />, color: '#8b5cf6' },
    // May 21, 2026
    { id: 11, date: '2026-05-21', user: 'Amit Singh', role: 'Coordinator', action: 'marked', target: 'Attendance', detail: 'NER site: 48 present, 1 absent', time: '08:45 AM', icon: <UserCheck size={16} />, color: '#f59e0b' },
    { id: 12, date: '2026-05-21', user: 'Vikram Joshi', role: 'Admin', action: 'updated', target: 'Payroll', detail: 'Payroll structure updated for contract workers', time: '04:00 PM', icon: <CreditCard size={16} />, color: '#3b82f6' },
    { id: 13, date: '2026-05-21', user: 'Sneha Reddy', role: 'Coordinator', action: 'submitted', target: 'DPR Status', detail: 'Daily Progress Report submitted for NER project', time: '05:15 PM', icon: <FileText size={16} />, color: '#8b5cf6' },
    { id: 14, date: '2026-05-21', user: 'Rohit Verma', role: 'Admin', action: 'added', target: 'Vendors', detail: 'New vendor added: Tata Steel Ltd.', time: '11:30 AM', icon: <Building2 size={16} />, color: '#22c55e' },
    // May 20, 2026
    { id: 15, date: '2026-05-20', user: 'Neha Kapoor', role: 'Coordinator', action: 'added', target: 'Worker Reg.', detail: 'New worker registered: Rajesh Kumar (Welder)', time: '10:15 AM', icon: <UserPlus size={16} />, color: '#22c55e' },
    { id: 16, date: '2026-05-20', user: 'Ananya Gupta', role: 'Accountant', action: 'approved', target: 'Expense', detail: 'Fuel expense approved: ₹8,750', time: '02:30 PM', icon: <ReceiptText size={16} />, color: '#ec4899' },
    { id: 17, date: '2026-05-20', user: 'Priya Patel', role: 'Accountant', action: 'updated', target: 'Inventory', detail: 'Steel stock audit completed: 500 MT available', time: '03:45 PM', icon: <Package size={16} />, color: '#06b6d4' },
    { id: 18, date: '2026-05-20', user: 'Rahul Sharma', role: 'Coordinator', action: 'marked', target: 'Attendance', detail: 'SR-1 site: 16 present, 0 absent', time: '09:15 AM', icon: <UserCheck size={16} />, color: '#f59e0b' },
    // May 19, 2026
    { id: 19, date: '2026-05-19', user: 'Amit Singh', role: 'Coordinator', action: 'submitted', target: 'DPR Status', detail: 'Daily Progress Report submitted for WR-1 project', time: '05:00 PM', icon: <FileText size={16} />, color: '#8b5cf6' },
    { id: 20, date: '2026-05-19', user: 'Vikram Joshi', role: 'Admin', action: 'edited', target: 'User Manager', detail: 'User permissions updated for Sneha Reddy', time: '11:00 AM', icon: <Users size={16} />, color: '#f97316' },
    { id: 21, date: '2026-05-19', user: 'Rohit Verma', role: 'Admin', action: 'added', target: 'Projects', detail: 'New project created: WR-1 Bridge Construction', time: '10:30 AM', icon: <Folder size={16} />, color: '#22c55e' },
    { id: 22, date: '2026-05-19', user: 'Neha Kapoor', role: 'Coordinator', action: 'removed', target: 'Worker Reg.', detail: 'Removed worker: Dinesh Kumar (terminated)', time: '04:00 PM', icon: <UserMinus size={16} />, color: '#ef4444' },
  ];

  // Group by date and sort descending
  const groupedByDate = allActivities.reduce((acc, activity) => {
    if (!acc[activity.date]) acc[activity.date] = [];
    acc[activity.date].push(activity);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Filter activities
  const getFilteredDates = () => {
    return sortedDates.filter(date => {
      const activities = groupedByDate[date];
      const filtered = activities.filter(a => {
        const matchesSearch = 
          a.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.role.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesAction = filterAction === 'all' || a.action === filterAction;
        
        return matchesSearch && matchesAction;
      });
      return filtered.length > 0;
    });
  };

  const getFilteredActivities = (date) => {
    return groupedByDate[date].filter(a => {
      const matchesSearch = 
        a.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = filterAction === 'all' || a.action === filterAction;
      
      return matchesSearch && matchesAction;
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isYesterday = (dateStr) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
  };

  const getDateLabel = (dateStr) => {
    if (isToday(dateStr)) return 'Today';
    if (isYesterday(dateStr)) return 'Yesterday';
    return formatDate(dateStr);
  };

  const actionLabels = {
    added: 'Added', updated: 'Updated', marked: 'Marked',
    submitted: 'Submitted', approved: 'Approved', edited: 'Edited', removed: 'Removed'
  };

  // ───────────────────────────────────────────────
  // Today's Activity Table - Attendance & Work Activity Tracker
  // ───────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]; // 2026-05-25

  // Real data: which users sent attendance & work activity today
  const todayActivityData = [
    { id: 1, user: 'Amit Singh', role: 'Coordinator', site: 'NR-1', attendanceSent: true, workActivitySent: true, attendanceTime: '09:00 AM', workActivityTime: '04:30 PM' },
    { id: 2, user: 'Sneha Reddy', role: 'Coordinator', site: 'NER', attendanceSent: true, workActivitySent: false, attendanceTime: '08:45 AM', workActivityTime: null },
    { id: 3, user: 'Rahul Sharma', role: 'Coordinator', site: 'SR-1', attendanceSent: false, workActivitySent: true, attendanceTime: null, workActivityTime: '05:00 PM' },
    { id: 4, user: 'Neha Kapoor', role: 'Coordinator', site: 'WR-2', attendanceSent: false, workActivitySent: false, attendanceTime: null, workActivityTime: null },
    { id: 5, user: 'Priya Patel', role: 'Accountant', site: 'HQ', attendanceSent: true, workActivitySent: true, attendanceTime: '09:15 AM', workActivityTime: '03:45 PM' },
    { id: 6, user: 'Ananya Gupta', role: 'Accountant', site: 'HQ', attendanceSent: true, workActivitySent: false, attendanceTime: '09:30 AM', workActivityTime: null },
    { id: 7, user: 'Vikram Joshi', role: 'Admin', site: 'HQ', attendanceSent: false, workActivitySent: true, attendanceTime: null, workActivityTime: '02:20 PM' },
    { id: 8, user: 'Rohit Verma', role: 'Admin', site: 'HQ', attendanceSent: true, workActivitySent: true, attendanceTime: '10:00 AM', workActivityTime: '01:45 PM' },
  ];

  const sentCount = todayActivityData.filter(d => d.attendanceSent && d.workActivitySent).length;
  const partialCount = todayActivityData.filter(d => d.attendanceSent !== d.workActivitySent).length;
  const missedCount = todayActivityData.filter(d => !d.attendanceSent && !d.workActivitySent).length;

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

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  const filteredDates = getFilteredDates();
  const totalFiltered = filteredDates.reduce((sum, d) => sum + getFilteredActivities(d).length, 0);

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
        .date-group { transition: all 0.2s ease; }
        .date-group:hover { background-color: var(--surface-2); }
        .activity-row { transition: all 0.2s ease; }
        .activity-row:hover { background-color: var(--surface-2) !important; transform: translateX(3px); }
        .search-box:focus { outline: none; border-color: #0055ff !important; }
        .filter-select:focus { outline: none; border-color: #0055ff !important; }
        .activity-log-list::-webkit-scrollbar { width: 6px; }
        .activity-log-list::-webkit-scrollbar-track { background: transparent; }
        .activity-log-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
        @media (max-width: 768px) {
          .filters-row { flex-direction: column; }
        }
      `}</style>

      {/* --- SIDEBAR --- */}
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
              onClick={() => {
                setActiveMenu(item.name);
                if(item.path) navigate(item.path);
              }}
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

      {/* --- MAIN CONTENT --- */}
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

        <div style={styles.content}>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div>
              <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Activity size={24} color="#0055ff" /> Activity Log
              </h2>
              <p style={{margin: '5px 0 0', color: 'var(--muted-2)', fontSize: '14px'}}>
                Complete user activity record with date-wise tracking
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <span style={styles.totalBadge}>{totalFiltered} activities</span>
            </div>
          </div>

          {/* ─── Today's Activity Status Section ─── */}
          <div style={styles.todaySection}>
            <div style={styles.todaySectionHeader}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Clock4 size={20} color="#0055ff" />
                <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Today's Activity Status</h3>
                <span style={styles.todayDateBadge}>{getDateLabel(today)}</span>
              </div>
              <div style={{display: 'flex', gap: '16px'}}>
                <div style={{...styles.statChip, backgroundColor: '#22c55e20', color: '#22c55e'}}>
                  <CheckCircle2 size={14} /> {sentCount} Sent Both
                </div>
                <div style={{...styles.statChip, backgroundColor: '#f59e0b20', color: '#f59e0b'}}>
                  <AlertCircle size={14} /> {partialCount} Partial
                </div>
                <div style={{...styles.statChip, backgroundColor: '#ef444420', color: '#ef4444'}}>
                  <XCircle size={14} /> {missedCount} Missed
                </div>
              </div>
            </div>

            <div style={styles.todayTableWrapper}>
              <table style={styles.todayTable}>
                <thead>
                  <tr>
                    <th style={styles.thLeft}>User</th>
                    <th style={styles.thCenter}>Role</th>
                    <th style={styles.thCenter}>Site</th>
                    <th style={styles.thCenter}>Attendance</th>
                    <th style={styles.thCenter}>Attendance Time</th>
                    <th style={styles.thCenter}>Work Activity</th>
                    <th style={styles.thCenter}>Work Activity Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todayActivityData.map((d) => (
                    <tr key={d.id} style={d.attendanceSent && d.workActivitySent ? styles.trDone : !d.attendanceSent && !d.workActivitySent ? styles.trMissed : styles.trPartial}>
                      <td style={styles.tdLeft}>
                        <span style={styles.tdUserName}>{d.user}</span>
                      </td>
                      <td style={styles.tdCenter}>
                        <span style={styles.roleBadge}>{d.role}</span>
                      </td>
                      <td style={styles.tdCenter}>
                        <span style={styles.siteBadge}>{d.site}</span>
                      </td>
                      <td style={styles.tdCenter}>
                        {d.attendanceSent ? (
                          <span style={{color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                            <CheckCircle2 size={14} /> Sent
                          </span>
                        ) : (
                          <span style={{color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                            <XCircle size={14} /> Not Sent
                          </span>
                        )}
                      </td>
                      <td style={styles.tdCenter}>
                        {d.attendanceTime ? (
                          <span style={{color: 'var(--muted-2)', fontSize: '12px'}}>{d.attendanceTime}</span>
                        ) : (
                          <span style={{color: '#ef4444', fontSize: '12px'}}>—</span>
                        )}
                      </td>
                      <td style={styles.tdCenter}>
                        {d.workActivitySent ? (
                          <span style={{color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                            <CheckCircle2 size={14} /> Sent
                          </span>
                        ) : (
                          <span style={{color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                            <XCircle size={14} /> Not Sent
                          </span>
                        )}
                      </td>
                      <td style={styles.tdCenter}>
                        {d.workActivityTime ? (
                          <span style={{color: 'var(--muted-2)', fontSize: '12px'}}>{d.workActivityTime}</span>
                        ) : (
                          <span style={{color: '#ef4444', fontSize: '12px'}}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.todayFooter}>
              <span style={{fontSize: '12px', color: 'var(--muted-2)'}}>
                Users who have sent both attendance & work activity are marked green. Partial = sent only one. Missed = sent none.
              </span>
            </div>
          </div>

          {/* Filters */}
          <div style={styles.filtersContainer} className="filters-row">
            <div style={styles.searchBox}>
              <Search size={16} color="var(--muted-2)" style={{flexShrink: 0}} />
              <input 
                type="text" 
                placeholder="Search by user, module, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-box"
                style={styles.searchInput}
              />
            </div>
            <div style={styles.filterSelect}>
              <Filter size={16} color="var(--muted-2)" style={{flexShrink: 0}} />
              <select 
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="filter-select"
                style={styles.selectInput}
              >
                <option value="all">All Actions</option>
                <option value="added">Added</option>
                <option value="updated">Updated</option>
                <option value="marked">Marked</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="edited">Edited</option>
                <option value="removed">Removed</option>
              </select>
            </div>
          </div>

          {/* Activity Groups by Date */}
          <div className="activity-log-list" style={styles.activityList}>
            {filteredDates.length === 0 ? (
              <div style={styles.emptyState}>
                <Clock size={48} color="var(--muted-2)" />
                <h3>No activities found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredDates.map((date) => {
                const dateActivities = getFilteredActivities(date);
                return (
                  <div key={date} style={styles.dateGroup}>
                    <div 
                      className="date-group"
                      style={styles.dateHeader}
                      onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                    >
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <Calendar size={16} color="#0055ff" />
                        <span style={{fontWeight: '600', fontSize: '14px'}}>{getDateLabel(date)}</span>
                        <span style={styles.dateCount}>{dateActivities.length} activities</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        style={{ 
                          transform: expandedDate === date ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          color: 'var(--muted-2)'
                        }} 
                      />
                    </div>

                    {(expandedDate === date || expandedDate === null) && (
                      <div>
                        {dateActivities.map((activity) => (
                          <div key={activity.id} className="activity-row" style={styles.activityRow}>
                            <div style={{...styles.activityIcon, backgroundColor: activity.color + '20', color: activity.color}}>
                              {activity.icon}
                            </div>
                            <div style={styles.activityInfo}>
                              <div style={styles.activityTop}>
                                <span style={styles.userName}>{activity.user}</span>
                                <span style={styles.userRole}>{activity.role}</span>
                                <span style={styles.actionBadge(activity.color)}>{actionLabels[activity.action]}</span>
                                <span style={styles.targetName}>{activity.target}</span>
                              </div>
                              <div style={styles.activityDetail}>{activity.detail}</div>
                            </div>
                            <div style={styles.activityTime}>
                              <Clock size={12} />
                              <span>{activity.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: 'flex', height: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' },

  // Sidebar
  sidebar: { background: 'linear-gradient(180deg, rgba(0, 85, 255, 0.05) 0%, transparent 50%, transparent 100%)', borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding: '20px 10px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '0 10px' },
  logo: { fontSize: '18px', fontWeight: '900', margin: 0 },
  toggleBtn: { background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', padding: '5px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' },
  navItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--muted-2)', transition: '0.2s' },
  activeNavItem: { display: 'flex', alignItems: 'center', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', backgroundColor: 'var(--surface-2)', borderLeft: '4px solid #0055ff' },
  logoutBtn: { display: 'flex', alignItems: 'center', padding: '12px 15px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' },

  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBar: { height: '70px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px' },
  topBarBranding: { display: 'flex', alignItems: 'center' },
  topIcons: { display: 'flex', alignItems: 'center', gap: '25px' },
  notifIcon: { position: 'relative', cursor: 'pointer' },
  badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', fontSize: '9px', padding: '2px 5px', borderRadius: '10px' },
  profile: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0055ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },

  content: { padding: '40px', overflowY: 'auto', flex: 1 },

  // Page Header
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  totalBadge: { fontSize: '13px', color: '#0055ff', backgroundColor: '#0055ff15', padding: '6px 14px', borderRadius: '20px', fontWeight: '600' },

  // Filters
  filtersContainer: { display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '10px 16px' },
  searchInput: { flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
  filterSelect: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '10px 16px', minWidth: '180px' },
  selectInput: { flex: 1, border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '14px', fontFamily: 'Inter, sans-serif', cursor: 'pointer' },

  // ─── Today's Activity Status ───
  todaySection: { marginBottom: '25px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' },
  todaySectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  todayDateBadge: { fontSize: '12px', color: '#0055ff', backgroundColor: '#0055ff15', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' },
  statChip: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px', borderRadius: '20px', fontWeight: '500' },
  todayTableWrapper: { overflowX: 'auto' },
  todayTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thLeft: { textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-2)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
  thCenter: { textAlign: 'center', padding: '12px 16px', fontWeight: '600', color: 'var(--muted-2)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' },
  tdLeft: { padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  tdCenter: { textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  tdUserName: { fontSize: '13px', fontWeight: '500', color: 'var(--text)' },
  roleBadge: { fontSize: '11px', color: 'var(--muted-2)', backgroundColor: 'var(--surface-2)', padding: '2px 8px', borderRadius: '10px' },
  siteBadge: { fontSize: '11px', color: '#0055ff', backgroundColor: '#0055ff10', padding: '2px 8px', borderRadius: '10px', fontWeight: '500' },
  trDone: { backgroundColor: 'rgba(34, 197, 94, 0.03)', transition: 'background 0.2s' },
  trPartial: { backgroundColor: 'rgba(245, 158, 11, 0.03)', transition: 'background 0.2s' },
  trMissed: { backgroundColor: 'rgba(239, 68, 68, 0.03)', transition: 'background 0.2s' },
  todayFooter: { padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' },

  // Activity List
  activityList: { maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' },

  // Date Group
  dateGroup: { marginBottom: '15px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' },
  dateHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  dateCount: { fontSize: '12px', color: 'var(--muted-2)', backgroundColor: 'var(--surface-2)', padding: '3px 10px', borderRadius: '20px' },

  // Activity Row
  activityRow: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  activityIcon: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  activityInfo: { flex: 1, minWidth: 0 },
  activityTop: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' },
  userName: { fontSize: '14px', fontWeight: '600', color: 'var(--text)' },
  userRole: { fontSize: '11px', color: 'var(--muted-2)', backgroundColor: 'var(--surface-2)', padding: '2px 8px', borderRadius: '10px' },
  actionBadge: (color) => ({
    fontSize: '11px',
    color: color,
    backgroundColor: color + '15',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '500'
  }),
  targetName: { fontSize: '13px', color: '#0055ff', fontWeight: '500' },
  activityDetail: { fontSize: '13px', color: 'var(--muted-2)', lineHeight: '1.4', marginLeft: '0' },
  activityTime: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted-2)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: '2px' },

  // Empty State
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--muted-2)' }
};

export default ActivityLog;