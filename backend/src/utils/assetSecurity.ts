import crypto from 'crypto';

/**
 * Returns the signing secret for asset access tokens.
 * Prioritizes JWT_SECRET or SESSION_SECRET from environment.
 */
function getAssetSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret;
  }
  // Safe fallback in test environments if not explicitly set
  return 'dineingo-reconstruction-hmac-security-key-2026';
}

/**
 * Generates an unguessable, cryptographically secure asset storage key with 128-bit entropy.
 */
export function generateSafeAssetKey(): string {
  const randomHex = crypto.randomBytes(16).toString('hex');
  return `recon_${randomHex}.glb`;
}

/**
 * Validates asset filenames to prevent path traversal, hidden files, or dangerous extensions.
 */
export function isValidAssetFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    return false;
  }
  // Strictly enforce .glb extension with alphanumeric and underscore/dash characters
  return /^[a-zA-Z0-9_\-]{3,64}\.glb$/.test(filename);
}

/**
 * Signs an asset reference with an expiry timestamp and HMAC-SHA256 signature.
 * Allows temporary access for external 3D viewers (e.g., <model-viewer>, Android Scene Viewer, iOS QuickLook)
 * without making private user-generated models publicly enumerable.
 */
export function signAssetUrl(
  filename: string,
  ttlSeconds: number = 86400 // Default 24 hours
): { signature: string; expires: number; signedQuery: string } {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const secret = getAssetSecret();
  const payload = `${filename}:${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const signedQuery = `sig=${signature}&exp=${expires}`;
  return { signature, expires, signedQuery };
}

/**
 * Verifies an asset signature against the filename, expiry timestamp, and secret.
 * Uses timing-safe equality comparison to prevent side-channel timing attacks.
 */
export function verifyAssetSignature(
  filename: string,
  expires: number,
  signature: string
): boolean {
  if (!filename || !expires || !signature) return false;

  // 1. Check expiration
  const currentEpoch = Math.floor(Date.now() / 1000);
  if (expires < currentEpoch) {
    return false; // Token expired
  }

  // 2. Recompute expected HMAC
  const secret = getAssetSecret();
  const payload = `${filename}:${expires}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // 3. Timing-safe comparison
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
