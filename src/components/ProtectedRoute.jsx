import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!profile) return <Navigate to="/" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
