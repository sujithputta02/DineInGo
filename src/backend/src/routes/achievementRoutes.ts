import express from 'express';
import { getUserAchievements, updateUserStats, getUserStats } from '../controllers/achievementController';

const router = express.Router();

// Get user achievements
router.get('/:userId', getUserAchievements);

// Update user stats
router.post('/:userId/stats', updateUserStats);

// Get user stats
router.get('/:userId/stats', getUserStats);

export default router;