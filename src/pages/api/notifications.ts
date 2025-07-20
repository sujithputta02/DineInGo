import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../config/test-mongo-connection.cjs';
import Notification from '../../models/Notification';
import User from '../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Assume req.user is populated by auth middleware
  const user = req.user;

  if (req.method === 'GET') {
    // Return all notifications (for all users)
    const notifications = await Notification.find({ target: { $in: ['all', user?.uid] } }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  }

  if (req.method === 'POST') {
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, message, target = 'all' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    const notification = new Notification({ title, message, target });
    await notification.save();
    return res.status(201).json(notification);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 