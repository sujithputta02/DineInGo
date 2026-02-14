export const OPENCAGE_API_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;

export const OPENCAGE_API_URL = 'https://api.opencagedata.com/geocode/v1/json';

// Default center coordinates (Bangalore)
export const DEFAULT_COORDINATES = {
  lat: 12.9716,
  lng: 77.5946
};

// Static map configuration
export const STATIC_MAP_CONFIG = {
  width: 600,
  height: 400,
  zoom: 13
};

// API request configuration
export const API_CONFIG = {
  limit: 1,
  no_annotations: 1,
  language: 'en'
}; 
