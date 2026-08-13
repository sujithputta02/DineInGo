import mongoose, { Document, Schema } from 'mongoose';

export interface IPayout extends Document {
    ownerId: string;
    businessId?: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    grossRevenue: number;
    platformFee: number;
    platformFeeRate: number;
    netPayout: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    bankDetails?: {
        accountHolderName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
    };
    transferDate?: Date;
    transferReference?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
    {
        ownerId: {
            type: String,
            required: true,
            index: true
        },
        businessId: {
            type: String,
            index: true
        },
        period: {
            startDate: {
                type: Date,
                required: true
            },
            endDate: {
                type: Date,
                required: true
            }
        },
        grossRevenue: {
            type: Number,
            required: true,
            min: 0
        },
        platformFee: {
            type: Number,
            required: true,
            min: 0
        },
        platformFeeRate: {
            type: Number,
            required: true,
            default: 0.10 // 10%
        },
        netPayout: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        bankDetails: {
            accountHolderName: String,
            accountNumber: String,
            ifscCode: String,
            bankName: String
        },
        transferDate: Date,
        transferReference: String,
        notes: String
    },
    {
        timestamps: true
    }
);

// Index for efficient queries
PayoutSchema.index({ ownerId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPayout>('Payout', PayoutSchema);
