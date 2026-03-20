import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { Restaurant as RestaurantType } from '../types';
import Restaurant from '../models/Restaurant';
import { API_CONFIG } from '../config/api';

export const createRestaurant = async (restaurantData: any) => {
  try {
    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();
    return restaurant;
  } catch (error) {
    throw error;
  }
};

export const getAllRestaurants = async () => {
  try {
    const restaurants = await Restaurant.find();
    return restaurants;
  } catch (error) {
    throw error;
  }
};

export const getRestaurantById = async (id: string) => {
  try {
    // Validate ID format
    if (!id || id.trim() === '') {
      console.log('Invalid restaurant ID provided, using mock data');
      return getMockRestaurantById('1'); // Default to first mock restaurant
    }

    // Check if this is a mock restaurant ID (simple numeric IDs 1-6)
    const isMockId = /^[1-9]$/.test(id) || /^[1-9][0-9]$/.test(id);
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    // If it's a simple mock ID and not an ObjectId, use mock data directly
    if (isMockId && !isObjectId) {
      console.log(`Using mock data for restaurant ID: ${id}`);
      return getMockRestaurantById(id);
    }

    const timestamp = Date.now();
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response;
        
        // If it's a MongoDB ObjectId, try business API first
        if (isObjectId) {
          console.log(`Fetching business restaurant with ObjectId: ${id}`);
          response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/business/${id}?_t=${timestamp}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const business = data.data || data;
            console.log('Business API response:', business);
            console.log('Business timeSlots from API:', business.timeSlots);
            console.log('Business dailySlots from API:', business.dailySlots);
            console.log('Business menu from API:', business.menu?.length || 0);
            
            // Transform business data to restaurant format
            const restaurant = {
              id: business.id || business._id,
              name: business.name,
              cuisine: business.cuisine || [],
              address: typeof business.locationData?.address === 'string' 
                ? business.locationData.address 
                : typeof business.location === 'string' 
                  ? business.location 
                  : business.locationData?.city && business.locationData?.state
                    ? `${business.locationData.city}, ${business.locationData.state}`
                    : 'Address not available',
              rating: business.rating || 4.0,
              image: business.thumbnail || business.coverImage || '/images/placeholder-food.svg',
              location: typeof business.locationData === 'object' && business.locationData !== null
                ? business.locationData
                : typeof business.location === 'string' 
                  ? {
                      city: business.location.split(',')[0]?.trim() || 'Unknown',
                      state: business.location.split(',')[1]?.trim() || 'Unknown',
                      country: 'India'
                    }
                  : {
                      city: 'Unknown',
                      state: 'Unknown', 
                      country: 'India'
                    },
              priceLevel: Math.ceil((business.basePrice || 100) / 100),
              openNow: true,
              phoneNumber: business.locationData?.pincode ? `+91-${business.locationData.pincode}` : 'Contact via app',
              menu: (business.menu && business.menu.length > 0) ? business.menu.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || `Delicious ${item.name}`,
                price: item.price,
                category: item.category,
                image: item.image || '/images/placeholder-food.svg',
                isVegetarian: item.isVegetarian || false,
                isSpicy: item.isSpicy || false,
                isPopular: item.isPopular || false
              })) : [],
              timeSlots: business.dailySlots && business.dailySlots.length > 0
                ? business.dailySlots.map((slot: any) => ({
                    id: slot.id,
                    name: slot.name,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    type: slot.type === 'morning' || slot.type === 'afternoon' ? 'lunch' : 'dinner',
                    available: slot.available,
                    maxCapacity: slot.maxCapacity
                  }))
                : business.timeSlots || [],
              type: business.type,
              description: business.description,
              
              // Floor plan data for table selection
              floorPlan: business.floorPlan,
              seatingLayout: business.seatingLayout
            };
            
            console.log('Successfully fetched and transformed business restaurant:', restaurant.name);
            console.log('Restaurant menu items:', restaurant.menu?.length);
            console.log('Restaurant timeSlots:', restaurant.timeSlots);
            console.log('Restaurant timeSlots length:', restaurant.timeSlots?.length || 0);
            return restaurant;
          } else {
            console.log(`Business API returned ${response.status}, trying legacy API`);
          }
        }
        
        // Fallback to legacy restaurant API
        console.log(`Trying legacy restaurant API for ID: ${id}`);
        response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/restaurants/${id}?_t=${timestamp}`, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Restaurant with ID ${id} not found in database, trying mock data`);
            return getMockRestaurantById(id);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // If backend wraps in { success, data }, unwrap
        return data.data || data;
        
      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error);
        
        // If this is a CORS error or network error, fall back to mock data
        if (error.message && (error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') || 
            error.message.includes('CORS'))) {
          console.log('Network/CORS error detected, falling back to mock data');
          return getMockRestaurantById(id);
        }
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }
    
    // If all retries failed, fall back to mock data
    console.log('All API attempts failed, falling back to mock data');
    return getMockRestaurantById(id);
    
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    // If all else fails, fall back to mock data
    return getMockRestaurantById(id);
  }
};

export const searchRestaurants = async (searchTerm: string) => {
  try {
    const restaurants = await Restaurant.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } },
        { 'location.state': { $regex: searchTerm, $options: 'i' } },
        { cuisine: { $regex: searchTerm, $options: 'i' } }
      ]
    });
    return restaurants;
  } catch (error) {
    throw error;
  }
};

export const updateRestaurant = async (id: string, updateData: any) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    return restaurant;
  } catch (error) {
    throw error;
  }
};

export const getTotalGuestsForRestaurant = async (restaurantId: string): Promise<number> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('restaurantId', '==', restaurantId));
    const querySnapshot = await getDocs(q);
    
    let totalGuests = 0;
    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      totalGuests += booking.numberOfGuests || 0;
    });
    
    return totalGuests;
  } catch (error) {
    console.error('Error fetching total guests:', error);
    return 0;
  }
};

// Mock data for development
const mockRestaurants: RestaurantType[] = [
  {
    id: '1',
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
        image: '/images/placeholder-food.svg',
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
      },
      {
        id: '4',
        name: 'Veg Biryani',
        description: 'Fragrant basmati rice cooked with mixed vegetables and spices',
        price: 300,
        category: 'Main Course',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8',
        isVegetarian: true
      },
      {
        id: '5',
        name: 'Chicken Tikka Masala',
        description: 'Grilled chicken in a spiced tomato and cream sauce',
        price: 400,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '6',
        name: 'Gulab Jamun',
        description: 'Sweet milk solids dumplings in sugar syrup',
        price: 150,
        category: 'Desserts',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Samosa',
        description: 'Crispy pastry filled with spiced potatoes and peas',
        price: 60,
        category: 'Starters',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '8',
        name: 'Raita',
        description: 'Cooling yogurt with cucumber and mint',
        price: 80,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '9',
        name: 'Masala Chai',
        description: 'Spiced Indian tea with milk',
        price: 40,
        category: 'Beverages',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '10',
        name: 'Mango Lassi',
        description: 'Sweet yogurt drink with mango',
        price: 100,
        category: 'Beverages',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '11',
        name: 'Tandoori Roti',
        description: 'Whole wheat bread baked in tandoor',
        price: 40,
        category: 'Breads',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '12',
        name: 'Chicken Curry',
        description: 'Chicken in a spiced onion-tomato gravy',
        price: 380,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 50 },
      { id: 'lunch-2', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 50 },
      { id: 'lunch-3', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 50 },
      { id: 'lunch-4', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 50 },
      { id: 'lunch-5', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 50 },
      { id: 'lunch-6', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 50 },
      
      // Dinner slots
      { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 50 },
      { id: 'dinner-8', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 50 }
    ]
  },
  {
    id: '2',
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
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '2',
        name: 'Prawn Curry',
        description: 'Prawns in a coconut-based curry',
        price: 480,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
      },
      {
        id: '3',
        name: 'Fish Fry',
        description: 'Crispy fried fish with spices',
        price: 350,
        category: 'Starters',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '4',
        name: 'Crab Masala',
        description: 'Spicy crab curry with coastal spices',
        price: 650,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '5',
        name: 'Fish Biryani',
        description: 'Fragrant rice with fish and spices',
        price: 450,
        category: 'Main Course',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '6',
        name: 'Coconut Rice',
        description: 'Aromatic rice cooked with coconut',
        price: 200,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Fish Curry',
        description: 'Fish in a spicy coconut-based curry',
        price: 400,
        category: 'Main Course',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '8',
        name: 'Prawn Fry',
        description: 'Crispy fried prawns with spices',
        price: 450,
        category: 'Starters',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '9',
        name: 'Fish Cutlet',
        description: 'Spiced fish patties',
        price: 250,
        category: 'Starters',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '10',
        name: 'Coconut Water',
        description: 'Fresh coconut water',
        price: 80,
        category: 'Beverages',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 40 },
      { id: 'lunch-2', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 40 },
      { id: 'lunch-3', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 40 },
      { id: 'lunch-4', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 40 },
      { id: 'lunch-5', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 40 },
      
      // Dinner slots
      { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 40 },
      { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 40 }
    ]
  },
  {
    id: '3',
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
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '2',
        name: 'Veg Biryani',
        description: 'Fragrant basmati rice cooked with mixed vegetables and spices',
        price: 250,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '3',
        name: 'Mutton Biryani',
        description: 'Fragrant basmati rice cooked with tender mutton and spices',
        price: 400,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '4',
        name: 'Paneer Biryani',
        description: 'Fragrant basmati rice cooked with paneer and spices',
        price: 300,
        category: 'Main Course',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '5',
        name: 'Raita',
        description: 'Cooling yogurt with cucumber and mint',
        price: 80,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '6',
        name: 'Mirchi Ka Salan',
        description: 'Spicy green chili curry',
        price: 120,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Kheer',
        description: 'Sweet rice pudding with nuts',
        price: 150,
        category: 'Desserts',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '8',
        name: 'Masala Chai',
        description: 'Spiced Indian tea with milk',
        price: 40,
        category: 'Beverages',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '11:00 AM', startTime: '11:00', endTime: '12:00', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-2', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-3', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-4', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-5', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-6', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 60 },
      { id: 'lunch-7', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 60 },
      
      // Dinner slots
      { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 60 },
      { id: 'dinner-8', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 60 }
    ]
  },
  {
    id: '4',
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
      {
        id: '1',
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce and mozzarella',
        price: 350,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3',
        isVegetarian: true,
        isPopular: true
      },
      {
        id: '2',
        name: 'Pepperoni Pizza',
        description: 'Pizza topped with pepperoni and cheese',
        price: 450,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
        isPopular: true
      },
      {
        id: '3',
        name: 'Pasta Alfredo',
        description: 'Creamy pasta with parmesan sauce',
        price: 300,
        category: 'Pasta',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '4',
        name: 'Garlic Bread',
        description: 'Toasted bread with garlic butter',
        price: 150,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '5',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 250,
        category: 'Salads',
        image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9',
        isVegetarian: true
      },
      {
        id: '6',
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone',
        price: 200,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Mushroom Pizza',
        description: 'Pizza topped with mushrooms and cheese',
        price: 400,
        category: 'Pizza',
        image: 'https://images.unsplash.com/photo-1601924582970-9238bcb495d9',
        isVegetarian: true
      },
      {
        id: '8',
        name: 'Pasta Bolognese',
        description: 'Pasta with meat sauce',
        price: 350,
        category: 'Pasta',
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9'
      },
      {
        id: '9',
        name: 'Soft Drinks',
        description: 'Carbonated beverages',
        price: 80,
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97',
        isVegetarian: true
      },
      {
        id: '10',
        name: 'Ice Cream',
        description: 'Vanilla ice cream with chocolate sauce',
        price: 150,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb',
        isVegetarian: true
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 35 },
      { id: 'lunch-2', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 35 },
      { id: 'lunch-3', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 35 },
      { id: 'lunch-4', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 35 },
      { id: 'lunch-5', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 35 },
      { id: 'lunch-6', name: '2:30 PM', startTime: '14:30', endTime: '15:30', type: 'lunch', available: true, maxCapacity: 35 },
      
      // Dinner slots
      { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-8', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 35 },
      { id: 'dinner-9', name: '10:00 PM', startTime: '22:00', endTime: '23:00', type: 'dinner', available: true, maxCapacity: 35 }
    ]
  },
  {
    id: '5',
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
      {
        id: '1',
        name: 'California Roll',
        description: 'Crab, avocado, and cucumber roll',
        price: 450,
        category: 'Sushi',
        image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        isPopular: true
      },
      {
        id: '2',
        name: 'Salmon Nigiri',
        description: 'Fresh salmon over pressed sushi rice',
        price: 350,
        category: 'Sushi',
        image: 'https://images.unsplash.com/photo-1617196034183-421b4917c92d',
        isPopular: true
      },
      {
        id: '3',
        name: 'Miso Soup',
        description: 'Traditional Japanese soup with tofu',
        price: 150,
        category: 'Soups',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '4',
        name: 'Tempura Roll',
        description: 'Shrimp tempura roll with spicy sauce',
        price: 500,
        category: 'Sushi',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '5',
        name: 'Edamame',
        description: 'Steamed soybeans with sea salt',
        price: 200,
        category: 'Starters',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '6',
        name: 'Ice Cream',
        description: 'Matcha-flavored ice cream',
        price: 250,
        category: 'Desserts',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Dragon Roll',
        description: 'Tempura shrimp roll with avocado',
        price: 550,
        category: 'Sushi',
        image: '/images/placeholder-food.svg',
        isPopular: true
      },
      {
        id: '8',
        name: 'Sake',
        description: 'Japanese rice wine',
        price: 400,
        category: 'Beverages',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '9',
        name: 'Vegetable Tempura',
        description: 'Assorted vegetables in tempura batter',
        price: 300,
        category: 'Starters',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '10',
        name: 'Green Tea',
        description: 'Traditional Japanese green tea',
        price: 100,
        category: 'Beverages',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 25 },
      { id: 'lunch-2', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 25 },
      { id: 'lunch-3', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 25 },
      { id: 'lunch-4', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 25 },
      { id: 'lunch-5', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 25 },
      
      // Dinner slots
      { id: 'dinner-1', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-2', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-3', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-4', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-5', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-6', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 25 },
      { id: 'dinner-7', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 25 }
    ]
  },
  {
    id: '6',
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
      {
        id: '1',
        name: 'Classic Cheeseburger',
        description: 'Beef patty with cheese, lettuce, tomato, and special sauce',
        price: 250,
        category: 'Burgers',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        isPopular: true
      },
      {
        id: '2',
        name: 'Chicken Burger',
        description: 'Grilled chicken patty with lettuce and mayo',
        price: 220,
        category: 'Burgers',
        image: '/images/placeholder-food.svg'
      },
      {
        id: '3',
        name: 'Veg Burger',
        description: 'Vegetable patty with lettuce and special sauce',
        price: 200,
        category: 'Burgers',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '4',
        name: 'French Fries',
        description: 'Crispy golden fries with seasoning',
        price: 100,
        category: 'Sides',
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877',
        isVegetarian: true
      },
      {
        id: '5',
        name: 'Onion Rings',
        description: 'Crispy battered onion rings',
        price: 120,
        category: 'Sides',
        image: '/images/placeholder-food.svg',
        isVegetarian: true
      },
      {
        id: '6',
        name: 'Chocolate Milkshake',
        description: 'Creamy chocolate milkshake',
        price: 150,
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1577805947697-89e18249d767',
        isVegetarian: true
      },
      {
        id: '7',
        name: 'Chicken Wings',
        description: 'Spicy fried chicken wings',
        price: 300,
        category: 'Starters',
        image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f'
      },
      {
        id: '8',
        name: 'Soft Drinks',
        description: 'Carbonated beverages',
        price: 80,
        category: 'Beverages',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97',
        isVegetarian: true
      },
      {
        id: '9',
        name: 'Ice Cream',
        description: 'Vanilla ice cream with chocolate sauce',
        price: 150,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb',
        isVegetarian: true
      },
      {
        id: '10',
        name: 'Chicken Nuggets',
        description: 'Crispy chicken nuggets with dipping sauce',
        price: 200,
        category: 'Starters',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710'
      }
    ],
    timeSlots: [
      // Lunch slots
      { id: 'lunch-1', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-2', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-3', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-4', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-5', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-6', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 45 },
      { id: 'lunch-7', name: '2:30 PM', startTime: '14:30', endTime: '15:30', type: 'lunch', available: true, maxCapacity: 45 },
      
      // Dinner slots
      { id: 'dinner-1', name: '5:30 PM', startTime: '17:30', endTime: '18:30', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-2', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-3', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-4', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-5', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-6', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-7', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-8', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 45 },
      { id: 'dinner-9', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 45 }
    ]
  }
];

// Use this for development if Firebase is not set up
export const getMockRestaurantById = (id: string): RestaurantType | null => {
  const restaurant = mockRestaurants.find(restaurant => restaurant.id === id);
  if (restaurant) {
    return restaurant;
  }
  
  // If the requested ID doesn't exist, return the first restaurant as fallback
  console.log(`Restaurant with ID ${id} not found in mock data, using first restaurant as fallback`);
  return mockRestaurants[0] || null;
};

export const getMockTotalGuests = async (): Promise<number> => {
  return Math.floor(Math.random() * 100);
};

// Default menu items for businesses without menus
const getDefaultMenuForBusiness = (cuisines: string[]) => {
  const defaultItems = [
    {
      id: 'default-1',
      name: 'House Special',
      description: 'Our signature dish prepared with fresh ingredients',
      price: 350,
      category: 'Main Course',
      image: '/images/placeholder-food.svg',
      isVegetarian: false,
      isSpicy: false,
      isPopular: true
    },
    {
      id: 'default-2',
      name: 'Vegetarian Delight',
      description: 'A delicious vegetarian option made with seasonal vegetables',
      price: 280,
      category: 'Main Course',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: true
    },
    {
      id: 'default-3',
      name: 'Appetizer Platter',
      description: 'A selection of our finest appetizers',
      price: 200,
      category: 'Starters',
      image: '/images/placeholder-food.svg',
      isVegetarian: false,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-4',
      name: 'Fresh Salad',
      description: 'Crisp greens with our house dressing',
      price: 150,
      category: 'Salads',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-5',
      name: 'Dessert Special',
      description: 'Sweet ending to your meal',
      price: 120,
      category: 'Desserts',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    },
    {
      id: 'default-6',
      name: 'Refreshing Beverage',
      description: 'Cool and refreshing drink',
      price: 80,
      category: 'Beverages',
      image: '/images/placeholder-food.svg',
      isVegetarian: true,
      isSpicy: false,
      isPopular: false
    }
  ];

  // Customize based on cuisine
  if (cuisines.includes('Indian') || cuisines.includes('North Indian')) {
    defaultItems[0].name = 'Butter Chicken';
    defaultItems[0].description = 'Tender chicken in a rich, creamy tomato-based curry';
    defaultItems[1].name = 'Paneer Tikka';
    defaultItems[1].description = 'Grilled cottage cheese marinated in spices';
    defaultItems[3].name = 'Tandoori Roti';
    defaultItems[3].description = 'Whole wheat bread baked in tandoor';
    defaultItems[3].category = 'Breads';
    defaultItems[3].price = 40;
  } else if (cuisines.includes('Italian')) {
    defaultItems[0].name = 'Margherita Pizza';
    defaultItems[0].description = 'Classic pizza with tomato sauce and mozzarella';
    defaultItems[1].name = 'Pasta Alfredo';
    defaultItems[1].description = 'Creamy pasta with parmesan sauce';
  } else if (cuisines.includes('Chinese')) {
    defaultItems[0].name = 'Kung Pao Chicken';
    defaultItems[0].description = 'Spicy stir-fried chicken with peanuts';
    defaultItems[1].name = 'Vegetable Fried Rice';
    defaultItems[1].description = 'Wok-fried rice with mixed vegetables';
  }

  return defaultItems;
};

// Default time slots for businesses without time slots
const getDefaultTimeSlotsForBusiness = () => {
  return [
    // Lunch slots
    { id: 'lunch-1', name: '11:30 AM', startTime: '11:30', endTime: '12:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-2', name: '12:00 PM', startTime: '12:00', endTime: '13:00', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-3', name: '12:30 PM', startTime: '12:30', endTime: '13:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-4', name: '1:00 PM', startTime: '13:00', endTime: '14:00', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-5', name: '1:30 PM', startTime: '13:30', endTime: '14:30', type: 'lunch', available: true, maxCapacity: 50 },
    { id: 'lunch-6', name: '2:00 PM', startTime: '14:00', endTime: '15:00', type: 'lunch', available: true, maxCapacity: 50 },
    
    // Dinner slots
    { id: 'dinner-1', name: '6:00 PM', startTime: '18:00', endTime: '19:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-2', name: '6:30 PM', startTime: '18:30', endTime: '19:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-3', name: '7:00 PM', startTime: '19:00', endTime: '20:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-4', name: '7:30 PM', startTime: '19:30', endTime: '20:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-5', name: '8:00 PM', startTime: '20:00', endTime: '21:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-6', name: '8:30 PM', startTime: '20:30', endTime: '21:30', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-7', name: '9:00 PM', startTime: '21:00', endTime: '22:00', type: 'dinner', available: true, maxCapacity: 50 },
    { id: 'dinner-8', name: '9:30 PM', startTime: '21:30', endTime: '22:30', type: 'dinner', available: true, maxCapacity: 50 }
  ];
}; 