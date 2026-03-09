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
import { getBusinessPromotions, createPromotion, updatePromotion, deletePromotion, validatePromotion } from '../controllers/promotionController';
import { getBusinessReviews, addReview, replyToReview, deleteReview, getBusinessRatingStats, updateReview, updateReply, deleteReply, likeReview, dislikeReview } from '../controllers/reviewController';
import { registerOrLinkOwner, getOwnerProfile, linkGoogleAccount, setPassword } from '../controllers/ownerController';
import { getOwnerPayouts, calculatePayout, requestPayout, getPayoutAnalytics, updatePayoutStatus } from '../controllers/payoutController';
import { generatePDFInvoice, getBusinessInvoices } from '../controllers/invoiceController';
import { connectPOS, getPOSIntegration, syncOrders, handlePOSWebhook, disconnectPOS } from '../controllers/posController';
import { addFavorite, removeFavorite, getFavorites } from '../controllers/favoritesController';

const router = express.Router();

// Owner Authentication & Account Management
router.post('/register', registerOrLinkOwner);  // Register or link account
router.get('/owner/profile/:uid', getOwnerProfile);  // Get owner profile
router.post('/owner/link-google', linkGoogleAccount);  // Link Google account
router.post('/owner/set-password', setPassword);  // Set password for Google-only accounts

// Restaurant Management (Legacy)
router.get('/restaurants/:uid', getMyRestaurants);
router.post('/restaurant', createRestaurant);
router.put('/restaurant/:id', updateRestaurant);

// Test endpoint for debugging
router.get('/test', (req: Request, res: Response) => {
  res.json({
    message: 'Business API is working!',
    timestamp: new Date().toISOString(),
    cors: true
  });
});

// New Business Management API
router.get('/', getAllBusinesses); // Add this route to get all active businesses
router.post('/', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), createBusiness);
router.get('/owner/:ownerId', getOwnerBusinesses);
router.get('/dashboard/:ownerId', getBusinessDashboard);
router.get('/analytics/dashboard/:ownerId', getDashboardAnalytics);
router.get('/:id', getBusiness);
router.put('/:id', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), updateBusiness);
router.delete('/:id', deleteBusiness);

// Business Workflow
router.post('/:id/validate', validateBusiness);
router.post('/:id/deploy', deployBusiness);
router.patch('/:id/toggle-status', toggleBusinessStatus);

// Analytics
router.get('/:id/analytics', getBusinessAnalytics);
router.get('/:id/bookings', getBusinessBookings);
router.get('/:id/booking-analytics', getBookingAnalytics);

// Advanced Analytics
router.get('/:id/analytics/heatmap', getHeatmapData);
router.get('/:id/analytics/forecast', getRevenueForecast);
router.get('/:id/analytics/loyalty', getCustomerLoyalty);

// Operations & Staff Management
router.get('/:businessId/staff', getBusinessStaff);
router.post('/:businessId/staff', addStaff);
router.put('/staff/:id', updateStaff);
router.delete('/staff/:id', removeStaff);

router.get('/:businessId/shifts', getBusinessShifts);
router.post('/:businessId/shifts', createShift);
router.put('/shifts/:id', updateShift);
router.delete('/shifts/:id', deleteShift);

router.get('/:businessId/table-status', getBusinessTableStatuses);
router.put('/:businessId/table-status/:tableId', updateTableStatus);
router.post('/:businessId/table-status/batch', batchUpdateTableStatus);

// Marketing Engine
router.get('/:businessId/campaigns', getBusinessCampaigns);
router.post('/:businessId/campaigns', createCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/send', sendCampaign);

// Promotion Manager
router.get('/:businessId/promotions', getBusinessPromotions);
router.post('/:businessId/promotions', createPromotion);
router.put('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);
router.post('/promotions/validate', validatePromotion);

// Review Management
router.get('/:businessId/reviews', getBusinessReviews);
router.post('/:businessId/reviews', addReview);
router.put('/reviews/:id', updateReview);
router.post('/reviews/:id/reply', replyToReview);
router.put('/reviews/:id/reply', updateReply);
router.delete('/reviews/:id/reply', deleteReply);
router.delete('/reviews/:id', deleteReview);
router.post('/reviews/:reviewId/like', likeReview);
router.post('/reviews/:reviewId/dislike', dislikeReview);
router.get('/:businessId/rating-stats', getBusinessRatingStats);

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
