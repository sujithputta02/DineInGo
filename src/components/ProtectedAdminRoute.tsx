import React, { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { validateSession } from '../utils/sessionGuard';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const adminToken = localStorage.getItem('adminToken');
  const adminLoginTime = localStorage.getItem('adminLoginTime');

  // Check if admin session is expired (24 hours)
  useEffect(() => {
    if (adminToken && adminLoginTime) {
      const loginTime = new Date(adminLoginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Session expired
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminLoginTime');
      }
    }
  }, [adminToken, adminLoginTime]);

  // Validate both JWT and Obfuscated URL Session Token
  const isSessionValid = validateSession(sessionToken);

  if (!adminToken || !isSessionValid) {
    // Security: Redirect to landing page so the secret login URL is not revealed
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;