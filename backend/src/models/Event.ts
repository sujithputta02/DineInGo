import mongoose, { Document, Schema } from 'mongoose';

export interface ISeat {
  id: string;
  rowLabel: string;
  number: number;
  status: 'available' | 'selected' | 'booked';
  tier: 'standard' | 'premium' | 'vip';
  price: number;
  bookedBy?: string; // userId
}

export interface ISeatingLayout {
  rows: number;
  columns: number;
  seats: ISeat[];
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  price: number;
  category?: string;
  organizer?: string;
  imageUrl?: string;
  seatingLayout?: ISeatingLayout;
  hasSeating: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema({
  id: { type: String, required: true },
  rowLabel: { type: String, required: true },
  number: { type: Number, required: true },
  status: { type: String, enum: ['available', 'selected', 'booked'], default: 'available' },
  tier: { type: String, enum: ['standard', 'premium', 'vip'], default: 'standard' },
  price: { type: Number, required: true },
  bookedBy: { type: String }
}, { _id: false });

const seatingLayoutSchema = new Schema({
  rows: { type: Number, required: true },
  columns: { type: Number, required: true },
  seats: [seatSchema]
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true, default: 100 },
  registeredCount: { type: Number, default: 0 },
  price: { type: Number, required: true, default: 0 },
  category: { type: String },
  organizer: { type: String },
  imageUrl: { type: String },
  seatingLayout: { type: seatingLayoutSchema },
  hasSeating: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

eventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Event = mongoose.model<IEvent>('Event', eventSchema); 