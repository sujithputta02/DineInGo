// Event service for handling event-related operations
import { Event } from '../types';

const mockEvents: Event[] = [
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

export const getMockEventById = (id: string): Event | null => {
  return mockEvents.find(event => event.id === id) || null;
};

export const getAllMockEvents = (): Event[] => {
  return mockEvents;
};

export const getMockEventCapacity = (id?: string): number => {
  if (id) {
    const event = mockEvents.find(event => event.id === id);
    return event ? event.capacity : 0;
  }
  // If no ID is provided, return a random capacity between 20 and 100
  return Math.floor(Math.random() * 81) + 20;
}; 