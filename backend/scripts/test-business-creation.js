const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function testBusinessCreation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    // Create a test business
    const testBusiness = {
      ownerId: 'test-owner-123',
      name: 'Test Event Business',
      location: 'Test Location',
      type: 'event',
      description: 'Test event description',
      status: 'draft',
      bookingType: 'seat-based',
      basePrice: 100,
      capacity: 200,
      timeSlots: [],
      tierPricing: {
        standard: { price: 100, defaultCapacity: 50 },
        premium: { price: 200, defaultCapacity: 30 },
        vip: { price: 500, defaultCapacity: 20 }
      },
      seatingLayout: {
        sections: [
          { id: 'section-1', name: 'VIP Section', seats: 50 }
        ],
        seats: [
          { id: 'seat-1', section: 'section-1', row: 'A', number: 1 }
        ]
      },
      totalBookings: 0,
      revenue: 0,
      rating: 0,
      utilizationRate: 0
    };
    
    const result = await db.collection('businesses').insertOne(testBusiness);
    console.log('✓ Test business created:', result.insertedId);
    
    // Verify it was saved
    const saved = await db.collection('businesses').findOne({ _id: result.insertedId });
    console.log('\n=== SAVED BUSINESS ===');
    console.log('Name:', saved.name);
    console.log('Has seatingLayout:', !!saved.seatingLayout);
    if (saved.seatingLayout) {
      console.log('Seating sections:', saved.seatingLayout.sections?.length || 0);
      console.log('Seating seats:', saved.seatingLayout.seats?.length || 0);
    }
    
    // Clean up
    await db.collection('businesses').deleteOne({ _id: result.insertedId });
    console.log('\n✓ Test business deleted');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testBusinessCreation();
