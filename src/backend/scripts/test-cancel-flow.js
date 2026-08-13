const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TableBooking = require('../dist/models/TableBooking').TableBooking;
const TableStatus = require('../dist/models/TableStatus').TableStatus;
const Booking = require('../dist/models/Booking').Booking;

async function testCancelFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check current state of all tables
    console.log('=== CURRENT STATE ===');
    
    const allTableBookings = await TableBooking.find({
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    }).sort({ date: 1, time: 1 });
    
    console.log(`Active TableBookings: ${allTableBookings.length}`);
    allTableBookings.forEach(booking => {
      console.log(`  - Table ${booking.tableId}: ${booking.date} ${booking.time} - ${booking.status}`);
    });

    const allTableStatuses = await TableStatus.find({
      status: { $ne: 'Ready' }
    });
    
    console.log(`\nNon-Ready TableStatuses: ${allTableStatuses.length}`);
    allTableStatuses.forEach(status => {
      console.log(`  - Table ${status.tableId}: ${status.status}, BookingId: ${status.currentBookingId || 'none'}`);
    });

    const activeBookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      table: { $exists: true }
    }).sort({ date: 1, time: 1 });
    
    console.log(`\nActive Bookings with tables: ${activeBookings.length}`);
    activeBookings.forEach(booking => {
      console.log(`  - ${booking._id}: Table ${booking.table}, ${booking.date} ${booking.time} - ${booking.status}`);
    });

    // Check for any inconsistencies
    console.log('\n=== CHECKING FOR INCONSISTENCIES ===');
    
    const readyWithBookingId = await TableStatus.find({
      status: 'Ready',
      currentBookingId: { $exists: true, $ne: null }
    });
    
    if (readyWithBookingId.length > 0) {
      console.log(`⚠ Found ${readyWithBookingId.length} Ready tables with booking IDs:`);
      readyWithBookingId.forEach(status => {
        console.log(`  - Table ${status.tableId}: BookingId ${status.currentBookingId}`);
      });
    } else {
      console.log('✓ No Ready tables with booking IDs');
    }

    const cancelledButBlocked = await TableBooking.find({
      status: 'cancelled',
      blockedUntil: { $exists: true, $ne: null }
    });
    
    if (cancelledButBlocked.length > 0) {
      console.log(`\n⚠ Found ${cancelledButBlocked.length} cancelled bookings still with blockedUntil:`);
      cancelledButBlocked.forEach(booking => {
        console.log(`  - Table ${booking.tableId}: blockedUntil ${booking.blockedUntil}`);
      });
    } else {
      console.log('✓ No cancelled bookings with blockedUntil');
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

testCancelFlow();
