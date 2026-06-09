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

// Storage keys
const PIN_STORAGE_KEY = 'kac_app_pin_hash';
const APP_LOCK_STATE_KEY = 'kac_app_lock_state';
const APP_LOCK_SETUP_KEY = 'kac_app_lock_setup';

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
 * AppLockProvider — manages app lock state:
 * - On first login after auth, prompts to set up lock
 * - Locks app when coming from background / cold start
 * - Supports biometric (WebAuthn) with PIN fallback
 * - Verifies Supabase/Firebase auth session
 */
export function AppLockProvider({ children }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockType, setLockType] = useState(null); // 'biometric' | 'pin' | null
  const [setupMode, setSetupMode] = useState(null); // 'biometric' | 'pin' | null
  const visibilityTimeoutRef = useRef(null);

  // Check auth state and app lock configuration
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUserId(null);
        setIsLocked(false);
        setIsSetup(false);
        setNeedsSetup(false);
        setLoading(false);
        return;
      }

      const uid = user.uid;
      setCurrentUserId(uid);

      // Check if app lock is configured for this user
      const lockState = getLockState(uid);
      const hasLock = lockState && (lockState.biometric || lockState.pin);

      if (hasLock) {
        setIsSetup(true);
        setNeedsSetup(false);
        setLockType(lockState.biometric ? 'biometric' : 'pin');
        setIsLocked(true); // Lock on cold start
      } else {
        setIsSetup(false);
        setNeedsSetup(true);
        setLockType(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  // Handle app coming from background (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App going to background — lock it
        if (isSetup && currentUserId) {
          setIsLocked(true);
        }
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
        setBiometricAvailable(false);
        return;
      }
      const available = await isPlatformAuthenticatorAvailable();
      setBiometricAvailable(available);
    }
    checkBiometric();
  }, []);

  /**
   * Setup PIN lock
   */
  const setupPinLock = useCallback(async (pin) => {
    if (!currentUserId) return false;
    if (pin.length < 4) return false;

    const pinHash = await hashPin(pin);
    saveLockState(currentUserId, { pin: pinHash, biometric: false });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType('pin');
    setIsLocked(true); // Show lock screen immediately after setup
    return true;
  }, [currentUserId]);

  /**
   * Setup biometric lock
   */
  const setupBiometricLock = useCallback(async () => {
    if (!currentUserId) return false;

    const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
    const hasCredential = stored[currentUserId];

    if (!hasCredential) {
      // Register biometric credential first
      const result = await registerBiometricCredential(currentUserId, currentUserId);
      if (!result) return false;
    }

    saveLockState(currentUserId, { pin: false, biometric: true });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType('biometric');
    setIsLocked(true);
    return true;
  }, [currentUserId]);

  /**
   * Setup both biometric + PIN fallback
   */
  const setupFullLock = useCallback(async (pin) => {
    if (!currentUserId) return false;

    // Setup biometric if available
    const stored = JSON.parse(localStorage.getItem('kac_webauthn_creds') || '{}');
    if (!stored[currentUserId] && biometricAvailable) {
      await registerBiometricCredential(currentUserId, currentUserId);
    }

    // Setup PIN
    const pinHash = await hashPin(pin);
    saveLockState(currentUserId, { pin: pinHash, biometric: biometricAvailable });
    setIsSetup(true);
    setNeedsSetup(false);
    setLockType(biometricAvailable ? 'biometric' : 'pin');
    setIsLocked(true);
    return true;
  }, [currentUserId, biometricAvailable]);

  /**
   * Unlock the app
   */
  const unlockWithBiometric = useCallback(async () => {
    if (!currentUserId) return false;

    // Try biometric first
    const result = await authenticateWithBiometric(currentUserId);
    if (result) {
      setIsLocked(false);
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
      return true;
    }
    return false;
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
  } catch {
    // ignore
  }
}

export const useAppLock = () => {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
};

export default AppLockContext;