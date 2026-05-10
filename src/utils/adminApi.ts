// Admin API utility with JWT authentication

import { API_CONFIG } from '../config/api';
const API_URL = API_CONFIG.BASE_URL;

// Get admin token from localStorage
export function getAdminToken(): string | null {
  return localStorage.getItem('adminToken');
}

// Check if token is expired
export function isTokenExpired(): boolean {
  const loginTime = localStorage.getItem('adminLoginTime');
  if (!loginTime) return true;
  
  const loginDate = new Date(loginTime);
  const now = new Date();
  const hoursDiff = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff > 24; // Token expires after 24 hours
}

// Clear admin session
export function clearAdminSession() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminRole');
  localStorage.removeItem('adminLoginTime');
}

// Make authenticated API request
export async function adminApiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
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

    // Check if the response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      throw new Error(`Server returned non-JSON response (${response.status}). The backend might be down or misconfigured.`);
    }

    const data = await response.json();

    // Handle token expiration
    if (response.status === 401 && data.expired) {
      clearAdminSession();
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Admin API request failed:', error);
    // Provide a more user-friendly error message if it's a JSON parse error or connection error
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse server response. The API might be returning HTML instead of JSON.');
    }
    throw error;
  }
}

// Admin API method implementations as hoisted functions
export async function getStats() { return adminApiRequest('/api/v1/admin/stats'); }

export async function getUsers(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/users?${query}`);
}

export async function toggleUserStatus(userId: string) {
  return adminApiRequest('/api/v1/admin/users/toggle-status', {
    method: 'PATCH',
    body: JSON.stringify({ userId }),
  });
}

export async function impersonateUser(userId: string) {
  return adminApiRequest(`/api/v1/admin/users/${userId}/impersonate`, {
    method: 'POST',
  });
}

export async function getBusinesses(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/businesses?${query}`);
}

export async function toggleBusinessStatus(businessId: string) {
  return adminApiRequest('/api/v1/admin/businesses/toggle-status', {
    method: 'PATCH',
    body: JSON.stringify({ businessId }),
  });
}

export async function sendNotification(data: {
  title: string;
  message: string;
  type: string;
  targetType: string;
}) {
  return adminApiRequest('/api/v1/admin/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotificationStats() { return adminApiRequest('/api/v1/admin/notification-stats'); }
export async function getNotificationHistory(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/notification-history?${query}`);
}

export async function getAdmins(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/list?${query}`);
}

export async function addAdmin(email: string) {
  return adminApiRequest('/api/v1/admin/add', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function removeAdmin(adminEmail: string) {
  return adminApiRequest('/api/v1/admin/remove', {
    method: 'DELETE',
    body: JSON.stringify({ adminEmail }),
  });
}

export async function toggleAdminStatus(adminEmail: string) {
  return adminApiRequest('/api/v1/admin/toggle-status', {
    method: 'PATCH',
    body: JSON.stringify({ adminEmail }),
  });
}

export async function toggleImpersonationPermission(adminEmail: string) {
  return adminApiRequest('/api/v1/admin/toggle-impersonation-permission', {
    method: 'PATCH',
    body: JSON.stringify({ adminEmail }),
  });
}

export async function updateMaxAdmins(maxAdmins: number) {
  return adminApiRequest('/api/v1/admin/update-max-admins', {
    method: 'PATCH',
    body: JSON.stringify({ maxAdmins }),
  });
}

export async function getSystemHealth() { return adminApiRequest('/api/v1/admin/system-health'); }
export async function getDatabaseStats() { return adminApiRequest('/api/v1/admin/database-stats'); }
export async function getApiHealth() { return adminApiRequest('/api/v1/admin/api-health'); }
export async function getServiceStatus() { return adminApiRequest('/api/v1/admin/service-status'); }

export async function toggleMaintenanceMode(data: {
  enabled: boolean;
  message?: string;
  estimatedEndTime?: string;
}) {
  return adminApiRequest('/api/v1/admin/maintenance-mode', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSettings() { return adminApiRequest('/api/v1/admin/settings'); }
export async function updateSettings(settings: any) {
  return adminApiRequest('/api/v1/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function updateSingleSetting(key: string, value: any) {
  return adminApiRequest('/api/v1/admin/settings/single', {
    method: 'PATCH',
    body: JSON.stringify({ key, value }),
  });
}

export async function resetSettings() {
  return adminApiRequest('/api/v1/admin/settings/reset', {
    method: 'POST',
  });
}

export async function restartServices() {
  return adminApiRequest('/api/v1/admin/restart-services', {
    method: 'POST',
  });
}

export async function clearCache() {
  return adminApiRequest('/api/v1/admin/clear-cache', {
    method: 'POST',
  });
}

export async function forceRefresh() {
  return adminApiRequest('/api/v1/admin/force-refresh', {
    method: 'POST',
  });
}

export async function generateReport(data: { startDate: string; endDate: string; reportType: string }) {
  return adminApiRequest('/api/v1/reports/admin/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReportsList(params: { reportType?: string; limit?: number }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/reports/list?${query}`);
}

export async function getIssueReports(params: { status?: string; issueType?: string; priority?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/issue-reports/admin/all?${query}`);
}

export async function getIssueStats() { return adminApiRequest('/api/v1/issue-reports/admin/stats'); }

export async function updateIssueStatus(issueId: string, status: string) {
  return adminApiRequest(`/api/v1/issue-reports/admin/${issueId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getSecurityStats() { return adminApiRequest('/api/v1/admin/security/stats'); }

export async function getSecurityLogs(params: { portal?: string; eventType?: string; severity?: string; limit?: number; page?: number; since?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/security/logs?${query}`);
}

export async function getBlockedIPs() { return adminApiRequest('/api/v1/admin/security/blocked-ips'); }

export async function unblockIP(ipAddress: string) {
  return adminApiRequest('/api/v1/admin/security/unblock-ip', {
    method: 'POST',
    body: JSON.stringify({ ipAddress }),
  });
}

export async function blockIP(ipAddress: string, reason: string) {
  return adminApiRequest('/api/v1/admin/security/block-ip', {
    method: 'POST',
    body: JSON.stringify({ ipAddress, reason }),
  });
}

export async function getWaitlistStats() { return adminApiRequest('/api/v1/admin/waitlist/stats'); }

export async function sendWaitlistBroadcast(data: { subject: string; html: string; targetType: string; onlyPending?: boolean; targetIds?: string[] }) {
  return adminApiRequest('/api/v1/admin/waitlist/broadcast', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWaitlistSignups(params: { page?: number; limit?: number; search?: string; status?: string; userType?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return adminApiRequest(`/api/v1/admin/waitlist/all?${query}`);
}

export async function updateWaitlistStatus(data: { id: string; emailStatus?: string; generalStatus?: string }) {
  return adminApiRequest('/api/v1/admin/waitlist/update-status', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getFeatureFlags() {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/feature-flags`);
  return res.json();
}

// Admin API combined object for backward compatibility
export const adminApi = {
  getStats,
  getUsers,
  toggleUserStatus,
  impersonateUser,
  getBusinesses,
  toggleBusinessStatus,
  sendNotification,
  getNotificationStats,
  getNotificationHistory,
  getAdmins,
  addAdmin,
  removeAdmin,
  toggleAdminStatus,
  toggleImpersonationPermission,
  updateMaxAdmins,
  getSystemHealth,
  getDatabaseStats,
  getApiHealth,
  getServiceStatus,
  toggleMaintenanceMode,
  getSettings,
  updateSettings,
  updateSingleSetting,
  resetSettings,
  restartServices,
  clearCache,
  forceRefresh,
  generateReport,
  getReportsList,
  getIssueReports,
  getIssueStats,
  updateIssueStatus,
  getSecurityStats,
  getSecurityLogs,
  getBlockedIPs,
  unblockIP,
  blockIP,
  getWaitlistStats,
  sendWaitlistBroadcast,
  getWaitlistSignups,
  updateWaitlistStatus,
  getFeatureFlags,
};
