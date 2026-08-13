import mongoose, { Document, Schema } from 'mongoose';

export interface IPOSIntegration extends Document {
    businessId: string;
    provider: 'square' | 'toast' | 'clover' | 'custom';
    apiKey: string;
    apiSecret?: string;
    webhookUrl: string;
    webhookSecret?: string;
    isActive: boolean;
    syncStatus: 'connected' | 'disconnected' | 'error';
    lastSync?: Date;
    syncErrors?: string[];
    settings: {
        autoSyncOrders: boolean;
        syncInterval: number; // minutes
        mapOrdersToReservations: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const POSIntegrationSchema = new Schema<IPOSIntegration>(
    {
        businessId: {
            type: String,
            required: true,
            index: true,
            unique: true
        },
        provider: {
            type: String,
            enum: ['square', 'toast', 'clover', 'custom'],
            required: true
        },
        apiKey: {
            type: String,
            required: true
        },
        apiSecret: String,
        webhookUrl: {
            type: String,
            required: true
        },
        webhookSecret: String,
        isActive: {
            type: Boolean,
            default: true
        },
        syncStatus: {
            type: String,
            enum: ['connected', 'disconnected', 'error'],
            default: 'disconnected'
        },
        lastSync: Date,
        syncErrors: [String],
        settings: {
            autoSyncOrders: {
                type: Boolean,
                default: true
            },
            syncInterval: {
                type: Number,
                default: 15 // 15 minutes
            },
            mapOrdersToReservations: {
                type: Boolean,
                default: true
            }
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model<IPOSIntegration>('POSIntegration', POSIntegrationSchema);
