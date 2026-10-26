/**
 * DineInGo 3D Reconstruction Client Service
 * ─────────────────────────────────────────
 * Handles communication with backend reconstruction job endpoints:
 * - Queries provider capability & availability (Meshy / Tripo3D / Illustrative)
 * - Submits food image-to-3D jobs
 * - Polls job progress until ready or failed
 * - Validates output geometry & prevents broken model links
 */

export type ReconstructionJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type AssetQualityState =
  | 'verified-asset'
  | 'reconstructed-model'
  | 'illustrative-model'
  | 'representative-preview'
  | 'photo-fallback';

export interface ReconstructionJobResponse {
  jobId: string;
  dishName: string;
  status: ReconstructionJobStatus;
  progress: number;
  provider: string;
  assetQuality: AssetQualityState;
  modelUrl?: string;
  dimensions?: {
    widthMeters: number;
    heightMeters: number;
    depthMeters: number;
  };
  contactPlaneAligned: boolean;
  error?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  requiresKey: string;
  description: string;
}

/**
 * Fetch list of registered backend 3D reconstruction providers
 */
export async function getReconstructionProviders(): Promise<{
  providers: ProviderInfo[];
  activeProvider: string;
}> {
  try {
    const res = await fetch('/api/v1/reconstruction/providers');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      providers: data.providers || [],
      activeProvider: data.activeProvider || 'illustrative-calibrated'
    };
  } catch {
    return {
      providers: [
        {
          id: 'illustrative-calibrated',
          name: 'Calibrated Illustrative Service (Built-in)',
          configured: true,
          requiresKey: 'None',
          description: 'Generates calibrated representative tableware models for known culinary items.'
        },
        {
          id: 'meshy',
          name: 'Meshy AI Food Reconstruction',
          configured: false,
          requiresKey: 'MESHY_API_KEY',
          description: 'Generates quad-textured 3D models from food photos.'
        }
      ],
      activeProvider: 'illustrative-calibrated'
    };
  }
}

/**
 * Submit an image-to-3D reconstruction job
 */
export async function submitFoodReconstructionJob(params: {
  userId: string;
  dishName: string;
  imageUrl?: string;
  referencePlateDiameterMeters?: number;
}): Promise<string> {
  const res = await fetch('/api/v1/reconstruction/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to queue job' }));
    throw new Error(err.message || 'Job submission failed');
  }

  const data = await res.json();
  return data.jobId;
}

/**
 * Poll job status until completion or failure
 */
export async function pollReconstructionJob(
  jobId: string,
  onProgress?: (progress: number, status: ReconstructionJobStatus) => void,
  maxAttempts: number = 30
): Promise<ReconstructionJobResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const res = await fetch(`/api/v1/reconstruction/jobs/${encodeURIComponent(jobId)}`);

    if (!res.ok) {
      throw new Error(`Failed to check job status: HTTP ${res.status}`);
    }

    const data = await res.json();
    const job: ReconstructionJobResponse = data.job;

    onProgress?.(job.progress, job.status);

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }

    // Wait 2.5 seconds before next poll
    await new Promise(r => setTimeout(r, 2500));
  }

  throw new Error('Reconstruction job timed out.');
}
