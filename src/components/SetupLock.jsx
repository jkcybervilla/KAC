import React, { useState } from 'react';
import { useAppLock } from '../context/AppLockContext';
import { useAuth } from '../context/AuthContext';

/**
 * SetupLock — shown on first login after auth when no lock is configured.
 * Guides user through biometric + PIN setup.
 */
export default function SetupLock({ onComplete }) {
  const {
    biometricAvailable,
    setSetupMode,
    setupMode,
    setupPinLock,
    setupBiometricLock,
    setupFullLock,
  } = useAppLock();

  const { userEmail, profile } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('choose'); // 'choose' | 'setup-pin' | 'setup-biometric' | 'complete'

  const handleChooseBiometric = () => {
    setSetupMode('biometric');
    setStep('setup-biometric');
  };

  const handleChoosePin = () => {
    setSetupMode('pin');
    setStep('setup-pin');
  };

  const handleChooseBoth = () => {
    setSetupMode('both');
    setStep('setup-pin');
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    if (setupMode === 'both') {
      await setupFullLock(pin);
    } else {
      await setupPinLock(pin);
    }
    setStep('complete');
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1500);
  };

  const handleSetupBiometricOnly = async () => {
    setError('');
    const success = await setupBiometricLock();
    if (success) {
      setStep('complete');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);
    } else {
      setError('Biometric setup failed. Try setting up PIN instead.');
    }
  };

  const handlePinChange = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 6) setPin(digits);
  };

  const handleConfirmPinChange = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 6) setConfirmPin(digits);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Step: Choose method */}
        {step === 'choose' && (
          <>
            <div style={styles.logoContainer}>
              <div style={styles.logo}>
                <span style={styles.logoText}>🔒</span>
              </div>
            </div>
            <h2 style={styles.title}>Secure Your App</h2>
            <p style={styles.subtitle}>
              Protect your KAC OFFICIAL account with app lock
            </p>

            <div style={styles.options}>
              {biometricAvailable && (
                <button onClick={handleChooseBiometric} style={styles.optionButton}>
                  <span style={styles.optionIcon}>🖐️</span>
                  <div style={styles.optionContent}>
                    <span style={styles.optionTitle}>Biometric Only</span>
                    <span style={styles.optionDesc}>Use fingerprint or face to unlock</span>
                  </div>
                </button>
              )}

              <button onClick={handleChoosePin} style={styles.optionButton}>
                <span style={styles.optionIcon}>#️⃣</span>
                <div style={styles.optionContent}>
                  <span style={styles.optionTitle}>PIN Only</span>
                  <span style={styles.optionDesc}>Use a 4-6 digit PIN to unlock</span>
                </div>
              </button>

              {biometricAvailable && (
                <button onClick={handleChooseBoth} style={{...styles.optionButton, ...styles.recommended}}>
                  <span style={styles.optionIcon}>⭐</span>
                  <div style={styles.optionContent}>
                    <span style={styles.optionTitle}>Both (Recommended)</span>
                    <span style={styles.optionDesc}>Biometric with PIN backup</span>
                  </div>
                  <span style={styles.recommendedBadge}>BEST</span>
                </button>
              )}

              <button
                onClick={() => { if (onComplete) onComplete(); }}
                style={styles.skipButton}
              >
                Skip for now
              </button>
            </div>
          </>
        )}

        {/* Step: Setup PIN */}
        {step === 'setup-pin' && (
          <form onSubmit={handleSetupPin} style={styles.form}>
            <h2 style={styles.title}>Create a PIN</h2>
            <p style={styles.subtitle}>
              {setupMode === 'both'
                ? 'Set a PIN as backup for biometric unlock'
                : 'Choose a 4-6 digit PIN to secure your app'}
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                style={styles.pinInput}
                placeholder="• • • •"
                maxLength={6}
                autoFocus
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                style={styles.pinInput}
                placeholder="• • • •"
                maxLength={6}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={pin.length < 4 || confirmPin.length < 4}
            >
              Set PIN & Continue
            </button>
          </form>
        )}

        {/* Step: Setup Biometric */}
        {step === 'setup-biometric' && (
          <div style={styles.biometricSetup}>
            <div style={styles.logoContainer}>
              <div style={{...styles.logo, backgroundColor: '#0055ff'}}>
                <span style={styles.logoText}>🖐️</span>
              </div>
            </div>
            <h2 style={styles.title}>Enable Biometric</h2>
            <p style={styles.subtitle}>
              Use your device's fingerprint or face recognition to unlock the app
            </p>

            {error && <p style={styles.error}>{error}</p>}

            <button
              onClick={handleSetupBiometricOnly}
              style={styles.primaryButton}
            >
              Enable Biometric Lock
            </button>

            <button
              onClick={handleChoosePin}
              style={styles.secondaryButton}
            >
              Use PIN instead
            </button>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div style={styles.completeSection}>
            <div style={{...styles.logoContainer}}>
              <div style={{...styles.logo, backgroundColor: '#22c55e'}}>
                <span style={styles.logoText}>✓</span>
              </div>
            </div>
            <h2 style={{...styles.title, color: '#22c55e'}}>App Lock Enabled</h2>
            <p style={styles.subtitle}>
              Your app is now protected. You'll need to unlock on each session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 99998,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: '20px',
    padding: '36px 28px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #1a1a1a',
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: '20px',
  },
  logo: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    backgroundColor: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    fontSize: '28px',
  },
  logoText: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: '900',
  },
  title: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 6px',
  },
  subtitle: {
    color: '#888',
    fontSize: '13px',
    margin: '0 0 28px',
    lineHeight: '1.4',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionButton: {
    padding: '16px',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '14px',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    textAlign: 'left',
    transition: 'border-color 0.2s, background-color 0.2s',
    position: 'relative',
  },
  recommended: {
    borderColor: '#0055ff',
    backgroundColor: '#0a1628',
  },
  recommendedBadge: {
    position: 'absolute',
    top: '-8px',
    right: '12px',
    backgroundColor: '#0055ff',
    color: '#fff',
    fontSize: '9px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '1px',
  },
  optionIcon: {
    fontSize: '24px',
    width: '40px',
    textAlign: 'center',
  },
  optionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  optionTitle: {
    fontSize: '14px',
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: '11px',
    color: '#888',
  },
  skipButton: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#555',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
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
    padding: '14px',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '22px',
    textAlign: 'center',
    letterSpacing: '10px',
    outline: 'none',
    caretColor: '#0055ff',
    boxSizing: 'border-box',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    margin: '0',
    textAlign: 'center',
  },
  primaryButton: {
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
  secondaryButton: {
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #222',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '8px',
    width: '100%',
  },
  biometricSetup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  completeSection: {
    padding: '20px 0',
  },
};