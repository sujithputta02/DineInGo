import mongoose, { Document, Schema } from 'mongoose';

export interface IFoodScan extends Document {
  userId: string;
  foodName: string;
  correctedName?: string;
  confidence: number;
  source: 'sarvam' | 'openrouter' | 'ml' | 'ocr';
  metadata?: any;
  imageData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const FoodScanSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  foodName: {
    type: String,
    required: true
  },
  correctedName: {
    type: String
  },
  confidence: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    enum: ['sarvam', 'openrouter', 'ml', 'ocr'],
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  imageData: {
    type: Buffer // Optimized binary storage for vision training data
  }
}, {
  timestamps: true
});

// Index for self-learning queries (e.g., find most common dishes for a user)
FoodScanSchema.index({ userId: 1, foodName: 1 });

export const FoodScan = mongoose.model<IFoodScan>('FoodScan', FoodScanSchema);
