import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function testConnection() {
    const client = new MongoClient(uri);
    
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        await client.connect();
        
        console.log('Connected successfully. Testing database access...');
        const db = client.db('dineingo');
        await db.command({ ping: 1 });
        
        console.log('Database ping successful! Connection is working.');
    } catch (err) {
        console.error('Connection test failed:', err);
    } finally {
        await client.close();
    }
}

testConnection().catch(console.error); 