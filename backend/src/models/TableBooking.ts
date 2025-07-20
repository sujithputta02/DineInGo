import mongoose, { Document, Schema } from 'mongoose';

export interface ITableBooking extends Document {
  restaurantId: string;
  tableId: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. '7:00 PM'
  userId: string;
  guests: number;
  status: 'blocked' | 'reserved' | 'cancelled' | 'confirmed';
  createdAt: Date;
  blockedUntil?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  autoConfirmAt?: Date;
}

const tableBookingSchema = new Schema<ITableBooking>({
  restaurantId: { type: String, required: true },
  tableId: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  userId: { type: String, required: true },
  guests: { type: Number, required: true },
  status: { type: String, enum: ['blocked', 'reserved', 'cancelled', 'confirmed'], default: 'blocked' },
  createdAt: { type: Date, default: Date.now },
  blockedUntil: { type: Date },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  autoConfirmAt: { type: Date }
});

export const TableBooking = mongoose.model<ITableBooking>('TableBooking', tableBookingSchema); 