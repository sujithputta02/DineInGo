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
  deleteGLB(storageKey: string): Promise<boolean>;
  getDeliveryUrl(storageKey: string, isPublic?: boolean, ttlSeconds?: number): Promise<string> | string;
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
 * Enforces explicit public vs authenticated access control:
 * - Public catalog assets (isPublic = true) use delivery type 'upload' (accessible via CDN)
 * - Private user-generated assets (isPublic = false) use delivery type 'authenticated'
 *   and require cryptographic HMAC signatures for retrieval, preventing unauthorized enumeration.
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
    const fullPublicId = `dineingo/reconstructions/${publicId}.glb`;
    const cl = await getCloudinaryClient();

    return new Promise<StorageSaveResult>((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        folder: 'dineingo/reconstructions',
        public_id: `${publicId}.glb`,
        resource_type: 'raw',
        type: isPublic ? 'upload' : 'authenticated',
        access_mode: isPublic ? 'public' : 'authenticated'
      };

      const uploadStream = cl.uploader.upload_stream(
        uploadOptions,
        (error: any, result: any) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }

          const actualPublicId = result.public_id || fullPublicId;
          const deliveryUrl = isPublic
            ? (result.secure_url || cl.url(actualPublicId, {
                resource_type: 'raw',
                type: 'upload',
                secure: true
              }))
            : cl.url(actualPublicId, {
                resource_type: 'raw',
                type: 'authenticated',
                sign_url: true,
                secure: true
              });

          resolve({
            url: deliveryUrl,
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
      const cleanKey = storageKey
        .replace(/^dineingo\/reconstructions\//, '')
        .replace(/\.glb$/i, '');
      const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
      const cl = await getCloudinaryClient();

      // Attempt 1: Fetch using authenticated signed URL (for private user assets)
      const signedUrl = cl.url(fullPublicId, {
        resource_type: 'raw',
        type: 'authenticated',
        sign_url: true,
        secure: true
      });
      let res = await fetch(signedUrl);

      // Attempt 2: If rejected, fallback to public upload delivery URL (for public catalog assets)
      if (!res.ok) {
        const publicUrl = cl.url(fullPublicId, {
          resource_type: 'raw',
          type: 'upload',
          secure: true
        });
        res = await fetch(publicUrl);
      }

      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async deleteGLB(storageKey: string): Promise<boolean> {
    try {
      const cleanKey = storageKey
        .replace(/^dineingo\/reconstructions\//, '')
        .replace(/\.glb$/i, '');
      const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
      const cl = await getCloudinaryClient();

      const authRes = await cl.uploader.destroy(fullPublicId, {
        resource_type: 'raw',
        type: 'authenticated'
      });
      if (authRes && authRes.result === 'ok') {
        return true;
      }

      const pubRes = await cl.uploader.destroy(fullPublicId, {
        resource_type: 'raw',
        type: 'upload'
      });
      return Boolean(pubRes && pubRes.result === 'ok');
    } catch {
      return false;
    }
  }

  async getDeliveryUrl(storageKey: string, isPublic = false, ttlSeconds = 86400): Promise<string> {
    const cleanKey = storageKey
      .replace(/^dineingo\/reconstructions\//, '')
      .replace(/\.glb$/i, '');
    const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
    const cl = await getCloudinaryClient();

    if (isPublic) {
      return cl.url(fullPublicId, {
        resource_type: 'raw',
        type: 'upload',
        secure: true
      });
    }

    const options: Record<string, any> = {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true
    };

    if (process.env.CLOUDINARY_AUTH_TOKEN_KEY) {
      options.auth_token = {
        key: process.env.CLOUDINARY_AUTH_TOKEN_KEY,
        duration: ttlSeconds
      };
    }

    return cl.url(fullPublicId, options);
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

    const assetUrl = this.getDeliveryUrl(filename, isPublic);

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

  async deleteGLB(storageKey: string): Promise<boolean> {
    if (!isValidAssetFilename(storageKey)) {
      return false;
    }
    const targetPath = path.join(RECONSTRUCTION_STORAGE_DIR, storageKey);
    if (!fs.existsSync(targetPath)) {
      return false;
    }
    try {
      fs.unlinkSync(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  getDeliveryUrl(storageKey: string, isPublic = false, ttlSeconds = 86400): string {
    let assetUrl = `/api/v1/reconstruction/assets/${storageKey}`;
    if (!isPublic) {
      const { signedQuery } = signAssetUrl(storageKey, ttlSeconds);
      assetUrl += `?${signedQuery}`;
    }
    return assetUrl;
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
