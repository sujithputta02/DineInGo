const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function testQuery() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const eventId = '69a16c3da533a41ddbb7b292';
    console.log(`Testing query for ID: ${eventId}\n`);

    // Test with mongoose model
    const Business = mongoose.model('Business', new mongoose.Schema({}, { strict: false, collection: 'businesses' }));
    
    console.log('1. Testing findById with string:');
    let result = await Business.findById(eventId);
    console.log('   Result:', result ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n2. Testing findById with ObjectId:');
    result = await Business.findById(new mongoose.Types.ObjectId(eventId));
    console.log('   Result:', result ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n3. Testing findOne with _id:');
    result = await Business.findOne({ _id: eventId });
    console.log('   Result:', result ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n4. Testing findOne with ObjectId:');
    result = await Business.findOne({ _id: new mongoose.Types.ObjectId(eventId) });
    console.log('   Result:', result ? 'FOUND' : 'NOT FOUND');
    
    if (result) {
      console.log('\n=== FOUND BUSINESS ===');
      console.log('Name:', result.name);
      console.log('Type:', result.type);
      console.log('Has seatingLayout:', !!result.seatingLayout);
      if (result.seatingLayout) {
        console.log('Sections:', result.seatingLayout.sections?.length || 0);
        console.log('Seats:', result.seatingLayout.seats?.length || 0);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();
