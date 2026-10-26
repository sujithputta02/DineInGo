/**
 * Free 3D Models Service
 * Delegated to central arModelService with verified, genuine local GLB models.
 * Fake Sketchfab placeholder download URLs have been completely removed.
 */

import {
  resolveDishModel,
  VERIFIED_MODELS,
  get3DModelUrl as resolveModelUrl,
  has3DModel as checkHasModel,
  getAvailable3DModels as listAvailableModels
} from './arModelService';

export const FREE_3D_MODELS: Record<string, string> = Object.fromEntries(
  Object.entries(VERIFIED_MODELS).map(([k, v]) => [k, v.modelUrl])
);

export function get3DModelUrl(dishName: string): string | null {
  return resolveModelUrl(dishName);
}

export function has3DModel(dishName: string): boolean {
  return checkHasModel(dishName);
}

export function getAvailable3DModels(): string[] {
  return listAvailableModels();
}

export interface Procedural3DConfig {
  dishType: 'curry' | 'biryani' | 'bread' | 'dessert' | 'drink' | 'salad' | 'meat';
  color: string;
  isVeg: boolean;
}

export function getProceduralConfig(dishName: string, isVeg: boolean): Procedural3DConfig {
  const name = dishName.toLowerCase();

  if (name.includes('salad') || name.includes('green')) {
    return { dishType: 'salad', color: '#10b981', isVeg: true };
  }
  if (name.includes('soup') || name.includes('broth')) {
    return { dishType: 'curry', color: '#f59e0b', isVeg };
  }
  if (name.includes('dessert') || name.includes('sweet') || name.includes('tarte') || name.includes('pie') || name.includes('brulee')) {
    return { dishType: 'dessert', color: '#ec4899', isVeg: true };
  }
  if (name.includes('beef') || name.includes('steak') || name.includes('meat')) {
    return { dishType: 'meat', color: '#ef4444', isVeg: false };
  }
  return { dishType: 'curry', color: isVeg ? '#10b981' : '#ef4444', isVeg };
}

export function get3DVisualization(dishName: string, isVeg: boolean): {
  type: 'realistic' | 'procedural';
  url?: string;
  config?: Procedural3DConfig;
} {
  const resolution = resolveDishModel({ name: dishName });

  if (resolution.hasModel && resolution.modelUrl) {
    return {
      type: 'realistic',
      url: resolution.modelUrl
    };
  }

  return {
    type: 'procedural',
    config: getProceduralConfig(dishName, isVeg)
  };
}
