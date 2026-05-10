// API Configuration
export const API_CONFIG = {
  // Backend API base URL
  // Backend API base URL with production-aware fallback
  BASE_URL: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0'))
    ? '' // Use relative paths to leverage Vite proxy and avoid CORS/hostname issues
    : (import.meta.env.VITE_API_URL || 'https://dineingo-backend.onrender.com'),
  
  // API endpoints
  ENDPOINTS: {
    PROFILE: '/api/v1/profile',
    USERS: '/api/v1/users',
    BOOKINGS: '/api/v1/bookings',
    RESTAURANTS: '/api/v1/restaurants',
    EVENTS: '/api/v1/events',
    FAVORITES: '/api/v1/favorites',
    NOTIFICATIONS: '/api/v1/notifications',
  },
  
  // Helper to get full URL
  getFullUrl: (path: string) => {
    if (path.startsWith('http')) return path;
    return `${API_CONFIG.BASE_URL}${path}`;
  },
  
  // Helper to get asset URL (for uploaded files)
  getAssetUrl: (path: string) => {
    if (!path) return null;
    
    // Normalize: If the path already contains a localhost URL (from development DB)
    // replace it with the current BASE_URL.
    if (path.includes('localhost:5001')) {
      return path.replace(/https?:\/\/localhost:5001/, API_CONFIG.BASE_URL);
    }

    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path; // Base64 images
    
    // Ensure path starts with / if it's relative
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_CONFIG.BASE_URL}${normalizedPath}`;
  }
};

export default API_CONFIG;
