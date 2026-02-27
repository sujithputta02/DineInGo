/**
 * Force unblock a specific table
 * Usage: node scripts/force-unblock-table.js <tableId> [restaurantId] [date] [time]
 * 
 * Examples:
 *   node scripts/force-unblock-table.js T7
 *   node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999
 *   node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999 2026-02-27 Afternoon
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TableBooking = require('../dist/models/TableBooking').TableBooking;
const TableStatus = require('../dist/models/TableStatus').TableStatus;

async function forceUnblockTable() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node scripts/force-unblock-table.js <tableId> [restaurantId] [date] [time]');
    console.error('\nExamples:');
    console.error('  node scripts/force-unblock-table.js T7');
    console.error('  node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999');
    console.error('  node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999 2026-02-27 Afternoon');
    process.exit(1);
  }

  const [tableId, restaurantId, date, time] = args;

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    console.log('=== FORCE UNBLOCK TABLE ===');
    console.log(`Table ID: ${tableId}`);
    if (restaurantId) console.log(`Restaurant ID: ${restaurantId}`);
    if (date) console.log(`Date: ${date}`);
    if (time) console.log(`Time: ${time}`);
    console.log('');

    // Build query for TableBooking
    const bookingQuery = { tableId };
    if (restaurantId) bookingQuery.restaurantId = restaurantId;
    if (date) bookingQuery.date = date;
    if (time) bookingQuery.time = time;
    bookingQuery.status = { $in: ['reserved', 'confirmed', 'blocked'] };

    // Find matching bookings
    const matchingBookings = await TableBooking.find(bookingQuery);
    console.log(`Found ${matchingBookings.length} blocked bookings for table ${tableId}`);
    
    if (matchingBookings.length > 0) {
      matchingBookings.forEach(booking => {
        console.log(`  - Restaurant: ${booking.restaurantId}, Date: ${booking.date}, Time: ${booking.time}, Status: ${booking.status}`);
      });

      // Update all matching bookings
      const result = await TableBooking.updateMany(
        bookingQuery,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          blockedUntil: undefined
        }
      );

      console.log(`\n✓ Cancelled ${result.modifiedCount} table bookings`);
    } else {
      console.log('✓ No blocked bookings found');
    }

    // Update TableStatus
    const statusQuery = { tableId };
    if (restaurantId) {
      statusQuery.businessId = new mongoose.Types.ObjectId(restaurantId);
    }

    const tableStatuses = await TableStatus.find(statusQuery);
    console.log(`\nFound ${tableStatuses.length} TableStatus records for table ${tableId}`);
    
    if (tableStatuses.length > 0) {
      tableStatuses.forEach(status => {
        console.log(`  - Restaurant: ${status.businessId}, Status: ${status.status}, BookingId: ${status.currentBookingId || 'none'}`);
      });

      const statusResult = await TableStatus.updateMany(
        statusQuery,
        {
          status: 'Ready',
          $unset: { currentBookingId: "" },
          lastStatusChange: new Date()
        }
      );

      console.log(`\n✓ Reset ${statusResult.modifiedCount} TableStatus records to Ready`);
    } else {
      console.log('✓ No TableStatus records found');
    }

    // Verification
    console.log('\n=== VERIFICATION ===');
    const remainingBlocked = await TableBooking.find({
      tableId,
      ...(restaurantId && { restaurantId }),
      ...(date && { date }),
      ...(time && { time }),
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });

    if (remainingBlocked.length === 0) {
      console.log(`✓ Table ${tableId} is now completely unblocked!`);
    } else {
      console.log(`⚠ Still ${remainingBlocked.length} blocked bookings remaining for table ${tableId}`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

forceUnblockTable();
