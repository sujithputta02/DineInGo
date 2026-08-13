import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
    businessId: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    image?: string; // Base64 or URL
    dietaryTags: string[]; // e.g., 'vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'
    allergens: string[]; // e.g., 'nuts', 'dairy', 'eggs', 'shellfish'
    isAvailable: boolean;
    preparationTime?: number; // in minutes
    calories?: number;
    spiceLevel?: number; // 0-5
    isPopular: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>({
    businessId: {
        type: String,
        required: true,
        index: true
    },
    categoryId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String
    },
    dietaryTags: [{
        type: String,
        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'kosher', 'keto', 'paleo', 'organic']
    }],
    allergens: [{
        type: String,
        enum: ['nuts', 'peanuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 'fish', 'sesame']
    }],
    isAvailable: {
        type: Boolean,
        default: true
    },
    preparationTime: {
        type: Number,
        min: 0
    },
    calories: {
        type: Number,
        min: 0
    },
    spiceLevel: {
        type: Number,
        min: 0,
        max: 5
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
MenuItemSchema.index({ businessId: 1, categoryId: 1, displayOrder: 1 });
MenuItemSchema.index({ businessId: 1, isAvailable: 1 });
MenuItemSchema.index({ dietaryTags: 1 });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
