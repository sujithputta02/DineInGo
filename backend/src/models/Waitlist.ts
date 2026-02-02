import mongoose, { Document, Schema } from 'mongoose';

export interface IWaitlist extends Document {
    slotId: string;
    userId: string;
    qty: number;
    createdAt: Date;
    notified: boolean;
}

const waitlistSchema = new Schema<IWaitlist>({
    slotId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    qty: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false }
});

// Index to find earliest waitlist entry
waitlistSchema.index({ slotId: 1, createdAt: 1 });

export const Waitlist = mongoose.model<IWaitlist>('Waitlist', waitlistSchema);
