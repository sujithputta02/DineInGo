/**
 * Watch for booking cancellations in real-time
 * Run this in a separate terminal to monitor cancellations
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Booking = require('../dist/models/Booking').Booking;
const TableBooking = require('../dist/models/TableBooking').TableBooking;
const TableStatus = require('../dist/models/TableStatus').TableStatus;

async function watchCancellations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    console.log('👀 Watching for booking cancellations...\n');
    console.log('Cancel a booking in your app to see real-time updates here.\n');
    console.log('Press Ctrl+C to stop watching.\n');
    console.log('='.repeat(80));

    // Watch Booking collection for cancellations
    const bookingChangeStream = Booking.watch([
      {
        $match: {
          'updateDescription.updatedFields.status': 'cancelled'
        }
      }
    ]);

    bookingChangeStream.on('change', async (change) => {
      console.log('\n🔔 BOOKING CANCELLED!');
      console.log('Time:', new Date().toISOString());
      console.log('Booking ID:', change.documentKey._id);
      
      try {
        const booking = await Booking.findById(change.documentKey._id);
        if (booking) {
          const tableId = booking.table || booking.tableId || booking.tableNumber;
          let restaurantId = booking.restaurantId || booking.businessId;
          if (typeof restaurantId === 'object' && restaurantId !== null && '_id' in restaurantId) {
            restaurantId = String(restaurantId._id);
          } else {
            restaurantId = String(restaurantId);
          }
          const dateStr = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : String(booking.date);

          console.log('Details:', {
            table: tableId,
            restaurant: restaurantId,
            date: dateStr,
            time: booking.time
          });

          // Check if TableBooking was updated
          setTimeout(async () => {
            const tableBooking = await TableBooking.findOne({
              restaurantId,
              tableId,
              date: dateStr,
              time: booking.time
            });

            console.log('\n📊 TableBooking Status:', tableBooking ? tableBooking.status : 'NOT FOUND');
            if (tableBooking && tableBooking.status === 'cancelled') {
              console.log('✅ TableBooking correctly cancelled');
            } else {
              console.log('❌ TableBooking NOT cancelled - FIX NOT WORKING!');
            }

            // Check if TableStatus was updated
            const tableStatus = await TableStatus.findOne({
              businessId: new mongoose.Types.ObjectId(restaurantId),
              tableId
            });

            console.log('📊 TableStatus:', tableStatus ? `${tableStatus.status} (BookingId: ${tableStatus.currentBookingId || 'none'})` : 'NOT FOUND');
            if (tableStatus && tableStatus.status === 'Ready' && !tableStatus.currentBookingId) {
              console.log('✅ TableStatus correctly reset to Ready');
            } else {
              console.log('❌ TableStatus NOT reset - FIX NOT WORKING!');
            }

            console.log('\n' + '='.repeat(80));
          }, 1000); // Wait 1 second for updates to propagate
        }
      } catch (error) {
        console.error('Error checking cancellation:', error);
      }
    });

    // Keep the script running
    process.on('SIGINT', async () => {
      console.log('\n\nStopping watcher...');
      await bookingChangeStream.close();
      await mongoose.connection.close();
      console.log('✓ Disconnected from MongoDB');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

watchCancellations();
