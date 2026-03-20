import express, { Request, Response } from 'express';
import { aiRecommendationService } from '../services/aiRecommendationService';

const router = express.Router();

/**
 * GET /api/v1/recommendations/ai
 * AI-powered reasoning for recommendations
 */
router.post('/ai', async (req: Request, res: Response) => {
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

export default router;
