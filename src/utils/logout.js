import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { isTwaMode } from './pwa';

/**
 * Centralized logout function.
 * 
 * BEHAVIOR IS MODE-DEPENDENT:
 * 
 * [PWA / TWA / Standalone mode]
 * - Does NOT call Firebase signOut() — only clears PWA-local session token.
 * - This keeps the browser session active while logging out of the PWA only.
 * 
 * [Browser mode]
 * - Signs out from Firebase (clears Firebase auth persistence)
 * - Clears all TWA session/storage keys
 * - Clears app lock config
 * 
 * Call this from any dashboard logout handler instead of auth.signOut() alone.
 */
export function performLogout() {
  const isPwa = isTwaMode();

  // 1. Check if we are running as a PWA / TWA
  if (isPwa) {
    // PWA logout — do NOT call Firebase signOut.
    // Only clear the PWA session flag so the browser stays logged in.
    try {
      localStorage.removeItem('kac_pwa_session');
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('kac_twa_session');
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('kac_last_route');
    } catch { /* ignore */ }
    try {
      localStorage.removeItem('kac_lock_config');
    } catch { /* ignore */ }
    try {
      sessionStorage.removeItem('kac_session_active');
      sessionStorage.removeItem('kac_session_timestamp');
    } catch { /* ignore */ }
    return;
  }

  // 2. Browser mode — normal full logout
  // Firebase sign out
  signOut(auth);

  // 3. Clear TWA session keys (localStorage)
  try {
    localStorage.removeItem('kac_twa_session');
  } catch { /* ignore */ }

  // 4. Clear last saved route
  try {
    localStorage.removeItem('kac_last_route');
  } catch { /* ignore */ }

  // 5. Clear app lock configuration (PIN/biometric setup)
  try {
    localStorage.removeItem('kac_lock_config');
  } catch { /* ignore */ }

  // 6. Clear any session storage related to app lock
  try {
    sessionStorage.removeItem('kac_session_active');
    sessionStorage.removeItem('kac_session_timestamp');
  } catch { /* ignore */ }
}
