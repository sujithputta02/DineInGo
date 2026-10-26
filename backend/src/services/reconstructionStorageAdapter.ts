import fs from 'fs';
import path from 'path';
import { RECONSTRUCTION_STORAGE_DIR, ensureReconstructionStorageDir, isPersistentDiskConfigured } from '../config/storageConfig';
import { generateSafeAssetKey, isValidAssetFilename, signAssetUrl } from '../utils/assetSecurity';

export interface StorageSaveResult {
  url: string;
  storageType: 'cloudinary' | 'local';
  storageKey: string;
  byteSize: number;
  isDurable: boolean;
}

export interface IReconstructionStorageAdapter {
  saveGLB(buffer: Buffer, requestedFilename?: string, isPublic?: boolean): Promise<StorageSaveResult>;
  getGLB(storageKey: string): Promise<Buffer | null>;
  isDurable(): boolean;
}

let cachedCloudinary: any = null;
async function getCloudinaryClient(): Promise<any> {
  if (cachedCloudinary) return cachedCloudinary;
  try {
    const mod = await import('cloudinary');
    const cl = (mod as any).v2 || (mod as any).default?.v2 || (mod as any).default;
    cl.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cachedCloudinary = cl;
    return cl;
  } catch (err: any) {
    throw new Error(`Cloudinary module is not available in the current environment: ${err.message}`);
  }
}

/**
 * Cloudinary Object Storage Adapter
 * Stores GLB models in cloud object storage as raw binaries.
 * Guarantees cross-restart and cross-deployment durability on serverless and ephemeral container platforms.
 */
export class CloudinaryStorageAdapter implements IReconstructionStorageAdapter {
  isDurable(): boolean {
    return true;
  }

  async saveGLB(buffer: Buffer, requestedFilename?: string, isPublic = false): Promise<StorageSaveResult> {
    const rawKey = requestedFilename && isValidAssetFilename(requestedFilename)
      ? requestedFilename.replace(/\.glb$/i, '')
      : generateSafeAssetKey().replace(/\.glb$/i, '');

    const publicId = `recon_${Date.now()}_${rawKey}`;
    const cl = await getCloudinaryClient();

    return new Promise<StorageSaveResult>((resolve, reject) => {
      const uploadStream = cl.uploader.upload_stream(
        {
          folder: 'dineingo/reconstructions',
          public_id: publicId,
          resource_type: 'raw',
          format: 'glb'
        },
        (error: any, result: any) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }

          resolve({
            url: result.secure_url,
            storageType: 'cloudinary',
            storageKey: `${publicId}.glb`,
            byteSize: result.bytes || buffer.length,
            isDurable: true
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async getGLB(storageKey: string): Promise<Buffer | null> {
    try {
      const cleanKey = storageKey.replace(/\.glb$/i, '');
      const cl = await getCloudinaryClient();
      const url = cl.url(`dineingo/reconstructions/${cleanKey}.glb`, { resource_type: 'raw' });
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
}

/**
 * Local Disk Storage Adapter
 * Writes to the single unified storage directory (RECONSTRUCTION_STORAGE_DIR).
 * Truthfully verifies whether persistent volume storage is mounted.
 */
export class LocalDiskStorageAdapter implements IReconstructionStorageAdapter {
  private persistent: boolean;

  constructor() {
    this.persistent = isPersistentDiskConfigured();
    if (!this.persistent && process.env.NODE_ENV === 'production') {
      console.warn(
        '[ReconstructionStorage] WARNING: Local storage adapter active without verified persistent disk mount. ' +
        'Stored 3D assets will NOT survive container restarts or redeployments. ' +
        'Configure CLOUDINARY credentials or mount a persistent volume with PERSISTENT_STORAGE_MOUNTED=true.'
      );
    }
  }

  isDurable(): boolean {
    return this.persistent;
  }

  async saveGLB(buffer: Buffer, requestedFilename?: string, isPublic = false): Promise<StorageSaveResult> {
    ensureReconstructionStorageDir();

    const filename = requestedFilename && isValidAssetFilename(requestedFilename)
      ? requestedFilename
      : generateSafeAssetKey();

    const targetPath = path.join(RECONSTRUCTION_STORAGE_DIR, filename);
    fs.writeFileSync(targetPath, buffer);

    let assetUrl = `/api/v1/reconstruction/assets/${filename}`;
    if (!isPublic) {
      const { signedQuery } = signAssetUrl(filename);
      assetUrl += `?${signedQuery}`;
    }

    return {
      url: assetUrl,
      storageType: 'local',
      storageKey: filename,
      byteSize: buffer.length,
      isDurable: this.persistent
    };
  }

  async getGLB(storageKey: string): Promise<Buffer | null> {
    if (!isValidAssetFilename(storageKey)) {
      return null;
    }
    const targetPath = path.join(RECONSTRUCTION_STORAGE_DIR, storageKey);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    return fs.readFileSync(targetPath);
  }
}

let activeAdapter: IReconstructionStorageAdapter | null = null;

/**
 * Returns the configured storage adapter.
 * Prefers persistent Cloudinary storage when configured, with safe local fallback.
 */
export function getReconstructionStorageAdapter(): IReconstructionStorageAdapter {
  if (activeAdapter) return activeAdapter;

  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (hasCloudinary && process.env.USE_LOCAL_STORAGE !== 'true') {
    activeAdapter = new CloudinaryStorageAdapter();
  } else {
    activeAdapter = new LocalDiskStorageAdapter();
  }

  return activeAdapter;
}

/**
 * For testing purposes: allows overriding the storage adapter.
 */
export function setReconstructionStorageAdapter(adapter: IReconstructionStorageAdapter | null) {
  activeAdapter = adapter;
}
