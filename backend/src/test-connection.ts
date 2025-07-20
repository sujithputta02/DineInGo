import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://dineingo_admin:DineInGo2024Secure!@dineingo.alnkgkg.mongodb.net/?retryWrites=true&w=majority";

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