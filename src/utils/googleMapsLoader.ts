/**
 * Google Maps API Dynamic Loader
 * Loads the Google Maps API script dynamically with the API key from environment variables
 * This prevents exposing the API key in index.html
 */

let isLoaded = false;
let isLoading = false;
const callbacks: Array<() => void> = [];

export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isLoaded) {
      resolve();
      return;
    }

    // If currently loading, add to callbacks
    if (isLoading) {
      callbacks.push(() => resolve());
      return;
    }

    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('[DineInGo] Google Maps API key not configured, using OpenStreetMap fallback');
      resolve(); // Don't block the app if key is missing
      return;
    }

    isLoading = true;

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      console.log('[DineInGo] Google Maps API loaded successfully');
      
      // Execute all pending callbacks
      callbacks.forEach(callback => callback());
      callbacks.length = 0;
      
      resolve();
    };

    script.onerror = (error) => {
      isLoading = false;
      console.warn('[DineInGo] Failed to load Google Maps API, using OpenStreetMap fallback', error);
      
      // Don't reject - let the app continue with fallback
      callbacks.forEach(callback => callback());
      callbacks.length = 0;
      
      resolve();
    };

    // Add to document
    document.head.appendChild(script);
  });
};

/**
 * Check if Google Maps API is available
 */
export const isGoogleMapsAvailable = (): boolean => {
  return isLoaded && typeof window !== 'undefined' && typeof (window as any).google !== 'undefined';
};
