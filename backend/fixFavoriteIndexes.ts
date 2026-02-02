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

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully\n');

    console.log('Step 1: Dropping all existing indexes...');
    await Favorite.collection.dropIndexes();
    console.log('✅ All indexes dropped\n');

    console.log('Step 2: Recreating indexes with correct configuration...');
    await Favorite.createIndexes();
    console.log('✅ Indexes recreated successfully\n');

    console.log('Step 3: Listing current indexes...');
    const indexes = await Favorite.collection.indexes();
    console.log('Current indexes:');
    indexes.forEach((index: any) => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(unique)' : '');
      if (index.partialFilterExpression) {
        console.log('    Partial filter:', JSON.stringify(index.partialFilterExpression));
      }
    });

    console.log('\n✅ Index fix completed successfully!');
    console.log('\nYou can now use favorites without duplicate key errors.');

    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Fix failed:');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixIndexes();
