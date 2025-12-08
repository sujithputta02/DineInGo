import mongoose, { Document, Schema } from 'mongoose';

export interface ISlot extends Document {
    slotId: string;
    resourceId: string;
    type: 'restaurant' | 'event';
    startTime: Date;
    endTime?: Date;
    capacity: number;
    reserved: number;
    heldCount: number;
    confirmedCount: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const slotSchema = new Schema<ISlot>({
    slotId: { type: String, required: true, unique: true },
    resourceId: { type: String, required: true },
    type: { type: String, enum: ['restaurant', 'event'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    capacity: { type: Number, required: true },
    reserved: { type: Number, default: 0 },
    heldCount: { type: Number, default: 0 },
    confirmedCount: { type: Number, default: 0 },
    version: { type: Number, default: 0 }
}, {
    timestamps: true,
    optimisticConcurrency: true
});

// Compound index for efficient lookup
slotSchema.index({ resourceId: 1, startTime: 1 });

export const Slot = mongoose.model<ISlot>('Slot', slotSchema);
