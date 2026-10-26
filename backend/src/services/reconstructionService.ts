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
) => Promise<{ authorized: boolean; reason?: string; verifiedRestaurantId?: string }>;

let customOwnershipResolver: RestaurantOwnershipResolver | null = null;

export function setRestaurantOwnershipResolver(resolver: RestaurantOwnershipResolver | null) {
  customOwnershipResolver = resolver;
}

/**
 * Verifies server-side using persisted records that the requester owns or is authorized
 * to manage the specified restaurant or menu item.
 */
export async function verifyRestaurantAuthorization(
  restaurantId: string | undefined | null,
  menuItemId: string | undefined | null,
  requester: RequesterAuthContext
): Promise<{ authorized: boolean; reason?: string; verifiedRestaurantId?: string }> {
  if (customOwnershipResolver) {
    return customOwnershipResolver(restaurantId, menuItemId, requester);
  }

  const isAdmin = Boolean(requester.isAdmin || requester.role === 'admin' || requester.role === 'super_admin');
  if (isAdmin) {
    return { authorized: true, verifiedRestaurantId: restaurantId || undefined };
  }

  if (!restaurantId && !menuItemId) {
    return {
      authorized: false,
      reason: 'Reconstruction model is not linked to an authorized restaurant or menu item'
    };
  }

  if (mongoose.connection?.readyState !== 1) {
    return {
      authorized: false,
      reason: 'Database connection unavailable to verify restaurant ownership'
    };
  }

  // 1. If restaurantId is specified, check Restaurant and Business models in persisted DB
  if (restaurantId) {
    const isObjectId = mongoose.Types.ObjectId.isValid(restaurantId);

    try {
      const restaurant = await Restaurant.findOne({
        $or: [
          { restaurantId: restaurantId },
          ...(isObjectId ? [{ _id: restaurantId }] : [])
        ]
      });

      if (restaurant) {
        if (restaurant.ownerId === requester.uid) {
          return { authorized: true, verifiedRestaurantId: restaurant.restaurantId || String(restaurant._id) };
        } else {
          return { authorized: false, reason: 'Requester does not own the specified restaurant' };
        }
      }
    } catch (dbErr) {
      console.warn('[ReconstructionService] Error querying Restaurant model:', dbErr);
    }

    if (isObjectId) {
      try {
        const business = await Business.findById(restaurantId);
        if (business) {
          if (business.ownerId === requester.uid) {
            return { authorized: true, verifiedRestaurantId: String(business._id) };
          } else {
            return { authorized: false, reason: 'Requester does not own the specified business' };
          }
        }
      } catch (dbErr) {
        console.warn('[ReconstructionService] Error querying Business model:', dbErr);
      }
    }
  }

  // 2. If menuItemId is specified, check MenuItem and Restaurant models
  if (menuItemId) {
    const isItemObjectId = mongoose.Types.ObjectId.isValid(menuItemId);
    if (isItemObjectId) {
      try {
        const menuItem = await MenuItem.findById(menuItemId);
        if (menuItem && menuItem.businessId) {
          if (mongoose.Types.ObjectId.isValid(menuItem.businessId)) {
            const business = await Business.findById(menuItem.businessId);
            if (business && business.ownerId === requester.uid) {
              return { authorized: true, verifiedRestaurantId: String(business._id) };
            }
          }
          const restaurant = await Restaurant.findOne({ restaurantId: menuItem.businessId });
          if (restaurant && restaurant.ownerId === requester.uid) {
            return { authorized: true, verifiedRestaurantId: restaurant.restaurantId };
          }
        }
      } catch (dbErr) {
        console.warn('[ReconstructionService] Error querying MenuItem model:', dbErr);
      }
    }

    try {
      const restWithEmbeddedMenu = await Restaurant.findOne({ 'menu.id': menuItemId });
      if (restWithEmbeddedMenu) {
        if (restWithEmbeddedMenu.ownerId === requester.uid) {
          return { authorized: true, verifiedRestaurantId: restWithEmbeddedMenu.restaurantId };
        } else {
          return { authorized: false, reason: 'Requester does not own the restaurant containing this menu item' };
        }
      }
    } catch (dbErr) {
      console.warn('[ReconstructionService] Error querying embedded menu:', dbErr);
    }
  }

  return {
    authorized: false,
    reason: 'Restaurant or menu item not found in persisted records'
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
    if (!job.storageKey || !isValidAssetFilename(job.storageKey)) {
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

    if (!isAdmin) {
      if (!targetRestaurantId && !targetMenuItemId) {
        throw new PublicationError(
          'Forbidden: Reconstruction model is not linked to an authorized restaurant or menu item. Asset remains private.',
          403
        );
      }

      const authCheck = await verifyRestaurantAuthorization(targetRestaurantId, targetMenuItemId, requester);
      if (!authCheck.authorized) {
        throw new PublicationError(
          `Forbidden: ${authCheck.reason || 'You are not authorized to publish assets for this restaurant.'}`,
          403
        );
      }
    }

    if (job.isPublic) {
      return job; // Already published
    }

    const storageAdapter = getReconstructionStorageAdapter();

    // 4. Verify existing private 3D asset binary exists before attempting any migration
    const privateBuffer = await storageAdapter.getGLB(job.storageKey, false);
    if (!privateBuffer || privateBuffer.length === 0) {
      throw new PublicationError('Cannot publish job: private 3D model asset is missing or cannot be retrieved.', 404);
    }

    // 5. Migrate asset to public CDN storage safely
    let publishResult: StorageSaveResult | null = null;
    try {
      if (typeof (storageAdapter as any).publishGLB === 'function') {
        publishResult = await (storageAdapter as any).publishGLB(job.storageKey);
      } else {
        const publicUrl = await storageAdapter.getDeliveryUrl(job.storageKey, true);
        publishResult = {
          url: publicUrl,
          storageType: job.storageType === 'cloudinary' ? 'cloudinary' : 'local',
          storageKey: job.storageKey,
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
    const verifiedPublicBuffer = await storageAdapter.getGLB(publishResult.storageKey || job.storageKey, true);
    if (!verifiedPublicBuffer || verifiedPublicBuffer.length === 0) {
      // Rollback: delete published asset if it was created as a new key
      if (publishResult.storageKey && publishResult.storageKey !== job.storageKey) {
        await storageAdapter.deleteGLB(publishResult.storageKey, true).catch(() => {});
      }
      throw new PublicationError('Failed to verify published 3D model asset on public delivery CDN.', 502);
    }

    // 7. Update isPublic, modelUrl, storageKey, storage metadata and publication audit details consistently
    job.isPublic = true;
    job.modelUrl = publishResult.url;
    if (publishResult.storageKey) {
      job.storageKey = publishResult.storageKey;
    }
    if (publishResult.storageType) {
      job.storageType = publishResult.storageType;
    }
    if (targetRestaurantId && !job.restaurantId) {
      job.restaurantId = targetRestaurantId;
    }
    if (targetMenuItemId && !job.menuItemId) {
      job.menuItemId = targetMenuItemId;
    }
    job.metadata = {
      ...job.metadata,
      publishedAt: new Date().toISOString(),
      publishedBy: requester.uid,
      publishedRestaurantId: targetRestaurantId,
      publishedMenuItemId: targetMenuItemId
    };
    await job.save();

    // Sync modelUrl to MenuItem if linked
    if (targetMenuItemId && mongoose.connection.readyState === 1) {
      try {
        await MenuItem.findByIdAndUpdate(targetMenuItemId, { modelUrl: publishResult.url }).catch(() => {});
        await Restaurant.updateOne(
          { 'menu.id': targetMenuItemId },
          { $set: { 'menu.$.modelUrl': publishResult.url } }
        ).catch(() => {});
      } catch {
        // Non-fatal sync
      }
    }

    return job;
  }
}

export const reconstructionService = new ReconstructionService();

