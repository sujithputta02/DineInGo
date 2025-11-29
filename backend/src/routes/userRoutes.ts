import express from 'express';
import { 
  createUser, 
  getUser, 
  updateUser, 
  deleteUser, 
  loginUser, 
  logoutUser,
  getUserActivities,
  debugUserActivities
} from '../controllers/userController';
import { User } from '../models/User';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'User API is running' });
});

// Debug endpoints
router.get('/debug/:uid', debugUserActivities);
router.get('/debug', async (req, res) => {
  try {
    const users = await User.find({}, 'uid email displayName activities');
    const usersWithActivityCounts = users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      activityCount: user.activities ? user.activities.length : 0
    }));
    
    res.json({
      totalUsers: users.length,
      users: usersWithActivityCounts,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching all users for debug:', error);
    res.status(500).json({ message: 'Error fetching debug information' });
  }
});

// Custom login route for debugging
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { uid, loginSource = 'email' } = req.body;
    
    if (!uid) {
      console.log('Missing uid in login request');
      return res.status(400).json({ message: 'User ID (uid) is required' });
    }
    
    console.log(`Looking up user with uid: ${uid}`);
    const user = await User.findOne({ uid });
    
    if (!user) {
      console.log(`No user found with uid: ${uid}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Extract request info
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || 
                    req.socket.remoteAddress || 'Unknown IP';
    
    // Create login activity
    const loginActivity = {
      type: 'login' as const,
      timestamp: new Date(),
      deviceInfo,
      ipAddress,
      source: loginSource
    };
    
    console.log('Adding login activity:', loginActivity);
    
    // Update user with login activity
    user.lastLogin = new Date();
    user.activities.push(loginActivity);
    await user.save();
    
    console.log('User updated with login activity');
    res.json(user);
  } catch (error) {
    console.error('Error in custom login route:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Basic CRUD operations
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Profile update endpoint (used by ProfileSettings component)
router.post('/update', async (req, res) => {
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

export default router; 