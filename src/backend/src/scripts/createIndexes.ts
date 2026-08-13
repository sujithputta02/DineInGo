import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // ========================================
    // USER COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating User indexes...');
    const usersCollection = db.collection('users');
    
    await usersCollection.createIndex({ email: 1 }, { unique: true, background: true });
    await usersCollection.createIndex({ uid: 1 }, { unique: true, background: true });
    await usersCollection.createIndex({ phoneNumber: 1 }, { sparse: true, background: true });
    
    console.log('✅ User indexes created\n');

    // ========================================
    // RESTAURANT COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Restaurant indexes...');
    const restaurantsCollection = db.collection('restaurants');
    
    // Geospatial index for location-based searches
    await restaurantsCollection.createIndex({ location: "2dsphere" }, { background: true });
    
    // Text search index for restaurant search
    await restaurantsCollection.createIndex(
      { name: "text", cuisine: "text", description: "text" }, 
      { 
        weights: { name: 10, cuisine: 5, description: 1 },
        background: true 
      }
    );
    
    // Status and category filters
    await restaurantsCollection.createIndex({ status: 1, category: 1 }, { background: true });
    await restaurantsCollection.createIndex({ ownerId: 1 }, { background: true });
    
    console.log('✅ Restaurant indexes created\n');

    // ========================================
    // BOOKING COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Booking indexes...');
    const bookingsCollection = db.collection('tablebookings');
    
    // User booking history
    await bookingsCollection.createIndex({ userId: 1, date: -1 }, { background: true });
    
    // Restaurant availability queries
    await bookingsCollection.createIndex({ restaurantId: 1, date: 1, time: 1 }, { background: true });
    
    // Status-based queries
    await bookingsCollection.createIndex({ status: 1, date: 1 }, { background: true });
    
    // Auto-confirm optimization
    await bookingsCollection.createIndex({ status: 1, autoConfirmAt: 1 }, { background: true });
    
    console.log('✅ Booking indexes created\n');

    // ========================================
    // MENU COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Menu indexes...');
    const menuCollection = db.collection('menuitems');
    
    await menuCollection.createIndex({ restaurantId: 1, category: 1 }, { background: true });
    await menuCollection.createIndex({ restaurantId: 1, isAvailable: 1 }, { background: true });
    
    console.log('✅ Menu indexes created\n');

    // ========================================
    // EVENT COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Event indexes...');
    const eventsCollection = db.collection('events');
    
    await eventsCollection.createIndex({ restaurantId: 1, eventDate: -1 }, { background: true });
    await eventsCollection.createIndex({ status: 1, eventDate: 1 }, { background: true });
    
    console.log('✅ Event indexes created\n');

    // ========================================
    // FOOD SCANS COLLECTION INDEXES (AR Menu)
    // ========================================
    console.log('📝 Creating Food Scan indexes...');
    const foodScansCollection = db.collection('foodscans');
    
    // User history queries
    await foodScansCollection.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    
    // Learning system queries
    await foodScansCollection.createIndex({ correctedName: 1 }, { sparse: true, background: true });
    await foodScansCollection.createIndex({ "metadata.ocrText": 1 }, { sparse: true, background: true });
    
    console.log('✅ Food Scan indexes created\n');

    // ========================================
    // FAVORITES COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Favorites indexes...');
    const favoritesCollection = db.collection('favorites');
    
    await favoritesCollection.createIndex({ userId: 1 }, { background: true });
    await favoritesCollection.createIndex({ userId: 1, restaurantId: 1 }, { unique: true, background: true });
    
    console.log('✅ Favorites indexes created\n');

    // ========================================
    // WAITLIST COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating Waitlist indexes...');
    const waitlistCollection = db.collection('waitlists');
    
    await waitlistCollection.createIndex({ restaurantId: 1, date: 1, status: 1 }, { background: true });
    await waitlistCollection.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    
    console.log('✅ Waitlist indexes created\n');

    // ========================================
    // PREORDER COLLECTION INDEXES
    // ========================================
    console.log('📝 Creating PreOrder indexes...');
    const preOrderCollection = db.collection('preorders');
    
    await preOrderCollection.createIndex({ restaurantId: 1, pickupDate: 1 }, { background: true });
    await preOrderCollection.createIndex({ userId: 1, createdAt: -1 }, { background: true });
    await preOrderCollection.createIndex({ status: 1 }, { background: true });
    
    console.log('✅ PreOrder indexes created\n');

    // ========================================
    // VERIFY ALL INDEXES
    // ========================================
    console.log('\n🔍 Verifying indexes...\n');
    
    const collections = [
      'users',
      'restaurants', 
      'tablebookings',
      'menuitems',
      'events',
      'foodscans',
      'favorites',
      'waitlists',
      'preorders'
    ];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      console.log(`📊 ${collectionName}: ${indexes.length} indexes`);
    }

    console.log('\n🎉 All indexes created successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Verify query performance with .explain("executionStats")');
    console.log('2. Monitor MongoDB Atlas performance metrics');
    console.log('3. Implement Redis caching (see REDIS_SETUP.md)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
