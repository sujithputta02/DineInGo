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
  getNotificationStats
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

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('Admin test route called');
  res.json({ success: true, message: 'Admin routes are working' });
});

// Clear OTP records (for testing)
router.delete('/clear-otp/:email', async (req, res) => {
  try {
    const { email } = req.params;
    await AdminOTP.deleteMany({ email: email.toLowerCase() });
    res.json({ success: true, message: 'OTP records cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing OTP records' });
  }
});

// Initialize super admin on server start
initializeSuperAdmin();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.post('/request-otp', requestAdminOTP);
router.post('/verify-otp', verifyAdminOTP);

// ============================================
// PROTECTED ROUTES (JWT authentication required)
// ============================================

// Dashboard and statistics
router.get('/stats', verifyAdminToken, getAdminStats);

// User management
router.get('/users', verifyAdminToken, getAllUsers);
router.patch('/users/toggle-status', verifyAdminToken, toggleUserStatus);

// Business management
router.get('/businesses', verifyAdminToken, getAllBusinesses);
router.patch('/businesses/toggle-status', verifyAdminToken, toggleBusinessStatus);

// Notifications
router.post('/notifications', verifyAdminToken, sendNotification);
router.get('/notification-stats', verifyAdminToken, getNotificationStats);

// Admin team management (Super admin only)
router.get('/list', verifyAdminToken, verifySuperAdmin, getAdmins);
router.post('/add', verifyAdminToken, verifySuperAdmin, addAdmin);
router.delete('/remove', verifyAdminToken, verifySuperAdmin, removeAdmin);
router.patch('/toggle-status', verifyAdminToken, verifySuperAdmin, toggleAdminStatus);
router.patch('/update-max-admins', verifyAdminToken, verifySuperAdmin, updateMaxAdmins);

// System health routes
router.get('/system-health', verifyAdminToken, getSystemHealth);
router.get('/database-stats', verifyAdminToken, getDatabaseStats);
router.get('/api-health', verifyAdminToken, getApiHealth);
router.get('/service-status', verifyAdminToken, getServiceStatus);

// Maintenance mode routes
router.post('/maintenance-mode', verifyAdminToken, verifySuperAdmin, toggleMaintenanceMode);
router.get('/maintenance-status', getMaintenanceStatus); // Public route

// Platform settings routes
router.get('/settings', verifyAdminToken, getSettings);
router.post('/settings', verifyAdminToken, verifySuperAdmin, updateSettings);
router.patch('/settings/single', verifyAdminToken, verifySuperAdmin, updateSingleSetting);
router.post('/settings/reset', verifyAdminToken, verifySuperAdmin, resetSettings);

// System operations (Super admin only)
router.post('/restart-services', verifyAdminToken, verifySuperAdmin, restartServices);
router.post('/clear-cache', verifyAdminToken, verifySuperAdmin, clearCache);

export default router;