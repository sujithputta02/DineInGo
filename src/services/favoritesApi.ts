const API_URL = 'http://localhost:5000/api';

export const favoritesApi = {
  async get(userId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch favorites');
    return res.json();
  },
  async addRestaurant(userId: string, restaurantId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}/restaurant/${restaurantId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add restaurant to favorites');
    return res.json();
  },
  async removeRestaurant(userId: string, restaurantId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}/restaurant/${restaurantId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove restaurant from favorites');
    return res.json();
  },
  async addEvent(userId: string, eventId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}/event/${eventId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add event to favorites');
    return res.json();
  },
  async removeEvent(userId: string, eventId: string) {
    const res = await fetch(`${API_URL}/favorites/${userId}/event/${eventId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove event from favorites');
    return res.json();
  }
}; 