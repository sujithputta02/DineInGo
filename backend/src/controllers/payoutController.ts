import { Request, Response } from 'express';
import Payout from '../models/Payout';
import { Booking } from '../models/Booking';
import { Business } from '../models/Business';

const PLATFORM_FEE_RATE = 0.10; // 10%
const PAYOUT_MINIMUM = 1000; // Minimum ₹1000 for payout

// Get all payouts for an owner
export const getOwnerPayouts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerId } = req.params;
        const { status, limit = 50 } = req.query;

        const query: any = { ownerId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const payouts = await Payout.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json({
            success: true,
            data: payouts
        });
    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payouts'
        });
    }
};

// Calculate payout for a period
export const calculatePayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerId, businessId, startDate, endDate } = req.body;

        if (!ownerId || !startDate || !endDate) {
            res.status(400).json({
                success: false,
                message: 'ownerId, startDate, and endDate are required'
            });
            return;
        }

        // Build query for bookings
        const query: any = {
            status: 'confirmed',
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        // If businessId is provided, calculate for specific business
        if (businessId) {
            query.businessId = businessId;
        } else {
            // Get all businesses for the owner
            const businesses = await Business.find({ ownerId }).lean();
            const businessIds = businesses.map(b => b._id.toString());
            query.businessId = { $in: businessIds };
        }

        // Calculate gross revenue from confirmed bookings
        const bookings = await Booking.find(query).lean();
        const grossRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);

        // Calculate platform fee and net payout
        const platformFee = Math.round(grossRevenue * PLATFORM_FEE_RATE);
        const netPayout = grossRevenue - platformFee;

        res.json({
            success: true,
            data: {
                grossRevenue,
                platformFee,
                platformFeeRate: PLATFORM_FEE_RATE,
                netPayout,
                bookingCount: bookings.length,
                period: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                },
                canRequestPayout: netPayout >= PAYOUT_MINIMUM
            }
        });
    } catch (error) {
        console.error('Error calculating payout:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating payout'
        });
    }
};

// Request a payout
export const requestPayout = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            ownerId,
            businessId,
            startDate,
            endDate,
            bankDetails
        } = req.body;

        if (!ownerId || !startDate || !endDate || !bankDetails) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
            return;
        }

        // Validate bank details
        if (!bankDetails.accountHolderName || !bankDetails.accountNumber || !bankDetails.ifscCode) {
            res.status(400).json({
                success: false,
                message: 'Complete bank details are required'
            });
            return;
        }

        // Calculate payout
        const query: any = {
            status: 'confirmed',
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (businessId) {
            query.businessId = businessId;
        } else {
            const businesses = await Business.find({ ownerId }).lean();
            const businessIds = businesses.map(b => b._id.toString());
            query.businessId = { $in: businessIds };
        }

        const bookings = await Booking.find(query).lean();
        const grossRevenue = bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        const platformFee = Math.round(grossRevenue * PLATFORM_FEE_RATE);
        const netPayout = grossRevenue - platformFee;

        // Check minimum payout amount
        if (netPayout < PAYOUT_MINIMUM) {
            res.status(400).json({
                success: false,
                message: `Minimum payout amount is ₹${PAYOUT_MINIMUM}. Current amount: ₹${netPayout}`
            });
            return;
        }

        // Create payout record
        const payout = new Payout({
            ownerId,
            businessId,
            period: {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            },
            grossRevenue,
            platformFee,
            platformFeeRate: PLATFORM_FEE_RATE,
            netPayout,
            status: 'pending',
            bankDetails
        });

        await payout.save();

        res.status(201).json({
            success: true,
            message: 'Payout request submitted successfully',
            data: payout
        });
    } catch (error) {
        console.error('Error requesting payout:', error);
        res.status(500).json({
            success: false,
            message: 'Error requesting payout'
        });
    }
};

// Get payout analytics
export const getPayoutAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ownerId } = req.params;
        const { period = '30d' } = req.query;

        // Calculate date range
        let startDate: Date;
        switch (period) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get all businesses for the owner
        const businesses = await Business.find({ ownerId }).lean();
        const businessIds = businesses.map(b => b._id.toString());

        // Get confirmed bookings
        const bookings = await Booking.find({
            businessId: { $in: businessIds },
            status: 'confirmed',
            date: { $gte: startDate }
        }).lean();

        // Calculate totals
        const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
        const totalFees = Math.round(totalRevenue * PLATFORM_FEE_RATE);
        const totalPayout = totalRevenue - totalFees;

        // Get payout history
        const payouts = await Payout.find({
            ownerId,
            createdAt: { $gte: startDate }
        }).sort({ createdAt: -1 }).lean();

        // Calculate daily revenue
        const dailyRevenue: { [key: string]: number } = {};
        bookings.forEach(booking => {
            const dateKey = booking.date.toISOString().split('T')[0];
            dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (booking.amount || 0);
        });

        const revenueChart = Object.entries(dailyRevenue).map(([date, revenue]) => ({
            date,
            revenue,
            platformFee: Math.round(revenue * PLATFORM_FEE_RATE),
            netPayout: revenue - Math.round(revenue * PLATFORM_FEE_RATE)
        })).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue,
                    totalFees,
                    totalPayout,
                    bookingCount: bookings.length,
                    platformFeeRate: PLATFORM_FEE_RATE
                },
                payouts,
                revenueChart,
                pendingPayout: {
                    amount: totalPayout,
                    canRequest: totalPayout >= PAYOUT_MINIMUM
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payout analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payout analytics'
        });
    }
};

// Update payout status (admin only)
export const updatePayoutStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, transferReference, notes } = req.body;

        const updateData: any = { status };

        if (status === 'completed') {
            updateData.transferDate = new Date();
        }

        if (transferReference) {
            updateData.transferReference = transferReference;
        }

        if (notes) {
            updateData.notes = notes;
        }

        const payout = await Payout.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!payout) {
            res.status(404).json({
                success: false,
                message: 'Payout not found'
            });
            return;
        }

        res.json({
            success: true,
            message: 'Payout status updated',
            data: payout
        });
    } catch (error) {
        console.error('Error updating payout status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payout status'
        });
    }
};
