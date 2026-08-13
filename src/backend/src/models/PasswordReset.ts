import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordReset extends Document {
    email: string;
    otp: string;
    resetToken?: string;
    expiresAt: Date;
    verified: boolean;
    createdAt: Date;
}

const PasswordResetSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    resetToken: {
        type: String,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }, // TTL index - automatically delete expired documents
    },
    verified: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for faster lookups
PasswordResetSchema.index({ email: 1, otp: 1 });
PasswordResetSchema.index({ email: 1, resetToken: 1 });

export default mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
