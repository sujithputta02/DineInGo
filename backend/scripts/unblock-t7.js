const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TableBooking = require('../dist/models/TableBooking').TableBooking;
const TableStatus = require('../dist/models/TableStatus').TableStatus;

async function unblockT7() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all T7 bookings that are still blocked
    const t7Bookings = await TableBooking.find({
      tableId: 'T7',
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });

    console.log(`\nFound ${t7Bookings.length} blocked T7 bookings:`);
    t7Bookings.forEach(booking => {
      console.log(`  - Restaurant: ${booking.restaurantId}, Date: ${booking.date}, Time: ${booking.time}, Status: ${booking.status}`);
    });

    if (t7Bookings.length > 0) {
      // Update all T7 bookings to cancelled
      const result = await TableBooking.updateMany(
        {
          tableId: 'T7',
          status: { $in: ['reserved', 'confirmed', 'blocked'] }
        },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          blockedUntil: undefined
        }
      );

      console.log(`\n✓ Updated ${result.modifiedCount} T7 table bookings to cancelled`);

      // Update TableStatus for each restaurant
      for (const booking of t7Bookings) {
        const tableStatus = await TableStatus.findOneAndUpdate(
          {
            businessId: booking.restaurantId,
            tableId: 'T7'
          },
          {
            status: 'Ready',
            currentBookingId: undefined,
            lastStatusChange: new Date()
          },
          { new: true }
        );

        if (tableStatus) {
          console.log(`✓ Reset TableStatus for T7 at restaurant ${booking.restaurantId}`);
        } else {
          console.log(`⚠ No TableStatus found for T7 at restaurant ${booking.restaurantId}`);
        }
      }
    } else {
      console.log('\n✓ No blocked T7 bookings found');
    }

    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const remainingBlocked = await TableBooking.find({
      tableId: 'T7',
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });

    if (remainingBlocked.length === 0) {
      console.log('✓ All T7 tables are now unblocked!');
    } else {
      console.log(`⚠ Still ${remainingBlocked.length} blocked T7 bookings remaining`);
    }

    const tableStatuses = await TableStatus.find({ tableId: 'T7' });
    console.log(`\nT7 TableStatus records: ${tableStatuses.length}`);
    tableStatuses.forEach(status => {
      console.log(`  - Restaurant: ${status.businessId}, Status: ${status.status}, BookingId: ${status.currentBookingId || 'none'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

unblockT7();
