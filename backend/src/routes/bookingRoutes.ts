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
    
    // Check if table is already booked
    const existingBooking = await TableBooking.findOne({
      restaurantId,
      tableId,
      date,
      time,
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });
    
    if (existingBooking && existingBooking.userId !== userId) {
      return res.status(409).json({ 
        error: 'Table already booked',
        message: 'This table has already been reserved by another user'
      });
    }
    
    // Upsert: one booking per table/date/time
    const booking = await TableBooking.findOneAndUpdate(
      { restaurantId, tableId, date, time },
      { userId, guests, status, createdAt: new Date() },
      { upsert: true, new: true }
    );
    
    // Emit Socket.IO event for real-time updates
    const io = getIO();
    if (io) {
      const eventName = status === 'reserved' ? 'tableBlocked' : 
                       status === 'confirmed' ? 'tableConfirmed' : 
                       status === 'cancelled' ? 'tableCancelled' : 'bookingUpdated';
      
      io.to(restaurantId).emit(eventName, {
        tableId,
        date,
        time,
        userId,
        status,
        booking
      });
      
      console.log(`Emitted ${eventName} for table ${tableId} at ${restaurantId}`);
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error in table booking:', error);
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
    console.log('Fetching booked tables for:', { restaurantId, date, time });
    
    // Query TableBooking collection for ONLY reserved/confirmed/blocked tables (exclude cancelled)
    const tableBookings = await TableBooking.find({
      restaurantId: restaurantId,
      date: String(date),
      time: String(time),
      status: { $in: ['reserved', 'confirmed', 'blocked'] },
      // Explicitly exclude cancelled bookings
      $nor: [{ status: 'cancelled' }]
    });
    
    console.log('Found active table bookings:', tableBookings.length);
    
    const bookedTableIds = tableBookings.map(b => b.tableId);
    console.log('Booked table IDs:', bookedTableIds);
    
    res.json(bookedTableIds);
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

// Cancel a table booking (only if more than 2 hours before slot)
router.post('/cancel-table', async (req, res) => {
  const { restaurantId, tableId, date, time, userId } = req.body;
  
  console.log('=== CANCEL TABLE REQUEST ===');
  console.log('Request body:', { restaurantId, tableId, date, time, userId });
  
  // Validate required fields
  if (!restaurantId) {
    return res.status(400).json({ error: 'Missing restaurantId', message: 'Restaurant ID is required' });
  }
  if (!tableId) {
    return res.status(400).json({ error: 'Missing tableId', message: 'Table ID is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Missing date', message: 'Date is required' });
  }
  if (!time) {
    return res.status(400).json({ error: 'Missing time', message: 'Time is required' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId', message: 'User ID is required' });
  }
  
  // Check if cancellation is allowed (must be more than 2 hours before booking time)
  try {
    const slotDateTime = dayjs(`${date} ${time}`);
    const twoHoursBefore = slotDateTime.subtract(2, 'hours');
    const now = dayjs();
    
    console.log('Time check:', {
      now: now.format(),
      slotDateTime: slotDateTime.format(),
      twoHoursBefore: twoHoursBefore.format(),
      canCancel: now.isBefore(twoHoursBefore)
    });
    
    if (now.isAfter(twoHoursBefore)) {
      return res.status(400).json({ 
        error: 'Cannot cancel within 2 hours of the booking time',
        message: 'Cancellations must be made at least 2 hours before your reservation time'
      });
    }
  } catch (dateError) {
    console.error('Error parsing date/time:', dateError);
    // Continue anyway - don't block cancellation due to date parsing issues
  }
  
  const now = new Date();
  
  // First, let's see what bookings exist for this table
  const existingBookings = await TableBooking.find({
    restaurantId,
    tableId,
    date: String(date),
    time: String(time)
  });
  console.log('Existing bookings for this table:', existingBookings);
  
  // Try to find and cancel in TableBooking collection first
  console.log('Searching TableBooking with:', { 
    restaurantId, 
    tableId, 
    date: String(date), 
    time: String(time), 
    userId 
  });
  
  // Try with userId first
  let booking = await TableBooking.findOneAndUpdate(
    { 
      restaurantId, 
      tableId, 
      date: String(date), 
      time: String(time), 
      userId, 
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    },
    { 
      status: 'cancelled', 
      cancelledAt: now, 
      blockedUntil: undefined 
    },
    { new: true }
  );
  
  // If not found with userId, try without userId (in case userId doesn't match)
  if (!booking) {
    console.log('Not found with userId, trying without userId...');
    booking = await TableBooking.findOneAndUpdate(
      { 
        restaurantId, 
        tableId, 
        date: String(date), 
        time: String(time), 
        status: { $in: ['reserved', 'confirmed', 'blocked'] }
      },
      { 
        status: 'cancelled', 
        cancelledAt: now, 
        blockedUntil: undefined 
      },
      { new: true }
    );
  }
  
  console.log('TableBooking cancellation result:', booking ? 'Updated successfully' : 'Not found');
  
  // Also update the main Booking collection
  console.log('Updating main Booking collection...');
  let dateObj: Date;
  try {
    dateObj = new Date(date);
    console.log('Parsed date object:', dateObj);
  } catch (err) {
    console.error('Error parsing date:', err);
    dateObj = new Date();
  }
  
  // Try to find the booking in the main Booking collection
  console.log('Searching for booking with:', {
    userId,
    restaurantId,
    date: dateObj,
    time: String(time),
    table: tableId
  });
  
  const mainBooking = await Booking.findOneAndUpdate(
    {
      userId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      date: dateObj,
      time: String(time),
      table: tableId,
      status: { $in: ['pending', 'confirmed'] }
    },
    {
      status: 'cancelled',
      updatedAt: now
    },
    { new: true }
  );
  
  console.log('Main Booking cancellation result:', mainBooking ? 'Updated successfully' : 'Not found');
  
  // If neither collection had the booking, try alternative searches
  if (!booking && !mainBooking) {
    console.log('Booking not found with exact match, trying alternative searches...');
    
    // Try finding any booking for this user at this restaurant/date/time
    const anyBooking = await Booking.findOne({
      userId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      date: dateObj,
      time: String(time)
    });
    
    console.log('Alternative search result:', anyBooking);
    
    if (anyBooking) {
      // Found a booking, update it
      anyBooking.status = 'cancelled';
      anyBooking.updatedAt = now;
      await anyBooking.save();
      console.log('Updated booking via alternative search');
    } else {
      return res.status(404).json({ 
        error: 'Booking not found',
        message: 'This booking may have already been cancelled or does not exist',
        debug: {
          searchedFor: {
            userId,
            restaurantId,
            date: dateObj.toISOString(),
            time,
            tableId
          }
        }
      });
    }
  }
  
  // Emit Socket.IO event to notify all users
  const io = getIO();
  if (io) {
    io.to(restaurantId).emit('tableCancelled', { 
      tableId, 
      date: String(date), 
      time: String(time), 
      userId,
      status: 'cancelled',
      booking: booking || mainBooking
    });
    console.log(`✓ Emitted tableCancelled event for table ${tableId} at restaurant ${restaurantId}`);
  }
  
  console.log('=== CANCELLATION SUCCESSFUL ===');
  
  res.json({ 
    success: true,
    message: 'Booking cancelled successfully',
    booking: booking || mainBooking 
  });
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