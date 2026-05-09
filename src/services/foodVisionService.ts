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

import * as tf from '@tensorflow/tfjs';
import { createWorker } from 'tesseract.js';
import { foodScanApi } from './api';

// ─── Config ───────────────────────────────────────────────────────────────────
const SARVAM_API_KEY     = import.meta.env.VITE_SARVAM_API_KEY     || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Verified free vision models on OpenRouter (in preference order)
// meta-llama/llama-3.2-11b-vision-instruct:free supports image input
const OPENROUTER_VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen2.5-vl-7b-instruct:free',
];

const SARVAM_MODEL = 'sarvam-30b';

// ─── Constants & Cache ────────────────────────────────────────────────────────
let cachedModel: tf.LayersModel | null = null;
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
let foodModel: tf.LayersModel | null = null;
let foodLabels: string[] = [];
let mlLoading = false;

export async function loadLocalMLModel(): Promise<boolean> {
  if (foodModel || mlLoading) return !!foodModel;
  mlLoading = true;
  try {
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

    foodModel = cachedModel as unknown as tf.LayersModel;
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
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

function captureFrameAsDataURL(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 640;
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

// ─── TIER 1: OCR → Sarvam AI ──────────────────────────────────────────────────
/**
 * Step 1: Tesseract.js reads any text visible in the camera frame
 *         (e.g. menu card text, dish label, price tag)
 * Step 2: Sarvam AI's text model takes the raw OCR string and
 *         identifies/cleans the dish name (handles Indian scripts too)
 */
async function identifyViaOCRAndSarvam(
  video: HTMLVideoElement,
  onProgress?: (msg: string) => void
): Promise<VisionResult | null> {
  try {
    // ── Step 1: OCR ─────────────────────────────────────────────────────────
    onProgress?.('Scanning text from camera...');
    const dataURL = captureFrameAsDataURL(video);

    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress?.(`OCR: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    const { data: { text } } = await worker.recognize(dataURL);
    await worker.terminate();

    const cleanedOCR = text.trim().replace(/\s+/g, ' ').slice(0, 500);
    console.log('[Vision OCR] Raw text:', cleanedOCR);

    if (!cleanedOCR || cleanedOCR.length < 3) {
      console.log('[Vision OCR] No readable text found, skipping Sarvam');
      return null;
    }

    // ── Step 2: Sarvam AI text model ─────────────────────────────────────────
    if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
      return null;
    }

    onProgress?.('Sarvam AI identifying dish...');

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SARVAM_API_KEY}`,
        'api-subscription-key': SARVAM_API_KEY,
      },
      body: JSON.stringify({
        model: SARVAM_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a food expert specialising in Indian cuisine. Given raw OCR text scanned from a restaurant menu, identify and return ONLY the main dish name. Return just the dish name, nothing else.'
          },
          {
            role: 'user',
            content: `Scanned menu text: "${cleanedOCR}"\n\nWhat is the main dish name shown? Reply with only the dish name.`
          }
        ],
        max_tokens: 30,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('[Vision Sarvam] Error:', response.status, err.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const label = cleanAILabel(data?.choices?.[0]?.message?.content);

    if (!label || label.length < 2) return null;

    console.log('[Vision Sarvam] Identified dish:', label);
    return {
      label,
      confidence: 0.90,
      tier: 'sarvam-ocr',
      ocrText: cleanedOCR,
    };

  } catch (error: any) {
    console.warn('[Vision OCR+Sarvam] Failed:', error?.message);
    return null;
  }
}

// ─── TIER 2: OpenRouter Vision ────────────────────────────────────────────────
async function identifyViaOpenRouter(
  video: HTMLVideoElement,
  onProgress?: (msg: string) => void,
  overrideImage?: string
): Promise<VisionResult | null> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') return null;

  const imageBase64 = overrideImage ? (overrideImage.includes('base64') ? overrideImage.split(',')[1] : overrideImage) : captureFrameAsBase64(video);

  // Try each vision model in order until one succeeds
  for (const model of OPENROUTER_VISION_MODELS) {
    try {
      onProgress?.(`OpenRouter: ${model.split('/')[1]?.split(':')[0]}...`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'DineInGo AR Menu',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
                },
                {
                  type: 'text',
                  text: 'What food dish is shown in this image? Reply with ONLY the dish name. Example: "Margherita Pizza" or "Butter Chicken". If unsure, give the closest generic name.'
                }
              ]
            }
          ],
          max_tokens: 30,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        console.warn(`[Vision OpenRouter] ${model} → ${response.status}, trying next...`);
        continue;
      }

      const data = await response.json();
      const label = cleanAILabel(data?.choices?.[0]?.message?.content);
      
      if (!label || label.toLowerCase().includes('sorry') || label.toLowerCase().includes('cannot')) continue;

      console.log(`[Vision OpenRouter] ${model} identified:`, label);
      return { label, confidence: 0.92, tier: 'openrouter' };

    } catch (error: any) {
      console.warn(`[Vision OpenRouter] ${model} failed:`, error?.message);
    }
  }

  return null;
}

// ─── TIER 3: Local Food-101 ML ────────────────────────────────────────────────
async function identifyViaLocalML(
  video: HTMLVideoElement,
  onProgress?: (msg: string) => void,
  overrideImage?: string
): Promise<VisionResult | null> {
  if (!foodModel || !foodLabels.length) return null;
  
  try {
    onProgress?.('Local Neural Engine (Food-101)...');
    
    // 1. Prepare image tensor (Async loading must happen outside tf.tidy)
    let imgTensor: tf.Tensor3D;
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
      
      const prediction = foodModel!.predict(normalized) as tf.Tensor;
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
// ─── Master Identify Function (Failsafe Chain Strategy) ───────────────────────
export async function identifyFoodFromCamera(
  video: HTMLVideoElement,
  onTierChange?: (msg: string) => void,
  croppedImageBase64?: string // New: Optional pre-cropped image
): Promise<VisionResult | null> {
  
  let finalResult: VisionResult | null = null;
  let ocrResult: VisionResult | null = null;
  const targetSource = croppedImageBase64 || video;

  try {
    // 0. MEMORY TIER (Contextual Recall)
    const now = Date.now();
    if (!sessionHistoryMap || (now - lastHistoryFetch > HISTORY_CACHE_TTL)) {
      try {
        const history = await foodScanApi.getHistory();
        const newMap: Record<string, string> = {};
        history.forEach((h: any) => {
          // Key 1: Raw AI Label -> Correction
          if (h.foodName && h.correctedName && h.foodName !== h.correctedName) {
            newMap[h.foodName.toLowerCase()] = h.correctedName;
          }
          // Key 2: OCR Fingerprint -> Correction
          if (h.metadata?.ocrText && h.correctedName) {
            const ocrKey = h.metadata.ocrText.substring(0, 50).toLowerCase().trim();
            if (ocrKey) newMap[`ocr_${ocrKey}`] = h.correctedName;
          }
        });
        sessionHistoryMap = newMap;
        lastHistoryFetch = now;
      } catch (e) {
        console.warn('[Vision Memory] Failed to refresh history map');
      }
    }

    // Perform OCR early to use as a "Fingerprint" for memory recall
    ocrResult = await identifyViaOCRAndSarvam(video, onTierChange).catch(() => null);
    const currentOcrKey = ocrResult?.label?.substring(0, 50).toLowerCase().trim();

    if (currentOcrKey && sessionHistoryMap?.[`ocr_${currentOcrKey}`]) {
      const learnedLabel = sessionHistoryMap[`ocr_${currentOcrKey}`];
      console.log(`[Vision Memory] 🧠 OCR Recall: "${currentOcrKey}" -> "${learnedLabel}"`);
      onTierChange?.('Dino 🦖 remembers this menu item!');
      return {
        label: learnedLabel,
        confidence: 0.99,
        tier: 'sarvam-ocr',
        imageData: croppedImageBase64 || captureFrameAsBase64(video)
      };
    }

    // 1. QUICK START: Local ML (Instant)
    onTierChange?.('Neural Engine checking...');
    const mlRes = await identifyViaLocalML(video, onTierChange, croppedImageBase64);

    // If ML found something, check if we have a "Memory" of correcting it
    if (mlRes && sessionHistoryMap?.[mlRes.label.toLowerCase()]) {
      const learnedLabel = sessionHistoryMap[mlRes.label.toLowerCase()];
      console.log(`[Vision Memory] 🧠 ML Recall: "${mlRes.label}" -> "${learnedLabel}"`);
      onTierChange?.('Dino 🦖 remembers this!');
      return {
        label: learnedLabel,
        confidence: 0.98,
        tier: 'local-ml',
        imageData: croppedImageBase64 || captureFrameAsBase64(video)
      };
    }

    // 2. PRIMARY: Fusion (OpenRouter Vision)
    onTierChange?.('AI Fusion: Thinking...');
    const visionRes = await identifyViaOpenRouter(video, onTierChange, croppedImageBase64).catch(e => {
      console.warn('[Vision] OpenRouter failed:', e);
      return null;
    });

    if (visionRes) {
      console.log('[Vision] ✅ Tier 1 Success: OpenRouter');
      // Fusion: Boost confidence if ML agrees
      if (mlRes && mlRes.confidence > 0.4) {
        visionRes.confidence = Math.min(0.99, visionRes.confidence + 0.05);
      }
      finalResult = visionRes;
    } 
    else if (mlRes && mlRes.confidence > 0.15) {
      // 3. SMART FALLBACK: ML + Sarvam Polish
      onTierChange?.('Smart Fallback: Refining...');
      try {
        const polishedLabel = await polishMLResultWithSarvam(mlRes.label);
        if (polishedLabel) {
          console.log('[Vision] ✅ Tier 2 Success: ML + Sarvam');
          finalResult = {
            label: polishedLabel,
            confidence: Math.min(0.85, mlRes.confidence + 0.2),
            tier: 'local-ml'
          };
        }
      } catch (err) {
        console.warn('[Vision] Sarvam Polish failed:', err);
      }
      
      // If Sarvam failed but we have ML, keep ML as the result
      if (!finalResult) {
        console.log('[Vision] ✅ Tier 2b Success: Pure ML');
        finalResult = mlRes;
      }
    }

    // 4. LAST RESORT: OCR (If nothing else worked)
    if (!finalResult) {
      onTierChange?.('OCR Backup: Scanning...');
      const ocrRes = await identifyViaOCRAndSarvam(video, onTierChange).catch(() => null);
      if (ocrRes) {
        console.log('[Vision] ✅ Tier 3 Success: OCR');
        finalResult = ocrRes;
      }
    }

  } catch (globalError) {
    console.error('[Vision] Critical pipeline error:', globalError);
  }

  // Final log and return
  if (finalResult) {
    // Attach OCR metadata if we captured it during the memory tier
    if (ocrResult?.label) finalResult.ocrText = ocrResult.label;
    
    // Attach the image that led to this result
    finalResult.imageData = croppedImageBase64 || captureFrameAsBase64(video);
    return await logAndReturn(finalResult);
  }

  console.log('[Vision] ❌ All tiers failed');
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

// Sarvam logic to clean up ML labels
async function polishMLResultWithSarvam(mlLabel: string): Promise<string | null> {
  if (!SARVAM_API_KEY) return null;
  
  const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SARVAM_API_KEY}`,
      'api-subscription-key': SARVAM_API_KEY,
    },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a food name specialist. Given a messy or generic label from a vision model, return the most likely specific Indian dish name. Reply with ONLY the name.'
        },
        {
          role: 'user',
          content: `The vision model detected: "${mlLabel}". What is the likely formal name of this dish?`
        }
      ],
      max_tokens: 30,
      temperature: 0.1,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const label = cleanAILabel(data?.choices?.[0]?.message?.content);

  return label || null;
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
    const nameHits  = nameWords.filter((nw: string) => normLabel.includes(nw)).length;
    const overlap   = (labelHits + nameHits) / Math.max(labelWords.length + nameWords.length, 1);
    score = Math.max(score, overlap);

    // Food keyword bonus
    const keywords = [
      'pizza','burger','biryani','pasta','sushi','curry','tikka','masala',
      'noodle','salad','sandwich','soup','dosa','paneer','chicken','mutton',
      'fish','prawn','rice','bread','roll','wrap','cake','dessert','steak'
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
