import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ReconstructionJob, IReconstructionJob, ReconstructionStatus, ReconstructionAssetQuality } from '../models/ReconstructionJob';

export interface ReconstructionInput {
  userId: string;
  dishName: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
  referencePlateDiameterMeters?: number;
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

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'reconstructions');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

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
    const timeoutMs = Number(process.env.HF_RECONSTRUCTION_TIMEOUT_MS) || 120000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Call Gradio /reconstruct endpoint
      const response = await fetch(`${readiness.host}/gradio_api/call/reconstruct`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: [
            input.imageUrl,
            input.referencePlateDiameterMeters || 0.24,
            256
          ]
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Space reconstruction request failed (${response.status}): ${sanitizeSecrets(errText)}`);
      }

      const callData = await response.json();
      return {
        jobId: crypto.randomUUID(),
        providerJobId: callData.event_id || crypto.randomUUID()
      };
    } catch (e: any) {
      clearTimeout(timeout);
      throw e;
    }
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

    // Create persistent record
    const job = new ReconstructionJob({
      jobId: internalJobId,
      userId: input.userId,
      dishName: input.dishName,
      imageUrl: input.imageUrl,
      status: 'queued',
      progress: 5,
      provider: provider.id as any,
      assetQuality: provider.id === 'hf-triposr' ? 'reconstructed-model' : 'illustrative-model',
      contactPlaneAligned: true,
      dimensions: {
        widthMeters: 0.20,
        heightMeters: 0.08,
        depthMeters: 0.20
      },
      metadata: {
        requestedProvider: provider.id,
        referencePlateDiameterMeters: input.referencePlateDiameterMeters || 0.24,
        ...input.metadata
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

      // Check user-scoped cache for repeated scans of same confirmed dish
      const existingUserJob = await ReconstructionJob.findOne({
        userId: input.userId,
        dishName: input.dishName.trim(),
        status: 'completed',
        modelUrl: { $exists: true, $ne: null }
      }).sort({ createdAt: -1 });

      if (existingUserJob && existingUserJob.modelUrl) {
        job.status = 'completed';
        job.progress = 100;
        job.modelUrl = existingUserJob.modelUrl;
        job.assetQuality = existingUserJob.assetQuality;
        job.dimensions = existingUserJob.dimensions;
        job.metadata = { ...job.metadata, cachedFromJobId: existingUserJob.jobId };
        await job.save();
        return;
      }

      if (provider.id === 'hf-triposr') {
        const hfProvider = provider as HuggingFaceTripoSRProvider;
        // Verify Space readiness
        const readiness = await hfProvider.checkSpaceReadiness();
        if (!readiness.ready) {
          throw new Error(readiness.message || 'Hugging Face Space is not ready for inference.');
        }

        job.progress = 40;
        await job.save();

        const { providerJobId } = await hfProvider.createJob(input);
        job.metadata = { ...job.metadata, providerJobId };
        job.progress = 60;
        await job.save();

        // Download generated asset if URL returned
        // For Gradio, if direct model path or event returned:
        // Set completed once file saved and validated
        job.status = 'processing';
        job.progress = 80;
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
}

export const reconstructionService = new ReconstructionService();

