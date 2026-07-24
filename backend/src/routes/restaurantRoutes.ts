import express from 'express';
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  searchRestaurants
} from '../controllers/restaurantController';
import { verifyUserToken } from '../middleware/userAuth';
import { verifyBusinessOwner } from '../middleware/businessAuth';
import { Restaurant } from '../models/Restaurant';

const router = express.Router();

// Helper middleware for restaurant ownership validation
const verifyRestaurantOwnerAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const restaurantId = req.params.id;
    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is missing.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    const isOwner = restaurant.ownerId === requester.uid;
    
    // Also allow admins
    const { User } = require('../models/User');
    const userDoc = await User.findOne({ uid: requester.uid });
    const isAdmin = userDoc && (userDoc.role === 'admin' || userDoc.isAdmin);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access Denied: You do not own this restaurant.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying restaurant owner access:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all restaurants
router.get('/', getAllRestaurants);

// Search restaurants
router.get('/search', searchRestaurants);

// Get restaurant by ID
router.get('/:id', getRestaurantById);

// Create new restaurant
router.post('/', verifyUserToken, verifyBusinessOwner, createRestaurant);

// Update restaurant
router.put('/:id', verifyUserToken, verifyBusinessOwner, verifyRestaurantOwnerAccess, updateRestaurant);

// Delete restaurant
router.delete('/:id', verifyUserToken, verifyBusinessOwner, verifyRestaurantOwnerAccess, deleteRestaurant);

export default router; 