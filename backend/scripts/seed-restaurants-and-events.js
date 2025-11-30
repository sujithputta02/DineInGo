const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

// Restaurant Schema
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: [String],
  address: String,
  rating: Number,
  image: String,
  location: {
    city: String,
    state: String,
    country: String
  },
  priceLevel: Number,
  openNow: Boolean,
  phoneNumber: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Event Schema
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
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

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Event = mongoose.model('Event', eventSchema);

const restaurants = [
  {
    name: 'Spice Garden',
    cuisine: ['Indian', 'North Indian'],
    address: 'MG Road, Bangalore',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 3,
    openNow: true,
    phoneNumber: '+91-9876543210',
    description: 'Authentic North Indian cuisine with a modern twist'
  },
  {
    name: 'The Coastal Kitchen',
    cuisine: ['Seafood', 'Coastal'],
    address: 'Indiranagar, Bangalore',
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 2,
    openNow: true,
    phoneNumber: '+91-9876543211',
    description: 'Fresh seafood and coastal delicacies'
  },
  {
    name: 'Biryani House',
    cuisine: ['Indian', 'Biryani'],
    address: 'Koramangala, Bangalore',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 2,
    openNow: true,
    phoneNumber: '+91-9876543212',
    description: 'Aromatic biryanis and traditional Indian rice dishes'
  },
  {
    name: 'Pizza Paradise',
    cuisine: ['Italian', 'Pizza'],
    address: 'Whitefield, Bangalore',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 2,
    openNow: true,
    phoneNumber: '+91-9876543213',
    description: 'Wood-fired pizzas and authentic Italian cuisine'
  },
  {
    name: 'Sushi Master',
    cuisine: ['Japanese', 'Sushi'],
    address: 'UB City, Bangalore',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 4,
    openNow: true,
    phoneNumber: '+91-9876543214',
    description: 'Premium sushi and Japanese delicacies'
  },
  {
    name: 'Burger Junction',
    cuisine: ['American', 'Burgers'],
    address: 'Marathahalli, Bangalore',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    priceLevel: 2,
    openNow: true,
    phoneNumber: '+91-9876543215',
    description: 'Gourmet burgers and American comfort food'
  }
];

const events = [
  {
    title: 'Wine Tasting Evening',
    description: 'Join us for an exclusive wine tasting event featuring premium wines from around the world. Expert sommeliers will guide you through the tasting experience.',
    date: new Date('2025-12-15'),
    time: '19:00',
    location: 'The Wine Cellar, UB City, Bangalore',
    capacity: 50,
    registeredCount: 12,
    price: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3',
    category: 'Wine & Spirits',
    organizer: 'Wine Enthusiasts Club'
  },
  {
    title: 'Italian Cooking Masterclass',
    description: 'Learn to cook authentic Italian dishes from a Michelin-starred chef. Hands-on experience with pasta making, risotto, and tiramisu.',
    date: new Date('2025-12-20'),
    time: '15:00',
    location: 'Culinary Institute, Indiranagar, Bangalore',
    capacity: 30,
    registeredCount: 18,
    price: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d',
    category: 'Cooking Class',
    organizer: 'Chef Marco Rossi'
  },
  {
    title: 'Street Food Festival',
    description: 'Experience the best street food from across India. Over 50 vendors serving authentic regional delicacies.',
    date: new Date('2025-12-25'),
    time: '12:00',
    location: 'Cubbon Park, Bangalore',
    capacity: 500,
    registeredCount: 234,
    price: 500,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    category: 'Food Festival',
    organizer: 'Bangalore Food Council'
  },
  {
    title: 'Craft Beer Tasting',
    description: 'Sample unique craft beers from local breweries. Meet the brewers and learn about the brewing process.',
    date: new Date('2026-01-05'),
    time: '18:00',
    location: 'Brewhouse, Koramangala, Bangalore',
    capacity: 40,
    registeredCount: 8,
    price: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13',
    category: 'Beer & Brewing',
    organizer: 'Craft Beer Association'
  },
  {
    title: 'Vegan Food Workshop',
    description: 'Discover delicious plant-based recipes and learn about sustainable eating. Includes a 3-course vegan meal.',
    date: new Date('2026-01-10'),
    time: '11:00',
    location: 'Green Kitchen, Whitefield, Bangalore',
    capacity: 25,
    registeredCount: 15,
    price: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    category: 'Workshop',
    organizer: 'Vegan Society Bangalore'
  },
  {
    title: 'Chocolate Making Workshop',
    description: 'Learn the art of chocolate making from bean to bar. Create your own chocolate bars to take home.',
    date: new Date('2026-01-15'),
    time: '14:00',
    location: 'Chocolate Factory, MG Road, Bangalore',
    capacity: 20,
    registeredCount: 11,
    price: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834',
    category: 'Workshop',
    organizer: 'Artisan Chocolatiers'
  },
  {
    title: 'Farm to Table Dinner',
    description: 'Experience a multi-course dinner featuring organic ingredients sourced directly from local farms.',
    date: new Date('2026-01-20'),
    time: '19:30',
    location: 'Organic Farm Restaurant, Outskirts of Bangalore',
    capacity: 35,
    registeredCount: 22,
    price: 4500,
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
    category: 'Fine Dining',
    organizer: 'Farm Fresh Collective'
  },
  {
    title: 'BBQ & Grill Masterclass',
    description: 'Master the art of BBQ and grilling. Learn smoking techniques, marinades, and perfect timing.',
    date: new Date('2026-01-25'),
    time: '16:00',
    location: 'BBQ Pit, Sarjapur Road, Bangalore',
    capacity: 30,
    registeredCount: 19,
    price: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    category: 'Cooking Class',
    organizer: 'Grill Masters India'
  },
  {
    title: 'Asian Street Food Night',
    description: 'Explore the flavors of Asia with authentic street food from Thailand, Vietnam, Korea, and Japan.',
    date: new Date('2026-02-01'),
    time: '18:30',
    location: 'Food Court, Brigade Road, Bangalore',
    capacity: 100,
    registeredCount: 45,
    price: 800,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    category: 'Food Festival',
    organizer: 'Asian Food Network'
  },
  {
    title: 'Coffee Cupping Session',
    description: 'Learn about specialty coffee, roasting profiles, and brewing methods. Professional cupping session included.',
    date: new Date('2026-02-05'),
    time: '10:00',
    location: 'Third Wave Coffee, Indiranagar, Bangalore',
    capacity: 15,
    registeredCount: 9,
    price: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
    category: 'Workshop',
    organizer: 'Coffee Connoisseurs'
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully\n');

    // Clear existing data
    console.log('Clearing existing restaurants...');
    await Restaurant.deleteMany({});
    console.log('✓ Cleared restaurants\n');

    console.log('Clearing existing events...');
    await Event.deleteMany({});
    console.log('✓ Cleared events\n');

    // Seed restaurants
    console.log('Seeding restaurants...');
    const createdRestaurants = await Restaurant.insertMany(restaurants);
    console.log(`✓ Created ${createdRestaurants.length} restaurants:`);
    createdRestaurants.forEach(r => {
      console.log(`  - ${r.name} (ID: ${r._id})`);
    });
    console.log();

    // Seed events
    console.log('Seeding events...');
    const createdEvents = await Event.insertMany(events);
    console.log(`✓ Created ${createdEvents.length} events:`);
    createdEvents.forEach(e => {
      console.log(`  - ${e.title} (ID: ${e._id})`);
    });
    console.log();

    console.log('✓ Database seeding completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  Restaurants: ${createdRestaurants.length}`);
    console.log(`  Events: ${createdEvents.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
