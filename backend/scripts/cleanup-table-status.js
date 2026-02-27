const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const TableStatus = require('../dist/models/TableStatus').TableStatus;

async function cleanupTableStatus() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all TableStatus records that are Ready but still have a currentBookingId
    const inconsistentStatuses = await TableStatus.find({
      status: 'Ready',
      currentBookingId: { $exists: true, $ne: null }
    });

    console.log(`\nFound ${inconsistentStatuses.length} inconsistent TableStatus records`);
    
    if (inconsistentStatuses.length > 0) {
      inconsistentStatuses.forEach(status => {
        console.log(`  - Table ${status.tableId} at restaurant ${status.businessId}: Status=${status.status}, BookingId=${status.currentBookingId}`);
      });

      // Clean them up
      const result = await TableStatus.updateMany(
        {
          status: 'Ready',
          currentBookingId: { $exists: true, $ne: null }
        },
        {
          $unset: { currentBookingId: "" },
          lastStatusChange: new Date()
        }
      );

      console.log(`\n✓ Cleaned up ${result.modifiedCount} TableStatus records`);
    } else {
      console.log('✓ All TableStatus records are consistent');
    }

    // Verify
    console.log('\n=== VERIFICATION ===');
    const t7Status = await TableStatus.find({ tableId: 'T7' });
    console.log(`T7 TableStatus records: ${t7Status.length}`);
    t7Status.forEach(status => {
      console.log(`  - Restaurant: ${status.businessId}, Status: ${status.status}, BookingId: ${status.currentBookingId || 'none'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

cleanupTableStatus();
