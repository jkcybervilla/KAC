import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import AccountantDashboard from './accountant/AccountantDashboard';
import CoordinatorDashboard from './coordinator/CoordinatorDashboard';

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
    default:
      return <div style={{ padding: 24, color: '#fff' }}>Unauthorized role.</div>;
  }
};

export default Dashboard;
