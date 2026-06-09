import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_STORAGE_KEY = 'kac_last_route';
const HISTORY_STACK_KEY = 'kac_history_stack';

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
 * Custom hook that:
 * 1. Persists the current route to sessionStorage (for refresh restore)
 * 2. Intercepts back button (popstate) to navigate(-1) within the app
 *    instead of closing it, unless user is on a home/dashboard page.
 */
export function useRoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const historyStack = useRef([]);

  // Track navigation history in sessionStorage
  useEffect(() => {
    if (location.pathname !== '/') {
      // Save current route for refresh restore
      try {
        sessionStorage.setItem(ROUTE_STORAGE_KEY, location.pathname + location.search);
      } catch { /* ignore */ }
    }

    // Maintain a simple history stack in sessionStorage
    try {
      const prev = JSON.parse(sessionStorage.getItem(HISTORY_STACK_KEY) || '[]');
      const last = prev[prev.length - 1];
      if (last !== location.pathname + location.search) {
        prev.push(location.pathname + location.search);
        // Keep max 50 entries
        if (prev.length > 50) prev.shift();
        sessionStorage.setItem(HISTORY_STACK_KEY, JSON.stringify(prev));
      }
      historyStack.current = prev;
    } catch { /* ignore */ }
  }, [location.pathname, location.search]);

  // Intercept back button — use navigate(-1) to go to previous route
  useEffect(() => {
    // Push a dummy state so popstate fires on back press
    // Only push if not already on a home route to avoid stacking
    if (!HOME_ROUTES.has(location.pathname)) {
      window.history.pushState({ from: location.pathname }, '');
    }

    const handlePopState = () => {
      const currentPath = location.pathname;

      // If on a home/dashboard page, let the back button close the app
      if (HOME_ROUTES.has(currentPath)) {
        // Allow default behavior (browser closes app / goes back)
        return;
      }

      // Navigate back in history using React Router
      navigate(-1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  // Restore saved route on mount when user refreshes while authenticated
  useEffect(() => {
    const savedRoute = getSavedRoute();
    const currentPath = location.pathname;

    if (savedRoute && savedRoute !== '/' && currentPath === '/') {
      const hasSession = checkAuthSession();
      if (hasSession) {
        navigate(savedRoute, { replace: true });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Get the saved route from sessionStorage
 */
export function getSavedRoute() {
  try {
    return sessionStorage.getItem(ROUTE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has an active Firebase auth session
 */
function checkAuthSession() {
  try {
    const authState = localStorage.getItem('kac_auth_state');
    if (authState === 'authenticated') return true;

    const firebaseKey = Object.keys(localStorage).find(k => 
      k.startsWith('firebase:authUser')
    );
    if (firebaseKey && localStorage.getItem(firebaseKey)) return true;

    return false;
  } catch {
    return false;
  }
}
