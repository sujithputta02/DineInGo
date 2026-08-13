import mongoose, { Document, Schema } from 'mongoose';

export interface IPromotion extends Document {
    businessId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    code?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    isActive: boolean;
    startDate?: Date;
    endDate?: Date;
    isHappyHour: boolean;
    happyHourDays: number[]; // 0-6 (Sun-Sat)
    happyHourStart?: string; // HH:mm
    happyHourEnd?: string; // HH:mm
    minOrderValue?: number;
    createdAt: Date;
    updatedAt: Date;
}

const promotionSchema = new Schema<IPromotion>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    code: { type: String, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    isHappyHour: { type: Boolean, default: false },
    happyHourDays: [{ type: Number }],
    happyHourStart: { type: String },
    happyHourEnd: { type: String },
    minOrderValue: { type: Number, default: 0 }
}, {
    timestamps: true
});

export const Promotion = mongoose.model<IPromotion>('Promotion', promotionSchema);
