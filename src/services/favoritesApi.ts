const API_URL = 'http://localhost:5000/api';

export const favoritesApi = {
  async get(userId: string) {
    console.log('Fetching favorites for user:', userId);
    const res = await fetch(`${API_URL}/favorites/${userId}`);
    if (!res.ok) {
      console.error('Failed to fetch favorites:', res.status, res.statusText);
      throw new Error('Failed to fetch favorites');
    }
    const data = await res.json();
    console.log('Favorites response:', data);
    return data;
  },
  async addRestaurant(userId: string, restaurantId: string) {
    console.log('Adding restaurant to favorites:', { userId, restaurantId });
    const res = await fetch(`${API_URL}/favorites`, {
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
    console.log('Add restaurant response:', data);
    return data;
  },
  async removeRestaurant(userId: string, restaurantId: string) {
    console.log('Removing restaurant from favorites:', { userId, restaurantId });
    const res = await fetch(`${API_URL}/favorites`, {
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
    console.log('Remove restaurant response:', data);
    return data;
  },
  async addEvent(userId: string, eventId: string) {
    console.log('Adding event to favorites:', { userId, eventId });
    const res = await fetch(`${API_URL}/favorites`, {
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
    console.log('Add event response:', data);
    return data;
  },
  async removeEvent(userId: string, eventId: string) {
    console.log('Removing event from favorites:', { userId, eventId });
    const res = await fetch(`${API_URL}/favorites`, {
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
    console.log('Remove event response:', data);
    return data;
  }
}; 