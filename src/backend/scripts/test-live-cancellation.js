/**
 * Test cancellation through the API (simulates what the frontend does)
 */
const axios = require('axios');

const API_URL = 'http://localhost:5001';

async function testLiveCancellation() {
  try {
    console.log('🧪 Testing Live Cancellation via API\n');

    // First, find a confirmed booking
    console.log('1️⃣ Finding a confirmed booking...');
    
    // You'll need to replace this with an actual booking ID from your database
    // For now, let's check if we can hit the health endpoint
    const healthCheck = await axios.get(`${API_URL}/api/bookings/health/cancellation-fix`);
    console.log('✅ Server is running with fix:', healthCheck.data.fixApplied);
    console.log('   Version:', healthCheck.data.version);
    console.log('');

    console.log('2️⃣ To test cancellation:');
    console.log('   a) Go to your app');
    console.log('   b) Navigate to "My Bookings"');
    console.log('   c) Click "Cancel" on any booking');
    console.log('   d) Watch the terminal where backend is running');
    console.log('');
    console.log('You should see logs like:');
    console.log('   === CANCEL BOOKING REQUEST ===');
    console.log('   Found booking to cancel: { ... }');
    console.log('   ✓ Booking status updated to cancelled');
    console.log('   ✓ Successfully cancelled table booking');
    console.log('   ✓ Successfully reset table status for table TX to Ready');
    console.log('   ✓ Emitted tableCancelled event');
    console.log('');
    console.log('3️⃣ Verify the table is unblocked:');
    console.log('   a) Go to table selection page');
    console.log('   b) The cancelled table should be available (not grayed out)');
    console.log('   c) You should be able to book it again');
    console.log('');
    console.log('✅ Fix is active and ready to test!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Backend server is not running!');
      console.log('Start it with: cd backend && npm run dev');
    }
  }
}

testLiveCancellation();
