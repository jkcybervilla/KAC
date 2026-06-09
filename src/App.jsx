import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProjectDetails from './pages/project/ProjectDetails';
import VendorManagement from './pages/admin/VendorManagement';
import ProjectsPage from './pages/project/ProjectsPage';
import WorkActivity from './pages/project/WorkActivityHub';
import DprView from './pages/project/DprView';
import JmcView from './pages/project/JmcView';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import HrAssistantDashboard from './pages/hr_assistant/HrAssistantDashboard';
import SuperAdminDashboard from './pages/super_admin/SuperAdminDashboard';
import ExecutiveAssistantDashboard from './pages/executive_assistant/ExecutiveAssistantDashboard';
import WorkerRegisterHub from './pages/WorkerRegistration/WorkerRegisterHub';
import AttendanceHub from './pages/Attendance/AttendanceHub';
import StaffManagement from './pages/user/StaffManagement';
import ActivityLog from './pages/admin/ActivityLog';
import ProtectedRoute from './components/ProtectedRoute';
import PwaInitializer from './components/PwaInitializer';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { userId, userEmail } = useAuth();

  return (
    <>
      <PwaInitializer userId={userId} userEmail={userEmail} />
      <PwaInstallPrompt />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'accountant', 'coordinator', 'hr_assistant', 'super_admin', 'executive_assistant']}><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/accountant" element={<ProtectedRoute roles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
        <Route path="/coordinator" element={<ProtectedRoute roles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
        <Route path="/hr-assistant" element={<ProtectedRoute roles={['hr_assistant']}><HrAssistantDashboard /></ProtectedRoute>} />
        <Route path="/super-admin" element={<ProtectedRoute roles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>} />
        <Route path="/executive-assistant" element={<ProtectedRoute roles={['executive_assistant']}><ExecutiveAssistantDashboard /></ProtectedRoute>} />
        <Route path="/user-manager" element={<ProtectedRoute roles={['admin', 'super_admin']}><StaffManagement /></ProtectedRoute>} />
        <Route path="/all-projects" element={<ProtectedRoute roles={['admin']}><ProjectsPage /></ProtectedRoute>} />
        <Route path="/project/:id" element={<ProtectedRoute roles={['admin']}><ProjectDetails /></ProtectedRoute>} />
        <Route path="/work-activity" element={<ProtectedRoute roles={['admin']}><WorkActivity /></ProtectedRoute>} />
        <Route path="/dpr-view" element={<ProtectedRoute roles={['admin', 'accountant']}><DprView /></ProtectedRoute>} />
        <Route path="/jmc-view" element={<ProtectedRoute roles={['admin', 'accountant']}><JmcView /></ProtectedRoute>} />
        <Route path="/attendance-sheet" element={<ProtectedRoute roles={['admin']}><AttendanceHub /></ProtectedRoute>} />
        <Route path="/register-worker" element={<ProtectedRoute roles={['admin']}><WorkerRegisterHub /></ProtectedRoute>} />
        <Route path="/vendor-management" element={<ProtectedRoute roles={['admin']}><VendorManagement /></ProtectedRoute>} />
        <Route path="/activity-log" element={<ProtectedRoute roles={['admin']}><ActivityLog /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;