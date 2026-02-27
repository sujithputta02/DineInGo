/**
 * Quick script to unblock specific tables (T1, T2)
 * Run this to immediately fix the blocked tables issue
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function unblockTables() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingo');
    console.log('Connected successfully');

    // Import models
    const { TableBooking } = require('../dist/models/TableBooking');
    const { TableStatus } = require('../dist/models/TableStatus');

    // Get the restaurant ID and date/time from command line or use defaults
    const restaurantId = process.argv[2] || null;
    const date = process.argv[3] || null;
    const time = process.argv[4] || null;
    const tablesToUnblock = process.argv.slice(5).length > 0 ? process.argv.slice(5) : ['T1', 'T2'];

    console.log('\n=== UNBLOCKING TABLES ===');
    console.log('Restaurant ID:', restaurantId || 'ALL');
    console.log('Date:', date || 'ALL');
    console.log('Time:', time || 'ALL');
    console.log('Tables:', tablesToUnblock.join(', '));
    console.log('');

    for (const tableId of tablesToUnblock) {
      console.log(`\nProcessing table: ${tableId}`);

      // Build query
      const query = { tableId };
      if (restaurantId) query.restaurantId = restaurantId;
      if (date) query.date = date;
      if (time) query.time = time;

      // Find all bookings for this table
      const bookings = await TableBooking.find(query);
      console.log(`  Found ${bookings.length} booking(s)`);

      // Update all non-cancelled bookings to cancelled
      let updatedCount = 0;
      for (const booking of bookings) {
        if (booking.status !== 'cancelled') {
          booking.status = 'cancelled';
          booking.cancelledAt = new Date();
          booking.blockedUntil = undefined;
          await booking.save();
          console.log(`  ✓ Cancelled booking ${booking._id} (was ${booking.status})`);
          updatedCount++;
        } else {
          console.log(`  - Booking ${booking._id} already cancelled`);
        }
      }

      // Update TableStatus if restaurant ID is provided
      if (restaurantId) {
        try {
          const tableStatus = await TableStatus.findOneAndUpdate(
            {
              businessId: new mongoose.Types.ObjectId(restaurantId),
              tableId: tableId
            },
            {
              status: 'Ready',
              currentBookingId: undefined,
              lastStatusChange: new Date()
            },
            { new: true }
          );

          if (tableStatus) {
            console.log(`  ✓ Reset TableStatus to Ready`);
          } else {
            console.log(`  - No TableStatus entry found`);
          }
        } catch (err) {
          console.error(`  ✗ Error updating TableStatus:`, err.message);
        }
      }

      console.log(`  Summary: Updated ${updatedCount} booking(s) for ${tableId}`);
    }

    console.log('\n=== DONE ===');
    console.log('Tables have been unblocked. Refresh your browser to see the changes.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

// Usage instructions
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node unblock-specific-tables.js [restaurantId] [date] [time] [table1] [table2] ...

Examples:
  # Unblock T1 and T2 for all dates/times at all restaurants
  node unblock-specific-tables.js

  # Unblock T1 and T2 for a specific restaurant
  node unblock-specific-tables.js 507f1f77bcf86cd799439011

  # Unblock T1 and T2 for a specific restaurant, date, and time
  node unblock-specific-tables.js 507f1f77bcf86cd799439011 2024-02-26 "7:00 PM"

  # Unblock specific tables
  node unblock-specific-tables.js 507f1f77bcf86cd799439011 2024-02-26 "7:00 PM" T1 T2 T3
  `);
  process.exit(0);
}

unblockTables();
