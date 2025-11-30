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
  name: string;
  location: Location;
  rating: number;
  image: string;
  cuisine?: string[];
  priceLevel?: number;
  address?: string;
  openNow?: boolean;
  phoneNumber?: string;
  menu?: MenuItem[];
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  price: number;
  category: string;
  organizer: string;
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
  table?: string;
  specialRequest?: string;
  occasion?: string;
} 
