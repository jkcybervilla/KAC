import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ROUTE_STORAGE_KEY = 'kac_last_route';

/**
 * Custom hook that persists the current route to sessionStorage
 * and restores it on page load/refresh.
 * 
 * Also fixes Android back button behavior by using history.pushState
 * to ensure proper in-app navigation instead of closing the app.
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

  // Restore saved route on mount (handles page refresh)
  useEffect(() => {
    const savedRoute = getSavedRoute();
    const currentPath = location.pathname;

    // If we're on login page but user was previously on a protected page,
    // don't redirect — let auth flow handle it.
    // Only redirect if:
    // 1. There's a saved route
    // 2. Current route is root (/)
    // 3. The saved route is not the login page
    // 4. User is likely authenticated (check localStorage indicator)
    if (
      savedRoute &&
      savedRoute !== '/' &&
      currentPath === '/' &&
      isAuthenticated()
    ) {
      navigate(savedRoute, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fix Android back button: intercept popstate to navigate within app
  useEffect(() => {
    // Push an extra history state so back button goes to previous app page
    // instead of closing the app
    const handlePopState = () => {
      // If we're at the root, let the default behavior (closing app) happen
      if (location.pathname === '/') return;

      // Otherwise, navigate back within the app
      const savedRoute = getSavedRoute();
      if (savedRoute && savedRoute !== location.pathname) {
        navigate(savedRoute, { replace: false });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);
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
 * Check if user has an auth session (Firebase user stored)
 */
function isAuthenticated() {
  try {
    // Check if Firebase auth persistence has a user
    const hasFirebaseUser = localStorage.getItem('firebase:authUser:AIzaSyCHe7MIUeyiaCTLQM7AN7uG8Q2DUt9XO4o:com.kac.official');
    if (hasFirebaseUser) return true;
    
    // Fallback: check our own auth indicator
    const authState = localStorage.getItem('kac_auth_state');
    return authState === 'authenticated';
  } catch {
    return false;
  }
}