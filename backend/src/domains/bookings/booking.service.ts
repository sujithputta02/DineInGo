import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { Booking, TableBooking, IBooking, ITableBooking } from './booking.model';
import { getIO } from '../../utils/socket';
import {
  getDynamicTableFee,
  createBooking as controllerCreateBooking,
  getUserBookings as controllerGetUserBookings,
  getBooking as controllerGetBooking,
  updateBooking as controllerUpdateBooking,
  cancelBooking as controllerCancelBooking,
  confirmBooking as controllerConfirmBooking,
  checkInBooking as controllerCheckInBooking,
  deleteBooking as controllerDeleteBooking,
  getBusinessBookings as controllerGetBusinessBookings,
  getBookingAnalytics as controllerGetBookingAnalytics,
  getDynamicTableFeeController as controllerGetDynamicTableFee
} from '../../controllers/bookingController';

/**
 * Domain Service for Bookings
 * Encapsulates core business rules:
 * - Table availability & double-booking prevention
 * - Dynamic table fee calculation
 * - Table blocking / holding rules (5-min expiry)
 * - Cancellation & status cascade rules
 * - Safe fallback to existing battle-tested controllers
 */
export class BookingService {
  /**
   * Check if a table is currently occupied/reserved/blocked
   */
  async checkTableAvailability(
    restaurantId: string,
    tableId: string,
    date: string,
    time: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; existingBooking?: ITableBooking | null }> {
    const existing = await TableBooking.findOne({
      restaurantId,
      tableId,
      date,
      time,
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });

    if (existing && (!excludeUserId || existing.userId !== excludeUserId)) {
      return { available: false, existingBooking: existing };
    }
    return { available: true, existingBooking: existing };
  }

  /**
   * Calculate dynamic table fee based on occupancy and peak hours
   */
  async calculateDynamicFee(restaurantId: string, date: string, time: string) {
    return await getDynamicTableFee(restaurantId, date, time);
  }

  /**
   * Block table temporarily with auto-confirm timer (5 minutes)
   */
  async blockTableSlot(params: {
    restaurantId: string;
    tableId: string;
    date: string;
    time: string;
    userId: string;
    guests: number;
  }) {
    const { restaurantId, tableId, date, time, userId, guests } = params;

    // Check availability
    const { available } = await this.checkTableAvailability(restaurantId, tableId, date, time, userId);
    if (!available) {
      throw new Error('Table is already reserved or blocked by another user');
    }

    const now = new Date();
    const autoConfirmAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const booking = await TableBooking.findOneAndUpdate(
      { restaurantId, tableId, date, time },
      {
        userId,
        guests,
        status: 'blocked',
        createdAt: now,
        autoConfirmAt
      },
      { upsert: true, new: true }
    );

    // Update TableStatus
    try {
      const { TableStatus } = require('../../models/TableStatus');
      await TableStatus.findOneAndUpdate(
        {
          businessId: new mongoose.Types.ObjectId(restaurantId),
          tableId: tableId
        },
        {
          status: 'Reserved',
          currentBookingId: booking._id,
          lastStatusChange: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (statusError) {
      console.error('Error updating table status during block:', statusError);
    }

    // Emit Socket.IO event
    const io = getIO();
    if (io) {
      io.to(restaurantId).emit('tableBlocked', {
        tableId,
        date,
        time,
        userId,
        status: 'blocked',
        autoConfirmAt,
        booking
      });
    }

    return booking;
  }

  /**
   * Confirm a blocked table
   */
  async confirmTableSlot(params: {
    restaurantId: string;
    tableId: string;
    date: string;
    time: string;
    userId: string;
  }) {
    const { restaurantId, tableId, date, time, userId } = params;
    const now = new Date();

    const booking = await TableBooking.findOneAndUpdate(
      { restaurantId, tableId, date, time, userId },
      {
        status: 'confirmed',
        confirmedAt: now,
        $unset: { blockedUntil: 1, autoConfirmAt: 1 }
      },
      { new: true }
    );

    if (!booking) {
      throw new Error('Booking not found or not owned by user');
    }

    // Update TableStatus
    try {
      const { TableStatus } = require('../../models/TableStatus');
      await TableStatus.findOneAndUpdate(
        {
          businessId: new mongoose.Types.ObjectId(restaurantId),
          tableId: tableId
        },
        {
          status: 'Occupied',
          currentBookingId: booking._id,
          lastStatusChange: now
        },
        { upsert: true, new: true }
      );
    } catch (statusError) {
      console.error('Error updating table status during confirm:', statusError);
    }

    // Emit Socket.IO event
    const io = getIO();
    if (io) {
      io.to(restaurantId).emit('tableConfirmed', {
        tableId,
        date,
        time,
        userId,
        status: 'confirmed',
        booking
      });
    }

    return booking;
  }

  /**
   * Cancel a table slot with multi-field matching & TableStatus reset
   */
  async cancelTableSlot(params: {
    restaurantId?: string;
    businessId?: string;
    tableId?: string;
    tableNumber?: string;
    table?: string;
    date?: string;
    time?: string;
    userId: string;
  }) {
    const targetTableId = params.tableId || params.tableNumber || params.table;
    const targetRestaurantId = params.restaurantId || params.businessId;

    if (!targetTableId || !targetRestaurantId) {
      throw new Error('Missing table identifier or restaurant identifier');
    }

    const filter: any = {
      $or: [
        { restaurantId: targetRestaurantId },
        { businessId: targetRestaurantId }
      ],
      $and: [
        {
          $or: [
            { tableId: targetTableId },
            { tableNumber: targetTableId },
            { table: targetTableId }
          ]
        },
        { userId: params.userId }
      ]
    };

    if (params.date) filter.date = params.date;
    if (params.time) filter.time = params.time;

    const result = await TableBooking.updateMany(filter, {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date()
      },
      $unset: {
        blockedUntil: 1,
        autoConfirmAt: 1
      }
    });

    // Reset TableStatus to Ready
    let tableStatus = null;
    try {
      const { TableStatus } = require('../../models/TableStatus');
      tableStatus = await TableStatus.findOneAndUpdate(
        {
          businessId: new mongoose.Types.ObjectId(targetRestaurantId),
          tableId: targetTableId
        },
        {
          $set: {
            status: 'Ready',
            lastStatusChange: new Date()
          },
          $unset: {
            currentBookingId: 1
          }
        },
        { new: true }
      );
    } catch (statusError) {
      console.error('Error resetting TableStatus:', statusError);
    }

    // Emit socket event
    const io = getIO();
    if (io) {
      io.to(targetRestaurantId).emit('tableCancelled', {
        tableId: targetTableId,
        date: params.date,
        time: params.time,
        userId: params.userId,
        status: 'cancelled'
      });
    }

    return { result, tableStatus };
  }

  /**
   * Manual unblock for restaurant owner
   */
  async manualUnblockTableSlot(restaurantId: string, tableId: string, date?: string, time?: string) {
    const filter: any = {
      restaurantId,
      tableId,
      status: { $in: ['blocked', 'reserved'] }
    };
    if (date) filter.date = date;
    if (time) filter.time = time;

    const result = await TableBooking.updateMany(filter, {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        manuallyUnblocked: true
      },
      $unset: {
        blockedUntil: 1,
        autoConfirmAt: 1
      }
    });

    let tableStatus = null;
    try {
      const { TableStatus } = require('../../models/TableStatus');
      tableStatus = await TableStatus.findOneAndUpdate(
        {
          businessId: new mongoose.Types.ObjectId(restaurantId),
          tableId: tableId
        },
        {
          $set: {
            status: 'Ready',
            lastStatusChange: new Date()
          },
          $unset: {
            currentBookingId: 1
          }
        },
        { new: true }
      );
    } catch (statusError) {
      console.error('Error resetting table status in manual unblock:', statusError);
    }

    const io = getIO();
    if (io) {
      io.to(restaurantId).emit('tableCancelled', {
        tableId,
        date,
        time,
        status: 'cancelled',
        manual: true
      });
    }

    return { result, tableStatus };
  }

  // Fallback and delegation to battle-tested controller methods
  createBookingHandler = controllerCreateBooking;
  getUserBookingsHandler = controllerGetUserBookings;
  getBookingHandler = controllerGetBooking;
  updateBookingHandler = controllerUpdateBooking;
  cancelBookingHandler = controllerCancelBooking;
  confirmBookingHandler = controllerConfirmBooking;
  checkInBookingHandler = controllerCheckInBooking;
  deleteBookingHandler = controllerDeleteBooking;
  getBusinessBookingsHandler = controllerGetBusinessBookings;
  getBookingAnalyticsHandler = controllerGetBookingAnalytics;
  getDynamicFeeHandler = controllerGetDynamicTableFee;
}

export const bookingService = new BookingService();
export default bookingService;
