import mongoose from 'mongoose';

// Notification model for all users (both customers and business owners)
const allUserNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Firebase UID
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  sentBy: { type: String }, // Admin email who sent it
});

// Compound index for efficient queries
allUserNotificationSchema.index({ userId: 1, createdAt: -1 });
allUserNotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('AllUserNotification', allUserNotificationSchema);
