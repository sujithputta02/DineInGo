import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from '../config';

let client: MongoClient | null = null;

export async function connectToDatabase() {
  try {
    if (client) {
      return client.db(config.mongodb.dbName);
    }

    client = new MongoClient(config.mongodb.uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    // Test the connection
    await client.db(config.mongodb.dbName).command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
    
    return client.db(config.mongodb.dbName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

export async function closeDatabaseConnection() {
  try {
    if (client) {
      await client.close();
      client = null;
      console.log("Disconnected from MongoDB Atlas");
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  }
}

// Ensure the connection is closed when the application exits
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

export { client }; 