import express from 'express';
import Notification from '../models/Notification';

const router = express.Router();

// GET /api/notifications - get all notifications
router.get('/', async (req, res) => {
  try {
    let notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
    // If no notifications exist, insert a default one for testing/demo
    if (notifications.length === 0) {
      const defaultNotification = new Notification({
        title: 'Welcome to DineInGo!',
        message: 'This is your first notification. You will see updates about your bookings, events, or other activities here.',
        target: 'all',
        readBy: []
      });
      await defaultNotification.save();
      notifications = [defaultNotification];
    }
    console.log('Sending notifications to frontend:', notifications); // Debug log
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications - create a notification
router.post('/', async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  try {
    const notification = new Notification({ title, message });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PATCH /api/notifications/:id/read - mark a notification as read for a user
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Add userId to readBy array if not already present
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }
    
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/mark-all-read - mark all notifications as read for a user
router.patch('/mark-all-read', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    const notifications = await Notification.find();
    
    // For each notification, add the userId to readBy if not already present
    const updatePromises = notifications.map(notification => {
      if (!notification.readBy.includes(userId)) {
        notification.readBy.push(userId);
        return notification.save();
      }
      return Promise.resolve();
    });
    
    await Promise.all(updatePromises);
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router; 