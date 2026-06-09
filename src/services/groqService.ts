/**
 * Groq AI Service
 * Fast AI for personalized food recommendations
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-70b-versatile'; // Fast, free model

export interface UserProfile {
  dietary?: string[]; // ['vegetarian', 'gluten-free']
  allergies?: string[]; // ['dairy', 'nuts']
  healthGoals?: string[]; // ['weight-loss', 'muscle-gain']
  spicePreference?: 'mild' | 'medium' | 'spicy';
  calorieTarget?: number;
  macroTargets?: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DishInfo {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  spiceLevel?: string;
}

export interface RecommendationResult {
  score: number; // 0-100
  verdict: 'excellent' | 'good' | 'okay' | 'not-recommended';
  reasons: string[];
  warnings: string[];
  alternatives?: string[];
  rawResponse: string;
}

/**
 * Get personalized recommendation for a dish
 */
export async function getPersonalizedRecommendation(
  dish: DishInfo,
  userProfile: UserProfile
): Promise<RecommendationResult | null> {
  
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_key_here') {
    console.warn('[Groq] API key not configured');
    return null;
  }

  try {
    const prompt = buildRecommendationPrompt(dish, userProfile);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition advisor. Analyze if a dish matches user preferences and health goals. Be concise and specific.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq] API Error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    console.log('[Groq] AI Response:', aiResponse);

    // Parse the AI response
    return parseRecommendation(aiResponse);

  } catch (error: any) {
    console.error('[Groq] Error:', error.message);
    return null;
  }
}

/**
 * Build the recommendation prompt
 */
function buildRecommendationPrompt(dish: DishInfo, profile: UserProfile): string {
  return `
Analyze this dish for the user:

DISH: ${dish.name}
- Calories: ${dish.calories || 'Unknown'}
- Protein: ${dish.protein || 'Unknown'}g
- Carbs: ${dish.carbs || 'Unknown'}g
- Fat: ${dish.fat || 'Unknown'}g
- Allergens: ${dish.allergens?.join(', ') || 'None listed'}
- Vegetarian: ${dish.isVegetarian ? 'Yes' : 'No'}
- Vegan: ${dish.isVegan ? 'Yes' : 'No'}
- Spice Level: ${dish.spiceLevel || 'Unknown'}

USER PROFILE:
- Dietary Preferences: ${profile.dietary?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}
- Health Goals: ${profile.healthGoals?.join(', ') || 'None'}
- Spice Preference: ${profile.spicePreference || 'Any'}
- Daily Calorie Target: ${profile.calorieTarget || 'Not set'}

Rate this dish for the user (0-100) and explain:
1. Match Score (0-100)
2. Why it's good or bad for them
3. Any warnings (allergens, calories, etc.)
4. Verdict: excellent/good/okay/not-recommended

Format:
Score: [number]
Verdict: [verdict]
Reasons: [bullet points]
Warnings: [bullet points if any]
  `.trim();
}

/**
 * Parse AI response into structured recommendation
 */
function parseRecommendation(aiResponse: string): RecommendationResult {
  const lines = aiResponse.split('\n').map(l => l.trim()).filter(l => l);
  
  let score = 50;
  let verdict: RecommendationResult['verdict'] = 'okay';
  const reasons: string[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    // Extract score
    if (line.toLowerCase().includes('score:')) {
      const match = line.match(/(\d+)/);
      if (match) score = parseInt(match[1]);
    }

    // Extract verdict
    if (line.toLowerCase().includes('verdict:')) {
      if (line.toLowerCase().includes('excellent')) verdict = 'excellent';
      else if (line.toLowerCase().includes('good')) verdict = 'good';
      else if (line.toLowerCase().includes('not')) verdict = 'not-recommended';
      else verdict = 'okay';
    }

    // Extract reasons
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      const reason = line.replace(/^[-•*]\s*/, '');
      if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('caution')) {
        warnings.push(reason);
      } else {
        reasons.push(reason);
      }
    }
  }

  // Fallback: Use score to determine verdict if not found
  if (!verdict || verdict === 'okay') {
    if (score >= 80) verdict = 'excellent';
    else if (score >= 65) verdict = 'good';
    else if (score >= 40) verdict = 'okay';
    else verdict = 'not-recommended';
  }

  return {
    score,
    verdict,
    reasons: reasons.length > 0 ? reasons : ['Analysis based on nutritional profile'],
    warnings: warnings.length > 0 ? warnings : [],
    rawResponse: aiResponse
  };
}

/**
 * Test if Groq API is working
 */
export async function testGroqAPI(): Promise<boolean> {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_key_here') {
    return false;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
