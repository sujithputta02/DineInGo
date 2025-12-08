import mongoose, { Document, Schema } from 'mongoose';

export interface IHold extends Document {
    holdId: string;
    slotId: string;
    userId: string;
    qty: number;
    status: 'active' | 'released' | 'converted';
    expiresAt: Date;
    createdAt: Date;
}

const holdSchema = new Schema<IHold>({
    holdId: { type: String, required: true, unique: true },
    slotId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    qty: { type: Number, required: true },
    status: { type: String, enum: ['active', 'released', 'converted'], default: 'active' },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

export const Hold = mongoose.model<IHold>('Hold', holdSchema);
