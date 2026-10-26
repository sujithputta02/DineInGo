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
  getGLB(storageKey: string, isPublic?: boolean): Promise<Buffer | null>;
  deleteGLB(storageKey: string, isPublic?: boolean): Promise<boolean>;
  publishGLB?(storageKey: string): Promise<StorageSaveResult | null>;
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
 *   with genuine time-limiting (via auth_token or DineInGo backend proxy with HMAC expiry).
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
        async (error: any, result: any) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }

          const actualPublicId = result.public_id || fullPublicId;
          const deliveryUrl = await this.getDeliveryUrl(actualPublicId, isPublic);

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

  async getGLB(storageKey: string, isPublic = false): Promise<Buffer | null> {
    try {
      const cleanKey = storageKey
        .replace(/^dineingo\/reconstructions\//, '')
        .replace(/\.glb$/i, '');
      const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
      const cl = await getCloudinaryClient();

      if (isPublic) {
        const publicUrl = cl.url(fullPublicId, {
          resource_type: 'raw',
          type: 'upload',
          secure: true
        });
        const res = await fetch(publicUrl);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      }

      // Private asset retrieval: strictly use authenticated signed URL.
      // Under NO circumstances fall back to public upload delivery when authenticated retrieval fails.
      const signedUrl = cl.url(fullPublicId, {
        resource_type: 'raw',
        type: 'authenticated',
        sign_url: true,
        secure: true
      });
      const res = await fetch(signedUrl);
      if (!res.ok) {
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  async deleteGLB(storageKey: string, isPublic?: boolean): Promise<boolean> {
    try {
      const cleanKey = storageKey
        .replace(/^dineingo\/reconstructions\//, '')
        .replace(/\.glb$/i, '');
      const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
      const cl = await getCloudinaryClient();

      if (isPublic === true) {
        const pubRes = await cl.uploader.destroy(fullPublicId, {
          resource_type: 'raw',
          type: 'upload'
        });
        return Boolean(pubRes && pubRes.result === 'ok');
      }

      if (isPublic === false) {
        const authRes = await cl.uploader.destroy(fullPublicId, {
          resource_type: 'raw',
          type: 'authenticated'
        });
        return Boolean(authRes && authRes.result === 'ok');
      }

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

  /**
   * Migrates a private authenticated asset to public CDN delivery when published to the catalog.
   */
  async publishGLB(storageKey: string): Promise<StorageSaveResult | null> {
    try {
      const cleanKey = storageKey
        .replace(/^dineingo\/reconstructions\//, '')
        .replace(/\.glb$/i, '');
      const fullPublicId = `dineingo/reconstructions/${cleanKey}.glb`;
      const cl = await getCloudinaryClient();

      // 1. Fetch existing private asset using authenticated credentials
      const buffer = await this.getGLB(storageKey, false);
      if (!buffer) {
        return null;
      }

      // 2. Re-upload as public upload delivery type to allow standard CDN delivery
      const result: any = await new Promise((resolve, reject) => {
        const uploadStream = cl.uploader.upload_stream(
          {
            folder: 'dineingo/reconstructions',
            public_id: `${cleanKey}.glb`,
            resource_type: 'raw',
            type: 'upload',
            access_mode: 'public',
            overwrite: true
          },
          (error: any, uploadResult: any) => {
            if (error || !uploadResult) {
              return reject(error || new Error('Publish upload failed'));
            }
            resolve(uploadResult);
          }
        );
        uploadStream.end(buffer);
      });

      // 3. Remove old private authenticated copy
      await cl.uploader.destroy(fullPublicId, {
        resource_type: 'raw',
        type: 'authenticated'
      }).catch(() => {});

      const deliveryUrl = result.secure_url || cl.url(result.public_id || fullPublicId, {
        resource_type: 'raw',
        type: 'upload',
        secure: true
      });

      return {
        url: deliveryUrl,
        storageType: 'cloudinary',
        storageKey: `${cleanKey}.glb`,
        byteSize: result.bytes || buffer.length,
        isDurable: true
      };
    } catch {
      return null;
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

    // 1. If CLOUDINARY_AUTH_TOKEN_KEY is configured, generate direct token-expiring URLs
    //    which Cloudinary CDN enforces at the edge: ?__cld_token__=exp=...~hmac=...
    if (process.env.CLOUDINARY_AUTH_TOKEN_KEY) {
      return cl.url(fullPublicId, {
        resource_type: 'raw',
        type: 'authenticated',
        sign_url: true,
        secure: true,
        auth_token: {
          key: process.env.CLOUDINARY_AUTH_TOKEN_KEY,
          duration: ttlSeconds
        }
      });
    }

    // 2. If CLOUDINARY_AUTH_TOKEN_KEY is not configured:
    // Cloudinary sign_url: true alone only signs the path with s--...-- without timestamp expiration.
    // To ensure genuine cryptographic time-limiting without leaking secrets, route through
    // DineInGo's backend-proxied HMAC-signed URL with cryptographic expiry:
    // /api/v1/reconstruction/assets/${filename}?sig=...&exp=...
    const filename = `${cleanKey}.glb`;
    const { signedQuery } = signAssetUrl(filename, ttlSeconds);
    return `/api/v1/reconstruction/assets/${filename}?${signedQuery}`;
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

  async publishGLB(storageKey: string): Promise<StorageSaveResult | null> {
    if (!isValidAssetFilename(storageKey)) {
      return null;
    }
    const targetPath = path.join(RECONSTRUCTION_STORAGE_DIR, storageKey);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    const stat = fs.statSync(targetPath);
    const publicUrl = this.getDeliveryUrl(storageKey, true);
    return {
      url: publicUrl,
      storageType: 'local',
      storageKey,
      byteSize: stat.size,
      isDurable: this.persistent
    };
  }

  async getGLB(storageKey: string, isPublic?: boolean): Promise<Buffer | null> {
    if (!isValidAssetFilename(storageKey)) {
      return null;
    }
    const targetPath = path.join(RECONSTRUCTION_STORAGE_DIR, storageKey);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    return fs.readFileSync(targetPath);
  }

  async deleteGLB(storageKey: string, isPublic?: boolean): Promise<boolean> {
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
