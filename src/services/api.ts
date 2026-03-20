import { auth } from '../firebase';

import { API_CONFIG } from '../config/api';
const API_URL = API_CONFIG.BASE_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Normalize image URL to ensure it's a full URL
 * If the path is relative, prepend the API URL
 */
export const normalizeImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) return '/images/placeholder.jpg';
  
  // Normalize: If the path already contains a localhost URL (from development DB)
  // replace it with the current API_URL.
  if (imagePath.includes('localhost:5001')) {
    return imagePath.replace(/https?:\/\/localhost:5001/, API_URL);
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/images/')) {
    return imagePath; // Local placeholder images
  }
  
  // Ensure path starts with / if it's relative
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_URL}${normalizedPath}`;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleApiError = (error: any) => {
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return 'Unable to connect to the server. Please check your internet connection or try again later.';
  }
  return error.message || 'An unexpected error occurred';
};

/**
 * Get Firebase auth token for API requests
 */
const getAuthToken = async (): Promise<string | null> => {
  // For development purposes, we're using a simplified authentication approach
  // In production, we would properly use Firebase authentication
  try {
    const user = auth.currentUser;
    if (user) {
      return user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Make an authenticated request to the API
 */
const apiRequest = async (url: string, method: string = 'GET', data?: any, retries = 3) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const defaultOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: controller.signal,
    mode: 'cors',
    credentials: 'omit',
    ...(data && { body: JSON.stringify(data) })
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < retries) {
    attempt++;
    try {
      const response = await fetch(url, defaultOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API returned ${response.status}: ${errorText}`);
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Clear timeout to prevent memory leaks
      clearTimeout(timeoutId);

      // Check if it's an abort error (timeout or cancelled)
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        lastError = new Error('Request timeout - backend server may not be running');
      } else {
        console.error(`API request attempt ${attempt} failed:`, error);
        lastError = error;
      }

      if (attempt < retries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
    }
  }

  // If we've exhausted retries, return mock data in development
  if (process.env.NODE_ENV !== 'production') {
    return getMockDataForEndpoint(url);
  }

  throw lastError || new Error('Request failed');
};

// Helper function to return mock data for various endpoints
const getMockDataForEndpoint = (url: string) => {
  // Basic mock responses based on URL patterns
  if (url.includes('/api/v1/bookings')) {
    // Return an array of mock bookings for getAll
    if (url.match(/\/api\/bookings\/user\//)) {
      return [
        { id: 'mock-booking-id-1', status: 'confirmed', restaurantName: 'Mock Restaurant 1', date: '2024-06-01', time: '7:00 PM', guests: 2 },
        { id: 'mock-booking-id-2', status: 'pending', restaurantName: 'Mock Restaurant 2', date: '2024-06-02', time: '8:00 PM', guests: 4 }
      ];
    }

    // For booking creation (POST request)
    if (url.endsWith('/api/v1/bookings') && !url.includes('?')) {
      return {
        id: `mock-booking-${Date.now()}`,
        status: 'confirmed',
        message: 'Booking created successfully (mock data)',
        createdAt: new Date().toISOString()
      };
    }

    // For table booking confirmation
    if (url.includes('/confirm-table')) {
      return {
        success: true,
        message: 'Table booking confirmed (mock data)',
        tableId: 'mock-table-id'
      };
    }

    // For table bookings queries
    if (url.includes('table-bookings') || url.includes('booked-tables')) {
      return [];
    }

    // Otherwise, return a single booking object
    return {
      id: 'mock-booking-id',
      status: 'confirmed',
      restaurantName: 'Mock Restaurant',
      date: '2024-06-01',
      time: '7:00 PM',
      guests: 2
    };
  }

  if (url.includes('/api/v1/restaurants')) {
    const idMatch = url.match(/\/restaurants\/([^\/]+)/);
    const id = idMatch ? idMatch[1] : '1';
    return {
      id,
      name: `Mock Restaurant ${id}`,
      location: { city: 'Mock City', state: 'Mock State' },
      rating: 4.5
    };
  }

  if (url.includes('/api/v1/business')) {
    // Business API mock responses
    if (url.includes('/dashboard/')) {
      return {
        businesses: [
          {
            _id: '1',
            name: 'Mock Restaurant',
            type: 'restaurant',
            location: 'Mock City',
            status: 'active',
            totalBookings: 100,
            revenue: 50000,
            rating: 4.5,
            utilizationRate: 75
          }
        ],
        recentBookings: [],
        stats: {
          totalBusinesses: 1,
          activeBusinesses: 1,
          totalRevenue: 50000,
          averageRating: 4.5,
          todayBookings: 5,
          monthBookings: 100
        }
      };
    }

    if (url.includes('/owner/')) {
      return [
        {
          _id: '1',
          name: 'Mock Restaurant',
          type: 'restaurant',
          location: 'Mock City',
          status: 'active',
          totalBookings: 100,
          revenue: 50000,
          rating: 4.5,
          utilizationRate: 75
        }
      ];
    }

    if (url.includes('/validate')) {
      return {
        isValid: true,
        errors: [],
        canDeploy: true
      };
    }

    if (url.includes('/deploy')) {
      return {
        message: 'Business deployed successfully (mock)',
        isLive: true
      };
    }

    if (url.includes('/analytics/heatmap')) {
      return {
        tables: [
          { _id: 't1', tableNumber: '1', bookingCount: 15, revenue: 3000 },
          { _id: 't2', tableNumber: '2', bookingCount: 12, revenue: 2400 },
          { _id: 't5', tableNumber: '5', bookingCount: 20, revenue: 4000 }
        ],
        time: [
          { _id: '12:00', count: 10 },
          { _id: '19:00', count: 25 },
          { _id: '20:00', count: 30 }
        ],
        days: [
          { _id: 1, count: 5 },
          { _id: 6, count: 40 },
          { _id: 7, count: 45 }
        ]
      };
    }

    if (url.includes('/analytics/forecast')) {
      return {
        historical: [
          { _id: { year: 2024, week: 20 }, revenue: 5000, bookings: 10 },
          { _id: { year: 2024, week: 21 }, revenue: 5500, bookings: 12 }
        ],
        forecast: [
          { week: 22, projectedRevenue: 6000, confidence: 0.9 },
          { week: 23, projectedRevenue: 6500, confidence: 0.8 }
        ],
        avgGrowthRate: '10%'
      };
    }

    if (url.includes('/analytics/loyalty')) {
      return [
        { _id: 'user1@example.com', name: 'John Doe', visitCount: 5, totalSpent: 2500, lastVisit: '2024-05-20', phone: '1234567890' },
        { _id: 'user2@example.com', name: 'Jane Smith', visitCount: 3, totalSpent: 1500, lastVisit: '2024-05-18', phone: '0987654321' }
      ];
    }

    if (url.includes('/staff')) {
      return [
        { _id: 's1', name: 'John Manager', email: 'john@example.com', role: 'Manager', status: 'active' },
        { _id: 's2', name: 'Sarah Host', email: 'sarah@example.com', role: 'Host', status: 'active' },
        { _id: 's3', name: 'Mike Waiter', email: 'mike@example.com', role: 'Waiter', status: 'active' }
      ];
    }

    if (url.includes('/shifts')) {
      return [
        { _id: 'sh1', staffId: { _id: 's1', name: 'John Manager' }, startTime: new Date().toISOString(), endTime: new Date().toISOString(), role: 'Manager', status: 'scheduled' }
      ];
    }

    if (url.includes('/table-status')) {
      return [
        { tableId: 't1', status: 'Ready' },
        { tableId: 't2', status: 'Occupied' },
        { tableId: 't5', status: 'Cleaning' }
      ];
    }

    // Default business response
    return {
      id: 'mock-business-id',
      name: 'Mock Business',
      type: 'restaurant',
      status: 'active'
    };
  }

  // Default mock response
  return { success: true, mock: true };
};

// Business API endpoints
export const businessApi = {
  // Create a new business
  create: async (businessData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const formData = new FormData();

    // Add business data
    const business = {
      ...businessData,
      ownerId: user.uid,
      status: 'draft'
    };

    // Handle file uploads
    if (businessData.thumbnail instanceof File) {
      formData.append('thumbnail', businessData.thumbnail);
      delete business.thumbnail;
    }
    if (businessData.coverImage instanceof File) {
      formData.append('coverImage', businessData.coverImage);
      delete business.coverImage;
    }

    // Add business data as JSON
    formData.append('data', JSON.stringify(business));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for file uploads

    try {
      const response = await fetch(`${API_URL}/api/v1/business`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - please try again');
      }
      throw error;
    }
  },

  // Get all businesses for the current user
  getOwnerBusinesses: async (status?: string, type?: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (type && type !== 'all') params.append('type', type);

    const queryString = params.toString();
    const url = `${API_URL}/api/v1/business/owner/${user.uid}${queryString ? `?${queryString}` : ''}`;

    return apiRequest(url);
  },

  // Get business dashboard data
  getDashboard: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    return apiRequest(`${API_URL}/api/v1/business/dashboard/${user.uid}`);
  },

  // Get dashboard analytics with time-series data
  getDashboardAnalytics: async (period: string = '30d') => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    return apiRequest(`${API_URL}/api/v1/business/analytics/dashboard/${user.uid}?period=${period}`);
  },

  // Get a specific business
  getById: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}`);
  },

  // Update a business
  update: async (id: string, businessData: any) => {
    const formData = new FormData();

    // Handle file uploads
    if (businessData.thumbnail instanceof File) {
      formData.append('thumbnail', businessData.thumbnail);
      delete businessData.thumbnail;
    }
    if (businessData.coverImage instanceof File) {
      formData.append('coverImage', businessData.coverImage);
      delete businessData.coverImage;
    }

    // Add business data as JSON
    formData.append('data', JSON.stringify(businessData));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for file uploads

    try {
      const response = await fetch(`${API_URL}/api/v1/business/${id}`, {
        method: 'PUT',
        body: formData,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - please try again');
      }
      throw error;
    }
  },

  // Delete a business
  delete: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}`, 'DELETE');
  },

  // Validate business configuration
  validate: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/validate`, 'POST');
  },

  // Deploy business (make it live)
  deploy: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/deploy`, 'POST');
  },

  // Toggle business status (active/paused)
  toggleStatus: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/toggle-status`, 'PATCH');
  },

  // Get business analytics
  getAnalytics: async (id: string, period: string = '30d') => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/analytics?period=${period}`);
  },

  // Get business bookings
  getBookings: async (id: string, status?: string, date?: string, limit: number = 50) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (date) params.append('date', date);
    params.append('limit', limit.toString());

    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/business/${id}/bookings?${queryString}`);
  },

  // Get booking analytics for a business
  getBookingAnalytics: async (id: string, period: string = '30d') => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/booking-analytics?period=${period}`);
  },

  // Get heatmap data for a business
  getHeatmapData: async (id: string, period: string = '30d') => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/heatmap?period=${period}`);
  },

  // Get revenue forecast for a business
  getRevenueForecast: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/forecast`);
  },

  // Get customer loyalty data for a business
  getCustomerLoyalty: async (id: string, limit: number = 10) => {
    return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/loyalty?limit=${limit}`);
  },

  // Staff Management
  getStaff: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/staff`);
  },
  addStaff: async (businessId: string, staffData: any) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/staff`, 'POST', staffData);
  },
  updateStaff: async (staffId: string, updates: any) => {
    return apiRequest(`${API_URL}/api/v1/business/staff/${staffId}`, 'PUT', updates);
  },
  removeStaff: async (staffId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/staff/${staffId}`, 'DELETE');
  },

  // Shift Scheduling
  getShifts: async (businessId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/shifts${queryString ? `?${queryString}` : ''}`);
  },
  createShift: async (businessId: string, shiftData: any) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/shifts`, 'POST', shiftData);
  },
  updateShift: async (shiftId: string, updates: any) => {
    return apiRequest(`${API_URL}/api/v1/business/shifts/${shiftId}`, 'PUT', updates);
  },
  deleteShift: async (shiftId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/shifts/${shiftId}`, 'DELETE');
  },

  // Table Status tracking
  getTableStatuses: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status`);
  },
  updateTableStatus: async (businessId: string, tableId: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status/${tableId}`, 'PUT', data);
  },
  batchUpdateTableStatus: async (businessId: string, updates: any[]) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status/batch`, 'POST', { updates });
  },

  // Marketing Engine
  getCampaigns: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/campaigns`);
  },
  createCampaign: async (businessId: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/campaigns`, 'POST', data);
  },
  updateCampaign: async (id: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}`, 'PUT', data);
  },
  deleteCampaign: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}`, 'DELETE');
  },
  sendCampaign: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}/send`, 'POST');
  },

  // Promotion Manager
  getPromotions: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/promotions`);
  },
  createPromotion: async (businessId: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/promotions`, 'POST', data);
  },
  updatePromotion: async (id: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/business/promotions/${id}`, 'PUT', data);
  },
  deletePromotion: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/promotions/${id}`, 'DELETE');
  },
  validatePromotion: async (businessId: string, code: string) => {
    return apiRequest(`${API_URL}/api/v1/business/promotions/validate`, 'POST', { businessId, code });
  },

  // Review Management
  getReviews: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/reviews`);
  },
  addReview: async (data: any) => {
    const { businessId, ...reviewData } = data;
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/reviews`, 'POST', reviewData);
  },
  replyToReview: async (id: string, text: string) => {
    return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'POST', { text });
  },
  updateReview: async (id: string, data: { rating: number; comment: string }) => {
    return apiRequest(`${API_URL}/api/v1/business/reviews/${id}`, 'PUT', data);
  },
  updateReply: async (id: string, text: string) => {
    return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'PUT', { text });
  },
  deleteReply: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'DELETE');
  },
  deleteReview: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/business/reviews/${id}`, 'DELETE');
  },
  getUserReviews: async (userId: string) => {
    return apiRequest(`${API_URL}/api/v1/users/${userId}/reviews`);
  },
  getRatingStats: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/${businessId}/rating-stats`);
  },

  // Payout Management
  getPayoutAnalytics: async (ownerId: string, period: string = '30d') => {
    const response = await apiRequest(`${API_URL}/api/v1/business/payouts/analytics/${ownerId}?period=${period}`);
    return response.data || response;
  },

  calculatePayout: async (data: { ownerId: string; businessId?: string; startDate: string; endDate: string }) => {
    const response = await apiRequest(`${API_URL}/api/v1/business/payouts/calculate`, 'POST', data);
    return response.data || response;
  },

  requestPayout: async (data: { ownerId: string; businessId?: string; startDate: string; endDate: string; bankDetails: any }) => {
    const response = await apiRequest(`${API_URL}/api/v1/business/payouts/request`, 'POST', data);
    return response.data || response;
  },

  getPayouts: async (ownerId: string, status?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    const response = await apiRequest(`${API_URL}/api/v1/business/payouts/${ownerId}${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  // Invoice Management
  getInvoices: async (businessId: string, startDate?: string, endDate?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (limit) params.append('limit', limit.toString());
    const queryString = params.toString();
    const response = await apiRequest(`${API_URL}/api/v1/business/invoices/${businessId}${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  // POS Integration
  connectPOS: async (data: { businessId: string; provider: string; apiKey: string; apiSecret?: string; webhookSecret?: string }) => {
    const response = await apiRequest(`${API_URL}/api/v1/business/pos/connect`, 'POST', data);
    return response.data || response;
  },

  getPOSIntegration: async (businessId: string) => {
    const response = await apiRequest(`${API_URL}/api/v1/business/pos/${businessId}`);
    return response.data || response;
  },

  syncPOSOrders: async (businessId: string) => {
    const response = await apiRequest(`${API_URL}/api/v1/business/pos/${businessId}/sync`, 'POST');
    return response.data || response;
  },

  disconnectPOS: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/pos/${businessId}`, 'DELETE');
  }
};

// Booking API endpoints
export const bookingsApi = {
  // Get all bookings for the current user
  getAll: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return apiRequest(`${API_URL}/api/v1/bookings/user/${user.uid}`);
  },

  // Get a specific booking by ID
  getById: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/bookings/${id}`);
  },

  // Create a new booking
  create: async (bookingData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const booking = {
      ...bookingData,
      userId: user.uid,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    return apiRequest(`${API_URL}/api/v1/bookings`, 'POST', booking);
  },

  // Update a booking
  update: async (id: string, bookingData: any) => {
    return apiRequest(`${API_URL}/api/v1/bookings/${id}`, 'PUT', bookingData);
  },

  // Cancel a booking
  cancel: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/bookings/${id}/cancel`, 'PATCH');
  },

  // Delete a booking
  delete: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/bookings/${id}`, 'DELETE');
  },

  // Confirm a booking
  confirm: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/bookings/${id}/confirm`, 'PATCH');
  },

  // Confirm a table booking
  confirmTable: async ({ restaurantId, tableId, date, time, userId }: { restaurantId: string, tableId: string, date: string, time: string, userId: string }) => {
    return apiRequest(`${API_URL}/api/v1/bookings/confirm-table`, 'POST', { restaurantId, tableId, date, time, userId });
  },

  // Track a slot reservation or cancellation
  trackSlot: async ({ userId, restaurantId, date, time, action }: { userId: string, restaurantId: string, date: string, time: string, action: 'reserve' | 'cancel' }) => {
    return apiRequest(`${API_URL}/api/v1/bookings/track-slot`, 'POST', { userId, restaurantId, date, time, action });
  },

  // Get all tracked slots for a restaurant and date
  getTrackedSlots: async (restaurantId: string, date: string) => {
    const url = `${API_URL}/api/v1/bookings/track-slots?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}`;
    return apiRequest(url, 'GET');
  },

  // Reserve or cancel a table booking
  reserveTable: async ({ restaurantId, tableId, date, time, userId, guests, status }: { restaurantId: string, tableId: string, date: string, time: string, userId: string, guests: number, status: 'reserved' | 'cancelled' }) => {
    return apiRequest(`${API_URL}/api/v1/bookings/table-booking`, 'POST', { restaurantId, tableId, date, time, userId, guests, status });
  },

  // Get all table bookings for a restaurant, date, and time
  getTableBookings: async (restaurantId: string, date: string, time: string) => {
    const url = `${API_URL}/api/v1/bookings/table-bookings?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    return apiRequest(url, 'GET');
  },

  // Get all booked (confirmed) tables for a restaurant, date, and time
  getBookedTables: async (restaurantId: string, date: string, time: string) => {
    const url = `${API_URL}/api/v1/bookings/booked-tables?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    return apiRequest(url, 'GET');
  },

  // Cancel a table booking
  cancelTable: async (data: { restaurantId: string; tableId: string; date: string; time: string; userId: string }) => {
    const url = `${API_URL}/api/v1/bookings/cancel-table`;
    return apiRequest(url, 'POST', data);
  },
};

// Menu API endpoints
export const menuApi = {
  // Category Management
  createCategory: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/menu/categories`, 'POST', data);
  },
  getCategories: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/menu/categories/${businessId}`);
  },
  updateCategory: async (categoryId: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/menu/categories/${categoryId}`, 'PUT', data);
  },
  deleteCategory: async (categoryId: string) => {
    return apiRequest(`${API_URL}/api/v1/menu/categories/${categoryId}`, 'DELETE');
  },

  // Menu Item Management
  createItem: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/menu/items`, 'POST', data);
  },
  getItems: async (businessId: string, filters?: { categoryId?: string, dietaryTags?: string, available?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.dietaryTags) params.append('dietaryTags', filters.dietaryTags);
    if (filters?.available !== undefined) params.append('available', String(filters.available));

    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/menu/items/${businessId}${queryString ? `?${queryString}` : ''}`);
  },
  getFullMenu: async (businessId: string) => {
    return apiRequest(`${API_URL}/api/v1/menu/menu/${businessId}`);
  },
  updateItem: async (itemId: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}`, 'PUT', data);
  },
  toggleAvailability: async (itemId: string, isAvailable: boolean) => {
    return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}/availability`, 'PATCH', { isAvailable });
  },
  deleteItem: async (itemId: string) => {
    return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}`, 'DELETE');
  },
  bulkUpdateDisplayOrder: async (items: { id: string, displayOrder: number }[]) => {
    return apiRequest(`${API_URL}/api/v1/menu/items/bulk/display-order`, 'POST', { items });
  }
};

// Waitlist API endpoints
export const waitlistApi = {
  checkAccess: async (email: string, type: 'user' | 'business' = 'user') => {
    return apiRequest(`${API_URL}/api/v1/waitlist/check-access?email=${encodeURIComponent(email)}&type=${type}`);
  },
  verifyCode: async (email: string, code: string, type: 'user' | 'business' = 'user') => {
    return apiRequest(`${API_URL}/api/v1/waitlist/check-access?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}&type=${type}`);
  },
  join: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/waitlist/join`, 'POST', data);
  },
  getBusinessWaitlist: async (businessId: string, status?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/waitlist/business/${businessId}${queryString ? `?${queryString}` : ''}`);
  },
  getCustomerStatus: async (customerId: string) => {
    return apiRequest(`${API_URL}/api/v1/waitlist/customer/${customerId}/status`);
  },
  notifyCustomer: async (entryId: string) => {
    return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}/notify`, 'PATCH');
  },
  markAsSeated: async (entryId: string) => {
    return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}/seated`, 'PATCH');
  },
  cancel: async (entryId: string) => {
    return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}`, 'DELETE');
  }
};

// Pre-order API endpoints
export const preOrderApi = {
  create: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/preorder`, 'POST', data);
  },
  getBusinessPreOrders: async (businessId: string, status?: string, date?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/preorder/business/${businessId}${queryString ? `?${queryString}` : ''}`);
  },
  getCustomerPreOrders: async (customerId: string) => {
    return apiRequest(`${API_URL}/api/v1/preorder/customer/${customerId}`);
  },
  getByBooking: async (bookingId: string) => {
    return apiRequest(`${API_URL}/api/v1/preorder/booking/${bookingId}`);
  },
  updateStatus: async (preOrderId: string, status: string) => {
    return apiRequest(`${API_URL}/api/v1/preorder/${preOrderId}/status`, 'PATCH', { status });
  },
  cancel: async (preOrderId: string) => {
    return apiRequest(`${API_URL}/api/v1/preorder/${preOrderId}`, 'DELETE');
  },
  getAnalytics: async (businessId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/preorder/business/${businessId}/analytics${queryString ? `?${queryString}` : ''}`);
  }
};

// Event API endpoints
export const eventApi = {
  getAll: async () => {
    return apiRequest(`${API_URL}/api/v1/events`);
  },
  getById: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/events/${id}`);
  },
  create: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/events`, 'POST', data);
  },
  update: async (id: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/events/${id}`, 'PUT', data);
  },
  delete: async (id: string) => {
    return apiRequest(`${API_URL}/api/v1/events/${id}`, 'DELETE');
  },
  getUpcoming: async () => {
    return apiRequest(`${API_URL}/api/v1/events/upcoming`);
  },
  search: async (query: string, location?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (location) params.append('location', location);
    const queryString = params.toString();
    return apiRequest(`${API_URL}/api/v1/events/search${queryString ? `?${queryString}` : ''}`);
  },
  register: async (id: string, data: any) => {
    return apiRequest(`${API_URL}/api/v1/events/${id}/register`, 'POST', data);
  }
};

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string | null;
  emailVerified: boolean;
}

const addUserActivity = async (uid: string, activity: any) => {
  const response = await fetch(`${API_URL}/api/v1/users/${uid}/activities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(activity),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }
  return response.json();
};

export const userAPI = {
  getReviews: async (userId: string) => {
    return apiRequest(`${API_URL}/api/v1/users/${userId}/reviews`);
  },
  createUser: async (userData: UserData) => {
    // Ensure all required fields are present
    const payload = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || userData.name || userData.email?.split('@')[0] || '',
      name: userData.name || userData.displayName || userData.email?.split('@')[0] || '',
      photoURL: userData.photoURL || null,
      emailVerified: userData.emailVerified ?? false
    };
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If user already exists, try updating instead
          if (response.status === 400 && (errorData.message || '').includes('already exists')) {
            // Try updating the user
            const updateResponse = await fetch(`${API_URL}/api/v1/users/${userData.uid}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData),
            });
            if (!updateResponse.ok) {
              const updateErrorData = await updateResponse.json().catch(() => ({}));
              throw new Error(updateErrorData.message || `Server error during fallback update: ${updateResponse.status}`);
            }
            // Add signup activity after fallback update
            await addUserActivity(userData.uid, {
              type: 'signup',
              timestamp: new Date(),
              source: 'email',
            });
            return updateResponse.json();
          }
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  loginUser: async (uid: string, loginSource: string = 'email') => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Use the full URL to ensure the correct endpoint is being hit
        const response = await fetch(`${API_URL}/api/v1/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ uid, loginSource }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If user not found, try to fetch the user by ID as a fallback
          if (response.status === 404) {
            // Get the current user from Firebase auth
            const user = auth.currentUser;
            if (!user) {
              throw new Error('No authenticated user found');
            }

            // Create a timestamp for the login activity
            const timestamp = new Date().toISOString();

            // Create or update the user with login activity data
            const userData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || '',
              name: user.displayName || user.email?.split('@')[0] || '',
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              lastLogin: timestamp,
              // Include login source in the user data for tracking
              loginSource
            };

            // Use the createUser endpoint which handles both creation and updates
            const createResponse = await fetch(`${API_URL}/api/v1/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(userData),
            });

            if (!createResponse.ok) {
              const createErrorData = await createResponse.json().catch(() => ({}));
              throw new Error(createErrorData.message || `Server error during fallback: ${createResponse.status}`);
            }

            return createResponse.json();
          }

          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Login attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  logoutUser: async (uid: string, logoutSource: string = 'manual') => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, logoutSource }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If user not found, try to create/update user, then retry logout
          if (response.status === 404) {
            const user = auth.currentUser;
            if (!user) {
              throw new Error('No authenticated user found');
            }
            const timestamp = new Date().toISOString();
            const userData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || '',
              name: user.displayName || user.email?.split('@')[0] || '',
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              lastLogin: timestamp,
              logoutSource
            };
            // Create or update user
            const createResponse = await fetch(`${API_URL}/api/v1/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(userData),
            });
            if (!createResponse.ok) {
              const createErrorData = await createResponse.json().catch(() => ({}));
              throw new Error(createErrorData.message || `Server error during fallback: ${createResponse.status}`);
            }
            // Retry logout after creating/updating user
            const retryResponse = await fetch(`${API_URL}/api/v1/users/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ uid, logoutSource }),
            });
            if (!retryResponse.ok) {
              const retryErrorData = await retryResponse.json().catch(() => ({}));
              throw new Error(retryErrorData.message || `Server error during retry logout: ${retryResponse.status}`);
            }
            return retryResponse.json();
          }
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Logout attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  getUserActivities: async (uid: string) => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/${uid}/activities`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Get activities attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  getUser: async (uid: string) => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/${uid}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  updateUser: async (uid: string, userData: Partial<UserData>) => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/${uid}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  deleteUser: async (uid: string) => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/${uid}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },

  resetPassword: async (email: string) => {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${API_URL}/api/v1/users/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        return response.json();
      } catch (error: any) {
        console.error(`Password reset attempt ${attempt + 1} failed:`, error);
        lastError = error;

        if (attempt < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    throw new Error(handleApiError(lastError));
  },
  // Favorites
  addFavorite: async (userId: string, restaurantId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/favorites/add`, 'POST', { userId, restaurantId });
  },
  removeFavorite: async (userId: string, restaurantId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/favorites/${userId}/${restaurantId}`, 'DELETE');
  },
  getFavorites: async (userId: string) => {
    return apiRequest(`${API_URL}/api/v1/business/favorites/${userId}`);
  },
};

// Add direct API check function to test connection from frontend
export const checkApiConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/api/v1/users/health`);
    if (!response.ok) {
      console.error('API server not responding properly:', await response.text());
      return { success: false, message: `Error: ${response.status} ${response.statusText}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API connection failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error connecting to API'
    };
  }
};

// Notification API endpoints
export const notificationsApi = {
  // Get all notifications for a specific user
  getAll: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/notifications?userId=${userId}`);

      if (!response.ok) {
        throw new Error(`Error fetching notifications: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`Error marking notification as read: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`Error marking all notifications as read: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },
};

// User Preference API endpoints
export const userPreferenceApi = {
  get: async (userId: string) => {
    return apiRequest(`${API_URL}/api/v1/user-preferences/${userId}`);
  },
  upsert: async (data: any) => {
    return apiRequest(`${API_URL}/api/v1/user-preferences`, 'POST', data);
  },
  updateCuisineScore: async (userId: string, cuisineName: string, increment?: number) => {
    return apiRequest(`${API_URL}/api/v1/user-preferences/score`, 'POST', { userId, cuisineName, increment });
  }
};


export const authOtpApi = {
  requestSignupOTP: (email: string) => apiRequest(`${API_URL}/api/v1/auth/otp/signup/request`, 'POST', { email }),
  verifySignupOTP: (email: string, otp: string) => apiRequest(`${API_URL}/api/v1/auth/otp/signup/verify`, 'POST', { email, otp }),
  requestForgotPasswordOTP: (email: string) => apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/request`, 'POST', { email }),
  verifyForgotPasswordOTP: (email: string, otp: string) => apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/verify`, 'POST', { email, otp }),
  resetPassword: (email: string, resetToken: string, newPassword: any) => apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/reset`, 'POST', { email, resetToken, newPassword }),
};

export default {
  business: businessApi,
  bookings: bookingsApi,
  user: userAPI,
  notifications: notificationsApi,
  preOrder: preOrderApi,
  event: eventApi,
  preferences: userPreferenceApi,
  authOtp: authOtpApi
};
