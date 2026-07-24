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
import { getBusinessTableStatuses, updateTableStatus, batchUpdateTableStatus, releaseTable, createWalkInBooking } from '../controllers/tableStatusController';
import { getBusinessCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaign } from '../controllers/marketingController';
import { getBusinessPromotions, createPromotion, updatePromotion, deletePromotion } from '../controllers/promotionController';
import { getBusinessReviews, addReview, replyToReview, deleteReview, getBusinessRatingStats, updateReview, updateReply, deleteReply, likeReview, dislikeReview } from '../controllers/reviewController';
import { registerOrLinkOwner, getOwnerProfile, linkGoogleAccount, setPassword } from '../controllers/ownerController';
import { getOwnerPayouts, calculatePayout, requestPayout, getPayoutAnalytics, updatePayoutStatus } from '../controllers/payoutController';
import { generatePDFInvoice, getBusinessInvoices } from '../controllers/invoiceController';
import { connectPOS, getPOSIntegration, syncOrders, handlePOSWebhook, disconnectPOS } from '../controllers/posController';
import { addFavorite, removeFavorite, getFavorites } from '../controllers/favoritesController';
// SECURITY: Import auth middleware
import { verifyUserToken } from '../middleware/userAuth';
import { verifyBusinessOwner, verifyBusinessAccess, verifyResourceAccess } from '../middleware/businessAuth';
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
router.get('/owner/profile/:uid', businessApiLimiter, verifyUserToken, getOwnerProfile);
router.post('/owner/link-google', businessApiLimiter, verifyUserToken, logBusinessAction, linkGoogleAccount);
router.post('/owner/set-password', businessApiLimiter, verifyUserToken, logBusinessAction, setPassword);

// Restaurant Management (Legacy)
router.get('/restaurants/:uid', businessApiLimiter, verifyUserToken, getMyRestaurants);
router.post('/restaurant', businessRegistrationLimiter, verifyUserToken, verifyBusinessOwner, logBusinessAction, createRestaurant);
router.put('/restaurant/:id', businessUpdateLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, updateRestaurant);

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
router.post('/', businessRegistrationLimiter, verifyUserToken, verifyBusinessOwner, logBusinessAction, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), validateBusinessCreation, handleValidationErrors, createBusiness);
router.get('/owner/:ownerId', businessApiLimiter, verifyUserToken, getOwnerBusinesses);
router.get('/dashboard/:ownerId', businessApiLimiter, verifyUserToken, getBusinessDashboard);
router.get('/analytics/dashboard/:ownerId', businessApiLimiter, verifyUserToken, getDashboardAnalytics);
router.get('/:id', businessApiLimiter, validateObjectId, handleValidationErrors, getBusiness);
router.put('/:id', businessUpdateLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), validateBusinessUpdate, handleValidationErrors, updateBusiness);
router.delete('/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, deleteBusiness);

// Business Workflow
router.post('/:id/validate', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, validateBusiness);
router.post('/:id/deploy', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, deployBusiness);
router.patch('/:id/toggle-status', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, toggleBusinessStatus);

// Analytics
router.get('/:id/analytics', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessAnalytics);
router.get('/:id/bookings', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessBookings);
router.get('/:id/booking-analytics', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBookingAnalytics);

// Advanced Analytics
router.get('/:id/analytics/heatmap', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getHeatmapData);
router.get('/:id/analytics/forecast', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getRevenueForecast);
router.get('/:id/analytics/loyalty', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getCustomerLoyalty);

// Operations & Staff Management
router.get('/:businessId/staff', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessStaff);
router.post('/:businessId/staff', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, validateStaffMember, handleValidationErrors, addStaff);
router.put('/staff/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Staff'), logBusinessAction, validateStaffMember, handleValidationErrors, updateStaff);
router.delete('/staff/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Staff'), logBusinessAction, removeStaff);

router.get('/:businessId/shifts', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessShifts);
router.post('/:businessId/shifts', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, createShift);
router.put('/shifts/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Shift'), logBusinessAction, updateShift);
router.delete('/shifts/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Shift'), logBusinessAction, deleteShift);

router.get('/:businessId/table-status', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessTableStatuses);
router.put('/:businessId/table-status/:tableId', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, updateTableStatus);
router.patch('/:businessId/table-status/:tableId/release', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, releaseTable);
router.post('/:businessId/table-status/:tableId/walk-in', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, createWalkInBooking);
router.post('/:businessId/table-status/batch', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, batchUpdateTableStatus);

// Marketing Engine
router.get('/:businessId/campaigns', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessCampaigns);
router.post('/:businessId/campaigns', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, validateCampaign, handleValidationErrors, createCampaign);
router.put('/campaigns/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Campaign'), logBusinessAction, validateCampaign, handleValidationErrors, updateCampaign);
router.delete('/campaigns/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Campaign'), logBusinessAction, deleteCampaign);
router.post('/campaigns/:id/send', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Campaign'), logBusinessAction, sendCampaign);

// Promotion Manager
router.get('/:businessId/promotions', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessPromotions);
router.post('/:businessId/promotions', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, logBusinessAction, validatePromotion, handleValidationErrors, createPromotion);
router.put('/promotions/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Promotion'), logBusinessAction, validatePromotion, handleValidationErrors, updatePromotion);
router.delete('/promotions/:id', businessApiLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Promotion'), logBusinessAction, deletePromotion);
router.post('/promotions/validate', businessApiLimiter, verifyUserToken, verifyBusinessOwner, validatePromotion);

// Review Management
router.get('/:businessId/reviews', validateParamId('businessId'), handleValidationErrors, businessApiLimiter, getBusinessReviews);
router.post('/:businessId/reviews', validateParamId('businessId'), handleValidationErrors, reviewLimiter, upload.array('images', 5), validateReviewSubmission, handleValidationErrors, addReview);
router.put('/reviews/:id', reviewLimiter, verifyUserToken, verifyResourceAccess('Review'), validateObjectId, handleValidationErrors, upload.array('images', 5), updateReview);
router.post('/reviews/:id/reply', reviewLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Review'), logBusinessAction, validateReviewReply, handleValidationErrors, replyToReview);
router.put('/reviews/:id/reply', reviewLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Review'), logBusinessAction, validateReviewReply, handleValidationErrors, updateReply);
router.delete('/reviews/:id/reply', reviewLimiter, verifyUserToken, verifyBusinessOwner, verifyResourceAccess('Review'), logBusinessAction, deleteReply);
router.delete('/reviews/:id', reviewLimiter, verifyUserToken, verifyResourceAccess('Review'), deleteReview);
router.post('/reviews/:reviewId/like', reviewLimiter, verifyUserToken, likeReview);
router.post('/reviews/:reviewId/dislike', reviewLimiter, verifyUserToken, dislikeReview);
router.get('/:businessId/rating-stats', businessApiLimiter, getBusinessRatingStats);

// Payout Management
router.get('/payouts/:ownerId', verifyUserToken, verifyBusinessOwner, getOwnerPayouts);
router.post('/payouts/calculate', verifyUserToken, verifyBusinessOwner, calculatePayout);
router.post('/payouts/request', verifyUserToken, verifyBusinessOwner, requestPayout);
router.get('/payouts/analytics/:ownerId', verifyUserToken, verifyBusinessOwner, getPayoutAnalytics);
router.patch('/payouts/:id/status', verifyUserToken, verifyBusinessOwner, updatePayoutStatus);

// Invoice Management
router.get('/invoices/:businessId', verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getBusinessInvoices);
router.get('/invoices/pdf/:bookingId', verifyUserToken, generatePDFInvoice);

// POS Integration
router.post('/pos/connect', verifyUserToken, verifyBusinessOwner, connectPOS);
router.get('/pos/:businessId', verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, getPOSIntegration);
router.post('/pos/:businessId/sync', verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, syncOrders);
router.post('/pos/webhook/:businessId', handlePOSWebhook); // Webhook can be public
router.delete('/pos/:businessId', verifyUserToken, verifyBusinessOwner, verifyBusinessAccess, disconnectPOS);

// Favorites
router.post('/favorites/add', verifyUserToken, addFavorite);
router.delete('/favorites/:userId/:restaurantId', verifyUserToken, removeFavorite);
router.get('/favorites/:userId', verifyUserToken, getFavorites);

export default router;
