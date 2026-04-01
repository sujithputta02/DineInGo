import React, { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { validateSession } from '../utils/sessionGuard';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const adminToken = localStorage.getItem('adminToken');
  const adminLoginTime = localStorage.getItem('adminLoginTime');
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Check for admin session expiration (24 hours)
  useEffect(() => {
    if (adminToken && adminLoginTime) {
      const loginTime = new Date(adminLoginTime);
      const hoursDiff = (new Date().getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminLoginTime');
        import('../utils/sessionGuard').then(module => module.clearSession());
      }
    }
    
    // Give useParams and hydration a moment to settle during a hard refresh
    const timer = setTimeout(() => setIsInitializing(false), 800);
    return () => clearTimeout(timer);
  }, [adminToken, adminLoginTime]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // After initialization, we check the session validity
  const isSessionValid = validateSession(sessionToken);

  if (!adminToken || !isSessionValid) {
    // SECURITY: Redirect to the secret portal path if session is invalid or missing
    return <Navigate to="/portal-secure-dino-x7b8w9v2q4m1n5p8r3t6y9" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;