// API Configuration
export const API_CONFIG = {
  // Backend API base URL
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  
  // API endpoints
  ENDPOINTS: {
    PROFILE: '/api/profile',
    USERS: '/api/users',
    BOOKINGS: '/api/bookings',
    RESTAURANTS: '/api/restaurants',
    EVENTS: '/api/events',
    FAVORITES: '/api/favorites',
    NOTIFICATIONS: '/api/notifications',
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
