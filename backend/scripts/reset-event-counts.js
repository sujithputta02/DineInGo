const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function resetEventCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully\n');

    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');

    // Get all events
    const events = await eventsCollection.find({}).toArray();
    console.log(`Found ${events.length} events\n`);

    // Reset all registeredCount to 0
    const result = await eventsCollection.updateMany(
      {},
      { $set: { registeredCount: 0 } }
    );

    console.log(`✓ Reset registeredCount to 0 for ${result.modifiedCount} events\n`);

    // Show updated events
    console.log('Updated events:');
    const updatedEvents = await eventsCollection.find({}).toArray();
    updatedEvents.forEach(event => {
      console.log(`  - ${event.title}`);
      console.log(`    Capacity: ${event.capacity}`);
      console.log(`    Registered: ${event.registeredCount}`);
      console.log(`    Available: ${event.capacity - event.registeredCount}`);
      console.log('');
    });

    console.log('✓ All event counts reset successfully!');
    console.log('\nNow when users register for events, the count will increment from 0.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting event counts:', error);
    process.exit(1);
  }
}

resetEventCounts();
