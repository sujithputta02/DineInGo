/**
 * USDA FoodData Central & Regional Nutrition Service
 * ──────────────────────────────────────────────────
 * Queries backend nutrition endpoints to retrieve chemical composition.
 * Client does NOT possess any private API keys.
 */

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  saturatedFat?: number;
  cholesterol?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  nutrition: NutritionData;
  ingredients?: string;
  allergens?: string[];
}

/**
 * Search for food via secure backend nutrition service
 */
export async function searchFood(query: string): Promise<USDAFood[]> {
  try {
    const response = await fetch(`/api/v1/nutrition/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      console.warn('[Nutrition] Backend query error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.foods || [];
  } catch (error: any) {
    console.warn('[Nutrition] Backend query unreachable:', error.message);
    return [];
  }
}

/**
 * Get nutrition data for a specific dish
 */
export async function getNutritionForDish(dishName: string): Promise<NutritionData | null> {
  const results = await searchFood(dishName);
  
  if (results.length === 0) {
    return estimateIndianDishNutrition(dishName);
  }

  // Return the first (most relevant) result
  return results[0].nutrition;
}

/**
 * Test if backend nutrition service is reachable
 */
export async function testUSDAAPI(): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/nutrition/search?query=apple');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Estimate nutrition for Indian dishes (fallback when USDA doesn't have data)
 */
export function estimateIndianDishNutrition(dishName: string): NutritionData {
  const normalized = dishName.toLowerCase();
  
  const estimates: Record<string, NutritionData> = {
    'biryani': {
      calories: 450, protein: 20, carbs: 55, fat: 18,
      fiber: 3, sodium: 800, sugar: 3, saturatedFat: 6,
      cholesterol: 60, vitaminC: 5, calcium: 50, iron: 3
    },
    'butter chicken': {
      calories: 490, protein: 28, carbs: 12, fat: 36,
      fiber: 2, sodium: 900, sugar: 6, saturatedFat: 18,
      cholesterol: 110, vitaminC: 8, calcium: 80, iron: 2
    },
    'paneer tikka': {
      calories: 320, protein: 18, carbs: 8, fat: 24,
      fiber: 2, sodium: 650, sugar: 3, saturatedFat: 12,
      cholesterol: 60, vitaminC: 15, calcium: 200, iron: 1
    },
    'dosa': {
      calories: 280, protein: 8, carbs: 48, fat: 6,
      fiber: 3, sodium: 400, sugar: 2, saturatedFat: 1,
      cholesterol: 0, vitaminC: 2, calcium: 30, iron: 2
    },
    'samosa': {
      calories: 250, protein: 5, carbs: 30, fat: 12,
      fiber: 3, sodium: 450, sugar: 2, saturatedFat: 3,
      cholesterol: 0, vitaminC: 8, calcium: 20, iron: 2
    }
  };

  for (const [key, nutrition] of Object.entries(estimates)) {
    if (normalized.includes(key)) {
      return nutrition;
    }
  }

  // Default fallback
  return {
    calories: 350, protein: 15, carbs: 40, fat: 15,
    fiber: 3, sodium: 600, sugar: 4, saturatedFat: 5,
    cholesterol: 40, vitaminC: 5, calcium: 50, iron: 2
  };
}
