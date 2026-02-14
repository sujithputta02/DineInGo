import { Request, Response } from 'express';
import { PreOrder } from '../models/PreOrder';
import { Booking } from '../models/Booking';
import { getIO } from '../utils/socket';

// Create pre-order
export const createPreOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            bookingId,
            businessId,
            customerId,
            items,
            specialInstructions
        } = req.body;

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: any) =>
            sum + (item.price * item.quantity), 0
        );

        const tax = subtotal * 0.05; // 5% tax
        const total = subtotal + tax;

        const preOrder = new PreOrder({
            bookingId,
            businessId,
            customerId,
            items,
            subtotal,
            tax,
            total,
            specialInstructions
        });

        await preOrder.save();

        // Update booking to indicate it has a pre-order
        await Booking.findByIdAndUpdate(bookingId, {
            hasPreOrder: true,
            preOrderId: preOrder._id
        });

        // Emit Socket.io event to business
        const io = getIO();
        io.to(`business-${businessId}`).emit('preorder:created', {
            preOrder
        });

        res.status(201).json({
            success: true,
            data: preOrder
        });
    } catch (error) {
        console.error('Error creating pre-order:', error);
        res.status(500).json({ success: false, message: 'Error creating pre-order' });
    }
};

// Get pre-orders for business
export const getBusinessPreOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;
        const { status, date } = req.query;

        const query: any = { businessId };

        if (status) {
            query.status = status;
        }

        if (date) {
            const startDate = new Date(date as string);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);

            query.createdAt = {
                $gte: startDate,
                $lt: endDate
            };
        }

        const preOrders = await PreOrder.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('bookingId');

        res.json({
            success: true,
            data: preOrders
        });
    } catch (error) {
        console.error('Error fetching pre-orders:', error);
        res.status(500).json({ success: false, message: 'Error fetching pre-orders' });
    }
};

// Get customer's pre-orders
export const getCustomerPreOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId } = req.params;

        const preOrders = await PreOrder.find({ customerId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('bookingId');

        res.json({
            success: true,
            data: preOrders
        });
    } catch (error) {
        console.error('Error fetching customer pre-orders:', error);
        res.status(500).json({ success: false, message: 'Error fetching customer pre-orders' });
    }
};

// Get pre-order by booking ID
export const getPreOrderByBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookingId } = req.params;

        const preOrder = await PreOrder.findOne({ bookingId });

        if (!preOrder) {
            res.status(404).json({ success: false, message: 'Pre-order not found' });
            return;
        }

        res.json({
            success: true,
            data: preOrder
        });
    } catch (error) {
        console.error('Error fetching pre-order:', error);
        res.status(500).json({ success: false, message: 'Error fetching pre-order' });
    }
};

// Update pre-order status
export const updatePreOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preOrderId } = req.params;
        const { status } = req.body;

        const updateData: any = { status };

        // Set timestamps based on status
        if (status === 'preparing') {
            updateData.prepStartTime = new Date();
        } else if (status === 'ready') {
            updateData.readyTime = new Date();
        } else if (status === 'served') {
            updateData.servedTime = new Date();
        }

        const preOrder = await PreOrder.findByIdAndUpdate(
            preOrderId,
            updateData,
            { new: true }
        );

        if (!preOrder) {
            res.status(404).json({ success: false, message: 'Pre-order not found' });
            return;
        }

        // Emit Socket.io events
        const io = getIO();

        // Notify customer
        io.to(`customer-${preOrder.customerId}`).emit('preorder:status-update', {
            preOrderId,
            status,
            preOrder
        });

        // Notify business
        io.to(`business-${preOrder.businessId}`).emit('preorder:status-update', {
            preOrderId,
            status,
            preOrder
        });

        res.json({
            success: true,
            data: preOrder
        });
    } catch (error) {
        console.error('Error updating pre-order status:', error);
        res.status(500).json({ success: false, message: 'Error updating pre-order status' });
    }
};

// Cancel pre-order
export const cancelPreOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { preOrderId } = req.params;

        const preOrder = await PreOrder.findByIdAndUpdate(
            preOrderId,
            { status: 'cancelled' },
            { new: true }
        );

        if (!preOrder) {
            res.status(404).json({ success: false, message: 'Pre-order not found' });
            return;
        }

        // Update booking
        await Booking.findByIdAndUpdate(preOrder.bookingId, {
            hasPreOrder: false,
            preOrderId: null
        });

        // Emit Socket.io event
        const io = getIO();
        io.to(`business-${preOrder.businessId}`).emit('preorder:cancelled', {
            preOrder
        });

        res.json({
            success: true,
            message: 'Pre-order cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling pre-order:', error);
        res.status(500).json({ success: false, message: 'Error cancelling pre-order' });
    }
};

// Get pre-order analytics
export const getPreOrderAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;
        const { startDate, endDate } = req.query;

        const matchQuery: any = { businessId };

        if (startDate && endDate) {
            matchQuery.createdAt = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        const analytics = await PreOrder.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$total' }
                }
            }
        ]);

        // Get popular items
        const popularItems = await PreOrder.aggregate([
            { $match: matchQuery },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.menuItemId',
                    name: { $first: '$items.name' },
                    totalOrders: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                statusBreakdown: analytics,
                popularItems
            }
        });
    } catch (error) {
        console.error('Error fetching pre-order analytics:', error);
        res.status(500).json({ success: false, message: 'Error fetching pre-order analytics' });
    }
};
