import mongoose, { Document, Schema } from 'mongoose';

export interface ITableStatus extends Document {
    businessId: mongoose.Types.ObjectId;
    tableId: string; // ID from the FloorPlanDesigner
    status: 'Ready' | 'Occupied' | 'Cleaning' | 'Reserved';
    lastStatusChange: Date;
    currentBookingId?: mongoose.Types.ObjectId;
    assignedStaffId?: mongoose.Types.ObjectId;
    updatedAt: Date;
}

const tableStatusSchema = new Schema<ITableStatus>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    tableId: { type: String, required: true },
    status: {
        type: String,
        enum: ['Ready', 'Occupied', 'Cleaning', 'Reserved'],
        default: 'Ready',
        required: true
    },
    lastStatusChange: { type: Date, default: Date.now },
    currentBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'Staff' }
}, {
    timestamps: true
});

// Ensure unique status record per table in a business
tableStatusSchema.index({ businessId: 1, tableId: 1 }, { unique: true });

export const TableStatus = mongoose.model<ITableStatus>('TableStatus', tableStatusSchema);
