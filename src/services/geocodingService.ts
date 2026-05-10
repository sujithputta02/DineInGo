import axios from 'axios';
import { indianCities, IndianCity } from '../utils/indianCities';
import { API_CONFIG } from '../config/api';

const API_URL = API_CONFIG.BASE_URL;
const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;
const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1';
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
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

  // --- Nominatim Queue & Rate Limiting ---

  private static requestQueue: Array<{
    query: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private static isProcessingQueue = false;
  private static cache = new Map<string, any>();
  private static lastRequestTime = 0;
  private static MIN_DELAY = 1200; // 1.2 seconds between requests to be safe

  /**
   * Safe wrapper for Nominatim search that respects rate limits
   */
  static async searchNominatim(query: string): Promise<any> {
    // 1. Check Cache
    if (this.cache.has(query)) {
      return this.cache.get(query);
    }

    // 2. Add to Queue and return Promise
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ query, resolve, reject });
      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const task = this.requestQueue[0]; // Peek
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;

      if (timeSinceLast < this.MIN_DELAY) {
        await new Promise(r => setTimeout(r, this.MIN_DELAY - timeSinceLast));
      }

      // Shift after wait ensuring we are ready to process
      this.requestQueue.shift();

      try {
        this.lastRequestTime = Date.now();
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(task.query)}&limit=1&addressdetails=1&namedetails=1&countrycodes=in`
        );

        if (!response.ok) {
          throw new Error(`Nominatim API Error: ${response.statusText}`);
        }

        const data = await response.json();
        this.cache.set(task.query, data); // Cache result
        task.resolve(data);

      } catch (error) {
        console.error('Nominatim request failed:', error);
        task.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Google Geocoding API (High Precision)
   */
  static async searchGoogle(query: string): Promise<any> {
    if (!GOOGLE_MAPS_API_KEY) return null;
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/geocoding/google/geocode?address=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`Google API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results;
      }
      return null;
    } catch (error) {
      console.error('Google Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Google Places API (Highest Precision for Business Names)
   */
  static async searchGooglePlaces(query: string): Promise<any> {
    if (!GOOGLE_MAPS_API_KEY) return null;
    
    try {
      const response = await fetch(
        `${API_URL}/api/v1/geocoding/google/places?query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        throw new Error(`Google Places API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results;
      }
      return null;
    } catch (error) {
      console.error('Google Places search failed:', error);
      return null;
    }
  }
} 
