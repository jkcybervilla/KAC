import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import AccountantDashboard from './accountant/AccountantDashboard';
import CoordinatorDashboard from './coordinator/CoordinatorDashboard';
import HrAssistantDashboard from './hr_assistant/HrAssistantDashboard';
import SuperAdminDashboard from './super_admin/SuperAdminDashboard';
import ExecutiveAssistantDashboard from './executive_assistant/ExecutiveAssistantDashboard';

const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'accountant':
      return <AccountantDashboard />;
    case 'coordinator':
      return <CoordinatorDashboard />;
    case 'hr_assistant':
      return <HrAssistantDashboard />;
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'executive_assistant':
      return <ExecutiveAssistantDashboard />;
    default:
      return <div style={{ padding: 24, color: '#fff' }}>Unauthorized role.</div>;
  }
};

export default Dashboard;
