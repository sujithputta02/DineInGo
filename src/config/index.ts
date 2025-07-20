import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'dineingo'
  }
}; 