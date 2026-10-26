import express, { Request, Response } from 'express';
import { FoodDiaryEntry } from '../models/FoodDiaryEntry';
import { UserPreference } from '../models/UserPreference';
import { verifyUserToken } from '../middleware/userAuth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply verified user authentication to all food diary routes
router.use(verifyUserToken);

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function isValidDate(d: any): boolean {
  if (!d) return false;
  const time = new Date(d).getTime();
  if (isNaN(time)) return false;
  // Year between 2000 and 2100
  const year = new Date(d).getFullYear();
  return year >= 2000 && year <= 2100;
}

function validateNutritionNumbers(obj: any): { valid: boolean; reason?: string } {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, reason: 'Nutrition must be an object' };
  }
  const fields = ['calories', 'protein', 'carbs', 'fat'];
  for (const f of fields) {
    const val = obj[f];
    if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 20000) {
      return { valid: false, reason: `Field ${f} must be a number between 0 and 20000` };
    }
  }
  return { valid: true };
}

/**
 * POST /api/v1/food-diary/log
 * Log a meal entry with nutritional provenance and portion multiplier
 * Identity is strictly obtained from req.user.uid
 */
router.post('/log', apiLimiter, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User authentication required.' });
    }
    const authenticatedUid = authUser.uid;

    const {
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

    // Strict validation
    if (!dishName || typeof dishName !== 'string' || dishName.trim().length === 0 || dishName.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dishName: must be a non-empty string up to 200 characters.'
      });
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid mealType: must be one of ${VALID_MEAL_TYPES.join(', ')}.`
      });
    }

    const mult = Number(portionMultiplier);
    if (isNaN(mult) || mult < 0.05 || mult > 20.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portionMultiplier: must be a number between 0.05 and 20.0.'
      });
    }

    const nutritionCheck = validateNutritionNumbers(baseNutrition);
    if (!nutritionCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid baseNutrition: ${nutritionCheck.reason}`
      });
    }

    let logDate = new Date();
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date parameter: must be a valid ISO date string.'
        });
      }
      logDate = new Date(date);
    }

    // Prevent accidental double-logging within 60 seconds
    if (!allowDuplicate) {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
      const existingRecent = await FoodDiaryEntry.findOne({
        userId: authenticatedUid,
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

    // Auto-calculate scaled nutrition
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
      userId: authenticatedUid, // STRICT: Always use authenticated context
      dishName: dishName.trim(),
      mealType,
      date: logDate,
      portionMultiplier: mult,
      baseNutrition,
      calculatedNutrition: finalCalculated,
      provenance,
      confidence: Math.min(1, Math.max(0, Number(confidence) || 0.85)),
      sourceNotes: typeof sourceNotes === 'string' ? sourceNotes.slice(0, 500) : undefined,
      imageSnapshot: typeof imageSnapshot === 'string' && imageSnapshot.length < 500000 ? imageSnapshot : undefined,
      notes: typeof notes === 'string' ? notes.slice(0, 1000) : undefined,
      restaurantId: typeof restaurantId === 'string' ? restaurantId.slice(0, 100) : undefined
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
 * GET /api/v1/food-diary/history
 * GET /api/v1/food-diary/history/:userId
 * Fetch meal diary history for authenticated user only
 */
router.get(['/history', '/history/:userId'], async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User authentication required.' });
    }
    const authenticatedUid = authUser.uid;

    // Enforce ownership: reject cross-user access attempts
    if (req.params.userId && req.params.userId !== authenticatedUid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view another user\'s food diary.'
      });
    }

    const { startDate, endDate, limit = 50 } = req.query;
    const query: any = { userId: authenticatedUid };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        if (!isValidDate(startDate)) {
          return res.status(400).json({ success: false, message: 'Invalid startDate parameter' });
        }
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        if (!isValidDate(endDate)) {
          return res.status(400).json({ success: false, message: 'Invalid endDate parameter' });
        }
        query.date.$lte = new Date(endDate as string);
      }
    }

    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const history = await FoodDiaryEntry.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(parsedLimit);

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
 * GET /api/v1/food-diary/daily-summary
 * GET /api/v1/food-diary/daily-summary/:userId
 * Aggregate day's intake against authenticated user targets
 */
router.get(['/daily-summary', '/daily-summary/:userId'], async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User authentication required.' });
    }
    const authenticatedUid = authUser.uid;

    // Enforce ownership: reject cross-user access attempts
    if (req.params.userId && req.params.userId !== authenticatedUid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot view another user\'s daily summary.'
      });
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ success: false, message: 'Date must be formatted as YYYY-MM-DD.' });
    }

    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const entries = await FoodDiaryEntry.find({
      userId: authenticatedUid,
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

    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;
    totals.fiber = Math.round(totals.fiber * 10) / 10;
    totals.sugar = Math.round(totals.sugar * 10) / 10;
    totals.sodium = Math.round(totals.sodium);

    const userPref = await UserPreference.findOne({ userId: authenticatedUid });
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
 * GET /api/v1/food-diary/:id
 * Read a single diary entry with ownership verification
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { id } = req.params;

    const entry = await FoodDiaryEntry.findById(id);
    // Non-disclosing 404 for missing or unowned entries
    if (!entry || entry.userId !== authUser.uid) {
      return res.status(404).json({ success: false, message: 'Food diary entry not found.' });
    }

    res.json({ success: true, entry });
  } catch (error: any) {
    console.error('Error reading diary entry:', error);
    res.status(500).json({ success: false, message: 'Internal server error reading diary entry' });
  }
});

/**
 * PATCH /api/v1/food-diary/:id
 * Update portion size or meal details with ownership check
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { portionMultiplier, mealType, notes, date } = req.body;

    const entry = await FoodDiaryEntry.findById(id);
    // Non-disclosing 404 for unowned or missing entries
    if (!entry || entry.userId !== authUser.uid) {
      return res.status(404).json({ success: false, message: 'Food diary entry not found.' });
    }

    if (mealType) {
      if (!VALID_MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ success: false, message: 'Invalid mealType' });
      }
      entry.mealType = mealType;
    }

    if (notes !== undefined) {
      entry.notes = typeof notes === 'string' ? notes.slice(0, 1000) : '';
    }

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({ success: false, message: 'Invalid date parameter' });
      }
      entry.date = new Date(date);
    }

    if (portionMultiplier !== undefined) {
      const mult = Number(portionMultiplier);
      if (isNaN(mult) || mult < 0.05 || mult > 20.0) {
        return res.status(400).json({ success: false, message: 'Invalid portionMultiplier: must be between 0.05 and 20.0.' });
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
 * Remove a diary entry with strict ownership verification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { id } = req.params;

    const entry = await FoodDiaryEntry.findById(id);
    // Non-disclosing 404 for unowned or missing entries
    if (!entry || entry.userId !== authUser.uid) {
      return res.status(404).json({ success: false, message: 'Diary entry not found.' });
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
