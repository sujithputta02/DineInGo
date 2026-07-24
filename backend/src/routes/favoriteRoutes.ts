import express from 'express';
import { getUserFavorites, toggleFavorite, removeFavorite } from '../controllers/favoriteController';
import { verifyUserToken } from '../middleware/userAuth';
import { Favorite } from '../models/Favorite';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to check if user owns the favorite operations
const verifyUserRouteAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requester = (req as any).user;
  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }
  if (requester.uid !== req.params.userId) {
    return res.status(403).json({ error: 'Access Denied: You can only view your own favorites.' });
  }
  next();
};

const verifyFavoritePost = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requester = (req as any).user;
  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }
  if (requester.uid !== req.body.userId) {
    return res.status(403).json({ error: 'Access Denied: You can only toggle favorites for your own account.' });
  }
  next();
};

const verifyFavoriteDelete = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const favoriteId = req.params.id;
    if (!favoriteId || !mongoose.Types.ObjectId.isValid(favoriteId)) {
      return res.status(400).json({ error: 'Invalid or missing favorite ID.' });
    }

    const favorite = await Favorite.findById(favoriteId);
    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found.' });
    }

    if (favorite.userId !== requester.uid) {
      return res.status(403).json({ error: 'Access Denied: You do not own this favorite.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying favorite delete access:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get user's favorites
router.get('/:userId', verifyUserToken, verifyUserRouteAccess, getUserFavorites);

// Toggle favorite (add or remove)
router.post('/', verifyUserToken, verifyFavoritePost, toggleFavorite);

// Remove favorite by ID
router.delete('/:id', verifyUserToken, verifyFavoriteDelete, removeFavorite);

export default router;
