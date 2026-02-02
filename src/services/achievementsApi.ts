const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const achievementsApi = {
  // Get user achievements
  async getUserAchievements(userId: string) {
    try {
      const response = await fetch(`${API_URL}/api/achievements/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  },

  // Update user stats
  async updateUserStats(userId: string, action: string, data: any) {
    try {
      const response = await fetch(`${API_URL}/api/achievements/${userId}/stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, data })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user stats');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  },

  // Get user stats
  async getUserStats(userId: string) {
    try {
      const response = await fetch(`${API_URL}/api/achievements/${userId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
};