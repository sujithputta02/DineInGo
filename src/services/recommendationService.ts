import { achievementsApi } from '../services/achievementsApi';
import { mockRestaurants } from '../utils/mockData';
import { API_CONFIG } from '../config/api';

export interface Recommendation {
  id: string;
  name: string;
  cuisine: string;
  reason: string;
  matchScore: number;
  type: 'restaurant' | 'event';
  image?: string;
}

export interface AIReason {
  id: string;
  reason: string;
}

const API_URL = API_CONFIG.BASE_URL;

const FLAVOR_PROFILES: Record<string, string[]> = {
  'Indian': ['Spicy', 'Aromatic', 'Earthy'],
  'Italian': ['Herbal', 'Zesty', 'Savory'],
  'Chinese': ['Umami', 'Sweet-Sour', 'Zesty'],
  'Japanese': ['Umami', 'Fresh', 'Clean'],
  'Mexican': ['Spicy', 'Smoky', 'Zesty'],
  'Continental': ['Savory', 'Creamy', 'Herbal'],
  'American': ['Grilled', 'Hearty', 'Savory'],
  'Seafood': ['Fresh', 'Clean', 'Briny'],
  'Global': ['Diverse', 'Vibrant', 'Eclectic']
};

const MOOD_VIBES: Record<string, string[]> = {
  'Chill': ['Quiet', 'Moderate', 'Relaxed'],
  'Social': ['Lively', 'Trendy', 'Buzzing'],
  'Hustle': ['Fast', 'Efficient', 'Busy'],
  'Happy': ['Vibrant', 'Cheerful', 'Lively'],
  'Romantic': ['Intimate', 'Elegant', 'Cozy'],
  'Adventurous': ['Unique', 'Exotic', 'Bold'],
  'Hungry': ['Hearty', 'Generous', 'Satisfying']
};

// Simple in-memory cache for AI reasons to prevent 429 errors
const aiReasonsCache: Record<string, { reasons: AIReason[], timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const recommendationService = {
  async getDailyMorsels(userId: string, mood: string = 'Social'): Promise<Recommendation[]> {
    try {
      // 1. Fetch user stats
      const statsData = await achievementsApi.getUserAchievements(userId);
      const userStats = statsData.success ? statsData.data.userStats : { cuisinesTried: 0, favoriteCuisines: [] };
      const userFavCuisines = userStats.favoriteCuisines || ['Indian'];

      // 2. Fetch real pool
      const [bizRes, eventsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/business`).catch(() => null),
        fetch(`${API_URL}/api/v1/events`).catch(() => null)
      ]);

      let pool: any[] = [];
      if (bizRes?.ok) {
        const bizData = await bizRes.json();
        const bizArray = Array.isArray(bizData) ? bizData : (bizData.data || []);
        pool = [...pool, ...bizArray.map((b: any) => ({ ...b, type: 'restaurant' }))];
      }
      if (eventsRes?.ok) {
        const eventsData = await eventsRes.json();
        const eventsArray = Array.isArray(eventsData) ? eventsData : (eventsData.data || []);
        pool = [...pool, ...eventsArray.map((e: any) => ({ ...e, type: 'event', cuisine: e.category || 'Event' }))];
      }

      if (pool.length === 0) {
        pool = mockRestaurants.map(r => ({ ...r, type: 'restaurant' }));
      } else {
        const seen = new Set();
        pool = pool.filter(item => {
          const id = item.id || item._id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      }

      // 3. Select items quickly
      // const timeContext = this.getFutureSightContext();
      // const vibePrefix = this.getVibePrefix(mood);

      return pool
        .sort(() => 0.5 - Math.random())
        .slice(0, 4)
        .map(item => ({
          id: item.id || item._id,
          name: item.name || item.title,
          cuisine: Array.isArray(item.cuisine) ? item.cuisine[0] : (item.cuisine || 'Global'),
          matchScore: Math.floor(Math.random() * 15) + (mood === 'Chill' ? 80 : 85), 
          type: item.type as 'restaurant' | 'event',
          image: item.image || item.thumbnail,
          reason: `Dino says: ${item.name} is a top pick for your ${userFavCuisines[0] || 'foodie'} DNA! 🦖` // Quick fallback/initial reason
        }));
    } catch (error) {
       console.error('Error in recommendationService:', error);
       return this.getFallbackRecommendations();
    }
  },

  async getAIReasons(userId: string, items: Recommendation[], language: string = 'english', refresh: boolean = false): Promise<AIReason[]> {
    try {
      // 1. Check cache first
      const cacheKey = `${userId}-${items.map(i => i.id).sort().join(',')}-${language}`;
      if (!refresh && aiReasonsCache[cacheKey]) {
        const cached = aiReasonsCache[cacheKey];
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.reasons;
        }
      }

      const statsData = await achievementsApi.getUserAchievements(userId);
      const userStats = statsData.success ? statsData.data.userStats : { cuisinesTried: 0, favoriteCuisines: [] };

      const aiResponse = await fetch(`${API_URL}/api/v1/recommendations/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          items: items.map(s => ({ id: s.id, name: s.name, type: s.type, cuisine: s.cuisine })),
          userContext: {
            displayName: userId, 
            favoriteCuisines: userStats.favoriteCuisines || ['Indian'],
            cuisinesTried: userStats.cuisinesTried || 0
          },
          language,
          refresh
        })
      });

      if (aiResponse.status === 429) {
        console.warn('AI Recommendation Rate limit reached (429). Using fallback.');
        return aiReasonsCache[cacheKey]?.reasons || [];
      }

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const reasons = aiData.success && aiData.reasons ? aiData.reasons : [];
        
        // Update cache
        if (reasons.length > 0) {
          aiReasonsCache[cacheKey] = { reasons, timestamp: Date.now() };
        }
        
        return reasons;
      }
      return [];
    } catch (e) {
      console.warn('AI reasoning fetch failed:', e);
      return [];
    }
  },

  getVibePrefix(mood: string): string {
    const vibes = MOOD_VIBES[mood] || MOOD_VIBES['Social'];
    const vibe = vibes[Math.floor(Math.random() * vibes.length)];
    
    if (mood === 'Chill') return `🤫 Dino checked: it's perfectly ${vibe} right now.`;
    if (mood === 'Social') return `🔥 VIBE CHECK: This spot is ${vibe}!`;
    if (mood === 'Happy') return `😊 Dino sensed the joy! This place is ${vibe} and perfect for your mood!`;
    if (mood === 'Romantic') return `🕯️ Dino found a ${vibe} spot for a legendary date night!`;
    if (mood === 'Adventurous') return `🗺️ Dino dares you to try this ${vibe} experience!`;
    if (mood === 'Hungry') return `🍖 Dino says: STOMP over here for a ${vibe} feast!`;
    return `⚡ Dino suggests this for a ${vibe} and productive session.`;
  },

  getFutureSightContext(): string {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();

    if (hour < 11) return `Start your ${day} strong with Dino's energy pick! 🦖⚡`;
    if (hour < 15) return `Dino thinks you need a power lunch to stomp through this ${day}! 🍱`;
    if (hour < 19) return `Relax, it's ${day} evening! Dino found a perfect fossil to unwind. ☕`;
    return `Dine like a King tonight! Dino's ${day} night special selection. 🍗`;
  },

  getGenomeReason(itemCuisine: string, userFavCuisines: string[]): string | null {
    const userGenes = new Set(userFavCuisines.flatMap(c => FLAVOR_PROFILES[c] || []));
    const itemGenes = FLAVOR_PROFILES[itemCuisine] || [];
    
    const sharedGene = itemGenes.find(g => userGenes.has(g));
    
    if (sharedGene && !userFavCuisines.includes(itemCuisine)) {
      return `Dino detected a hidden "${sharedGene}" gene in ${itemCuisine} that matches your favorite DNA! 🧬`;
    }
    return null;
  },

  getFallbackRecommendations(): Recommendation[] {
    return mockRestaurants.slice(0, 2).map((r, i) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine?.[0] || 'Global',
      reason: i === 0 ? "Dino's favorite spot for a quick bite! 🦖" : "A classic spot for legendary appetites! 🍖",
      matchScore: 99 - i,
      type: 'restaurant'
    }));
  }
};
