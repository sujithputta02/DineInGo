/**
 * DineInGo Food Vision Service
 * ──────────────────────────────
 * 3-Tier cascade for food dish identification:
 *
 *  Tier 1 → OCR (Tesseract.js) + Sarvam AI
 *            Camera captures text from physical menu/label,
 *            Tesseract extracts the raw text, Sarvam AI cleans &
 *            identifies the dish name (great for Indian food names)
 *
 *  Tier 2 → OpenRouter Vision (Gemma 3 27B)
 *            Sends the raw camera frame as an image for direct
 *            visual identification when no readable text is found
 *
 *  Tier 3 → Local MobileNet (TensorFlow.js)
 *            Offline fallback — works without internet
 */

import type { LayersModel, Tensor3D, Tensor } from '@tensorflow/tfjs';
import { foodScanApi } from './api';
import { auth } from '../firebase';


// ─── Constants & Cache ────────────────────────────────────────────────────────
let cachedModel: LayersModel | null = null;
let cachedLabels: string[] | null = null;

const MODEL_PATH = '/models/food_recognition/model.json';
const LABELS_PATH = '/models/food_recognition/labels.json';

// Memory Cache for "Instant Recall"
let sessionHistoryMap: Record<string, string> | null = null;
let lastHistoryFetch = 0;
const HISTORY_CACHE_TTL = 30000; // 30 seconds

export function clearVisionCache() {
  sessionHistoryMap = null;
  lastHistoryFetch = 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type VisionTier = 'sarvam-ocr' | 'openrouter' | 'local-ml' | 'unavailable';

export interface VisionResult {
  label: string;
  confidence: number;
  tier: VisionTier;
  ocrText?: string;    // raw OCR output for debugging/memory
  scanId?: string;     // database ID of the logged scan
  imageData?: string;  // captured frame for self-learning
}

// ─── Local ML State ───────────────────────────────────────────────────────────
let foodModel: LayersModel | null = null;
let foodLabels: string[] = [];
let mlLoading = false;

export async function loadLocalMLModel(): Promise<boolean> {
  if (foodModel || mlLoading) return !!foodModel;
  mlLoading = true;
  try {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();

    // 1. Load model and labels (with caching)
    if (!cachedModel) {
      // Use loadLayersModel for Keras-converted models
      cachedModel = await tf.loadLayersModel(MODEL_PATH) as any;
    }

    if (!cachedLabels) {
      const labelRes = await fetch(LABELS_PATH);
      if (!labelRes.ok) {
        throw new Error(`Knowledge base not found (404) at ${LABELS_PATH}`);
      }
      cachedLabels = await labelRes.json();
    }

    if (!cachedModel || !cachedLabels) throw new Error('ML Engine failed to start');

    foodModel = cachedModel as unknown as LayersModel;
    foodLabels = cachedLabels;

    console.log(`[Vision] ✅ Food-101 engine ready. Loaded ${foodLabels.length} classes.`);
    return true;
  } catch (e) {
    console.error('[Vision] ❌ Specialized ML failed to load:', e);
    return false;
  } finally {
    mlLoading = false;
  }
}

export function isLocalMLReady(): boolean {
  return foodModel !== null;
}

// ─── Frame Capture ────────────────────────────────────────────────────────────
function captureFrameAsBase64(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

function captureFrameAsDataURL(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─── Cleaning Utility ────────────────────────────────────────────────────────
function cleanAILabel(label: string | null | undefined): string {
  if (!label) return '';

  // 1. Strip <think> tags and everything inside them (even if unclosed)
  let cleaned = label.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');

  // 2. Remove common AI "chatter" prefixes
  cleaned = cleaned.replace(/^(here is the|the dish is|this is a|i identified this as|the main dish is|the name of the dish is|based on the image, this is)\s+/i, '');

  // 3. Remove trailing/leading quotes and punctuation
  cleaned = cleaned.trim().replace(/^["']|["']$/g, '').replace(/[.!?]$/, '');

  // 4. Handle cases where the AI is still too chatty (e.g. "The dish is Butter Chicken, a popular...")
  // If it's a long sentence, just take the first part before any comma or "which is"
  if (cleaned.length > 50) {
    cleaned = cleaned.split(/,|\bis\b|\bwhich\b/)[0].trim();
  }

  return cleaned;
}

// ─── TIER 1 & 2: Secure Backend AI Vision (OpenRouter & Sarvam) ───────────────
async function identifyViaBackendVision(
  imageBase64: string,
  ocrText?: string,
  onProgress?: (msg: string) => void
): Promise<VisionResult | null> {
  try {
    onProgress?.('AI Vision: Secure cloud inference...');
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/v1/vision/identify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: imageBase64,
        ocrText
      })
    });

    if (!res.ok) {
      console.warn('[Vision] Backend vision endpoint returned HTTP', res.status);
      return null;
    }

    const data = await res.json();
    if (data.success && data.label) {
      return {
        label: data.label,
        confidence: data.confidence || 0.90,
        tier: data.tier === 'sarvam-ocr' ? 'sarvam-ocr' : 'openrouter',
        ocrText
      };
    }
    return null;
  } catch (err: any) {
    console.warn('[Vision] Backend inference error:', err.message);
    return null;
  }
}

// ─── TIER 3: Local Food-101 ML ────────────────────────────────────────────────
async function identifyViaLocalML(
  video: HTMLVideoElement,
  onProgress?: (msg: string) => void,
  overrideImage?: string
): Promise<VisionResult | null> {
  if (!foodModel || !foodLabels.length) return null;

  try {
    const tf = await import('@tensorflow/tfjs');
    onProgress?.('Local Neural Engine (Food-101)...');

    // 1. Prepare image tensor (Async loading must happen outside tf.tidy)
    let imgTensor: Tensor3D;
    if (overrideImage) {
      const imgEl = new Image();
      imgEl.src = `data:image/jpeg;base64,${overrideImage.includes('base64') ? overrideImage.split(',')[1] : overrideImage}`;
      await new Promise(r => imgEl.onload = r);
      imgTensor = tf.browser.fromPixels(imgEl);
    } else {
      imgTensor = tf.browser.fromPixels(video);
    }

    // 2. Tensors processing (Synchronous inside tf.tidy)
    const probabilities = tf.tidy(() => {
      const resized = tf.image.resizeBilinear(imgTensor, [224, 224]);
      const offset = tf.scalar(127.5);
      const normalized = resized.sub(offset).div(offset).expandDims(0);

      const prediction = foodModel!.predict(normalized) as Tensor;
      return prediction.dataSync();
    }) as Float32Array;

    imgTensor.dispose(); // Manual cleanup for the input tensor

    // 3. Process results outside tf.tidy
    const topIndices = Array.from(probabilities)
      .map((prob, i) => ({ prob, i }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);

    console.log('[Vision LocalML] Top Predict:', topIndices[0].prob, foodLabels[topIndices[0].i]);

    if (topIndices[0].prob < 0.10) {
      console.log('[Vision LocalML] ❌ Confidence too low:', topIndices[0].prob);
      return null;
    }

    const label = foodLabels[topIndices[0].i].replace(/_/g, ' ');
    console.log('[Vision LocalML] ✅ Identified:', label);

    return {
      label,
      confidence: topIndices[0].prob,
      tier: 'local-ml'
    };
  } catch (error: any) {
    console.warn('[Vision LocalML] Prediction failed:', error?.message);
    return null;
  }
}

// ─── Master Identify Function (Visual RAG / Fusion Strategy) ──────────────────
// ─── Master Identify Function (Backend Vision + Local ML Fallback) ────────────
export async function identifyFoodFromCamera(
  videoOrImage: HTMLVideoElement | string,
  onTierChange?: (msg: string) => void,
  croppedImageBase64?: string
): Promise<VisionResult | null> {
  let finalResult: VisionResult | null = null;
  let imageBase64: string;

  if (typeof videoOrImage === 'string') {
    imageBase64 = videoOrImage.includes('base64,') ? videoOrImage.split('base64,')[1] : videoOrImage;
  } else if (croppedImageBase64) {
    imageBase64 = croppedImageBase64.includes('base64,') ? croppedImageBase64.split('base64,')[1] : croppedImageBase64;
  } else if (videoOrImage) {
    imageBase64 = captureFrameAsBase64(videoOrImage);
  } else {
    return null;
  }

  try {
    // 1. PRIMARY TIER: Secure Backend Vision (OpenRouter / Sarvam)
    onTierChange?.('AI Vision: Analyzing dish...');
    finalResult = await identifyViaBackendVision(imageBase64, undefined, onTierChange);

    // 2. FALLBACK TIER: Local MobileNet Edge ML
    if (!finalResult) {
      onTierChange?.('Offline Neural Engine checking...');
      const videoElement = typeof videoOrImage !== 'string' ? videoOrImage : (null as any);
      const mlRes = await identifyViaLocalML(videoElement, onTierChange, imageBase64);
      if (mlRes && mlRes.confidence >= 0.40) {
        finalResult = mlRes;
      }
    }
  } catch (globalError) {
    console.error('[Vision] Pipeline error:', globalError);
  }

  if (finalResult && finalResult.confidence >= 0.40) {
    finalResult.imageData = imageBase64;
    return await logAndReturn(finalResult);
  }

  console.log('[Vision] Recognition inconclusive or low confidence.');
  return null;
}

// Helper to log and return
async function logAndReturn(result: VisionResult): Promise<VisionResult> {
  const sourceMap: Record<string, 'sarvam' | 'openrouter' | 'ml' | 'ocr'> = {
    'sarvam-ocr': 'sarvam',
    'openrouter': 'openrouter',
    'local-ml': 'ml'
  };

  try {
    const scanResponse = await foodScanApi.log({
      foodName: result.label,
      confidence: result.confidence,
      source: sourceMap[result.tier] || 'ml',
      imageData: result.imageData,
      metadata: { ocrText: result.ocrText }
    });
    if (scanResponse && scanResponse._id) {
      result.scanId = scanResponse._id;
    }
  } catch (err) {
    console.warn('[Vision] Failed to log scan:', err);
  }
  return result;
}


// ─── Menu Matching ────────────────────────────────────────────────────────────
export function matchLabelToMenu(
  label: string,
  menuItems: any[],
  minScore = 0.15
): { item: any; score: number } | null {
  if (!label || menuItems.length === 0) return null;

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const normLabel = normalize(label);
  const labelWords = normLabel.split(' ').filter(w => w.length > 2);

  let best: { item: any; score: number } | null = null;

  for (const item of menuItems) {
    const normName = normalize(item.name || '');
    const normDesc = normalize(item.description || '');
    const nameWords = normName.split(' ').filter((w: string) => w.length > 2);
    let score = 0;

    // Exact substring
    if (normName.includes(normLabel) || normLabel.includes(normName)) {
      score = Math.max(score, 0.95);
    }

    // Word overlap
    const labelHits = labelWords.filter(lw => normName.includes(lw) || normDesc.includes(lw)).length;
    const nameHits = nameWords.filter((nw: string) => normLabel.includes(nw)).length;
    const overlap = (labelHits + nameHits) / Math.max(labelWords.length + nameWords.length, 1);
    score = Math.max(score, overlap);

    // Food keyword bonus
    const keywords = [
      'pizza', 'burger', 'biryani', 'pasta', 'sushi', 'curry', 'tikka', 'masala',
      'noodle', 'salad', 'sandwich', 'soup', 'dosa', 'paneer', 'chicken', 'mutton',
      'fish', 'prawn', 'rice', 'bread', 'roll', 'wrap', 'cake', 'dessert', 'steak'
    ];
    for (const kw of keywords) {
      if (normLabel.includes(kw) && normName.includes(kw)) {
        score = Math.max(score, 0.75);
        break;
      }
    }

    if (score > (best?.score ?? 0) && score >= minScore) {
      best = { item, score };
    }
  }

  return best;
}
