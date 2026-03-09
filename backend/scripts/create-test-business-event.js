const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function createTestBusinessEvent() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    // Create a test business event with seating layout
    const testBusiness = {
      ownerId: 'test-owner-123',
      name: 'Sunset Music Festival',
      location: 'Central Park, New York',
      locationData: {
        address: 'Central Park',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        latitude: 40.785091,
        longitude: -73.968285
      },
      type: 'event',
      description: 'An amazing outdoor music festival featuring top artists',
      thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
      coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
      status: 'active',
      bookingType: 'seat-based',
      basePrice: 150,
      capacity: 500,
      eventType: 'Music Festival',
      duration: 180,
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-06-17'),
      timeSlots: [
        {
          id: 'slot-1',
          name: 'Day 1',
          startTime: '6:00 PM',
          endTime: '11:00 PM',
          type: 'event',
          available: true,
          maxCapacity: 500
        }
      ],
      tierPricing: {
        standard: { price: 150, defaultCapacity: 300 },
        premium: { price: 250, defaultCapacity: 150 },
        vip: { price: 500, defaultCapacity: 50 }
      },
      seatingLayout: {
        sections: [
          {
            id: 'general-admission',
            name: 'General Admission',
            type: 'standing',
            capacity: 300,
            price: 150,
            color: '#10b981'
          },
          {
            id: 'vip-section',
            name: 'VIP Section',
            type: 'seated',
            capacity: 50,
            price: 500,
            color: '#f59e0b'
          }
        ],
        seats: [
          // VIP seats (rows A-E, 10 seats each)
          ...Array.from({ length: 5 }, (_, rowIndex) => 
            Array.from({ length: 10 }, (_, seatIndex) => ({
              id: `vip-${String.fromCharCode(65 + rowIndex)}${seatIndex + 1}`,
              section: 'vip-section',
              row: String.fromCharCode(65 + rowIndex),
              number: seatIndex + 1,
              x: 100 + seatIndex * 40,
              y: 100 + rowIndex * 40,
              status: 'available',
              price: 500
            }))
          ).flat()
        ]
      },
      totalBookings: 0,
      revenue: 0,
      rating: 4.8,
      utilizationRate: 0
    };
    
    const result = await db.collection('businesses').insertOne(testBusiness);
    console.log('✓ Test business event created!');
    console.log('  ID:', result.insertedId);
    console.log('  Name:', testBusiness.name);
    console.log('  Type:', testBusiness.type);
    console.log('  Has seatingLayout:', !!testBusiness.seatingLayout);
    console.log('  Sections:', testBusiness.seatingLayout.sections.length);
    console.log('  Seats:', testBusiness.seatingLayout.seats.length);
    console.log('\nYou can now access this event at:');
    console.log(`  http://localhost:5173/event/${result.insertedId}/register`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestBusinessEvent();
