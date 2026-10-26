import path from 'path';
import fs from 'fs';

/**
 * Single, deterministic configuration for 3D model reconstruction storage.
 * Resolves to the absolute path of `backend/storage/reconstructions` by default,
 * or the path specified by the `RECONSTRUCTION_STORAGE_DIR` environment variable.
 */
export const RECONSTRUCTION_STORAGE_DIR: string = process.env.RECONSTRUCTION_STORAGE_DIR
  ? path.resolve(process.env.RECONSTRUCTION_STORAGE_DIR)
  : path.resolve(__dirname, '../../storage/reconstructions');

/**
 * Ensures the target storage directory exists on the filesystem.
 */
export function ensureReconstructionStorageDir(): string {
  if (!fs.existsSync(RECONSTRUCTION_STORAGE_DIR)) {
    fs.mkdirSync(RECONSTRUCTION_STORAGE_DIR, { recursive: true });
  }
  return RECONSTRUCTION_STORAGE_DIR;
}

/**
 * Verifies whether the current hosting environment has a verified persistent disk mounted.
 * On container hosts (e.g., Render, Fly.io, Heroku, AWS ECS), ephemeral container filesystems
 * are wiped on restart unless an external volume or persistent disk is explicitly mounted.
 */
export function isPersistentDiskConfigured(): boolean {
  if (process.env.PERSISTENT_STORAGE_MOUNTED === 'true') {
    return true;
  }
  if (process.env.PERSISTENT_DISK_PATH && fs.existsSync(process.env.PERSISTENT_DISK_PATH)) {
    return true;
  }
  return false;
}
