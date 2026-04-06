import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Shield,
  Eye,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import io from 'socket.io-client';
import { adminApi } from '../utils/adminApi';
import { API_CONFIG } from '../config/api';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  totalBookings: number;
  todayBookings: number;
  pendingBusinesses: number;
  totalRevenue: number;
  monthlyRevenue: number;
  systemHealth: number;
  responseTime: number;
}

interface ActivityItem {
  id: string;
  type: string;
  user: string;
  business?: string;
  time: string;
  status: string;
}

interface ChartData {
  name: string;
  users: number;
  businesses: number;
  revenue: number;
}

// --- Module-level sub-components (must be outside AdminDashboard to avoid TDZ errors during Vite bundling) ---

const StatCard = React.memo(function StatCard({ title, value, change, icon: Icon, color = 'emerald' }: any) {
  return (
  <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3 md:mb-4">
      <div className={`p-2.5 sm:p-3 rounded-xl bg-${color}-100`}>
        <Icon className={`text-${color}-600`} size={20} />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-[10px] sm:text-sm font-bold ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">{value?.toLocaleString() || 0}</h3>
    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{title}</p>
  </div>
  );
});

function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return <UserPlus size={16} className="text-blue-600" />;
      case 'business_created': return <Building2 size={16} className="text-purple-600" />;
      case 'booking_made': return <Calendar size={16} className="text-green-600" />;
      case 'payment_failed': return <AlertTriangle size={16} className="text-red-600" />;
      case 'notification_sent': return <MessageSquare size={16} className="text-yellow-600" />;
      default: return <Activity size={16} className="text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
      <div className="p-2 bg-slate-100 rounded-lg">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{activity.user}</p>
        {activity.business && (
          <p className="text-xs text-slate-500">at {activity.business}</p>
        )}
        <p className="text-xs text-slate-500">{activity.time}</p>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
        {activity.status}
      </span>
    </div>
  );
}

const AdminClock = React.memo(function AdminClock({ currentTime }: { currentTime: Date }) {
  return (
  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl shadow-lg">
    <div className="text-center">
      <div className="text-2xl font-bold font-mono tracking-wider transition-opacity duration-100">
        {currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: true 
        })}
      </div>
      <div className="text-xs font-medium opacity-90 mt-1">
        {currentTime.toLocaleDateString('en-US', { 
          weekday: 'short',
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}
      </div>
    </div>
  </div>
  );
});

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Real-time clock update - optimized to prevent re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_CONFIG.BASE_URL);
    setSocket(newSocket);

    // Load initial data
    loadDashboardData();

    // Set up real-time listeners
    newSocket.on('userStatusChanged', (data) => {
      console.log('User status changed:', data);
      loadDashboardData(); // Refresh stats
    });

    newSocket.on('businessStatusChanged', (data) => {
      console.log('Business status changed:', data);
      loadDashboardData(); // Refresh stats
    });

    newSocket.on('newNotification', (data) => {
      console.log('New notification sent:', data);
      // Add to recent activity
      setRecentActivity(prev => [{
        id: Date.now().toString(),
        type: 'notification_sent',
        user: `Admin (${data.sentBy})`,
        time: 'Just now',
        status: 'success'
      }, ...prev.slice(0, 9)]);
    });

    newSocket.on('adminStatusChanged', (data) => {
      console.log('Admin status changed:', data);
      // Handle admin status changes
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => {
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const data = await adminApi.getStats();

      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setChartData(data.monthlyStats || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  const userDistribution = stats ? [
    { name: 'Active Users', value: stats.activeUsers, color: '#10b981' },
    { name: 'Inactive Users', value: stats.totalUsers - stats.activeUsers, color: '#64748b' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
            <Shield className="text-red-600 shrink-0" size={28} />
            <span className="truncate">Admin Dashboard</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 whitespace-nowrap">
            System overview • {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Real-time Clock - Hidden on very small screens if needed, or made compact */}
          <div className="flex-1 xs:flex-none">
            <AdminClock currentTime={currentTime} />
          </div>
          <div className="flex gap-2 w-full xs:w-auto">
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm font-bold"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-bold">
              <Eye size={14} />
              Live
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <StatCard
            title="Total Users"
            value={stats?.totalUsers}
            change={12.5}
            icon={Users}
            color="blue"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <StatCard
            title="Active Businesses"
            value={stats?.activeBusinesses}
            change={8.2}
            icon={Building2}
            color="purple"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <StatCard
            title="Today's Bookings"
            value={stats?.todayBookings}
            change={-2.1}
            icon={Calendar}
            color="green"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <StatCard
            title="Monthly Revenue"
            value={stats?.monthlyRevenue}
            change={15.3}
            icon={DollarSign}
            color="emerald"
          />
        </motion.div>
      </motion.div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Server Uptime</span>
                <span className="font-medium">{stats?.systemHealth}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats?.systemHealth || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Response Time</span>
                <span className="font-medium">{stats?.responseTime}ms</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: '85%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">User Distribution</h3>
          <div className="w-full" style={{ height: '192px', minHeight: '192px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/notifications')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
            >
              <MessageSquare className="text-blue-600" size={20} />
              <span className="font-medium">Send Notification</span>
            </button>
            <button 
              onClick={() => navigate('/admin/users')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Users className="text-green-600" size={20} />
              <span className="font-medium">Manage Users</span>
            </button>
            <button 
              onClick={() => navigate('/admin/businesses')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Building2 className="text-purple-600" size={20} />
              <span className="font-medium">Review Businesses</span>
            </button>
            <button 
              onClick={() => navigate('/admin/analytics')}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
            >
              <BarChart3 className="text-orange-600" size={20} />
              <span className="font-medium">View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Growth</h3>
          <div className="w-full" style={{ height: '256px', minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="businesses" 
                  stackId="1" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityFeedItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trends</h3>
        <div className="w-full" style={{ height: '320px', minHeight: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

export default AdminDashboard;