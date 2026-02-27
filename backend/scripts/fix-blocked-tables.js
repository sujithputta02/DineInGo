/**
 * Script to fix blocked tables that should be unblocked
 * This will reset TableStatus for all cancelled bookings
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const TableStatus = require('../dist/models/TableStatus').TableStatus;
const TableBooking = require('../dist/models/TableBooking').TableBooking;
const Booking = require('../dist/models/Booking').Booking;

async function fixBlockedTables() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingo');
    console.log('Connected successfully');

    // Find all cancelled bookings
    const cancelledBookings = await Booking.find({ 
      status: 'cancelled',
      table: { $exists: true, $ne: null }
    });

    console.log(`Found ${cancelledBookings.length} cancelled bookings with tables`);

    let fixedCount = 0;
    let notFoundCount = 0;

    for (const booking of cancelledBookings) {
      try {
        const restaurantId = booking.restaurantId || booking.businessId;
        const tableId = booking.table || booking.tableId;

        if (!restaurantId || !tableId) {
          console.log(`Skipping booking ${booking._id} - missing restaurantId or tableId`);
          continue;
        }

        // Check if there's a TableStatus entry for this table
        const tableStatus = await TableStatus.findOne({
          businessId: new mongoose.Types.ObjectId(restaurantId),
          tableId: tableId
        });

        if (tableStatus && tableStatus.status !== 'Ready') {
          // Check if the current booking ID matches this cancelled booking
          if (tableStatus.currentBookingId && 
              tableStatus.currentBookingId.toString() === booking._id.toString()) {
            
            // Reset the table status
            tableStatus.status = 'Ready';
            tableStatus.currentBookingId = undefined;
            tableStatus.lastStatusChange = new Date();
            await tableStatus.save();

            console.log(`✓ Fixed table ${tableId} for restaurant ${restaurantId} (was ${tableStatus.status})`);
            fixedCount++;
          } else {
            console.log(`- Table ${tableId} has different booking ID, skipping`);
          }
        } else if (tableStatus) {
          console.log(`- Table ${tableId} already Ready, skipping`);
        } else {
          notFoundCount++;
        }
      } catch (err) {
        console.error(`Error processing booking ${booking._id}:`, err.message);
      }
    }

    // Also check for any TableBookings that are cancelled but TableStatus is not Ready
    const cancelledTableBookings = await TableBooking.find({ 
      status: 'cancelled'
    });

    console.log(`\nFound ${cancelledTableBookings.length} cancelled table bookings`);

    for (const tableBooking of cancelledTableBookings) {
      try {
        const tableStatus = await TableStatus.findOne({
          businessId: new mongoose.Types.ObjectId(tableBooking.restaurantId),
          tableId: tableBooking.tableId
        });

        if (tableStatus && tableStatus.status !== 'Ready') {
          tableStatus.status = 'Ready';
          tableStatus.currentBookingId = undefined;
          tableStatus.lastStatusChange = new Date();
          await tableStatus.save();

          console.log(`✓ Fixed table ${tableBooking.tableId} from TableBooking (was ${tableStatus.status})`);
          fixedCount++;
        }
      } catch (err) {
        console.error(`Error processing table booking ${tableBooking._id}:`, err.message);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Fixed: ${fixedCount} tables`);
    console.log(`Not found in TableStatus: ${notFoundCount} tables`);
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

fixBlockedTables();
