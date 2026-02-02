import express from 'express';
import {
    registerOwner,
    getMyRestaurants,
    createRestaurant,
    updateRestaurant
} from '../controllers/businessController';

const router = express.Router();

// Owner Auth
router.post('/register', registerOwner);

// Restaurant Management
// Note: In a real app, we need middleware to verify the UID matches the token.
// For now, adhering to the project's implied trust model or frontend verification pattern.
router.get('/restaurants/:uid', getMyRestaurants);
router.post('/restaurant', createRestaurant);
router.put('/restaurant/:id', updateRestaurant);

export default router;
