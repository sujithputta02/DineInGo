import { Request, Response } from 'express';
import { User, IActivity } from '../models/User';

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
    const { uid, email, displayName, name, photoURL, emailVerified } = req.body;
    if (!uid || !email || !displayName || !name) {
      console.error('Missing required fields:', { uid, email, displayName, name });
      res.status(400).json({ message: 'Missing required fields', fields: { uid, email, displayName, name } });
      return;
    }
    const { deviceInfo, ipAddress } = extractRequestInfo(req);

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
      lastLogin: new Date(),
      createdAt: new Date(),
      activities: [signupActivity]
    });
    await user.save();
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