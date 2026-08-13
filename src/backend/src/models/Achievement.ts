import mongoose, { Document, Schema } from 'mongoose';

export interface IAchievement extends Document {
  userId: string;
  achievementId: string;
  title: string;
  description: string;
  category: 'cuisine' | 'local' | 'sustainable' | 'social';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  points: number;
  unlockedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  achievementId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['cuisine', 'local', 'sustainable', 'social'],
    required: true
  },
  progress: {
    type: Number,
    default: 0
  },
  maxProgress: {
    type: Number,
    required: true
  },
  unlocked: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    required: true
  },
  unlockedDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
AchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export const Achievement = mongoose.model<IAchievement>('Achievement', AchievementSchema);