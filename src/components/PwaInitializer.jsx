import { useEffect, useRef } from 'react';
import {
  registerSW,
  subscribeToPush,
  isPlatformAuthenticatorAvailable,
} from '../utils/pwa';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

// VAPID Public Key — used for Web Push Notifications
const VAPID_PUBLIC_KEY = 'BKxvVuqIGoY1c66eJ1rsfaGH4UlVmq7uhyg3aA6hF047qzL1DtD_NE02n16bm07DgP94_qOUb-PSxeUSWjfs26Q';

/**
 * PwaInitializer — mounts once to:
 *   1. Register the service worker
 *   2. Sync existing push subscription
 *   3. Check WebAuthn availability
 *
 * Place this inside AuthProvider so it runs after auth state is known.
 */
export default function PwaInitializer({ userId, userEmail }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      // 1. Register service worker
      const registration = await registerSW();
      if (!registration) return;

      // 2. Subscribe to push notifications if user is logged in
      if (userId && VAPID_PUBLIC_KEY) {
        const subscription = await subscribeToPush(registration, VAPID_PUBLIC_KEY);
        if (subscription) {
          // Send subscription to Firebase Firestore
          try {
            await setDoc(doc(db, 'push_subscriptions', userId), {
              subscription: JSON.parse(JSON.stringify(subscription)),
              email: userEmail,
              userId,
              updatedAt: new Date().toISOString(),
            });
          } catch (err) {
            console.error('[PWA] Failed to store push subscription:', err);
          }
        }
      }

      // 3. Check WebAuthn availability (for UI hint)
      if (userId) {
        const hasBiometric = await isPlatformAuthenticatorAvailable();
        localStorage.setItem('kac_biometric_available', String(hasBiometric));
      }
    }

    init();
  }, [userId, userEmail]);

  return null; // This component does not render anything
}
