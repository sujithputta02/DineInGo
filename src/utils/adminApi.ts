// Admin API utility with JWT authentication

import { API_CONFIG } from '../config/api';
const API_URL = API_CONFIG.BASE_URL;

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
  getStats: () => adminApiRequest('/api/v1/admin/stats'),

  // User management
  getUsers: (params: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/admin/users?${query}`);
  },
  toggleUserStatus: (userId: string) =>
    adminApiRequest('/api/v1/admin/users/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  // Business management
  getBusinesses: (params: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/admin/businesses?${query}`);
  },
  toggleBusinessStatus: (businessId: string) =>
    adminApiRequest('/api/v1/admin/businesses/toggle-status', {
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
    adminApiRequest('/api/v1/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getNotificationStats: () => adminApiRequest('/api/v1/admin/notification-stats'),

  // Admin team management (Super admin only)
  getAdmins: () => adminApiRequest('/api/v1/admin/list'),
  addAdmin: (email: string) =>
    adminApiRequest('/api/v1/admin/add', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  removeAdmin: (adminEmail: string) =>
    adminApiRequest('/api/v1/admin/remove', {
      method: 'DELETE',
      body: JSON.stringify({ adminEmail }),
    }),
  toggleAdminStatus: (adminEmail: string) =>
    adminApiRequest('/api/v1/admin/toggle-status', {
      method: 'PATCH',
      body: JSON.stringify({ adminEmail }),
    }),
  updateMaxAdmins: (maxAdmins: number) =>
    adminApiRequest('/api/v1/admin/update-max-admins', {
      method: 'PATCH',
      body: JSON.stringify({ maxAdmins }),
    }),

  // System health
  getSystemHealth: () => adminApiRequest('/api/v1/admin/system-health'),
  getDatabaseStats: () => adminApiRequest('/api/v1/admin/database-stats'),
  getApiHealth: () => adminApiRequest('/api/v1/admin/api-health'),
  getServiceStatus: () => adminApiRequest('/api/v1/admin/service-status'),

  // Maintenance mode
  toggleMaintenanceMode: (data: {
    enabled: boolean;
    message?: string;
    estimatedEndTime?: string;
  }) =>
    adminApiRequest('/api/v1/admin/maintenance-mode', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Platform settings
  getSettings: () => adminApiRequest('/api/v1/admin/settings'),
  updateSettings: (settings: any) =>
    adminApiRequest('/api/v1/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
  updateSingleSetting: (key: string, value: any) =>
    adminApiRequest('/api/v1/admin/settings/single', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    }),
  resetSettings: () =>
    adminApiRequest('/api/v1/admin/settings/reset', {
      method: 'POST',
    }),

  // System operations
  restartServices: () =>
    adminApiRequest('/api/v1/admin/restart-services', {
      method: 'POST',
    }),
  clearCache: () =>
    adminApiRequest('/api/v1/admin/clear-cache', {
      method: 'POST',
    }),

  // Reports
  generateReport: (data: { startDate: string; endDate: string; reportType: string }) =>
    adminApiRequest('/api/v1/reports/admin/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReportsList: (params: { reportType?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/reports/list?${query}`);
  },

  // Issue Reports
  getIssueReports: (params: { status?: string; issueType?: string; priority?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/issue-reports/admin/all?${query}`);
  },
  getIssueStats: () => adminApiRequest('/api/v1/issue-reports/admin/stats'),
  updateIssueStatus: (issueId: string, status: string) =>
    adminApiRequest(`/api/v1/issue-reports/admin/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  
  // Security auditing
  getSecurityStats: () => adminApiRequest('/api/v1/admin/security/stats'),
  getSecurityLogs: (params: { portal?: string; eventType?: string; severity?: string; limit?: number; page?: number; since?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/admin/security/logs?${query}`);
  },
  getBlockedIPs: () => adminApiRequest('/api/v1/admin/security/blocked-ips'),
  unblockIP: (ipAddress: string) =>
    adminApiRequest('/api/v1/admin/security/unblock-ip', {
      method: 'POST',
      body: JSON.stringify({ ipAddress }),
    }),
  blockIP: (ipAddress: string, reason: string) =>
    adminApiRequest('/api/v1/admin/security/block-ip', {
      method: 'POST',
      body: JSON.stringify({ ipAddress, reason }),
    }),

  // Waitlist management
  getWaitlistStats: () => adminApiRequest('/api/v1/admin/waitlist/stats'),
  sendWaitlistBroadcast: (data: { subject: string; html: string; targetType: string; onlyPending?: boolean; targetIds?: string[] }) =>
    adminApiRequest('/api/v1/admin/waitlist/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWaitlistSignups: (params: { page?: number; limit?: number; search?: string; status?: string; userType?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminApiRequest(`/api/v1/admin/waitlist/all?${query}`);
  },
  updateWaitlistStatus: (data: { id: string; emailStatus?: string; generalStatus?: string }) =>
    adminApiRequest('/api/v1/admin/waitlist/update-status', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
