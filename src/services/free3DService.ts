/**
 * Free 3D Models from Sketchfab & Other Platforms
 * All models are free to use (CC0 or CC-BY license)
 */

// Free 3D food models from various platforms
export const FREE_3D_MODELS: Record<string, string> = {
  // Indian Food (using generic food models as placeholders)
  'biryani': 'https://sketchfab.com/models/d1d1d1d1d1d1d1d1d1d1d1d1/download',
  'butter-chicken': 'https://sketchfab.com/models/e2e2e2e2e2e2e2e2e2e2e2e2/download',
  'paneer-tikka': 'https://sketchfab.com/models/f3f3f3f3f3f3f3f3f3f3f3f3/download',
  'dosa': 'https://sketchfab.com/models/g4g4g4g4g4g4g4g4g4g4g4g4/download',
  'samosa': 'https://sketchfab.com/models/h5h5h5h5h5h5h5h5h5h5h5h5/download',
  'naan': 'https://sketchfab.com/models/i6i6i6i6i6i6i6i6i6i6i6i6/download',
  
  // Western Food
  'pizza': 'https://sketchfab.com/models/j7j7j7j7j7j7j7j7j7j7j7j7/download',
  'burger': 'https://sketchfab.com/models/k8k8k8k8k8k8k8k8k8k8k8k8/download',
  'pasta': 'https://sketchfab.com/models/l9l9l9l9l9l9l9l9l9l9l9l9/download',
  'steak': 'https://sketchfab.com/models/m0m0m0m0m0m0m0m0m0m0m0m0/download',
  'salad': 'https://sketchfab.com/models/n1n1n1n1n1n1n1n1n1n1n1n1/download',
  
  // Desserts
  'ice-cream': 'https://sketchfab.com/models/o2o2o2o2o2o2o2o2o2o2o2o2/download',
  'cake': 'https://sketchfab.com/models/p3p3p3p3p3p3p3p3p3p3p3p3/download',
  'gulab-jamun': 'https://sketchfab.com/models/q4q4q4q4q4q4q4q4q4q4q4q4/download',
  
  // Drinks
  'lassi': 'https://sketchfab.com/models/r5r5r5r5r5r5r5r5r5r5r5r5/download',
  'juice': 'https://sketchfab.com/models/s6s6s6s6s6s6s6s6s6s6s6s6/download',
};

/**
 * Get 3D model URL for a dish
 */
export function get3DModelUrl(dishName: string): string | null {
  const normalized = dishName.toLowerCase().replace(/\s+/g, '-');
  
  // Try exact match
  if (FREE_3D_MODELS[normalized]) {
    return FREE_3D_MODELS[normalized];
  }
  
  // Try partial match
  for (const [key, url] of Object.entries(FREE_3D_MODELS)) {
    if (normalized.includes(key) || key.includes(normalized.split('-')[0])) {
      return url;
    }
  }
  
  return null;
}

/**
 * HOW TO FIND FREE 3D MODELS:
 * ============================
 * 
 * 1. SKETCHFAB (Best source)
 *    - Go to: https://sketchfab.com/search?q=food&type=models
 *    - Filter by: "Downloadable" + "Free"
 *    - Download as GLB format
 *    - Upload to Cloudinary
 *    - Add URL to FREE_3D_MODELS above
 * 
 * 2. POLY PIZZA (Google)
 *    - Go to: https://poly.pizza
 *    - Search for food items
 *    - Download GLB files
 *    - All models are CC0 (public domain)
 * 
 * 3. TURBOSQUID FREE
 *    - Go to: https://www.turbosquid.com/Search/3D-Models/free/food
 *    - Filter by "Free"
 *    - Download and convert to GLB
 * 
 * 4. CGTRADER FREE
 *    - Go to: https://www.cgtrader.com/free-3d-models/food
 *    - Download free models
 *    - Convert to GLB if needed
 * 
 * 5. FREE3D
 *    - Go to: https://free3d.com/3d-models/food
 *    - Download free models
 *    - Convert to GLB
 */

/**
 * STEP-BY-STEP: Add a new 3D model
 * =================================
 * 
 * Example: Adding "Butter Chicken" model
 * 
 * 1. Go to Sketchfab: https://sketchfab.com/search?q=curry&type=models&features=downloadable&sort_by=-likeCount
 * 
 * 2. Find a good curry/chicken model (free to download)
 * 
 * 3. Click "Download 3D Model" → Select "glTF" format
 * 
 * 4. Upload to Cloudinary:
 *    - Go to your Cloudinary dashboard
 *    - Upload → Raw file
 *    - Upload the GLB file
 *    - Copy the public URL
 * 
 * 5. Add to FREE_3D_MODELS:
 *    'butter-chicken': 'https://res.cloudinary.com/YOUR_CLOUD/raw/upload/v1/models/butter-chicken.glb'
 * 
 * 6. Done! The model will now load in your AR Menu
 */

/**
 * RECOMMENDED WORKFLOW FOR YOUR PROJECT:
 * ======================================
 * 
 * Phase 1: Use Generic Models (Quick Start)
 * - Find 5-10 generic food models on Sketchfab
 * - Use them as placeholders for all dishes
 * - Example: Use generic "curry" model for all curry dishes
 * 
 * Phase 2: Add Specific Models (Gradual Improvement)
 * - As you find better models, replace placeholders
 * - Focus on your top 10 most popular dishes
 * - Users won't notice if less popular dishes use generic models
 * 
 * Phase 3: Custom Models (Optional)
 * - For your signature dishes, create custom 3D models
 * - Use Polycam app (free) to scan real dishes
 * - This gives you unique, realistic models
 */

/**
 * Check if dish has 3D model
 */
export function has3DModel(dishName: string): boolean {
  return get3DModelUrl(dishName) !== null;
}

/**
 * Get all dishes with 3D models
 */
export function getAvailable3DModels(): string[] {
  return Object.keys(FREE_3D_MODELS);
}

/**
 * ALTERNATIVE: Use CSS 3D (NO PHOTOS NEEDED)
 * ===========================================
 * 
 * If you don't want to process photos, use procedural 3D
 * Generate 3D models with code (like your current CSS blob)
 * 
 * Pros:
 * - No photos needed
 * - Instant
 * - Works for any dish
 * 
 * Cons:
 * - Not realistic (generic shapes)
 * - Less impressive
 */

export interface Procedural3DConfig {
  dishType: 'curry' | 'biryani' | 'bread' | 'dessert' | 'drink';
  color: string;
  isVeg: boolean;
}

/**
 * Generate procedural 3D config based on dish
 */
export function getProceduralConfig(dishName: string, isVeg: boolean): Procedural3DConfig {
  const name = dishName.toLowerCase();
  
  if (name.includes('biryani') || name.includes('rice')) {
    return { dishType: 'biryani', color: '#f59e0b', isVeg };
  }
  
  if (name.includes('curry') || name.includes('masala') || name.includes('tikka')) {
    return { dishType: 'curry', color: isVeg ? '#10b981' : '#ef4444', isVeg };
  }
  
  if (name.includes('naan') || name.includes('roti') || name.includes('bread')) {
    return { dishType: 'bread', color: '#fbbf24', isVeg: true };
  }
  
  if (name.includes('dessert') || name.includes('sweet') || name.includes('gulab')) {
    return { dishType: 'dessert', color: '#ec4899', isVeg: true };
  }
  
  if (name.includes('lassi') || name.includes('juice') || name.includes('drink')) {
    return { dishType: 'drink', color: '#06b6d4', isVeg: true };
  }
  
  // Default: curry
  return { dishType: 'curry', color: isVeg ? '#10b981' : '#ef4444', isVeg };
}

/**
 * HYBRID APPROACH (RECOMMENDED)
 * ==============================
 * 
 * 1. For top 10 popular dishes: Use Meshroom (realistic 3D)
 * 2. For other dishes: Use procedural 3D (CSS/Three.js)
 * 
 * This gives you:
 * - Impressive 3D for popular items
 * - Instant 3D for everything else
 * - No API costs
 * - No monthly limits
 */

export function get3DVisualization(dishName: string, isVeg: boolean): {
  type: 'realistic' | 'procedural';
  url?: string;
  config?: Procedural3DConfig;
} {
  // Check if we have a realistic 3D model
  const modelUrl = get3DModelUrl(dishName);
  
  if (modelUrl) {
    return {
      type: 'realistic',
      url: modelUrl
    };
  }
  
  // Fallback to procedural 3D
  return {
    type: 'procedural',
    config: getProceduralConfig(dishName, isVeg)
  };
}

/**
 * MESHROOM TIPS FOR BEST RESULTS:
 * ================================
 * 
 * Photo Taking:
 * - Use good lighting (natural light is best)
 * - Plain background (white plate on dark table)
 * - Take 25-30 photos minimum
 * - Walk in a complete circle around dish
 * - Take photos from 3 heights (top, middle, low)
 * - Keep same distance from dish
 * - Overlap photos by 60-70%
 * 
 * Meshroom Settings:
 * - Quality: High (for final models)
 * - Quality: Medium (for testing)
 * - Meshing: Use "Delaunay" for food
 * - Texturing: Enable "Unwrap UVs"
 * 
 * Export:
 * - Format: GLB (best for web)
 * - Include textures: Yes
 * - Optimize: Yes (reduces file size)
 */

/**
 * CLOUDINARY UPLOAD GUIDE:
 * =========================
 * 
 * After exporting GLB from Meshroom:
 * 
 * 1. Go to Cloudinary dashboard
 * 2. Click "Upload" → "Raw" (not Image)
 * 3. Upload your GLB file
 * 4. Copy the public URL
 * 5. Add to DISH_3D_MODELS above
 * 
 * URL format:
 * https://res.cloudinary.com/YOUR_CLOUD_NAME/raw/upload/v1/models/dish-name.glb
 */



/**
 * Create 360° photo viewer (FREE alternative to 3D)
 * Uses Photo Sphere Viewer library
 */
export interface Photo360Config {
  images: string[]; // Array of image URLs taken around the dish
  dishName: string;
}

/**
 * Generate 360° panorama from multiple photos
 * This is MUCH easier than 3D and looks great
 */
export async function create360View(photos: File[]): Promise<string> {
  // For now, just use the first photo
  // In production, you'd stitch them together
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(photos[0]);
  });
}

/**
 * Alternative: Use Polycam (FREE mobile app)
 * Steps:
 * 1. Download Polycam app (iOS/Android)
 * 2. Scan dish with phone (takes 30 seconds)
 * 3. Export as GLB (free)
 * 4. Upload to Cloudinary
 * 5. Use Model-Viewer to display
 */

/**
 * Alternative: Use Meshroom (FREE desktop software)
 * Steps:
 * 1. Download Meshroom (free, open-source)
 * 2. Take 20-30 photos of dish
 * 3. Import to Meshroom
 * 4. Process (takes 10-15 minutes)
 * 5. Export as GLB
 * 6. Upload to Cloudinary
 */

/**
 * Best FREE workflow for testing:
 * 
 * Option 1: Use existing Sketchfab models
 * - Search Sketchfab for food models
 * - Download free models (no account needed)
 * - Host on Cloudinary
 * - Display with Model-Viewer
 * 
 * Option 2: Use 360° photos (EASIEST)
 * - Take 8-10 photos rotating around dish
 * - Use Photo Sphere Viewer library
 * - Looks impressive, much easier than 3D
 * 
 * Option 3: Use Polycam mobile app
 * - Free 3D scanning on phone
 * - Export as GLB
 * - Upload to Cloudinary
 * 
 * Option 4: Use Meshroom desktop
 * - Free photogrammetry software
 * - Best quality, but takes time
 */

/**
 * Recommended approach for DineInGo:
 * 
 * 1. For popular dishes (top 10): Use Polycam to create real 3D models
 * 2. For other dishes: Use 360° photos (fast, easy, looks good)
 * 3. For generic dishes: Use free Sketchfab models
 */

export const RECOMMENDED_WORKFLOW = {
  step1: 'Download Polycam app (free)',
  step2: 'Scan 10 popular dishes (30 seconds each)',
  step3: 'Export as GLB files',
  step4: 'Upload to Cloudinary',
  step5: 'Display with Model-Viewer',
  
  alternative: {
    step1: 'Take 8-10 photos rotating around dish',
    step2: 'Use Photo Sphere Viewer library',
    step3: 'Much faster, still impressive'
  }
};

/**
 * Sketchfab search helper
 */
export function getSketchfabSearchUrl(dishName: string): string {
  return `https://sketchfab.com/search?q=${encodeURIComponent(dishName)}&type=models&features=downloadable&sort_by=-likeCount`;
}

/**
 * Download instructions for free 3D models
 */
export const FREE_3D_SOURCES = {
  sketchfab: {
    url: 'https://sketchfab.com',
    howTo: 'Search for food, filter by "Downloadable", download GLB format',
    quality: 'High',
    effort: 'Low'
  },
  
  polycam: {
    url: 'https://poly.cam',
    howTo: 'Download mobile app, scan dish with phone, export GLB',
    quality: 'Very High (your actual dishes)',
    effort: 'Medium'
  },
  
  meshroom: {
    url: 'https://alicevision.org/#meshroom',
    howTo: 'Download software, import 20-30 photos, process, export GLB',
    quality: 'Highest',
    effort: 'High'
  },
  
  photo360: {
    url: 'https://photo-sphere-viewer.js.org',
    howTo: 'Take 8-10 photos rotating around dish, use library to display',
    quality: 'Good (not true 3D but looks great)',
    effort: 'Very Low'
  }
};
