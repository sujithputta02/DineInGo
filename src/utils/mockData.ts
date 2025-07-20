import { Restaurant, Event, Booking } from '../types';

export const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'Spice Garden',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
    cuisine: ['Indian', 'North Indian'],
    priceLevel: 3,
    address: 'MG Road, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543210'
  },
  {
    id: '2',
    name: 'The Coastal Kitchen',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
    cuisine: ['Seafood', 'Coastal'],
    priceLevel: 2,
    address: 'Indiranagar, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543211'
  },
  {
    id: '3',
    name: 'Biryani House',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0',
    cuisine: ['Indian', 'Biryani'],
    priceLevel: 2,
    address: 'Koramangala, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543212'
  },
  {
    id: '4',
    name: 'Pizza Paradise',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    cuisine: ['Italian', 'Pizza'],
    priceLevel: 2,
    address: 'Whitefield, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543213'
  },
  {
    id: '5',
    name: 'Sushi Master',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
    cuisine: ['Japanese', 'Sushi'],
    priceLevel: 4,
    address: 'UB City, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543214'
  },
  {
    id: '6',
    name: 'Burger Junction',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India'
    },
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    cuisine: ['American', 'Burgers'],
    priceLevel: 2,
    address: 'Marathahalli, Bangalore',
    openNow: true,
    phoneNumber: '+91-9876543215'
  }
];

export const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Wine Tasting Experience',
    description: 'Join us for an evening of wine tasting featuring selections from around the world',
    date: 'April 25, 2024',
    time: '7:00 PM',
    location: 'The Wine Cellar, Indiranagar, Bangalore',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    price: 2500,
    category: 'Food & Wine',
    organizer: 'The Wine Society',
    capacity: 30,
    registeredCount: 12
  },
  {
    id: '2',
    name: 'Bangalore Food Festival',
    description: 'Experience the best of Bangalore\'s culinary scene with top chefs and restaurants',
    date: 'May 15, 2024',
    time: '11:00 AM',
    location: 'Palace Grounds, Bangalore',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    price: 499,
    category: 'Food Festival',
    organizer: 'Bangalore Food Council',
    capacity: 1000,
    registeredCount: 456
  },
  {
    id: '3',
    name: 'Craft Beer Workshop',
    description: 'Learn about craft beer brewing and tasting with expert brewers',
    date: 'May 20, 2024',
    time: '6:00 PM',
    location: 'Toit Brewpub, Indiranagar, Bangalore',
    image: 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    price: 1500,
    category: 'Workshop',
    organizer: 'Bangalore Beer Club',
    capacity: 40,
    registeredCount: 25
  },
  {
    id: '4',
    name: 'South Indian Cooking Masterclass',
    description: 'Learn authentic South Indian recipes from celebrity chef',
    date: 'June 5, 2024',
    time: '2:00 PM',
    location: 'Culinary Academy, Koramangala, Bangalore',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    price: 2000,
    category: 'Cooking Class',
    organizer: 'Bangalore Culinary Institute',
    capacity: 20,
    registeredCount: 15
  },
  {
    id: '5',
    name: 'Coffee Cupping Session',
    description: 'Discover the art of coffee tasting with expert baristas',
    date: 'June 12, 2024',
    time: '10:00 AM',
    location: 'Third Wave Coffee Roasters, MG Road, Bangalore',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    price: 800,
    category: 'Coffee Workshop',
    organizer: 'Bangalore Coffee Society',
    capacity: 25,
    registeredCount: 18
  }
];

export const mockBookings: Booking[] = [
  {
    id: '1',
    restaurantName: 'Mock Restaurant 1',
    date: '2024-06-01',
    time: '7:00 PM',
    guests: 2,
    status: 'confirmed',
    selectedItems: [
      { id: 'item1', name: 'Paneer Tikka', price: 200, quantity: 2 },
      { id: 'item2', name: 'Butter Naan', price: 50, quantity: 4 }
    ],
    totalAmount: 600
  },
  {
    id: '2',
    restaurantName: 'Mock Restaurant 2',
    date: '2024-06-02',
    time: '8:00 PM',
    guests: 4,
    status: 'pending',
    selectedItems: [
      { id: 'item3', name: 'Chicken Biryani', price: 300, quantity: 3 }
    ],
    totalAmount: 900
  }
]; 
