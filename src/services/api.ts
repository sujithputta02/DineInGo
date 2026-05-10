import { auth } from '../firebase';
import { fetchUserData } from '../dbUtils';

import { API_CONFIG } from '../config/api';
const API_URL = API_CONFIG.BASE_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Normalize image URL to ensure it's a full URL
 * If the path is relative, prepend the API URL
 */
/**
 * Normalize image URL to ensure it's a full URL
 * If the path is relative, prepend the API URL
 */
export function normalizeImageUrl(imagePath: string | undefined): string {
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
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function handleApiError(error: any) {
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return 'Unable to connect to the server. Please check your internet connection or try again later.';
  }
  return error.message || 'An unexpected error occurred';
}

/**
 * Get Firebase auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
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
}

/**
 * Make an authenticated request to the API
 */
async function apiRequest(url: string, method: string = 'GET', data?: any, retries = 3) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  // SECURITY: Get Firebase ID Token for identity verification
  const token = await getAuthToken();
  
  const defaultOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
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
        
        // 404 Not Found is often an expected state (e.g. new user check)
        // We should throw but NOT retry on 404s.
        if (response.status === 404) {
           throw new Error(`404 Not Found: ${errorText}`);
        }

        console.error(`API returned ${response.status}: ${errorText}`);
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.message?.includes('404')) throw error; // Don't retry 404s
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
  if (import.meta.env.MODE !== 'production') {
    return getMockDataForEndpoint(url);
  }

  throw lastError || new Error('Request failed');
}

// Helper function to return mock data for various endpoints
function getMockDataForEndpoint(url: string) {
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

// Business API implementation functions
async function createBusiness(businessData: any) {
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

  // SECURITY: Get Auth Token for business creation
  const token = await getAuthToken();

  try {
    const response = await fetch(`${API_URL}/api/v1/business`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
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
}

async function getOwnerBusinesses(status?: string, type?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (type && type !== 'all') params.append('type', type);

  const queryString = params.toString();
  const url = `${API_URL}/api/v1/business/owner/${user.uid}${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url);
}

async function getDashboard() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  return apiRequest(`${API_URL}/api/v1/business/dashboard/${user.uid}`);
}

async function getDashboardAnalytics(period: string = '30d') {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  return apiRequest(`${API_URL}/api/v1/business/analytics/dashboard/${user.uid}?period=${period}`);
}

async function getBusinessById(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}`);
}

async function updateBusiness(id: string, businessData: any) {
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

  // SECURITY: Get Auth Token for business update
  const token = await getAuthToken();

  try {
    const response = await fetch(`${API_URL}/api/v1/business/${id}`, {
      method: 'PUT',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
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
}

async function deleteBusiness(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}`, 'DELETE');
}

async function validateBusiness(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}/validate`, 'POST');
}

async function deployBusiness(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}/deploy`, 'POST');
}

async function toggleBusinessStatusInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}/toggle-status`, 'PATCH');
}

async function getBusinessAnalytics(id: string, period: string = '30d') {
  return apiRequest(`${API_URL}/api/v1/business/${id}/analytics?period=${period}`);
}

async function getBusinessBookings(id: string, status?: string, date?: string, limit: number = 50) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (date) params.append('date', date);
  params.append('limit', limit.toString());

  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/business/${id}/bookings?${queryString}`);
}

async function getBusinessBookingAnalytics(id: string, period: string = '30d') {
  return apiRequest(`${API_URL}/api/v1/business/${id}/booking-analytics?period=${period}`);
}

async function getBusinessHeatmapData(id: string, period: string = '30d') {
  return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/heatmap?period=${period}`);
}

async function getBusinessRevenueForecast(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/forecast`);
}

async function getBusinessCustomerLoyalty(id: string, limit: number = 10) {
  return apiRequest(`${API_URL}/api/v1/business/${id}/analytics/loyalty?limit=${limit}`);
}

// Staff Management
async function getBusinessStaff(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/staff`);
}
async function addBusinessStaff(businessId: string, staffData: any) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/staff`, 'POST', staffData);
}
async function updateBusinessStaff(staffId: string, updates: any) {
  return apiRequest(`${API_URL}/api/v1/business/staff/${staffId}`, 'PUT', updates);
}
async function removeBusinessStaff(staffId: string) {
  return apiRequest(`${API_URL}/api/v1/business/staff/${staffId}`, 'DELETE');
}

// Business API combined object
// Business API implementation functions
async function getBusinessShifts(businessId: string, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/shifts${queryString ? `?${queryString}` : ''}`);
}

async function createBusinessShift(businessId: string, shiftData: any) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/shifts`, 'POST', shiftData);
}

async function updateBusinessShift(shiftId: string, updates: any) {
  return apiRequest(`${API_URL}/api/v1/business/shifts/${shiftId}`, 'PUT', updates);
}

async function deleteBusinessShift(shiftId: string) {
  return apiRequest(`${API_URL}/api/v1/business/shifts/${shiftId}`, 'DELETE');
}

async function getBusinessTableStatuses(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status`);
}

async function updateBusinessTableStatus(businessId: string, tableId: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status/${tableId}`, 'PUT', data);
}

async function batchUpdateBusinessTableStatus(businessId: string, updates: any[]) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/table-status/batch`, 'POST', { updates });
}

async function getBusinessCampaigns(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/campaigns`);
}

async function createBusinessCampaign(businessId: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/campaigns`, 'POST', data);
}

async function updateBusinessCampaign(id: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}`, 'PUT', data);
}

async function deleteBusinessCampaign(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}`, 'DELETE');
}

async function sendBusinessCampaign(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/campaigns/${id}/send`, 'POST');
}

async function getBusinessPromotions(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/promotions`);
}

async function createBusinessPromotion(businessId: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/promotions`, 'POST', data);
}

async function updateBusinessPromotion(id: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/business/promotions/${id}`, 'PUT', data);
}

async function deleteBusinessPromotion(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/promotions/${id}`, 'DELETE');
}

async function validateBusinessPromotion(businessId: string, code: string) {
  return apiRequest(`${API_URL}/api/v1/business/promotions/validate`, 'POST', { businessId, code });
}

async function getBusinessReviews(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/reviews`);
}

async function addBusinessReview(businessId: string, data: any) {
  // If data is FormData, send it directly using fetch
  if (data instanceof FormData) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/v1/business/${businessId}/reviews`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: data
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }
    return await response.json();
  }
  
  // Backward compatibility for JSON
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/reviews`, 'POST', data);
}

async function replyToBusinessReview(id: string, text: string) {
  return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'POST', { text });
}

async function updateBusinessReview(id: string, data: any) {
  // If data is FormData, send it directly using fetch
  if (data instanceof FormData) {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/v1/business/reviews/${id}`, {
      method: 'PUT',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: data
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }
    return await response.json();
  }
  
  // Backward compatibility
  return apiRequest(`${API_URL}/api/v1/business/reviews/${id}`, 'PUT', data);
}

async function updateBusinessReply(id: string, text: string) {
  return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'PUT', { text });
}

async function deleteBusinessReply(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/reviews/${id}/reply`, 'DELETE');
}

async function deleteBusinessReview(id: string) {
  return apiRequest(`${API_URL}/api/v1/business/reviews/${id}`, 'DELETE');
}

async function getUserReviewsInApi(userId: string) {
  return apiRequest(`${API_URL}/api/v1/users/${userId}/reviews`);
}

async function getBusinessRatingStats(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/${businessId}/rating-stats`);
}

async function getBusinessPayoutAnalytics(ownerId: string, period: string = '30d') {
  const response = await apiRequest(`${API_URL}/api/v1/business/payouts/analytics/${ownerId}?period=${period}`);
  return response.data || response;
}

async function calculateBusinessPayout(data: { ownerId: string; businessId?: string; startDate: string; endDate: string }) {
  const response = await apiRequest(`${API_URL}/api/v1/business/payouts/calculate`, 'POST', data);
  return response.data || response;
}

async function requestBusinessPayout(data: { ownerId: string; businessId?: string; startDate: string; endDate: string; bankDetails: any }) {
  const response = await apiRequest(`${API_URL}/api/v1/business/payouts/request`, 'POST', data);
  return response.data || response;
}

async function getBusinessPayouts(ownerId: string, status?: string, limit?: number) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const response = await apiRequest(`${API_URL}/api/v1/business/payouts/${ownerId}${queryString ? `?${queryString}` : ''}`);
  return response.data || response;
}

async function getBusinessInvoices(businessId: string, startDate?: string, endDate?: string, limit?: number) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const response = await apiRequest(`${API_URL}/api/v1/business/invoices/${businessId}${queryString ? `?${queryString}` : ''}`);
  return response.data || response;
}

async function connectBusinessPOS(data: { businessId: string; provider: string; apiKey: string; apiSecret?: string; webhookSecret?: string }) {
  const response = await apiRequest(`${API_URL}/api/v1/business/pos/connect`, 'POST', data);
  return response.data || response;
}

async function getBusinessPOSIntegration(businessId: string) {
  const response = await apiRequest(`${API_URL}/api/v1/business/pos/${businessId}`);
  return response.data || response;
}

async function syncBusinessPOSOrders(businessId: string) {
  const response = await apiRequest(`${API_URL}/api/v1/business/pos/${businessId}/sync`, 'POST');
  return response.data || response;
}

async function disconnectBusinessPOS(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/business/pos/${businessId}`, 'DELETE');
}

// Business API combined object
export const businessApi = {
  create: createBusiness,
  getOwnerBusinesses,
  getDashboard,
  getDashboardAnalytics,
  getById: getBusinessById,
  update: updateBusiness,
  delete: deleteBusiness,
  validate: validateBusiness,
  deploy: deployBusiness,
  toggleStatus: toggleBusinessStatusInApi,
  getAnalytics: getBusinessAnalytics,
  getBookings: getBusinessBookings,
  getBookingAnalytics: getBusinessBookingAnalytics,
  getHeatmapData: getBusinessHeatmapData,
  getRevenueForecast: getBusinessRevenueForecast,
  getCustomerLoyalty: getBusinessCustomerLoyalty,
  getStaff: getBusinessStaff,
  addStaff: addBusinessStaff,
  updateStaff: updateBusinessStaff,
  removeStaff: removeBusinessStaff,
  getShifts: getBusinessShifts,
  createShift: createBusinessShift,
  updateShift: updateBusinessShift,
  deleteShift: deleteBusinessShift,
  getTableStatuses: getBusinessTableStatuses,
  updateTableStatus: updateBusinessTableStatus,
  batchUpdateTableStatus: batchUpdateBusinessTableStatus,
  getCampaigns: getBusinessCampaigns,
  createCampaign: createBusinessCampaign,
  updateCampaign: updateBusinessCampaign,
  deleteCampaign: deleteBusinessCampaign,
  sendCampaign: sendBusinessCampaign,
  getPromotions: getBusinessPromotions,
  createPromotion: createBusinessPromotion,
  updatePromotion: updateBusinessPromotion,
  deletePromotion: deleteBusinessPromotion,
  validatePromotion: validateBusinessPromotion,
  getReviews: getBusinessReviews,
  addReview: addBusinessReview,
  replyToReview: replyToBusinessReview,
  updateReview: updateBusinessReview,
  updateReply: updateBusinessReply,
  deleteReply: deleteBusinessReply,
  deleteReview: deleteBusinessReview,
  getUserReviews: getUserReviewsInApi,
  getRatingStats: getBusinessRatingStats,
  getPayoutAnalytics: getBusinessPayoutAnalytics,
  calculatePayout: calculateBusinessPayout,
  requestPayout: requestBusinessPayout,
  getPayouts: getBusinessPayouts,
  getInvoices: getBusinessInvoices,
  connectPOS: connectBusinessPOS,
  getPOSIntegration: getBusinessPOSIntegration,
  syncPOSOrders: syncBusinessPOSOrders,
  disconnectPOS: disconnectBusinessPOS
};

// Booking API implementation functions
async function getAllBookings() {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return apiRequest(`${API_URL}/api/v1/bookings/user/${user.uid}`);
}

async function getBookingById(id: string) {
  return apiRequest(`${API_URL}/api/v1/bookings/${id}`);
}

async function createBooking(bookingData: any) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const booking = {
    ...bookingData,
    userId: user.uid,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  return apiRequest(`${API_URL}/api/v1/bookings`, 'POST', booking);
}

async function updateBooking(id: string, bookingData: any) {
  return apiRequest(`${API_URL}/api/v1/bookings/${id}`, 'PUT', bookingData);
}

async function cancelBookingInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/bookings/${id}/cancel`, 'PATCH');
}

async function deleteBookingInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/bookings/${id}`, 'DELETE');
}

async function confirmBookingInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/bookings/${id}/confirm`, 'PATCH');
}

async function confirmTableBooking({ restaurantId, tableId, date, time, userId }: { restaurantId: string, tableId: string, date: string, time: string, userId: string }) {
  return apiRequest(`${API_URL}/api/v1/bookings/confirm-table`, 'POST', { restaurantId, tableId, date, time, userId });
}

async function trackSlotBooking({ userId, restaurantId, date, time, action }: { userId: string, restaurantId: string, date: string, time: string, action: 'reserve' | 'cancel' }) {
  return apiRequest(`${API_URL}/api/v1/bookings/track-slot`, 'POST', { userId, restaurantId, date, time, action });
}

async function getTrackedSlotsInApi(restaurantId: string, date: string) {
  const url = `${API_URL}/api/v1/bookings/track-slots?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}`;
  return apiRequest(url, 'GET');
}

async function reserveTableBooking({ restaurantId, tableId, date, time, userId, guests, status }: { restaurantId: string, tableId: string, date: string, time: string, userId: string, guests: number, status: 'reserved' | 'cancelled' }) {
  return apiRequest(`${API_URL}/api/v1/bookings/table-booking`, 'POST', { restaurantId, tableId, date, time, userId, guests, status });
}

async function getTableBookingsInApi(restaurantId: string, date: string, time: string) {
  const url = `${API_URL}/api/v1/bookings/table-bookings?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
  return apiRequest(url, 'GET');
}

async function getBookedTablesInApi(restaurantId: string, date: string, time: string) {
  const url = `${API_URL}/api/v1/bookings/booked-tables?restaurantId=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
  return apiRequest(url, 'GET');
}

async function cancelTableBooking(data: { restaurantId: string; tableId: string; date: string; time: string; userId: string }) {
  const url = `${API_URL}/api/v1/bookings/cancel-table`;
  return apiRequest(url, 'POST', data);
}

// Booking API combined object
export const bookingsApi = {
  getAll: getAllBookings,
  getById: getBookingById,
  create: createBooking,
  update: updateBooking,
  cancel: cancelBookingInApi,
  delete: deleteBookingInApi,
  confirm: confirmBookingInApi,
  confirmTable: confirmTableBooking,
  trackSlot: trackSlotBooking,
  getTrackedSlots: getTrackedSlotsInApi,
  reserveTable: reserveTableBooking,
  getTableBookings: getTableBookingsInApi,
  getBookedTables: getBookedTablesInApi,
  cancelTable: cancelTableBooking,
};

// Menu API implementation functions
async function createCategory(data: any) {
  return apiRequest(`${API_URL}/api/v1/menu/categories`, 'POST', data);
}
async function getCategories(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/menu/categories/${businessId}`);
}
async function updateCategory(categoryId: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/menu/categories/${categoryId}`, 'PUT', data);
}
async function deleteCategory(categoryId: string) {
  return apiRequest(`${API_URL}/api/v1/menu/categories/${categoryId}`, 'DELETE');
}

// Menu Item Management
async function createMenuItem(data: any) {
  return apiRequest(`${API_URL}/api/v1/menu/items`, 'POST', data);
}
async function getMenuItems(businessId: string, filters?: { categoryId?: string, dietaryTags?: string, available?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.append('categoryId', filters.categoryId);
  if (filters?.dietaryTags) params.append('dietaryTags', filters.dietaryTags);
  if (filters?.available !== undefined) params.append('available', String(filters.available));

  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/menu/items/${businessId}${queryString ? `?${queryString}` : ''}`);
}
async function getFullMenuInApi(businessId: string) {
  return apiRequest(`${API_URL}/api/v1/menu/menu/${businessId}`);
}
async function updateMenuItem(itemId: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}`, 'PUT', data);
}
async function toggleMenuItemAvailability(itemId: string, isAvailable: boolean) {
  return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}/availability`, 'PATCH', { isAvailable });
}
async function deleteMenuItem(itemId: string) {
  return apiRequest(`${API_URL}/api/v1/menu/items/${itemId}`, 'DELETE');
}
async function bulkUpdateMenuItemDisplayOrder(items: { id: string, displayOrder: number }[]) {
  return apiRequest(`${API_URL}/api/v1/menu/items/bulk/display-order`, 'POST', { items });
}

// Menu API combined object
export const menuApi = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createItem: createMenuItem,
  getItems: getMenuItems,
  getFullMenu: getFullMenuInApi,
  updateItem: updateMenuItem,
  toggleAvailability: toggleMenuItemAvailability,
  deleteItem: deleteMenuItem,
  bulkUpdateDisplayOrder: bulkUpdateMenuItemDisplayOrder,
};

// Waitlist API implementation functions
async function checkWaitlistAccess(email: string, type: 'user' | 'business' = 'user') {
  return apiRequest(`${API_URL}/api/v1/waitlist/check-access?email=${encodeURIComponent(email)}&type=${type}`);
}
async function verifyWaitlistCode(email: string, code: string, type: 'user' | 'business' = 'user') {
  return apiRequest(`${API_URL}/api/v1/waitlist/check-access?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}&type=${type}`);
}
async function joinWaitlist(data: any) {
  return apiRequest(`${API_URL}/api/v1/waitlist/join`, 'POST', data);
}
async function getBusinessWaitlistInApi(businessId: string, status?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/waitlist/business/${businessId}${queryString ? `?${queryString}` : ''}`);
}
async function getCustomerWaitlistStatus(customerId: string) {
  return apiRequest(`${API_URL}/api/v1/waitlist/customer/${customerId}/status`);
}
async function notifyWaitlistCustomer(entryId: string) {
  return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}/notify`, 'PATCH');
}
async function markWaitlistEntryAsSeated(entryId: string) {
  return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}/seated`, 'PATCH');
}
async function cancelWaitlistEntry(entryId: string) {
  return apiRequest(`${API_URL}/api/v1/waitlist/${entryId}`, 'DELETE');
}

// Waitlist API combined object
export const waitlistApi = {
  checkAccess: checkWaitlistAccess,
  verifyCode: verifyWaitlistCode,
  join: joinWaitlist,
  getBusinessWaitlist: getBusinessWaitlistInApi,
  getCustomerStatus: getCustomerWaitlistStatus,
  notifyCustomer: notifyWaitlistCustomer,
  markAsSeated: markWaitlistEntryAsSeated,
  cancel: cancelWaitlistEntry,
};

// Pre-order API implementation functions
async function createPreOrder(data: any) {
  return apiRequest(`${API_URL}/api/v1/preorder`, 'POST', data);
}
async function getBusinessPreOrdersInApi(businessId: string, status?: string, date?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (date) params.append('date', date);
  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/preorder/business/${businessId}${queryString ? `?${queryString}` : ''}`);
}
async function getCustomerPreOrdersInApi(customerId: string) {
  return apiRequest(`${API_URL}/api/v1/preorder/customer/${customerId}`);
}
async function getPreOrderByBooking(bookingId: string) {
  return apiRequest(`${API_URL}/api/v1/preorder/booking/${bookingId}`);
}
async function updatePreOrderStatus(preOrderId: string, status: string) {
  return apiRequest(`${API_URL}/api/v1/preorder/${preOrderId}/status`, 'PATCH', { status });
}
async function cancelPreOrderInApi(preOrderId: string) {
  return apiRequest(`${API_URL}/api/v1/preorder/${preOrderId}`, 'DELETE');
}
async function getPreOrderAnalytics(businessId: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/preorder/business/${businessId}/analytics${queryString ? `?${queryString}` : ''}`);
}

// Pre-order API combined object
export const preOrderApi = {
  create: createPreOrder,
  getBusinessPreOrders: getBusinessPreOrdersInApi,
  getCustomerPreOrders: getCustomerPreOrdersInApi,
  getByBooking: getPreOrderByBooking,
  updateStatus: updatePreOrderStatus,
  cancel: cancelPreOrderInApi,
  getAnalytics: getPreOrderAnalytics,
};

// Event API implementation functions
async function getAllEvents() {
  return apiRequest(`${API_URL}/api/v1/events`);
}
async function getEventByIdInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/events/${id}`);
}
async function createEvent(data: any) {
  return apiRequest(`${API_URL}/api/v1/events`, 'POST', data);
}
async function updateEventInApi(id: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/events/${id}`, 'PUT', data);
}
async function deleteEventInApi(id: string) {
  return apiRequest(`${API_URL}/api/v1/events/${id}`, 'DELETE');
}
async function getUpcomingEvents() {
  return apiRequest(`${API_URL}/api/v1/events/upcoming`);
}
async function searchEventsInApi(query: string, location?: string) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (location) params.append('location', location);
  const queryString = params.toString();
  return apiRequest(`${API_URL}/api/v1/events/search${queryString ? `?${queryString}` : ''}`);
}
async function registerForEventInApi(id: string, data: any) {
  return apiRequest(`${API_URL}/api/v1/events/${id}/register`, 'POST', data);
}

export const eventApi = {
  getAll: getAllEvents,
  getById: getEventByIdInApi,
  create: createEvent,
  update: updateEventInApi,
  delete: deleteEventInApi,
  getUpcoming: getUpcomingEvents,
  search: searchEventsInApi,
  register: registerForEventInApi,
  getReviews: async (eventId: string) => {
    return apiRequest(`${API_URL}/api/v1/events/${eventId}/reviews`);
  },
  addReview: async (eventId: string, data: any) => {
    if (data instanceof FormData) {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/v1/events/${eventId}/reviews`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: data
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      return await response.json();
    }
    return apiRequest(`${API_URL}/api/v1/events/${eventId}/reviews`, 'POST', data);
  },
  getRatingStats: async (eventId: string) => {
    return apiRequest(`${API_URL}/api/v1/events/${eventId}/reviews/stats`);
  },
};

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL: string | null;
  emailVerified: boolean;
  referralCode?: string;
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

// User API implementation functions
async function fetchUserDataInInApi(userId: string) {
  try {
    // Primary: Try fetching from our backend API for consistency
    const data = await apiRequest(`${API_URL}/api/v1/users/${userId}`);
    return data.data || data;
  } catch (error: any) {
    console.error(`[DineInGo] Error fetching user data for ${userId}:`, error);
    // Return null for 404 to allow "new user" checkups to work correctly
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}



async function changeUserPassword(uid: string, currentPassword: string, newPassword: string) {
  return apiRequest(`${API_URL}/api/v1/users/change-password`, 'POST', { uid, currentPassword, newPassword });
}

async function createNewUser(userData: UserData) {
  // Ensure all required fields are present
  const payload = {
    uid: userData.uid,
    email: userData.email,
    displayName: userData.displayName || userData.name || userData.email?.split('@')[0] || '',
    name: userData.name || userData.displayName || userData.email?.split('@')[0] || '',
    photoURL: userData.photoURL || null,
    emailVerified: userData.emailVerified ?? false,
    referralCode: userData.referralCode,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
}

async function loginUserInApi(uid: string, loginSource: string = 'email', email?: string) {
  // This is a public endpoint but we send the payload directly
  return apiRequest(`${API_URL}/api/v1/users/login`, 'POST', { 
    uid, 
    email: email || auth.currentUser?.email || '', 
    loginSource,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}

async function logoutUserInApi(uid: string, logoutSource: string = 'manual') {
  // 🛡️ PROTECTED: Uses apiRequest to include Authorization header
  return apiRequest(`${API_URL}/api/v1/users/logout`, 'POST', { uid, logoutSource });
}

async function getUserActivitiesInApi(uid: string) {
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
}

async function getUserInApi(uid: string) {
  // 🛡️ PROTECTED: Uses apiRequest to include Authorization header
  return apiRequest(`${API_URL}/api/v1/users/${uid}`);
}

async function updateUserInApi(uid: string, userData: Partial<UserData>) {
  // 🛡️ PROTECTED: Uses apiRequest to include Authorization header
  return apiRequest(`${API_URL}/api/v1/users/${uid}`, 'PUT', userData);
}

async function deleteUserInApi(uid: string) {
  // 🛡️ PROTECTED: Uses apiRequest to include Authorization header
  return apiRequest(`${API_URL}/api/v1/users/${uid}`, 'DELETE');
}

async function resetUserPassword(email: string) {
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
}

async function addUserFavorite(userId: string, restaurantId: string) {
  return apiRequest(`${API_URL}/api/v1/business/favorites/add`, 'POST', { userId, restaurantId });
}

async function removeUserFavorite(userId: string, restaurantId: string) {
  return apiRequest(`${API_URL}/api/v1/business/favorites/${userId}/${restaurantId}`, 'DELETE');
}

async function getUserFavoritesInApi(userId: string) {
  return apiRequest(`${API_URL}/api/v1/business/favorites/${userId}`);
}

async function updateUserOnboardingStatusInApi(userId: string, completed: boolean) {
  return apiRequest(`${API_URL}/api/v1/users/${userId}/onboarding`, 'PATCH', { completed });
}

// User API combined object
export const userAPI = {
  fetchUserData: fetchUserDataInInApi,
  getReviews: getUserReviewsInApi,
  changePassword: changeUserPassword,
  createUser: createNewUser,
  loginUser: loginUserInApi,
  logoutUser: logoutUserInApi,
  getUserActivities: getUserActivitiesInApi,
  getUser: getUserInApi,
  updateUser: updateUserInApi,
  deleteUser: deleteUserInApi,
  resetPassword: resetUserPassword,
  addFavorite: addUserFavorite,
  removeFavorite: removeUserFavorite,
  getFavorites: getUserFavoritesInApi,
  updateOnboardingStatus: updateUserOnboardingStatusInApi,
};

// Add direct API check function to test connection from frontend
export async function checkApiConnection() {
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
}

// Notification API implementation functions
async function getAllNotifications(userId: string) {
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
}

async function markNotificationAsRead(notificationId: string, userId: string) {
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
}

async function markAllNotificationsAsRead(userId: string) {
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
}

// Notification API combined object
export const notificationsApi = {
  getAll: getAllNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
};

// User Preference API implementation functions
async function getUserPreferences(userId: string) {
  return apiRequest(`${API_URL}/api/v1/user-preferences/${userId}`);
}
async function upsertUserPreferences(data: any) {
  return apiRequest(`${API_URL}/api/v1/user-preferences`, 'POST', data);
}
async function updateUserCuisineScore(userId: string, cuisineName: string, increment?: number) {
  return apiRequest(`${API_URL}/api/v1/user-preferences/score`, 'POST', { userId, cuisineName, increment });
}

// User Preference API combined object
export const userPreferenceApi = {
  get: getUserPreferences,
  upsert: upsertUserPreferences,
  updateCuisineScore: updateUserCuisineScore,
};


// Auth OTP API implementation functions
async function requestSignupOTPInApi(email: string) {
  return apiRequest(`${API_URL}/api/v1/auth/otp/signup/request`, 'POST', { email });
}
async function verifySignupOTPInApi(email: string, otp: string) {
  return apiRequest(`${API_URL}/api/v1/auth/otp/signup/verify`, 'POST', { email, otp });
}
async function requestForgotPasswordOTPInApi(email: string) {
  return apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/request`, 'POST', { email });
}
async function verifyForgotPasswordOTPInApi(email: string, otp: string) {
  return apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/verify`, 'POST', { email, otp });
}
async function resetPasswordInApi(email: string, resetToken: string, newPassword: any) {
  return apiRequest(`${API_URL}/api/v1/auth/otp/forgot-password/reset`, 'POST', { email, resetToken, newPassword });
}

// Auth OTP API combined object
export const authOtpApi = {
  requestSignupOTP: requestSignupOTPInApi,
  verifySignupOTP: verifySignupOTPInApi,
  requestForgotPasswordOTP: requestForgotPasswordOTPInApi,
  verifyForgotPasswordOTP: verifyForgotPasswordOTPInApi,
  resetPassword: resetPasswordInApi,
};

// Food Scan API implementation functions
async function logFoodScan(data: { 
  foodName: string; 
  confidence: number; 
  source: string; 
  metadata?: any;
  imageData?: string;
  correctedName?: string;
}) {
  const user = auth.currentUser;
  if (!user) return null; // Silently fail if not logged in

  return apiRequest(`${API_URL}/api/v1/food-scans/log`, 'POST', {
    ...data,
    userId: user.uid
  });
}

async function correctFoodScan(scanId: string, correctedName: string) {
  return apiRequest(`${API_URL}/api/v1/food-scans/correct/${scanId}`, 'PATCH', {
    correctedName
  });
}

async function getFoodScanHistory() {
  const user = auth.currentUser;
  if (!user) return [];

  return apiRequest(`${API_URL}/api/v1/food-scans/history/${user.uid}`);
}

export const foodScanApi = {
  log: logFoodScan,
  correct: correctFoodScan,
  getHistory: getFoodScanHistory
};

export default {
  business: businessApi,
  bookings: bookingsApi,
  user: userAPI,
  notifications: notificationsApi,
  preOrder: preOrderApi,
  event: eventApi,
  preferences: userPreferenceApi,
  authOtp: authOtpApi,
  foodScans: foodScanApi
};
