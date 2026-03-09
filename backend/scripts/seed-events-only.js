const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dineingoapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Event Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  registeredCount: { type: Number, default: 0 },
  price: { type: Number, required: true },
  imageUrl: String,
  category: String,
  organizer: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

const events = [
  {
    title: 'Wine Tasting Experience',
    description: 'Join us for an exclusive wine tasting event featuring premium wines from around the world. Expert sommeliers will guide you through the tasting experience.',
    date: new Date('2026-01-26'),
    startDate: new Date('2026-01-26'),
    endDate: new Date('2026-01-26'),
    time: '7:00 PM',
    location: 'The Wine Cellar, Indiranagar, Bangalore',
    capacity: 97,
    registeredCount: 0,
    price: 500,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3',
    category: 'Food & Wine',
    organizer: 'Wine Enthusiasts Club'
  },
  {
    title: 'Bangalore Food Festival',
    description: 'Experience the best of Bangalore cuisine. Over 50 vendors serving authentic regional delicacies, live music, and cooking demonstrations.',
    date: new Date('2026-03-15'),
    startDate: new Date('2026-03-15'),
    endDate: new Date('2026-03-17'),
    time: '11:00 AM',
    location: 'Palace Grounds, Bangalore',
    capacity: 500,
    registeredCount: 0,
    price: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    category: 'Food Festival',
    organizer: 'Bangalore Food Council'
  },
  {
    title: 'Craft Beer Workshop',
    description: 'Sample unique craft beers from local breweries. Meet the brewers and learn about the brewing process in this hands-on workshop.',
    date: new Date('2026-02-20'),
    startDate: new Date('2026-02-20'),
    endDate: new Date('2026-02-20'),
    time: '6:00 PM',
    location: '1001 Brewpub, Indiranagar, Bangalore',
    capacity: 60,
    registeredCount: 0,
    price: 300,
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13',
    category: 'Workshop',
    organizer: 'Craft Beer Association'
  },
  {
    title: 'South Indian Cooking Masterclass',
    description: 'Learn authentic South Indian recipes from expert chefs. Master dosas, idlis, sambhar, and traditional chutneys in this hands-on class.',
    date: new Date('2026-03-05'),
    startDate: new Date('2026-03-05'),
    endDate: new Date('2026-03-05'),
    time: '2:00 PM',
    location: 'Culinary Academy, Koramangala, Bangalore',
    capacity: 30,
    registeredCount: 0,
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0',
    category: 'Cooking Class',
    organizer: 'South Indian Culinary Institute'
  },
  {
    title: 'Coffee Cupping Session',
    description: 'Discover the art of coffee tasting. Learn to identify flavor notes, aromas, and quality in specialty coffees from around the world.',
    date: new Date('2026-03-12'),
    startDate: new Date('2026-03-12'),
    endDate: new Date('2026-03-12'),
    time: '10:00 AM',
    location: 'Third Wave Coffee Roasters, MG Road, Bangalore',
    capacity: 40,
    registeredCount: 0,
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
    category: 'Tasting',
    organizer: 'Third Wave Coffee'
  }
];

async function seedEvents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✓ Connected successfully\n');

    console.log('Clearing existing events...');
    await Event.deleteMany({});
    console.log('✓ Cleared events\n');

    console.log('Seeding events...');
    const createdEvents = await Event.insertMany(events);
    console.log(`✓ Created ${createdEvents.length} events:\n`);
    createdEvents.forEach(e => {
      console.log(`  - ${e.title} (ID: ${e._id})`);
      if (e.startDate && e.endDate) {
        const start = e.startDate.toLocaleDateString();
        const end = e.endDate.toLocaleDateString();
        if (start === end) {
          console.log(`    Date: ${start}`);
        } else {
          console.log(`    Dates: ${start} - ${end}`);
        }
      }
      console.log(`    Capacity: ${e.capacity}, Price: ₹${e.price}`);
      console.log('');
    });

    console.log(`\n✓ Successfully seeded ${createdEvents.length} events!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding events:', error);
    process.exit(1);
  }
}

seedEvents();
