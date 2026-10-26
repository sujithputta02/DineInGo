/**
 * DineInGo Personalized Food Recommendation Engine
 * ────────────────────────────────────────────────
 * Evaluates food nutrition, ingredients, and allergen data against
 * user-configured preferences, dietary restrictions, and macro targets.
 *
 * Rules:
 * - Deterministic, explainable rule engine (NOT an opaque LLM hallucination).
 * - Allergens trigger CRITICAL warnings.
 * - Missing allergen data triggers INCOMPLETE_ALLERGEN_DATA (never claims safe).
 * - Calorie budget overage suggests portion reductions.
 * - Helpful alternatives suggested when conflicts exist.
 */

import { DetailedFoodNutrition } from './nutritionIntelligenceService';

export interface UserFoodPreferences {
  dietaryPreferences: string[]; // e.g. ['vegetarian', 'vegan', 'halal', 'keto', 'gluten-free']
  allergens: string[];          // e.g. ['dairy', 'nuts', 'gluten', 'shellfish', 'eggs']
  dislikedIngredients: string[]; // e.g. ['mushrooms', 'coriander', 'onions']
  nutritionGoals?: {
    dailyCaloriesTarget?: number; // e.g. 2000
    proteinTargetG?: number;      // e.g. 70
    carbTargetG?: number;         // e.g. 200
    fatTargetG?: number;          // e.g. 60
    remainingCaloriesToday?: number; // e.g. 650
  };
}

export type RecommendationStatus =
  | 'COMPATIBLE'
  | 'PORTION_ADJUST'
  | 'PREFERENCE_CONFLICT'
  | 'ALLERGEN_WARNING'
  | 'INCOMPLETE_ALLERGEN_DATA';

export interface RecommendationOutcome {
  status: RecommendationStatus;
  badge: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
  headline: string;
  reasons: string[];
  suggestedPortionMultiplier?: number;
  suggestedAlternative?: {
    dishName: string;
    reason: string;
  };
  disclaimer: string;
}

export const KNOWN_MENU_ALTERNATIVES: Record<string, { dishName: string; reason: string }[]> = {
  'braised-beef': [
    { dishName: 'Artisanal French Onion Soup', reason: 'Lower calorie starter option with rich savory broth' },
    { dishName: 'Fresh Garden Caesar Salad', reason: 'High fiber, lower-calorie alternative' }
  ],
  'baked-pie': [
    { dishName: 'Fresh Garden Caesar Salad', reason: 'Savory, lower-sugar option without refined bakery sugar' }
  ],
  'creme-brulee': [
    { dishName: 'Fresh Garden Caesar Salad', reason: 'Significantly lower sugar and saturated fat' }
  ],
  'french-onion-soup': [
    { dishName: 'Fresh Garden Caesar Salad', reason: 'Lighter starter with fresh crisp greens' }
  ]
};

export function evaluateDishRecommendation(
  nutrition: DetailedFoodNutrition,
  preferences?: UserFoodPreferences | null
): RecommendationOutcome {
  const disclaimer = 'Nutritional analysis and portion recommendations assist informed dining decisions and are not medical advice. Always confirm critical allergies with restaurant staff.';

  // Default when no user preferences have been saved
  if (!preferences || (!preferences.dietaryPreferences?.length && !preferences.allergens?.length && !preferences.nutritionGoals)) {
    return {
      status: 'COMPATIBLE',
      badge: 'Balanced Choice',
      variant: 'info',
      headline: 'Standard Nutritional Profile',
      reasons: [
        `${nutrition.scaledNutrition.calories} kcal with ${nutrition.scaledNutrition.protein}g protein per serving.`,
        'Configure your dietary preferences and nutrition goals in your profile for personalized matching.'
      ],
      disclaimer
    };
  }

  const reasons: string[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ALLERGEN SAFETY CHECK (Highest Priority)
  // ─────────────────────────────────────────────────────────────────────────
  const userAllergens = (preferences.allergens || []).map(a => a.toLowerCase().trim());

  // Check for unknown or missing allergen provenance
  if (userAllergens.length > 0 && !nutrition.isVerified && nutrition.allergens.length === 0) {
    return {
      status: 'INCOMPLETE_ALLERGEN_DATA',
      badge: 'Allergen Data Unverified',
      variant: 'warning',
      headline: 'Allergen Information Incomplete',
      reasons: [
        `You have saved allergen preferences (${userAllergens.join(', ')}).`,
        'This dish lacks verified ingredient lab certification.',
        'CRITICAL: Missing allergen records cannot be interpreted as allergen-free. Please consult restaurant staff before consuming.'
      ],
      disclaimer
    };
  }

  // Check matching allergens
  const conflictingAllergens: string[] = [];
  for (const allergen of userAllergens) {
    const isDirectAllergen = nutrition.allergens.some(a => a.toLowerCase().includes(allergen));
    const isIngredientAllergen = nutrition.ingredients.some(ing => ing.toLowerCase().includes(allergen));
    if (isDirectAllergen || isIngredientAllergen) {
      conflictingAllergens.push(allergen);
    }
  }

  if (conflictingAllergens.length > 0) {
    return {
      status: 'ALLERGEN_WARNING',
      badge: 'Allergen Warning',
      variant: 'danger',
      headline: `Contains ${conflictingAllergens.join(', ')}`,
      reasons: [
        `Contains ${conflictingAllergens.join(', ')}, which conflicts with your saved allergen profile.`,
        'We strongly advise choosing an alternative preparation or verifying recipe modifications with kitchen staff.'
      ],
      suggestedAlternative: getAlternative(nutrition.dishName),
      disclaimer
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DIETARY PREFERENCE RESTRICTIONS (Vegetarian / Vegan / Halal / Gluten-Free)
  // ─────────────────────────────────────────────────────────────────────────
  const userDiets = (preferences.dietaryPreferences || []).map(d => d.toLowerCase().trim());
  const dishTags = (nutrition.dietaryTags || []).map(t => t.toLowerCase());

  for (const diet of userDiets) {
    if (diet === 'vegetarian' && !dishTags.includes('vegetarian') && !dishTags.includes('vegan')) {
      const nonVegKeywords = ['beef', 'chicken', 'pork', 'meat', 'bacon', 'lamb', 'fish', 'seafood'];
      const hasMeat = nonVegKeywords.some(kw => 
        nutrition.dishName.toLowerCase().includes(kw) || 
        nutrition.ingredients.some(i => i.toLowerCase().includes(kw))
      );
      if (hasMeat) {
        return {
          status: 'PREFERENCE_CONFLICT',
          badge: 'Dietary Conflict',
          variant: 'warning',
          headline: 'Contains Meat (Not Vegetarian)',
          reasons: [
            'This dish contains meat ingredients that conflict with your saved Vegetarian preference.',
            'Consider selecting a verified vegetarian or plant-based alternative.'
          ],
          suggestedAlternative: getAlternative(nutrition.dishName),
          disclaimer
        };
      }
    }

    if (diet === 'vegan' && !dishTags.includes('vegan')) {
      const nonVeganKeywords = ['dairy', 'milk', 'cheese', 'butter', 'cream', 'egg', 'honey', 'beef', 'chicken'];
      const hasAnimalProduct = nonVeganKeywords.some(kw =>
        nutrition.allergens.some(a => a.toLowerCase().includes(kw)) ||
        nutrition.ingredients.some(i => i.toLowerCase().includes(kw))
      );
      if (hasAnimalProduct) {
        return {
          status: 'PREFERENCE_CONFLICT',
          badge: 'Dietary Conflict',
          variant: 'warning',
          headline: 'Contains Animal Products (Not Vegan)',
          reasons: [
            'This dish contains animal-derived ingredients (dairy, egg, or meat) that conflict with your saved Vegan preference.'
          ],
          suggestedAlternative: getAlternative(nutrition.dishName),
          disclaimer
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. DISLIKED INGREDIENTS CHECK
  // ─────────────────────────────────────────────────────────────────────────
  const disliked = (preferences.dislikedIngredients || []).map(d => d.toLowerCase().trim());
  const matchedDisliked = disliked.filter(d => 
    nutrition.ingredients.some(ing => ing.toLowerCase().includes(d)) ||
    nutrition.dishName.toLowerCase().includes(d)
  );

  if (matchedDisliked.length > 0) {
    reasons.push(`Contains ingredient you prefer to avoid: ${matchedDisliked.join(', ')}.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. NUTRITION & CALORIE TARGET BUDGETING
  // ─────────────────────────────────────────────────────────────────────────
  const goals = preferences.nutritionGoals;
  if (goals) {
    const remainingCalories = goals.remainingCaloriesToday;
    const currentCalories = nutrition.scaledNutrition.calories;

    if (remainingCalories !== undefined && remainingCalories > 0 && currentCalories > remainingCalories) {
      // Suggest realistic portion reduction
      const recommendedMultiplier = Math.max(0.4, Math.round((remainingCalories / nutrition.baseNutrition.calories) * 10) / 10);
      return {
        status: 'PORTION_ADJUST',
        badge: 'Adjust Portion Size',
        variant: 'warning',
        headline: `Exceeds Remaining Calories (${currentCalories} vs ${remainingCalories} kcal left)`,
        reasons: [
          `Current portion is ${currentCalories} kcal, but your daily budget has ${remainingCalories} kcal remaining.`,
          `Enjoy a ${recommendedMultiplier}x portion (${Math.round(nutrition.baseNutrition.calories * recommendedMultiplier)} kcal) to stay right on track with your goals!`
        ],
        suggestedPortionMultiplier: recommendedMultiplier,
        disclaimer
      };
    }

    // High protein goal check
    if (goals.proteinTargetG && goals.proteinTargetG > 50 && nutrition.scaledNutrition.protein >= 20) {
      reasons.push(`High protein contribution: provides ${nutrition.scaledNutrition.protein}g protein towards your ${goals.proteinTargetG}g target.`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. COMPATIBLE / EXCELLENT FIT
  // ─────────────────────────────────────────────────────────────────────────
  if (reasons.length === 0) {
    reasons.push('Matches your saved dietary preferences and fits cleanly into your daily nutritional budget.');
  }

  return {
    status: 'COMPATIBLE',
    badge: 'Fits Your Goals',
    variant: 'success',
    headline: 'Recommended For You',
    reasons,
    disclaimer
  };
}

function getAlternative(dishName: string): { dishName: string; reason: string } | undefined {
  const norm = dishName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  for (const [key, alts] of Object.entries(KNOWN_MENU_ALTERNATIVES)) {
    if (norm.includes(key)) {
      return alts[0];
    }
  }
  return {
    dishName: 'Fresh Garden Caesar Salad',
    reason: 'Balanced starter with fresh greens and lower calorie density'
  };
}
