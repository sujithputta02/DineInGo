import mongoose from 'mongoose';

const notificationStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  targetType: { type: String, enum: ['all', 'users', 'businesses'], required: true },
  notificationType: { type: String, enum: ['info', 'success', 'warning', 'error'], required: true },
  recipientCount: { type: Number, required: true },
  title: { type: String, required: true },
  sentBy: { type: String, required: true }, // Admin email
  createdAt: { type: Date, default: Date.now, index: true }
});

// Indexes for efficient queries
notificationStatsSchema.index({ date: 1, targetType: 1 });
notificationStatsSchema.index({ createdAt: -1 });

export default mongoose.model('NotificationStats', notificationStatsSchema);
