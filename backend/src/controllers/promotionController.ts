import { Request, Response } from 'express';
import { Promotion } from '../models/Promotion';
import mongoose from 'mongoose';

/**
 * Get all promotions for a business
 */
export const getBusinessPromotions = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const promotions = await Promotion.find({ businessId: new mongoose.Types.ObjectId(businessId) }).sort({ createdAt: -1 });
        res.json(promotions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new promotion or Happy Hour
 */
export const createPromotion = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const data = req.body;

        const promotion = new Promotion({
            ...data,
            businessId: new mongoose.Types.ObjectId(businessId)
        });

        await promotion.save();
        res.status(201).json(promotion);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update promotion details
 */
export const updatePromotion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const promotion = await Promotion.findByIdAndUpdate(id, updates, { new: true });
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }

        res.json(promotion);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete a promotion
 */
export const deletePromotion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const promotion = await Promotion.findByIdAndDelete(id);
        if (!promotion) {
            return res.status(404).json({ message: 'Promotion not found' });
        }
        res.json({ message: 'Promotion deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Validate a promotional code
 */
export const validatePromotion = async (req: Request, res: Response) => {
    try {
        const { businessId, code } = req.body;
        const promotion = await Promotion.findOne({
            businessId: new mongoose.Types.ObjectId(businessId),
            code,
            isActive: true,
            $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: new Date() } }
            ]
        });

        if (!promotion) {
            return res.status(400).json({ message: 'Invalid or expired promotional code' });
        }

        res.json(promotion);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
