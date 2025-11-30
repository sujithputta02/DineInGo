const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function fixAllIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully\n');

    const db = mongoose.connection.db;

    // ========== FIX FAVORITES INDEXES ==========
    console.log('========== FIXING FAVORITES INDEXES ==========');
    const favoritesCollection = db.collection('favorites');

    console.log('\nCurrent favorites indexes:');
    const favoritesIndexes = await favoritesCollection.indexes();
    console.log(JSON.stringify(favoritesIndexes, null, 2));

    // Drop problematic unique userId index
    try {
      console.log('\nDropping unique userId_1 index from favorites...');
      await favoritesCollection.dropIndex('userId_1');
      console.log('✓ Successfully dropped userId_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('Index userId_1 does not exist or already dropped');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Create correct compound indexes for favorites
    console.log('\nCreating compound indexes for favorites...');
    
    try {
      await favoritesCollection.createIndex(
        { userId: 1, eventId: 1, type: 1 }, 
        { unique: true, sparse: true, name: 'userId_1_eventId_1_type_1' }
      );
      console.log('✓ Created unique compound index: userId_1_eventId_1_type_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await favoritesCollection.createIndex(
        { userId: 1, restaurantId: 1, type: 1 }, 
        { unique: true, sparse: true, name: 'userId_1_restaurantId_1_type_1' }
      );
      console.log('✓ Created unique compound index: userId_1_restaurantId_1_type_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await favoritesCollection.createIndex({ userId: 1 });
      console.log('✓ Created non-unique index: userId_1');
    } catch (error) {
      console.log('Non-unique userId index may already exist:', error.message);
    }

    console.log('\nFinal favorites indexes:');
    const finalFavoritesIndexes = await favoritesCollection.indexes();
    console.log(JSON.stringify(finalFavoritesIndexes, null, 2));

    // ========== FIX EVENTS INDEXES ==========
    console.log('\n========== FIXING EVENTS INDEXES ==========');
    const eventsCollection = db.collection('events');

    console.log('\nCurrent events indexes:');
    const eventsIndexes = await eventsCollection.indexes();
    console.log(JSON.stringify(eventsIndexes, null, 2));

    // Create useful indexes for events
    console.log('\nCreating indexes for events...');
    
    try {
      await eventsCollection.createIndex({ date: 1 });
      console.log('✓ Created index: date_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await eventsCollection.createIndex({ category: 1 });
      console.log('✓ Created index: category_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await eventsCollection.createIndex({ title: 'text', description: 'text' });
      console.log('✓ Created text index for search');
    } catch (error) {
      console.log('Text index may already exist:', error.message);
    }

    console.log('\nFinal events indexes:');
    const finalEventsIndexes = await eventsCollection.indexes();
    console.log(JSON.stringify(finalEventsIndexes, null, 2));

    // ========== FIX RESTAURANTS INDEXES ==========
    console.log('\n========== FIXING RESTAURANTS INDEXES ==========');
    const restaurantsCollection = db.collection('restaurants');

    console.log('\nCurrent restaurants indexes:');
    const restaurantsIndexes = await restaurantsCollection.indexes();
    console.log(JSON.stringify(restaurantsIndexes, null, 2));

    // Create useful indexes for restaurants
    console.log('\nCreating indexes for restaurants...');
    
    try {
      await restaurantsCollection.createIndex({ 'location.city': 1 });
      console.log('✓ Created index: location.city_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await restaurantsCollection.createIndex({ cuisine: 1 });
      console.log('✓ Created index: cuisine_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await restaurantsCollection.createIndex({ rating: -1 });
      console.log('✓ Created index: rating_-1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await restaurantsCollection.createIndex({ name: 'text', description: 'text' });
      console.log('✓ Created text index for search');
    } catch (error) {
      console.log('Text index may already exist:', error.message);
    }

    console.log('\nFinal restaurants indexes:');
    const finalRestaurantsIndexes = await restaurantsCollection.indexes();
    console.log(JSON.stringify(finalRestaurantsIndexes, null, 2));

    // ========== FIX BOOKINGS INDEXES ==========
    console.log('\n========== FIXING BOOKINGS INDEXES ==========');
    const bookingsCollection = db.collection('bookings');

    console.log('\nCurrent bookings indexes:');
    const bookingsIndexes = await bookingsCollection.indexes();
    console.log(JSON.stringify(bookingsIndexes, null, 2));

    // Create useful indexes for bookings
    console.log('\nCreating indexes for bookings...');
    
    try {
      await bookingsCollection.createIndex({ userId: 1, date: 1 });
      console.log('✓ Created index: userId_1_date_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await bookingsCollection.createIndex({ status: 1 });
      console.log('✓ Created index: status_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    try {
      await bookingsCollection.createIndex({ date: 1, time: 1 });
      console.log('✓ Created index: date_1_time_1');
    } catch (error) {
      console.log('Index may already exist:', error.message);
    }

    console.log('\nFinal bookings indexes:');
    const finalBookingsIndexes = await bookingsCollection.indexes();
    console.log(JSON.stringify(finalBookingsIndexes, null, 2));

    console.log('\n✓ All indexes fixed successfully!');
    console.log('\nSummary:');
    console.log('  - Favorites: Fixed unique constraint issue');
    console.log('  - Events: Added search and filter indexes');
    console.log('  - Restaurants: Added search and filter indexes');
    console.log('  - Bookings: Added query optimization indexes');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixAllIndexes();
