const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const favoritesApi = {
  async get(userId: string) {
    const res = await fetch(`${API_URL}/api/v1/favorites/${userId}`);
    if (!res.ok) {
      console.error('Failed to fetch favorites:', res.status, res.statusText);
      throw new Error('Failed to fetch favorites');
    }
    const data = await res.json();
    return data;
  },
  async addRestaurant(userId: string, restaurantId: string) {
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    const res = await fetch(`${API_URL}/api/v1/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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