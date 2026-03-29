import { Request, Response } from 'express';
import { User, IActivity } from '../models/User';
import { UserStats } from '../models/UserStats';
import UserNotification from '../models/UserNotification';
import AllUserNotification from '../models/AllUserNotification';
import { emailService } from '../services/emailService';
import bcrypt from 'bcryptjs';
import authAdmin from '../utils/firebaseAdmin';

// Helper function to extract device and IP info
const extractRequestInfo = (req: Request): { deviceInfo: string; ipAddress: string } => {
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress || 'Unknown IP';
  return { deviceInfo, ipAddress };
};

// Create user (signup)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Incoming user creation request:', req.body);
    const { uid, email, displayName, name, photoURL, emailVerified, referralCode } = req.body;
    if (!uid || !email || !displayName || !name) {
      console.error('Missing required fields:', { uid, email, displayName, name });
      res.status(400).json({ message: 'Missing required fields', fields: { uid, email, displayName, name } });
      return;
    }

    const { deviceInfo, ipAddress } = extractRequestInfo(req);

    // Verify referral code if provided
    let isEarlyAccess = false;
    if (referralCode) {
      const { EarlyAccess } = await import('../models/EarlyAccess');
      const earlyAccessEntry = await EarlyAccess.findOne({ 
        email: email.toLowerCase(),
        referralCode: referralCode.trim().toUpperCase()
      });

      if (earlyAccessEntry) {
        console.log(`✅ Valid referral code used for user: ${email}`);
        isEarlyAccess = true;
        // Mark the early access entry as converted
        earlyAccessEntry.status = 'converted';
        await earlyAccessEntry.save();
      } else {
        console.warn(`⚠️ Invalid or missing referral code provided for ${email}: ${referralCode}`);
        // Optionally fail creation if code is required during beta
        // res.status(403).json({ message: 'Invalid referral code or waitlist entry not found.' });
        // return;
      }
    }

    // Check for existing user by UID first
    let existingUser = await User.findOne({ uid });

    // If not found by UID, check by email
    if (!existingUser) {
      existingUser = await User.findOne({ email });
    }

    if (existingUser) {
      // Update the user with the new UID and info
      // If we found by email but UID is different, this updates the UID to the new one (account linking/merging)
      existingUser.uid = uid;
      existingUser.displayName = displayName;
      existingUser.name = name;
      existingUser.photoURL = photoURL;
      existingUser.emailVerified = emailVerified;
      existingUser.lastLogin = new Date();
      // Apply early access status if a valid code was provided
      if (isEarlyAccess) {
        existingUser.isEarlyAccess = true;
      }
      // Optionally add a login activity
      const activity: IActivity = {
        type: 'login',
        timestamp: new Date(),
        deviceInfo,
        ipAddress
      };
      existingUser.activities.push(activity);
      await existingUser.save();
      res.json(existingUser);
      return;
    }

    // Create new user (signup)
    const signupActivity: IActivity = {
      type: 'signup',
      timestamp: new Date(),
      deviceInfo,
      ipAddress
    };

    const user = new User({
      ...req.body,
      isEarlyAccess,
      lastLogin: new Date(),
      createdAt: new Date(),
      activities: [signupActivity]
    });
    await user.save();

    // Send welcome notification to the new user
    try {
      const welcomeNotification = new AllUserNotification({
        userId: uid,
        title: `Welcome to DineInGo, ${name}! 🎉`,
        message: `Hi ${name}! We're thrilled to have you join our community. Discover amazing restaurants, book tables, attend events, and enjoy exclusive dining experiences. Start exploring now!`,
        type: 'success',
        isRead: false,
        sentBy: 'system',
        createdAt: new Date()
      });
      await welcomeNotification.save();
      console.log(`Welcome notification sent to new user: ${name} (${uid})`);

      // Send welcome email (non-blocking)
      emailService.sendUserWelcomeEmail(email, name).catch((err: any) => 
        console.error('Failed to send user welcome email:', err)
      );

      // Emit real-time notification if socket.io is available
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${uid}`).emit('newNotification', {
          title: welcomeNotification.title,
          message: welcomeNotification.message,
          type: welcomeNotification.type,
          createdAt: welcomeNotification.createdAt
        });
      }
    } catch (notificationError) {
      console.error('Error sending welcome notification:', notificationError);
      // Don't fail user creation if notification fails
    }

    res.status(201).json(user);
  } catch (error: any) {
    // Handle race condition for duplicate key error explicitly
    if (error.code === 11000) {
      console.warn('Duplicate key error caught, attempting retrieval:', error.message);
      try {
        const { uid, email } = req.body;
        const raceUser = await User.findOne({ $or: [{ uid }, { email }] });
        if (raceUser) {
          res.json(raceUser);
          return;
        }
      } catch (innerError) {
        console.error('Error handling race condition:', innerError);
      }
    }
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// User login
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, loginSource = 'email' } = req.body;
    const { deviceInfo, ipAddress } = extractRequestInfo(req);

    const loginActivity: IActivity = {
      type: 'login',
      timestamp: new Date(),
      deviceInfo,
      ipAddress,
      source: loginSource // Track login source (google, email, etc.)
    };

    const user = await User.findOneAndUpdate(
      { uid },
      {
        lastLogin: new Date(),
        $push: { activities: loginActivity }
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// User logout
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, logoutSource = 'manual' } = req.body;
    const { deviceInfo, ipAddress } = extractRequestInfo(req);

    const logoutActivity: IActivity = {
      type: 'logout',
      timestamp: new Date(),
      deviceInfo,
      ipAddress,
      source: logoutSource
    };

    const user = await User.findOneAndUpdate(
      { uid },
      { $push: { activities: logoutActivity } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'User logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
};

// Get user by ID
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ uid: req.params.id });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOneAndUpdate(
      { uid: req.params.id },
      { ...req.body },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOneAndDelete({ uid: req.params.id });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get user activity history
export const getUserActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ uid: req.params.id });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user.activities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ message: 'Error fetching user activities' });
  }
};

// Debug endpoint to check user activities
export const debugUserActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    // Use the static method to check activities
    const activities = await User.checkActivities(uid);

    if (!activities) {
      res.status(404).json({ message: 'User not found or no activities' });
      return;
    }

    // Return activities with additional debug info
    res.json({
      message: 'Debug activities retrieved successfully',
      count: activities.length,
      activities,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug activities:', error);
    res.status(500).json({ message: 'Error fetching debug activities' });
  }
};

// Track friend referral
export const trackFriendReferral = async (req: Request, res: Response): Promise<void> => {
  try {
    const { referrerId, referredUserId } = req.body;

    if (!referrerId || !referredUserId) {
      res.status(400).json({ message: 'Both referrer ID and referred user ID are required' });
      return;
    }

    // Get or create user stats for the referrer
    let userStats = await UserStats.findOne({ userId: referrerId });
    if (!userStats) {
      userStats = new UserStats({
        userId: referrerId,
        cuisinesTried: [],
        localRestaurantsVisited: [],
        sustainableChoices: 0,
        friendsReferred: [],
        totalBookings: 0,
        totalEvents: 0,
        totalPoints: 0
      });
    }

    // Add the referred friend if not already tracked
    if (!userStats.friendsReferred.includes(referredUserId)) {
      userStats.friendsReferred.push(referredUserId);
      await userStats.save();

      res.json({
        success: true,
        message: 'Friend referral tracked successfully',
        totalReferrals: userStats.friendsReferred.length
      });
    } else {
      res.json({
        success: true,
        message: 'Friend already tracked',
        totalReferrals: userStats.friendsReferred.length
      });
    }
  } catch (error) {
    console.error('Error tracking friend referral:', error);
    res.status(500).json({ message: 'Failed to track friend referral' });
  }
};

// Change password for logged-in user
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, currentPassword, newPassword } = req.body;

    if (!uid || !currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    // Find the user
    const user = await User.findOne({ uid });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // If user has no password stored (Google user), they should only change via Google/Firebase
    if (!user.password) {
      res.status(400).json({ 
        success: false, 
        message: 'This account was created with Google. Please use Google settings to change your password.' 
      });
      return;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid current password' });
      return;
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Sync with Firebase Auth using Admin SDK
    if (authAdmin) {
      try {
        await authAdmin.auth().updateUser(uid, {
          password: newPassword
        });
        console.log(`[FirebaseSync] Password updated successfully for UID: ${uid}`);
      } catch (firebaseError: any) {
        console.error(`[FirebaseSync] Failed to update Firebase password for ${uid}:`, firebaseError.message);
        // We will continue since the DB is updated and we can't easily undo the client-side Firebase change
      }
    }

    // Update user password in MongoDB
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Password updated successfully in DineInGo database' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ success: false, message: 'Internal server error during password change' });
  }
};