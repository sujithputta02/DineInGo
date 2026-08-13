import { Schema, model, Document } from 'mongoose';

export interface IUserPreference extends Document {
    userId: string;
    cuisines: {
        name: string;
        score: number; // 0-100 based on counts/interactions
    }[];
    dietaryPreferences: string[];
    allergens: string[];
    averageSpend: number;
    interactionHistory: {
        restaurantId: string;
        type: 'view' | 'book' | 'favorite';
        timestamp: Date;
    }[];
    lastMood?: string;
}

const UserPreferenceSchema = new Schema<IUserPreference>({
    userId: { type: String, required: true, unique: true },
    cuisines: [{
        name: { type: String, required: true },
        score: { type: Number, default: 0 }
    }],
    dietaryPreferences: [{ type: String }],
    allergens: [{ type: String }],
    averageSpend: { type: Number, default: 0 },
    interactionHistory: [{
        restaurantId: { type: String, required: true },
        type: { type: String, enum: ['view', 'book', 'favorite'], required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    lastMood: { type: String }
}, { timestamps: true });

export const UserPreference = model<IUserPreference>('UserPreference', UserPreferenceSchema);
