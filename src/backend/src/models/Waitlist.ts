import mongoose, { Document, Schema } from 'mongoose';

// Enhanced waitlist model for restaurant queue management
export interface IWaitlist extends Document {
    businessId: any; // Can be string or populated restaurant object
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    partySize: number;
    status: 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired';
    position: number;
    estimatedWaitTime?: number; // in minutes
    joinedAt: Date;
    notifiedAt?: Date;
    seatedAt?: Date;
    expiresAt: Date;
    notes?: string;

    // Legacy fields for backward compatibility
    slotId?: string;
    userId?: string;
    qty?: number;
    notified?: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>({
    businessId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        index: true
    },
    customerId: {
        type: String,
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    customerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true
    },
    partySize: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['waiting', 'notified', 'seated', 'cancelled', 'expired'],
        default: 'waiting'
    },
    position: {
        type: Number,
        required: true
    },
    estimatedWaitTime: {
        type: Number,
        min: 0
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    notifiedAt: {
        type: Date
    },
    seatedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    notes: {
        type: String,
        trim: true
    },

    // Legacy fields
    slotId: { type: String, index: true },
    userId: { type: String },
    qty: { type: Number },
    notified: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Indexes for efficient querying
waitlistSchema.index({ businessId: 1, status: 1, position: 1 });
waitlistSchema.index({ customerId: 1, status: 1 });
waitlistSchema.index({ expiresAt: 1 }); // For auto-expiration
waitlistSchema.index({ slotId: 1, createdAt: 1 }); // Legacy index

export const Waitlist = mongoose.model<IWaitlist>('Waitlist', waitlistSchema);
