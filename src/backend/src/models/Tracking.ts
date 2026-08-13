import mongoose, { Document, Schema } from 'mongoose';

export interface ITracking extends Document {
  userId: string;
  restaurantId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. '7:00 PM'
  action: 'reserve' | 'cancel';
  createdAt: Date;
}

const trackingSchema = new Schema<ITracking>({
  userId: { type: String, required: true },
  restaurantId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  action: { type: String, enum: ['reserve', 'cancel'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Tracking = mongoose.model<ITracking>('Tracking', trackingSchema); 