import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProjectDetails from './pages/project/ProjectDetails';
import VendorManagement from './pages/admin/VendorManagement';
import VehicleManagement from './pages/admin/VehicleManagement';
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
import SplashScreen from './components/SplashScreen';
import SetupLock from './components/SetupLock';
import { useAuth } from './context/AuthContext';
import { useAppLock } from './context/AppLockContext';
import { isTwaMode } from './utils/pwa';

const ROUTE_STORAGE_KEY = 'kac_last_route';
const EXIT_TOAST_DURATION = 2000; // 2 seconds

/**
 * Routes considered "home/dashboard" — back button on these triggers
 * "Press back again to exit" toast.
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
 * Map each role to its dashboard/home route.
 */
const ROLE_HOME_MAP = {
  admin: '/admin',
  accountant: '/accountant',
  coordinator: '/coordinator',
  hr_assistant: '/hr-assistant',
  super_admin: '/super-admin',
  executive_assistant: '/executive-assistant',
};

/**
 * Save the current route to localStorage (except login page).
 */
function saveLastRoute(pathname) {
  if (pathname === '/' || pathname === '/login') return;
  try {
    localStorage.setItem(ROUTE_STORAGE_KEY, pathname);
  } catch { /* ignore */ }
}

/**
 * Get the saved route from localStorage.
 */
function getLastSavedRoute() {
  try {
    return localStorage.getItem(ROUTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get the user's role-based home route.
 */
function getRoleHome(role) {
  return ROLE_HOME_MAP[role] || '/dashboard';
}

/**
 * Custom hook that:
 * 1. Saves current route to localStorage on every navigation (Fix #1)
 * 2. Intercepts back button with double-back-to-exit on home routes (Fix #3)
 * 3. Blocks back navigation to '/' when authenticated — redirects to dashboard (Fix #2)
 * 4. Pushes a history state on every route change to keep the history stack
 *    populated — prevents back button from closing the app prematurely (Fix #3b)
 */
function useBackButtonNavigation({ profile, authLoading }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Save current route to localStorage on every navigation (Fix #1)
  // On every route change, push a new history state with location data so
  // the browser history stack never empties — back button navigates our states
  // instead of closing the app.
  useEffect(() => {
    saveLastRoute(location.pathname);
    window.history.pushState({ page: location.pathname }, '', location.pathname);
  }, [location.pathname]);

  // Refs for double-back-to-exit (Fix #3)
  const backPressCountRef = useRef(0);
  const backPressTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (backPressTimerRef.current) {
        clearTimeout(backPressTimerRef.current);
      }
    };
  }, []);

  // Intercept back button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;

      // --- Fix #2: Block '/' and '/login' when authenticated ---
      if ((currentPath === '/' || currentPath === '/login') && profile) {
        const role = profile.role;
        const homeRoute = getRoleHome(role);
        window.history.pushState({ page: homeRoute }, '', homeRoute);
        navigate(homeRoute, { replace: true });
        return;
      }

      // --- Fix #3: Double back to exit on home/dashboard routes ---
      if (HOME_ROUTES.has(currentPath)) {
        backPressCountRef.current += 1;

        if (backPressCountRef.current === 1) {
          // First back press — show toast and set timer
          showExitToast();
          // Push a dummy state so we catch the second back press
          window.history.pushState(null, '');
          backPressTimerRef.current = setTimeout(() => {
            backPressCountRef.current = 0;
          }, EXIT_TOAST_DURATION);
          return;
        }

        if (backPressCountRef.current >= 2) {
          // Second back press within 2 seconds — close app
          backPressCountRef.current = 0;
          if (backPressTimerRef.current) {
            clearTimeout(backPressTimerRef.current);
            backPressTimerRef.current = null;
          }
          closeApp();
          return;
        }
        return;
      }

      // On non-home routes: navigate back in React Router history, then push
      // a new state to keep the history stack populated so the next back press
      // doesn't close the app.
      navigate(-1);
      // Push a fresh state immediately so history stack never empties out.
      // This means the back button will always find our synthetic states
      // rather than falling through to the browser/twa closing the app.
      window.history.pushState({ page: currentPath }, '', currentPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, profile]);
}

/**
 * Show a toast message for "Press back again to exit"
 */
function showExitToast() {
  try {
    // Create a toast element
    const existing = document.getElementById('kac-exit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'kac-exit-toast';
    toast.textContent = 'Press back again to exit';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#333',
      color: '#fff',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      zIndex: '99999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s ease',
      opacity: '1',
    });
    document.body.appendChild(toast);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, EXIT_TOAST_DURATION - 300);
  } catch { /* ignore */ }
}

/**
 * Close the app — use TWA close if available, otherwise go back in history
 */
function closeApp() {
  try {
    // Check if running inside TWA (Android) — try to close via Activity
    if (isTwaMode()) {
      // For TWA: navigate back as far as possible
      window.history.go(-window.history.length);
    } else {
      // Browser: try to close or go back
      window.history.go(-window.history.length);
    }
  } catch {
    // Fallback: try window.close()
    try { window.close(); } catch { /* ignore */ }
  }
}

/**
 * Inner component that uses hooks requiring AuthContext and AppLockContext.
 * Renders LockScreen and SetupLock as OVERLAYS on top of the normal app
 * so that auth/routing logic continues to work underneath.
 *
 * Lock/PIN features are ONLY available when running as TWA (Android app).
 * In regular browser, all lock features are skipped entirely.
 *
 * Loading sequence (TWA mode):
 *   1. App opens → SplashScreen plays FIRST (2.5 seconds)
 *   2. During splash, Firebase auth state restores in background
 *   3. After splash completes → check auth → show dashboard or login
 *   4. sessionStorage 'kac_splash_shown' prevents showing again on refresh
 */
function AppContent() {
  const { userId, userEmail, loading: authLoading, profile } = useAuth();
  const {
    isLocked,
    needsSetup,
    loading: appLockLoading,
  } = useAppLock();
  const [setupComplete, setSetupComplete] = useState(false);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  // Synchronous check: if sessionStorage already has 'kac_splash_shown', skip splash
  const [splashVisible, setSplashVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('kac_splash_shown');
    } catch {
      return true;
    }
  });

  // Determine if we're running as TWA / Android
  const twaMode = useMemo(() => isTwaMode(), []);

  const handleSplashComplete = useCallback(() => {
    try {
      sessionStorage.setItem('kac_splash_shown', 'true');
    } catch { /* ignore */ }
    setSplashVisible(false);
  }, []);

  // Initialize back button navigation (Fix #1, #2, #3)
  useBackButtonNavigation({ profile, authLoading });

  // --- Fix #1: On auth state restore, redirect to saved route ---
  useEffect(() => {
    // Wait for auth to finish loading and a profile to be available
    if (authLoading || !profile || initialRedirectDone) return;

    const savedRoute = getLastSavedRoute();
    const currentPath = window.location.pathname;

    // If user is on '/' or '/login' and authenticated, redirect
    if (currentPath === '/' || currentPath === '/login') {
      const targetRoute = savedRoute && savedRoute !== '/' ? savedRoute : getRoleHome(profile.role);
      // Use window.location to force a full redirect that React Router picks up
      window.history.replaceState(null, '', targetRoute);
      // Trigger a popstate so React Router navigates
      window.dispatchEvent(new PopStateEvent('popstate'));
      setInitialRedirectDone(true);
      return;
    }

    // If user is on a regular page, just ensure initialRedirectDone is set
    setInitialRedirectDone(true);
  }, [authLoading, profile, initialRedirectDone]);

  // ============================================================
  // LOADING SEQUENCE:
  // 1. TWA mode + splash visible → show ONLY SplashScreen (no loading)
  // 2. Auth/app lock still loading → show minimal "Loading..." screen
  // 3. Otherwise → normal app (dashboard, login, etc.)
  // ============================================================

  // In TWA mode, SplashScreen is ALWAYS the first thing shown.
  // Auth initialization happens in the background during splash display.
  // No "Loading..." screen should appear before or during splash.
  if (twaMode && splashVisible) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show loading ONLY after splash is done (or not needed in non-TWA mode).
  // This is the fallback while auth/appLock still initializing after splash.
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
      {/* NORMAL APP CONTENT */}
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
        <Route path="/vehicle-management" element={<ProtectedRoute roles={['admin']}><VehicleManagement /></ProtectedRoute>} />
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