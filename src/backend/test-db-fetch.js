// Test script to check if we can fetch restaurants from DB
require('dotenv').config();
const mongoose = require('mongoose');

async function testFetch() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');

    // Try to fetch businesses
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }), 'businesses');
    const businesses = await Business.find({ isActive: true }).limit(5).lean();
    
    console.log('\n📊 Found businesses:', businesses.length);
    businesses.forEach(b => {
      console.log(`  - ${b.name} (${b.cuisine || 'No cuisine'})`);
    });

    // Try to fetch events
    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }), 'events');
    const events = await Event.find({}).limit(5).lean();
    
    console.log('\n🎉 Found events:', events.length);
    events.forEach(e => {
      console.log(`  - ${e.name || e.title} (${e.category || 'No category'})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testFetch();
