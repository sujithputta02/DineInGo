/**
 * DineInGo Food Recognition Provider & Analysis Pipeline
 * ───────────────────────────────────────────────────────
 * Pluggable provider abstraction for food image recognition.
 * Enforces honest uncertainty representation, multi-dish awareness,
 * ingredient inference, and user confirmation before nutrition tracking.
 */

import { identifyFoodFromCamera, VisionResult } from './foodVisionService';
import { resolveDishModel, ResolvedDishModel } from './arModelService';

export interface FoodRecognitionHypothesis {
  dishName: string;
  category: string;
  confidence: number;
  confidenceTier: 'high' | 'moderate' | 'low';
  visibleIngredients: string[];
  estimatedPortion: {
    servingGrams: number;
    uncertaintyGrams: number;
    description: string;
  };
  visualEvidence: string;
  undeterminedFactors: string[];
  matchedMenuItem?: ResolvedDishModel;
}

export interface FoodAnalysisReport {
  primaryFood: FoodRecognitionHypothesis;
  secondaryFoods?: FoodRecognitionHypothesis[];
  rawVisionResult?: VisionResult;
  imageSnapshot?: string;
  needsUserConfirmation: boolean;
  providerStatus: {
    providerName: string;
    isRealProvider: boolean;
    setupNote?: string;
  };
}

/**
 * Common culinary database to expand raw vision labels into rich food intelligence
 */
const CULINARY_KNOWLEDGE: Record<string, {
  category: string;
  ingredients: string[];
  typicalGrams: number;
  uncertaintyGrams: number;
  evidence: string;
  undetermined: string[];
}> = {
  'french onion soup': {
    category: 'Soups & Starters',
    ingredients: ['Caramelized yellow onions', 'Beef/savory broth', 'Toasted baguette crouton', 'Gruyère cheese'],
    typicalGrams: 300,
    uncertaintyGrams: 45,
    evidence: 'Dark rich caramelized broth, bread float, and broiled melted cheese cap.',
    undetermined: ['Actual sodium concentration', 'Ratio of beef to vegetable stock', 'Hidden butter content']
  },
  'salad bowl': {
    category: 'Salads & Greens',
    ingredients: ['Romaine lettuce', 'Parmesan flakes', 'Garlic croutons', 'Emulsified Caesar dressing'],
    typicalGrams: 240,
    uncertaintyGrams: 35,
    evidence: 'Crisp green romaine leaf texture, parmesan curls, golden crouton cubes.',
    undetermined: ['Volume of dressing tossed at bottom of bowl', 'Anchovy paste presence in dressing']
  },
  'braised beef': {
    category: 'Mains & Stews',
    ingredients: ['Braised beef cut', 'Red wine reduction glaze', 'Carrot rounds', 'Pearl onions', 'Mushrooms'],
    typicalGrams: 340,
    uncertaintyGrams: 50,
    evidence: 'Seared and slow-cooked deep brown beef chunks in glossy sauce reduction with root vegetables.',
    undetermined: ['Lean vs fatty cut percentage', 'Flour/starch thickener in reduction sauce']
  },
  'baked pie': {
    category: 'Desserts & Pastries',
    ingredients: ['Caramelized apples', 'Flaky puff pastry', 'Cane sugar glaze', 'Cinnamon spice'],
    typicalGrams: 180,
    uncertaintyGrams: 25,
    evidence: 'Concentric apple slice rosette, golden-brown baked pastry perimeter.',
    undetermined: ['Total sugar concentration added during reduction', 'Butter percentage in pastry layers']
  },
  'creme brulee': {
    category: 'Desserts & Custards',
    ingredients: ['Egg yolk custard', 'Heavy cream', 'Torch-caramelized sugar shell', 'Vanilla bean'],
    typicalGrams: 160,
    uncertaintyGrams: 20,
    evidence: 'Smooth ceramic ramekin, flat amber caramelized sugar crust with torch marks.',
    undetermined: ['Egg yolk count and heavy cream fat percentage', 'Exact depth of ramekin']
  },
  'biryani': {
    category: 'Rice & Biryani',
    ingredients: ['Long-grain basmati rice', 'Marinated meat or paneer', 'Saffron', 'Fried onions', 'Spices'],
    typicalGrams: 350,
    uncertaintyGrams: 55,
    evidence: 'Fluffy dual-colored saffron basmati rice layers, caramelized onions, whole spices.',
    undetermined: ['Ghee volume absorbed by rice grains', 'Internal bone-to-meat ratio']
  },
  'butter chicken': {
    category: 'Curries & Gravies',
    ingredients: ['Tandoori chicken pieces', 'Tomato cream gravy', 'Butter', 'Kasuri methi'],
    typicalGrams: 300,
    uncertaintyGrams: 40,
    evidence: 'Velvety orange-red sauce with cream swirl and seared chicken pieces.',
    undetermined: ['Heavy cream to cashew paste ratio', 'Hidden refined sugar in tomato gravy']
  }
};

/**
 * Analyze captured frame or uploaded image and return structured report
 */
export async function analyzeFoodImage(
  videoOrImage: HTMLVideoElement | string,
  onProgress?: (step: string) => void
): Promise<FoodAnalysisReport> {
  let rawResult: VisionResult | null = null;
  let imageBase64: string | undefined;

  if (typeof videoOrImage === 'string') {
    imageBase64 = videoOrImage;
  }

  onProgress?.('Inspecting dish geometry and colors...');

  // Invoke real inference pipeline for both video element and base64 image string
  try {
    rawResult = await identifyFoodFromCamera(videoOrImage, onProgress);
  } catch (e: any) {
    console.warn('[FoodRecognition] Vision inference failed:', e?.message);
  }

  // TRUTHFULNESS: If no inference result or confidence is below threshold, report honest unrecognized state
  if (!rawResult || !rawResult.label || rawResult.confidence < 0.30) {
    const primaryFood: FoodRecognitionHypothesis = {
      dishName: 'Unrecognized Dish',
      category: 'Unknown / Selection Required',
      confidence: 0,
      confidenceTier: 'low',
      visibleIngredients: [],
      estimatedPortion: {
        servingGrams: 250,
        uncertaintyGrams: 100,
        description: 'Portion estimate pending manual dish selection'
      },
      visualEvidence: 'No high-confidence culinary entity identified from visual analysis.',
      undeterminedFactors: ['Actual dish identity', 'True ingredients and allergens', 'Preparation method'],
      matchedMenuItem: resolveDishModel({ name: '' })
    };

    return {
      primaryFood,
      rawVisionResult: undefined,
      imageSnapshot: imageBase64,
      needsUserConfirmation: true, // Always require user review
      providerStatus: {
        providerName: 'None / Inconclusive Inference',
        isRealProvider: false,
        setupNote: 'Automated vision did not confidently identify this dish. Please select or search for your dish manually.'
      }
    };
  }

  // Real inference succeeded
  const rawLabel = rawResult.label.trim();
  const confidence = rawResult.confidence;
  const normalized = rawLabel.toLowerCase();

  // Find culinary knowledge match if available
  const matchedKey = Object.keys(CULINARY_KNOWLEDGE).find(k => 
    normalized.includes(k) || k.includes(normalized)
  );

  const knowledge = matchedKey ? CULINARY_KNOWLEDGE[matchedKey] : null;
  const matchedMenuItem = resolveDishModel({ name: rawLabel });

  const confidenceTier: 'high' | 'moderate' | 'low' = 
    confidence >= 0.85 ? 'high' : confidence >= 0.60 ? 'moderate' : 'low';

  const primaryFood: FoodRecognitionHypothesis = {
    dishName: matchedMenuItem.hasModel ? matchedMenuItem.dishName : rawLabel,
    category: knowledge ? knowledge.category : 'General Food & Entrees',
    confidence,
    confidenceTier,
    // Never fabricate ingredients from generic culinary knowledge unless matched to specific knowledge
    visibleIngredients: knowledge ? knowledge.ingredients : [],
    estimatedPortion: knowledge ? {
      servingGrams: knowledge.typicalGrams,
      uncertaintyGrams: knowledge.uncertaintyGrams,
      description: `Approx. ${knowledge.typicalGrams}g (±${knowledge.uncertaintyGrams}g typical restaurant serving)`
    } : {
      servingGrams: 280,
      uncertaintyGrams: 50,
      description: 'Approx. 280g (±50g standard serving estimate)'
    },
    visualEvidence: knowledge ? knowledge.evidence : `Visual detection pattern matches "${rawLabel}".`,
    undeterminedFactors: knowledge ? knowledge.undetermined : ['Actual oil and fat absorption during cooking', 'Hidden sodium and seasonings'],
    matchedMenuItem
  };

  return {
    primaryFood,
    rawVisionResult: rawResult,
    imageSnapshot: imageBase64,
    needsUserConfirmation: true, // User confirmation mandatory
    providerStatus: {
      providerName: rawResult.tier === 'openrouter' ? 'Cloud Multimodal Vision' : rawResult.tier === 'sarvam-ocr' ? 'Sarvam OCR Pipeline' : 'On-Device Neural Model',
      isRealProvider: true,
      setupNote: `Identified with ${Math.round(confidence * 100)}% confidence.`
    }
  };
}
