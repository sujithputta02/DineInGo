const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function checkBusinessEvent() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    // Find the Sunset Music Festival business
    const business = await db.collection('businesses').findOne({ 
      name: 'Sunset Music Festival' 
    });
    
    if (!business) {
      console.log('❌ Sunset Music Festival not found');
      process.exit(1);
    }
    
    console.log('=== SUNSET MUSIC FESTIVAL ===');
    console.log('ID:', business._id);
    console.log('Name:', business.name);
    console.log('Type:', business.type);
    console.log('Has seatingLayout:', !!business.seatingLayout);
    
    if (business.seatingLayout) {
      console.log('\n=== SEATING LAYOUT ===');
      console.log('Type:', typeof business.seatingLayout);
      console.log('Keys:', Object.keys(business.seatingLayout));
      
      if (business.seatingLayout.seats) {
        console.log('Seats count:', business.seatingLayout.seats.length);
        console.log('First 3 seats:', business.seatingLayout.seats.slice(0, 3));
      } else {
        console.log('⚠️  No seats array found');
      }
      
      if (business.seatingLayout.individualSeats) {
        console.log('Individual seats:', business.seatingLayout.individualSeats.length);
      }
      
      if (business.seatingLayout.concertAreas) {
        console.log('Concert areas:', business.seatingLayout.concertAreas.length);
      }
    } else {
      console.log('\n❌ NO SEATING LAYOUT SAVED');
    }
    
    console.log('\n=== OTHER FIELDS ===');
    console.log('Start Date:', business.startDate);
    console.log('End Date:', business.endDate);
    console.log('Capacity:', business.capacity);
    console.log('Base Price:', business.basePrice);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBusinessEvent();
