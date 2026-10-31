import express, { Request, Response } from 'express';
import { aiRecommendationService } from '../services/aiRecommendationService';
import { strictAiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * POST /api/v1/recommendations/ai
 * AI-powered reasoning for recommendations
 */
router.post('/ai', strictAiLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, items, userContext, language, refresh } = req.body;

    if (!userId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId and items (array) are required'
      });
    }

    const reasons = await aiRecommendationService.generateReasons(
      userId, 
      items, 
      userContext || { displayName: 'Diner', favoriteCuisines: [], cuisinesTried: 0 }, 
      language || 'en',
      refresh === true
    );

    res.json({
      success: true,
      reasons,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[AI Rec Routes] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI reasoning'
    });
  }
});

// In-memory cache for dish insights: key -> { sentence: string, timestamp: number }
const dishInsightCache = new Map<string, { sentence: string; timestamp: number }>();

/**
 * POST /api/v1/recommendations/dish-insight
 * Generates an ultra-fast, cost-optimized personalized suggestion sentence
 * based on the user's onboarding preferences and scanned food model results.
 * Protected with memory cache and zero-cost fallback so it never rate-limits.
 */
router.post('/dish-insight', async (req: Request, res: Response) => {
  try {
    const { dishName, nutrition, userPreferences, matchScore } = req.body;

    if (!dishName) {
      return res.status(400).json({ success: false, message: 'dishName is required' });
    }

    const diets = Array.isArray(userPreferences?.dietaryPreferences) ? userPreferences.dietaryPreferences.join(', ') : 'None';
    const allergens = Array.isArray(userPreferences?.allergens) ? userPreferences.allergens.join(', ') : 'None';
    const cacheKey = `${dishName.toLowerCase().trim()}_${matchScore || 0}_${diets}_${allergens}`;

    // 1. Check in-memory Cache (12-hour TTL for cost optimization)
    const cached = dishInsightCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 12 * 60 * 60 * 1000)) {
      return res.json({
        success: true,
        sentence: cached.sentence,
        source: 'cache'
      });
    }

    // 2. Fast Groq AI with llama-3.1-8b-instant (generous limits, low cost)
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && !groqKey.includes('placeholder')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const prompt = `[DINEINGO NUTRITION CONCIERGE]
Dish: "${dishName}"
Nutrition: ${nutrition?.calories || 400} kcal, ${nutrition?.protein || 15}g protein, ${nutrition?.carbs || 30}g carbs, ${nutrition?.fat || 15}g fat.
User Preferences from Onboarding/Settings: Diet: [${diets}], Allergens: [${allergens}].
Match Score: ${matchScore || 85}%.
Task: Write exactly ONE conversational, 15-25 word sentence explaining if this dish fits their onboarding preferences and why. No intro, no quotes, direct sentence only.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 60
          })
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          let sentence = data.choices?.[0]?.message?.content?.trim() || '';
          sentence = sentence.replace(/^["'`]|["'`]$/g, '').trim();
          if (sentence.length > 10) {
            dishInsightCache.set(cacheKey, { sentence, timestamp: Date.now() });
            return res.json({
              success: true,
              sentence,
              source: 'groq-ai'
            });
          }
        }
      } catch (aiErr: any) {
        console.warn('[AI Rec Routes] Groq insight fallback:', aiErr?.message);
      }
    }

    // 3. Deterministic Smart Fallback (0 cost, guaranteed 100% uptime, zero rate-limit)
    let fallbackSentence = `Rated ${matchScore || 85}% for your dietary preferences with ${nutrition?.calories || 350} calories and ${nutrition?.protein || 14}g protein.`;
    if (matchScore && matchScore >= 85) {
      fallbackSentence = `Excellent ${matchScore}% match for your ${diets !== 'None' ? diets : 'healthy'} lifestyle, delivering clean balanced macros!`;
    } else if (matchScore && matchScore < 50) {
      fallbackSentence = `Attention: Rated ${matchScore}% due to potential conflicts with your saved dietary or allergen preferences.`;
    }

    return res.json({
      success: true,
      sentence: fallbackSentence,
      source: 'deterministic-rule-engine'
    });
  } catch (error: any) {
    console.error('[AI Rec Routes] Dish insight error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate dish insight' });
  }
});

export default router;
