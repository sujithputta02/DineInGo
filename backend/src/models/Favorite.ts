import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: string;
  restaurantIds: string[]; // Array of Restaurant IDs
  eventIds: string[];      // Array of Event IDs
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: { type: String, required: true, unique: true },
  restaurantIds: [{ type: String, required: true }],
  eventIds: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

favoriteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema); 