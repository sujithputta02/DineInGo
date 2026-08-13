import mongoose from 'mongoose';
import AllUserNotification from './models/AllUserNotification';
import Broadcast from './models/Broadcast';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Get unique broadcasts from AllUserNotification
    // We group by title and message as a heuristic for unique broadcast events
    const legacyBroadcasts = await AllUserNotification.aggregate([
      {
        $group: {
          _id: { title: '$title', message: '$message', type: '$type' },
          sentBy: { $first: '$sentBy' },
          createdAt: { $min: '$createdAt' },
          recipientCount: { $sum: 1 }
        }
      }
    ]);

    console.log(`Found ${legacyBroadcasts.length} legacy broadcast patterns.`);

    let migratedCount = 0;
    for (const legacy of legacyBroadcasts) {
      // Check if already exists in Broadcast
      const exists = await Broadcast.findOne({ 
        title: legacy._id.title, 
        message: legacy._id.message 
      });

      if (!exists) {
        await Broadcast.create({
          title: legacy._id.title,
          message: legacy._id.message,
          type: legacy._id.type || 'info',
          targetType: 'all', // We assume AllUserNotification was for all
          recipientCount: legacy.recipientCount,
          sentBy: legacy.sentBy || 'system',
          createdAt: legacy.createdAt
        });
        migratedCount++;
      }
    }

    console.log(`Migration complete. Created ${migratedCount} new broadcast logs.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
