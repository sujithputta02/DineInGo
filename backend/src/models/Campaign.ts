import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
    businessId: mongoose.Types.ObjectId;
    type: 'email' | 'sms';
    title: string;
    content: string;
    audience: 'all' | 'loyal' | 'new' | 'custom';
    status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
    scheduledAt?: Date;
    sentAt?: Date;
    metrics: {
        sentCount: number;
        openCount: number;
        clickCount: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>({
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    type: { type: String, enum: ['email', 'sms'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    audience: { type: String, enum: ['all', 'loyal', 'new', 'custom'], default: 'all' },
    status: { type: String, enum: ['draft', 'scheduled', 'sent', 'cancelled'], default: 'draft' },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    metrics: {
        sentCount: { type: Number, default: 0 },
        openCount: { type: Number, default: 0 },
        clickCount: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
