import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Event } from './src/models/Event';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

async function verifySeatCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully\n');

    const events = await Event.find({ hasSeating: true });

    console.log('📊 Event Seating Verification:\n');
    console.log('='.repeat(80));

    events.forEach((event: any) => {
      const actualSeats = event.seatingLayout?.seats?.length || 0;
      const capacity = event.capacity;
      const match = actualSeats === capacity ? '✅' : '❌';

      console.log(`\n${match} ${event.title}`);
      console.log(`   Capacity: ${capacity}`);
      console.log(`   Actual Seats: ${actualSeats}`);
      console.log(`   Difference: ${actualSeats - capacity}`);
      
      if (event.seatingLayout) {
        console.log(`   Layout: ${event.seatingLayout.rows} rows × ${event.seatingLayout.columns} columns`);
      }
    });

    console.log('\n' + '='.repeat(80));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verifySeatCounts();
