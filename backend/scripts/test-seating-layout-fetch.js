const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Business } = require('../dist/models/Business');

async function testSeatingLayoutFetch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all businesses with type 'event' or 'both'
    const businesses = await Business.find({
      type: { $in: ['event', 'both'] }
    }).limit(5);

    console.log(`\n📊 Found ${businesses.length} event businesses\n`);

    businesses.forEach((business, index) => {
      console.log(`\n--- Business ${index + 1}: ${business.name} ---`);
      console.log(`ID: ${business._id}`);
      console.log(`Type: ${business.type}`);
      console.log(`Has seatingLayout: ${!!business.seatingLayout}`);
      
      if (business.seatingLayout) {
        console.log('\n🎭 Seating Layout Structure:');
        
        // Check if wrapped in eventConfig
        if (business.seatingLayout.eventConfig) {
          console.log('  ✓ Wrapped in eventConfig (EventSeatingDesigner format)');
          const config = business.seatingLayout.eventConfig;
          
          console.log(`  - Individual Seats: ${config.individualSeats?.length || 0}`);
          console.log(`  - Grid Seats: ${config.seatingLayout?.seats?.length || 0}`);
          console.log(`  - Sections: ${config.seatingLayout?.sections?.length || 0}`);
          console.log(`  - Concert Areas: ${config.concertAreas?.length || 0}`);
          
          // Show sample individual seat if exists
          if (config.individualSeats && config.individualSeats.length > 0) {
            console.log('\n  📍 Sample Individual Seat:');
            const sample = config.individualSeats[0];
            console.log(`     ID: ${sample.id}`);
            console.log(`     Label: ${sample.label}`);
            console.log(`     Position: (${sample.x}%, ${sample.y}%)`);
            console.log(`     Tier: ${sample.tier}`);
            console.log(`     Price: ₹${sample.price}`);
          }
          
          // Show sample concert area if exists
          if (config.concertAreas && config.concertAreas.length > 0) {
            console.log('\n  🎪 Sample Concert Area:');
            const sample = config.concertAreas[0];
            console.log(`     ID: ${sample.id}`);
            console.log(`     Name: ${sample.name}`);
            console.log(`     Capacity: ${sample.capacity}`);
            console.log(`     Price: ₹${sample.price}`);
          }
        } else if (business.seatingLayout.seats || business.seatingLayout.areas) {
          console.log('  ✓ Direct format (already normalized)');
          console.log(`  - Seats: ${business.seatingLayout.seats?.length || 0}`);
          console.log(`  - Sections: ${business.seatingLayout.sections?.length || 0}`);
          console.log(`  - Areas: ${business.seatingLayout.areas?.length || 0}`);
        } else {
          console.log('  ⚠️  Unknown seating layout format');
          console.log('  Keys:', Object.keys(business.seatingLayout));
        }
      } else {
        console.log('  ⚠️  No seating layout configured');
      }
    });

    console.log('\n\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testSeatingLayoutFetch();
