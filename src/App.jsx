import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import LockScreen from './components/LockScreen';
import SetupLock from './components/SetupLock';
import { useAuth } from './context/AuthContext';
import { useAppLock } from './context/AppLockContext';
import { isTwaMode } from './utils/pwa';

/**
 * Routes considered "home/dashboard" — back button on these closes the app.
 * All other routes will navigate back in history.
 */
const HOME_ROUTES = new Set([
  '/',
  '/dashboard',
  '/admin',
  '/accountant',
  '/coordinator',
  '/hr-assistant',
  '/super-admin',
  '/executive-assistant',
]);

/**
 * Custom hook that intercepts the back button (popstate) to navigate
 * within the app using React Router instead of closing the app.
 * When on a home/dashboard route, default browser behavior is allowed.
 */
function useBackButtonNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;

      // If on a home/dashboard page, allow default behavior (close app / go back)
      if (HOME_ROUTES.has(currentPath)) {
        return;
      }

      // Navigate back in React Router history
      navigate(-1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);
}

/**
 * Inner component that uses hooks requiring AuthContext and AppLockContext.
 * Renders LockScreen and SetupLock as OVERLAYS on top of the normal app
 * so that auth/routing logic continues to work underneath.
 *
 * Lock/PIN features are ONLY available when running as TWA (Android app).
 * In regular browser, all lock features are skipped entirely.
 */
function AppContent() {
  const { userId, userEmail, loading: authLoading } = useAuth();
  const {
    isLocked,
    needsSetup,
    loading: appLockLoading,
  } = useAppLock();
  const [setupComplete, setSetupComplete] = useState(false);

  // Determine if we're running as TWA / Android
  const twaMode = useMemo(() => isTwaMode(), []);

  // Initialize back button navigation (fixes refresh + back button)
  useBackButtonNavigation();

  // Show loading while auth and app lock initialize
  if (authLoading || appLockLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontFamily: 'sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {/* NORMAL APP CONTENT — always rendered */}
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
        {/* Catch /sw.js silently — the service worker auto-update module may trigger
            a navigation to this path. Without a matching route, React Router shows
            a blank screen with "No routes matched location /sw.js". */}
        <Route path="/sw.js" element={null} />
      </Routes>

      {/* APP LOCK OVERLAY — ONLY in TWA mode on top of everything when locked */}
      {twaMode && isLocked && <LockScreen />}

      {/* SETUP LOCK OVERLAY — ONLY in TWA mode when first login & no lock configured */}
      {twaMode && needsSetup && !setupComplete && (
        <SetupLock onComplete={() => setSetupComplete(true)} />
      )}
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