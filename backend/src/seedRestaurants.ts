import mongoose from 'mongoose';
import { Restaurant } from './models/Restaurant';
import dotenv from 'dotenv';

dotenv.config();

const mockRestaurants = [
  {
    restaurantId: '1',
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
    menu: [
      {
        id: '1',
        name: 'Butter Chicken',
        description: 'Tender chicken in a rich, creamy tomato-based curry',
        price: 450,
        category: 'Main Course',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
        isPopular: true
      },
      {
        id: '2',
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese marinated in spices',
        price: 350,
        category: 'Starters',
        image: 'https://i0.wp.com/cookingfromheart.com/wp-content/uploads/2017/03/Paneer-Tikka-Masala-4.jpg?fit=1024%2C683&ssl=1',
        isVegetarian: true,
        isPopular: true
      },
      {
        id: '3',
        name: 'Naan',
        description: 'Soft, fluffy bread baked in tandoor',
        price: 50,
        category: 'Breads',
        image: '/images/naan-placeholder.svg',
        isVegetarian: true
      }
    ]
  },
  {
    restaurantId: '2',
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
    menu: [
      {
        id: '1',
        name: 'Grilled Fish',
        description: 'Fresh fish marinated in coastal spices and grilled',
        price: 550,
        category: 'Main Course',
        image: 'https://www.licious.in/blog/wp-content/uploads/2020/12/Grilled-Fish.jpg',
        isPopular: true
      },
      {
        id: '2',
        name: 'Prawn Curry',
        description: 'Prawns in a coconut-based curry',
        price: 480,
        category: 'Main Course',
        image: 'https://tse3.mm.bing.net/th?id=OIP.-Aeuiz8Hfp76BAPUmxA2kwHaHa&pid=Api&P=0&h=180'
      }
    ]
  },
  {
    restaurantId: '3',
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
    menu: [
      {
        id: '1',
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice cooked with chicken and aromatic spices',
        price: 350,
        category: 'Main Course',
        image: 'https://tse2.mm.bing.net/th?id=OIP.2iWS4NJfB5y_mu30Nsq_bwHaHa&pid=Api&P=0&h=180',
        isPopular: true
      },
      {
        id: '2',
        name: 'Veg Biryani',
        description: 'Fragrant basmati rice cooked with mixed vegetables and spices',
        price: 250,
        category: 'Main Course',
        image: 'https://tse1.mm.bing.net/th?id=OIP.yh-lYonX_sPwlJA4vNQ6BAHaGL&pid=Api&P=0&h=180',
        isVegetarian: true
      }
    ]
  },
  {
    restaurantId: '4',
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
    menu: [
      { id: '1', name: 'Margherita Pizza', description: 'Classic pizza with tomato sauce and mozzarella', price: 350, category: 'Pizza', image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3', isVegetarian: true, isPopular: true },
      { id: '2', name: 'Pepperoni Pizza', description: 'Pizza topped with pepperoni and cheese', price: 450, category: 'Pizza', image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e', isPopular: true },
      { id: '3', name: 'Pasta Alfredo', description: 'Creamy pasta with parmesan sauce', price: 300, category: 'Pasta', image: 'https://tse3.mm.bing.net/th?id=OIP.9jqS4lZo9mC6mjPnXHQ4cwHaFj&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '4', name: 'Garlic Bread', description: 'Toasted bread with garlic butter', price: 150, category: 'Sides', image: 'https://tse3.mm.bing.net/th?id=OIP.OcsnTuuKcYaB_5LkGhHmdQHaFj&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '5', name: 'Caesar Salad', description: 'Fresh romaine lettuce with Caesar dressing', price: 250, category: 'Salads', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9', isVegetarian: true },
      { id: '6', name: 'Tiramisu', description: 'Classic Italian dessert with coffee and mascarpone', price: 200, category: 'Desserts', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9', isVegetarian: true },
      { id: '7', name: 'Mushroom Pizza', description: 'Pizza topped with mushrooms and cheese', price: 400, category: 'Pizza', image: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9', isVegetarian: true },
      { id: '8', name: 'Pasta Bolognese', description: 'Pasta with meat sauce', price: 350, category: 'Pasta', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9' },
      { id: '9', name: 'Soft Drinks', description: 'Carbonated beverages', price: 80, category: 'Beverages', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', isVegetarian: true },
      { id: '10', name: 'Ice Cream', description: 'Vanilla ice cream with chocolate sauce', price: 150, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb', isVegetarian: true }
    ]
  },
  {
    restaurantId: '5',
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
    menu: [
      { id: '1', name: 'California Roll', description: 'Crab, avocado, and cucumber roll', price: 450, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351', isPopular: true },
      { id: '2', name: 'Salmon Nigiri', description: 'Fresh salmon over pressed sushi rice', price: 350, category: 'Sushi', image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d', isPopular: true },
      { id: '3', name: 'Miso Soup', description: 'Traditional Japanese soup with tofu', price: 150, category: 'Soups', image: 'https://tse4.mm.bing.net/th?id=OIP.DMGbYISswMMAKQr-pKriZAHaDt&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '4', name: 'Tempura Roll', description: 'Shrimp tempura roll with spicy sauce', price: 500, category: 'Sushi', image: 'https://tse4.mm.bing.net/th?id=OIP.GFPGF-3T-FluBuMgdwCpkgHaE8&pid=Api&P=0&h=180' },
      { id: '5', name: 'Edamame', description: 'Steamed soybeans with sea salt', price: 200, category: 'Starters', image: 'https://tse1.mm.bing.net/th?id=OIP.D68BPmu0uKyCNgQG7RvOoQHaLH&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '6', name: 'Ice Cream', description: 'Matcha-flavored ice cream', price: 250, category: 'Desserts', image: 'https://tse2.mm.bing.net/th?id=OIP.oTgRYULZOkr0kJqykSp5iwHaEK&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '7', name: 'Dragon Roll', description: 'Tempura shrimp roll with avocado', price: 550, category: 'Sushi', image: 'https://tse3.mm.bing.net/th?id=OIP.epeYSZ-AR93r0RDkxUZkwgHaFj&pid=Api&P=0&h=180', isPopular: true },
      { id: '8', name: 'Sake', description: 'Japanese rice wine', price: 400, category: 'Beverages', image: 'https://tse4.mm.bing.net/th?id=OIP.k9XPXxEVBTWqcf61g5g5TAHaDt&pid=Api&P=0&h=180' },
      { id: '9', name: 'Vegetable Tempura', description: 'Assorted vegetables in tempura batter', price: 300, category: 'Starters', image: 'https://tse4.mm.bing.net/th?id=OIP.u2hssqUKe0ACtqW1V_5cHAHaES&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '10', name: 'Green Tea', description: 'Traditional Japanese green tea', price: 100, category: 'Beverages', image: 'https://tse3.mm.bing.net/th?id=OIP.RYmprfFf2Lrj3_WZHQR7OAHaEO&pid=Api&P=0&h=180', isVegetarian: true }
    ]
  },
  {
    restaurantId: '6',
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
    menu: [
      { id: '1', name: 'Classic Cheeseburger', description: 'Beef patty with cheese, lettuce, tomato, and special sauce', price: 250, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd', isPopular: true },
      { id: '2', name: 'Chicken Burger', description: 'Grilled chicken patty with lettuce and mayo', price: 220, category: 'Burgers', image: 'https://tse3.mm.bing.net/th?id=OIP.lhiIFT1BibZGXxqGrGUycQHaHa&pid=Api&P=0&h=180' },
      { id: '3', name: 'Veg Burger', description: 'Vegetable patty with lettuce and special sauce', price: 200, category: 'Burgers', image: 'https://tse3.mm.bing.net/th?id=OIP.mCUG88hVQotiSxdyXb847wHaEo&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '4', name: 'French Fries', description: 'Crispy golden fries with seasoning', price: 100, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877', isVegetarian: true },
      { id: '5', name: 'Onion Rings', description: 'Crispy battered onion rings', price: 120, category: 'Sides', image: 'https://tse4.mm.bing.net/th?id=OIP.3EqDCnYUSZZJXQrJjp0pJgHaE8&pid=Api&P=0&h=180', isVegetarian: true },
      { id: '6', name: 'Chocolate Milkshake', description: 'Creamy chocolate milkshake', price: 150, category: 'Beverages', image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767', isVegetarian: true },
      { id: '7', name: 'Chicken Wings', description: 'Spicy fried chicken wings', price: 300, category: 'Starters', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f' },
      { id: '8', name: 'Soft Drinks', description: 'Carbonated beverages', price: 80, category: 'Beverages', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97', isVegetarian: true },
      { id: '9', name: 'Ice Cream', description: 'Vanilla ice cream with chocolate sauce', price: 150, category: 'Desserts', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb', isVegetarian: true },
      { id: '10', name: 'Chicken Nuggets', description: 'Crispy chicken nuggets with dipping sauce', price: 200, category: 'Starters', image: 'https://images.unsplash.com/photo-1562967914-608f82629710' }
    ]
  }
];

const seedRestaurants = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in .env');
    }
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Use the raw MongoDB driver to bypass Mongoose validation
    const db = mongoose.connection.db;
    const collectionName = 'restaurants';

    // Drop the collection if it exists
    const collections = await db.listCollections().toArray();
    if (collections.some(col => col.name === collectionName)) {
      await db.collection(collectionName).drop();
      console.log('Dropped existing restaurants collection');
    }

    // Add timestamps to each restaurant
    const restaurantsWithTimestamps = mockRestaurants.map(restaurant => ({
      ...restaurant,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert using raw MongoDB driver
    const result = await db.collection(collectionName).insertMany(restaurantsWithTimestamps);
    console.log(`Inserted ${result.insertedCount} restaurants successfully`);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedRestaurants(); 