import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Favorite } from './src/models/Favorite';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function testFavorites() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully\n');

    const testUserId = 'test-user-123';
    const testEventId = '507f1f77bcf86cd799439011'; // Example MongoDB ObjectId

    console.log('Test 1: Creating event favorite...');
    const eventFavorite = new Favorite({
      userId: testUserId,
      eventId: testEventId,
      type: 'event'
    });

    await eventFavorite.save();
    console.log('✅ Event favorite created successfully');
    console.log('   ID:', eventFavorite._id);

    console.log('\nTest 2: Finding favorites for user...');
    const favorites = await Favorite.find({ userId: testUserId });
    console.log('✅ Found', favorites.length, 'favorite(s)');

    console.log('\nTest 3: Removing favorite...');
    await Favorite.deleteOne({ _id: eventFavorite._id });
    console.log('✅ Favorite removed successfully');

    console.log('\n✅ All tests passed!');

    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Test failed:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.errors) {
      console.error('Validation errors:', err.errors);
    }
    process.exit(1);
  }
}

testFavorites();
