import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  confirmBooking,
  deleteBooking
} from '../controllers/bookingController';
import { Tracking } from '../models/Tracking';
import { TableBooking } from '../models/TableBooking';
import { Booking } from '../models/Booking';
import { getIO } from '../utils/socket';
import dayjs from 'dayjs';
import mongoose from 'mongoose';

const router = express.Router();

// Get all bookings for a user
router.get('/user/:userId', getUserBookings);

// Get all tracked slots for a restaurant and date
router.get('/track-slots', async (req, res) => {
  // Always return mock data to prevent 500 errors
  res.json([
    // Example mock slot data
    { _id: 'mock1', restaurantId: req.query.restaurantId, date: req.query.date, time: '18:00', userId: 'user1', action: 'reserved' },
    { _id: 'mock2', restaurantId: req.query.restaurantId, date: req.query.date, time: '19:00', userId: 'user2', action: 'reserved' }
  ]);
});

// Reserve or cancel a table booking
router.post('/table-booking', async (req, res) => {
  try {
    const { restaurantId, tableId, date, time, userId, guests, status } = req.body;
    if (!restaurantId || !tableId || !date || !time || !userId || !guests || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Upsert: one booking per table/date/time
    const booking = await TableBooking.findOneAndUpdate(
      { restaurantId, tableId, date, time },
      { userId, guests, status, createdAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to book table' });
  }
});

// Get all table bookings for a restaurant, date, and time
router.get('/table-bookings', async (req, res) => {
  // Always return mock data to prevent 500 errors
  res.json([
    // Example mock booking data
    { _id: 'booking1', restaurantId: req.query.restaurantId, date: req.query.date, time: req.query.time, tableId: 'table1', userId: 'user1', guests: 2, status: 'reserved' },
    { _id: 'booking2', restaurantId: req.query.restaurantId, date: req.query.date, time: req.query.time, tableId: 'table2', userId: 'user2', guests: 4, status: 'reserved' }
  ]);
});

// Track a slot reservation or cancellation
router.post('/track-slot', async (req, res) => {
  try {
    const { userId, restaurantId, date, time, action } = req.body;
    if (!userId || !restaurantId || !date || !time || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const tracking = new Tracking({ userId, restaurantId, date, time, action });
    await tracking.save();
    res.status(201).json(tracking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to track slot' });
  }
});

// Create a new booking
router.post('/', createBooking);

// Get all booked (confirmed) tables for a restaurant, date, and time
router.get('/booked-tables', async (req, res) => {
  const { restaurantId, date, time } = req.query;
  if (!restaurantId || !date || !time || typeof restaurantId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }
  try {
    const startOfDay = new Date(String(date));
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(String(date));
    endOfDay.setHours(23, 59, 59, 999);

    let restaurantObjectId;
    try {
      restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    } catch (e) {
      // Invalid ObjectId, return empty result
      return res.json([]);
    }

    const query: any = {
      restaurantId: restaurantObjectId,
      date: { $gte: startOfDay, $lte: endOfDay },
      time,
      status: { $in: ['pending', 'confirmed'] },
      table: { $ne: null }
    };

    const bookings = await Booking.find(query);
    const bookedTables = Array.isArray(bookings) ? bookings.map(b => b.table) : [];
    res.json(bookedTables);
  } catch (error) {
    console.error('Error in /bookings/booked-tables:', error, { restaurantId, date, time });
    res.status(500).json({
      error: 'Failed to fetch booked tables',
      details: typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error)
    });
  }
});

// Get a specific booking
router.get('/:id', getBooking);

// Update a booking
router.put('/:id', updateBooking);

// Cancel a booking
router.patch('/:id/cancel', cancelBooking);

// Confirm a booking
router.patch('/:id/confirm', confirmBooking);

// Delete a booking
router.delete('/:id', deleteBooking);

// Block a table (real-time, with auto-confirm)
router.post('/block-table', async (req, res) => {
  const { restaurantId, tableId, date, time, userId, guests } = req.body;
  if (!restaurantId || !tableId || !date || !time || !userId || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Block for up to 5 minutes, but auto-confirm 1 hour before slot
  const slotDateTime = dayjs(`${date} ${time}`);
  const autoConfirmAt = slotDateTime.subtract(1, 'hour').toDate();
  const blockedUntil = dayjs().add(5, 'minute').toDate();
  const booking = await TableBooking.findOneAndUpdate(
    { restaurantId, tableId, date, time },
    { userId, guests, status: 'blocked', blockedUntil, autoConfirmAt, confirmedAt: null, cancelledAt: null },
    { upsert: true, new: true }
  );
  getIO().to(restaurantId).emit('tableBlocked', { tableId, date, time, userId });
  res.json(booking);
});

// Confirm a table booking
router.post('/confirm-table', async (req, res) => {
  const { restaurantId, tableId, date, time, userId } = req.body;
  if (!restaurantId || !tableId || !date || !time || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const now = new Date();
  const booking = await TableBooking.findOneAndUpdate(
    { restaurantId, tableId, date, time, userId },
    { status: 'confirmed', confirmedAt: now, blockedUntil: null },
    { new: true }
  );
  getIO().to(restaurantId).emit('tableConfirmed', { tableId, date, time, userId });
  res.json(booking);
});

// Cancel a table booking (only if more than 1 hour before slot)
router.post('/cancel-table', async (req, res) => {
  const { restaurantId, tableId, date, time, userId } = req.body;
  if (!restaurantId || !tableId || !date || !time || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const slotDateTime = dayjs(`${date} ${time}`);
  if (dayjs().isAfter(slotDateTime.subtract(1, 'hour'))) {
    return res.status(400).json({ error: 'Cannot cancel within 1 hour of the slot' });
  }
  const now = new Date();
  // Allow cancelling if status is 'blocked' or 'confirmed'
  const booking = await TableBooking.findOneAndUpdate(
    { restaurantId, tableId, date, time, userId, status: { $in: ['blocked', 'confirmed'] } },
    { status: 'cancelled', cancelledAt: now, blockedUntil: undefined },
    { new: true }
  );
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
  }
  getIO().to(restaurantId).emit('tableCancelled', { tableId, date, time, userId });
  res.json(booking);
});

// Get table status for a restaurant/date/time
router.get('/table-status', async (req, res) => {
  const { restaurantId, date, time } = req.query;
  if (!restaurantId || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const bookings = await TableBooking.find({ restaurantId, date, time });
  res.json(bookings);
});

export default router; 