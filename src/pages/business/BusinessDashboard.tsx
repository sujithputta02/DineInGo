import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Users,
  TrendingUp,
  Eye,
  Edit,
  Pause,
  Play,
  BarChart3,
  Clock,
  MapPin,
  Star,
  DollarSign,
  Plus,
  Search,
  Download,
  ChefHat,
  Music,
  Trash2,
  ArrowRight,
  Target,
  Award
} from 'lucide-react';
import { businessApi, normalizeImageUrl } from '../../services/api';

// Types for business dashboard
interface Business {
  _id: string;
  name: string;
  type: 'restaurant' | 'event' | 'both';
  location: string;
  locationData?: {
    address: string;
    buildingDetails?: string;
    street?: string;
    area?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'paused' | 'draft';
  thumbnail?: string;
  rating: number;
  totalBookings: number;
  revenue: number;
  capacity: number;
  utilizationRate: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  averageRating: number;
  todayBookings: number;
  monthBookings: number;
}

interface RecentBooking {
  _id: string;
  customerName: string;
  businessName: string;
  date: string;
  time: string;
  seats: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  amount: number;
}

interface DashboardData {
  businesses: Business[];
  recentBookings: RecentBooking[];
  stats: DashboardStats;
}

const BusinessDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'businesses' | 'bookings' | 'analytics'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter businesses when search term or filter changes
  useEffect(() => {
    if (!dashboardData) return;

    const filtered = dashboardData.businesses.filter(business => {
      const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (business.locationData?.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (business.locationData?.state?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (business.locationData?.area?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (business.locationData?.street?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (business.locationData?.buildingDetails?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (business.locationData?.pincode?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterStatus === 'all' || business.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    setFilteredBusinesses(filtered);
  }, [dashboardData, searchTerm, filterStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessApi.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBusinessStatus = async (businessId: string) => {
    try {
      await businessApi.toggleStatus(businessId);
      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error toggling business status:', err);
      alert('Failed to update business status');
    }
  };

  const deleteBusiness = async (businessId: string, businessName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${businessName}"?\n\nThis action cannot be undone and will:\n• Remove the business from your dashboard\n• Delete all associated bookings\n• Remove it from user search results\n• Permanently delete all data\n\nClick OK to continue with deletion.`
    );

    if (!confirmed) return;

    const confirmText = prompt('Please type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" exactly.');
      return;
    }

    try {
      await businessApi.delete(businessId);
      alert('Business deleted successfully.');
      // Reload dashboard data to reflect changes
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error deleting business:', err);
      alert('Failed to delete business. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!dashboardData) return null;

    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
              <p className="text-emerald-100 text-lg">
                Manage your restaurants and events with ease
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <Building2 size={48} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => window.location.href = '/business/onboarding'}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-100 rounded-lg p-3">
                <Plus className="text-emerald-600" size={24} />
              </div>
              <ArrowRight className="text-slate-400 group-hover:text-emerald-600 transition-colors" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Add New Business</h3>
            <p className="text-slate-600 text-sm">Create a new restaurant or event venue</p>
          </button>

          <button
            onClick={() => window.open('/business/floor-plans', '_blank')}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <MapPin className="text-blue-600" size={24} />
              </div>
              <ArrowRight className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Design Floor Plans</h3>
            <p className="text-slate-600 text-sm">Create restaurant seating layouts</p>
          </button>

          <button
            onClick={() => window.open('/business/event-seating', '_blank')}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <Users className="text-purple-600" size={24} />
              </div>
              <ArrowRight className="text-slate-400 group-hover:text-purple-600 transition-colors" size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Event Seating</h3>
            <p className="text-slate-600 text-sm">Design event seating arrangements</p>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Businesses</p>
                <p className="text-3xl font-bold text-slate-900">{dashboardData.stats.totalBusinesses}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  {dashboardData.stats.activeBusinesses} active
                </p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-3">
                <Building2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-slate-900">{dashboardData.stats.monthBookings}</p>
                <p className="text-sm text-blue-600 mt-1">
                  {dashboardData.stats.todayBookings} today
                </p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900">₹{dashboardData.stats.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  +12% from last month
                </p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Avg Rating</p>
                <p className="text-3xl font-bold text-slate-900">{dashboardData.stats.averageRating}</p>
                <div className="flex items-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={`${i < Math.floor(dashboardData.stats.averageRating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-slate-300'
                        }`}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
              <button
                onClick={() => setViewMode('bookings')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentBookings.slice(0, 5).map(booking => (
                <div key={booking._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Users size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{booking.customerName}</p>
                      <p className="text-sm text-slate-600">{booking.businessName}</p>
                      <p className="text-xs text-slate-500">{booking.date} at {booking.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">₹{booking.amount}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBookingStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
              {dashboardData.recentBookings.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No recent bookings</p>
                  <p className="text-slate-400 text-sm">New bookings will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Business Performance</h3>
              <button
                onClick={() => setViewMode('businesses')}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {dashboardData.businesses.slice(0, 3).map(business => (
                <div key={business._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {business.type === 'restaurant' ? (
                        <ChefHat size={16} className="text-blue-600" />
                      ) : business.type === 'event' ? (
                        <Music size={16} className="text-blue-600" />
                      ) : (
                        <Building2 size={16} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{business.name}</p>
                      <p className="text-sm text-slate-600">
                        {business.locationData ? (
                          <>
                            {business.locationData.area && `${business.locationData.area}, `}
                            {business.locationData.city}, {business.locationData.state}
                          </>
                        ) : (
                          business.location
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(business.status)}`}>
                          {business.status}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">{business.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{business.utilizationRate}%</p>
                    <p className="text-xs text-slate-500">Utilization</p>
                    <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${business.utilizationRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {dashboardData.businesses.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">No businesses yet</p>
                  <button
                    onClick={() => window.location.href = '/business/onboarding'}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2"
                  >
                    Create your first business
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="bg-emerald-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <TrendingUp className="text-emerald-600" size={20} />
              </div>
              <p className="font-semibold text-slate-900">Growing Fast</p>
              <p className="text-sm text-slate-600 mt-1">Your bookings increased by 25% this month</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Target className="text-blue-600" size={20} />
              </div>
              <p className="font-semibold text-slate-900">Peak Hours</p>
              <p className="text-sm text-slate-600 mt-1">7-9 PM are your busiest hours</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Award className="text-purple-600" size={20} />
              </div>
              <p className="font-semibold text-slate-900">Top Rated</p>
              <p className="text-sm text-slate-600 mt-1">Customers love your service quality</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBusinesses = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">My Businesses</h2>
          <p className="text-slate-600 mt-1">Manage your restaurants and events</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.open('/business/floor-plans', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <MapPin size={16} />
            Floor Plans
          </button>
          <button
            onClick={() => window.open('/business/event-seating', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Users size={16} />
            Event Seating
          </button>
          <button
            onClick={() => window.location.href = '/business/onboarding'}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Business
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBusinesses.map(business => (
          <div key={business._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
              <img
                src={normalizeImageUrl(business.thumbnail)}
                alt={business.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <div className="absolute top-4 right-4">
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${getStatusColor(business.status)}`}>
                  {business.status}
                </span>
              </div>
              <div className="absolute top-4 left-4">
                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-slate-700 capitalize">
                  {business.type}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{business.name}</h3>
                  <p className="text-sm text-slate-600 flex items-center gap-1">
                    <MapPin size={14} />
                    {business.locationData ? (
                      <>
                        {business.locationData.area && `${business.locationData.area}, `}
                        {business.locationData.city}, {business.locationData.state}
                      </>
                    ) : (
                      business.location
                    )}
                  </p>
                  {business.locationData?.pincode && (
                    <p className="text-xs text-slate-500">PIN: {business.locationData.pincode}</p>
                  )}
                  {business.locationData?.buildingDetails && (
                    <p className="text-xs text-slate-500">{business.locationData.buildingDetails}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Bookings</p>
                  <p className="font-bold text-slate-900">{business.totalBookings}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Revenue</p>
                  <p className="font-bold text-slate-900">₹{business.revenue.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    <p className="font-bold text-slate-900">{business.rating}</p>
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Utilization</p>
                  <p className="font-bold text-slate-900">{business.utilizationRate}%</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = `/business/view/${business._id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={() => window.location.href = `/business/edit/${business._id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => toggleBusinessStatus(business._id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  title={business.status === 'active' ? 'Pause business' : 'Activate business'}
                >
                  {business.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => deleteBusiness(business._id, business.name)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete business"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-slate-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No businesses found</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
              : 'Get started by creating your first business and start accepting bookings.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={() => window.location.href = '/business/onboarding'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={16} />
              Create Your First Business
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bookings</h2>
          <p className="text-slate-600">Manage all your bookings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Seats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {dashboardData?.recentBookings.map((booking: RecentBooking) => (
                <tr key={booking._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{booking.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{booking.businessName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{booking.date}</div>
                    <div className="text-sm text-slate-500">{booking.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{booking.seats}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">₹{booking.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBookingStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => alert(`View booking details for ${booking.customerName} - ${booking._id}`)}
                      className="text-emerald-600 hover:text-emerald-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => alert(`Edit booking for ${booking.customerName} - ${booking._id}`)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-600">Insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Trends</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Chart visualization would go here</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Analysis</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Revenue chart would go here</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Peak Hours Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['7:00 PM', '8:00 PM', '9:00 PM'].map((hour: string, index: number) => (
            <div key={index} className="bg-emerald-50 rounded-lg p-4 text-center">
              <Clock className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="font-semibold text-emerald-800">{hour}</p>
              <p className="text-sm text-emerald-600">Peak Hour</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Business Dashboard</h1>
              <p className="text-slate-600 mt-1">Manage your restaurants and events with ease</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600">Live Dashboard</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'businesses', label: 'Businesses', icon: Building2 },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${viewMode === id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {viewMode === 'overview' && renderOverview()}
          {viewMode === 'businesses' && renderBusinesses()}
          {viewMode === 'bookings' && renderBookings()}
          {viewMode === 'analytics' && renderAnalytics()}
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;