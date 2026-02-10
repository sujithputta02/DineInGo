import express, { Request, Response } from 'express';
import {
    registerOwner,
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
    upload
} from '../controllers/businessController';
import { getBusinessBookings, getBookingAnalytics } from '../controllers/bookingController';

const router = express.Router();

// Owner Auth (Legacy)
router.post('/register', registerOwner);

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

export default router;
