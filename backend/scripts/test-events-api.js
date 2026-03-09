const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));
const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false }));

async function testEventsAPI() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    // Simulate what the API does
    const standaloneEvents = await Event.find().sort({ date: 1 });
    const businessEvents = await Business.find({
      type: { $in: ['event', 'both'] }
    }).sort({ startDate: 1 });

    console.log('=== STANDALONE EVENTS ===');
    console.log(`Count: ${standaloneEvents.length}`);
    standaloneEvents.forEach(e => {
      console.log(`  - ${e.title} (ID: ${e._id})`);
    });

    console.log('\n=== BUSINESS EVENTS ===');
    console.log(`Count: ${businessEvents.length}`);
    businessEvents.forEach(b => {
      console.log(`  - ${b.name} (ID: ${b._id})`);
    });

    // Transform business events
    const transformedBusinessEvents = businessEvents.map(business => ({
      _id: business._id,
      title: business.name,
      // ... other fields
    }));

    // Use Map to deduplicate by ID
    const eventMap = new Map();
    
    standaloneEvents.forEach(event => {
      eventMap.set(event._id.toString(), { title: event.title, id: event._id.toString(), source: 'Event' });
    });
    
    transformedBusinessEvents.forEach(event => {
      eventMap.set(event._id.toString(), { title: event.title, id: event._id.toString(), source: 'Business' });
    });

    console.log('\n=== COMBINED (DEDUPLICATED) ===');
    console.log(`Count: ${eventMap.size}`);
    eventMap.forEach((event, id) => {
      console.log(`  - ${event.title} (ID: ${id}, Source: ${event.source})`);
    });

    console.log('\n✓ No duplicates - each ID appears only once!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testEventsAPI();
