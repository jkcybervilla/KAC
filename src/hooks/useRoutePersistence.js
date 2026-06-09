import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_STORAGE_KEY = 'kac_last_route';

/**
 * Custom hook that persists the current route to sessionStorage
 * so on refresh the app can stay on the same page.
 * 
 * Also fixes Android back button — uses a history stack approach:
 * pushes an extra history entry so that back button navigates
 * within the app instead of closing it.
 */
export function useRoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current route whenever it changes (excluding login page)
  useEffect(() => {
    if (location.pathname !== '/') {
      try {
        sessionStorage.setItem(ROUTE_STORAGE_KEY, location.pathname + location.search);
      } catch {
        // sessionStorage may not be available
      }
    }
  }, [location.pathname, location.search]);

  // Fix Android back button: use history.pushState to create in-app navigation stack
  useEffect(() => {
    // Push an initial history state so back button goes here first before closing
    if (location.pathname !== '/') {
      window.history.pushState({ page: location.pathname }, '', location.pathname);
    }

    const handlePopState = (event) => {
      // When user presses back, navigate to previous page within app
      const savedRoute = getSavedRoute();
      
      // If at root, let back button close the app
      if (location.pathname === '/') {
        return;
      }

      // If there's a saved route, navigate to it (going back within app)
      if (savedRoute && savedRoute !== location.pathname) {
        event.preventDefault?.();
        navigate(savedRoute, { replace: true });
      } else {
        // No saved route — navigate to login/home
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  // Restore saved route on mount when user refreshes while authenticated
  useEffect(() => {
    const savedRoute = getSavedRoute();
    const currentPath = location.pathname;

    if (savedRoute && savedRoute !== '/' && currentPath === '/') {
      // Check if user has a Firebase auth session
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
    // Firebase stores indexedDB user data; also check localStorage
    const authState = localStorage.getItem('kac_auth_state');
    if (authState === 'authenticated') return true;

    // Check firebase indexedDB persistence
    const firebaseKey = Object.keys(localStorage).find(k => 
      k.startsWith('firebase:authUser')
    );
    if (firebaseKey && localStorage.getItem(firebaseKey)) return true;

    return false;
  } catch {
    return false;
  }
}