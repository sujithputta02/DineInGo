import { auth } from '../firebase';

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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('[ReconstructionClient] Could not get auth token:', err);
  }
  return headers;
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
      activeProvider: data.activeProvider || 'hf-triposr'
    };
  } catch {
    return {
      providers: [
        {
          id: 'hf-triposr',
          name: 'DineInGo ZeroGPU TripoSR (Hugging Face)',
          configured: true,
          requiresKey: 'HF_TOKEN',
          description: 'Generates real 3D food models from photographs using open-weight TripoSR (MIT License).'
        },
        {
          id: 'illustrative-calibrated',
          name: 'Calibrated Illustrative Service (Built-in)',
          configured: true,
          requiresKey: 'None',
          description: 'Provides calibrated representative tableware models for known culinary items.'
        }
      ],
      activeProvider: 'hf-triposr'
    };
  }
}

/**
 * Submit an image-to-3D reconstruction job with authenticated user token
 */
export async function submitFoodReconstructionJob(params: {
  userId?: string;
  dishName: string;
  imageUrl?: string;
  referencePlateDiameterMeters?: number;
}): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/v1/reconstruction/jobs', {
    method: 'POST',
    headers,
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
 * Poll job status until completion or failure with verified ownership token
 */
export async function pollReconstructionJob(
  jobId: string,
  onProgress?: (progress: number, status: ReconstructionJobStatus) => void,
  maxAttempts: number = 40
): Promise<ReconstructionJobResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/v1/reconstruction/jobs/${encodeURIComponent(jobId)}`, {
      headers
    });

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

