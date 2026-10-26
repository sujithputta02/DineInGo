import express, { Request, Response } from 'express';
import { FoodDiaryEntry, IFoodDiaryEntry } from '../models/FoodDiaryEntry';
import { UserPreference } from '../models/UserPreference';

const router = express.Router();

/**
 * Helper to authenticate user ownership when auth is active or header provided
 */
function getRequestUserId(req: Request): string | null {
  const user = (req as any).user;
  if (user && user.uid) return user.uid;
  const headerUserId = req.headers['x-user-id'] as string;
  if (headerUserId) return headerUserId.trim();
  return null;
}

/**
 * POST /api/v1/food-diary/log
 * Log a meal entry with nutritional provenance and portion multiplier
 */
router.post('/log', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      dishName,
      mealType = 'lunch',
      date,
      portionMultiplier = 1.0,
      baseNutrition,
      calculatedNutrition,
      provenance = 'ai-estimated',
      confidence = 0.85,
      sourceNotes,
      imageSnapshot,
      notes,
      restaurantId,
      allowDuplicate = false
    } = req.body;

    const effectiveUserId = userId || getRequestUserId(req);

    if (!effectiveUserId || !dishName || !baseNutrition) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, dishName, and baseNutrition are required.'
      });
    }

    const logDate = date ? new Date(date) : new Date();

    // Prevent accidental double-logging within 60 seconds
    if (!allowDuplicate) {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const existingRecent = await FoodDiaryEntry.findOne({
        userId: effectiveUserId,
        dishName: dishName.trim(),
        mealType,
        createdAt: { $gte: sixtySecondsAgo }
      });

      if (existingRecent) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: `"${dishName}" was already logged to ${mealType} a moment ago. Set allowDuplicate: true to log again.`,
          existingEntry: existingRecent
        });
      }
    }

    // Auto-calculate scaled nutrition if not passed
    const mult = Number(portionMultiplier) || 1.0;
    const finalCalculated = calculatedNutrition || {
      calories: Math.round(baseNutrition.calories * mult),
      protein: Math.round(baseNutrition.protein * mult * 10) / 10,
      carbs: Math.round(baseNutrition.carbs * mult * 10) / 10,
      fat: Math.round(baseNutrition.fat * mult * 10) / 10,
      fiber: baseNutrition.fiber ? Math.round(baseNutrition.fiber * mult * 10) / 10 : 0,
      sugar: baseNutrition.sugar ? Math.round(baseNutrition.sugar * mult * 10) / 10 : 0,
      sodium: baseNutrition.sodium ? Math.round(baseNutrition.sodium * mult) : 0
    };

    const entry = new FoodDiaryEntry({
      userId: effectiveUserId,
      dishName: dishName.trim(),
      mealType,
      date: logDate,
      portionMultiplier: mult,
      baseNutrition,
      calculatedNutrition: finalCalculated,
      provenance,
      confidence: Math.min(1, Math.max(0, Number(confidence) || 0.85)),
      sourceNotes,
      imageSnapshot,
      notes,
      restaurantId
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Meal intake confirmed and logged to food diary',
      entry
    });
  } catch (error: any) {
    console.error('Error logging food diary entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error while logging meal' });
  }
});

/**
 * GET /api/v1/food-diary/history/:userId
 * Fetch meal diary history with optional date range
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const query: any = { userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const history = await FoodDiaryEntry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit) || 50);

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error: any) {
    console.error('Error fetching food diary history:', error);
    res.status(500).json({ success: false, message: 'Internal server error fetching diary history' });
  }
});

/**
 * GET /api/v1/food-diary/daily-summary/:userId
 * Aggregate day's intake against user targets
 */
router.get('/daily-summary/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const entries = await FoodDiaryEntry.find({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ date: 1 });

    const totals = entries.reduce((acc, item) => {
      acc.calories += item.calculatedNutrition.calories || 0;
      acc.protein += item.calculatedNutrition.protein || 0;
      acc.carbs += item.calculatedNutrition.carbs || 0;
      acc.fat += item.calculatedNutrition.fat || 0;
      acc.fiber += item.calculatedNutrition.fiber || 0;
      acc.sugar += item.calculatedNutrition.sugar || 0;
      acc.sodium += item.calculatedNutrition.sodium || 0;
      return acc;
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    });

    // Round values
    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;
    totals.fiber = Math.round(totals.fiber * 10) / 10;
    totals.sugar = Math.round(totals.sugar * 10) / 10;
    totals.sodium = Math.round(totals.sodium);

    // Fetch user preferences / targets if set
    const userPref = await UserPreference.findOne({ userId });
    const targets = userPref?.nutritionGoals || {
      dailyCaloriesTarget: 2000,
      proteinTargetG: 60,
      carbTargetG: 250,
      fatTargetG: 65,
      preferredPortion: 'standard'
    };

    const remaining = {
      calories: Math.max(0, (targets.dailyCaloriesTarget || 2000) - totals.calories),
      protein: Math.max(0, (targets.proteinTargetG || 60) - totals.protein),
      carbs: Math.max(0, (targets.carbTargetG || 250) - totals.carbs),
      fat: Math.max(0, (targets.fatTargetG || 65) - totals.fat)
    };

    res.json({
      success: true,
      date: dateParam,
      entryCount: entries.length,
      entries,
      totals,
      targets,
      remaining
    });
  } catch (error: any) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error calculating daily summary' });
  }
});

/**
 * PATCH /api/v1/food-diary/:id
 * Update portion size or meal details
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { portionMultiplier, mealType, notes, date } = req.body;

    const entry = await FoodDiaryEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Food diary entry not found' });
    }

    // Check user identity ownership if provided
    const requesterId = getRequestUserId(req) || req.body.userId;
    if (requesterId && entry.userId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this diary entry.' });
    }

    if (mealType) entry.mealType = mealType;
    if (notes !== undefined) entry.notes = notes;
    if (date) entry.date = new Date(date);

    if (portionMultiplier !== undefined) {
      const mult = Number(portionMultiplier);
      if (mult <= 0 || isNaN(mult)) {
        return res.status(400).json({ success: false, message: 'Invalid portionMultiplier' });
      }
      entry.portionMultiplier = mult;
      entry.calculatedNutrition = {
        calories: Math.round(entry.baseNutrition.calories * mult),
        protein: Math.round(entry.baseNutrition.protein * mult * 10) / 10,
        carbs: Math.round(entry.baseNutrition.carbs * mult * 10) / 10,
        fat: Math.round(entry.baseNutrition.fat * mult * 10) / 10,
        fiber: entry.baseNutrition.fiber ? Math.round(entry.baseNutrition.fiber * mult * 10) / 10 : 0,
        sugar: entry.baseNutrition.sugar ? Math.round(entry.baseNutrition.sugar * mult * 10) / 10 : 0,
        sodium: entry.baseNutrition.sodium ? Math.round(entry.baseNutrition.sodium * mult) : 0
      };
    }

    await entry.save();

    res.json({
      success: true,
      message: 'Diary entry updated successfully',
      entry
    });
  } catch (error: any) {
    console.error('Error updating diary entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error updating diary entry' });
  }
});

/**
 * DELETE /api/v1/food-diary/:id
 * Remove a diary entry
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entry = await FoodDiaryEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Diary entry not found' });
    }

    const requesterId = getRequestUserId(req) || (req.query.userId as string);
    if (requesterId && entry.userId !== requesterId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this diary entry.' });
    }

    await FoodDiaryEntry.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Diary entry deleted successfully',
      deletedId: id
    });
  } catch (error: any) {
    console.error('Error deleting diary entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error deleting diary entry' });
  }
});

export default router;
