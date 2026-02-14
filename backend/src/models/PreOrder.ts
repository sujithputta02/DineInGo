import mongoose, { Document, Schema } from 'mongoose';

export interface IPreOrderItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialRequests?: string;
}

export interface IPreOrder extends Document {
    bookingId: any; // Can be string or populated object
    businessId: string;
    customerId: string;
    items: IPreOrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
    specialInstructions?: string;
    prepStartTime?: Date;
    readyTime?: Date;
    servedTime?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PreOrderItemSchema = new Schema({
    menuItemId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    specialRequests: {
        type: String,
        trim: true
    }
}, { _id: false });

const PreOrderSchema = new Schema<IPreOrder>({
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true,
        index: true
    },
    businessId: {
        type: String,
        required: true,
        index: true
    },
    customerId: {
        type: String,
        required: true,
        index: true
    },
    items: [PreOrderItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
        default: 'pending'
    },
    specialInstructions: {
        type: String,
        trim: true
    },
    prepStartTime: {
        type: Date
    },
    readyTime: {
        type: Date
    },
    servedTime: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
PreOrderSchema.index({ businessId: 1, status: 1, createdAt: -1 });
PreOrderSchema.index({ customerId: 1, createdAt: -1 });

export const PreOrder = mongoose.model<IPreOrder>('PreOrder', PreOrderSchema);
