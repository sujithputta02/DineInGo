const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully\n');

    const db = mongoose.connection.db;
    const collection = db.collection('favorites');

    console.log('Creating unique compound indexes...\n');

    // Create unique index for restaurant favorites
    // This prevents a user from favoriting the same restaurant twice
    try {
      await collection.createIndex(
        { userId: 1, restaurantId: 1 },
        { 
          unique: true,
          partialFilterExpression: { 
            restaurantId: { $type: 'string' }
          },
          name: 'userId_restaurantId_unique'
        }
      );
      console.log('✓ Created unique index: userId_restaurantId_unique');
    } catch (error) {
      console.log('Restaurant index:', error.message);
    }

    // Create unique index for event favorites
    // This prevents a user from favoriting the same event twice
    try {
      await collection.createIndex(
        { userId: 1, eventId: 1 },
        { 
          unique: true,
          partialFilterExpression: { 
            eventId: { $type: 'string' }
          },
          name: 'userId_eventId_unique'
        }
      );
      console.log('✓ Created unique index: userId_eventId_unique');
    } catch (error) {
      console.log('Event index:', error.message);
    }

    // Show final indexes
    console.log('\nFinal indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✓ Indexes created successfully!');
    console.log('\nNow you can add favorites without duplicate errors.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
