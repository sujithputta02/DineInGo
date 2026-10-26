import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAndValidateQRPayload,
  ALLOWED_QR_DOMAINS
} from '../src/services/qrScannerService';

import {
  resolveNutritionIntelligence,
  scaleNutrition,
  type DetailedFoodNutrition
} from '../src/services/nutritionIntelligenceService';

import {
  evaluateDishRecommendation,
  type UserFoodPreferences
} from '../src/services/recommendationEngine';

// ============================================================================
// SUITE 1: QR PAYLOAD VALIDATION & OPEN-REDIRECT SECURITY
// ============================================================================

test('1. QR Security: Validates and parses allowed relative path', () => {
  const result = parseAndValidateQRPayload('/ar-demo?dish=french-onion-soup');
  assert.equal(result.isValid, true);
  assert.equal(result.dishId, 'french-onion-soup');
  assert.equal(result.targetRoute, '/ar-demo?dish=french-onion-soup');
});

test('2. QR Security: Blocks open-redirect attacks to unauthorized external domains', () => {
  const maliciousUrl = 'https://malicious-phishing-site.com/ar-demo?dish=french-onion-soup';
  const result = parseAndValidateQRPayload(maliciousUrl);
  assert.equal(result.isValid, false);
  assert.match(result.error || '', /Untrusted QR destination domain/i);
});

test('3. QR Security: Blocks dangerous javascript: and data: schemes', () => {
  const jsPayload = 'javascript:alert(1)';
  const result = parseAndValidateQRPayload(jsPayload);
  assert.equal(result.isValid, false);

  const dataPayload = 'data:text/html,<script>alert(1)</script>';
  const result2 = parseAndValidateQRPayload(dataPayload);
  assert.equal(result2.isValid, false);
});

test('4. QR Security: Correctly parses custom scheme dineingo://', () => {
  const deepLink = 'dineingo://ar?dish=braised-beef';
  const result = parseAndValidateQRPayload(deepLink);
  assert.equal(result.isValid, true);
  assert.equal(result.dishId, 'braised-beef');
  assert.equal(result.targetRoute, '/ar-demo?dish=braised-beef');
});

test('5. QR Security: Parses valid JSON table QR payload', () => {
  const jsonPayload = JSON.stringify({
    type: 'ar-dish',
    dish: 'salad-bowl',
    restaurantId: 'rest_123',
    tableId: 'table_4'
  });
  const result = parseAndValidateQRPayload(jsonPayload);
  assert.equal(result.isValid, true);
  assert.equal(result.dishId, 'salad-bowl');
  assert.equal(result.restaurantId, 'rest_123');
});

test('6. QR Security: Rejects malformed JSON and corrupted payloads', () => {
  const badJson = '{ type: "ar-dish", dish: ';
  const result = parseAndValidateQRPayload(badJson);
  assert.equal(result.isValid, false);
});

// ============================================================================
// SUITE 2: NUTRITION INTELLIGENCE & PORTION SCALING
// ============================================================================

test('7. Nutrition Intelligence: Accurately scales macros with portion multipliers', () => {
  const base = {
    calories: 400,
    protein: 20,
    carbs: 50,
    fat: 10,
    fiber: 4,
    sugar: 6,
    sodium: 600
  };

  const scaledHalf = scaleNutrition(base, 0.5);
  assert.equal(scaledHalf.calories, 200);
  assert.equal(scaledHalf.protein, 10);
  assert.equal(scaledHalf.carbs, 25);
  assert.equal(scaledHalf.fat, 5);

  const scaledDouble = scaleNutrition(base, 2.0);
  assert.equal(scaledDouble.calories, 800);
  assert.equal(scaledDouble.protein, 40);
  assert.equal(scaledDouble.carbs, 100);
  assert.equal(scaledDouble.fat, 20);
});

test('8. Nutrition Intelligence: Preserves Verified Restaurant data over fallback estimates', () => {
  const verified = resolveNutritionIntelligence('Artisanal French Onion Soup', {
    portionMultiplier: 1.0,
    verifiedRestaurantData: {
      baseNutrition: { calories: 350, protein: 18, carbs: 25, fat: 19 },
      allergens: ['dairy', 'gluten'],
      dietaryTags: ['starter']
    }
  });

  assert.equal(verified.isVerified, true);
  assert.equal(verified.provenance, 'verified-restaurant');
  assert.equal(verified.scaledNutrition.calories, 350);
  assert.equal(verified.uncertaintyPercent, 5);
});

test('9. Nutrition Intelligence: Correctly resolves Regional Indian food database entries', () => {
  const biryani = resolveNutritionIntelligence('Dum Biryani');
  assert.equal(biryani.provenance, 'usda-database');
  assert.equal(biryani.baseNutrition.calories, 460);
  assert.equal(biryani.baseNutrition.protein, 22);
  assert.ok(biryani.ingredients.length > 0);
  assert.ok(biryani.allergens.includes('dairy'));
});

test('10. Nutrition Intelligence: Explicitly marks unknown foods as estimated with uncertainty', () => {
  const unknown = resolveNutritionIntelligence('Unrecorded Exotic Fusion');
  assert.equal(unknown.provenance, 'ai-estimated');
  assert.equal(unknown.isVerified, false);
  assert.equal(unknown.uncertaintyPercent, 28);
});

// ============================================================================
// SUITE 3: PERSONALIZED RECOMMENDATION & ALLERGEN SAFETY
// ============================================================================

test('11. Recommendation Safety: Critical ALLERGEN_WARNING triggered when food matches saved allergen', () => {
  const soup = resolveNutritionIntelligence('French Onion Soup'); // Contains dairy and gluten
  const userPref: UserFoodPreferences = {
    dietaryPreferences: [],
    allergens: ['dairy'],
    dislikedIngredients: []
  };

  const outcome = evaluateDishRecommendation(soup, userPref);
  assert.equal(outcome.status, 'ALLERGEN_WARNING');
  assert.equal(outcome.variant, 'danger');
  assert.match(outcome.headline, /Contains dairy/i);
});

test('12. Recommendation Safety: NEVER claims allergen-free when allergen data is incomplete', () => {
  const unverifiedFood: DetailedFoodNutrition = {
    dishName: 'Mystery Stew',
    servingSizeGrams: 250,
    portionMultiplier: 1.0,
    baseNutrition: { calories: 300, protein: 15, carbs: 20, fat: 12 },
    scaledNutrition: { calories: 300, protein: 15, carbs: 20, fat: 12 },
    uncertaintyPercent: 30,
    provenance: 'ai-estimated',
    provenanceLabel: 'Estimated',
    isVerified: false,
    ingredients: [],
    allergens: [], // Missing / empty records
    dietaryTags: [],
    timestamp: new Date().toISOString()
  };

  const userWithAllergy: UserFoodPreferences = {
    dietaryPreferences: [],
    allergens: ['nuts'],
    dislikedIngredients: []
  };

  const outcome = evaluateDishRecommendation(unverifiedFood, userWithAllergy);
  assert.equal(outcome.status, 'INCOMPLETE_ALLERGEN_DATA');
  assert.equal(outcome.variant, 'warning');
  assert.match(outcome.reasons.join(' '), /cannot be interpreted as allergen-free/i);
});

test('13. Recommendation Safety: Dietary restriction conflict detected (Non-Veg for Vegetarian)', () => {
  const beef = resolveNutritionIntelligence('Braised Beef');
  const vegUser: UserFoodPreferences = {
    dietaryPreferences: ['vegetarian'],
    allergens: [],
    dislikedIngredients: []
  };

  const outcome = evaluateDishRecommendation(beef, vegUser);
  assert.equal(outcome.status, 'PREFERENCE_CONFLICT');
  assert.match(outcome.headline, /Contains Meat/i);
  assert.ok(outcome.suggestedAlternative);
});

test('14. Recommendation Logic: Suggests realistic portion reduction when exceeding calorie budget', () => {
  const beef = resolveNutritionIntelligence('Braised Beef'); // 520 kcal
  const userBudget: UserFoodPreferences = {
    dietaryPreferences: [],
    allergens: [],
    dislikedIngredients: [],
    nutritionGoals: {
      dailyCaloriesTarget: 2000,
      remainingCaloriesToday: 300 // Beef (520) exceeds remaining 300
    }
  };

  const outcome = evaluateDishRecommendation(beef, userBudget);
  assert.equal(outcome.status, 'PORTION_ADJUST');
  assert.equal(outcome.variant, 'warning');
  assert.ok(outcome.suggestedPortionMultiplier && outcome.suggestedPortionMultiplier < 1.0);
  assert.match(outcome.headline, /Exceeds Remaining Calories/i);
});

test('15. Recommendation Logic: Marks compatible meals as COMPATIBLE with positive insights', () => {
  const salad = resolveNutritionIntelligence('Fresh Garden Caesar Salad');
  const healthyUser: UserFoodPreferences = {
    dietaryPreferences: ['vegetarian'],
    allergens: [],
    dislikedIngredients: [],
    nutritionGoals: {
      dailyCaloriesTarget: 2000,
      remainingCaloriesToday: 800,
      proteinTargetG: 60
    }
  };

  const outcome = evaluateDishRecommendation(salad, healthyUser);
  assert.equal(outcome.status, 'COMPATIBLE');
  assert.equal(outcome.variant, 'success');
  assert.equal(outcome.badge, 'Fits Your Goals');
});
