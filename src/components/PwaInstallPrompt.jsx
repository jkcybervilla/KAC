import { useState, useEffect } from 'react';

/**
 * PwaInstallPrompt — shows an "Install App" banner when the beforeinstallprompt
 * event fires (Chrome on Android / some desktop browsers).
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Save the event so we can trigger it later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    console.log(
      `[PWA] Install prompt result: ${result.outcome}`,
    );
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.content}>
          <h3 style={styles.title}>Install KAC OFFICIAL</h3>
          <p style={styles.text}>
            Install this app on your device for a better experience with offline access.
          </p>
        </div>
        <div style={styles.actions}>
          <button onClick={handleDismiss} style={styles.cancelBtn}>
            Not now
          </button>
          <button onClick={handleInstall} style={styles.installBtn}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '16px',
  },
  banner: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
    color: '#000',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  content: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#000',
  },
  text: {
    margin: '6px 0 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: 'transparent',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  installBtn: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    background: '#0055ff',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};