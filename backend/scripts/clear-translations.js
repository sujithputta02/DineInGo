const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function clear() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is missing in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected. Clearing translations collection...');
    
    // We use the collection name directly to avoid needing the Model definition
    const result = await mongoose.connection.collection('translations').deleteMany({});
    
    console.log(`Successfully cleared ${result.deletedCount} stale translations.`);
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clear();
