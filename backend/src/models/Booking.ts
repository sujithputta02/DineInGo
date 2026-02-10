import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  _id: string;
  bookingNumber: string;
  userId: string;
  businessId: string;
  businessType: 'restaurant' | 'event';
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Booking details
  date: Date;
  time: string;
  duration?: number;
  seats: number;
  
  // Seating details
  tableId?: string;
  tableNumber?: string;
  seatNumbers?: string[];
  floorId?: string;
  
  // Event specific
  eventAreaId?: string;
  ticketType?: 'standard' | 'premium' | 'vip';
  
  // Pricing
  amount: number;
  basePrice: number;
  taxes: number;
  discount?: number;
  
  // Status
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  
  // Additional info
  specialRequests?: string;
  notes?: string;
  occasion?: string;
  
  // Review
  rating?: number;
  review?: string;
  reviewDate?: Date;
  
  // Legacy fields for backward compatibility
  restaurantId?: mongoose.Types.ObjectId | string;
  eventId?: mongoose.Types.ObjectId | string;
  guests?: number;
  table?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  specialRequest?: string;
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
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
  bookingNumber: { type: String, unique: true, sparse: true },
  userId: { type: String, required: true, index: true },
  businessId: { type: String, index: true },
  businessType: { type: String, enum: ['restaurant', 'event'] },
  
  // Customer info
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  
  // Booking details
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  duration: Number,
  seats: Number,
  
  // Seating details
  tableId: String,
  tableNumber: String,
  seatNumbers: [String],
  floorId: String,
  
  // Event specific
  eventAreaId: String,
  ticketType: { type: String, enum: ['standard', 'premium', 'vip'] },
  
  // Pricing
  amount: Number,
  basePrice: Number,
  taxes: { type: Number, default: 0 },
  discount: Number,
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'], 
    default: 'pending',
    index: true
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded', 'failed'], 
    default: 'pending',
    index: true
  },
  paymentId: String,
  
  // Additional info
  specialRequests: String,
  notes: String,
  occasion: String,
  
  // Review
  rating: { type: Number, min: 1, max: 5 },
  review: String,
  reviewDate: Date,
  
  // Legacy fields for backward compatibility
  restaurantId: { 
    type: Schema.Types.Mixed,
    ref: 'Restaurant' 
  },
  eventId: { 
    type: Schema.Types.Mixed,
    ref: 'Event' 
  },
  guests: { type: Number },
  table: { type: String },
  fullName: { type: String },
  email: { type: String },
  phoneNumber: { type: String },
  specialRequest: { type: String },
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
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ businessId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ date: 1, time: 1 });

// Generate booking number before saving
bookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingNumber) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNumber = `BK${String(count + 1).padStart(6, '0')}`;
  }
  
  // Backward compatibility mapping
  if (!this.businessId && this.restaurantId) {
    this.businessId = this.restaurantId.toString();
    this.businessType = 'restaurant';
  }
  if (!this.businessId && this.eventId) {
    this.businessId = this.eventId.toString();
    this.businessType = 'event';
  }
  if (!this.customerName && this.fullName) {
    this.customerName = this.fullName;
  }
  if (!this.customerEmail && this.email) {
    this.customerEmail = this.email;
  }
  if (!this.customerPhone && this.phoneNumber) {
    this.customerPhone = this.phoneNumber;
  }
  if (!this.seats && this.guests) {
    this.seats = this.guests;
  }
  if (!this.amount && this.totalAmount) {
    this.amount = this.totalAmount;
  }
  if (!this.specialRequests && this.specialRequest) {
    this.specialRequests = this.specialRequest;
  }
  
  this.updatedAt = new Date();
  next();
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema); 