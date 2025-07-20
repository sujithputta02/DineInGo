import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isVegetarian?: boolean;
  isPopular?: boolean;
}

export interface ILocation {
  city: string;
  state: string;
  country: string;
}

export interface IRestaurant extends Document {
  restaurantId: string;
  name: string;
  cuisine: string[];
  address: string;
  rating: number;
  image: string;
  location: ILocation;
  priceLevel: number;
  openNow: boolean;
  phoneNumber: string;
  menu: IMenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  isVegetarian: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false }
});

const locationSchema = new Schema<ILocation>({
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true }
});

const restaurantSchema = new Schema<IRestaurant>({
  restaurantId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cuisine: { type: [String], required: true },
  address: { type: String, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  image: { type: String, required: true },
  location: { type: locationSchema, required: true },
  priceLevel: { type: Number, required: true, min: 1, max: 5 },
  openNow: { type: Boolean, default: true },
  phoneNumber: { type: String, required: true },
  menu: [{ type: menuItemSchema, required: true }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

restaurantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Force delete the model to ensure clean slate
if (mongoose.models.Restaurant) {
  delete mongoose.models.Restaurant;
}

// Create new model
const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);

export { Restaurant }; 