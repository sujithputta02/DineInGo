import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { createSession, getSessionToken } from '../../utils/sessionGuard';

interface AuthGuardianProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuardian: React.FC<AuthGuardianProps> = ({ children, requireAuth = true }) => {
  const { currentUser, backendUser, loading, isWaitlisted, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // SYSTEMATIC GUARD: Do not interfere with business portal routes
    if (location.pathname.startsWith('/business')) {
      return;
    }

    // If we require auth but user is not logged into Firebase
    if (requireAuth && !isAuthenticated) {
      if (location.pathname !== '/login' && location.pathname !== '/signup' && location.pathname !== '/') {
        navigate('/login');
      }
      return;
    }

    // If authenticated but we are on login/signup/landing, and we HAVE a backend user
    if (isAuthenticated && backendUser && (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/')) {
      // Ensure session exists
      let token = getSessionToken();
      if (!token && currentUser) {
        token = createSession(currentUser.uid);
      }
      
      if (token) {
        navigate(`/dashboard/${token}`, { replace: true });
      }
    }

    // VETTING LOGIC (Only for customer-facing routes):
    if (isAuthenticated && !backendUser && !location.pathname.startsWith('/business')) {
      // If we are still checking isWaitlisted, don't redirect yet
      if (isWaitlisted === null) return;

      if (isWaitlisted === false) {
        if (location.pathname !== '/login') {
            navigate('/login', { state: { error: "Dino says: You need early access to enter!" } });
        }
      }
      else if (isWaitlisted === true) {
        if (location.pathname !== '/signup' && location.pathname !== '/onboarding') {
          navigate('/signup');
        }
      }
    }
  }, [isAuthenticated, backendUser, loading, isWaitlisted, navigate, location.pathname, requireAuth, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"
        />
        <h2 className="text-xl font-bold text-gray-800">Dino is checking your reservation...</h2>
        <p className="text-gray-600 mt-2">Just a moment while we verify your access.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuardian;
