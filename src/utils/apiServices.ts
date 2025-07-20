import axios from 'axios';

// API Keys (should be moved to environment variables)
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

export interface Location {
  city: string;
  state: string;
  country: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  image: string;
  cuisine: string[];
  priceLevel: number;
  address: string;
  photos: string[];
  openNow?: boolean;
  phoneNumber?: string;
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

interface MapboxFeature {
  id: string;
  text: string;
  context: Array<{
    id: string;
    text: string;
  }>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

interface GooglePlacesResponse {
  results: Array<{
    place_id: string;
    name: string;
    vicinity: string;
    formatted_address: string;
    rating: number;
    photos?: Array<{
      photo_reference: string;
    }>;
    types: string[];
    price_level?: number;
    opening_hours?: {
      open_now: boolean;
    };
  }>;
}

// Get current location using browser geolocation
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await axios.get<MapboxResponse>(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_API_KEY}`
          );

          const features = response.data.features[0];
          const context = features.context;
          
          const location: Location = {
            city: context.find((c) => c.id.includes('place'))?.text || '',
            state: context.find((c) => c.id.includes('region'))?.text || '',
            country: context.find((c) => c.id.includes('country'))?.text || '',
            pincode: context.find((c) => c.id.includes('postcode'))?.text || '',
            latitude,
            longitude
          };

          resolve(location);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
};

// Get nearby restaurants using Google Places API
export const getNearbyRestaurants = async (latitude: number, longitude: number, radius: number = 5000): Promise<Restaurant[]> => {
  try {
    const response = await axios.get<GooglePlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`
    );

    const currentLocation = await getCurrentLocation();

    return response.data.results.map((place) => ({
      id: place.place_id,
      name: place.name,
      location: {
        city: currentLocation.city,
        state: currentLocation.state,
        country: currentLocation.country
      },
      rating: place.rating || 0,
      image: place.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : '/images/default-restaurant.jpg',
      cuisine: place.types.filter((type) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(type)),
      priceLevel: place.price_level || 1,
      address: place.formatted_address || place.vicinity,
      photos: place.photos?.map((photo) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
      ) || [],
      openNow: place.opening_hours?.open_now
    }));
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    throw error;
  }
};

// Get upcoming events (you would need to implement your own events API)
export const getUpcomingEvents = async (latitude: number, longitude: number): Promise<Event[]> => {
  try {
    // This is a placeholder. You would need to implement your own events API
    // or integrate with a service like Eventbrite API
    const response = await axios.get<{ events: Event[] }>(
      `YOUR_EVENTS_API_ENDPOINT?lat=${latitude}&lng=${longitude}`
    );

    return response.data.events;
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    // Return mock data for now
    return [
      {
        id: '1',
        name: 'Bangalore Food Festival',
        description: 'Experience culinary delights from across India at this grand food festival.',
        date: '2024-04-25',
        time: '11:00 AM',
        location: 'Palace Grounds, Bangalore',
        image: '/api/placeholder/600/300',
        price: 499,
        category: 'Food & Drink',
        organizer: 'Bangalore Food Council',
        capacity: 1000,
        registeredCount: 456
      },
      {
        id: '2',
        name: 'Italian Cooking Workshop',
        description: 'Learn to make authentic Italian dishes from renowned Chef Mario Rossi.',
        date: '2024-05-10',
        time: '3:00 PM',
        location: 'Culinary Academy, Indiranagar',
        image: '/api/placeholder/600/300',
        price: 1999,
        category: 'Workshop',
        organizer: 'Culinary Academy',
        capacity: 30,
        registeredCount: 18
      }
    ];
  }
};

// Search restaurants by query
export const searchRestaurants = async (query: string, latitude: number, longitude: number): Promise<Restaurant[]> => {
  try {
    const response = await axios.get<GooglePlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${latitude},${longitude}&radius=5000&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`
    );

    return response.data.results.map((place) => ({
      id: place.place_id,
      name: place.name,
      location: {
        city: place.formatted_address.split(',')[0],
        state: place.formatted_address.split(',')[1]?.trim() || '',
        country: place.formatted_address.split(',')[2]?.trim() || ''
      },
      rating: place.rating || 0,
      image: place.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : '/images/default-restaurant.jpg',
      cuisine: place.types.filter((type) => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(type)),
      priceLevel: place.price_level || 1,
      address: place.formatted_address,
      photos: place.photos?.map((photo) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
      ) || []
    }));
  } catch (error) {
    console.error('Error searching restaurants:', error);
    throw error;
  }
}; 
