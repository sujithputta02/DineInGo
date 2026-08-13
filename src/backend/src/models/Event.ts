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

export interface IArea {
  id: string;
  name?: string;
  label?: string;
  capacity: number;
  booked: number;
  price: number;
  tier: 'standard' | 'premium' | 'vip';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ISeatingLayout {
  rows: number;
  columns: number;
  seats: ISeat[];
  areas?: IArea[];
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date; // Kept for backward compatibility
  startDate: Date; // New: Event start date
  endDate: Date; // New: Event end date
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  price: number;
  category?: string;
  organizer?: string;
  imageUrl?: string;
  tickets?: Array<{
    _id?: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    description?: string;
    status: 'active' | 'sold_out' | 'hidden';
  }>;
  addOns?: Array<{
    _id?: string;
    name: string;
    price: number;
    description?: string;
    isRequired: boolean;
    type: 'product' | 'service';
  }>;
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

const areaSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String },
  label: { type: String },
  capacity: { type: Number, required: true },
  booked: { type: Number, default: 0 },
  price: { type: Number, required: true },
  tier: { type: String, enum: ['standard', 'premium', 'vip'], default: 'standard' },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true }
}, { _id: false });

const seatingLayoutSchema = new Schema({
  rows: { type: Number, required: true },
  columns: { type: Number, required: true },
  seats: [seatSchema],
  areas: [areaSchema]
}, { _id: false });

const eventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true }, // Kept for backward compatibility
  startDate: { type: Date, required: true }, // New: Event start date
  endDate: { type: Date, required: true }, // New: Event end date
  time: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true, default: 100 },
  registeredCount: { type: Number, default: 0 },
  price: { type: Number, required: true, default: 0 },
  category: { type: String },
  organizer: { type: String },
  imageUrl: { type: String },
  tickets: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      sold: { type: Number, default: 0 },
      description: { type: String },
      status: { type: String, enum: ['active', 'sold_out', 'hidden'], default: 'active' }
    }
  ],
  addOns: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },
      description: { type: String },
      isRequired: { type: Boolean, default: false },
      type: { type: String, enum: ['product', 'service'], default: 'product' }
    }
  ],
  seatingLayout: { type: seatingLayoutSchema },
  hasSeating: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

eventSchema.pre('save', function (this: IEvent, next) {
  this.updatedAt = new Date();

  // Validate that endDate is not before startDate
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }

  // If startDate is provided but date is not, set date to startDate for backward compatibility
  if (this.startDate && !this.date) {
    this.date = this.startDate;
  }

  // If date is provided but startDate/endDate are not, set them to date for backward compatibility
  if (this.date && !this.startDate) {
    this.startDate = this.date;
  }
  if (this.date && !this.endDate) {
    this.endDate = this.date;
  }

  next();
});

export const Event = mongoose.model<IEvent>('Event', eventSchema); 