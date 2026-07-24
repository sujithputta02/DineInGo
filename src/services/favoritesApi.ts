import { API_CONFIG } from '../config/api';
import { getAuth } from 'firebase/auth';

const API_URL = API_CONFIG.BASE_URL;

const getAuthToken = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Could not retrieve auth token:', err);
  }
  return null;
};

const getHeaders = async (includeContentType = false): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const favoritesApi = {
  async get(userId: string) {
    const headers = await getHeaders(false);
    const res = await fetch(`${API_URL}/api/v1/favorites/${userId}`, { headers });
    if (!res.ok) {
      console.error('Failed to fetch favorites:', res.status, res.statusText);
      throw new Error('Failed to fetch favorites');
    }
    const data = await res.json();
    return data;
  },
  async addRestaurant(userId: string, restaurantId: string) {
    const headers = await getHeaders(true);
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        restaurantId,
        type: 'restaurant'
      })
    });
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to add restaurant:', error);
      throw new Error(error.message || 'Failed to add restaurant to favorites');
    }
    const data = await res.json();
    return data;
  },
  async removeRestaurant(userId: string, restaurantId: string) {
    const headers = await getHeaders(true);
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        restaurantId,
        type: 'restaurant'
      })
    });
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to remove restaurant:', error);
      throw new Error(error.message || 'Failed to remove restaurant from favorites');
    }
    const data = await res.json();
    return data;
  },
  async addEvent(userId: string, eventId: string) {
    const headers = await getHeaders(true);
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        eventId,
        type: 'event'
      })
    });
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to add event:', error);
      throw new Error(error.message || 'Failed to add event to favorites');
    }
    const data = await res.json();
    return data;
  },
  async removeEvent(userId: string, eventId: string) {
    const headers = await getHeaders(true);
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        eventId,
        type: 'event'
      })
    });
    if (!res.ok) {
      const error = await res.json();
      console.error('Failed to remove event:', error);
      throw new Error(error.message || 'Failed to remove event from favorites');
    }
    const data = await res.json();
    return data;
  }
}; 