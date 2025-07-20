import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Create a cached connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Connect to MongoDB with connection caching
 * This prevents multiple connections in development with hot reloading
 */
export async function connectToMongoDB() {
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Error connecting to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDBConnection() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('MongoDB connection closed successfully');
  }
}

/**
 * Test MongoDB connection
 */
export async function testMongoDBConnection() {
  try {
    const mongoose = await connectToMongoDB();
    if (mongoose.connection && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log('Pinged your deployment. You successfully connected to MongoDB!');
      return true;
    } else {
      throw new Error('MongoDB connection not established properly');
    }
  } catch (error) {
    console.error('Error testing MongoDB connection:', error);
    throw error;
  }
}

export default connectToMongoDB;
