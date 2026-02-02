const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function fixFavorites() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully\n');

    const db = mongoose.connection.db;
    const collection = db.collection('favorites');

    // Show current indexes
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop ALL indexes except _id
    console.log('\nDropping all indexes except _id...');
    const indexNames = indexes
      .map(idx => idx.name)
      .filter(name => name !== '_id_');
    
    for (const indexName of indexNames) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✓ Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Could not drop ${indexName}:`, error.message);
      }
    }

    // Create new proper indexes
    console.log('\nCreating new indexes...');

    // Index 1: For restaurant favorites (userId + restaurantId must be unique)
    try {
      await collection.createIndex(
        { userId: 1, restaurantId: 1 },
        { 
          unique: true,
          partialFilterExpression: { 
            restaurantId: { $exists: true, $ne: null },
            type: 'restaurant'
          },
          name: 'userId_restaurantId_unique'
        }
      );
      console.log('✓ Created unique index: userId_restaurantId_unique');
    } catch (error) {
      console.log('Error creating restaurant index:', error.message);
    }

    // Index 2: For event favorites (userId + eventId must be unique)
    try {
      await collection.createIndex(
        { userId: 1, eventId: 1 },
        { 
          unique: true,
          partialFilterExpression: { 
            eventId: { $exists: true, $ne: null },
            type: 'event'
          },
          name: 'userId_eventId_unique'
        }
      );
      console.log('✓ Created unique index: userId_eventId_unique');
    } catch (error) {
      console.log('Error creating event index:', error.message);
    }

    // Index 3: Non-unique index on userId for queries
    try {
      await collection.createIndex({ userId: 1 }, { name: 'userId_query' });
      console.log('✓ Created query index: userId_query');
    } catch (error) {
      console.log('Error creating userId index:', error.message);
    }

    // Index 4: Index on type for filtering
    try {
      await collection.createIndex({ type: 1 }, { name: 'type_query' });
      console.log('✓ Created query index: type_query');
    } catch (error) {
      console.log('Error creating type index:', error.message);
    }

    // Show final indexes
    console.log('\nFinal indexes:');
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));

    // Clean up any invalid favorites (with null values)
    console.log('\nCleaning up invalid favorites...');
    const deleteResult = await collection.deleteMany({
      $or: [
        { restaurantId: null, eventId: null },
        { restaurantId: { $exists: false }, eventId: { $exists: false } }
      ]
    });
    console.log(`✓ Deleted ${deleteResult.deletedCount} invalid favorites`);

    console.log('\n✓ Favorites indexes fixed successfully!');
    console.log('\nYou can now:');
    console.log('  - Add multiple restaurants to favorites');
    console.log('  - Add multiple events to favorites');
    console.log('  - Each user can only favorite the same item once');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing favorites:', error);
    process.exit(1);
  }
}

fixFavorites();
