import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  userId: string;
  restaurantId: mongoose.Types.ObjectId | string;
  eventId: mongoose.Types.ObjectId | string;
  date: Date;
  time: string;
  guests: number;
  table?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  occasion?: string;
  specialRequest?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  restaurantName?: string;
  eventName?: string;
  selectedItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  selectedSeats?: string[];
  totalAmount?: number;
}

const bookingSchema = new Schema<IBooking>({
  userId: { type: String, required: true },
  restaurantId: { 
    type: Schema.Types.Mixed, // Changed to Mixed to accept both ObjectId and string
    ref: 'Restaurant' 
  },
  eventId: { 
    type: Schema.Types.Mixed, // Changed to Mixed to accept both ObjectId and string
    ref: 'Event' 
  },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true },
  table: { type: String },
  fullName: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
  occasion: { type: String },
  specialRequest: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  restaurantName: { type: String },
  eventName: { type: String },
  selectedItems: [
    {
      id: { type: String },
      name: { type: String },
      price: { type: Number },
      quantity: { type: Number }
    }
  ],
  selectedSeats: [{ type: String }],
  totalAmount: { type: Number },
});

// Update the updatedAt timestamp before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema); 