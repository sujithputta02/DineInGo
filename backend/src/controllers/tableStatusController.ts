import { Request, Response } from 'express';
import { TableStatus } from '../models/TableStatus';
import { Booking } from '../models/Booking';
import mongoose from 'mongoose';

/**
 * Get all table statuses for a business
 */
export const getBusinessTableStatuses = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;
        const statuses = await TableStatus.find({ businessId: new mongoose.Types.ObjectId(businessId) })
            .populate('currentBookingId');
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
        ).populate('currentBookingId');

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

/**
 * Release an occupied/reserved table early (POS check-out)
 */
export const releaseTable = async (req: Request, res: Response): Promise<any> => {
    try {
        const { businessId, tableId } = req.params;

        // Find the active TableStatus
        const tableStatus = await TableStatus.findOne({
            businessId: new mongoose.Types.ObjectId(businessId),
            tableId
        });

        if (!tableStatus) {
            return res.status(404).json({ message: 'Table status not found' });
        }

        // If there is an active booking, mark it as completed
        if (tableStatus.currentBookingId) {
            await Booking.findByIdAndUpdate(tableStatus.currentBookingId, {
                status: 'completed'
            });
        }

        // Reset the table to Ready
        tableStatus.status = 'Ready';
        tableStatus.currentBookingId = undefined;
        tableStatus.lastStatusChange = new Date();
        await tableStatus.save();

        // Emit real-time update via Socket.io to the business and main rooms
        const io = req.app.get('io');
        if (io) {
            io.to(businessId).emit('tableStatusUpdate', tableStatus);
            io.emit('tableStatusUpdate', tableStatus); // Also broadcast to customer room for instant unblocking
            console.log(`Emitted tableStatusUpdate (released) for table ${tableId} in business ${businessId}`);
        }

        return res.json(tableStatus);
    } catch (error: any) {
        console.error('Error releasing table:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Create an offline walk-in booking for a table (POS Walk-in)
 */
export const createWalkInBooking = async (req: Request, res: Response): Promise<any> => {
    try {
        const { businessId, tableId } = req.params;
        const { customerName, seats, time } = req.body;

        if (!customerName || !seats || !time) {
            return res.status(400).json({ message: 'Missing customerName, seats, or time' });
        }

        // 1. Create a Booking record
        const bookingNumber = 'W' + Math.floor(100000 + Math.random() * 900000);
        const bookingDate = new Date(); // Walk-ins are always today
        
        const booking = new Booking({
            bookingNumber,
            userId: 'offline',
            businessId,
            businessType: 'restaurant',
            customerName,
            customerEmail: 'walkin@dineingo.com',
            customerPhone: '0000000000',
            date: bookingDate,
            time,
            seats: Number(seats),
            tableId,
            tableNumber: tableId,
            status: 'confirmed',
            paymentStatus: 'paid',
            amount: 0,
            basePrice: 0,
            taxes: 0,
            bookingSource: 'offline'
        });
        await booking.save();

        // 2. Update TableStatus to Occupied
        const tableStatus = await TableStatus.findOneAndUpdate(
            { businessId: new mongoose.Types.ObjectId(businessId), tableId },
            {
                status: 'Occupied',
                currentBookingId: booking._id,
                lastStatusChange: new Date()
            },
            { upsert: true, new: true }
        ).populate('currentBookingId');

        // 3. Emit real-time Socket updates
        const io = req.app.get('io');
        if (io) {
            io.to(businessId).emit('tableStatusUpdate', tableStatus);
            io.emit('tableStatusUpdate', tableStatus); // Also broadcast to customer room for instant unblocking
            console.log(`Emitted tableStatusUpdate (walk-in) for table ${tableId} in business ${businessId}`);
        }

        return res.status(201).json(tableStatus);
    } catch (error: any) {
        console.error('Error creating walk-in booking:', error);
        return res.status(500).json({ message: error.message });
    }
};
