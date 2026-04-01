import express, { Request, Response } from 'express';
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  loginUser,
  logoutUser,
  getUserActivities,
  debugUserActivities,
  trackFriendReferral,
  changePassword
} from '../controllers/userController';
import { getUserReviews } from '../controllers/reviewController';
import { User } from '../models/User';

// SECURITY: Import Identity Guard and Rate Limiters
import { verifyUserToken } from '../middleware/userAuth';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter';
import { validateUserRegistration, handleValidationErrors } from '../middleware/inputValidation';
import { accountLockoutCheck } from '../middleware/accountLockout';
import { recordFailedAttempt, resetFailedAttempts } from '../services/securityMonitor';

const router = express.Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'User API is running' });
});

// 🔒 Debug endpoints restricted to development only
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/:uid', debugUserActivities);
  router.get('/debug', async (req: Request, res: Response) => {
    try {
      const users = await User.find({}, 'uid email displayName activities');
      res.json({ totalUsers: users.length, serverTime: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching debug information' });
    }
  });
}

// ============================================
// PUBLIC ROUTES
// ============================================

// SECURITY: User Registration (Self-Signup)
router.post('/', authLimiter, validateUserRegistration, handleValidationErrors, createUser);

// SECURITY: Authentication (Login)
router.post('/login', authLimiter, accountLockoutCheck('user'), async (req: Request, res: Response) => {
  try {
    const { uid, email, loginSource = 'email' } = req.body;

    if (!uid) {
      if (email) await recordFailedAttempt(email, 'user', req.ip || 'unknown', req.path);
      return res.status(400).json({ message: 'User ID (uid) is required' });
    }

    const user = await User.findOne({ uid });

    if (!user) {
      if (email) await recordFailedAttempt(email, 'user', req.ip || 'unknown', req.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Successful login — reset failed attempts
    if (email) await resetFailedAttempts(email, 'user');

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress || 'Unknown IP';

    const loginActivity = {
      type: 'login' as const,
      timestamp: new Date(),
      deviceInfo,
      ipAddress,
      source: loginSource
    };

    user.lastLogin = new Date();
    user.activities.push(loginActivity);
    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// ============================================
// PROTECTED ROUTES (Identity Verification Required)
// ============================================

// Profile management
router.get('/:id', apiLimiter, verifyUserToken, getUser);
router.put('/:id', apiLimiter, verifyUserToken, updateUser);
router.delete('/:id', apiLimiter, verifyUserToken, deleteUser);

// Activity and Social
router.get('/:id/activities', apiLimiter, verifyUserToken, getUserActivities);
router.get('/:userId/reviews', apiLimiter, verifyUserToken, getUserReviews);
router.post('/refer-friend', apiLimiter, verifyUserToken, trackFriendReferral);

// Security
router.post('/change-password', authLimiter, verifyUserToken, changePassword);
router.post('/logout', verifyUserToken, logoutUser);

export default router;