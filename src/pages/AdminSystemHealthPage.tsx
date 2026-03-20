import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Building2,
  Calendar,
  Zap,
  Wrench,
  Power,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';

interface SystemHealth {
  timestamp: string;
  system: {
    status: string;
    uptime: number;
    systemUptime: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  database: {
    status: string;
    connected: boolean;
    collections: {
      users: number;
      businesses: number;
      bookings: number;
      restaurants: number;
      events: number;
    };
  };
  performance: {
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      count: number;
      loadAverage: number[];
      usagePercent: number;
    };
    responseTime: number;
  };
  activity: {
    last24Hours: {
      newUsers: number;
      newBookings: number;
      newBusinesses: number;
    };
    activeBookings: number;
  };
}

interface ServiceStatus {
  api: {
    status: string;
    uptime: number;
    responseTime: number;
  };
  database: {
    status: string;
    connected: boolean;
  };
  storage: {
    status: string;
    available: boolean;
  };
  email: {
    status: string;
    available: boolean;
  };
}

const AdminSystemHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [estimatedEndTime, setEstimatedEndTime] = useState('');
  const [processingMaintenance, setProcessingMaintenance] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const fetchSystemHealth = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const [healthData, serviceData, maintenanceData] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getServiceStatus(),
        adminApi.getSettings() // Maintenance status is in settings
      ]);

      if (healthData.success) {
        setSystemHealth(healthData);
      }
      
      if (serviceData.success) {
        setServiceStatus(serviceData.services);
      }

      if (maintenanceData.success) {
        setMaintenanceMode(maintenanceData.settings?.maintenanceMode || false);
        setMaintenanceMessage(maintenanceData.settings?.maintenanceMessage || '');
      }
      
      setLastUpdated(new Date());
      if (showToast) {
        toast.success('System health updated');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      if (showToast) {
        toast.error('Failed to fetch system health');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleToggleMaintenance = async () => {
    if (maintenanceMode) {
      // Disable maintenance mode
      if (!confirm('Are you sure you want to disable maintenance mode and bring the platform back online?')) {
        return;
      }
      
      setProcessingMaintenance(true);
      try {
        const data = await adminApi.toggleMaintenanceMode({
          enabled: false
        });
        
        if (data.success) {
          setMaintenanceMode(false);
          toast.success('Maintenance mode disabled - Platform is now online');
          fetchSystemHealth();
        }
      } catch (error) {
        console.error('Error disabling maintenance mode:', error);
        toast.error('Failed to disable maintenance mode');
      } finally {
        setProcessingMaintenance(false);
      }
    } else {
      // Show modal to enable maintenance mode
      setShowMaintenanceModal(true);
    }
  };

  const handleEnableMaintenance = async () => {
    if (!maintenanceMessage.trim()) {
      toast.error('Please enter a maintenance message');
      return;
    }

    setProcessingMaintenance(true);
    try {
      const data = await adminApi.toggleMaintenanceMode({
        enabled: true,
        message: maintenanceMessage,
        estimatedEndTime: estimatedEndTime || undefined
      });
      
      if (data.success) {
        setMaintenanceMode(true);
        setShowMaintenanceModal(false);
        toast.success('Maintenance mode enabled');
        fetchSystemHealth();
      }
    } catch (error) {
      console.error('Error enabling maintenance mode:', error);
      toast.error('Failed to enable maintenance mode');
    } finally {
      setProcessingMaintenance(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache?')) {
      return;
    }

    try {
      const data = await adminApi.clearCache();
      if (data.success) {
        toast.success('Cache cleared successfully');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    }
  };

  const handleRestartServices = async () => {
    if (!confirm('Are you sure you want to restart services? This may cause brief downtime.')) {
      return;
    }

    try {
      const data = await adminApi.restartServices();
      if (data.success) {
        toast.success('Service restart initiated');
      }
    } catch (error) {
      console.error('Error restarting services:', error);
      toast.error('Failed to restart services');
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'disconnected':
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading system health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                ← Back
              </button>
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">System Health</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-500 hidden md:block">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <label className="flex items-center gap-2 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="hidden sm:inline">Auto-refresh</span>
                <span className="sm:hidden">Auto</span>
              </label>
              <button
                onClick={() => fetchSystemHealth(true)}
                disabled={refreshing}
                className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Maintenance Mode Alert */}
        {maintenanceMode && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg">
            <div className="flex items-start sm:items-center gap-2 sm:gap-0">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs sm:text-sm font-medium text-yellow-800">
                  Maintenance Mode Active
                </h3>
                <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                  The platform is currently in maintenance mode. Users will see the maintenance page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              onClick={handleToggleMaintenance}
              disabled={processingMaintenance}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                maintenanceMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="truncate">{processingMaintenance ? 'Processing...' : maintenanceMode ? 'End Maintenance' : 'Start Maintenance'}</span>
            </button>
            
            <button
              onClick={handleClearCache}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Clear Cache
            </button>
            
            <button
              onClick={handleRestartServices}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
            >
              <Power className="w-4 h-4 sm:w-5 sm:h-5" />
              Restart Services
            </button>
            
            <button
              onClick={() => fetchSystemHealth(true)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              Force Refresh
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {getStatusIcon(systemHealth?.system.status || 'unknown')}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">System Status</h2>
                <p className={`text-xs sm:text-sm font-medium ${getStatusColor(systemHealth?.system.status || 'unknown')}`}>
                  {systemHealth?.system.status.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-xs sm:text-sm text-gray-500">System Uptime</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">
                {systemHealth ? formatUptime(systemHealth.system.systemUptime) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          {serviceStatus && Object.entries(serviceStatus).map(([key, service]: [string, any]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  {key === 'api' && <Server className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                  {key === 'database' && <Database className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                  {key === 'storage' && <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                  {key === 'email' && <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                  <h3 className="font-semibold text-gray-900 capitalize text-sm sm:text-base">{key}</h3>
                </div>
                {getStatusIcon(service.status)}
              </div>
              <p className={`text-xs sm:text-sm font-medium ${getStatusColor(service.status)}`}>
                {service.status.toUpperCase()}
              </p>
              {service.uptime !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Uptime: {formatUptime(service.uptime)}
                </p>
              )}
              {service.responseTime !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Response: {service.responseTime}ms
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Memory Usage */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Memory Usage</h3>
            </div>
            {systemHealth && (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Used</span>
                    <span className="font-medium text-gray-900">
                      {systemHealth.performance.memory.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        systemHealth.performance.memory.usagePercent > 80
                          ? 'bg-red-500'
                          : systemHealth.performance.memory.usagePercent > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${systemHealth.performance.memory.usagePercent}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="font-medium text-gray-900">
                      {formatBytes(systemHealth.performance.memory.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Used</p>
                    <p className="font-medium text-gray-900">
                      {formatBytes(systemHealth.performance.memory.used)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Free</p>
                    <p className="font-medium text-gray-900">
                      {formatBytes(systemHealth.performance.memory.free)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CPU Usage */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">CPU Usage</h3>
            </div>
            {systemHealth && (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Load Average</span>
                    <span className="font-medium text-gray-900">
                      {systemHealth.performance.cpu.usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        systemHealth.performance.cpu.usagePercent > 80
                          ? 'bg-red-500'
                          : systemHealth.performance.cpu.usagePercent > 60
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(systemHealth.performance.cpu.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">CPU Cores</p>
                    <p className="font-medium text-gray-900">
                      {systemHealth.performance.cpu.count}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Response Time</p>
                    <p className="font-medium text-gray-900">
                      {systemHealth.performance.responseTime}ms
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Database Collections */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Database Collections</h3>
          </div>
          {systemHealth && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {systemHealth.database.collections.users.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Users</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {systemHealth.database.collections.businesses.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Businesses</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {systemHealth.database.collections.bookings.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Bookings</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <Server className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {systemHealth.database.collections.restaurants.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Restaurants</p>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {systemHealth.database.collections.events.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Events</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Activity (Last 24 Hours)</h3>
          </div>
          {systemHealth && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">New Users</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {systemHealth.activity.last24Hours.newUsers}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">New Bookings</p>
                <p className="text-2xl font-bold text-blue-600">
                  {systemHealth.activity.last24Hours.newBookings}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">New Businesses</p>
                <p className="text-2xl font-bold text-purple-600">
                  {systemHealth.activity.last24Hours.newBusinesses}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Active Bookings</p>
                <p className="text-2xl font-bold text-orange-600">
                  {systemHealth.activity.activeBookings}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-4 sm:mt-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">System Information</h3>
          </div>
          {systemHealth && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-gray-500">Node Version</p>
                <p className="font-medium text-gray-900 break-all">{systemHealth.system.nodeVersion}</p>
              </div>
              <div>
                <p className="text-gray-500">Platform</p>
                <p className="font-medium text-gray-900">{systemHealth.system.platform}</p>
              </div>
              <div>
                <p className="text-gray-500">Architecture</p>
                <p className="font-medium text-gray-900">{systemHealth.system.arch}</p>
              </div>
              <div>
                <p className="text-gray-500">Process Uptime</p>
                <p className="font-medium text-gray-900">
                  {formatUptime(systemHealth.system.uptime)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Mode Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Enable Maintenance Mode</h2>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              This will display a maintenance page to all users. Only admins will be able to access the platform.
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We are currently performing scheduled maintenance..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Estimated End Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={estimatedEndTime}
                  onChange={(e) => setEstimatedEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleEnableMaintenance}
                disabled={processingMaintenance}
                className="flex-1 px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {processingMaintenance ? 'Enabling...' : 'Enable Maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemHealthPage;
