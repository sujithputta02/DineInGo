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

// Events are now fetched from the API - this is kept for backward compatibility
export const mockEvents: Event[] = [];

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
