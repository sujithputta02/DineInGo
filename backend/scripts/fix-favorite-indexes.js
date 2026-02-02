const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const db = mongoose.connection.db;
    const collection = db.collection('favorites');

    // Get all indexes
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop the problematic userId_1 index if it exists
    try {
      console.log('\nDropping userId_1 index...');
      await collection.dropIndex('userId_1');
      console.log('✓ Successfully dropped userId_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('Index userId_1 does not exist (already dropped or never created)');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Create the correct compound indexes
    console.log('\nCreating compound indexes...');
    
    try {
      await collection.createIndex({ userId: 1, eventId: 1 }, { sparse: true });
      console.log('✓ Created index: userId_1_eventId_1');
    } catch (error) {
      console.log('Index userId_1_eventId_1 may already exist:', error.message);
    }

    try {
      await collection.createIndex({ userId: 1, restaurantId: 1 }, { sparse: true });
      console.log('✓ Created index: userId_1_restaurantId_1');
    } catch (error) {
      console.log('Index userId_1_restaurantId_1 may already exist:', error.message);
    }

    // Create a simple non-unique index on userId for queries
    try {
      await collection.createIndex({ userId: 1 });
      console.log('✓ Created non-unique index: userId_1');
    } catch (error) {
      console.log('Non-unique userId index may already exist:', error.message);
    }

    // Show final indexes
    console.log('\nFinal indexes:');
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    console.log('\n✓ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixIndexes();
