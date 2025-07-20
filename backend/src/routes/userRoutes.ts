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

// User activity related endpoints
// Original login route - commented out since we're using the custom implementation above
// router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/:id/activities', getUserActivities);

export default router; 