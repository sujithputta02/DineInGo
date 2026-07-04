import mongoose, { Document, Schema } from 'mongoose';

export interface IBusiness extends Document {
  _id: string;
  ownerId: string;
  name: string;
  location: string;
  locationData?: {
    address: string;
    buildingDetails?: string; // Floor, building number, etc.
    street?: string; // Street/road name
    area?: string; // Area/locality
    city: string;
    state: string;
    country: string;
    pincode?: string;
    latitude: number;
    longitude: number;
  };
  type: 'restaurant' | 'event' | 'both';
  description?: string;
  thumbnail?: string;
  coverImage?: string;
  status: 'active' | 'paused' | 'draft';
  
  // Restaurant specific
  cuisine?: string[];
  menu?: IMenuItem[];
  slotMode?: 'weekly' | 'daily';
  weeklySchedule?: IWeeklySchedule;
  dailySlots?: IDaySlot[];
  
  // Event specific
  eventType?: string;
  duration?: number;
  startDate?: Date;
  endDate?: Date;
  
  // Common
  bookingType: 'seat-based' | 'slot-based';
  timeSlots: ITimeSlot[];
  capacity: number;
  basePrice: number;
  normalCost?: number;
  peakTimeCost?: number;
  
  // Pricing configuration
  tierPricing: {
    standard: { price: number; defaultCapacity: number };
    premium: { price: number; defaultCapacity: number };
    vip: { price: number; defaultCapacity: number };
  };
  
  // Layout data
  floorPlan?: any; // FloorPlanDesigner data
  seatingLayout?: any; // EventSeatingDesigner data
  
  // Stats
  totalBookings: number;
  revenue: number;
  rating: number;
  sentimentScore: number; // Rolling sentiment score [-1.0, 1.0]
  sentimentRating: number; // Sentiment rating mapped to standard star scale [1.0, 5.0]
  utilizationRate: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  available: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isPopular?: boolean;
}

export interface ITimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'lunch' | 'dinner' | 'event';
  available: boolean;
  maxCapacity: number;
}

export interface IWeeklySchedule {
  [key: string]: IDaySchedule;
}

export interface IDaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks?: ITimeBreak[];
}

export interface ITimeBreak {
  startTime: string;
  endTime: string;
  name: string;
}

export interface IDaySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'morning' | 'afternoon' | 'evening' | 'night';
  maxCapacity: number;
  available: boolean;
}

const DaySlotSchema = new Schema<IDaySlot>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  type: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'], required: true },
  maxCapacity: { type: Number, required: true },
  available: { type: Boolean, default: true }
});

const TimeBreakSchema = new Schema<ITimeBreak>({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  name: { type: String, required: true }
});

const DayScheduleSchema = new Schema<IDaySchedule>({
  isOpen: { type: Boolean, required: true },
  openTime: { type: String, required: true },
  closeTime: { type: String, required: true },
  breaks: [TimeBreakSchema]
});

const MenuItemSchema = new Schema<IMenuItem>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  description: String,
  image: String,
  available: { type: Boolean, default: true },
  isVegetarian: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false }
});

const TimeSlotSchema = new Schema<ITimeSlot>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  type: { type: String, enum: ['lunch', 'dinner', 'event'], required: true },
  available: { type: Boolean, default: true },
  maxCapacity: { type: Number, required: true }
});

const BusinessSchema = new Schema<IBusiness>({
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  locationData: {
    address: String,
    buildingDetails: String,
    street: String,
    area: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    latitude: Number,
    longitude: Number
  },
  type: { type: String, enum: ['restaurant', 'event', 'both'], required: true },
  description: String,
  thumbnail: String,
  coverImage: String,
  status: { type: String, enum: ['active', 'paused', 'draft'], default: 'draft' },
  
  // Restaurant specific
  cuisine: [String],
  menu: [MenuItemSchema],
  slotMode: { type: String, enum: ['weekly', 'daily'], default: 'weekly' },
  weeklySchedule: {
    type: Schema.Types.Mixed,
    default: {}
  },
  dailySlots: [DaySlotSchema],
  
  // Event specific
  eventType: String,
  duration: Number,
  startDate: Date,
  endDate: Date,
  
  // Common
  bookingType: { type: String, enum: ['seat-based', 'slot-based'], required: true },
  timeSlots: [TimeSlotSchema],
  capacity: { type: Number, default: 0 },
  basePrice: { type: Number, required: true },
  normalCost: { type: Number, default: 25.00 },
  peakTimeCost: { type: Number, default: 50.00 },
  
  // Pricing configuration
  tierPricing: {
    standard: {
      price: { type: Number, required: true },
      defaultCapacity: { type: Number, required: true }
    },
    premium: {
      price: { type: Number, required: true },
      defaultCapacity: { type: Number, required: true }
    },
    vip: {
      price: { type: Number, required: true },
      defaultCapacity: { type: Number, required: true }
    }
  },
  
  // Layout data
  floorPlan: Schema.Types.Mixed,
  seatingLayout: Schema.Types.Mixed,
  
  // Stats
  totalBookings: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  sentimentScore: { type: Number, default: 0 },
  sentimentRating: { type: Number, default: 4.0 },
  utilizationRate: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Indexes
BusinessSchema.index({ ownerId: 1, status: 1 });
BusinessSchema.index({ type: 1, status: 1 });
BusinessSchema.index({ location: 1 });

// Force delete the model to ensure clean slate
if (mongoose.models.Business) {
  delete mongoose.models.Business;
}

export const Business = mongoose.model<IBusiness>('Business', BusinessSchema);