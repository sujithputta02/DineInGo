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
  Award,
  Flame,
  UserCheck,
  TrendingUp as Trend,
  History,
  Shield,
  Layout,
  Briefcase,
  Megaphone,
  UserPlus,
  MessageSquare,
  Gift,
  Percent,
  Save,
  Send,
  StarHalf,
  X as CloseIcon,
  Pencil,
  X,
  Check
} from 'lucide-react';
import socketService from '../../utils/socketService';
import EmojiPicker from '../../components/EmojiPicker';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
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

const StarRating = ({ rating, size = 16, className = "" }: { rating: number | string, size?: number, className?: string }) => {
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  const fullStars = Math.floor(numericRating);
  const hasHalfStar = numericRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} className="text-yellow-400 fill-current" />
      ))}
      {hasHalfStar && <StarHalf size={size} className="text-yellow-400 fill-current" />}
      {[...Array(emptyStars > 0 ? emptyStars : 0)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="text-slate-300" />
      ))}
    </div>
  );
};

// Read URL parameter for initial view mode
const getInitialViewMode = (): 'overview' | 'businesses' | 'bookings' | 'analytics' | 'operations' | 'marketing' | 'reviews' => {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view && ['overview', 'businesses', 'bookings', 'analytics', 'operations', 'marketing', 'reviews'].includes(view)) {
    return view as 'overview' | 'businesses' | 'bookings' | 'analytics' | 'operations' | 'marketing' | 'reviews';
  }
  return 'overview';
};

const BusinessDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [viewMode, setViewMode] = useState<'overview' | 'businesses' | 'bookings' | 'analytics' | 'operations' | 'marketing' | 'reviews'>(getInitialViewMode() as any);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to change view mode and update URL
  const changeViewMode = (newView: typeof viewMode) => {
    setViewMode(newView);
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url.toString());
    // Scroll to top for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialViewMode();
      setViewMode(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedAnalyticsBusiness, setSelectedAnalyticsBusiness] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);

  // Operations state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [tableStatuses, setTableStatuses] = useState<any[]>([]);
  const [selectedOpsBusiness, setSelectedOpsBusiness] = useState<string>('');
  const [opsLoading, setOpsLoading] = useState(false);

  // Marketing & Promotions state
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [selectedMarketingBusiness, setSelectedMarketingBusiness] = useState<string>('');

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingStats, setRatingStats] = useState<any>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [selectedReviewBusiness, setSelectedReviewBusiness] = useState<string>('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isReplying, setIsReplying] = useState<Record<string, boolean>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState<string>('');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Operations data loading
  useEffect(() => {
    if (viewMode === 'operations' && selectedOpsBusiness) {
      loadOperationsData(selectedOpsBusiness);

      // Setup Socket.io listeners for real-time table updates
      socketService.joinRestaurant(selectedOpsBusiness);

      const handleTableUpdate = (updatedStatus: any) => {
        setTableStatuses(prev => {
          const index = prev.findIndex(t => t.tableId === updatedStatus.tableId);
          if (index !== -1) {
            const newStatuses = [...prev];
            newStatuses[index] = updatedStatus;
            return newStatuses;
          }
          return [...prev, updatedStatus];
        });
      };

      const handleBatchUpdate = (data: any) => {
        if (data.businessId === selectedOpsBusiness) {
          setTableStatuses(data.updates);
        }
      };

      socketService.on('tableStatusUpdate', handleTableUpdate);
      socketService.on('batchTableStatusUpdate', handleBatchUpdate);

      return () => {
        socketService.leaveRestaurant(selectedOpsBusiness);
        socketService.off('tableStatusUpdate', handleTableUpdate);
        socketService.off('batchTableStatusUpdate', handleBatchUpdate);
      };
    }
  }, [viewMode, selectedOpsBusiness]);

  // Marketing & Reviews data loading
  useEffect(() => {
    if (viewMode === 'marketing' && selectedMarketingBusiness) {
      loadMarketingData(selectedMarketingBusiness);
    }
  }, [viewMode, selectedMarketingBusiness]);

  useEffect(() => {
    if (viewMode === 'reviews' && selectedReviewBusiness) {
      loadReviewsData(selectedReviewBusiness);
    }
  }, [viewMode, selectedReviewBusiness]);

  const loadMarketingData = async (businessId: string) => {
    setMarketingLoading(true);
    try {
      const [campaignData, promoData] = await Promise.all([
        businessApi.getCampaigns(businessId),
        businessApi.getPromotions(businessId)
      ]);
      setCampaigns(campaignData);
      setPromotions(promoData);
    } catch (err: any) {
      console.error('Error loading marketing data:', err);
    } finally {
      setMarketingLoading(false);
    }
  };

  const loadReviewsData = async (businessId: string) => {
    setReviewsLoading(true);
    try {
      const [reviewData, stats] = await Promise.all([
        businessApi.getReviews(businessId),
        businessApi.getRatingStats(businessId)
      ]);
      setReviews(reviewData);
      setRatingStats(stats);
    } catch (err: any) {
      console.error('Error loading reviews data:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyTexts[reviewId];
    if (!text || !text.trim()) return;

    try {
      setIsReplying(prev => ({ ...prev, [reviewId]: true }));
      await businessApi.replyToReview(reviewId, text.trim());
      // Clear input and reload
      setReplyTexts(prev => {
        const newState = { ...prev };
        delete newState[reviewId];
        return newState;
      });
      await loadReviewsData(selectedReviewBusiness);
    } catch (err: any) {
      console.error('Error replying to review:', err);
      alert('Failed to send reply');
    } finally {
      setIsReplying(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleUpdateReply = async (reviewId: string) => {
    if (!editingReplyText.trim()) return;

    try {
      setIsReplying(prev => ({ ...prev, [reviewId]: true }));
      await businessApi.updateReply(reviewId, editingReplyText.trim());
      setEditingReplyId(null);
      await loadReviewsData(selectedReviewBusiness);
    } catch (err: any) {
      console.error('Error updating reply:', err);
      alert('Failed to update reply');
    } finally {
      setIsReplying(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete your reply?')) return;

    try {
      setIsReplying(prev => ({ ...prev, [reviewId]: true }));
      await businessApi.deleteReply(reviewId);
      await loadReviewsData(selectedReviewBusiness);
    } catch (err: any) {
      console.error('Error deleting reply:', err);
      alert('Failed to delete reply');
    } finally {
      setIsReplying(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const loadOperationsData = async (businessId: string) => {
    setOpsLoading(true);
    try {
      const [staff, shiftData, statuses] = await Promise.all([
        businessApi.getStaff(businessId),
        businessApi.getShifts(businessId),
        businessApi.getTableStatuses(businessId)
      ]);
      setStaffList(staff);
      setShifts(shiftData);
      setTableStatuses(statuses);
    } catch (err: any) {
      console.error('Error loading operations data:', err);
    } finally {
      setOpsLoading(false);
    }
  };


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

  // Fetch analytics data
  useEffect(() => {
    if (viewMode !== 'analytics') return;

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(null);

        // Fetch dashboard analytics (aggregated)
        const dashboardAnalytics = await businessApi.getDashboardAnalytics(analyticsPeriod);
        setAnalyticsData(dashboardAnalytics);

        // If a specific business is selected, fetch more granular insights
        if (selectedAnalyticsBusiness !== 'all') {
          const [heatmap, forecast, loyalty] = await Promise.all([
            businessApi.getHeatmapData(selectedAnalyticsBusiness, analyticsPeriod),
            businessApi.getRevenueForecast(selectedAnalyticsBusiness),
            businessApi.getCustomerLoyalty(selectedAnalyticsBusiness)
          ]);
          setHeatmapData(heatmap);
          setForecastData(forecast);
          setLoyaltyData(loyalty);
        } else {
          setHeatmapData(null);
          setForecastData(null);
          setLoyaltyData(null);
        }
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setAnalyticsError(err.message || 'Failed to load analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [analyticsPeriod, viewMode, selectedAnalyticsBusiness]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessApi.getDashboard();

      // Enhance businesses with real ratings calculated from reviews
      if (data && data.businesses) {
        const enhancedBusinesses = await Promise.all(data.businesses.map(async (business: Business) => {
          // Skip real API calls for mock IDs (e.g., '1', '2') to avoid 500 errors
          const isMockId = business._id.length < 10;

          if (isMockId) {
            return {
              ...business,
              rating: null // Mock businesses show as "Not rated" or use original mock value if preferred
            };
          }

          try {
            const stats = await businessApi.getRatingStats(business._id);
            // Only use stats.averageRating if there are actually reviews
            return {
              ...business,
              rating: stats.totalReviews > 0 ? stats.averageRating : null
            };
          } catch (e) {
            return {
              ...business,
              rating: null // Fallback to null (not rated) on error
            };
          }
        }));

        data.businesses = enhancedBusinesses;

        // Recalculate overall stats using only rated businesses
        const ratedBusinesses = enhancedBusinesses.filter(b => b.rating !== null);
        const totalRating = ratedBusinesses.reduce((acc, b) => acc + (b.rating || 0), 0);
        data.stats.averageRating = ratedBusinesses.length > 0 ? parseFloat((totalRating / ratedBusinesses.length).toFixed(1)) : 0;
      }

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
      `Are you sure you want to delete "${businessName}" ?\n\nThis action cannot be undone and will: \n• Remove the business from your dashboard\n• Delete all associated bookings\n• Remove it from user search results\n• Permanently delete all data\n\nClick OK to continue with deletion.`
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

  const renderMarketing = () => {
    if (marketingLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Marketing & Promotions</h2>
            <p className="text-slate-600">Engage your customers with campaigns and offers</p>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedMarketingBusiness}
              onChange={(e) => setSelectedMarketingBusiness(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select Business</option>
              {dashboardData?.businesses.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus size={16} />
              Create Campaign
            </button>
          </div>
        </div>

        {!selectedMarketingBusiness ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
            <Megaphone className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a business to manage marketing</h3>
            <p className="text-slate-600">Choose one of your businesses from the dropdown above to view its campaigns and promotions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Campaigns Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Megaphone className="text-emerald-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Recent Campaigns</h3>
                </div>
                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">View All</button>
              </div>
              <div className="divide-y divide-slate-100">
                {campaigns.length > 0 ? campaigns.map(campaign => (
                  <div key={campaign._id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{campaign.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-1">{campaign.content}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${campaign.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><UserPlus size={12} /> {campaign.metrics.sentCount} sent</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {campaign.metrics.openCount} opens</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-500">
                    <p>No campaigns found for this business.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Promotions Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Percent className="text-blue-600" size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Active Promotions</h3>
                </div>
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700"><Plus size={14} /></button>
              </div>
              <div className="divide-y divide-slate-100">
                {promotions.length > 0 ? promotions.map(promo => (
                  <div key={promo._id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                          {promo.name}
                          {promo.isHappyHour && <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full">Happy Hour</span>}
                        </h4>
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{promo.code || 'Automatic'}</code>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`} OFF
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={promo.isActive ? "text-green-600 font-medium" : "text-slate-400"}>
                        {promo.isActive ? 'Active' : 'Paused'}
                      </span>
                      <button className="text-slate-400 hover:text-slate-600">Manage</button>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-500">
                    <p>No active promotions found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviews = () => {
    if (reviewsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reviews & Feedback</h2>
            <p className="text-slate-600">Manage customer satisfaction and respond to feedback</p>
          </div>
          <select
            value={selectedReviewBusiness}
            onChange={(e) => setSelectedReviewBusiness(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Select Business</option>
            {dashboardData?.businesses.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>

        {!selectedReviewBusiness ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a business to view reviews</h3>
            <p className="text-slate-600">Monitor and respond to customer reviews across your businesses.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            {ratingStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Average Rating</p>
                  <p className="text-3xl font-bold text-slate-900">{ratingStats.averageRating.toFixed(1)}</p>
                  <div className="flex justify-center mt-1">
                    <StarRating rating={ratingStats.averageRating} size={14} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-slate-900">{ratingStats.totalReviews}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2">
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const distribution = ratingStats.ratingDistribution || {};
                      const count = distribution[star] || 0;
                      const percentage = ratingStats.totalReviews > 0 ? (count / ratingStats.totalReviews) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3 text-sm">
                          <span className="w-4">{star}★</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="w-8 text-right text-slate-500">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Review List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">All Reviews</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review._id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {review.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{review.userName}</h4>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} size={12} />
                            <span className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
                    </div>
                    <p className="text-slate-700 text-sm mb-4 leading-relaxed">{review.comment}</p>

                    {review.reply ? (
                      <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-emerald-500 group relative">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-emerald-700">Your Reply</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editingReplyId === review._id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateReply(review._id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingReplyId(null)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingReplyId(review._id);
                                    setEditingReplyText(review.reply!.text);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteReply(review._id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {editingReplyId === review._id ? (
                          <div className="relative">
                            <textarea
                              autoFocus
                              className="w-full text-sm bg-white border-slate-200 rounded p-2 pr-10 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                              value={editingReplyText}
                              onChange={(e) => setEditingReplyText(e.target.value)}
                              rows={2}
                            />
                            <div className="absolute bottom-2 right-2">
                              <EmojiPicker 
                                onEmojiSelect={(emoji) => setEditingReplyText(prev => prev + emoji)}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-700">{review.reply.text}</p>
                            <p className="text-[10px] text-slate-500 mt-2">{new Date(review.reply.repliedAt).toLocaleDateString()}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Type your response..."
                            className="w-full text-sm bg-slate-50 border-slate-200 rounded-lg focus:ring-emerald-500 pr-10"
                            value={replyTexts[review._id] || ''}
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [review._id]: e.target.value }))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleReplySubmit(review._id);
                              }
                            }}
                            disabled={isReplying[review._id]}
                          />
                          <div className="absolute bottom-1 right-1">
                            <EmojiPicker 
                              onEmojiSelect={(emoji) => setReplyTexts(prev => ({ ...prev, [review._id]: (prev[review._id] || '') + emoji }))}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleReplySubmit(review._id)}
                          disabled={isReplying[review._id] || !replyTexts[review._id]?.trim()}
                          className={`p-2 rounded-lg transition-colors ${isReplying[review._id] || !replyTexts[review._id]?.trim()
                            ? 'text-slate-300'
                            : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                        >
                          {isReplying[review._id] ? (
                            <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-500">
                    <p>No reviews found for this business.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
                {dashboardData.stats.averageRating > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900">{dashboardData.stats.averageRating}</p>
                    <div className="flex items-center mt-1">
                      <StarRating rating={dashboardData.stats.averageRating} size={14} />
                    </div>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-slate-400">No ratings yet</p>
                )}
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Businesses Now */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Active Businesses Now</h3>
              <p className="text-sm text-slate-600 mt-1">Your businesses and their current status</p>
            </div>
            <button
              onClick={() => changeViewMode('businesses')}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              View all
            </button>
          </div>

          {dashboardData.businesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData.businesses.map(business => (
                <div
                  key={business._id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${business.status === 'active' ? 'bg-green-100' :
                        business.status === 'paused' ? 'bg-yellow-100' :
                          'bg-gray-100'
                        }`}>
                        {business.type === 'restaurant' ? (
                          <ChefHat size={20} className={`${business.status === 'active' ? 'text-green-600' :
                            business.status === 'paused' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`} />
                        ) : business.type === 'event' ? (
                          <Music size={20} className={`${business.status === 'active' ? 'text-green-600' :
                            business.status === 'paused' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`} />
                        ) : (
                          <Building2 size={20} className={`${business.status === 'active' ? 'text-green-600' :
                            business.status === 'paused' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{business.name}</h4>
                        <p className="text-sm text-slate-600 mt-0.5">
                          {business.locationData ? (
                            <>
                              {business.locationData.area && `${business.locationData.area}, `}
                              {business.locationData.city}
                            </>
                          ) : (
                            business.location
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {business.status === 'active' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-green-700">Active</span>
                        </div>
                      )}
                      {business.status === 'paused' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 rounded-full">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span className="text-xs font-medium text-yellow-700">Paused</span>
                        </div>
                      )}
                      {business.status === 'draft' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-xs font-medium text-gray-700">Draft</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">Bookings</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{business.totalBookings}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">₹{business.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Rating</p>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                        {business.rating !== null ? (
                          <>
                            <StarRating rating={business.rating} size={12} />
                            <span>{business.rating}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Not rated</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => changeViewMode('businesses')}
                      className="flex-1 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => alert(`Manage ${business.name}`)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 mb-4">No businesses yet</p>
              <button
                onClick={() => window.location.href = '/business/onboarding'}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Create Your First Business
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
              <button
                onClick={() => changeViewMode('bookings')}
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
                    <span className={`inline - flex px - 2 py - 1 text - xs font - medium rounded - full ${getBookingStatusColor(booking.status)} `}>
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
                onClick={() => changeViewMode('businesses')}
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
                        <span className={`inline - flex px - 2 py - 1 text - xs font - medium rounded - full ${getStatusColor(business.status)} `}>
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
                        style={{ width: `${business.utilizationRate}% ` }}
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
                <span className={`inline - flex px - 3 py - 1 text - xs font - semibold rounded - full shadow - sm ${getStatusColor(business.status)} `}>
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
                    {business.rating !== null ? (
                      <>
                        <StarRating rating={business.rating} size={14} />
                        <p className="font-bold text-slate-900">{business.rating}</p>
                      </>
                    ) : (
                      <p className="text-[10px] font-medium text-slate-400">Not rated</p>
                    )}
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Utilization</p>
                  <p className="font-bold text-slate-900">{business.utilizationRate}%</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = `/business/app/view/${business._id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={() => window.location.href = `/business/app/edit/${business._id}`}
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
                    <span className={`inline - flex px - 2 py - 1 text - xs font - medium rounded - full ${getBookingStatusColor(booking.status)} `}>
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

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </div>
      );
    }

    if (analyticsError) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{analyticsError}</div>
          <button
            onClick={() => setAnalyticsPeriod(analyticsPeriod)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!analyticsData) return null;

    return (
      <div className="space-y-6">
        {/* Header with Period Selector */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
            <p className="text-slate-600">Insights and performance metrics</p>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedAnalyticsBusiness}
              onChange={(e) => setSelectedAnalyticsBusiness(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="all">Overall Performance</option>
              {dashboardData?.businesses.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
            <select
              value={analyticsPeriod}
              onChange={(e) => setAnalyticsPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-slate-900">{analyticsData.summary.totalBookings}</p>
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
                <p className="text-3xl font-bold text-slate-900">₹{analyticsData.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Avg Booking Value</p>
                <p className="text-3xl font-bold text-slate-900">₹{analyticsData.summary.averageBookingValue}</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Confirmation Rate</p>
                <p className="text-3xl font-bold text-slate-900">{analyticsData.summary.confirmationRate}%</p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-3">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Trends Chart */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Trends</h3>
            {analyticsData.bookingTrends.length > 0 ? (
              <div className="h-64 w-full relative min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.bookingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    < YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    < Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString();
                      }}
                    />
                    < Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart >
                </ResponsiveContainer >
              </div >
            ) : (
              <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">No booking data available</p>
                </div>
              </div>
            )}
          </div >

          {/* Revenue Analysis Chart */}
          < div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200" >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Analysis</h3>
            {
              analyticsData.revenueData.length > 0 ? (
                <div className="h-64 w-full relative min-h-[256px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString();
                        }}
                        formatter={(value: any) => [`₹${value}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">No revenue data available</p>
                  </div>
                </div>
              )
            }
          </div >
        </div >

        {/* Peak Hours Analysis */}
        < div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200" >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Peak Hours Analysis</h3>
          {
            analyticsData.peakHours.length > 0 ? (
              <div className="h-80 w-full relative min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.peakHours.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: any) => [value, 'Bookings']}
                    />
                    <Bar
                      dataKey="bookings"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center bg-slate-50 rounded-lg">
                <div className="text-center">
                  <Clock className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">No peak hours data available</p>
                </div>
              </div>
            )
          }
        </div >

        {/* Granular Insights for Selected Business */}
        {selectedAnalyticsBusiness !== 'all' && (
          <div className="space-y-8 mt-8">
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Granular Insights</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Table Heatmap */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Flame className="text-orange-600" size={20} />
                    </div>
                    <h4 className="font-semibold text-slate-900">Table Heatmap</h4>
                  </div>
                  <div className="space-y-4">
                    {heatmapData?.tables.map((table: any) => (
                      <div key={table._id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">Table {table.tableNumber}</span>
                            <span className="text-sm text-slate-500">{table.bookingCount} bookings</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${(table.bookingCount / Math.max(...heatmapData.tables.map((t: any) => t.bookingCount))) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="ml-4 text-right min-w-[80px]">
                          <p className="text-sm font-bold text-slate-900">₹{table.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {(!heatmapData?.tables || heatmapData.tables.length === 0) && (
                      <p className="text-center py-8 text-slate-500 italic">No table data available</p>
                    )}
                  </div>
                </div>

                {/* Revenue forecast */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Trend className="text-blue-600" size={20} />
                    </div>
                    <h4 className="font-semibold text-slate-900">Next 4 Weeks Forecast</h4>
                  </div>
                  {forecastData?.forecast.length > 0 ? (
                    <div className="h-64 w-full relative min-h-[256px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastData.forecast}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="week"
                            label={{ value: 'Week No.', position: 'insideBottomRight', offset: -5 }}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: any) => [`₹${value}`, 'Projected Revenue']}
                          />
                          <Line
                            type="monotone"
                            dataKey="projectedRevenue"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                        <Award className="text-blue-600" size={20} />
                        <p className="text-sm text-blue-800 font-medium">
                          Predicted growth rate: <span className="text-lg font-bold">{forecastData.avgGrowthRate}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
                      <p className="text-slate-500 italic">Insufficient data for forecasting</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Loyalty Section */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <UserCheck className="text-emerald-600" size={20} />
                  </div>
                  <h4 className="font-semibold text-slate-900">Customer Loyalty (Top Guests)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Guest Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Total Spent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Visit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {loyaltyData?.map((customer: any) => (
                        <tr key={customer._id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{customer.name || 'Anonymous'}</div>
                            <div className="text-xs text-slate-500">{customer._id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{customer.visitCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-emerald-600">₹{customer.totalSpent.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">{new Date(customer.lastVisit).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">Send Offer</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!loyaltyData || loyaltyData.length === 0) && (
                    <p className="text-center py-12 text-slate-500">No loyalty data found for this business yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOperations = () => {
    if (dashboardData?.businesses.length === 0) return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Briefcase className="mx-auto h-16 w-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-900">No Businesses Found</h3>
        <p className="text-slate-500 mt-2">Active business required for operations management.</p>
      </div>
    );

    return (
      <div className="space-y-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Operations & Staff</h2>
              <p className="text-slate-500">Manage shifts, roles, and live table occupancy</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedOpsBusiness}
                onChange={(e) => setSelectedOpsBusiness(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">Select a business...</option>
                {dashboardData?.businesses.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!selectedOpsBusiness ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Layout className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-500 font-medium">Please select a business to manage operations</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Staff Management Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Staff Members</h3>
                  <button className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  {staffList.map(staff => (
                    <div key={staff._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                          {staff.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{staff.name}</p>
                          <p className="text-xs text-slate-500">{staff.role}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${staff.role === 'Manager' ? 'bg-purple-100 text-purple-600' :
                        staff.role === 'Host' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {staff.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                    <Shield className="text-slate-600" size={20} />
                    <span className="text-xs font-medium">RBAC</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                    <History className="text-slate-600" size={20} />
                    <span className="text-xs font-medium">Logs</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Table Status Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-bold text-slate-900">Live Table Status</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Ready
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span> Occupied
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Cleaning
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {tableStatuses.length > 0 ? tableStatuses.map(table => (
                    <div
                      key={table.tableId}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${table.status === 'Ready' ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' :
                        table.status === 'Occupied' ? 'bg-red-50 border-red-100 hover:border-red-300' :
                          'bg-yellow-50 border-yellow-100 hover:border-yellow-300'
                        }`}
                      onClick={async () => {
                        const nextStatusMap: any = { 'Ready': 'Occupied', 'Occupied': 'Cleaning', 'Cleaning': 'Ready' };
                        const nextStatus = nextStatusMap[table.status] || 'Ready';
                        try {
                          await businessApi.updateTableStatus(selectedOpsBusiness, table.tableId, { status: nextStatus });
                        } catch (err) {
                          console.error('Failed to update table status');
                        }
                      }}
                    >
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">Table</p>
                      <p className="text-2xl font-black text-slate-900 mb-3">{table.tableId}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${table.status === 'Ready' ? 'bg-emerald-500 text-white' :
                          table.status === 'Occupied' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                          {table.status}
                        </span>
                        <Clock size={12} className="text-slate-400" />
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-500 text-sm">No table status data available.</p>
                      <button
                        onClick={() => {
                          const mockTableIds = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
                          businessApi.batchUpdateTableStatus(selectedOpsBusiness, mockTableIds.map(id => ({ tableId: id, status: 'Ready' })));
                        }}
                        className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                      >
                        Initialize Floor Demo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Upcoming Shifts</h3>
                <div className="space-y-4">
                  {shifts.length > 0 ? shifts.map(shift => (
                    <div key={shift._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                          <Clock className="text-emerald-600" size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{shift.staffId?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                            {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Section</p>
                        <p className="text-sm font-bold text-slate-900">{shift.section || 'General'}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-8 text-slate-400 italic text-sm">No shifts scheduled for today.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'operations', label: 'Staff & Ops', icon: Briefcase },
              { id: 'marketing', label: 'Marketing', icon: Megaphone },
              { id: 'reviews', label: 'Reviews', icon: MessageSquare }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => changeViewMode(id as any)}
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
          {viewMode === 'operations' && renderOperations()}
          {viewMode === 'marketing' && renderMarketing()}
          {viewMode === 'reviews' && renderReviews()}
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;