import mongoose from 'mongoose';

// Notification model specifically for business owners
const businessNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Firebase UID of business owner
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  sentBy: { type: String }, // Admin email who sent it
});

// Compound index for efficient queries
businessNotificationSchema.index({ userId: 1, createdAt: -1 });
businessNotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('BusinessNotification', businessNotificationSchema);
