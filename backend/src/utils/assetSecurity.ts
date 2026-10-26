import crypto from 'crypto';

const TEST_ENV_FALLBACK = 'dineingo-test-deterministic-reconstruction-signing-secret-key-32chars!';

/**
 * Returns the dedicated signing secret for 3D model asset access tokens.
 * In production:
 * - Requires a dedicated, sufficiently strong server-only asset-signing secret (minimum 32 characters).
 * - Prioritizes ASSET_SIGNING_SECRET, then checks JWT_SECRET or SESSION_SECRET.
 * - Fails closed if missing or below minimum complexity; NEVER falls back to hardcoded defaults in production.
 * - Never logs or leaks the secret in error messages.
 * In test environment:
 * - Permits a deterministic fallback only inside explicitly isolated test environments (NODE_ENV === 'test').
 */
export function getAssetSigningSecret(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isExplicitTest = !isProduction && (
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test'
  );

  const rawCandidate = process.env.ASSET_SIGNING_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET;

  if (rawCandidate && typeof rawCandidate === 'string') {
    const trimmed = rawCandidate.trim();
    if (trimmed.length >= 32) {
      return trimmed;
    }
    // Candidate exists but is too weak (< 32 chars)
    if (isProduction) {
      throw new Error('Asset signing secret does not meet production complexity requirements (minimum 32 characters)');
    }
  }

  // In production, strictly fail closed: no fallback is permitted under any circumstances
  if (isProduction) {
    throw new Error('Dedicated asset signing secret is required in production environment');
  }

  // Permit deterministic fallback ONLY in explicitly isolated test environments
  if (isExplicitTest) {
    return TEST_ENV_FALLBACK;
  }

  // In non-production/development without any secret configured:
  throw new Error('Asset signing secret is not configured');
}

/**
 * Backward-compatible alias for getAssetSigningSecret
 */
export const getAssetSecret = getAssetSigningSecret;

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
 * Normalizes a storage key by stripping the supported DineInGo reconstruction prefix
 * (e.g. 'dineingo/reconstructions/filename.glb' -> 'filename.glb') and validates the resulting filename.
 * Returns the normalized safe filename, or null if the key is invalid or contains path traversal.
 */
export function normalizeStorageKey(storageKey: string | undefined | null): string | null {
  if (!storageKey || typeof storageKey !== 'string') return null;
  const stripped = storageKey.replace(/^\/?dineingo\/reconstructions\//, '');
  if (!isValidAssetFilename(stripped)) {
    return null;
  }
  return stripped;
}

/**
 * Signs an asset reference with an expiry timestamp and HMAC-SHA256 signature.
 * Allows temporary access for external 3D viewers (e.g., <model-viewer>, Android Scene Viewer, iOS QuickLook)
 * without making private user-generated models publicly enumerable.
 * Fails closed if signing secret is missing or invalid in production.
 */
export function signAssetUrl(
  filename: string,
  ttlSeconds: number = 86400 // Default 24 hours
): { signature: string; expires: number; signedQuery: string } {
  if (!isValidAssetFilename(filename)) {
    throw new Error('Invalid asset filename provided for URL signing');
  }
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const secret = getAssetSigningSecret();
  const payload = `${filename}:${expires}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const signedQuery = `sig=${signature}&exp=${expires}`;
  return { signature, expires, signedQuery };
}

/**
 * Verifies an asset signature against the filename, expiry timestamp, and secret.
 * Uses timing-safe equality comparison to prevent side-channel timing attacks.
 * Fails closed (returns false) if secret is missing or invalid, without leaking secrets.
 */
export function verifyAssetSignature(
  filename: string,
  expires: number,
  signature: string
): boolean {
  try {
    if (!filename || !expires || !signature) return false;
    if (!isValidAssetFilename(filename)) return false;

    // 1. Check expiration
    const currentEpoch = Math.floor(Date.now() / 1000);
    if (expires < currentEpoch) {
      return false; // Token expired
    }

    // 2. Recompute expected HMAC
    const secret = getAssetSigningSecret();
    const payload = `${filename}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // 3. Timing-safe comparison
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    // Fail closed if signing secret is missing or invalid, or malformed inputs
    return false;
  }
}
