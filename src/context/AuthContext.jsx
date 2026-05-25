import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      try {
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
