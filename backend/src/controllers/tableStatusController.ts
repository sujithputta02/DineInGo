import { Request, Response } from 'express';
import { TableStatus } from '../models/TableStatus';
import mongoose from 'mongoose';

/**
 * Get all table statuses for a business
 */
export const getBusinessTableStatuses = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const statuses = await TableStatus.find({ businessId: new mongoose.Types.ObjectId(businessId) });
        res.json(statuses);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update table status and emit socket event
 */
export const updateTableStatus = async (req: Request, res: Response) => {
    try {
        const { businessId, tableId } = req.params;
        const { status, currentBookingId, assignedStaffId } = req.body;

        const tableStatus = await TableStatus.findOneAndUpdate(
            { businessId: new mongoose.Types.ObjectId(businessId), tableId },
            {
                status,
                currentBookingId: currentBookingId ? new mongoose.Types.ObjectId(currentBookingId) : undefined,
                assignedStaffId: assignedStaffId ? new mongoose.Types.ObjectId(assignedStaffId) : undefined,
                lastStatusChange: new Date()
            },
            { upsert: true, new: true }
        );

        // Emit real-time update via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(businessId).emit('tableStatusUpdate', tableStatus);
            console.log(`Emitted tableStatusUpdate for table ${tableId} in business ${businessId}`);
        }

        res.json(tableStatus);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Batch update table statuses (useful for initialization or floor reset)
 */
export const batchUpdateTableStatus = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const { updates } = req.body; // Array of { tableId, status }

        const results = [];
        for (const update of updates) {
            const result = await TableStatus.findOneAndUpdate(
                { businessId: new mongoose.Types.ObjectId(businessId), tableId: update.tableId },
                { status: update.status, lastStatusChange: new Date() },
                { upsert: true, new: true }
            );
            results.push(result);
        }

        const io = req.app.get('io');
        if (io) {
            io.to(businessId).emit('batchTableStatusUpdate', { businessId, updates: results });
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
