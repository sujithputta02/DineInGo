// API Configuration
export const API_CONFIG = {
  // Backend API base URL
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  
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
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path; // Base64 images
    return `${API_CONFIG.BASE_URL}${path}`;
  }
};

export default API_CONFIG;
