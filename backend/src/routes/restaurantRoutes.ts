import express from 'express';
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  searchRestaurants
} from '../controllers/restaurantController';

const router = express.Router();

// Get all restaurants
router.get('/', getAllRestaurants);

// Search restaurants
router.get('/search', searchRestaurants);

// Get restaurant by ID
router.get('/:id', getRestaurantById);

// Create new restaurant
router.post('/', createRestaurant);

// Update restaurant
router.put('/:id', updateRestaurant);

// Delete restaurant
router.delete('/:id', deleteRestaurant);

export default router; 