import { Request, Response } from 'express';
import POSIntegration from '../models/POSIntegration';
import { Booking } from '../models/Booking';

// Connect POS system
export const connectPOS = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            businessId,
            provider,
            apiKey,
            apiSecret,
            webhookSecret,
            settings
        } = req.body;

        if (!businessId || !provider || !apiKey) {
            res.status(400).json({
                success: false,
                message: 'businessId, provider, and apiKey are required'
            });
            return;
        }

        // Generate webhook URL
        const webhookUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/business/pos/webhook/${businessId}`;

        // Check if integration already exists
        let integration = await POSIntegration.findOne({ businessId });

        if (integration) {
            // Update existing integration
            integration.provider = provider;
            integration.apiKey = apiKey;
            if (apiSecret) integration.apiSecret = apiSecret;
            if (webhookSecret) integration.webhookSecret = webhookSecret;
            integration.webhookUrl = webhookUrl;
            integration.isActive = true;
            if (settings) integration.settings = { ...integration.settings, ...settings };

            await integration.save();
        } else {
            // Create new integration
            integration = new POSIntegration({
                businessId,
                provider,
                apiKey,
                apiSecret,
                webhookUrl,
                webhookSecret,
                isActive: true,
                syncStatus: 'connected',
                settings: settings || {
                    autoSyncOrders: true,
                    syncInterval: 15,
                    mapOrdersToReservations: true
                }
            });

            await integration.save();
        }

        res.status(201).json({
            success: true,
            message: 'POS system connected successfully',
            data: {
                ...integration.toObject(),
                apiKey: '***' + apiKey.slice(-4), // Hide API key
                apiSecret: apiSecret ? '***' : undefined
            }
        });
    } catch (error) {
        console.error('Error connecting POS:', error);
        res.status(500).json({
            success: false,
            message: 'Error connecting POS system'
        });
    }
};

// Get POS integration details
export const getPOSIntegration = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        const integration = await POSIntegration.findOne({ businessId }).lean();

        if (!integration) {
            res.status(404).json({
                success: false,
                message: 'POS integration not found'
            });
            return;
        }

        // Hide sensitive data
        const safeIntegration = {
            ...integration,
            apiKey: '***' + integration.apiKey.slice(-4),
            apiSecret: integration.apiSecret ? '***' : undefined
        };

        res.json({
            success: true,
            data: safeIntegration
        });
    } catch (error) {
        console.error('Error fetching POS integration:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching POS integration'
        });
    }
};

// Sync orders from POS
export const syncOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        const integration = await POSIntegration.findOne({ businessId });

        if (!integration) {
            res.status(404).json({
                success: false,
                message: 'POS integration not found'
            });
            return;
        }

        if (!integration.isActive) {
            res.status(400).json({
                success: false,
                message: 'POS integration is not active'
            });
            return;
        }

        // Update sync status
        integration.lastSync = new Date();
        integration.syncStatus = 'connected';
        await integration.save();

        // In a real implementation, this would:
        // 1. Call the POS API to fetch recent orders
        // 2. Match orders to reservations based on table number, time, etc.
        // 3. Update booking records with order details
        // 4. Calculate revenue from POS data

        res.json({
            success: true,
            message: 'Orders synced successfully',
            data: {
                lastSync: integration.lastSync,
                syncStatus: integration.syncStatus
            }
        });
    } catch (error) {
        console.error('Error syncing orders:', error);

        // Update integration with error
        try {
            await POSIntegration.findOneAndUpdate(
                { businessId: req.params.businessId },
                {
                    syncStatus: 'error',
                    $push: { syncErrors: error instanceof Error ? error.message : 'Unknown error' }
                }
            );
        } catch (updateError) {
            console.error('Error updating sync status:', updateError);
        }

        res.status(500).json({
            success: false,
            message: 'Error syncing orders'
        });
    }
};

// Handle POS webhook
export const handlePOSWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;
        const webhookData = req.body;

        const integration = await POSIntegration.findOne({ businessId });

        if (!integration) {
            res.status(404).json({
                success: false,
                message: 'POS integration not found'
            });
            return;
        }

        // Verify webhook secret if configured
        if (integration.webhookSecret) {
            const signature = req.headers['x-webhook-signature'] as string;
            // In production, verify the signature here
            if (!signature) {
                res.status(401).json({
                    success: false,
                    message: 'Missing webhook signature'
                });
                return;
            }
        }

        // Process webhook data based on provider
        switch (integration.provider) {
            case 'square':
                await processSquareWebhook(webhookData, businessId);
                break;
            case 'toast':
                await processToastWebhook(webhookData, businessId);
                break;
            case 'clover':
                await processCloverWebhook(webhookData, businessId);
                break;
            default:
                await processCustomWebhook(webhookData, businessId);
        }

        // Update last sync
        integration.lastSync = new Date();
        integration.syncStatus = 'connected';
        await integration.save();

        res.json({
            success: true,
            message: 'Webhook processed successfully'
        });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing webhook'
        });
    }
};

// Disconnect POS
export const disconnectPOS = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;

        const integration = await POSIntegration.findOne({ businessId });

        if (!integration) {
            res.status(404).json({
                success: false,
                message: 'POS integration not found'
            });
            return;
        }

        integration.isActive = false;
        integration.syncStatus = 'disconnected';
        await integration.save();

        res.json({
            success: true,
            message: 'POS system disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting POS:', error);
        res.status(500).json({
            success: false,
            message: 'Error disconnecting POS system'
        });
    }
};

// Helper functions for processing webhooks from different providers
async function processSquareWebhook(data: any, businessId: string) {
    // Process Square webhook data
    // Map order to reservation based on table number and time
    console.log('Processing Square webhook for business:', businessId);
}

async function processToastWebhook(data: any, businessId: string) {
    // Process Toast webhook data
    console.log('Processing Toast webhook for business:', businessId);
}

async function processCloverWebhook(data: any, businessId: string) {
    // Process Clover webhook data
    console.log('Processing Clover webhook for business:', businessId);
}

async function processCustomWebhook(data: any, businessId: string) {
    // Process custom POS webhook data
    console.log('Processing custom webhook for business:', businessId);
}
