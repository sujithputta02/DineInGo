import { Request, Response } from 'express';
import { Staff } from '../models/Staff';
import mongoose from 'mongoose';

/**
 * Get all staff for a business
 */
export const getBusinessStaff = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const staff = await Staff.find({ businessId: new mongoose.Types.ObjectId(businessId) });
        res.json(staff);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Add new staff member to a business
 */
export const addStaff = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { name, email, phone, role, permissions } = req.body;

        const newStaff = new Staff({
            businessId: new mongoose.Types.ObjectId(businessId),
            name,
            email,
            phone,
            role,
            permissions: permissions || []
        });

        await newStaff.save();
        res.status(201).json(newStaff);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Staff with this email already exists in this business' });
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update staff details or role
 */
export const updateStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const staff = await Staff.findByIdAndUpdate(id, updates, { new: true });
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        res.json(staff);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Remove staff from a business
 */
export const removeStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const staff = await Staff.findByIdAndDelete(id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        res.json({ message: 'Staff removed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
