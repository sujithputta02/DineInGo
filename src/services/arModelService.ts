/**
 * DineInGo AR Model Resolution & Capability Service
 *
 * Central, typed model-resolution service that implements:
 * 1. Explicit model URL on menu item (Priority 1)
 * 2. Verified specific dish model match (Priority 2)
 * 3. Verified generic food-category model as representative preview (Priority 3)
 * 4. High-resolution dish photo and menu info fallback when no 3D model exists (Priority 4)
 *
 * Also provides mobile AR capability detection (Scene Viewer on Android, Quick Look on iOS, WebXR).
 */

export type ModelSourceTier = 'explicit' | 'dish-match' | 'category-match' | 'none';

export interface ARModelAttribution {
  author: string;
  source: string;
  license: string;
  notes?: string;
}

export interface VerifiedModelEntry {
  id: string;
  name: string;
  modelUrl: string;
  format: 'glb' | 'gltf';
  scale?: string;
  cameraOrbit?: string;
  fieldOfView?: string;
  keywords: string[];
  categoryTags: string[];
  attribution: ARModelAttribution;
  description: string;
}

export interface ResolvedDishModel {
  hasModel: boolean;
  modelUrl: string | null;
  tier: ModelSourceTier;
  label: string;
  isRepresentativePreview: boolean;
  scale?: string;
  cameraOrbit?: string;
  fieldOfView?: string;
  attribution?: ARModelAttribution;
  dishName: string;
}

export interface ARSupportStatus {
  isARSupported: boolean;
  isMobile: boolean;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  recommendedMode: 'scene-viewer' | 'quick-look' | 'webxr' | 'none';
  reason: string;
  canUseArQuickLook: boolean;
  canUseSceneViewer: boolean;
}

// ============================================================================
// VERIFIED LOCAL 3D MODEL CATALOG
// All assets are hosted locally in /models/ar/ for high reliability & offline capability.
// ============================================================================
export const VERIFIED_MODELS: Record<string, VerifiedModelEntry> = {
  'french-onion-soup': {
    id: 'french-onion-soup',
    name: 'Artisanal French Onion Soup',
    modelUrl: '/models/ar/french-onion-soup.glb',
    format: 'glb',
    scale: '1 1 1',
    cameraOrbit: '45deg 60deg 1.8m',
    fieldOfView: '30deg',
    keywords: [
      'french onion soup',
      'onion soup',
      'soupe a l\'oignon',
      'soup',
      'soupe',
      'chowder',
      'bisque',
      'broth',
      'potage',
      'bouillon'
    ],
    categoryTags: ['soup', 'soups', 'starter', 'starters', 'appetizer', 'appetizers'],
    attribution: {
      author: 'Velskins (O\'Bistrot WebAR Project)',
      source: 'https://github.com/Velskins/O-Bistrot_Carte_WebAR',
      license: 'MIT',
      notes: 'Authentic soup crock with broiled cheese crown.'
    },
    description: 'Slow-caramelized onions in rich broth with baked gruyère crown.'
  },

  'salad-bowl': {
    id: 'salad-bowl',
    name: 'Fresh Garden Caesar Salad',
    modelUrl: '/models/ar/salad-bowl.glb',
    format: 'glb',
    scale: '1 1 1',
    cameraOrbit: '40deg 55deg 1.6m',
    fieldOfView: '30deg',
    keywords: [
      'caesar salad',
      'garden salad',
      'greek salad',
      'house salad',
      'salad',
      'salade',
      'greens',
      'bowl',
      'lettuce',
      'coleslaw'
    ],
    categoryTags: ['salad', 'salads', 'starter', 'starters', 'appetizer', 'healthy', 'vegetarian'],
    attribution: {
      author: 'Velskins (O\'Bistrot WebAR Project)',
      source: 'https://github.com/Velskins/O-Bistrot_Carte_WebAR',
      license: 'MIT',
      notes: 'Crisp salad bowl with shaved parmesan.'
    },
    description: 'Crisp greens, shaved parmesan flakes, and herb croutons.'
  },

  'braised-beef': {
    id: 'braised-beef',
    name: 'Slow-Braised Beef Bourguignon',
    modelUrl: '/models/ar/braised-beef.glb',
    format: 'glb',
    scale: '1 1 1',
    cameraOrbit: '45deg 60deg 2.0m',
    fieldOfView: '32deg',
    keywords: [
      'beef bourguignon',
      'braised beef',
      'boeuf',
      'steak medallion',
      'beef steak',
      'tenderloin',
      'ribeye',
      'sirloin',
      'filet mignon',
      'pot roast',
      'beef'
    ],
    categoryTags: ['main', 'mains', 'entree', 'entrees', 'meat', 'beef', 'steaks'],
    attribution: {
      author: 'Velskins (O\'Bistrot WebAR Project)',
      source: 'https://github.com/Velskins/O-Bistrot_Carte_WebAR',
      license: 'MIT',
      notes: 'Braised beef tenderloin plate with vegetables.'
    },
    description: 'Tender beef tenderloin medallion in Pinot Noir demi-glace with garden vegetables.'
  },

  'baked-pie': {
    id: 'baked-pie',
    name: 'Warm Apple Tarte Tatin',
    modelUrl: '/models/ar/baked-pie.glb',
    format: 'glb',
    scale: '1 1 1',
    cameraOrbit: '35deg 55deg 1.5m',
    fieldOfView: '30deg',
    keywords: [
      'apple pie',
      'tarte tatin',
      'apple tart',
      'pie',
      'tarte',
      'tart',
      'quiche',
      'pastry',
      'baked pie',
      'fruit pie'
    ],
    categoryTags: ['dessert', 'desserts', 'bakery', 'pastry', 'sweets'],
    attribution: {
      author: 'Velskins (O\'Bistrot WebAR Project)',
      source: 'https://github.com/Velskins/O-Bistrot_Carte_WebAR',
      license: 'MIT',
      notes: 'Artisanal baked fruit tart in flaky pastry.'
    },
    description: 'Caramelized apples in French puff pastry with Madagascar vanilla cream.'
  },

  'creme-brulee': {
    id: 'creme-brulee',
    name: 'Vanilla Bean Crème Brûlée',
    modelUrl: '/models/ar/creme-brulee.glb',
    format: 'glb',
    scale: '1 1 1',
    cameraOrbit: '40deg 55deg 1.5m',
    fieldOfView: '30deg',
    keywords: [
      'creme brulee',
      'crème brûlée',
      'custard',
      'panna cotta',
      'caramel custard',
      'flan',
      'pudding',
      'creme'
    ],
    categoryTags: ['dessert', 'desserts', 'sweet', 'sweets'],
    attribution: {
      author: 'Velskins (O\'Bistrot WebAR Project)',
      source: 'https://github.com/Velskins/O-Bistrot_Carte_WebAR',
      license: 'MIT',
      notes: 'Caramelized vanilla custard in porcelain ramekin.'
    },
    description: 'Velvety vanilla bean custard with torched brittle sugar crust.'
  }
};

// ============================================================================
// CENTRAL MODEL RESOLUTION PIPELINE
// Priority:
// 1. Explicit modelUrl on menu item
// 2. Verified specific dish name match
// 3. Verified generic food-category model as representative preview
// 4. Photo fallback (no model)
// ============================================================================

export interface ResolvableDish {
  id?: string;
  _id?: string;
  name?: string;
  modelUrl?: string;
  categoryName?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  image?: string;
  [key: string]: any;
}

/**
 * Normalizes text for clean keyword matching (lowercased, punctuation-stripped)
 */
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a candidate string matches any keyword cleanly
 */
function matchesKeyword(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;

  const words = norm.split(' ');

  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    // Exact match
    if (norm === normKw) return true;

    // Full multi-word keyword phrase included
    if (normKw.includes(' ') && norm.includes(normKw)) return true;

    // Single-word keyword matching a distinct token in the dish name
    if (!normKw.includes(' ') && words.includes(normKw)) return true;
  }
  return false;
}

/**
 * Resolves the appropriate 3D model configuration for any menu dish.
 */
export function resolveDishModel(dish: ResolvableDish | null | undefined): ResolvedDishModel {
  const dishName = dish?.name || 'Dish';

  if (!dish) {
    return {
      hasModel: false,
      modelUrl: null,
      tier: 'none',
      label: 'Photo Preview',
      isRepresentativePreview: false,
      dishName
    };
  }

  // --- Priority 1: Explicit Model URL linked to the item ---
  if (dish.modelUrl && typeof dish.modelUrl === 'string' && dish.modelUrl.trim().length > 0) {
    const cleanUrl = dish.modelUrl.trim();
    const isGlb = cleanUrl.endsWith('.glb') || cleanUrl.endsWith('.gltf') || cleanUrl.includes('.glb?') || cleanUrl.includes('.gltf?');

    // Only accept URLs that look like valid 3D models (and not fake placeholders)
    if (isGlb && !cleanUrl.includes('sketchfab.com/models/d1d1')) {
      return {
        hasModel: true,
        modelUrl: cleanUrl,
        tier: 'explicit',
        label: 'Dish 3D Model',
        isRepresentativePreview: false,
        scale: '1 1 1',
        cameraOrbit: '45deg 55deg 2m',
        attribution: {
          author: 'Restaurant Provided Model',
          source: cleanUrl,
          license: 'Direct Link'
        },
        dishName
      };
    }
  }

  // --- Priority 2: Verified Specific Dish Match ---
  for (const entry of Object.values(VERIFIED_MODELS)) {
    if (matchesKeyword(dishName, entry.keywords)) {
      return {
        hasModel: true,
        modelUrl: entry.modelUrl,
        tier: 'dish-match',
        label: 'Verified 3D Dish',
        isRepresentativePreview: false,
        scale: entry.scale,
        cameraOrbit: entry.cameraOrbit,
        fieldOfView: entry.fieldOfView,
        attribution: entry.attribution,
        dishName
      };
    }
  }

  // --- Priority 3: Verified Generic Food-Category Model Preview ---
  const categoryStr = `${dish.categoryName || ''} ${dish.category || ''}`;
  if (categoryStr.trim().length > 0) {
    for (const entry of Object.values(VERIFIED_MODELS)) {
      if (matchesKeyword(categoryStr, entry.categoryTags)) {
        return {
          hasModel: true,
          modelUrl: entry.modelUrl,
          tier: 'category-match',
          label: `Representative Preview (${entry.name})`,
          isRepresentativePreview: true,
          scale: entry.scale,
          cameraOrbit: entry.cameraOrbit,
          fieldOfView: entry.fieldOfView,
          attribution: entry.attribution,
          dishName
        };
      }
    }
  }

  // --- Priority 4: No Usable 3D Model -> Photo Fallback ---
  return {
    hasModel: false,
    modelUrl: null,
    tier: 'none',
    label: 'Photo Preview (3D Model Pending)',
    isRepresentativePreview: false,
    dishName
  };
}

// ============================================================================
// DEVICE & BROWSER AR CAPABILITY DETECTION
// Inspects browser and hardware environment for Scene Viewer, Quick Look, WebXR
// ============================================================================

export function detectDeviceARSupport(): ARSupportStatus {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isARSupported: false,
      isMobile: false,
      platform: 'unknown',
      recommendedMode: 'none',
      reason: 'Server-side rendering environment',
      canUseArQuickLook: false,
      canUseSceneViewer: false
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  // iOS Quick Look: iOS Safari or WebKit browser with anchor rel="ar" support
  const a = document.createElement('a');
  const canUseArQuickLook = isIOS && Boolean(a.relList && a.relList.supports && a.relList.supports('ar'));

  // Android Scene Viewer: Android with Chrome browser support
  const canUseSceneViewer = isAndroid;

  let platform: 'android' | 'ios' | 'desktop' | 'unknown' = 'unknown';
  if (isAndroid) platform = 'android';
  else if (isIOS) platform = 'ios';
  else platform = 'desktop';

  if (!isMobile) {
    return {
      isARSupported: false,
      isMobile: false,
      platform: 'desktop',
      recommendedMode: 'none',
      reason: 'Physical AR environment placement requires a mobile device with a camera and AR capabilities (Android ARCore or iOS Safari / Quick Look). Interactive 3D preview is active on desktop.',
      canUseArQuickLook: false,
      canUseSceneViewer: false
    };
  }

  if (isAndroid) {
    return {
      isARSupported: true,
      isMobile: true,
      platform: 'android',
      recommendedMode: 'scene-viewer',
      reason: 'Google Scene Viewer / WebXR supported on compatible Android devices.',
      canUseArQuickLook: false,
      canUseSceneViewer: true
    };
  }

  if (isIOS) {
    return {
      isARSupported: true,
      isMobile: true,
      platform: 'ios',
      recommendedMode: 'quick-look',
      reason: 'Apple AR Quick Look supported on iOS Safari.',
      canUseArQuickLook: true,
      canUseSceneViewer: false
    };
  }

  return {
    isARSupported: false,
    isMobile: true,
    platform: 'unknown',
    recommendedMode: 'none',
    reason: 'Mobile device does not expose a supported native AR runtime.',
    canUseArQuickLook: false,
    canUseSceneViewer: false
  };
}

// ============================================================================
// PUBLIC DEMO DATA (EXPERIENCE A)
// Isolated, self-contained restaurant showcase with 6 curated dishes.
// Explicitly labelled sample data to prevent confusion with real partner restaurants.
// ============================================================================

export interface DemoDish {
  _id: string;
  id: string;
  name: string;
  categoryName: string;
  price: number;
  description: string;
  image: string;
  modelUrl?: string;
  dietaryTags: string[];
  allergens: string[];
  preparationTime: number;
  calories: number;
  spiceLevel: number;
  isPopular: boolean;
  isDemoDish: boolean;
}

export const DEMO_RESTAURANT = {
  id: 'demo-showcase-bistro',
  name: 'The Bistro Lab (Interactive AR Demo)',
  cuisine: 'Modern French & Californian Fusion',
  tagline: 'Experience DineInGo augmented reality menu dishes in real-scale 3D',
  address: 'Sample Demo Suite • 100 Innovation Way',
  isDemo: true,
  disclaimer: 'SAMPLE SHOWCASE: This experience demonstrates DineInGo\'s WebAR capabilities with verified 3D assets. No account, payment, or reservation required.'
};

export const DEMO_MENU_ITEMS: DemoDish[] = [
  {
    _id: 'demo-dish-soup',
    id: 'demo-dish-soup',
    name: 'Artisanal French Onion Soup',
    categoryName: 'Starters & Soups',
    price: 12.50,
    description: 'Slow-caramelized sweet onions simmered in rich thyme beef consommé, crowned with a toasted baguette crouton and bubbling broiled Gruyère cheese.',
    image: '/images/ar-demo/french-onion-soup.jpg',
    modelUrl: '/models/ar/french-onion-soup.glb',
    dietaryTags: [],
    allergens: ['dairy', 'wheat'],
    preparationTime: 15,
    calories: 320,
    spiceLevel: 0,
    isPopular: true,
    isDemoDish: true
  },
  {
    _id: 'demo-dish-salad',
    id: 'demo-dish-salad',
    name: 'Fresh Garden Caesar Salad',
    categoryName: 'Starters & Salads',
    price: 14.00,
    description: 'Crisp organic romaine hearts tossed in homemade creamy garlic-parmesan dressing, shaved aged Parmigiano-Reggiano flakes, and herb croutons.',
    image: '/images/ar-demo/caesar-salad.jpg',
    modelUrl: '/models/ar/salad-bowl.glb',
    dietaryTags: ['vegetarian'],
    allergens: ['dairy', 'wheat', 'eggs'],
    preparationTime: 10,
    calories: 280,
    spiceLevel: 0,
    isPopular: false,
    isDemoDish: true
  },
  {
    _id: 'demo-dish-beef',
    id: 'demo-dish-beef',
    name: 'Slow-Braised Beef Bourguignon',
    categoryName: 'Signature Mains',
    price: 34.00,
    description: 'Prime tender beef medallions braised for 12 hours in Pinot Noir with pearl onions, cremini mushrooms, and glazed carrots over velvet potato purée.',
    image: '/images/ar-demo/beef-bourguignon.jpg',
    modelUrl: '/models/ar/braised-beef.glb',
    dietaryTags: [],
    allergens: ['dairy'],
    preparationTime: 25,
    calories: 640,
    spiceLevel: 1,
    isPopular: true,
    isDemoDish: true
  },
  {
    _id: 'demo-dish-pie',
    id: 'demo-dish-pie',
    name: 'Warm Apple Tarte Tatin',
    categoryName: 'Artisanal Desserts',
    price: 11.50,
    description: 'Traditional caramelized apple upside-down tart baked in golden flaky French puff pastry, served warm with Madagascar vanilla cream.',
    image: '/images/ar-demo/apple-tarte.jpg',
    modelUrl: '/models/ar/baked-pie.glb',
    dietaryTags: ['vegetarian'],
    allergens: ['dairy', 'wheat'],
    preparationTime: 12,
    calories: 420,
    spiceLevel: 0,
    isPopular: true,
    isDemoDish: true
  },
  {
    _id: 'demo-dish-creme',
    id: 'demo-dish-creme',
    name: 'Vanilla Bean Crème Brûlée',
    categoryName: 'Artisanal Desserts',
    price: 10.50,
    description: 'Velvety Tahitian vanilla custard in a porcelain ramekin with a brittle hand-torched caramelized turbinado sugar crust.',
    image: '/images/ar-demo/creme-brulee.jpg',
    modelUrl: '/models/ar/creme-brulee.glb',
    dietaryTags: ['vegetarian', 'gluten-free'],
    allergens: ['dairy', 'eggs'],
    preparationTime: 10,
    calories: 380,
    spiceLevel: 0,
    isPopular: false,
    isDemoDish: true
  },
  {
    // Deliberate test case: Dish WITHOUT a 3D model to demonstrate resilient fallback
    _id: 'demo-dish-pasta',
    id: 'demo-dish-pasta',
    name: 'Truffle Tagliatelle al Tartufo',
    categoryName: 'Chef Specials',
    price: 29.00,
    description: 'Handmade fresh egg tagliatelle ribbons tossed in velvety cultured butter sauce and finished with freshly shaved black winter truffles.',
    image: '/images/ar-demo/truffle-tagliatelle.jpg',
    // No modelUrl provided
    dietaryTags: ['vegetarian'],
    allergens: ['dairy', 'wheat', 'eggs'],
    preparationTime: 18,
    calories: 520,
    spiceLevel: 0,
    isPopular: true,
    isDemoDish: true
  }
];

// ============================================================================
// BACKWARDS-COMPATIBILITY EXPORTS FOR LEGACY SERVICES
// ============================================================================

export function get3DModelUrl(dishName: string): string | null {
  const resolution = resolveDishModel({ name: dishName });
  return resolution.hasModel ? resolution.modelUrl : null;
}

export function has3DModel(dishName: string): boolean {
  return resolveDishModel({ name: dishName }).hasModel;
}

export function getAvailable3DModels(): string[] {
  return Object.values(VERIFIED_MODELS).map(m => m.name);
}
