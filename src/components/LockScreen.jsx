import React, { useState, useEffect, useCallback } from 'react';
import { useAppLock } from '../context/AppLockContext';
import { useAuth } from '../context/AuthContext';

/**
 * LockScreen — shown when app is locked (cold start or coming from background).
 * Supports biometric (fingerprint/face) unlock with PIN fallback.
 */
export default function LockScreen() {
  const {
    isSetup,
    lockType,
    biometricAvailable,
    unlockWithBiometric,
    unlockWithPin,
  } = useAppLock();

  const { userEmail, profile } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [shake, setShake] = useState(false);

  // Auto-trigger biometric unlock if available
  useEffect(() => {
    if (isSetup && lockType === 'biometric' && biometricAvailable) {
      handleBiometricUnlock();
    }
  }, [isSetup, lockType, biometricAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBiometricUnlock = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const success = await unlockWithBiometric();
      if (!success) {
        // Biometric failed, show PIN fallback if available
        if (lockType === 'pin' || !biometricAvailable) {
          setShowPinInput(true);
        } else {
          setError('Biometric authentication failed. Please try again.');
        }
      }
    } catch {
      setError('Biometric authentication error.');
      setShowPinInput(true);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4) return;
    setError('');
    const success = await unlockWithPin(pin);
    if (!success) {
      setError('Incorrect PIN. Please try again.');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handlePinChange = (value) => {
    // Only allow digits
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 6) {
      setPin(digits);
      setError('');
    }
  };

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit();
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show PIN input if lock type is PIN or biometric failed and fallback to PIN
  const shouldShowPin = lockType === 'pin' || showPinInput;

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.card}>
          {/* App Logo / Icon */}
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <span style={styles.logoText}>KAC</span>
            </div>
          </div>

          <h2 style={styles.title}>App Locked</h2>
          <p style={styles.subtitle}>
            {userEmail || profile?.email || 'KAC OFFICIAL'}
          </p>

          {/* Biometric unlock (primary) */}
          {!shouldShowPin && biometricAvailable && (
            <div style={styles.biometricSection}>
              <button
                onClick={handleBiometricUnlock}
                style={styles.biometricButton}
                disabled={biometricLoading}
              >
                {biometricLoading ? (
                  <span style={styles.loadingText}>Authenticating...</span>
                ) : (
                  <>
                    <span style={styles.biometricIcon}>🔒</span>
                    <span>Unlock with Biometric</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPinInput(true)}
                style={styles.pinFallbackBtn}
              >
                Use PIN instead
              </button>
            </div>
          )}

          {/* PIN unlock (primary or fallback) */}
          {shouldShowPin && (
            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Enter PIN</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  name="security-code"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  style={{
                    ...styles.pinInput,
                    animation: shake ? 'shake 0.4s ease' : 'none',
                    borderColor: error ? '#ef4444' : '#222',
                  }}
                  placeholder="• • • •"
                  maxLength={4}
                  autoFocus
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              {biometricAvailable && lockType !== 'pin' && (
                <button
                  type="button"
                  onClick={() => setShowPinInput(false)}
                  style={styles.pinFallbackBtn}
                >
                  Use Biometric instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: '20px',
    padding: '40px 30px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #1a1a1a',
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: '24px',
  },
  logo: {
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    backgroundColor: '#0055ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  logoText: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: '900',
    letterSpacing: '-1px',
  },
  title: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#888',
    fontSize: '13px',
    margin: '0 0 32px',
    wordBreak: 'break-all',
  },
  biometricSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  biometricButton: {
    padding: '18px 24px',
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'background-color 0.2s',
  },
  biometricIcon: {
    fontSize: '20px',
  },
  loadingText: {
    color: '#fff',
    fontSize: '14px',
  },
  pinFallbackBtn: {
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #222',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    textAlign: 'left',
  },
  label: {
    color: '#888',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '1px',
    marginBottom: '8px',
    display: 'block',
    textTransform: 'uppercase',
  },
  pinInput: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '24px',
    textAlign: 'center',
    letterSpacing: '12px',
    outline: 'none',
    caretColor: '#0055ff',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: '0',
    textAlign: 'center',
  },
  unlockButton: {
    padding: '16px 24px',
    backgroundColor: '#0055ff',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
};