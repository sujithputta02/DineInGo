import mongoose, { Document, Schema } from 'mongoose';

export interface IEarlyAccess extends Document {
    email: string;
    userType: 'user' | 'business';
    status: 'pending' | 'contacted' | 'converted';
    referralCode?: string;
    referredBy?: string | null;
    referralCount?: number;
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    priorityScore?: number;
    originalPosition?: number;
    joinedAt?: Date;
    lastReferralAt?: Date | null;
    lastEmailStatus?: 'not_sent' | 'sent' | 'delivered' | 'soft_bounce' | 'hard_bounce' | 'failed';
    lastEmailError?: string;
    lastAttemptAt?: Date;
    emailHistory?: Array<{
        subject: string;
        status: string;
        timestamp: Date;
        error?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const earlyAccessSchema = new Schema<IEarlyAccess>({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    userType: {
        type: String,
        enum: ['user', 'business'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'converted'],
        default: 'pending'
    },
    referralCode: {
        type: String,
        trim: true,
        index: true
    },
    referredBy: { type: String, default: null },
    referralCount: { type: Number, default: 0 },
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    priorityScore: { type: Number, default: 0 },
    originalPosition: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
    lastReferralAt: { type: Date, default: null },
    lastEmailStatus: {
        type: String,
        enum: ['not_sent', 'sent', 'delivered', 'soft_bounce', 'hard_bounce', 'failed'],
        default: 'not_sent'
    },
    lastEmailError: String,
    lastAttemptAt: Date,
    emailHistory: [{
        subject: String,
        status: String,
        timestamp: { type: Date, default: Date.now },
        error: String
    }]
}, {
    timestamps: true
});

// Avoid duplicate signups for the same type
earlyAccessSchema.index({ email: 1, userType: 1 }, { unique: true });

export const EarlyAccess = mongoose.model<IEarlyAccess>('EarlyAccess', earlyAccessSchema);
