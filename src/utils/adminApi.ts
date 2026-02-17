// Admin API utility with JWT authentication

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Get admin token from localStorage
const getAdminToken = (): string | null => {
  return localStorage.getItem('adminToken');
};

// Check if token is expired
const isTokenExpired = (): boolean => {
  const loginTime = localStorage.getItem('adminLoginTime');
  if (!loginTime) return true;
  
  const loginDate = new Date(loginTime);
  const now = new Date();
  const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff > 24; // Token expires after 24 hours
};

// Clear admin session
export const clearAdminSession = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminRole');
  localStorage.removeItem('adminLoginTime');
};

// Make authenticated API request
export const adminApiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAdminToken();
  
  if (!token || isTokenExpired()) {
    clearAdminSession();
    window.location.href = '/admin-login';
    throw new Error('Session expired. Please login again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle token expiration
    if (response.status === 401 && data.expired) {
      clearAdminSession();
      window.location.href = '/admin-login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('Admin API request failed:', error);
    throw error;
  }
};

// Admin API methods
export const adminApi = {
  // Dashboard stats
  getStats: () => adminApiRequest('/api/admin/stats'),

  // User management
  getUsers: (params: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/admin/users?${query}`);
  },
  toggleUserStatus: (userId: string) =>
    adminApiRequest('/api/admin/users/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  // Business management
  getBusinesses: (params: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/admin/businesses?${query}`);
  },
  toggleBusinessStatus: (businessId: string) =>
    adminApiRequest('/api/admin/businesses/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ businessId }),
    }),

  // Notifications
  sendNotification: (data: {
    title: string;
    message: string;
    type: string;
    targetType: string;
  }) =>
    adminApiRequest('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getNotificationStats: () => adminApiRequest('/api/admin/notification-stats'),

  // Admin team management (Super admin only)
  getAdmins: () => adminApiRequest('/api/admin/list'),
  addAdmin: (email: string) =>
    adminApiRequest('/api/admin/add', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  removeAdmin: (adminEmail: string) =>
    adminApiRequest('/api/admin/remove', {
      method: 'DELETE',
      body: JSON.stringify({ adminEmail }),
    }),
  toggleAdminStatus: (adminEmail: string) =>
    adminApiRequest('/api/admin/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ adminEmail }),
    }),

  // System health
  getSystemHealth: () => adminApiRequest('/api/admin/system-health'),
  getDatabaseStats: () => adminApiRequest('/api/admin/database-stats'),
  getApiHealth: () => adminApiRequest('/api/admin/api-health'),
  getServiceStatus: () => adminApiRequest('/api/admin/service-status'),

  // Maintenance mode
  toggleMaintenanceMode: (data: {
    enabled: boolean;
    message?: string;
    estimatedEndTime?: string;
  }) =>
    adminApiRequest('/api/admin/maintenance-mode', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Platform settings
  getSettings: () => adminApiRequest('/api/admin/settings'),
  updateSettings: (settings: any) =>
    adminApiRequest('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
  updateSingleSetting: (key: string, value: any) =>
    adminApiRequest('/api/admin/settings/single', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    }),
  resetSettings: () =>
    adminApiRequest('/api/admin/settings/reset', {
      method: 'POST',
    }),

  // System operations
  restartServices: () =>
    adminApiRequest('/api/admin/restart-services', {
      method: 'POST',
    }),
  clearCache: () =>
    adminApiRequest('/api/admin/clear-cache', {
      method: 'POST',
    }),

  // Reports
  generateReport: (data: { startDate: string; endDate: string; reportType: string }) =>
    adminApiRequest('/api/reports/admin/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReportsList: (params: { reportType?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/reports/list?${query}`);
  },

  // Issue Reports
  getIssueReports: (params: { status?: string; issueType?: string; priority?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/issue-reports/admin/all?${query}`);
  },
  getIssueStats: () => adminApiRequest('/api/issue-reports/admin/stats'),
  updateIssueStatus: (issueId: string, status: string) =>
    adminApiRequest(`/api/issue-reports/admin/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
