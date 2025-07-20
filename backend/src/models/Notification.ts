import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  target: { type: String, default: 'all' }, // 'all' or userId
  readBy: [String], // userIds
});

export default mongoose.model('Notification', notificationSchema); 