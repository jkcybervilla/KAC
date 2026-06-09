import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometricCredential,
  authenticateWithBiometric
} from '../utils/pwa';

const AppLockContext = createContext(null);

const APP_LOCK_STATE_KEY = 'kac_app_lock_state';

// SESSION STORAGE keys for Issue #2: PIN asked on every refresh fix
const SESSION_ACTIVE_KEY = 'kac_session_active';
const SESSION_TIMESTAMP_KEY = 'kac_session_timestamp';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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
 * Check if there's a valid session in sessionStorage.
 * Returns true if session is active and not expired (within 5 min of last activity).
 */
function isSessionActive() {
  try {
    const active = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (active !== 'true') return false;

    const timestamp = parseInt(sessionStorage.getItem(SESSION_TIMESTAMP_KEY), 10);
    if (!timestamp) return false;

    const elapsed = Date.now() - timestamp;
    // If session is older than INACTIVITY_TIMEOUT_MS, it's expired
    if (elapsed > INACTIVITY_TIMEOUT_MS) {
      // Clear expired session
      sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark the session as active in sessionStorage.
 */
function markSessionActive() {
  try {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // sessionStorage may not be available
  }
}

/**
 * Clear the session markers.
 */
function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch {
    // ignore
  }
}

/**
 * AppLockProvider — manages app lock state:
 * - On first login after auth, prompts to set up lock
 * - Locks app when coming from background / cold start (with 5 min grace)
 * - Supports biometric (WebAuthn) with PIN fallback
 * - Stores active session in sessionStorage to avoid lock on page refresh
 * - Tracks background time via visibilitychange to lock after 5 min inactivity
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

  // Track if auth was ever detected (to avoid premature setup prompt)
  const hasAuthFired = useRef(false);
  // Timestamp when app went to background
  const backgroundTimeRef = useRef(null);
  // Ref to check if session was already evaluated on mount
  const sessionEvaluatedRef = useRef(false);

  // Check auth state and app lock configuration
  useEffect(() => {
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

        // Issue #2: Check sessionStorage — only lock if no valid session
        if (!sessionEvaluatedRef.current) {
          sessionEvaluatedRef.current = true;
          const sessionOk = isSessionActive();
          console.debug('[AppLock] Session active:', sessionOk);
          if (sessionOk) {
            // Valid session exists — skip lock screen (this is a refresh, not cold start)
            setIsLocked(false);
            // Refresh the session timestamp
            markSessionActive();
          } else {
            // No valid session — this is a cold start or expired tab
            setIsLocked(true);
          }
        } else {
          // Subsequent auth state changes (e.g. re-auth) — lock
          setIsLocked(true);
        }
      } else {
        setIsSetup(false);
        setNeedsSetup(true);
        setLockType(null);
        setIsLocked(false);
        console.debug('[AppLock] No lock configured — needs setup');
      }

      setLoading(false);
    });

    return () => {
      console.debug('[AppLock] Unsubscribing auth listener');
      unsub();
    };
  }, []);

  // Handle app coming from background (visibility change)
  // Lock only if more than 5 minutes have passed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App going to background — record the time
        backgroundTimeRef.current = Date.now();
        console.debug('[AppLock] App going to background at', backgroundTimeRef.current);
      } else if (document.visibilityState === 'visible') {
        // App coming back to foreground
        if (backgroundTimeRef.current && isSetup && currentUserId) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          console.debug('[AppLock] App back to foreground after', elapsed, 'ms');

          if (elapsed > INACTIVITY_TIMEOUT_MS) {
            // More than 5 minutes — lock the app
            console.debug('[AppLock] Inactivity timeout exceeded — locking');
            setIsLocked(true);
            clearSession();
          } else {
            // Within 5 minutes — keep unlocked, refresh session
            markSessionActive();
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSetup, currentUserId]);

  // Check biometric availability
  useEffect(() => {
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
  }, []);

  /**
   * After successful unlock, mark session as active
   */
  const markSessionAfterUnlock = useCallback(() => {
    markSessionActive();
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
    markSessionActive();
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
    markSessionActive();
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
    markSessionActive();
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
      markSessionActive();
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
      markSessionActive();
      console.debug('[AppLock] Unlocked via PIN');
      return true;
    }
    return false;
  }, [currentUserId]);

  /**
   * Issue #1: Change PIN — updates the PIN hash in lock state
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
   * Issue #1: Toggle biometric — enable/disable biometric without changing PIN
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
   * Issue #1: Reset lock setup — clear lock state so user is prompted to set up again
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

  const value = {
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
    // New methods for Issue #1
    changePin,
    toggleBiometric,
    resetLockSetup,
    // Expose markSessionAfterUnlock for external unlock handlers
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
 * Export markSessionActive for external use (e.g., from login page)
 * so that after successful login, the session is marked active.
 * This prevents PIN screen on refresh — only shows on cold start.
 */
export { markSessionActive, clearSession };

export default AppLockContext;
