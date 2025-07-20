import express from 'express';
import { Favorite } from '../models/Favorite';

const router = express.Router();

// Get user's favorites
router.get('/:userId', async (req, res) => {
  try {
    const favorite = await Favorite.findOne({ userId: req.params.userId });
    res.json(favorite || { userId: req.params.userId, restaurantIds: [], eventIds: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add a restaurant to favorites
router.post('/:userId/restaurant/:restaurantId', async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.params.userId },
      { $addToSet: { restaurantIds: req.params.restaurantId } },
      { upsert: true, new: true }
    );
    res.json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add restaurant to favorites' });
  }
});

// Remove a restaurant from favorites
router.delete('/:userId/restaurant/:restaurantId', async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.params.userId },
      { $pull: { restaurantIds: req.params.restaurantId } },
      { new: true }
    );
    res.json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove restaurant from favorites' });
  }
});

// Add an event to favorites
router.post('/:userId/event/:eventId', async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.params.userId },
      { $addToSet: { eventIds: req.params.eventId } },
      { upsert: true, new: true }
    );
    res.json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add event to favorites' });
  }
});

// Remove an event from favorites
router.delete('/:userId/event/:eventId', async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.params.userId },
      { $pull: { eventIds: req.params.eventId } },
      { new: true }
    );
    res.json(favorite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove event from favorites' });
  }
});

export default router; 