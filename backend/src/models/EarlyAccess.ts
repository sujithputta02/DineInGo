import mongoose, { Document, Schema } from 'mongoose';

export interface IEarlyAccess extends Document {
    email: string;
    userType: 'user' | 'business';
    status: 'pending' | 'contacted' | 'converted';
    referralCode?: string;
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
    }
}, {
    timestamps: true
});

// Avoid duplicate signups for the same type
earlyAccessSchema.index({ email: 1, userType: 1 }, { unique: true });

export const EarlyAccess = mongoose.model<IEarlyAccess>('EarlyAccess', earlyAccessSchema);
