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
  trackFriendReferral
} from '../controllers/userController';
import { getUserReviews } from '../controllers/reviewController';
import { User } from '../models/User';
// SECURITY: Import rate limiters
import { authLimiter, apiLimiter } from '../middleware/rateLimiter';
import { validateUserRegistration, validateUserLogin, handleValidationErrors } from '../middleware/inputValidation';
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

// SECURITY: Apply rate limiting + account lockout to authentication endpoints
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

// SECURITY: Apply rate limiting and validation to user creation
router.post('/', authLimiter, validateUserRegistration, handleValidationErrors, createUser);
router.get('/:id', apiLimiter, getUser);
router.put('/:id', apiLimiter, updateUser);
router.delete('/:id', apiLimiter, deleteUser);

// Profile update endpoint (used by ProfileSettings component)
router.post('/update', async (req: Request, res: Response) => {
  try {
    console.log('Profile update request received:', req.body);
    const { userId, updates } = req.body;

    if (!userId) {
      console.log('Missing userId in update request');
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!updates) {
      console.log('Missing updates in request');
      return res.status(400).json({ message: 'Updates are required' });
    }

    console.log(`Updating user with uid: ${userId}`);

    // Prepare the update object
    const updateData: any = {
      updatedAt: new Date()
    };

    // Add all provided fields to the update
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
    if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.locationSettings !== undefined) updateData.locationSettings = updates.locationSettings;
    if (updates.avatars !== undefined) updateData.avatars = updates.avatars;
    if (updates.currentAvatar !== undefined) updateData.currentAvatar = updates.currentAvatar;

    // Find and update the user in MongoDB
    const user = await User.findOneAndUpdate(
      { uid: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      console.log(`No user found with uid: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User profile updated successfully in MongoDB');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('profile_updated', {
        uid: userId,
        profile: {
          displayName: user.displayName,
          fullName: user.name,
          name: user.name,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
          currentAvatar: user.currentAvatar || user.photoURL,
          avatarUrl: user.photoURL,
          avatars: user.avatars || [],
          address: user.address
        }
      });
      console.log('Socket.IO event emitted for profile update');
    }

    res.json({
      success: true,
      message: 'Profile updated successfully in MongoDB',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        name: user.name,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        currentAvatar: user.currentAvatar || user.photoURL,
        avatars: user.avatars || [],
        address: user.address,
        locationSettings: user.locationSettings
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// User activity related endpoints
// Original login route - commented out since we're using the custom implementation above
// router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/:id/activities', getUserActivities);
router.get('/:userId/reviews', getUserReviews);

// Friend referral tracking
router.post('/refer-friend', trackFriendReferral);

export default router; 