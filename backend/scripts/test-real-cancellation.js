/**
 * Test real cancellation flow by simulating what happens when a user cancels
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Booking = require('../dist/models/Booking').Booking;
const TableBooking = require('../dist/models/TableBooking').TableBooking;
const TableStatus = require('../dist/models/TableStatus').TableStatus;

async function testRealCancellation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find a confirmed booking with a table
    const testBooking = await Booking.findOne({
      status: 'confirmed',
      $or: [
        { table: { $exists: true, $ne: null } },
        { tableId: { $exists: true, $ne: null } },
        { tableNumber: { $exists: true, $ne: null } }
      ]
    }).sort({ createdAt: -1 });

    if (!testBooking) {
      console.log('❌ No confirmed bookings with tables found to test');
      console.log('\nCreating a test booking...');
      
      // Create a test booking
      const testData = {
        userId: 'test-user-123',
        restaurantId: '6980d6a6ae7ec40527e24999', // Use a real restaurant ID from your DB
        table: 'TEST1',
        date: new Date('2026-03-01'),
        time: 'Evening',
        guests: 2,
        status: 'confirmed',
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '1234567890'
      };

      const newBooking = new Booking(testData);
      await newBooking.save();
      
      // Create corresponding TableBooking
      await TableBooking.create({
        restaurantId: testData.restaurantId,
        tableId: testData.table,
        date: testData.date.toISOString().slice(0, 10),
        time: testData.time,
        userId: testData.userId,
        guests: testData.guests,
        status: 'confirmed'
      });

      // Create TableStatus
      await TableStatus.findOneAndUpdate(
        {
          businessId: new mongoose.Types.ObjectId(testData.restaurantId),
          tableId: testData.table
        },
        {
          status: 'Occupied',
          currentBookingId: newBooking._id,
          lastStatusChange: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('✓ Created test booking:', newBooking._id);
      console.log('\nNow run this script again to test cancellation');
      return;
    }

    console.log('=== FOUND TEST BOOKING ===');
    console.log('Booking ID:', testBooking._id);
    console.log('Table:', testBooking.table || testBooking.tableId || testBooking.tableNumber);
    console.log('Restaurant:', testBooking.restaurantId || testBooking.businessId);
    console.log('Date:', testBooking.date);
    console.log('Time:', testBooking.time);
    console.log('Status:', testBooking.status);

    const tableIdentifier = testBooking.table || testBooking.tableId || testBooking.tableNumber;
    let restaurantId = testBooking.restaurantId;
    if (typeof restaurantId === 'object' && restaurantId !== null && '_id' in restaurantId) {
      restaurantId = String(restaurantId._id);
    } else {
      restaurantId = String(restaurantId || testBooking.businessId);
    }
    const dateStr = testBooking.date instanceof Date ? testBooking.date.toISOString().slice(0, 10) : String(testBooking.date);

    console.log('\n=== BEFORE CANCELLATION ===');
    
    const beforeTableBooking = await TableBooking.findOne({
      restaurantId,
      tableId: tableIdentifier,
      date: dateStr,
      time: testBooking.time
    });
    console.log('TableBooking:', beforeTableBooking ? `Status: ${beforeTableBooking.status}` : 'Not found');

    const beforeTableStatus = await TableStatus.findOne({
      businessId: new mongoose.Types.ObjectId(restaurantId),
      tableId: tableIdentifier
    });
    console.log('TableStatus:', beforeTableStatus ? `Status: ${beforeTableStatus.status}, BookingId: ${beforeTableStatus.currentBookingId || 'none'}` : 'Not found');

    // Simulate the cancellation
    console.log('\n=== SIMULATING CANCELLATION ===');
    
    // Update booking
    testBooking.status = 'cancelled';
    testBooking.updatedAt = new Date();
    await testBooking.save();
    console.log('✓ Updated Booking status to cancelled');

    // Update TableBooking
    const updatedTableBooking = await TableBooking.findOneAndUpdate(
      {
        restaurantId,
        tableId: tableIdentifier,
        date: dateStr,
        time: testBooking.time,
        status: { $in: ['reserved', 'confirmed', 'blocked'] }
      },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        $unset: { blockedUntil: "" }
      },
      { new: true }
    );
    console.log('✓ Updated TableBooking:', updatedTableBooking ? 'Success' : 'Not found');

    // Update TableStatus
    const updatedTableStatus = await TableStatus.findOneAndUpdate(
      {
        businessId: new mongoose.Types.ObjectId(restaurantId),
        tableId: tableIdentifier
      },
      {
        status: 'Ready',
        $unset: { currentBookingId: "" },
        lastStatusChange: new Date()
      },
      { new: true }
    );
    console.log('✓ Updated TableStatus:', updatedTableStatus ? 'Success' : 'Not found');

    console.log('\n=== AFTER CANCELLATION ===');
    
    const afterBooking = await Booking.findById(testBooking._id);
    console.log('Booking status:', afterBooking.status);

    const afterTableBooking = await TableBooking.findOne({
      restaurantId,
      tableId: tableIdentifier,
      date: dateStr,
      time: testBooking.time
    });
    console.log('TableBooking:', afterTableBooking ? `Status: ${afterTableBooking.status}, BlockedUntil: ${afterTableBooking.blockedUntil || 'none'}` : 'Not found');

    const afterTableStatus = await TableStatus.findOne({
      businessId: new mongoose.Types.ObjectId(restaurantId),
      tableId: tableIdentifier
    });
    console.log('TableStatus:', afterTableStatus ? `Status: ${afterTableStatus.status}, BookingId: ${afterTableStatus.currentBookingId || 'none'}` : 'Not found');

    // Verify table is available
    console.log('\n=== VERIFICATION ===');
    const blockedTables = await TableBooking.find({
      restaurantId,
      tableId: tableIdentifier,
      date: dateStr,
      time: testBooking.time,
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    });

    if (blockedTables.length === 0) {
      console.log(`✅ SUCCESS! Table ${tableIdentifier} is now available for booking`);
    } else {
      console.log(`❌ FAILED! Table ${tableIdentifier} is still blocked`);
      console.log('Blocked bookings:', blockedTables);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

testRealCancellation();
