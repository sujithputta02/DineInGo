import crypto from 'crypto';
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

/**
 * Meshy Image-to-3D Provider Implementation
 * Standard AI 3D Reconstruction service generating textured GLBs
 */
class Meshy3DProvider implements Food3DReconstructionProvider {
  id = 'meshy';
  name = 'Meshy AI Food Reconstruction';

  isAvailable(): boolean {
    return Boolean(process.env.MESHY_API_KEY && process.env.MESHY_API_KEY.trim().length > 0);
  }

  getCapability(): ProviderCapability {
    return {
      id: this.id,
      name: this.name,
      configured: this.isAvailable(),
      requiresKey: 'MESHY_API_KEY',
      description: 'Generates textured 3D GLBs from single food images with PBR materials.',
      latencySecondsEstimate: 120,
      commercialUsePermitted: true,
      mobileARCompliant: true
    };
  }

  async createJob(input: ReconstructionInput): Promise<{ jobId: string; providerJobId?: string }> {
    const apiKey = process.env.MESHY_API_KEY;
    if (!apiKey) {
      throw new Error('MESHY_API_KEY is not configured in backend environment.');
    }

    if (!input.imageUrl) {
      throw new Error('Image URL is required for Meshy 3D reconstruction.');
    }

    const response = await fetch('https://api.meshy.ai/v2/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: input.imageUrl,
        enable_pbr: true,
        ai_model: 'meshy-4'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Meshy API request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
      jobId: crypto.randomUUID(),
      providerJobId: data.result || data.id
    };
  }

  async checkJobStatus(providerJobId: string): Promise<{
    status: ReconstructionStatus;
    progress: number;
    modelUrl?: string;
    error?: string;
    assetQuality: ReconstructionAssetQuality;
  }> {
    const apiKey = process.env.MESHY_API_KEY;
    if (!apiKey) {
      return {
        status: 'failed',
        progress: 0,
        error: 'MESHY_API_KEY is missing',
        assetQuality: 'photo-fallback'
      };
    }

    const response = await fetch(`https://api.meshy.ai/v2/image-to-3d/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      return {
        status: 'failed',
        progress: 0,
        error: `Status check failed with code ${response.status}`,
        assetQuality: 'photo-fallback'
      };
    }

    const data = await response.json();
    const state = (data.status || '').toUpperCase();

    if (state === 'SUCCEEDED') {
      return {
        status: 'completed',
        progress: 100,
        modelUrl: data.model_urls?.glb,
        assetQuality: 'reconstructed-model'
      };
    } else if (state === 'FAILED' || state === 'EXPIRED') {
      return {
        status: 'failed',
        progress: 0,
        error: data.task_error?.message || 'Meshy generation failed',
        assetQuality: 'photo-fallback'
      };
    } else {
      return {
        status: 'processing',
        progress: data.progress || 50,
        assetQuality: 'reconstructed-model'
      };
    }
  }
}

/**
 * Calibrated Illustrative Fallback Provider
 * Explicitly labeled as approximate illustrative representation when external AI provider keys are missing
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
    const meshy = new Meshy3DProvider();
    const illustrative = new CalibratedIllustrativeProvider();
    this.providers.set(meshy.id, meshy);
    this.providers.set(illustrative.id, illustrative);
  }

  getProviderCapabilities(): ProviderCapability[] {
    return Array.from(this.providers.values()).map(p => p.getCapability());
  }

  getActiveProvider(): Food3DReconstructionProvider {
    const meshy = this.providers.get('meshy');
    if (meshy && meshy.isAvailable()) {
      return meshy;
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
      assetQuality: provider.id === 'meshy' ? 'reconstructed-model' : 'illustrative-model',
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
      job.progress = 25;
      await job.save();

      if (provider.id === 'meshy') {
        const { providerJobId } = await provider.createJob(input);
        job.metadata = { ...job.metadata, providerJobId };
        job.progress = 50;
        await job.save();
      } else {
        // Illustrative completion
        job.status = 'completed';
        job.progress = 100;
        job.assetQuality = 'illustrative-model';
        await job.save();
      }
    } catch (err: any) {
      console.warn(`[ReconstructionService] Job ${job.jobId} processing error:`, err.message);
      job.status = 'failed';
      job.error = err.message;
      job.assetQuality = 'photo-fallback';
      await job.save();
    }
  }

  async getJob(jobId: string): Promise<IReconstructionJob | null> {
    const job = await ReconstructionJob.findOne({ jobId });
    if (!job) return null;

    // If still processing on external provider, query status
    if (job.status === 'processing' && job.provider === 'meshy' && job.metadata?.providerJobId) {
      const meshy = this.providers.get('meshy') as Meshy3DProvider;
      if (meshy && meshy.isAvailable()) {
        try {
          const res = await meshy.checkJobStatus(job.metadata.providerJobId);
          job.status = res.status;
          job.progress = res.progress;
          if (res.modelUrl) job.modelUrl = res.modelUrl;
          if (res.error) job.error = res.error;
          job.assetQuality = res.assetQuality;
          await job.save();
        } catch (e: any) {
          console.warn('[ReconstructionService] Poll error:', e.message);
        }
      }
    }

    return job;
  }
}

export const reconstructionService = new ReconstructionService();
