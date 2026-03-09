const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function findEvent() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const eventId = '69a12cd3753b600efa1a629e';
    
    console.log(`Searching for event ID: ${eventId}\n`);
    
    // Check in events collection
    const event = await db.collection('events').findOne({ _id: new mongoose.Types.ObjectId(eventId) });
    console.log('In events collection:', event ? 'FOUND' : 'NOT FOUND');
    if (event) {
      console.log('  Name:', event.name);
      console.log('  Type:', event.type);
    }
    
    // Check in businesses collection
    const business = await db.collection('businesses').findOne({ _id: new mongoose.Types.ObjectId(eventId) });
    console.log('In businesses collection:', business ? 'FOUND' : 'NOT FOUND');
    if (business) {
      console.log('  Name:', business.name);
      console.log('  Type:', business.type);
      console.log('  Has seatingLayout:', !!business.seatingLayout);
    }
    
    // List all businesses
    const allBusinesses = await db.collection('businesses').find({}).toArray();
    console.log(`\nTotal businesses in DB: ${allBusinesses.length}`);
    allBusinesses.forEach(b => {
      console.log(`  - ${b.name} (${b._id}) - Type: ${b.type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findEvent();
