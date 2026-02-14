import mongoose, { Document, Schema } from 'mongoose';

export interface IStaff extends Document {
    businessId: mongoose.Types.ObjectId;
    userId?: string; // Optional link to User uid if they have a portal account
    name: string;
    email: string;
    phone?: string;
    role: 'Manager' | 'Host' | 'Waiter';
    status: 'active' | 'inactive';
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
}

const staffSchema = new Schema<IStaff>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    userId: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    role: {
        type: String,
        enum: ['Manager', 'Host', 'Waiter'],
        default: 'Waiter',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    permissions: [{ type: String }]
}, {
    timestamps: true
});

// Compound index for uniqueness within a business
staffSchema.index({ businessId: 1, email: 1 }, { unique: true });

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
