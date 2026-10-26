import mongoose, { Document, Schema } from 'mongoose';

export type NutritionProvenance = 
  | 'verified-restaurant' 
  | 'usda-database' 
  | 'recipe-calculated' 
  | 'ai-estimated' 
  | 'fallback-estimate';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface INutritionSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface IFoodDiaryEntry extends Document {
  userId: string;
  dishName: string;
  mealType: MealType;
  date: Date;
  portionMultiplier: number;
  baseNutrition: INutritionSnapshot;
  calculatedNutrition: INutritionSnapshot;
  provenance: NutritionProvenance;
  confidence: number;
  sourceNotes?: string;
  imageSnapshot?: string;
  notes?: string;
  restaurantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NutritionSnapshotSchema = new Schema({
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },
  fiber: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  sodium: { type: Number, default: 0 }
}, { _id: false });

const FoodDiaryEntrySchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  dishName: {
    type: String,
    required: true,
    trim: true
  },
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'lunch',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  portionMultiplier: {
    type: Number,
    required: true,
    default: 1.0,
    min: 0.1,
    max: 10.0
  },
  baseNutrition: {
    type: NutritionSnapshotSchema,
    required: true
  },
  calculatedNutrition: {
    type: NutritionSnapshotSchema,
    required: true
  },
  provenance: {
    type: String,
    enum: ['verified-restaurant', 'usda-database', 'recipe-calculated', 'ai-estimated', 'fallback-estimate'],
    required: true
  },
  confidence: {
    type: Number,
    default: 0.85,
    min: 0,
    max: 1
  },
  sourceNotes: {
    type: String
  },
  imageSnapshot: {
    type: String
  },
  notes: {
    type: String
  },
  restaurantId: {
    type: String
  }
}, {
  timestamps: true
});

// Composite index for fast daily diary lookups and avoiding duplicates
FoodDiaryEntrySchema.index({ userId: 1, date: -1 });
FoodDiaryEntrySchema.index({ userId: 1, dishName: 1, mealType: 1, date: 1 });

export const FoodDiaryEntry = mongoose.model<IFoodDiaryEntry>('FoodDiaryEntry', FoodDiaryEntrySchema);
