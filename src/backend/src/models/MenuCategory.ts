import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuCategory extends Document {
    businessId: string;
    name: string;
    description?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>({
    businessId: {
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
        trim: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
MenuCategorySchema.index({ businessId: 1, displayOrder: 1 });

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
