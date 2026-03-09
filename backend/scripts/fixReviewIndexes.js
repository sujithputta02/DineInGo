const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('reviews');

        // Get existing indexes
        const indexes = await collection.indexes();
        console.log('Existing indexes:', indexes.map(i => i.name));

        // Drop the problematic index
        try {
            await collection.dropIndex('bookingId_1_userId_1');
            console.log('Dropped bookingId_1_userId_1 index');
        } catch (error) {
            console.log('Index bookingId_1_userId_1 does not exist or already dropped');
        }

        // Drop the eventId index if it exists
        try {
            await collection.dropIndex('eventId_1_userId_1');
            console.log('Dropped eventId_1_userId_1 index');
        } catch (error) {
            console.log('Index eventId_1_userId_1 does not exist or already dropped');
        }

        // Create new indexes with partial filter (only check existence)
        await collection.createIndex(
            { bookingId: 1, userId: 1 },
            { 
                unique: true,
                partialFilterExpression: { bookingId: { $type: 'objectId' } },
                name: 'bookingId_1_userId_1_partial'
            }
        );
        console.log('Created new bookingId_1_userId_1_partial index');

        await collection.createIndex(
            { eventId: 1, userId: 1 },
            { 
                unique: true,
                partialFilterExpression: { eventId: { $type: 'objectId' } },
                name: 'eventId_1_userId_1_partial'
            }
        );
        console.log('Created new eventId_1_userId_1_partial index');

        // Show final indexes
        const finalIndexes = await collection.indexes();
        console.log('\nFinal indexes:', finalIndexes.map(i => i.name));

        console.log('\n✅ Indexes fixed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

fixIndexes();
