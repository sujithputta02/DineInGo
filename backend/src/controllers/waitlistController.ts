import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Waitlist } from '../models/Waitlist';
import { Business } from '../models/Business';
import { EarlyAccess } from '../models/EarlyAccess';
import { getIO } from '../utils/socket';

// Join waitlist
export const joinWaitlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            businessId,
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            partySize,
            notes
        } = req.body;

        // Get current position (last position + 1)
        const lastEntry = await Waitlist.findOne({ businessId, status: 'waiting' })
            .sort({ position: -1 });

        const position = lastEntry ? lastEntry.position + 1 : 1;

        // Calculate estimated wait time (15 minutes per position as baseline)
        const estimatedWaitTime = position * 15;

        // Set expiration time (2 hours from now)
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

        const waitlistEntry = new Waitlist({
            businessId,
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            partySize,
            position,
            estimatedWaitTime,
            expiresAt,
            notes
        });

        await waitlistEntry.save();

        // Get business to find ownerId
        const business = await Business.findById(businessId);

        // Emit Socket.io event
        const io = getIO();
        io.to(`business-${businessId}`).emit('waitlist:joined', {
            entry: waitlistEntry
        });

        // Also notify owner's personal room
        if (business && business.ownerId) {
            io.to(`business-${business.ownerId}`).emit('waitlist:joined', {
                entry: waitlistEntry
            });
        }

        res.status(201).json({
            success: true,
            data: waitlistEntry
        });
    } catch (error) {
        console.error('Error joining waitlist:', error);
        res.status(500).json({ success: false, message: 'Error joining waitlist' });
    }
};

// Get waitlist for business
export const getBusinessWaitlist = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;
        const { status } = req.query;

        let query: any = {};

        // Check if businessId is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(businessId)) {
            query.businessId = businessId;
        } else {
            // Assume it's an ownerId (Firebase UID)
            // Find all businesses for this owner
            const businesses = await Business.find({ ownerId: businessId }).select('_id');
            const businessIds = businesses.map(b => b._id);

            if (businessIds.length === 0) {
                res.json({
                    success: true,
                    data: []
                });
                return;
            }

            query.businessId = { $in: businessIds };
        }

        if (status) {
            query.status = status;
        } else {
            query.status = { $in: ['waiting', 'notified'] };
        }

        const waitlist = await Waitlist.find(query)
            .sort({ position: 1 });

        res.json({
            success: true,
            data: waitlist
        });
    } catch (error) {
        console.error('Error fetching waitlist:', error);
        res.status(500).json({ success: false, message: 'Error fetching waitlist' });
    }
};

// Get customer's waitlist status
export const getCustomerWaitlistStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId } = req.params;

        const entry = await Waitlist.findOne({
            customerId,
            status: { $in: ['waiting', 'notified'] }
        })
            .sort({ createdAt: -1 })
            .populate('businessId', 'name location image');

        if (!entry) {
            res.json({
                success: true,
                data: null
            });
            return;
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error fetching customer waitlist status:', error);
        res.status(500).json({ success: false, message: 'Error fetching waitlist status' });
    }
};

// Notify customer (table available)
export const notifyCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { entryId } = req.params;

        const entry = await Waitlist.findByIdAndUpdate(
            entryId,
            {
                status: 'notified',
                notifiedAt: new Date()
            },
            { new: true }
        );

        if (!entry) {
            res.status(404).json({ success: false, message: 'Waitlist entry not found' });
            return;
        }

        // Emit Socket.io event to customer
        const io = getIO();
        io.to(`customer-${entry.customerId}`).emit('waitlist:table-ready', {
            entry
        });

        // Also emit to business
        io.to(`business-${entry.businessId}`).emit('waitlist:customer-notified', {
            entry
        });

        // Also notify owner's personal room
        const business = await Business.findById(entry.businessId);
        if (business && business.ownerId) {
            io.to(`business-${business.ownerId}`).emit('waitlist:customer-notified', {
                entry
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error notifying customer:', error);
        res.status(500).json({ success: false, message: 'Error notifying customer' });
    }
};

// Mark as seated
export const markAsSeated = async (req: Request, res: Response): Promise<void> => {
    try {
        const { entryId } = req.params;

        const entry = await Waitlist.findByIdAndUpdate(
            entryId,
            {
                status: 'seated',
                seatedAt: new Date()
            },
            { new: true }
        );

        if (!entry) {
            res.status(404).json({ success: false, message: 'Waitlist entry not found' });
            return;
        }

        // Update positions for remaining entries
        await updateWaitlistPositions(entry.businessId);

        // Emit Socket.io event
        const io = getIO();
        io.to(`business-${entry.businessId}`).emit('waitlist:seated', {
            entry
        });

        // Also notify owner's personal room
        const business = await Business.findById(entry.businessId);
        if (business && business.ownerId) {
            io.to(`business-${business.ownerId}`).emit('waitlist:seated', {
                entry
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error marking as seated:', error);
        res.status(500).json({ success: false, message: 'Error marking as seated' });
    }
};

// Cancel waitlist entry
export const cancelWaitlistEntry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { entryId } = req.params;

        const entry = await Waitlist.findByIdAndUpdate(
            entryId,
            { status: 'cancelled' },
            { new: true }
        );

        if (!entry) {
            res.status(404).json({ success: false, message: 'Waitlist entry not found' });
            return;
        }

        // Update positions for remaining entries
        await updateWaitlistPositions(entry.businessId);

        // Emit Socket.io event
        const io = getIO();
        io.to(`business-${entry.businessId}`).emit('waitlist:cancelled', {
            entry
        });

        // Also notify owner's personal room
        const business = await Business.findById(entry.businessId);
        if (business && business.ownerId) {
            io.to(`business-${business.ownerId}`).emit('waitlist:cancelled', {
                entry
            });
        }

        res.json({
            success: true,
            message: 'Waitlist entry cancelled'
        });
    } catch (error) {
        console.error('Error cancelling waitlist entry:', error);
        res.status(500).json({ success: false, message: 'Error cancelling waitlist entry' });
    }
};

// Update waitlist positions
async function updateWaitlistPositions(businessId: string): Promise<void> {
    const waitingEntries = await Waitlist.find({
        businessId,
        status: 'waiting'
    }).sort({ position: 1 });

    const bulkOps = waitingEntries.map((entry, index) => ({
        updateOne: {
            filter: { _id: entry._id },
            update: {
                position: index + 1,
                estimatedWaitTime: (index + 1) * 15
            }
        }
    }));

    if (bulkOps.length > 0) {
        await Waitlist.bulkWrite(bulkOps);

        // Emit position updates
        const io = getIO();
        waitingEntries.forEach((entry, index) => {
            io.to(`customer-${entry.customerId}`).emit('waitlist:position-update', {
                position: index + 1,
                estimatedWaitTime: (index + 1) * 15
            });
        });
    }
}

// Auto-expire old entries (to be called by a cron job)
export const expireOldEntries = async (): Promise<void> => {
    try {
        const now = new Date();

        const expiredEntries = await Waitlist.updateMany(
            {
                status: { $in: ['waiting', 'notified'] },
                expiresAt: { $lt: now }
            },
            { status: 'expired' }
        );

        console.log(`Expired ${expiredEntries.modifiedCount} waitlist entries`);
    } catch (error) {
        console.error('Error expiring waitlist entries:', error);
    }
};
// Join early access (landing page)
export const joinEarlyAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, userType } = req.body;

        if (!email || !userType) {
            res.status(400).json({ success: false, message: 'Email and userType are required' });
            return;
        }

        // Check for existing signup
        const existing = await EarlyAccess.findOne({ email, userType });
        if (existing) {
            res.status(200).json({
                success: true,
                message: 'You are already on the list! Dino is guarding your spot.',
                data: existing
            });
            return;
        }

        const entry = new EarlyAccess({ email, userType });
        await entry.save();

        res.status(201).json({
            success: true,
            message: 'Successfully joined early access!',
            data: entry
        });
    } catch (error) {
        console.error('Error joining early access:', error);
        res.status(500).json({ success: false, message: 'Error joining early access' });
    }
};
