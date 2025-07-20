import axios from 'axios';
import { indianCities, IndianCity } from '../utils/indianCities';

const OPENCAGE_API_KEY = '5a9846ac3123475899976f2ca6fed52b';
const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodingResponse {
  results: Array<{
    formatted: string;
    geometry: {
      lat: number;
      lng: number;
    };
    components: {
      city?: string;
      state?: string;
      country?: string;
    };
  }>;
}

export class GeocodingService {
  // Calculate distance between two points using Haversine formula
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  // Find the nearest city from a given location
  static findNearestCity(lat: number, lng: number): IndianCity {
    let nearestCity = indianCities[0];
    let minDistance = this.calculateDistance(
      lat, lng,
      nearestCity.coordinates.lat,
      nearestCity.coordinates.lng
    );

    for (const city of indianCities) {
      const distance = this.calculateDistance(
        lat, lng,
        city.coordinates.lat,
        city.coordinates.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    return nearestCity;
  }

  // Get current location using browser's geolocation API
  static async getCurrentLocation(): Promise<Coordinates | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        }
      );
    });
  }

  static async forwardGeocode(query: string): Promise<Coordinates | null> {
    try {
      const response = await axios.get<GeocodingResponse>(
        `${OPENCAGE_BASE_URL}/json`,
        {
          params: {
            q: query,
            key: OPENCAGE_API_KEY,
            limit: 1
          }
        }
      );

      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Error in forward geocoding:', error);
      return null;
    }
  }

  static async reverseGeocode(lat: number, lng: number): Promise<{
    city: string;
    state: string;
    country: string;
  } | null> {
    try {
      const response = await axios.get<GeocodingResponse>(
        `${OPENCAGE_BASE_URL}/json`,
        {
          params: {
            q: `${lat}+${lng}`,
            key: OPENCAGE_API_KEY,
            limit: 1
          }
        }
      );

      if (response.data.results.length > 0) {
        const { components } = response.data.results[0];
        return {
          city: components.city || '',
          state: components.state || '',
          country: components.country || ''
        };
      }
      return null;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  static getStaticMapUrl(lat: number, lng: number, zoom: number = 14): string {
    return `https://api.opencagedata.com/staticmap?key=${OPENCAGE_API_KEY}&q=${lat},${lng}&zoom=${zoom}&size=600x400&marker=${lat},${lng}`;
  }
} 
