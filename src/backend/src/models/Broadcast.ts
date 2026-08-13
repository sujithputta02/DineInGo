import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  targetType: { type: String, enum: ['all', 'users', 'businesses', 'custom'], default: 'all' },
  recipientCount: { type: Number, default: 0 },
  sentBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model('Broadcast', broadcastSchema);
