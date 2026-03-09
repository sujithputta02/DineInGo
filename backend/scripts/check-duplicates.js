const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function checkDuplicates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    // Check businesses
    console.log('=== BUSINESSES ===');
    const businesses = await db.collection('businesses').find({}).toArray();
    console.log(`Total businesses: ${businesses.length}`);
    
    const businessNames = {};
    businesses.forEach(b => {
      if (businessNames[b.name]) {
        console.log(`⚠️  DUPLICATE: ${b.name} (IDs: ${businessNames[b.name]}, ${b._id})`);
      } else {
        businessNames[b.name] = b._id;
      }
      console.log(`  - ${b.name} (${b.type}) - ID: ${b._id}`);
    });
    
    // Check events
    console.log('\n=== EVENTS ===');
    const events = await db.collection('events').find({}).toArray();
    console.log(`Total events: ${events.length}`);
    
    const eventNames = {};
    events.forEach(e => {
      if (eventNames[e.title]) {
        console.log(`⚠️  DUPLICATE: ${e.title} (IDs: ${eventNames[e.title]}, ${e._id})`);
      } else {
        eventNames[e.title] = e._id;
      }
      console.log(`  - ${e.title} - ID: ${e._id}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
