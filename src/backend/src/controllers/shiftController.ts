import { Request, Response } from 'express';
import { Shift } from '../models/Shift';
import mongoose from 'mongoose';

/**
 * Get shifts for a business within a date range
 */
export const getBusinessShifts = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { start, end } = req.query;

        const query: any = { businessId: new mongoose.Types.ObjectId(businessId) };

        if (start && end) {
            query.startTime = {
                $gte: new Date(start as string),
                $lte: new Date(end as string)
            };
        }

        const shifts = await Shift.find(query).populate('staffId', 'name role');
        res.json(shifts);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Create a new shift assignment
 */
export const createShift = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { staffId, startTime, endTime, role, section, assignedTables, notes } = req.body;

        const newShift = new Shift({
            businessId: new mongoose.Types.ObjectId(businessId),
            staffId: new mongoose.Types.ObjectId(staffId),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            role,
            section,
            assignedTables: assignedTables || [],
            notes
        });

        await newShift.save();
        res.status(201).json(newShift);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update a shift (e.g., reassign tables or change times)
 */
export const updateShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.startTime) updates.startTime = new Date(updates.startTime);
        if (updates.endTime) updates.endTime = new Date(updates.endTime);

        const shift = await Shift.findByIdAndUpdate(id, updates, { new: true });
        if (!shift) {
            return res.status(404).json({ message: 'Shift not found' });
        }

        res.json(shift);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Delete a shift
 */
export const deleteShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const shift = await Shift.findByIdAndDelete(id);
        if (!shift) {
            return res.status(404).json({ message: 'Shift not found' });
        }
        res.json({ message: 'Shift deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
