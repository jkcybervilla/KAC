import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

/**
 * Centralized logout function.
 * 1. Signs out from Firebase (clears Firebase auth persistence)
 * 2. Clears all TWA session/storage keys
 * 3. Clears app lock config
 * 
 * Call this from any dashboard logout handler instead of auth.signOut() alone.
 */
export function performLogout() {
  // 1. Firebase sign out
  signOut(auth);

  // 2. Clear TWA session keys (localStorage)
  try {
    localStorage.removeItem('kac_twa_session');
  } catch { /* ignore */ }

  // 3. Clear last saved route
  try {
    localStorage.removeItem('kac_last_route');
  } catch { /* ignore */ }

  // 4. Clear app lock configuration (PIN/biometric setup)
  try {
    localStorage.removeItem('kac_lock_config');
  } catch { /* ignore */ }

  // 5. Clear any session storage related to app lock
  try {
    sessionStorage.removeItem('kac_session_active');
    sessionStorage.removeItem('kac_session_timestamp');
  } catch { /* ignore */ }
}