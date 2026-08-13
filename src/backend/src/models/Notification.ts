import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Firebase UID as string
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  target: { type: String, default: 'all' }, // 'all', 'users', 'businesses'
  readBy: [String], // userIds (for backward compatibility)
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1 });

export default mongoose.model('Notification', notificationSchema); 