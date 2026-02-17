import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const location = useLocation();
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

  if (!adminToken) {
    // Redirect to admin login with return url
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;