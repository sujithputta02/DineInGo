import express, { Request, Response } from 'express';
import {
  getMyRestaurants,
  createRestaurant,
  updateRestaurant,
  createBusiness,
  getAllBusinesses,
  getOwnerBusinesses,
  getBusiness,
  updateBusiness,
  deleteBusiness,
  validateBusiness,
  deployBusiness,
  toggleBusinessStatus,
  getBusinessAnalytics,
  getBusinessDashboard,
  getDashboardAnalytics,
  upload
} from '../controllers/businessController';
import { getBusinessBookings, getBookingAnalytics } from '../controllers/bookingController';
import { getHeatmapData, getRevenueForecast, getCustomerLoyalty } from '../controllers/analyticsController';
import { getBusinessStaff, addStaff, updateStaff, removeStaff } from '../controllers/staffController';
import { getBusinessShifts, createShift, updateShift, deleteShift } from '../controllers/shiftController';
import { getBusinessTableStatuses, updateTableStatus, batchUpdateTableStatus } from '../controllers/tableStatusController';
import { getBusinessCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaign } from '../controllers/marketingController';
import { getBusinessPromotions, createPromotion, updatePromotion, deletePromotion } from '../controllers/promotionController';
import { getBusinessReviews, addReview, replyToReview, deleteReview, getBusinessRatingStats, updateReview, updateReply, deleteReply, likeReview, dislikeReview } from '../controllers/reviewController';
import { registerOrLinkOwner, getOwnerProfile, linkGoogleAccount, setPassword } from '../controllers/ownerController';
import { getOwnerPayouts, calculatePayout, requestPayout, getPayoutAnalytics, updatePayoutStatus } from '../controllers/payoutController';
import { generatePDFInvoice, getBusinessInvoices } from '../controllers/invoiceController';
import { connectPOS, getPOSIntegration, syncOrders, handlePOSWebhook, disconnectPOS } from '../controllers/posController';
import { addFavorite, removeFavorite, getFavorites } from '../controllers/favoritesController';
// SECURITY: Import rate limiters and validation
import { businessRegistrationLimiter, businessApiLimiter, businessUpdateLimiter, reviewLimiter } from '../middleware/rateLimiter';
import { logBusinessAction } from '../middleware/businessAuditLog';
import {
  validateBusinessCreation,
  validateBusinessUpdate,
  validateStaffMember,
  validatePromotion,
  validateCampaign,
  validateReviewSubmission,
  validateReviewReply,
  validateBusinessSearch,
  validateObjectId,
  validateParamId,
  handleValidationErrors
} from '../middleware/inputValidation';
import { accountLockoutCheck } from '../middleware/accountLockout';

const router = express.Router();

// Owner Authentication & Account Management
router.post('/register', businessRegistrationLimiter, accountLockoutCheck('business'), logBusinessAction, registerOrLinkOwner);
router.get('/owner/profile/:uid', businessApiLimiter, getOwnerProfile);
router.post('/owner/link-google', businessApiLimiter, logBusinessAction, linkGoogleAccount);
router.post('/owner/set-password', businessApiLimiter, logBusinessAction, setPassword);

// Restaurant Management (Legacy)
router.get('/restaurants/:uid', businessApiLimiter, getMyRestaurants);
router.post('/restaurant', businessRegistrationLimiter, logBusinessAction, createRestaurant);
router.put('/restaurant/:id', businessUpdateLimiter, logBusinessAction, updateRestaurant);

// Test endpoint for debugging
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Business API is working!',
    timestamp: new Date().toISOString(),
    cors: true
  });
});

// New Business Management API
router.get('/', businessApiLimiter, validateBusinessSearch, handleValidationErrors, getAllBusinesses);
router.post('/', businessRegistrationLimiter, logBusinessAction, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), validateBusinessCreation, handleValidationErrors, createBusiness);
router.get('/owner/:ownerId', businessApiLimiter, getOwnerBusinesses);
router.get('/dashboard/:ownerId', businessApiLimiter, getBusinessDashboard);
router.get('/analytics/dashboard/:ownerId', businessApiLimiter, getDashboardAnalytics);
router.get('/:id', businessApiLimiter, validateObjectId, handleValidationErrors, getBusiness);
router.put('/:id', businessUpdateLimiter, logBusinessAction, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), validateBusinessUpdate, handleValidationErrors, updateBusiness);
router.delete('/:id', businessApiLimiter, logBusinessAction, deleteBusiness);

// Business Workflow
router.post('/:id/validate', businessApiLimiter, logBusinessAction, validateBusiness);
router.post('/:id/deploy', businessApiLimiter, logBusinessAction, deployBusiness);
router.patch('/:id/toggle-status', businessApiLimiter, logBusinessAction, toggleBusinessStatus);

// Analytics
router.get('/:id/analytics', businessApiLimiter, getBusinessAnalytics);
router.get('/:id/bookings', businessApiLimiter, getBusinessBookings);
router.get('/:id/booking-analytics', businessApiLimiter, getBookingAnalytics);

// Advanced Analytics
router.get('/:id/analytics/heatmap', businessApiLimiter, getHeatmapData);
router.get('/:id/analytics/forecast', businessApiLimiter, getRevenueForecast);
router.get('/:id/analytics/loyalty', businessApiLimiter, getCustomerLoyalty);

// Operations & Staff Management
router.get('/:businessId/staff', businessApiLimiter, getBusinessStaff);
router.post('/:businessId/staff', businessApiLimiter, logBusinessAction, validateStaffMember, handleValidationErrors, addStaff);
router.put('/staff/:id', businessApiLimiter, logBusinessAction, validateStaffMember, handleValidationErrors, updateStaff);
router.delete('/staff/:id', businessApiLimiter, logBusinessAction, removeStaff);

router.get('/:businessId/shifts', businessApiLimiter, getBusinessShifts);
router.post('/:businessId/shifts', businessApiLimiter, logBusinessAction, createShift);
router.put('/shifts/:id', businessApiLimiter, logBusinessAction, updateShift);
router.delete('/shifts/:id', businessApiLimiter, logBusinessAction, deleteShift);

router.get('/:businessId/table-status', businessApiLimiter, getBusinessTableStatuses);
router.put('/:businessId/table-status/:tableId', businessApiLimiter, logBusinessAction, updateTableStatus);
router.post('/:businessId/table-status/batch', businessApiLimiter, logBusinessAction, batchUpdateTableStatus);

// Marketing Engine
router.get('/:businessId/campaigns', businessApiLimiter, getBusinessCampaigns);
router.post('/:businessId/campaigns', businessApiLimiter, logBusinessAction, validateCampaign, handleValidationErrors, createCampaign);
router.put('/campaigns/:id', businessApiLimiter, logBusinessAction, validateCampaign, handleValidationErrors, updateCampaign);
router.delete('/campaigns/:id', businessApiLimiter, logBusinessAction, deleteCampaign);
router.post('/campaigns/:id/send', businessApiLimiter, logBusinessAction, sendCampaign);

// Promotion Manager
router.get('/:businessId/promotions', businessApiLimiter, getBusinessPromotions);
router.post('/:businessId/promotions', businessApiLimiter, logBusinessAction, validatePromotion, handleValidationErrors, createPromotion);
router.put('/promotions/:id', businessApiLimiter, logBusinessAction, validatePromotion, handleValidationErrors, updatePromotion);
router.delete('/promotions/:id', businessApiLimiter, logBusinessAction, deletePromotion);
router.post('/promotions/validate', businessApiLimiter, validatePromotion);

// Review Management
router.get('/:businessId/reviews', validateParamId('businessId'), handleValidationErrors, businessApiLimiter, getBusinessReviews);
router.post('/:businessId/reviews', validateParamId('businessId'), handleValidationErrors, reviewLimiter, upload.array('images', 5), validateReviewSubmission, handleValidationErrors, addReview);
router.put('/reviews/:id', reviewLimiter, validateObjectId, handleValidationErrors, upload.array('images', 5), updateReview);
router.post('/reviews/:id/reply', reviewLimiter, logBusinessAction, validateReviewReply, handleValidationErrors, replyToReview);
router.put('/reviews/:id/reply', reviewLimiter, logBusinessAction, validateReviewReply, handleValidationErrors, updateReply);
router.delete('/reviews/:id/reply', reviewLimiter, logBusinessAction, deleteReply);
router.delete('/reviews/:id', reviewLimiter, deleteReview);
router.post('/reviews/:reviewId/like', reviewLimiter, likeReview);
router.post('/reviews/:reviewId/dislike', reviewLimiter, dislikeReview);
router.get('/:businessId/rating-stats', businessApiLimiter, getBusinessRatingStats);

// Payout Management
router.get('/payouts/:ownerId', getOwnerPayouts);
router.post('/payouts/calculate', calculatePayout);
router.post('/payouts/request', requestPayout);
router.get('/payouts/analytics/:ownerId', getPayoutAnalytics);
router.patch('/payouts/:id/status', updatePayoutStatus);

// Invoice Management
router.get('/invoices/:businessId', getBusinessInvoices);
router.get('/invoices/pdf/:bookingId', generatePDFInvoice);

// POS Integration
router.post('/pos/connect', connectPOS);
router.get('/pos/:businessId', getPOSIntegration);
router.post('/pos/:businessId/sync', syncOrders);
router.post('/pos/webhook/:businessId', handlePOSWebhook);
router.delete('/pos/:businessId', disconnectPOS);

// Favorites
router.post('/favorites/add', addFavorite);
router.delete('/favorites/:userId/:restaurantId', removeFavorite);
router.get('/favorites/:userId', getFavorites);

export default router;
