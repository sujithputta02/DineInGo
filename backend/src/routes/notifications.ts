import express, { Request, Response } from 'express';
import Notification from '../models/Notification';
import UserNotification from '../models/UserNotification';
import BusinessNotification from '../models/BusinessNotification';
import AllUserNotification from '../models/AllUserNotification';
import { User } from '../models/User';

const router = express.Router();

// GET /api/notifications - get notifications for a specific user from all three collections
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`Fetching notifications for user: ${userId}`);

    // Determine user role to know which collections to query
    const user = await User.findOne({ uid: userId });
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.json([]);
    }

    console.log(`User role: ${user.role}`);

    let notifications: any[] = [];

    // Always fetch from AllUserNotification (sent to everyone)
    const allUserNotifications = await AllUserNotification.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    console.log(`Found ${allUserNotifications.length} notifications in AllUserNotification`);
    notifications = [...allUserNotifications];

    // Fetch from role-specific collection
    if (user.role === 'customer') {
      const userNotifications = await UserNotification.find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      console.log(`Found ${userNotifications.length} notifications in UserNotification`);
      notifications = [...notifications, ...userNotifications];
    } else if (user.role === 'owner') {
      const businessNotifications = await BusinessNotification.find({ userId: userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      console.log(`Found ${businessNotifications.length} notifications in BusinessNotification`);
      notifications = [...notifications, ...businessNotifications];
    }

    // Sort all notifications by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Limit to 50 most recent
    notifications = notifications.slice(0, 50);

    console.log(`Total notifications for user ${userId}: ${notifications.length}`);
    
    // Ensure all notifications have the required fields
    const transformedNotifications = notifications.map(notification => ({
      ...notification,
      type: notification.type || 'info',
      isRead: notification.isRead || false
    }));
    
    res.json(transformedNotifications);

  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications - create a notification (for testing)
router.post('/', async (req: Request, res: Response) => {
  const { userId, title, message, type = 'info', targetType = 'all' } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  
  try {
    // Determine which collection to use based on targetType
    let NotificationModel;
    if (targetType === 'users') {
      NotificationModel = UserNotification;
    } else if (targetType === 'businesses') {
      NotificationModel = BusinessNotification;
    } else {
      NotificationModel = AllUserNotification;
    }

    const notification = new NotificationModel({ 
      userId,
      title, 
      message,
      type,
      isRead: false
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PATCH /api/notifications/:id/read - mark a notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    console.log(`Marking notification ${id} as read for user ${userId}`);

    // Try to find and update in all three collections
    let notification = await AllUserNotification.findById(id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      console.log(`Marked notification ${id} as read in AllUserNotification`);
      return res.json({ success: true, notification });
    }

    notification = await UserNotification.findById(id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      console.log(`Marked notification ${id} as read in UserNotification`);
      return res.json({ success: true, notification });
    }

    notification = await BusinessNotification.findById(id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      console.log(`Marked notification ${id} as read in BusinessNotification`);
      return res.json({ success: true, notification });
    }

    // If not found in any collection, return 404
    console.log(`Notification ${id} not found in any collection`);
    return res.status(404).json({ error: 'Notification not found' });

  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/mark-all-read - mark all notifications as read for a user
router.patch('/mark-all-read', async (req: Request, res: Response) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    console.log(`Marking all notifications as read for user ${userId}`);

    // Get user role to determine which collections to update
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update AllUserNotification (everyone gets these)
    const allUserResult = await AllUserNotification.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true } }
    );
    console.log(`Marked ${allUserResult.modifiedCount} notifications as read in AllUserNotification`);

    // Update role-specific collection
    let roleSpecificResult: any = { modifiedCount: 0 };
    if (user.role === 'customer') {
      roleSpecificResult = await UserNotification.updateMany(
        { userId: userId, isRead: false },
        { $set: { isRead: true } }
      );
      console.log(`Marked ${roleSpecificResult.modifiedCount} notifications as read in UserNotification`);
    } else if (user.role === 'owner') {
      roleSpecificResult = await BusinessNotification.updateMany(
        { userId: userId, isRead: false },
        { $set: { isRead: true } }
      );
      console.log(`Marked ${roleSpecificResult.modifiedCount} notifications as read in BusinessNotification`);
    }

    const totalMarked = allUserResult.modifiedCount + roleSpecificResult.modifiedCount;
    
    res.json({ 
      success: true, 
      message: `Marked ${totalMarked} notifications as read`,
      count: totalMarked
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// GET /api/notifications/unread-count - get unread notification count for a user
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user role
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.json({ count: 0 });
    }

    // Count unread from AllUserNotification
    const allUserCount = await AllUserNotification.countDocuments({ 
      userId: userId,
      isRead: false 
    });

    // Count unread from role-specific collection
    let roleSpecificCount = 0;
    if (user.role === 'customer') {
      roleSpecificCount = await UserNotification.countDocuments({ 
        userId: userId,
        isRead: false 
      });
    } else if (user.role === 'owner') {
      roleSpecificCount = await BusinessNotification.countDocuments({ 
        userId: userId,
        isRead: false 
      });
    }

    const totalCount = allUserCount + roleSpecificCount;
    
    res.json({ count: totalCount });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
