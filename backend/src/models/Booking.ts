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

  selectedTickets?: Array<{
    ticketId: string;
    name: string;
    price: number;
    quantity: number;
  }>;

  selectedAddOns?: Array<{
    addOnId: string;
    name: string;
    price: number;
    quantity: number;
  }>;

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

  // Pre-order support
  hasPreOrder?: boolean;
  preOrderId?: string;

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

  // New Event Ticketing Fields
  selectedTickets: [
    {
      ticketId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  selectedAddOns: [
    {
      addOnId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],

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

  // Pre-order support
  hasPreOrder: { type: Boolean, default: false },
  preOrderId: { type: String },

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
bookingSchema.pre('save', async function (this: IBooking, next) {
  if (this.isNew && !this.bookingNumber) {
    // Generate a unique booking number: BK + YYMMDD + 4 random digits
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    this.bookingNumber = `BK${datePart}${randomPart}`;

    // Safety check for collisions (extremely unlikely with this format but good practice)
    let exists = await mongoose.model('Booking').findOne({ bookingNumber: this.bookingNumber });
    let attempts = 0;
    while (exists && attempts < 5) {
      const extraRandom = Math.floor(1000 + Math.random() * 9000);
      this.bookingNumber = `BK${datePart}${extraRandom}`;
      exists = await mongoose.model('Booking').findOne({ bookingNumber: this.bookingNumber });
      attempts++;
    }
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