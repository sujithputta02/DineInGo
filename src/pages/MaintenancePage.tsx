import React, { useEffect, useState } from 'react';
import { Wrench, Clock, RefreshCw } from 'lucide-react';
import axios from 'axios';

const MaintenancePage: React.FC = () => {
  const [maintenanceInfo, setMaintenanceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/admin/maintenance-status`);
        if (response.data.success) {
          setMaintenanceInfo(response.data);
        }
      } catch (error) {
        console.error('Error fetching maintenance status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceStatus();
    
    // Check every 30 seconds if maintenance is over
    const interval = setInterval(fetchMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatEstimatedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img 
              src="/images/Dino Icon.svg" 
              alt="DineInGo" 
              className="w-16 h-16"
            />
            <h1 className="text-4xl font-bold text-gray-900">DineInGo</h1>
          </div>
        </div>

        {/* Maintenance Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-6">
            <Wrench className="w-12 h-12 text-emerald-600" />
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Under Maintenance
          </h2>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            {maintenanceInfo?.maintenanceMessage || 
              "We're currently performing scheduled maintenance to improve your experience. We'll be back shortly!"}
          </p>

          {/* Estimated Time */}
          {maintenanceInfo?.estimatedEndTime && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 px-6 py-3 rounded-full mb-8">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">
                Expected back by {formatEstimatedTime(maintenanceInfo.estimatedEndTime)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 my-8"></div>

          {/* Additional Info */}
          <div className="space-y-4 text-gray-600">
            <p className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              This page will automatically refresh when we're back online
            </p>
            
            <p className="text-sm">
              Thank you for your patience! 🦖
            </p>
          </div>

          {/* Status Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">System maintenance in progress</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Need urgent assistance? Contact us at support@dineingo.com</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
