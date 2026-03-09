const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp');

const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

// Sample seating layouts for different event types
const theaterSeating = {
  rows: 8,
  columns: 10,
  seats: []
};

// Generate theater-style seating
for (let row = 0; row < 8; row++) {
  const rowLabel = String.fromCharCode(65 + row); // A, B, C, etc.
  for (let col = 1; col <= 10; col++) {
    const tier = row < 2 ? 'vip' : row < 5 ? 'premium' : 'standard';
    const price = tier === 'vip' ? 500 : tier === 'premium' ? 300 : 150;
    
    theaterSeating.seats.push({
      id: `${rowLabel}${col}`,
      rowLabel: rowLabel,
      number: col,
      status: 'available',
      tier: tier,
      price: price
    });
  }
}

const concertSeating = {
  rows: 10,
  columns: 15,
  seats: []
};

// Generate concert-style seating
for (let row = 0; row < 10; row++) {
  const rowLabel = String.fromCharCode(65 + row);
  for (let col = 1; col <= 15; col++) {
    const tier = row < 3 ? 'vip' : row < 7 ? 'premium' : 'standard';
    const price = tier === 'vip' ? 1500 : tier === 'premium' ? 1000 : 500;
    
    concertSeating.seats.push({
      id: `${rowLabel}${col}`,
      rowLabel: rowLabel,
      number: col,
      status: 'available',
      tier: tier,
      price: price
    });
  }
}

const workshopSeating = {
  rows: 5,
  columns: 6,
  seats: []
};

// Generate workshop-style seating
for (let row = 0; row < 5; row++) {
  const rowLabel = String.fromCharCode(65 + row);
  for (let col = 1; col <= 6; col++) {
    workshopSeating.seats.push({
      id: `${rowLabel}${col}`,
      rowLabel: rowLabel,
      number: col,
      status: 'available',
      tier: 'standard',
      price: 300
    });
  }
}

async function addSeatingLayouts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected\n');

    const events = await Event.find({});
    console.log(`Found ${events.length} events\n`);

    for (const event of events) {
      let seatingLayout = null;
      let hasSeating = false;

      // Assign seating based on event title/category
      if (event.title.includes('Wine') || event.title.includes('Beer') || event.title.includes('Coffee')) {
        seatingLayout = workshopSeating;
        hasSeating = true;
        console.log(`✓ Added workshop seating to: ${event.title}`);
      } else if (event.title.includes('Festival') || event.title.includes('Concert')) {
        seatingLayout = concertSeating;
        hasSeating = true;
        console.log(`✓ Added concert seating to: ${event.title}`);
      } else if (event.title.includes('Cooking') || event.title.includes('Masterclass')) {
        seatingLayout = workshopSeating;
        hasSeating = true;
        console.log(`✓ Added workshop seating to: ${event.title}`);
      }

      if (seatingLayout) {
        await Event.updateOne(
          { _id: event._id },
          { 
            $set: { 
              hasSeating: hasSeating,
              seatingLayout: seatingLayout
            }
          }
        );
      }
    }

    console.log('\n✓ All events updated with seating layouts!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSeatingLayouts();
