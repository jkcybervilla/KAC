import React, { useState } from 'react';
import { useAppLock } from '../context/AppLockContext';

/**
 * SecuritySettings — modal dialog for app lock management:
 * - Change PIN
 * - Enable/Disable Biometric
 * - Reset lock setup (will ask setup again next time)
 */
export default function SecuritySettings({ onClose }) {
  const {
    lockType,
    biometricAvailable,
    setupPinLock,
    setupBiometricLock,
    changePin,
    toggleBiometric,
    resetLockSetup,
    isSetup,
  } = useAppLock();

  const [activeSection, setActiveSection] = useState(null); // null | 'pin' | 'biometric' | 'reset'

  const handleClose = () => {
    setActiveSection(null);
    if (onClose) onClose();
  };

  const handleBack = () => setActiveSection(null);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {activeSection ? (
              <button onClick={handleBack} style={styles.backBtn}>←</button>
            ) : null}
            Security Settings
          </h2>
          <button onClick={handleClose} style={styles.closeBtn}>✕</button>
        </div>

        {!activeSection && (
          <div style={styles.body}>
            <p style={styles.desc}>
              Manage your app lock security preferences.
            </p>

            {/* Change PIN */}
            <div style={styles.optionCard} onClick={() => setActiveSection('pin')}>
              <div style={styles.optionIcon}>#️⃣</div>
              <div style={styles.optionContent}>
                <span style={styles.optionTitle}>Change PIN</span>
                <span style={styles.optionDesc}>
                  {lockType === 'pin' || lockType === 'biometric'
                    ? 'Update your existing PIN'
                    : 'Set up a new PIN for app lock'}
                </span>
              </div>
              <span style={styles.chevron}>›</span>
            </div>

            {/* Biometric toggle */}
            {biometricAvailable && (
              <div style={styles.optionCard} onClick={() => setActiveSection('biometric')}>
                <div style={styles.optionIcon}>🖐️</div>
                <div style={styles.optionContent}>
                  <span style={styles.optionTitle}>
                    {lockType === 'biometric' ? 'Disable Biometric' : 'Enable Biometric'}
                  </span>
                  <span style={styles.optionDesc}>
                    {lockType === 'biometric'
                      ? 'Turn off fingerprint/face unlock'
                      : 'Use fingerprint or face to unlock'}
                  </span>
                </div>
                <span style={styles.chevron}>›</span>
              </div>
            )}

            {/* Reset lock setup */}
            <div style={styles.optionCard} onClick={() => setActiveSection('reset')}>
              <div style={styles.optionIcon}>🔄</div>
              <div style={styles.optionContent}>
                <span style={styles.optionTitle}>Reset Lock Setup</span>
                <span style={styles.optionDesc}>
                  Clear current lock configuration. You'll be asked to set up again next time.
                </span>
              </div>
              <span style={styles.chevron}>›</span>
            </div>
          </div>
        )}

        {activeSection === 'pin' && <PinSection onBack={handleBack} />}
        {activeSection === 'biometric' && <BiometricSection onBack={handleBack} />}
        {activeSection === 'reset' && <ResetSection onBack={handleBack} />}
      </div>
    </div>
  );
}

/**
 * Change PIN section
 */
function PinSection({ onBack }) {
  const { setupPinLock, changePin, lockType, isSetup } = useAppLock();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    // If lock already configured, use changePin; otherwise set up new PIN
    try {
      if (isSetup && changePin) {
        const result = await changePin(newPin);
        if (!result) {
          setError('Failed to change PIN. Current PIN may be incorrect.');
          return;
        }
      } else {
        const result = await setupPinLock(newPin);
        if (!result) {
          setError('Failed to set PIN.');
          return;
        }
      }
      setSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => onBack(), 1500);
    } catch {
      setError('An error occurred. Please try again.');
    }
  };

  const handleNumInput = (setter) => (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 6) setter(digits);
  };

  if (success) {
    return (
      <div style={styles.sectionBody}>
        <div style={styles.successIcon}>✓</div>
        <p style={styles.successText}>PIN updated successfully!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.sectionBody}>
      <p style={styles.sectionDesc}>
        {isSetup ? 'Enter your new PIN below.' : 'Create a 4-6 digit PIN to secure the app.'}
      </p>

      <div style={styles.inputGroup}>
        <label style={styles.label}>New PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          data-form-type="other"
          value={newPin}
          onChange={(e) => handleNumInput(setNewPin)(e.target.value)}
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
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          data-form-type="other"
          value={confirmPin}
          onChange={(e) => handleNumInput(setConfirmPin)(e.target.value)}
          style={styles.pinInput}
          placeholder="• • • •"
          maxLength={6}
        />
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        type="submit"
        style={styles.primaryBtn}
        disabled={newPin.length < 4 || confirmPin.length < 4}
      >
        {isSetup ? 'Change PIN' : 'Set PIN'}
      </button>
    </form>
  );
}

/**
 * Biometric enable/disable section
 */
function BiometricSection({ onBack }) {
  const { lockType, setupBiometricLock, toggleBiometric, biometricAvailable } = useAppLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isCurrentlyEnabled = lockType === 'biometric';

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (isCurrentlyEnabled) {
        // Disable biometric — switch to PIN only
        if (toggleBiometric) {
          await toggleBiometric();
        }
      } else {
        // Enable biometric
        const result = await setupBiometricLock();
        if (!result) {
          setError('Failed to enable biometric. Make sure your device supports it.');
          setLoading(false);
          return;
        }
      }
      setSuccess(true);
      setTimeout(() => onBack(), 1500);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.sectionBody}>
        <div style={styles.successIcon}>✓</div>
        <p style={styles.successText}>
          Biometric {isCurrentlyEnabled ? 'disabled' : 'enabled'} successfully!
        </p>
      </div>
    );
  }

  return (
    <div style={styles.sectionBody}>
      <div style={styles.biometricIcon}>
        {isCurrentlyEnabled ? '🔓' : '🔒'}
      </div>
      <p style={styles.sectionDesc}>
        {isCurrentlyEnabled
          ? 'Biometric unlock is currently enabled. You can disable it and switch to PIN only.'
          : 'Enable fingerprint or face recognition to unlock the app quickly.'}
      </p>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={handleToggle}
        style={{
          ...styles.primaryBtn,
          backgroundColor: isCurrentlyEnabled ? '#ef4444' : '#0055ff',
        }}
        disabled={loading}
      >
        {loading
          ? 'Processing...'
          : isCurrentlyEnabled
            ? 'Disable Biometric'
            : 'Enable Biometric'}
      </button>

      <button onClick={onBack} style={styles.secondaryBtn}>
        Cancel
      </button>
    </div>
  );
}

/**
 * Reset lock setup section
 */
function ResetSection({ onBack }) {
  const { resetLockSetup } = useAppLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await resetLockSetup();
      if (result === false) {
        setError('Failed to reset lock setup.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        // Close the entire modal after reset since setup screen will appear
        window.location.reload();
      }, 2000);
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.sectionBody}>
        <div style={styles.successIcon}>✓</div>
        <p style={styles.successText}>Lock setup has been reset. You'll be prompted to set up a new lock.</p>
      </div>
    );
  }

  return (
    <div style={styles.sectionBody}>
      <div style={styles.warningIcon}>⚠️</div>
      <p style={styles.sectionDesc}>
        This will remove your current lock configuration (PIN and/or biometric).
        You will be asked to set up a new lock method the next time you open the app.
      </p>

      {error && <p style={styles.error}>{error}</p>}

      <button
        onClick={handleReset}
        style={{ ...styles.primaryBtn, backgroundColor: '#ef4444' }}
        disabled={loading}
      >
        {loading ? 'Resetting...' : 'Reset Lock Setup'}
      </button>

      <button onClick={onBack} style={styles.secondaryBtn}>
        Cancel
      </button>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100000,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0a0a0a',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid #1a1a1a',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #1a1a1a',
  },
  title: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#0055ff',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
  },
  body: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  desc: {
    color: '#888',
    fontSize: '13px',
    margin: '0 0 8px',
    lineHeight: '1.4',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
  },
  optionIcon: {
    fontSize: '24px',
    width: '40px',
    textAlign: 'center',
  },
  optionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  optionTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
  },
  optionDesc: {
    color: '#888',
    fontSize: '11px',
    lineHeight: '1.3',
  },
  chevron: {
    color: '#444',
    fontSize: '20px',
  },
  sectionBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
    textAlign: 'center',
  },
  sectionDesc: {
    color: '#888',
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.5',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
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
    margin: 0,
    textAlign: 'center',
  },
  successIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    color: '#fff',
    fontSize: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  successText: {
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
  },
  warningIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  biometricIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  primaryBtn: {
    width: '100%',
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
  secondaryBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #222',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};