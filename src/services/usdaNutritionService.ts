/**
 * USDA FoodData Central API Service
 * Free nutrition data for 800,000+ foods
 */

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY;
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  saturatedFat: number;
  cholesterol: number;
  vitaminC: number;
  calcium: number;
  iron: number;
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
 * Search for food in USDA database
 */
export async function searchFood(query: string): Promise<USDAFood[]> {
  if (!USDA_API_KEY) {
    console.error('[USDA] API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      console.error('[USDA] API Error:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log('[USDA] No results found for:', query);
      return [];
    }

    return data.foods.map((food: any) => parseUSDAFood(food));
  } catch (error: any) {
    console.error('[USDA] Error:', error.message);
    return [];
  }
}

/**
 * Get nutrition data for a specific dish
 */
export async function getNutritionForDish(dishName: string): Promise<NutritionData | null> {
  const results = await searchFood(dishName);
  
  if (results.length === 0) {
    console.log('[USDA] No nutrition data found for:', dishName);
    return null;
  }

  // Return the first (most relevant) result
  return results[0].nutrition;
}

/**
 * Parse USDA food data into our format
 */
function parseUSDAFood(food: any): USDAFood {
  const nutrients = food.foodNutrients || [];
  
  const getNutrient = (name: string): number => {
    const nutrient = nutrients.find((n: any) => 
      n.nutrientName?.toLowerCase().includes(name.toLowerCase())
    );
    return nutrient?.value || 0;
  };

  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    nutrition: {
      calories: getNutrient('Energy'),
      protein: getNutrient('Protein'),
      carbs: getNutrient('Carbohydrate'),
      fat: getNutrient('Total lipid'),
      fiber: getNutrient('Fiber'),
      sodium: getNutrient('Sodium'),
      sugar: getNutrient('Sugars'),
      saturatedFat: getNutrient('Fatty acids, total saturated'),
      cholesterol: getNutrient('Cholesterol'),
      vitaminC: getNutrient('Vitamin C'),
      calcium: getNutrient('Calcium'),
      iron: getNutrient('Iron')
    },
    ingredients: food.ingredients,
    allergens: extractAllergens(food)
  };
}

/**
 * Extract common allergens from USDA data
 */
function extractAllergens(food: any): string[] {
  const allergens: string[] = [];
  const description = (food.description || '').toLowerCase();
  const ingredients = (food.ingredients || '').toLowerCase();
  const text = `${description} ${ingredients}`;

  const allergenKeywords = {
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein'],
    nuts: ['peanut', 'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut'],
    gluten: ['wheat', 'barley', 'rye', 'gluten'],
    soy: ['soy', 'soybean', 'tofu'],
    eggs: ['egg', 'eggs'],
    fish: ['fish', 'salmon', 'tuna', 'cod'],
    shellfish: ['shrimp', 'crab', 'lobster', 'shellfish'],
    sesame: ['sesame', 'tahini']
  };

  for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      allergens.push(allergen);
    }
  }

  return allergens;
}

/**
 * Get detailed food information by FDC ID
 */
export async function getFoodDetails(fdcId: number): Promise<USDAFood | null> {
  if (!USDA_API_KEY) {
    console.error('[USDA] API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      console.error('[USDA] API Error:', response.status);
      return null;
    }

    const food = await response.json();
    return parseUSDAFood(food);
  } catch (error: any) {
    console.error('[USDA] Error:', error.message);
    return null;
  }
}

/**
 * Test if USDA API is working
 */
export async function testUSDAAPI(): Promise<boolean> {
  if (!USDA_API_KEY) {
    return false;
  }

  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=apple&pageSize=1&api_key=${USDA_API_KEY}`
    );
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
  
  // Common Indian dishes with typical nutrition values
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

  // Try to find a match
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
