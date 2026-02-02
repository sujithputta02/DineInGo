import express from 'express';
import { getUserFavorites, toggleFavorite, removeFavorite } from '../controllers/favoriteController';

const router = express.Router();

// Get user's favorites
router.get('/:userId', getUserFavorites);

// Toggle favorite (add or remove)
router.post('/', toggleFavorite);

// Remove favorite by ID
router.delete('/:id', removeFavorite);

export default router;
