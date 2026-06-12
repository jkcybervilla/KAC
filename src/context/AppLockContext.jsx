import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { isTwaMode } from '../utils/pwa';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometricCredential,
  authenticateWithBiometric
} from '../utils/pwa';

const AppLockContext = createContext(null);

const APP_LOCK_STATE_KEY = 'kac_app_lock_state';

/**
 * TWA LAST ACTIVE timestamp key.
 * Stores the epoch ms when the app went to background.
 * On next open, if the time since this timestamp exceeds the threshold,
 * the lock screen is shown. This prevents lock on quick page refresh
 * (which is < 1 second) while still locking on actual cold start or
 * long background periods.
 */
const TWA_LAST_ACTIVE_KEY = 'kac_twa_last_active';

/** Time threshold in ms — lock only if app was away longer than this. */
const BACKGROUND_LOCK_THRESHOLD_MS = 30 * 1000; // 30 seconds

// Legacy TWA session keys — kept for backwards compatibility during transition
const TWA_SESSION_KEY = 'kac_twa_session';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Store current timestamp when app goes to background.
 */
function setTwaLastActive() {
  try {
    localStorage.setItem(TWA_LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Remove the last-active timestamp after successful unlock/login.
 */
function clearTwaLastActive() {
  try {
    localStorage.removeItem(TWA_LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if the app should be locked based on elapsed time since last active.
 * Returns true only if the elapsed time exceeds the given threshold.
 *
 * @param {number} [thresholdMs=BACKGROUND_LOCK_THRESHOLD_MS]
 * @returns {boolean}
 */
function shouldLockOnResume(thresholdMs = BACKGROUND_LOCK_THRESHOLD_MS) {
  try {
    const stored = localStorage.getItem(TWA_LAST_ACTIVE_KEY);
    if (!stored) {
      // No stored timestamp — this is a cold start or first visit → should lock
      return true;
    }
    const elapsed = Date.now() - Number(stored);
    // If elapsed is negative or NaN (invalid data), treat as cold start → lock
    if (Number.isNaN(elapsed) || elapsed < 0) return true;
    return elapsed >= thresholdMs;
  } catch {
    return true; // On error, default to locked (safe behavior)
  }
}

/**
 * Simple hash function for PIN (not cryptographic, but prevents plain text storage)
 * Uses SHA-256 via browser SubtleCrypto API
 */
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'kac-app-lock-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clear the legacy TWA session markers from localStorage.
 * This is called on explicit logout (via performLogout utility)
 * and on auth state becoming null.
 */
function clearSession() {
  try {
    localStorage.removeItem(TWA_SESSION_KEY);
    localStorage.removeItem(TWA_SESSION_KEY + '_ts');
  } catch {
    // ignore
  }
}

/**
 * AppLockProvider — manages app lock state:
 * - On first login after auth, prompts to set up lock
 * - Locks app when coming from background / cold start via timestamp-based check
 * - Stores kac_twa_last_active timestamp when app goes to background (visibilitychange)
 * - On app open: checks elapsed time since that timestamp.
 *   Only shows lock if elapsed time > BACKGROUND_LOCK_THRESHOLD_MS (30s).
 *   Page refresh takes <1s → no lock. Actual cold start or long background → lock.
 * - After successful PIN/biometric unlock → removes kac_twa_last_active
 * - Supports biometric (WebAuthn) with PIN fallback
 *
 * ALL lock features are ONLY active when app runs as TWA (Android).
 * In regular browser mode, lock is completely bypassed.
 */
export function AppLockProvider({ children }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockType, setLockType] = useState(null);
  const [setupMode, setSetupMode] = useState(null);

  // Check if app is running as TWA
  const twaMode = isTwaMode();

  // Track if auth was ever detected (to avoid premature setup prompt)
  const hasAuthFired = useRef(false);
  // Timestamp when app went to background
  const backgroundTimeRef = useRef(null);
  // Ref to check if session was already evaluated on mount
  const sessionEvaluatedRef = useRef(false);

  // If NOT in TWA mode, skip all lock logic and just render children
  // This ensures lock features are ONLY available on Android TWA
  useEffect(() => {
    if (!twaMode) {
      console.debug('[AppLock] Not in TWA mode — skipping all lock features');
      setLoading(false);
    }
  }, [twaMode]);

  // Check auth state and app lock configuration
  useEffect(() => {
    // Skip all lock logic in non-TWA mode
    if (!twaMode) return;

    console.debug('[AppLock] Subscribing to auth state changes');
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.debug('[AppLock] Auth state changed. User:', user?.uid || null);

      if (!user) {
        console.debug('[AppLock] No user — resetting lock state');
        setCurrentUserId(null);
        setIsLocked(false);
        setIsSetup(false);
        setNeedsSetup(false);
        setLoading(false);
        hasAuthFired.current = false;
        sessionEvaluatedRef.current = false;
        clearSession();
        return;
      }

      const uid = user.uid;
      setCurrentUserId(uid);
      hasAuthFired.current = true;

      // Check if app lock is configured for this user
      const lockState = getLockState(uid);
      const hasLock = lockState && (lockState.biometric || lockState.pin);
      console.debug('[AppLock] Lock state for user:', uid, lockState, 'hasLock:', hasLock);

      if (hasLock) {
        setIsSetup(true);
        setNeedsSetup(false);
        setLockType(lockState.biometric ? 'biometric' : 'pin');

        // Check if app should be locked based on elapsed time since last active:
        // - If kac_twa_last_active is absent → cold start, lock
        // - If elapsed time < 30s → page refresh, no lock
        // - If elapsed time >= 30s → real background/cold start, lock
        if (!sessionEvaluatedRef.current) {
          sessionEvaluatedRef.current = true;
          const shouldLock = shouldLockOnResume();
          console.debug('[AppLock] shouldLockOnResume:', shouldLock);
          setIsLocked(shouldLock);
          if (!shouldLock) {
            // Was a quick return (page refresh) — clear stale timestamp
            clearTwaLastActive();
          }
        } else {
          // Subsequent auth state changes (e.g. re-auth) — lock
          setIsLocked(true);
        }
      } else {
        setIsSetup(false);
        setIsLocked(false);
        setLockType(null);

        // Check if user already completed or skipped setup this session
        const setupDoneInSession = (() => {
          try { return sessionStorage.getItem('kac_setup_done') === 'true'; } catch { return false; }
        })();

        // Check if lock config exists in localStorage (kac_lock_config)
        const hasLockConfig = (() => {
          try { return localStorage.getItem('kac_lock_config') !== null; } catch { return false; }
        })();

        if (setupDoneInSession || hasLockConfig) {
          // Already completed or skipped setup — don't show SetupLock
          setNeedsSetup(false);
          console.debug('[AppLock] Setup already done (session or config) — skipping setup prompt');
        } else {
          setNeedsSetup(true);
          console.debug('[AppLock] No lock configured — needs setup');
        }
      }

      setLoading(false);
    });

    return () => {
      console.debug('[AppLock] Unsubscribing auth listener');
      unsub();
    };
  }, [twaMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle app going to/coming from background (visibility change)
  // Stores kac_twa_last_active timestamp when app goes to background.
  // On returning to foreground: if elapsed < threshold, clears the timestamp
  // (grace period); otherwise leaves it so the mount check shows lock.
  useEffect(() => {
    // Skip visibility tracking in non-TWA mode
    if (!twaMode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App going to background — store timestamp
        backgroundTimeRef.current = Date.now();
        console.debug('[AppLock] App going to background — storing last active timestamp');
        setTwaLastActive();
      } else if (document.visibilityState === 'visible') {
        // App coming back to foreground
        if (backgroundTimeRef.current && isSetup && currentUserId) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          console.debug('[AppLock] App back to foreground after', elapsed, 'ms');

          if (elapsed > BACKGROUND_LOCK_THRESHOLD_MS) {
            // More than 30 seconds — keep the timestamp, lock will show on re-check
            console.debug('[AppLock] Background timeout exceeded — lock will be shown');
          } else {
            // Within 30 seconds — clear the timestamp (grace period, no PIN needed)
            console.debug('[AppLock] Within grace period — clearing last active timestamp');
            clearTwaLastActive();
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSetup, currentUserId, twaMode]);

  // Check biometric availability
  useEffect(() => {
    // Skip biometric checks in non-TWA mode
    if (!twaMode) return;

    async function checkBiometric() {
      const supported = isWebAuthnSupported();
      if (!supported) {
        console.debug('[AppLock] WebAuthn not supported on this device');
        setBiometricAvailable(false);
        return;
      }
      const available = await isPlatformAuthenticatorAvailable();
      console.debug('[AppLock] Platform authenticator available:', available);
      setBiometricAvailable(available);
    }
    checkBiometric();
  }, [twaMode]);

  /**
   * After successful unlock, clear the kac_twa_last_active timestamp
   * so that PIN is not requested on next navigation within the same session.
   */
  const markSessionAfterUnlock = useCallback(() => {
    clearTwaLastActive();
  }, []);

  /**
   * Setup PIN lock
   */
  const setupPinLock = useCallback(async (pin) => {
    if (!currentUserId) {
      console.warn('[AppLock] setupPinLock: no currentUserId');
      return false;
    }
    if (pin.length < 4) return false;

    const pinHash = await hashPin(pin);
    saveLockState(currentUserId, { pin: pinHash, biometric: false });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType('pin');
    setIsLocked(false);
    clearTwaLastActive();
    console.debug('[AppLock] PIN lock set up successfully');
    return true;
  }, [currentUserId]);

  /**
   * Setup biometric lock
   */
  const setupBiometricLock = useCallback(async () => {
    if (!currentUserId) {
      console.warn('[AppLock] setupBiometricLock: no currentUserId');
      return false;
    }

    const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
    const hasCredential = stored[currentUserId];

    if (!hasCredential) {
      const result = await registerBiometricCredential(currentUserId, currentUserId);
      if (!result) {
        console.warn('[AppLock] Biometric registration failed');
        return false;
      }
    }

    saveLockState(currentUserId, { pin: false, biometric: true });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType('biometric');
    setIsLocked(false);
    clearTwaLastActive();
    console.debug('[AppLock] Biometric lock set up successfully');
    return true;
  }, [currentUserId]);

  /**
   * Setup both biometric + PIN fallback
   */
  const setupFullLock = useCallback(async (pin) => {
    if (!currentUserId) return false;

    const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
    if (!stored[currentUserId] && biometricAvailable) {
      await registerBiometricCredential(currentUserId, currentUserId);
    }

    const pinHash = await hashPin(pin);
    saveLockState(currentUserId, { pin: pinHash, biometric: biometricAvailable });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType(biometricAvailable ? 'biometric' : 'pin');
    setIsLocked(false);
    clearTwaLastActive();
    console.debug('[AppLock] Full lock set up successfully');
    return true;
  }, [currentUserId, biometricAvailable]);

  /**
   * Unlock the app
   */
  const unlockWithBiometric = useCallback(async () => {
    if (!currentUserId) return false;

    const result = await authenticateWithBiometric(currentUserId);
    if (result) {
      setIsLocked(false);
      clearTwaLastActive();
      console.debug('[AppLock] Unlocked via biometric');
      return true;
    }
    return false;
  }, [currentUserId]);

  const unlockWithPin = useCallback(async (pin) => {
    if (!currentUserId) return false;

    const lockState = getLockState(currentUserId);
    if (!lockState || !lockState.pin) return false;

    const pinHash = await hashPin(pin);
    if (pinHash === lockState.pin) {
      setIsLocked(false);
      clearTwaLastActive();
      console.debug('[AppLock] Unlocked via PIN');
      return true;
    }
    return false;
  }, [currentUserId]);

  /**
   * Change PIN — updates the PIN hash in lock state
   */
  const changePin = useCallback(async (newPin) => {
    if (!currentUserId) {
      console.warn('[AppLock] changePin: no currentUserId');
      return false;
    }
    if (newPin.length < 4) return false;

    const lockState = getLockState(currentUserId);
    if (!lockState) {
      // No existing lock state — set up fresh PIN-only lock
      return await setupPinLock(newPin);
    }

    const pinHash = await hashPin(newPin);
    saveLockState(currentUserId, {
      ...lockState,
      pin: pinHash,
    });
    setIsSetup(true);
    setLockType(lockState.biometric ? 'biometric' : 'pin');
    console.debug('[AppLock] PIN changed successfully');
    return true;
  }, [currentUserId, setupPinLock]);

  /**
   * Toggle biometric — enable/disable biometric without changing PIN
   */
  const toggleBiometric = useCallback(async () => {
    if (!currentUserId) {
      console.warn('[AppLock] toggleBiometric: no currentUserId');
      return false;
    }

    const lockState = getLockState(currentUserId);
    if (!lockState) return false;

    const currentlyBiometric = lockState.biometric === true;

    if (currentlyBiometric) {
      // Disable biometric — keep PIN only
      if (!lockState.pin) {
        console.warn('[AppLock] Cannot disable biometric — no PIN fallback');
        return false;
      }
      saveLockState(currentUserId, { pin: lockState.pin, biometric: false });
      setLockType('pin');
      console.debug('[AppLock] Biometric disabled');
    } else {
      // Enable biometric
      const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
      if (!stored[currentUserId]) {
        const result = await registerBiometricCredential(currentUserId, currentUserId);
        if (!result) {
          console.warn('[AppLock] Biometric registration failed during toggle');
          return false;
        }
      }
      saveLockState(currentUserId, { pin: lockState.pin || false, biometric: true });
      setLockType('biometric');
      console.debug('[AppLock] Biometric enabled');
    }

    return true;
  }, [currentUserId]);

  /**
   * Reset lock setup — clear lock state so user is prompted to set up again
   */
  const resetLockSetup = useCallback(() => {
    if (!currentUserId) {
      console.warn('[AppLock] resetLockSetup: no currentUserId');
      return false;
    }

    try {
      const all = JSON.parse(localStorage.getItem(APP_LOCK_STATE_KEY) || '{}');
      delete all[currentUserId];
      localStorage.setItem(APP_LOCK_STATE_KEY, JSON.stringify(all));
      console.debug('[AppLock] Lock state cleared for user:', currentUserId);
    } catch {
      // ignore
    }

    setIsSetup(false);
    setNeedsSetup(true);
    setLockType(null);
    setIsLocked(false);
    clearSession();

    console.debug('[AppLock] Lock setup reset — user will be prompted on next open');
    return true;
  }, [currentUserId]);

  // Provide default lock state when not in TWA mode
  const lockState = !twaMode ? {
    isLocked: false,
    isSetup: false,
    needsSetup: false,
    biometricAvailable: false,
    loading: false,
    lockType: null,
    setupMode: null,
    setSetupMode: () => {},
    setupPinLock: async () => false,
    setupBiometricLock: async () => false,
    setupFullLock: async () => false,
    unlockWithBiometric: async () => false,
    unlockWithPin: async () => false,
    changePin: async () => false,
    toggleBiometric: async () => false,
    resetLockSetup: () => false,
    markSessionAfterUnlock: () => {},
  } : null;

  const value = lockState || {
    isLocked,
    isSetup,
    needsSetup,
    biometricAvailable,
    loading,
    lockType,
    setupMode,
    setSetupMode,
    setupPinLock,
    setupBiometricLock,
    setupFullLock,
    unlockWithBiometric,
    unlockWithPin,
    changePin,
    toggleBiometric,
    resetLockSetup,
    markSessionAfterUnlock,
  };

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

/**
 * Get lock state for a specific user from localStorage
 */
function getLockState(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(APP_LOCK_STATE_KEY) || '{}');
    return all[userId] || null;
  } catch {
    return null;
  }
}

/**
 * Save lock state for a specific user to localStorage
 */
function saveLockState(userId, state) {
  try {
    const all = JSON.parse(localStorage.getItem(APP_LOCK_STATE_KEY) || '{}');
    all[userId] = state;
    localStorage.setItem(APP_LOCK_STATE_KEY, JSON.stringify(all));
    console.debug('[AppLock] Lock state saved for user:', userId, state);
  } catch {
    // ignore
  }
}

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
};

/**
 * Export lock helpers for external use (e.g., from login page)
 * so that after successful login, the session is marked active.
 * This prevents PIN screen on refresh — only shows on cold start or long background.
 */
export { clearTwaLastActive, setTwaLastActive, shouldLockOnResume, clearSession };

export default AppLockContext;