import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

interface MaintenanceCheckProps {
  children: React.ReactNode;
}

const MaintenanceCheck: React.FC<MaintenanceCheckProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isInMaintenance, setIsInMaintenance] = useState(false);

  const API_URL = API_CONFIG.BASE_URL;

  // Routes that should be accessible during maintenance
  const allowedRoutes = [
    '/maintenance',
    '/admin-login',
    '/admin',
  ];

  const isAllowedRoute = (path: string) => {
    return allowedRoutes.some(route => path.startsWith(route));
  };

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/admin/maintenance-status`);
        const maintenanceMode = (response.data as any).maintenanceMode;
        
        setIsInMaintenance(maintenanceMode);
        
        // If in maintenance mode and not on an allowed route, redirect to maintenance page
        if (maintenanceMode && !isAllowedRoute(location.pathname)) {
          navigate('/maintenance', { replace: true });
        }
        
        // If not in maintenance mode and on maintenance page, redirect to home
        if (!maintenanceMode && location.pathname === '/maintenance') {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      } finally {
        setChecking(false);
      }
    };

    checkMaintenanceStatus();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceCheck;
