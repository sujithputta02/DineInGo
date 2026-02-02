import mongoose, { Document, Schema } from 'mongoose';

export interface IUserStats extends Document {
  userId: string;
  cuisinesTried: string[];
  localRestaurantsVisited: string[];
  sustainableChoices: number;
  friendsReferred: string[];
  totalBookings: number;
  totalEvents: number;
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cuisinesTried: [{
    type: String
  }],
  localRestaurantsVisited: [{
    type: String
  }],
  sustainableChoices: {
    type: Number,
    default: 0
  },
  friendsReferred: [{
    type: String
  }],
  totalBookings: {
    type: Number,
    default: 0
  },
  totalEvents: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const UserStats = mongoose.model<IUserStats>('UserStats', UserStatsSchema);