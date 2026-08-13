import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign';
import mongoose from 'mongoose';

/**
 * Get all campaigns for a business
 */
export const getBusinessCampaigns = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const campaigns = await Campaign.find({ businessId: new mongoose.Types.ObjectId(businessId) }).sort({ createdAt: -1 });
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new marketing campaign
 */
export const createCampaign = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { type, title, content, audience, scheduledAt } = req.body;

        const campaign = new Campaign({
            businessId: new mongoose.Types.ObjectId(businessId),
            type,
            title,
            content,
            audience,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
            status: scheduledAt ? 'scheduled' : 'draft'
        });

        await campaign.save();
        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update an existing campaign
 */
export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const campaign = await Campaign.findByIdAndUpdate(id, updates, { new: true });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete a campaign
 */
export const deleteCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByIdAndDelete(id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Simulate sending a campaign
 */
export const sendCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Simulate sending logic
        campaign.status = 'sent';
        campaign.sentAt = new Date();
        // Simulate some initial metrics
        campaign.metrics.sentCount = 150; // In real app, this would be based on audience size

        await campaign.save();
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
