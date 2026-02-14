import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
    businessId: mongoose.Types.ObjectId;
    staffId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    role: string; // Role for this specific shift
    section?: string; // Assigned section of the floor plan
    assignedTables: string[]; // Array of table IDs
    notes?: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}

const shiftSchema = new Schema<IShift>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    role: { type: String, required: true },
    section: { type: String },
    assignedTables: [{ type: String }],
    notes: { type: String },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'cancelled'],
        default: 'scheduled'
    }
}, {
    timestamps: true
});

// Index for shift lookup by date range
shiftSchema.index({ businessId: 1, startTime: 1, endTime: 1 });

export const Shift = mongoose.model<IShift>('Shift', shiftSchema);
