import express, { Request, Response } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// In-memory LRU-like cache for nutrition search queries (TTL 1 hour)
const nutritionCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCached(key: string): any | null {
  const item = nutritionCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    nutritionCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key: string, data: any) {
  if (nutritionCache.size > 500) {
    const oldestKey = nutritionCache.keys().next().value;
    if (oldestKey) nutritionCache.delete(oldestKey);
  }
  nutritionCache.set(key, { data, timestamp: Date.now() });
}

function parseUSDAFood(food: any) {
  const nutrients = food.foodNutrients || [];
  const getNutrient = (name: string): number => {
    const n = nutrients.find((item: any) =>
      item.nutrientName?.toLowerCase().includes(name.toLowerCase())
    );
    return n?.value || 0;
  };

  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    nutrition: {
      calories: Math.round(getNutrient('Energy')),
      protein: Math.round(getNutrient('Protein') * 10) / 10,
      carbs: Math.round(getNutrient('Carbohydrate') * 10) / 10,
      fat: Math.round(getNutrient('Total lipid') * 10) / 10,
      fiber: Math.round(getNutrient('Fiber') * 10) / 10,
      sodium: Math.round(getNutrient('Sodium')),
      sugar: Math.round(getNutrient('Sugars') * 10) / 10
    },
    ingredients: food.ingredients
  };
}

/**
 * GET /api/v1/nutrition/search?query=...
 * Search USDA FoodData Central securely from backend
 */
router.get('/search', apiLimiter, async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string || '').trim();

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters.'
      });
    }

    if (query.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Query exceeds 100 characters limit.'
      });
    }

    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, cached: true, foods: cached });
    }

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-usda-api-key') {
      return res.json({
        success: true,
        providerConfigured: false,
        message: 'USDA API key not configured on backend; regional fallback active.',
        foods: []
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${apiKey}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({
        success: false,
        message: `USDA API returned status ${response.status}`,
        foods: []
      });
    }

    const data = await response.json();
    const parsedFoods = (data.foods || []).map((f: any) => parseUSDAFood(f));

    setCache(cacheKey, parsedFoods);

    res.json({
      success: true,
      providerConfigured: true,
      foods: parsedFoods
    });

  } catch (error: any) {
    console.warn('[Backend Nutrition] Search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error executing nutrition search.'
    });
  }
});

export default router;
