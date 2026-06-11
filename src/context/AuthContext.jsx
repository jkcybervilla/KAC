import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Helper: detect PWA / TWA / standalone mode.
 */
function isPwaMode() {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (document.referrer && document.referrer.includes('android-app://')) return true;
  } catch { /* ignore */ }
  return false;
}

/**
 * In PWA mode we use a localStorage flag to track the session.
 * The browser mode relies on Firebase auth state.
 */
const PWA_SESSION_KEY = 'kac_pwa_session';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pwa = isPwaMode();

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // --- PWA mode: respect the local session flag ---
      if (pwa) {
        const hasPwaSession = localStorage.getItem(PWA_SESSION_KEY) === 'true';
        if (!hasPwaSession || !firebaseUser) {
          // PWA session was cleared (user logged out of PWA only)
          setUser(null);
          setProfile(null);
          setLoading(false);
          try {
            localStorage.setItem('kac_auth_state', 'unauthenticated');
          } catch { /* ignore */ }
          return;
        }
      }

      // --- Browser mode (or PWA with active session) ---
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        try {
          localStorage.setItem('kac_auth_state', 'unauthenticated');
        } catch { /* ignore */ }
        return;
      }
      setUser(firebaseUser);
      try {
        localStorage.setItem('kac_auth_state', 'authenticated');
        const snap = await getDoc(doc(db, 'users', String(firebaseUser.uid)));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            ...data,
            uid: String(firebaseUser.uid),
            assignedProjectIds: data.assignedProjectIds || [],
          });
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error(e);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isAccountant = profile?.role === 'accountant';
  const isCoordinator = profile?.role === 'coordinator';
  const isHrAssistant = profile?.role === 'hr_assistant';
  const isSuperAdmin = profile?.role === 'super_admin';
  const isExecutiveAssistant = profile?.role === 'executive_assistant';
  const canEdit = isAdmin || isSuperAdmin;
  const canDelete = isAdmin || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        userId: user?.uid || null,
        userEmail: user?.email || profile?.email || null,
        isAdmin,
        isAccountant,
        isCoordinator,
        isHrAssistant,
        isSuperAdmin,
        isExecutiveAssistant,
        canEdit,
        canDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
