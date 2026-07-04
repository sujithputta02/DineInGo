export interface Location {
  city: string;
  state: string;
  country: string;
}

export type CityLocation = Location;

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL?: string | null;
  location: Location;
  createdAt: Date | string;
  lastLogin: Date | string;
  phone?: string;
  address?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isPopular?: boolean;
}

export interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  location: Location;
  rating: number;
  sentimentScore?: number;
  sentimentRating?: number;
  image: string;
  thumbnail?: string;
  cuisine?: string[];
  priceLevel?: number;
  address?: string;
  openNow?: boolean;
  phoneNumber?: string;
  menu?: MenuItem[];
  timeSlots?: any[]; // Business time slots
  floorPlan?: any; // Business floor plan data
  seatingLayout?: any; // Business seating layout data
  basePrice?: number;
  normalCost?: number;
  peakTimeCost?: number;
}

export interface Event {
  id: string;
  _id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl: string;
  price: number;
  category: string;
  organizer?: string;
  capacity: number;
  registeredCount: number;
}

export interface Booking {
  id: string;
  _id?: string;
  restaurantName?: string;
  restaurantId?: string;
  eventName?: string;
  eventId?: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  selectedItems?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  selectedSeats?: string[];
  totalAmount?: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  basePrice?: number;
  table?: string;
  specialRequest?: string;
  occasion?: string;
} 
