import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import mongoose from 'mongoose';
import { ReconstructionJob, IReconstructionJob, ReconstructionStatus, ReconstructionAssetQuality } from '../models/ReconstructionJob';
import { Restaurant } from '../models/Restaurant';
import { Business } from '../models/Business';
import { MenuItem } from '../models/MenuItem';
import { RECONSTRUCTION_STORAGE_DIR, ensureReconstructionStorageDir } from '../config/storageConfig';
import { getReconstructionStorageAdapter, StorageSaveResult } from './reconstructionStorageAdapter';
import { safeFetchImage, parseAndValidateDataUrl, verifyImageMagicBytes } from '../utils/safeImageFetcher';
import { extractGlbDimensions } from '../utils/glbDimensionExtractor';
import { isValidAssetFilename } from '../utils/assetSecurity';

export class PublicationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'PublicationError';
    this.statusCode = statusCode;
  }
}

export interface RequesterAuthContext {
  uid: string;
  role?: string;
  isAdmin?: boolean;
}

export type RestaurantOwnershipResolver = (
  restaurantId: string | undefined | null,
  menuItemId: string | undefined | null,
  requester: RequesterAuthContext
) => Promise<{
  authorized: boolean;
  statusCode?: number;
  reason?: string;
  verifiedRestaurantId?: string;
  verifiedMenuItemId?: string;
}>;

let customOwnershipResolver: RestaurantOwnershipResolver | null = null;

export function setRestaurantOwnershipResolver(resolver: RestaurantOwnershipResolver | null) {
  customOwnershipResolver = resolver;
}

/**
 * Verifies server-side using persisted records that the requester owns or is authorized
 * to manage the specified restaurant or menu item, and validates relationship integrity.
 */
export async function verifyRestaurantAuthorization(
  restaurantId: string | undefined | null,
  menuItemId: string | undefined | null,
  requester: RequesterAuthContext
): Promise<{
  authorized: boolean;
  statusCode?: number;
  reason?: string;
  verifiedRestaurantId?: string;
  verifiedMenuItemId?: string;
}> {
  if (customOwnershipResolver) {
    return customOwnershipResolver(restaurantId, menuItemId, requester);
  }

  if (!restaurantId && !menuItemId) {
    return {
      authorized: false,
      statusCode: 403,
      reason: 'Reconstruction model is not linked to an authorized restaurant or menu item. Asset remains private.'
    };
  }

  if (mongoose.connection?.readyState !== 1) {
    return {
      authorized: false,
      statusCode: 503,
      reason: 'Database connection unavailable to verify restaurant ownership'
    };
  }

  const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin' || requester.role === 'super_admin');

  // 1. If menuItemId is provided, resolve and verify canonical parent restaurant/business
  if (menuItemId) {
    let resolvedRestaurantId: string | null = null;
    let resolvedOwnerId: string | null = null;
    let foundMenuItem = false;

    // 1a. Check standalone MenuItem model
    try {
      const isItemObjectId = mongoose.Types.ObjectId.isValid(menuItemId);
      const standaloneItem = isItemObjectId
        ? await MenuItem.findById(menuItemId)
        : await MenuItem.findOne({ _id: menuItemId });

      if (standaloneItem) {
        foundMenuItem = true;
        resolvedRestaurantId = standaloneItem.businessId;

        if (resolvedRestaurantId) {
          const isParentObjId = mongoose.Types.ObjectId.isValid(resolvedRestaurantId);
          if (isParentObjId) {
            const bus = await Business.findById(resolvedRestaurantId);
            if (bus) resolvedOwnerId = bus.ownerId;
          }
          if (!resolvedOwnerId) {
            const rest = await Restaurant.findOne({
              $or: [
                { restaurantId: resolvedRestaurantId },
                ...(isParentObjId ? [{ _id: resolvedRestaurantId }] : [])
              ]
            });
            if (rest) resolvedOwnerId = rest.ownerId;
          }
        }
      }
    } catch (err) {
      console.warn('[ReconstructionService] Error querying standalone MenuItem:', err);
    }

    // 1b. Check embedded Restaurant.menu entries
    if (!foundMenuItem) {
      try {
        const restWithEmbedded = await Restaurant.findOne({ 'menu.id': menuItemId });
        if (restWithEmbedded) {
          foundMenuItem = true;
          resolvedRestaurantId = restWithEmbedded.restaurantId || String(restWithEmbedded._id);
          resolvedOwnerId = restWithEmbedded.ownerId;
        }
      } catch (err) {
        console.warn('[ReconstructionService] Error querying Restaurant embedded menu:', err);
      }
    }

    // 1c. Check embedded Business.menu entries
    if (!foundMenuItem) {
      try {
        const busWithEmbedded = await Business.findOne({ 'menu.id': menuItemId });
        if (busWithEmbedded) {
          foundMenuItem = true;
          resolvedRestaurantId = String(busWithEmbedded._id);
          resolvedOwnerId = busWithEmbedded.ownerId;
        }
      } catch (err) {
        console.warn('[ReconstructionService] Error querying Business embedded menu:', err);
      }
    }

    if (!foundMenuItem || !resolvedRestaurantId) {
      return {
        authorized: false,
        statusCode: 404,
        reason: `Menu item "${menuItemId}" was not found in persisted records.`
      };
    }

    // If restaurantId is also specified, prove that the menu item actually belongs to that exact restaurant
    if (restaurantId) {
      const isRestObjId = mongoose.Types.ObjectId.isValid(restaurantId);
      const isResolvedObjId = mongoose.Types.ObjectId.isValid(resolvedRestaurantId);

      let matches = restaurantId === resolvedRestaurantId;
      if (!matches) {
        try {
          const restA = await Restaurant.findOne({
            $or: [{ restaurantId }, ...(isRestObjId ? [{ _id: restaurantId }] : [])]
          });
          const restB = await Restaurant.findOne({
            $or: [{ restaurantId: resolvedRestaurantId }, ...(isResolvedObjId ? [{ _id: resolvedRestaurantId }] : [])]
          });
          if (restA && restB && String(restA._id) === String(restB._id)) {
            matches = true;
          }
        } catch {}
      }

      if (!matches) {
        return {
          authorized: false,
          statusCode: 403,
          reason: `Menu item "${menuItemId}" belongs to restaurant "${resolvedRestaurantId}", not "${restaurantId}".`
        };
      }
    }

    // Verify ownership authorization
    if (!isAdmin && resolvedOwnerId !== requester.uid) {
      return {
        authorized: false,
        statusCode: 403,
        reason: 'Requester does not own the restaurant associated with this menu item'
      };
    }

    return {
      authorized: true,
      verifiedRestaurantId: resolvedRestaurantId,
      verifiedMenuItemId: menuItemId
    };
  }

  // 2. Only restaurantId is provided (no menuItemId)
  const isObjectId = mongoose.Types.ObjectId.isValid(restaurantId!);
  try {
    const restaurant = await Restaurant.findOne({
      $or: [
        { restaurantId: restaurantId! },
        ...(isObjectId ? [{ _id: restaurantId! }] : [])
      ]
    });

    if (restaurant) {
      if (isAdmin || restaurant.ownerId === requester.uid) {
        return {
          authorized: true,
          verifiedRestaurantId: restaurant.restaurantId || String(restaurant._id)
        };
      } else {
        return {
          authorized: false,
          statusCode: 403,
          reason: 'Requester does not own the specified restaurant'
        };
      }
    }
  } catch (dbErr) {
    console.warn('[ReconstructionService] Error querying Restaurant model:', dbErr);
  }

  if (isObjectId) {
    try {
      const business = await Business.findById(restaurantId!);
      if (business) {
        if (isAdmin || business.ownerId === requester.uid) {
          return {
            authorized: true,
            verifiedRestaurantId: String(business._id)
          };
        } else {
          return {
            authorized: false,
            statusCode: 403,
            reason: 'Requester does not own the specified business'
          };
        }
      }
    } catch (dbErr) {
      console.warn('[ReconstructionService] Error querying Business model:', dbErr);
    }
  }

  return {
    authorized: false,
    statusCode: 404,
    reason: `Restaurant "${restaurantId}" was not found in persisted records.`
  };
}

export interface ReconstructionInput {
  userId: string;
  dishName: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  referencePlateDiameterMeters?: number;
  restaurantId?: string;
  menuItemId?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCapability {
  id: string;
  name: string;
  configured: boolean;
  requiresKey: string;
  description: string;
  latencySecondsEstimate: number;
  commercialUsePermitted: boolean;
  mobileARCompliant: boolean;
}

export interface Food3DReconstructionProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  getCapability(): ProviderCapability;
  createJob(input: ReconstructionInput): Promise<{ jobId: string; providerJobId?: string }>;
  checkJobStatus(providerJobId: string): Promise<{
    status: ReconstructionStatus;
    progress: number;
    modelUrl?: string;
    error?: string;
    assetQuality: ReconstructionAssetQuality;
  }>;
}

// Initialize storage directory deterministically
ensureReconstructionStorageDir();

function sanitizeSecrets(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/hf_[a-zA-Z0-9]{20,}/g, '[REDACTED_HF_TOKEN]')
             .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_KEY]');
}

/**
 * Hugging Face ZeroGPU TripoSR Provider Implementation
 * Runs open-weight TripoSR (MIT License) remotely on private Hugging Face ZeroGPU
 */
export class HuggingFaceTripoSRProvider implements Food3DReconstructionProvider {
  id = 'hf-triposr';
  name = 'DineInGo ZeroGPU TripoSR (Hugging Face)';

  isAvailable(): boolean {
    const token = process.env.HF_TOKEN;
    const spaceId = process.env.HF_SPACE_ID;
    const enabled = process.env.HF_RECONSTRUCTION_ENABLED;
    if (enabled === 'false') return false;
    return Boolean(token && token.trim().length > 0 && spaceId && spaceId.trim().length > 0);
  }

  getCapability(): ProviderCapability {
    return {
      id: this.id,
      name: this.name,
      configured: this.isAvailable(),
      requiresKey: 'HF_TOKEN & HF_SPACE_ID',
      description: 'Feed-forward open-weight TripoSR (MIT License) running on private Hugging Face ZeroGPU (NVIDIA A10G) with calibrated AR contact plane.',
      latencySecondsEstimate: 25,
      commercialUsePermitted: true,
      mobileARCompliant: true
    };
  }

  async checkSpaceReadiness(): Promise<{ ready: boolean; host: string; message?: string }> {
    const token = process.env.HF_TOKEN;
    const spaceId = process.env.HF_SPACE_ID || 'sujithputta/dineingo-food-3d';

    if (!token) {
      return { ready: false, host: '', message: 'HF_TOKEN is missing in backend environment.' };
    }

    try {
      const response = await fetch(`https://huggingface.co/api/spaces/${spaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return {
          ready: false,
          host: '',
          message: `Hugging Face Space API returned HTTP ${response.status}. Verify token permissions.`
        };
      }

      const data = await response.json();
      const stage = data.runtime?.stage || 'UNKNOWN';
      const host = data.host || `https://${data.subdomain || spaceId.replace('/', '-')}.hf.space`;

      if (stage === 'NO_APP_FILE') {
        return {
          ready: false,
          host,
          message: `Hugging Face Space "${spaceId}" is waiting for app.py and requirements.txt (stage: NO_APP_FILE). Upload files from huggingface-space/ to launch.`
        };
      }

      if (stage === 'BUILDING') {
        return {
          ready: false,
          host,
          message: `Hugging Face Space "${spaceId}" is currently building ZeroGPU dependencies.`
        };
      }

      if (stage !== 'RUNNING') {
        return {
          ready: false,
          host,
          message: `Hugging Face Space "${spaceId}" runtime stage is "${stage}".`
        };
      }

      return { ready: true, host };
    } catch (err: any) {
      return { ready: false, host: '', message: `Space connectivity check failed: ${err.message}` };
    }
  }

  async createJob(input: ReconstructionInput): Promise<{ jobId: string; providerJobId?: string }> {
    const readiness = await this.checkSpaceReadiness();
    if (!readiness.ready) {
      throw new Error(readiness.message || 'Hugging Face Space is not ready for inference.');
    }

    const token = process.env.HF_TOKEN;
    const sessionHash = 'sess_' + crypto.randomBytes(8).toString('hex');

    return {
      jobId: crypto.randomUUID(),
      providerJobId: sessionHash
    };
  }

  async reconstructRemote(
    input: ReconstructionInput,
    onProgress?: (pct: number) => void,
    isPublic: boolean = false
  ): Promise<{
    modelUrl: string;
    storageKey: string;
    storageType: string;
    isDurable: boolean;
    dimensions?: { widthMeters: number; heightMeters: number; depthMeters: number };
    contactPlaneAligned: boolean;
    metadata: any;
  }> {
    const readiness = await this.checkSpaceReadiness();
    if (!readiness.ready) {
      throw new Error(readiness.message || 'Hugging Face Space is not ready.');
    }

    const token = process.env.HF_TOKEN;
    const timeoutMs = Number(process.env.HF_RECONSTRUCTION_TIMEOUT_MS) || 180000;

    // Step 1: Safely validate and ingest input image
    onProgress?.(30);
    let imageBuffer: Buffer;
    if (input.imageUrl && input.imageUrl.startsWith('data:')) {
      const parsed = parseAndValidateDataUrl(input.imageUrl);
      imageBuffer = parsed.buffer;
    } else if (input.imageBuffer) {
      const magic = verifyImageMagicBytes(input.imageBuffer);
      if (!magic.valid) {
        throw new Error('Provided image buffer does not match supported image formats (JPEG, PNG, WebP).');
      }
      imageBuffer = input.imageBuffer;
    } else if (input.imageUrl) {
      const fetched = await safeFetchImage(input.imageUrl);
      imageBuffer = fetched.buffer;
    } else {
      throw new Error('No image provided for 3D reconstruction.');
    }

    const boundary = '----DineInGoUpload' + crypto.randomBytes(8).toString('hex');
    let formHeader = '--' + boundary + '\r\n';
    formHeader += 'Content-Disposition: form-data; name="files"; filename="food_input.jpg"\r\n';
    formHeader += 'Content-Type: image/jpeg\r\n\r\n';

    const uploadPayload = Buffer.concat([
      Buffer.from(formHeader, 'utf8'),
      imageBuffer,
      Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8')
    ]);

    const uploadRes = await fetch(`${readiness.host}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: uploadPayload
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload food image to Space (${uploadRes.status})`);
    }

    const [remoteImagePath] = await uploadRes.json();
    onProgress?.(45);

    // Step 2: Join Gradio Queue
    const sessionHash = 'sess_' + crypto.randomBytes(8).toString('hex');
    const joinRes = await fetch(`${readiness.host}/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [{ path: remoteImagePath }, input.referencePlateDiameterMeters || 0.24, 256],
        fn_index: 0,
        session_hash: sessionHash
      })
    });

    if (!joinRes.ok) {
      throw new Error(`Failed to join ZeroGPU queue (${joinRes.status})`);
    }

    onProgress?.(60);

    // Step 3: Stream queue events until process_completed
    const result = await new Promise<{ glbUrl: string; metaObj: any }>((resolve, reject) => {
      const abortTimer = setTimeout(() => {
        reject(new Error('ZeroGPU inference timed out waiting for queue results.'));
      }, timeoutMs);

      const client = readiness.host.startsWith('https') ? https : http;
      const streamReq = client.get(`${readiness.host}/queue/data?session_hash=${sessionHash}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }, (streamRes) => {
        let buffer = '';
        streamRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const event = JSON.parse(line.substring(5).trim());
                if (event.msg === 'process_starts') {
                  onProgress?.(75);
                } else if (event.msg === 'process_completed') {
                  clearTimeout(abortTimer);
                  streamRes.destroy();
                  if (event.success && event.output?.data) {
                    const [glbData, metaRaw] = event.output.data;
                    const metaObj = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
                    resolve({ glbUrl: glbData.url, metaObj });
                  } else {
                    const errMsg = event.output?.error || 'Reconstruction failed on remote model';
                    reject(new Error(errMsg));
                  }
                }
              } catch (_) {}
            }
          }
        });

        streamRes.on('error', (err) => {
          clearTimeout(abortTimer);
          reject(err);
        });
      });

      streamReq.on('error', (err) => {
        clearTimeout(abortTimer);
        reject(err);
      });
    });

    onProgress?.(90);

    // Step 4: Download and persist GLB
    const glbRes = await fetch(result.glbUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!glbRes.ok) {
      throw new Error(`Failed to download finished GLB model from Space (${glbRes.status})`);
    }

    const glbBuffer = Buffer.from(await glbRes.arrayBuffer());
    
    // Step 5: Validate GLB Magic Header (0x46546C67)
    if (glbBuffer.length < 12 || glbBuffer.readUInt32LE(0) !== 0x46546C67) {
      throw new Error('Downloaded asset failed glTF 2.0 binary validation');
    }

    // Step 6: Derive verified dimensions from the actual GLB geometry
    const extractedDims = extractGlbDimensions(glbBuffer);
    const dimensions = extractedDims ? {
      widthMeters: extractedDims.widthMeters,
      heightMeters: extractedDims.heightMeters,
      depthMeters: extractedDims.depthMeters
    } : undefined;

    // Step 7: Persist model using storage adapter (Cloudinary or local verified disk)
    const storageAdapter = getReconstructionStorageAdapter();
    const storageResult = await storageAdapter.saveGLB(glbBuffer, undefined, isPublic);

    return {
      modelUrl: storageResult.url,
      storageKey: storageResult.storageKey,
      storageType: storageResult.storageType,
      isDurable: storageResult.isDurable,
      dimensions,
      contactPlaneAligned: extractedDims?.contactPlaneAligned ?? true,
      metadata: {
        ...result.metaObj,
        dimensionSource: extractedDims ? 'gltf-accessor-measured' : 'unknown',
        lowestYMeters: extractedDims?.lowestYMeters,
        centerMeters: extractedDims?.centerMeters,
        totalVertices: extractedDims?.totalVertices,
        byteSize: glbBuffer.length,
        storageType: storageResult.storageType,
        isDurable: storageResult.isDurable
      }
    };
  }

  async checkJobStatus(providerJobId: string): Promise<{
    status: ReconstructionStatus;
    progress: number;
    modelUrl?: string;
    error?: string;
    assetQuality: ReconstructionAssetQuality;
  }> {
    return {
      status: 'processing',
      progress: 50,
      assetQuality: 'reconstructed-model'
    };
  }
}

/**
 * Verified local illustrative models available in the public asset catalog.
 * Dimensions are calibrated in meters with contact plane at Y=0.
 */
const VERIFIED_ILLUSTRATIVE_MODELS: Record<string, { modelUrl: string; widthMeters: number; heightMeters: number; depthMeters: number }> = {
  'soup': { modelUrl: '/models/ar/french-onion-soup.glb', widthMeters: 0.18, heightMeters: 0.08, depthMeters: 0.18 },
  'onion': { modelUrl: '/models/ar/french-onion-soup.glb', widthMeters: 0.18, heightMeters: 0.08, depthMeters: 0.18 },
  'french onion': { modelUrl: '/models/ar/french-onion-soup.glb', widthMeters: 0.18, heightMeters: 0.08, depthMeters: 0.18 },
  'salad': { modelUrl: '/models/ar/salad-bowl.glb', widthMeters: 0.22, heightMeters: 0.09, depthMeters: 0.22 },
  'caesar': { modelUrl: '/models/ar/salad-bowl.glb', widthMeters: 0.22, heightMeters: 0.09, depthMeters: 0.22 },
  'beef': { modelUrl: '/models/ar/braised-beef.glb', widthMeters: 0.24, heightMeters: 0.04, depthMeters: 0.24 },
  'bourguignon': { modelUrl: '/models/ar/braised-beef.glb', widthMeters: 0.24, heightMeters: 0.04, depthMeters: 0.24 },
  'steak': { modelUrl: '/models/ar/braised-beef.glb', widthMeters: 0.24, heightMeters: 0.04, depthMeters: 0.24 },
  'pie': { modelUrl: '/models/ar/baked-pie.glb', widthMeters: 0.20, heightMeters: 0.03, depthMeters: 0.20 },
  'tarte': { modelUrl: '/models/ar/baked-pie.glb', widthMeters: 0.20, heightMeters: 0.03, depthMeters: 0.20 },
  'tatin': { modelUrl: '/models/ar/baked-pie.glb', widthMeters: 0.20, heightMeters: 0.03, depthMeters: 0.20 },
  'apple': { modelUrl: '/models/ar/baked-pie.glb', widthMeters: 0.20, heightMeters: 0.03, depthMeters: 0.20 },
  'creme': { modelUrl: '/models/ar/creme-brulee.glb', widthMeters: 0.14, heightMeters: 0.035, depthMeters: 0.14 },
  'brulee': { modelUrl: '/models/ar/creme-brulee.glb', widthMeters: 0.14, heightMeters: 0.035, depthMeters: 0.14 }
};

function findIllustrativeAsset(dishName: string): { modelUrl: string; widthMeters: number; heightMeters: number; depthMeters: number } | null {
  const norm = dishName.toLowerCase().trim();
  for (const [kw, asset] of Object.entries(VERIFIED_ILLUSTRATIVE_MODELS)) {
    if (norm.includes(kw)) {
      return asset;
    }
  }
  return null;
}

/**
 * Calibrated Illustrative Fallback Provider
 * Explicitly labeled as approximate illustrative representation when external AI provider keys are missing.
 * Only completes if a calibrated local 3D model exists for the dish; otherwise fails truthfully to photo fallback.
 */
class CalibratedIllustrativeProvider implements Food3DReconstructionProvider {
  id = 'illustrative-calibrated';
  name = 'Calibrated Illustrative Service';

  isAvailable(): boolean {
    return true; // Always available as a documented offline reference
  }

  getCapability(): ProviderCapability {
    return {
      id: this.id,
      name: this.name,
      configured: true,
      requiresKey: 'None (Built-in)',
      description: 'Provides calibrated illustrative servingware models for dishes with known geometry.',
      latencySecondsEstimate: 2,
      commercialUsePermitted: true,
      mobileARCompliant: true
    };
  }

  async createJob(input: ReconstructionInput): Promise<{ jobId: string; providerJobId?: string }> {
    const jobId = 'calib_' + crypto.randomBytes(8).toString('hex');
    return { jobId, providerJobId: jobId };
  }

  async checkJobStatus(providerJobId: string): Promise<{
    status: ReconstructionStatus;
    progress: number;
    modelUrl?: string;
    error?: string;
    assetQuality: ReconstructionAssetQuality;
  }> {
    return {
      status: 'completed',
      progress: 100,
      assetQuality: 'illustrative-model'
    };
  }
}

export class ReconstructionService {
  private providers: Map<string, Food3DReconstructionProvider> = new Map();

  constructor() {
    const hf = new HuggingFaceTripoSRProvider();
    const illustrative = new CalibratedIllustrativeProvider();
    this.providers.set(hf.id, hf);
    this.providers.set(illustrative.id, illustrative);
  }

  getProviderCapabilities(): ProviderCapability[] {
    return Array.from(this.providers.values()).map(p => p.getCapability());
  }

  getActiveProvider(): Food3DReconstructionProvider {
    const hf = this.providers.get('hf-triposr');
    if (hf && hf.isAvailable()) {
      return hf;
    }
    return this.providers.get('illustrative-calibrated')!;
  }

  async submitJob(input: ReconstructionInput): Promise<IReconstructionJob> {
    const provider = this.getActiveProvider();
    const internalJobId = 'rec_' + crypto.randomBytes(8).toString('hex');

    // Reject and strip attempts to set publication status through arbitrary client metadata.
    // All newly generated user-specific reconstructions are strictly private by default.
    const sanitizedMetadata = { ...input.metadata };
    delete sanitizedMetadata.isPublic;
    delete sanitizedMetadata.public;

    // Create persistent record
    const job = new ReconstructionJob({
      jobId: internalJobId,
      userId: input.userId,
      dishName: input.dishName,
      imageUrl: input.imageUrl,
      restaurantId: input.restaurantId,
      menuItemId: input.menuItemId,
      status: 'queued',
      progress: 5,
      provider: provider.id as any,
      assetQuality: provider.id === 'hf-triposr' ? 'reconstructed-model' : 'illustrative-model',
      contactPlaneAligned: true,
      isPublic: false, // Strictly private by default
      // No arbitrary dimensions invented here; verified dimensions are derived from actual GLB geometry on completion
      dimensions: undefined,
      metadata: {
        requestedProvider: provider.id,
        referencePlateDiameterMeters: input.referencePlateDiameterMeters || 0.24,
        ...sanitizedMetadata
      }
    });

    await job.save();

    // Trigger async processing step
    this.processJobAsync(job, provider, input);

    return job;
  }

  private async processJobAsync(
    job: IReconstructionJob, 
    provider: Food3DReconstructionProvider, 
    input: ReconstructionInput
  ) {
    try {
      job.status = 'processing';
      job.progress = 20;
      await job.save();

      if (provider.id === 'hf-triposr') {
        const hfProvider = provider as HuggingFaceTripoSRProvider;
        const result = await hfProvider.reconstructRemote(input, async (pct) => {
          job.progress = pct;
          await job.save();
        }, false);

        job.status = 'completed';
        job.progress = 100;
        job.modelUrl = result.modelUrl;
        job.storageKey = result.storageKey;
        job.storageType = result.storageType as any;
        job.assetQuality = 'reconstructed-model';
        job.dimensions = result.dimensions;
        job.contactPlaneAligned = result.contactPlaneAligned;
        job.metadata = { ...job.metadata, ...result.metadata };
        await job.save();
      } else {
        // Illustrative fallback provider
        const matchedAsset = findIllustrativeAsset(input.dishName);

        if (matchedAsset) {
          job.status = 'completed';
          job.progress = 100;
          job.assetQuality = 'illustrative-model';
          job.modelUrl = matchedAsset.modelUrl;
          job.dimensions = {
            widthMeters: matchedAsset.widthMeters,
            heightMeters: matchedAsset.heightMeters,
            depthMeters: matchedAsset.depthMeters
          };
          await job.save();
        } else {
          // Truthful failure when no asset exists and remote inference is inactive
          job.status = 'failed';
          job.progress = 0;
          job.assetQuality = 'photo-fallback';
          job.error = 'No verified 3D model exists for this dish, and remote AI 3D reconstruction is not currently available.';
          await job.save();
        }
      }
    } catch (err: any) {
      console.warn(`[ReconstructionService] Job ${job.jobId} processing error:`, err.message);
      job.status = 'failed';
      job.progress = 0;
      job.error = sanitizeSecrets(err.message) || 'Reconstruction processing failed';
      job.assetQuality = 'photo-fallback';
      await job.save();
    }
  }

  async getJob(jobId: string): Promise<IReconstructionJob | null> {
    const job = await ReconstructionJob.findOne({ jobId });
    return job;
  }

  /**
   * Explicitly publishes a reconstructed 3D asset to the public restaurant catalog.
   * Can only be called by authorized publishers (restaurant owners or administrators).
   * Verifies restaurant ownership server-side using persisted records, enforces completed job status,
   * performs failure-safe storage migration, and strictly retains private state on failure.
   */
  async publishJob(
    jobId: string,
    requester: RequesterAuthContext,
    options?: { restaurantId?: string; menuItemId?: string }
  ): Promise<IReconstructionJob> {
    const job = await ReconstructionJob.findOne({ jobId });
    if (!job) {
      throw new PublicationError(`Reconstruction job "${jobId}" was not found.`, 404);
    }

    // 1. Enforce completed status - incomplete jobs cannot be published
    if (job.status !== 'completed') {
      throw new PublicationError(
        `Cannot publish reconstruction job with status "${job.status}". Only completed jobs can be published.`,
        400
      );
    }

    // 2. Validate storage key
    const currentStorageKey = job.storageKey;
    const cleanStorageKey = currentStorageKey ? currentStorageKey.replace(/^dineingo\/reconstructions\//, '') : '';
    if (!currentStorageKey || !cleanStorageKey || !isValidAssetFilename(cleanStorageKey)) {
      throw new PublicationError('Cannot publish job: valid storage key is missing.', 400);
    }

    // 3. Verify publisher role & ownership context
    const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin' || requester.role === 'super_admin');
    const isOwner = Boolean(requester.role === 'restaurant_owner' || requester.role === 'owner');

    if (!isAdmin && !isOwner) {
      throw new PublicationError('Forbidden: Only restaurant owners or administrators can publish public assets.', 403);
    }

    // Cross-user protection: A restaurant owner cannot publish another user's reconstruction
    if (!isAdmin && job.userId !== requester.uid) {
      throw new PublicationError("Forbidden: You cannot publish another user's private reconstruction.", 403);
    }

    // Determine target restaurant / menu item linkage from persisted records first
    let targetRestaurantId = job.restaurantId;
    let targetMenuItemId = job.menuItemId;

    // If client supplied options, verify they do not conflict with persisted records
    if (options?.restaurantId) {
      if (job.restaurantId && job.restaurantId !== options.restaurantId && !isAdmin) {
        throw new PublicationError(
          `Forbidden: Asset is permanently associated with restaurant "${job.restaurantId}" and cannot be published to "${options.restaurantId}".`,
          403
        );
      }
      if (!targetRestaurantId) {
        targetRestaurantId = options.restaurantId;
      }
    }

    if (options?.menuItemId) {
      if (job.menuItemId && job.menuItemId !== options.menuItemId && !isAdmin) {
        throw new PublicationError(
          `Forbidden: Asset is permanently associated with menu item "${job.menuItemId}" and cannot be published to "${options.menuItemId}".`,
          403
        );
      }
      if (!targetMenuItemId) {
        targetMenuItemId = options.menuItemId;
      }
    }

    if (!targetRestaurantId && !targetMenuItemId) {
      throw new PublicationError(
        'Forbidden: Reconstruction model is not linked to an authorized restaurant or menu item. Asset remains private.',
        403
      );
    }

    // Verify restaurant & menu-item relationship integrity
    const authCheck = await verifyRestaurantAuthorization(targetRestaurantId, targetMenuItemId, requester);
    if (!authCheck.authorized) {
      throw new PublicationError(
        authCheck.reason || 'Forbidden: You are not authorized to publish assets for this restaurant.',
        authCheck.statusCode || 403
      );
    }

    if (authCheck.verifiedRestaurantId && job.restaurantId && authCheck.verifiedRestaurantId !== job.restaurantId && !isAdmin) {
      throw new PublicationError(
        `Forbidden: Verified restaurant "${authCheck.verifiedRestaurantId}" does not match persisted job restaurant "${job.restaurantId}".`,
        403
      );
    }

    const finalRestaurantId = authCheck.verifiedRestaurantId || targetRestaurantId;
    const finalMenuItemId = authCheck.verifiedMenuItemId || targetMenuItemId;

    if (job.isPublic) {
      return job; // Already published (idempotent)
    }

    const storageAdapter = getReconstructionStorageAdapter();

    // 4. Verify existing private 3D asset binary exists before attempting any migration
    const privateBuffer = await storageAdapter.getGLB(currentStorageKey, false);
    if (!privateBuffer || privateBuffer.length === 0) {
      throw new PublicationError('Cannot publish job: private 3D model asset is missing or cannot be retrieved.', 404);
    }

    // 5. Migrate asset to public CDN storage safely (keeps private copy intact)
    let publishResult: StorageSaveResult | null = null;
    try {
      if (typeof (storageAdapter as any).publishGLB === 'function') {
        publishResult = await (storageAdapter as any).publishGLB(currentStorageKey);
      } else {
        const publicUrl = await storageAdapter.getDeliveryUrl(currentStorageKey, true);
        publishResult = {
          url: publicUrl,
          storageType: job.storageType === 'cloudinary' ? 'cloudinary' : 'local',
          storageKey: currentStorageKey,
          originalPrivateKey: currentStorageKey,
          publicKey: currentStorageKey,
          byteSize: privateBuffer.length,
          isDurable: storageAdapter.isDurable()
        };
      }
    } catch (storageErr: any) {
      console.error(`[ReconstructionService] Storage migration threw error for job ${job.jobId}:`, storageErr);
      publishResult = null;
    }

    // If storage migration failed, fail closed and retain previous private state
    if (!publishResult || !publishResult.url) {
      throw new PublicationError('Failed to migrate 3D asset to public storage delivery.', 502);
    }

    // 6. Verify the resulting public asset is retrievable on public CDN before updating database
    const publicKey = publishResult.publicKey || publishResult.storageKey || currentStorageKey;
    let verifiedPublicBuffer: Buffer | null = null;
    try {
      verifiedPublicBuffer = await storageAdapter.getGLB(publicKey, true);
    } catch (verifyErr) {
      console.error(`[ReconstructionService] Public CDN verification error for job ${job.jobId}:`, verifyErr);
      verifiedPublicBuffer = null;
    }

    if (!verifiedPublicBuffer || verifiedPublicBuffer.length === 0) {
      // Rollback public copy
      await this.rollbackPublicCopy(storageAdapter, publishResult, currentStorageKey);
      throw new PublicationError('Failed to verify published 3D model asset on public delivery CDN.', 502);
    }

    // 7. Persist changes to ReconstructionJob
    const previousIsPublic = job.isPublic;
    const previousModelUrl = job.modelUrl;
    const previousStorageKey = job.storageKey;
    const previousStorageType = job.storageType;
    const previousRestaurantId = job.restaurantId;
    const previousMenuItemId = job.menuItemId;
    const previousMetadata = { ...job.metadata };

    job.isPublic = true;
    job.modelUrl = publishResult.url;
    if (publishResult.storageKey) {
      job.storageKey = publishResult.storageKey;
    }
    if (publishResult.storageType) {
      job.storageType = publishResult.storageType;
    }
    if (finalRestaurantId) {
      job.restaurantId = finalRestaurantId;
    }
    if (finalMenuItemId) {
      job.menuItemId = finalMenuItemId;
    }
    job.metadata = {
      ...job.metadata,
      publishedAt: new Date().toISOString(),
      publishedBy: requester.uid,
      publishedRestaurantId: finalRestaurantId,
      publishedMenuItemId: finalMenuItemId
    };

    try {
      await job.save();
    } catch (saveErr) {
      console.error(`[ReconstructionService] Database save failed for job ${job.jobId}:`, saveErr);
      // Revert in-memory state
      job.isPublic = previousIsPublic;
      job.modelUrl = previousModelUrl;
      job.storageKey = previousStorageKey;
      job.storageType = previousStorageType;
      job.restaurantId = previousRestaurantId;
      job.menuItemId = previousMenuItemId;
      job.metadata = previousMetadata;

      // Rollback public copy so it does not remain exposed
      await this.rollbackPublicCopy(storageAdapter, publishResult, currentStorageKey);
      throw new PublicationError('Failed to persist published job state to database.', 500);
    }

    // 8. Scoped Menu Item update: only AFTER job.save() succeeds
    if (finalMenuItemId && mongoose.connection?.readyState === 1) {
      try {
        if (finalRestaurantId) {
          await MenuItem.updateOne(
            { _id: finalMenuItemId, businessId: finalRestaurantId },
            { $set: { modelUrl: publishResult.url } }
          ).catch(() => {});

          const isObjectId = mongoose.Types.ObjectId.isValid(finalRestaurantId);
          await Restaurant.updateOne(
            {
              $or: [
                { restaurantId: finalRestaurantId },
                ...(isObjectId ? [{ _id: finalRestaurantId }] : [])
              ],
              'menu.id': finalMenuItemId
            },
            { $set: { 'menu.$.modelUrl': publishResult.url } }
          ).catch(() => {});

          if (isObjectId) {
            await Business.updateOne(
              { _id: finalRestaurantId, 'menu.id': finalMenuItemId },
              { $set: { 'menu.$.modelUrl': publishResult.url } }
            ).catch(() => {});
          }
        }
      } catch (menuSyncErr) {
        console.warn('[ReconstructionService] Non-fatal menu modelUrl sync error:', menuSyncErr);
      }
    }

    // 9. Remove old private copy only after successful persistence
    const originalPrivateKey = publishResult.originalPrivateKey || previousStorageKey;
    if (originalPrivateKey && (publishResult.storageType === 'cloudinary' || originalPrivateKey !== job.storageKey)) {
      try {
        await storageAdapter.deleteGLB(originalPrivateKey, false);
      } catch (cleanupErr) {
        console.warn(`[ReconstructionService] Non-fatal cleanup issue removing private copy ${originalPrivateKey}:`, cleanupErr);
      }
    }

    return job;
  }

  private async rollbackPublicCopy(
    storageAdapter: any,
    publishResult: StorageSaveResult,
    originalStorageKey: string
  ): Promise<void> {
    const publicKey = publishResult.publicKey || publishResult.storageKey;
    if (!publicKey) return;

    try {
      if (publishResult.storageType === 'cloudinary') {
        await storageAdapter.deleteGLB(publicKey, true);
      } else {
        const cleanPublic = publicKey.replace(/^dineingo\/reconstructions\//, '');
        const cleanOrig = originalStorageKey.replace(/^dineingo\/reconstructions\//, '');
        if (cleanPublic !== cleanOrig) {
          await storageAdapter.deleteGLB(cleanPublic, true);
        }
      }
    } catch (cleanupErr) {
      console.warn('[ReconstructionService] Warning: Failed to clean up public copy during rollback:', cleanupErr);
    }
  }
}

export const reconstructionService = new ReconstructionService();

