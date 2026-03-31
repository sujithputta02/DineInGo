import express from 'express';
import {
  requestAdminOTP,
  verifyAdminOTP,
  getAdmins,
  addAdmin,
  removeAdmin,
  toggleAdminStatus,
  updateMaxAdmins,
  initializeSuperAdmin,
  getAdminStats,
  getAllUsers,
  getAllBusinesses,
  toggleUserStatus,
  toggleBusinessStatus,
  sendNotification,
  getNotificationStats,
  getSecurityStats,
  getSecurityLogs,
  getBlockedIPs,
  unblockIP,
  getWaitlistStats,
  sendWaitlistBroadcast,
  getWaitlistSignups,
  updateWaitlistStatus
} from '../controllers/adminController';
import {
  getSystemHealth,
  getDatabaseStats,
  getApiHealth,
  getServiceStatus,
  toggleMaintenanceMode,
  getMaintenanceStatus,
  restartServices,
  clearCache
} from '../controllers/systemHealthController';
import {
  getSettings,
  updateSettings,
  updateSingleSetting,
  resetSettings
} from '../controllers/platformSettingsController';
import { AdminOTP } from '../models/Admin';
import { verifyAdminToken, verifySuperAdmin } from '../middleware/adminAuth';
import { logAdminAction } from '../middleware/adminAuditLog';
import { adminOtpRequestLimiter, adminOtpVerifyLimiter } from '../middleware/adminRateLimiter';
import { adminApiLimiter } from '../middleware/rateLimiter';
import {
  validateAdminOtpRequest,
  validateAdminOtpVerification,
  validateAdminNotification,
  validateAdminUserStatusToggle,
  validateAdminBusinessStatusToggle,
  validateAddAdmin,
  validateRemoveAdmin,
  handleValidationErrors
} from '../middleware/inputValidation';
import { accountLockoutCheck } from '../middleware/accountLockout';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('Admin test route called');
  res.json({ success: true, message: 'Admin routes are working' });
});

// ⚠️ Debug route restricted to development only
if (process.env.NODE_ENV !== 'production') {
  router.delete('/clear-otp/:email', async (req, res) => {
    try {
      const { email } = req.params;
      await AdminOTP.deleteMany({ email: email.toLowerCase() });
      res.json({ success: true, message: 'OTP records cleared' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error clearing OTP records' });
    }
  });
}

// Initialize super admin on server start
initializeSuperAdmin();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.post('/request-otp', adminOtpRequestLimiter, validateAdminOtpRequest, handleValidationErrors, requestAdminOTP);
router.post('/verify-otp', adminOtpVerifyLimiter, accountLockoutCheck('admin'), validateAdminOtpVerification, handleValidationErrors, verifyAdminOTP);

// ============================================
// PROTECTED ROUTES (JWT authentication required)
// All protected routes use:
// - adminApiLimiter: Rate limiting
// - logAdminAction: Audit logging
// - verifyAdminToken: JWT authentication
// ============================================

// Dashboard and statistics
router.get('/stats', adminApiLimiter, verifyAdminToken, logAdminAction, getAdminStats);

// User management
router.get('/users', adminApiLimiter, verifyAdminToken, logAdminAction, getAllUsers);
router.patch('/users/toggle-status', adminApiLimiter, verifyAdminToken, logAdminAction, validateAdminUserStatusToggle, handleValidationErrors, toggleUserStatus);

// Business management
router.get('/businesses', adminApiLimiter, verifyAdminToken, logAdminAction, getAllBusinesses);
router.patch('/businesses/toggle-status', adminApiLimiter, verifyAdminToken, logAdminAction, validateAdminBusinessStatusToggle, handleValidationErrors, toggleBusinessStatus);

// Notifications
router.post('/notifications', adminApiLimiter, verifyAdminToken, logAdminAction, validateAdminNotification, handleValidationErrors, sendNotification);
router.get('/notification-stats', adminApiLimiter, verifyAdminToken, logAdminAction, getNotificationStats);

// Admin team management (Super admin only)
router.get('/list', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, getAdmins);
router.post('/add', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, validateAddAdmin, handleValidationErrors, addAdmin);
router.delete('/remove', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, validateRemoveAdmin, handleValidationErrors, removeAdmin);
router.patch('/toggle-status', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, toggleAdminStatus);
router.patch('/update-max-admins', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, updateMaxAdmins);

// System health routes
router.get('/system-health', adminApiLimiter, verifyAdminToken, logAdminAction, getSystemHealth);
router.get('/database-stats', adminApiLimiter, verifyAdminToken, logAdminAction, getDatabaseStats);
router.get('/api-health', adminApiLimiter, verifyAdminToken, logAdminAction, getApiHealth);
router.get('/service-status', adminApiLimiter, verifyAdminToken, logAdminAction, getServiceStatus);

// Security auditing (Super admin only)
router.get('/security/stats', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, getSecurityStats);
router.get('/security/logs', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, getSecurityLogs);
router.get('/security/blocked-ips', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, getBlockedIPs);
router.post('/security/unblock-ip', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, unblockIP);

// Maintenance mode routes
router.post('/maintenance-mode', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, toggleMaintenanceMode);
router.get('/maintenance-status', getMaintenanceStatus); // Public route

// Platform settings routes
router.get('/settings', adminApiLimiter, verifyAdminToken, logAdminAction, getSettings);
router.post('/settings', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, updateSettings);
router.patch('/settings/single', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, updateSingleSetting);
router.post('/settings/reset', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, resetSettings);

// System operations (Super admin only)
router.post('/restart-services', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, restartServices);
router.post('/clear-cache', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, clearCache);

// Waitlist management (Super admin only for broadcast)
router.get('/waitlist/stats', adminApiLimiter, verifyAdminToken, logAdminAction, getWaitlistStats);
router.post('/waitlist/broadcast', adminApiLimiter, verifyAdminToken, verifySuperAdmin, logAdminAction, sendWaitlistBroadcast);
router.get('/waitlist/all', adminApiLimiter, verifyAdminToken, logAdminAction, getWaitlistSignups);
router.patch('/waitlist/update-status', adminApiLimiter, verifyAdminToken, logAdminAction, updateWaitlistStatus);

export default router;