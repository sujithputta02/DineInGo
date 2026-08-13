import mongoose, { Document, Schema } from 'mongoose';

export interface IOwner extends Document {
    uid: string;              // Firebase UID (primary identifier)
    email: string;            // Email address
    displayName: string;      // Owner name
    photoURL?: string;        // Profile photo URL
    authProviders: string[];  // ['password', 'google.com']
    hasPassword: boolean;     // Whether password is set
    createdAt: Date;
    updatedAt: Date;
}

const OwnerSchema = new Schema<IOwner>({
    uid: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    displayName: {
        type: String,
        required: true,
    },
    photoURL: {
        type: String,
    },
    authProviders: {
        type: [String],
        default: [],
        // Possible values: 'password', 'google.com', etc.
    },
    hasPassword: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
OwnerSchema.index({ email: 1 });
OwnerSchema.index({ uid: 1 });

export const Owner = mongoose.model<IOwner>('Owner', OwnerSchema);
