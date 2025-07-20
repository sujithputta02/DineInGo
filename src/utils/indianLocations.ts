import { indianCities, IndianCity } from './indianCities';

export interface IndianLocation extends IndianCity {
  type: 'city' | 'town';
}

// Convert IndianCity to IndianLocation
const convertToLocation = (city: IndianCity, type: 'city' | 'town'): IndianLocation => ({
  ...city,
  type
});

// Major cities (first 20 from indianCities)
const majorCities: IndianLocation[] = indianCities
  .slice(0, 20)
  .map(city => convertToLocation(city, 'city'));

// Popular towns (next 20 from indianCities)
const popularTowns: IndianLocation[] = indianCities
  .slice(20, 40)
  .map(city => convertToLocation(city, 'town'));

// All locations combined
const allLocations: IndianLocation[] = [...majorCities, ...popularTowns];

// Function to search locations
export const searchLocations = (query: string): IndianLocation[] => {
  const searchTerm = query.toLowerCase();
  return allLocations.filter(location => 
    location.city.toLowerCase().includes(searchTerm) || 
    location.state.toLowerCase().includes(searchTerm)
  );
};

// Function to get all cities
export const getAllCities = (): IndianLocation[] => majorCities;

// Function to get all towns
export const getAllTowns = (): IndianLocation[] => popularTowns;

// Function to find nearest location
export const findNearestLocation = (lat: number, lng: number): IndianLocation => {
  let nearestLocation = allLocations[0];
  let minDistance = calculateDistance(
    lat, lng,
    nearestLocation.coordinates.lat,
    nearestLocation.coordinates.lng
  );

  for (const location of allLocations) {
    const distance = calculateDistance(
      lat, lng,
      location.coordinates.lat,
      location.coordinates.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }

  return nearestLocation;
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper function to convert degrees to radians
const toRad = (value: number): number => {
  return value * Math.PI / 180;
}; 
