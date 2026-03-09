const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

async function listBusinesses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    
    const businesses = await db.collection('businesses').find({}).toArray();
    
    console.log(`Found ${businesses.length} businesses:\n`);
    
    businesses.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`);
      console.log(`   ID: ${business._id}`);
      console.log(`   Type: ${business.type}`);
      console.log(`   Has seatingLayout: ${!!business.seatingLayout}`);
      if (business.seatingLayout && business.seatingLayout.seats) {
        console.log(`   Seats count: ${business.seatingLayout.seats.length}`);
      }
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listBusinesses();
