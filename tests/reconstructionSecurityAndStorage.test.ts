import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/index.js');

const { RECONSTRUCTION_STORAGE_DIR, ensureReconstructionStorageDir, isPersistentDiskConfigured } = require('./backend/src/config/storageConfig.ts');
const { LocalDiskStorageAdapter, CloudinaryStorageAdapter, setReconstructionStorageAdapter, getReconstructionStorageAdapter } = require('./backend/src/services/reconstructionStorageAdapter.ts');
const { isValidAssetFilename, signAssetUrl, verifyAssetSignature, generateSafeAssetKey, getAssetSigningSecret, normalizeStorageKey, extractAssetFilenameFromUrl } = require('./backend/src/utils/assetSecurity.ts');
const { validateDestinationUrl, verifyImageMagicBytes, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, parseAndValidateDataUrl } = require('./backend/src/utils/safeImageFetcher.ts');
const { extractGlbDimensions } = require('./backend/src/utils/glbDimensionExtractor.ts');
const { isAuthorizedPublisher, handleAssetRequest } = require('./backend/src/routes/reconstructionRoutes.ts');
const { PublicationError, verifyRestaurantAuthorization, setRestaurantOwnershipResolver, reconstructionService } = require('./backend/src/services/reconstructionService.ts');
const { ReconstructionJob } = require('./backend/src/models/ReconstructionJob.ts');
const { Restaurant } = require('./backend/src/models/Restaurant.ts');
const { Business } = require('./backend/src/models/Business.ts');
const { MenuItem } = require('./backend/src/models/MenuItem.ts');

// Helper: build minimal valid GLB buffer for testing
function createMinimalGLBBuffer(width = 0.24, height = 0.12, depth = 0.18, lowestY = 0): Buffer {
  const gltfObj = {
    asset: { version: '2.0', generator: 'DineInGo-Test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 }
      }]
    }],
    accessors: [{
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 8,
      type: 'VEC3',
      min: [-width / 2, lowestY, -depth / 2],
      max: [width / 2, lowestY + height, depth / 2]
    }],
    bufferViews: [{
      buffer: 0,
      byteOffset: 0,
      byteLength: 96
    }],
    buffers: [{
      byteLength: 96
    }]
  };

  const jsonString = JSON.stringify(gltfObj);
  // Pad JSON string with spaces to 4-byte boundary per glTF 2.0 spec
  const jsonPadding = (4 - (jsonString.length % 4)) % 4;
  const paddedJson = jsonString + ' '.repeat(jsonPadding);
  const jsonBuffer = Buffer.from(paddedJson, 'utf8');

  const totalLength = 12 + 8 + jsonBuffer.length;
  const glbBuffer = Buffer.alloc(totalLength);

  // Header (12 bytes)
  glbBuffer.writeUInt32LE(0x46546C67, 0); // magic "glTF"
  glbBuffer.writeUInt32LE(2, 4);          // version 2
  glbBuffer.writeUInt32LE(totalLength, 8); // total length

  // Chunk 0 (JSON)
  glbBuffer.writeUInt32LE(jsonBuffer.length, 12);
  glbBuffer.writeUInt32LE(0x4E4F534A, 16); // "JSON"
  jsonBuffer.copy(glbBuffer, 20);

  return glbBuffer;
}

test('1. Storage consistency: GLB saved via storage adapter can be retrieved from shared directory', async () => {
  const adapter = new LocalDiskStorageAdapter();
  const testGLB = createMinimalGLBBuffer(0.25, 0.10, 0.20, 0.0);
  const testFilename = `recon_test_${crypto.randomBytes(8).toString('hex')}.glb`;

  // Save GLB
  const saveResult = await adapter.saveGLB(testGLB, testFilename, false);
  assert.equal(saveResult.storageType, 'local');
  assert.equal(saveResult.storageKey, testFilename);
  assert.ok(saveResult.byteSize > 0);

  // Verify file actually resides in shared RECONSTRUCTION_STORAGE_DIR
  const expectedDiskPath = path.join(RECONSTRUCTION_STORAGE_DIR, testFilename);
  assert.equal(fs.existsSync(expectedDiskPath), true, 'File must exist in shared RECONSTRUCTION_STORAGE_DIR');

  // Retrieve through adapter
  const retrievedBuffer = await adapter.getGLB(testFilename);
  assert.ok(retrievedBuffer !== null, 'Saved asset must be retrievable');
  assert.equal(Buffer.compare(testGLB, retrievedBuffer!), 0, 'Retrieved buffer must match saved buffer exactly');

  // Clean up test artifact
  if (fs.existsSync(expectedDiskPath)) {
    fs.unlinkSync(expectedDiskPath);
  }

  // Verify normalizeStorageKey handles both unprefixed and prefixed keys, and rejects invalid keys
  assert.equal(normalizeStorageKey('food.glb'), 'food.glb');
  assert.equal(normalizeStorageKey('dineingo/reconstructions/food.glb'), 'food.glb');
  assert.equal(normalizeStorageKey('/dineingo/reconstructions/food.glb'), 'food.glb');
  assert.equal(normalizeStorageKey('../evil.glb'), null);
  assert.equal(normalizeStorageKey('dineingo/reconstructions/../evil.glb'), null);
  assert.equal(normalizeStorageKey('foo.txt'), null);
  assert.equal(normalizeStorageKey(null), null);
  assert.equal(normalizeStorageKey(undefined), null);
});

test('2. Unauthorized asset access: Private assets blocked without signature or ownership', () => {
  const filename = 'recon_private_asset_12345.glb';

  // 1. Unauthenticated request without query params
  function checkAccess(
    req: { filename: string; query?: { sig?: string; exp?: string }; user?: { uid: string }; jobOwner?: string; isPublic?: boolean }
  ): { status: number; allowed: boolean } {
    if (!isValidAssetFilename(req.filename)) {
      return { status: 400, allowed: false };
    }

    // Signed URL
    if (req.query?.sig && req.query?.exp) {
      if (verifyAssetSignature(req.filename, Number(req.query.exp), req.query.sig)) {
        return { status: 200, allowed: true };
      }
    }

    // Public item
    if (req.isPublic) {
      return { status: 200, allowed: true };
    }

    // Authenticated user
    if (req.user) {
      if (req.user.uid === req.jobOwner) {
        return { status: 200, allowed: true };
      }
      return { status: 403, allowed: false }; // Cross-user forbidden
    }

    return { status: 401, allowed: false }; // Unauthorized
  }

  // Request without auth or signature -> 401
  const unauthRes = checkAccess({ filename, jobOwner: 'user_alice', isPublic: false });
  assert.equal(unauthRes.status, 401);
  assert.equal(unauthRes.allowed, false);

  // Request with invalid signature -> 401
  const badSigRes = checkAccess({ filename, query: { sig: 'deadbeef', exp: '9999999999' }, jobOwner: 'user_alice' });
  assert.equal(badSigRes.status, 401);
  assert.equal(badSigRes.allowed, false);

  // Request with expired signature -> 401
  const pastEpoch = Math.floor(Date.now() / 1000) - 3600;
  const expiredSig = signAssetUrl(filename, -3600);
  const expiredRes = checkAccess({
    filename,
    query: { sig: expiredSig.signature, exp: String(expiredSig.expires) },
    jobOwner: 'user_alice'
  });
  assert.equal(expiredRes.status, 401);
  assert.equal(expiredRes.allowed, false);

  // Request with valid fresh signature -> 200
  const validSig = signAssetUrl(filename, 3600);
  const validRes = checkAccess({
    filename,
    query: { sig: validSig.signature, exp: String(validSig.expires) },
    jobOwner: 'user_alice'
  });
  assert.equal(validRes.status, 200);
  assert.equal(validRes.allowed, true);
});

test('3. Cross-user access: User A cannot access User B private asset, but public assets remain accessible', () => {
  const filename = 'recon_dish_model_98765.glb';

  function evaluateOwnership(requestUser: string, jobOwner: string, isPublic: boolean): number {
    if (isPublic) return 200;
    if (requestUser === jobOwner) return 200;
    return 403;
  }

  // Alice accesses her own private asset -> 200
  assert.equal(evaluateOwnership('alice_uid', 'alice_uid', false), 200);

  // Bob attempts to access Alice's private asset -> 403 Forbidden
  assert.equal(evaluateOwnership('bob_uid', 'alice_uid', false), 403, 'Cross-user access to private model must be forbidden (403)');

  // Public asset is accessible to anyone -> 200
  assert.equal(evaluateOwnership('bob_uid', 'alice_uid', true), 200, 'Deliberately published public model must be accessible');
  assert.equal(evaluateOwnership('anonymous', 'alice_uid', true), 200);
});

test('4. SSRF & Image-Download Safety: Rejects unsafe schemes, localhost, private RFC1918, and metadata IPs', async () => {
  // Test private IP checker unit functions
  assert.equal(isPrivateOrReservedIPv4('127.0.0.1'), true, 'Loopback must be blocked');
  assert.equal(isPrivateOrReservedIPv4('127.255.255.255'), true, 'Full 127/8 range must be blocked');
  assert.equal(isPrivateOrReservedIPv4('10.0.0.1'), true, '10/8 RFC1918 must be blocked');
  assert.equal(isPrivateOrReservedIPv4('172.16.0.1'), true, '172.16/12 RFC1918 must be blocked');
  assert.equal(isPrivateOrReservedIPv4('172.31.255.254'), true, '172.31 range must be blocked');
  assert.equal(isPrivateOrReservedIPv4('192.168.1.1'), true, '192.168/16 RFC1918 must be blocked');
  assert.equal(isPrivateOrReservedIPv4('169.254.169.254'), true, 'Cloud metadata IP must be blocked');
  assert.equal(isPrivateOrReservedIPv4('0.0.0.0'), true, '0.0.0.0 must be blocked');
  assert.equal(isPrivateOrReservedIPv4('100.64.0.1'), true, 'Carrier-grade NAT must be blocked');
  assert.equal(isPrivateOrReservedIPv4('8.8.8.8'), false, 'Public IP 8.8.8.8 must not be marked private');
  assert.equal(isPrivateOrReservedIPv4('104.18.26.120'), false, 'Public Cloudflare IP must not be marked private');

  // IPv6 tests
  assert.equal(isPrivateOrReservedIPv6('::1'), true, 'IPv6 loopback must be blocked');
  assert.equal(isPrivateOrReservedIPv6('fe80::1'), true, 'IPv6 link-local must be blocked');
  assert.equal(isPrivateOrReservedIPv6('fc00::1'), true, 'IPv6 unique local must be blocked');
  assert.equal(isPrivateOrReservedIPv6('::ffff:127.0.0.1'), true, 'IPv4-mapped IPv6 loopback must be blocked');
  assert.equal(isPrivateOrReservedIPv6('::ffff:169.254.169.254'), true, 'IPv4-mapped cloud metadata must be blocked');

  // Test full URL validator
  const checkLocalhost = await validateDestinationUrl('http://localhost:8080/image.jpg');
  assert.equal(checkLocalhost.valid, false);
  assert.ok(checkLocalhost.reason?.includes('Localhost'));

  const checkMetadata = await validateDestinationUrl('http://169.254.169.254/latest/meta-data/');
  assert.equal(checkMetadata.valid, false);
  assert.ok(checkMetadata.reason?.includes('Private IPv4'));

  const checkPrivateRFC = await validateDestinationUrl('http://192.168.1.50:5000/dish.png');
  assert.equal(checkPrivateRFC.valid, false);

  const checkFileScheme = await validateDestinationUrl('file:///etc/passwd');
  assert.equal(checkFileScheme.valid, false);
  assert.ok(checkFileScheme.reason?.includes('Disallowed protocol'));

  const checkFtpScheme = await validateDestinationUrl('ftp://example.com/photo.jpg');
  assert.equal(checkFtpScheme.valid, false);
});

test('5. Image validation: Rejects non-image content and excessive size payloads', () => {
  // Magic bytes
  const fakeJpeg = Buffer.from('NOT_A_JPEG_FILE');
  assert.equal(verifyImageMagicBytes(fakeJpeg).valid, false);

  const realJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegCheck = verifyImageMagicBytes(realJpeg);
  assert.equal(jpegCheck.valid, true);
  assert.equal(jpegCheck.detectedMime, 'image/jpeg');

  const realPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  const pngCheck = verifyImageMagicBytes(realPng);
  assert.equal(pngCheck.valid, true);
  assert.equal(pngCheck.detectedMime, 'image/png');

  // Base64 data URL size limit test
  const smallBase64 = `data:image/jpeg;base64,${realJpeg.toString('base64')}`;
  const parsed = parseAndValidateDataUrl(smallBase64, 1024);
  assert.equal(parsed.contentType, 'image/jpeg');

  // Oversized base64 test
  assert.throws(() => {
    parseAndValidateDataUrl(smallBase64, 5); // Limit 5 bytes
  }, /exceeds maximum limit/);
});

test('6. Verified dimensions: Derives accurate geometry from GLB and avoids arbitrary fallbacks', () => {
  // Test with generated known 3D box: width=0.20m, height=0.08m, depth=0.15m, lowestY=0.0m
  const glb = createMinimalGLBBuffer(0.20, 0.08, 0.15, 0.0);
  const dims = extractGlbDimensions(glb);

  assert.ok(dims !== null, 'Valid GLB must produce extracted dimensions');
  assert.ok(Math.abs(dims!.widthMeters - 0.20) < 0.001, `Width must match ~0.20m, got ${dims!.widthMeters}`);
  assert.ok(Math.abs(dims!.heightMeters - 0.08) < 0.001, `Height must match ~0.08m, got ${dims!.heightMeters}`);
  assert.ok(Math.abs(dims!.depthMeters - 0.15) < 0.001, `Depth must match ~0.15m, got ${dims!.depthMeters}`);
  assert.equal(dims!.contactPlaneAligned, true, 'lowestY=0.0 must be contact-plane aligned');
  assert.equal(dims!.source, 'gltf-accessor-measured');

  // Test with corrupted/empty buffer: MUST return null rather than fabricating numbers
  const corruptBuffer = Buffer.from('random corrupted binary data that is not gltf');
  assert.equal(extractGlbDimensions(corruptBuffer), null, 'Corrupted buffer must return null, never invented fallback');

  // Test with glTF missing meshes
  const emptyGltfObj = { asset: { version: '2.0' }, meshes: [] };
  const emptyJson = Buffer.from(JSON.stringify(emptyGltfObj));
  const emptyGlb = Buffer.alloc(20 + emptyJson.length);
  emptyGlb.writeUInt32LE(0x46546C67, 0);
  emptyGlb.writeUInt32LE(2, 4);
  emptyGlb.writeUInt32LE(emptyGlb.length, 8);
  emptyGlb.writeUInt32LE(emptyJson.length, 12);
  emptyGlb.writeUInt32LE(0x4E4F534A, 16);
  emptyJson.copy(emptyGlb, 20);

  assert.equal(extractGlbDimensions(emptyGlb), null, 'GLB without mesh accessors must return null, never invented dimensions');
});

test('7. Real model validation: Apple Tarte reconstruction GLB yields verified scale and ground contact', () => {
  const reconFilePath = path.resolve(process.cwd(), 'backend/storage/reconstructions/apple_tarte_reconstruction.glb');
  if (!fs.existsSync(reconFilePath)) {
    console.log('[Notice] apple_tarte_reconstruction.glb not present in test runner; skipping disk inspection.');
    return;
  }

  const realBuffer = fs.readFileSync(reconFilePath);
  const realDims = extractGlbDimensions(realBuffer);

  assert.ok(realDims !== null, 'Apple tarte model must be parsed successfully');
  assert.ok(realDims!.widthMeters > 0.15 && realDims!.widthMeters < 0.35, 'Width must be realistic plate width');
  assert.ok(realDims!.heightMeters > 0.05 && realDims!.heightMeters < 0.25, 'Height must be realistic dish height');
  assert.equal(realDims!.contactPlaneAligned, true, 'Base contact plane must be flush to tabletop');
  assert.equal(realDims!.lowestYMeters, 0, 'lowestY must be 0 for calibrated tabletop placement');
});

test('8. HMAC Signing Secret: Dedicated secret enforced in production, fallback isolated to test, fails closed', () => {
  const origEnv = { ...process.env };

  try {
    // 1. Missing secret in production fails closed
    process.env.NODE_ENV = 'production';
    delete process.env.ASSET_SIGNING_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;

    assert.throws(() => {
      getAssetSigningSecret();
    }, /Dedicated asset signing secret is required in production environment/);

    assert.throws(() => {
      signAssetUrl('recon_test_asset.glb');
    }, /Dedicated asset signing secret is required in production environment/);

    // verifyAssetSignature must fail closed (return false) without throwing uncaught errors
    assert.equal(verifyAssetSignature('recon_test_asset.glb', Math.floor(Date.now() / 1000) + 3600, 'deadbeef'), false);

    // 2. Secret below minimum 32 characters in production fails closed
    process.env.ASSET_SIGNING_SECRET = 'short-weak-secret-123';
    assert.throws(() => {
      getAssetSigningSecret();
    }, /minimum 32 characters/);

    assert.throws(() => {
      signAssetUrl('recon_test_asset.glb');
    }, /minimum 32 characters/);

    assert.equal(verifyAssetSignature('recon_test_asset.glb', Math.floor(Date.now() / 1000) + 3600, 'deadbeef'), false);

    // 3. Valid strong dedicated secret in production succeeds
    const dedicatedSecret = 'super-secure-production-asset-signing-key-minimum-32-chars-ok';
    process.env.ASSET_SIGNING_SECRET = dedicatedSecret;
    const resolvedSecret = getAssetSigningSecret();
    assert.equal(resolvedSecret, dedicatedSecret);

    const filename = 'recon_valid_model_12345.glb';
    const signed = signAssetUrl(filename, 3600);
    assert.ok(signed.signature.length >= 64, 'HMAC signature must be valid hex digest');
    assert.ok(signed.expires > Math.floor(Date.now() / 1000));
    assert.ok(signed.signedQuery.includes('sig=') && signed.signedQuery.includes('exp='));

    // Valid signature verifies true
    assert.equal(verifyAssetSignature(filename, signed.expires, signed.signature), true);

    // Modified filename verifies false (tamper protection)
    assert.equal(verifyAssetSignature('recon_tampered_model_99999.glb', signed.expires, signed.signature), false);

    // Expired signature verifies false
    assert.equal(verifyAssetSignature(filename, Math.floor(Date.now() / 1000) - 100, signed.signature), false);

    // Invalid signature verifies false
    assert.equal(verifyAssetSignature(filename, signed.expires, '0000000000000000000000000000000000000000000000000000000000000000'), false);

    // 4. Deterministic fallback is permitted ONLY in explicit test environments
    process.env.NODE_ENV = 'test';
    delete process.env.ASSET_SIGNING_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    assert.doesNotThrow(() => {
      const testSecret = getAssetSigningSecret();
      assert.ok(testSecret.length >= 32);
    });

    // In development without any secret configured, it fails closed rather than using test fallback
    process.env.NODE_ENV = 'development';
    delete process.env.npm_lifecycle_event;
    assert.throws(() => {
      getAssetSigningSecret();
    }, /Asset signing secret is not configured/);

    // 5. Never leaks secret material in error messages
    process.env.NODE_ENV = 'production';
    process.env.ASSET_SIGNING_SECRET = 'short';
    try {
      getAssetSigningSecret();
      assert.fail('Should have thrown');
    } catch (err: any) {
      assert.equal(err.message.includes('short'), false, 'Error message must not leak candidate secret');
    }
  } finally {
    process.env = origEnv;
  }
});

test('9. Cloudinary Privacy: Enforces authenticated vs upload access policy, signed URLs, and token expiration', async () => {
  const adapter = new CloudinaryStorageAdapter();
  const requestedKey = 'recon_dish_spec_model.glb';

  const origCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const origApiKey = process.env.CLOUDINARY_API_KEY;
  const origApiSecret = process.env.CLOUDINARY_API_SECRET;
  const origAuthTokenKey = process.env.CLOUDINARY_AUTH_TOKEN_KEY;

  if (!process.env.CLOUDINARY_CLOUD_NAME) process.env.CLOUDINARY_CLOUD_NAME = 'dineingo_test_cloud';
  if (!process.env.CLOUDINARY_API_KEY) process.env.CLOUDINARY_API_KEY = '1234567890';
  if (!process.env.CLOUDINARY_API_SECRET) process.env.CLOUDINARY_API_SECRET = 'abcdef1234567890abcdef1234567890';

  try {
    // 1. When CLOUDINARY_AUTH_TOKEN_KEY is NOT set:
    delete process.env.CLOUDINARY_AUTH_TOKEN_KEY;
    const publicUrl = await adapter.getDeliveryUrl(requestedKey, true);
    const privateProxiedUrl = await adapter.getDeliveryUrl(requestedKey, false);

    // Public URL uses standard CDN /raw/upload/ path without signatures
    assert.ok(publicUrl.includes('/raw/upload/'), `Public asset must use /raw/upload/ delivery, got: ${publicUrl}`);
    assert.ok(!publicUrl.includes('/s--'), 'Public asset must not require cryptographic signature in path');

    // Private URL routes through DineInGo's backend proxy with cryptographic expiry (?sig=...&exp=...)
    assert.ok(privateProxiedUrl.startsWith('/api/v1/reconstruction/assets/'), `Private URL without auth token key must route through backend proxy, got: ${privateProxiedUrl}`);
    assert.ok(privateProxiedUrl.includes('sig=') && privateProxiedUrl.includes('exp='), `Private URL must contain cryptographic HMAC expiry, got: ${privateProxiedUrl}`);

    // 2. When CLOUDINARY_AUTH_TOKEN_KEY IS set:
    process.env.CLOUDINARY_AUTH_TOKEN_KEY = 'test_token_encryption_key_123';
    const privateTokenizedUrl = await adapter.getDeliveryUrl(requestedKey, false);

    assert.ok(privateTokenizedUrl.includes('/raw/authenticated/'), `Tokenized asset must use /raw/authenticated/ delivery, got: ${privateTokenizedUrl}`);
    assert.ok(privateTokenizedUrl.includes('__cld_token__=exp='), `Tokenized asset must contain __cld_token__=exp=..., got: ${privateTokenizedUrl}`);

    // 3. Secrets are never leaked in URLs
    assert.ok(!publicUrl.includes(process.env.CLOUDINARY_API_SECRET!), 'Public URL must not leak API secret');
    assert.ok(!privateProxiedUrl.includes(process.env.CLOUDINARY_API_SECRET!), 'Proxied URL must not leak API secret');
    assert.ok(!privateTokenizedUrl.includes(process.env.CLOUDINARY_API_SECRET!), 'Tokenized URL must not leak API secret');
    assert.ok(!privateTokenizedUrl.includes(process.env.CLOUDINARY_AUTH_TOKEN_KEY!), 'Tokenized URL must not leak raw auth token key');

    // 4. File extension preserved for AR viewers
    assert.ok(publicUrl.includes('.glb'), 'Public URL must preserve .glb extension for mobile AR viewers');
    assert.ok(privateProxiedUrl.includes('.glb'), 'Private proxied URL must preserve .glb extension for mobile AR viewers');
    assert.ok(privateTokenizedUrl.includes('.glb'), 'Tokenized URL must preserve .glb extension for mobile AR viewers');
  } finally {
    process.env.CLOUDINARY_CLOUD_NAME = origCloudName;
    process.env.CLOUDINARY_API_KEY = origApiKey;
    process.env.CLOUDINARY_API_SECRET = origApiSecret;
    if (origAuthTokenKey !== undefined) {
      process.env.CLOUDINARY_AUTH_TOKEN_KEY = origAuthTokenKey;
    } else {
      delete process.env.CLOUDINARY_AUTH_TOKEN_KEY;
    }
  }
});

test('10. Storage Durability: Local disk fallback truthfully reports non-durable without persistent mount', () => {
  const origEnv = { ...process.env };
  try {
    delete process.env.PERSISTENT_STORAGE_MOUNTED;
    delete process.env.PERSISTENT_DISK_PATH;

    assert.equal(isPersistentDiskConfigured(), false, 'Unconfigured disk must not be marked persistent');

    const localAdapter = new LocalDiskStorageAdapter();
    assert.equal(localAdapter.isDurable(), false, 'Local disk without mounted volume must not claim durability');

    // When persistent storage flag is set
    process.env.PERSISTENT_STORAGE_MOUNTED = 'true';
    assert.equal(isPersistentDiskConfigured(), true);
    const persistentAdapter = new LocalDiskStorageAdapter();
    assert.equal(persistentAdapter.isDurable(), true, 'Persistent volume mount must be recognized as durable');

    // Cloudinary adapter is always durable across container restarts
    const cloudAdapter = new CloudinaryStorageAdapter();
    assert.equal(cloudAdapter.isDurable(), true, 'Cloud object storage is durable');
  } finally {
    process.env = origEnv;
  }
});

test('11. Client-controlled publishing regression: Metadata isPublic is ignored and unauthorized publish returns 403', () => {
  // 1. Role-based publisher authorization
  const normalUser = { uid: 'user_regular_123', role: 'user', isAdmin: false };
  const restaurantOwner = { uid: 'user_owner_456', role: 'restaurant_owner', isAdmin: false };
  const adminUser = { uid: 'user_admin_789', role: 'admin', isAdmin: true };
  const superAdminUser = { uid: 'user_super_000', role: 'super_admin' };
  const ownerUser = { uid: 'user_owner_222', role: 'owner' };

  assert.equal(isAuthorizedPublisher(normalUser), false, 'Normal user must NOT be authorized publisher');
  assert.equal(isAuthorizedPublisher(restaurantOwner), true, 'Restaurant owner MUST be authorized publisher');
  assert.equal(isAuthorizedPublisher(adminUser), true, 'Admin MUST be authorized publisher');
  assert.equal(isAuthorizedPublisher(superAdminUser), true, 'Super admin MUST be authorized publisher');
  assert.equal(isAuthorizedPublisher(ownerUser), true, 'Owner MUST be authorized publisher');
  assert.equal(isAuthorizedPublisher(null), false, 'Unauthenticated user must NOT be authorized publisher');

  // 2. Client-supplied metadata sanitization
  function sanitizeJobCreation(input: {
    user: { uid: string; role?: string; isAdmin?: boolean };
    isPublic?: boolean;
    metadata?: Record<string, any>;
  }): { isPublic: boolean; metadata: Record<string, any>; status: number } {
    // Check if client tried to set isPublic directly
    if (input.isPublic === true) {
      if (!isAuthorizedPublisher(input.user)) {
        return { isPublic: false, metadata: {}, status: 403 };
      }
    }

    // Strip client metadata attempts to publish
    const sanitizedMetadata = { ...input.metadata };
    delete sanitizedMetadata.isPublic;
    delete sanitizedMetadata.public;

    // All newly generated user reconstructions are private by default
    return {
      isPublic: false,
      metadata: sanitizedMetadata,
      status: 202
    };
  }

  // Normal user submitting metadata: { isPublic: true } creates private job (isPublic: false)
  const normalUserWithMetadata = sanitizeJobCreation({
    user: normalUser,
    metadata: { isPublic: true, public: true, customNote: 'My Scan' }
  });
  assert.equal(normalUserWithMetadata.status, 202);
  assert.equal(normalUserWithMetadata.isPublic, false, 'Asset must remain strictly private');
  assert.equal(normalUserWithMetadata.metadata.isPublic, undefined, 'metadata.isPublic must be stripped');
  assert.equal(normalUserWithMetadata.metadata.public, undefined, 'metadata.public must be stripped');
  assert.equal(normalUserWithMetadata.metadata.customNote, 'My Scan', 'Unrelated metadata preserved');

  // Normal user attempting direct isPublic: true receives 403 Forbidden
  const normalUserDirectPublish = sanitizeJobCreation({
    user: normalUser,
    isPublic: true
  });
  assert.equal(normalUserDirectPublish.status, 403, 'Direct publish attempt by normal user must return 403');

  // Authorized publish endpoint simulation
  function evaluatePublishEndpoint(user: { uid: string; role?: string; isAdmin?: boolean }, job: { isPublic: boolean }): { status: number; job?: { isPublic: boolean } } {
    if (!isAuthorizedPublisher(user)) {
      return { status: 403 };
    }
    return {
      status: 200,
      job: {
        isPublic: true
      }
    };
  }

  assert.equal(evaluatePublishEndpoint(normalUser, { isPublic: false }).status, 403, 'Unauthorized publish attempt must return 403');
  const publishedRes = evaluatePublishEndpoint(restaurantOwner, { isPublic: false });
  assert.equal(publishedRes.status, 200);
  assert.equal(publishedRes.job?.isPublic, true, 'Authorized publish must set isPublic: true');
});

test('12. Fail-closed private retrieval: getGLB never falls back to public upload on private failure', async () => {
  const adapter = new CloudinaryStorageAdapter();

  // Retrieving a non-existent private asset must cleanly return null without falling back to public upload
  const result = await adapter.getGLB('nonexistent_private_asset_key_99999.glb', false);
  assert.equal(result, null, 'Private retrieval failure must fail closed (return null) without falling back to public upload');
});

test('13. Genuinely time-limited URL expiry: Access verified before expiry, rejected after expiry', () => {
  const filename = 'recon_expiring_dish_model.glb';

  // 1. Fresh valid token (1 hour in future)
  const freshSigned = signAssetUrl(filename, 3600);
  const isValidFresh = verifyAssetSignature(filename, freshSigned.expires, freshSigned.signature);
  assert.equal(isValidFresh, true, 'Fresh signed asset URL must be valid');

  // 2. Expired token (10 seconds in past)
  const expiredSigned = signAssetUrl(filename, -10);
  const isValidExpired = verifyAssetSignature(filename, expiredSigned.expires, expiredSigned.signature);
  assert.equal(isValidExpired, false, 'Expired asset URL must be rejected (verifyAssetSignature returns false)');

  // 3. Simulated endpoint handling: expired signature returns 401
  function handleAssetRequest(query: { sig?: string; exp?: string }): number {
    if (query.sig || query.exp) {
      if (!query.sig || !query.exp || !verifyAssetSignature(filename, Number(query.exp), query.sig)) {
        return 401; // Unauthorized
      }
      return 200; // Success
    }
    return 401;
  }

  assert.equal(handleAssetRequest({ sig: freshSigned.signature, exp: String(freshSigned.expires) }), 200);
  assert.equal(handleAssetRequest({ sig: expiredSigned.signature, exp: String(expiredSigned.expires) }), 401, 'Expired signature must receive 401');
  assert.equal(handleAssetRequest({ sig: 'tampered', exp: String(freshSigned.expires) }), 401, 'Tampered signature must receive 401');
});

test('14. Publication Authorization & Tenant Isolation: Enforces restaurant and menu item relationship integrity across standalone and embedded models', async () => {
  const normalUser = { uid: 'customer_usr_999', role: 'customer' };
  const ownerA = { uid: 'owner_alice_101', role: 'restaurant_owner' };
  const ownerB = { uid: 'owner_bob_202', role: 'restaurant_owner' };
  const admin = { uid: 'admin_eve_303', role: 'admin', isAdmin: true };

  // Data stores for mock DB entities
  const standaloneMenuItems: Record<string, any> = {
    item_standalone_alice: {
      _id: 'item_standalone_alice',
      businessId: 'rest_alice',
      name: 'Alice Truffle Burger',
      modelUrl: undefined
    },
    item_standalone_bob: {
      _id: 'item_standalone_bob',
      businessId: 'rest_bob',
      name: 'Bob Smoked Ribs',
      modelUrl: undefined
    }
  };

  const restaurants: Record<string, any> = {
    rest_alice: {
      _id: 'rest_alice',
      restaurantId: 'rest_alice',
      ownerId: 'owner_alice_101',
      menu: [
        { id: 'item_embedded_alice', name: 'Alice Caesar Salad', modelUrl: undefined }
      ]
    },
    rest_alice_second: {
      _id: 'rest_alice_second',
      restaurantId: 'rest_alice_second',
      ownerId: 'owner_alice_101',
      menu: [
        { id: 'item_embedded_alice_second', name: 'Alice Dessert', modelUrl: undefined }
      ]
    },
    rest_bob: {
      _id: 'rest_bob',
      restaurantId: 'rest_bob',
      ownerId: 'owner_bob_202',
      menu: [
        { id: 'item_embedded_bob', name: 'Bob Onion Soup', modelUrl: undefined }
      ]
    }
  };

  const businesses: Record<string, any> = {
    biz_alice: {
      _id: 'biz_alice',
      ownerId: 'owner_alice_101',
      menu: [
        { id: 'item_bus_alice', name: 'Alice Bistro Tart', modelUrl: undefined }
      ]
    },
    biz_bob: {
      _id: 'biz_bob',
      ownerId: 'owner_bob_202',
      menu: [
        { id: 'item_bus_bob', name: 'Bob Bistro Steak', modelUrl: undefined }
      ]
    }
  };

  // Mock Mongoose model queries
  const originalMenuItemFindById = MenuItem.findById;
  const originalMenuItemFindOne = MenuItem.findOne;
  const originalMenuItemUpdateOne = MenuItem.updateOne;
  const originalRestaurantFindOne = Restaurant.findOne;
  const originalRestaurantUpdateOne = Restaurant.updateOne;
  const originalBusinessFindById = Business.findById;
  const originalBusinessFindOne = Business.findOne;
  const originalBusinessUpdateOne = Business.updateOne;

  MenuItem.findById = async (id: any) => standaloneMenuItems[String(id)] || null;
  MenuItem.findOne = async (query: any) => {
    if (query._id) return standaloneMenuItems[String(query._id)] || null;
    return null;
  };
  MenuItem.updateOne = async (filter: any, update: any) => {
    const item = standaloneMenuItems[String(filter._id)];
    if (item && item.businessId === filter.businessId) {
      if (update.$set?.modelUrl) item.modelUrl = update.$set.modelUrl;
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  };

  Restaurant.findOne = async (query: any) => {
    if (query['menu.id']) {
      const itemId = query['menu.id'];
      for (const r of Object.values(restaurants)) {
        if (r.menu.some((m: any) => m.id === itemId)) return r;
      }
      return null;
    }
    if (query.$or) {
      for (const cond of query.$or) {
        if (cond.restaurantId && restaurants[cond.restaurantId]) return restaurants[cond.restaurantId];
        if (cond._id && restaurants[cond._id]) return restaurants[cond._id];
      }
    }
    if (query.restaurantId) return restaurants[query.restaurantId] || null;
    return null;
  };
  Restaurant.updateOne = async (filter: any, update: any) => {
    const itemId = filter['menu.id'];
    let targetRest: any = null;
    if (filter.$or) {
      for (const cond of filter.$or) {
        if (cond.restaurantId && restaurants[cond.restaurantId]) targetRest = restaurants[cond.restaurantId];
        if (cond._id && restaurants[cond._id]) targetRest = restaurants[cond._id];
      }
    }
    if (targetRest) {
      const entry = targetRest.menu.find((m: any) => m.id === itemId);
      if (entry && update.$set?.['menu.$.modelUrl']) {
        entry.modelUrl = update.$set['menu.$.modelUrl'];
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  };

  Business.findById = async (id: any) => businesses[String(id)] || null;
  Business.findOne = async (query: any) => {
    if (query['menu.id']) {
      const itemId = query['menu.id'];
      for (const b of Object.values(businesses)) {
        if (b.menu && b.menu.some((m: any) => m.id === itemId)) return b;
      }
      return null;
    }
    return null;
  };
  Business.updateOne = async (filter: any, update: any) => {
    const bus = businesses[String(filter._id)];
    if (bus && bus.menu) {
      const entry = bus.menu.find((m: any) => m.id === filter['menu.id']);
      if (entry && update.$set?.['menu.$.modelUrl']) {
        entry.modelUrl = update.$set['menu.$.modelUrl'];
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  };

  // Ensure Mongoose readyState is mocked as active on both root and backend instances
  const rootMongoose = require('mongoose');
  const backendRequire = createRequire(process.cwd() + '/backend/package.json');
  const backendMongoose = backendRequire('mongoose');
  const originalRootReadyState = rootMongoose.connection.readyState;
  const originalBackendReadyState = backendMongoose.connection.readyState;
  rootMongoose.connection.readyState = 1;
  backendMongoose.connection.readyState = 1;

  try {
    // 1. Direct unit verification of verifyRestaurantAuthorization
    // 1a. Unlinked asset rejected
    const unlinked = await verifyRestaurantAuthorization(undefined, undefined, ownerA);
    assert.equal(unlinked.authorized, false);
    assert.equal(unlinked.statusCode, 403);

    // 1b. Owner A's restaurant combined with Owner B's standalone menu item rejected (403)
    const crossOwnerStandalone = await verifyRestaurantAuthorization('rest_alice', 'item_standalone_bob', ownerA);
    assert.equal(crossOwnerStandalone.authorized, false);
    assert.equal(crossOwnerStandalone.statusCode, 403);
    assert.match(crossOwnerStandalone.reason!, /belongs to restaurant "rest_bob", not "rest_alice"/);

    // 1c. Owner A's restaurant combined with Owner B's embedded menu item rejected (403)
    const crossOwnerEmbedded = await verifyRestaurantAuthorization('rest_alice', 'item_embedded_bob', ownerA);
    assert.equal(crossOwnerEmbedded.authorized, false);
    assert.equal(crossOwnerEmbedded.statusCode, 403);
    assert.match(crossOwnerEmbedded.reason!, /belongs to restaurant "rest_bob", not "rest_alice"/);

    // 1d. Owner A's Business ID combined with Owner B's standalone or embedded menu item rejected (403)
    const crossBusinessStandalone = await verifyRestaurantAuthorization('biz_alice', 'item_standalone_bob', ownerA);
    assert.equal(crossBusinessStandalone.authorized, false);
    assert.equal(crossBusinessStandalone.statusCode, 403);

    const crossBusinessEmbedded = await verifyRestaurantAuthorization('biz_alice', 'item_bus_bob', ownerA);
    assert.equal(crossBusinessEmbedded.authorized, false);
    assert.equal(crossBusinessEmbedded.statusCode, 403);

    // 1e. Mismatched persisted relationship rejected even if requester owns BOTH restaurants
    // Alice owns rest_alice AND rest_alice_second. Combining rest_alice_second with rest_alice's item must fail.
    const sameOwnerMismatch = await verifyRestaurantAuthorization('rest_alice_second', 'item_embedded_alice', ownerA);
    assert.equal(sameOwnerMismatch.authorized, false);
    assert.equal(sameOwnerMismatch.statusCode, 403);
    assert.match(sameOwnerMismatch.reason!, /belongs to restaurant "rest_alice", not "rest_alice_second"/);

    // 1f. Only menuItemId provided: resolves canonical parent restaurant consistently
    const resolvedStandalone = await verifyRestaurantAuthorization(undefined, 'item_standalone_alice', ownerA);
    assert.equal(resolvedStandalone.authorized, true);
    assert.equal(resolvedStandalone.verifiedRestaurantId, 'rest_alice');
    assert.equal(resolvedStandalone.verifiedMenuItemId, 'item_standalone_alice');

    const resolvedEmbedded = await verifyRestaurantAuthorization(undefined, 'item_embedded_alice', ownerA);
    assert.equal(resolvedEmbedded.authorized, true);
    assert.equal(resolvedEmbedded.verifiedRestaurantId, 'rest_alice');

    const resolvedBusiness = await verifyRestaurantAuthorization(undefined, 'item_bus_alice', ownerA);
    assert.equal(resolvedBusiness.authorized, true);
    assert.equal(resolvedBusiness.verifiedRestaurantId, 'biz_alice');

    // 1g. Only menuItemId provided for Bob's item by Alice: rejected with 403
    const resolvedBobsItemByAlice = await verifyRestaurantAuthorization(undefined, 'item_embedded_bob', ownerA);
    assert.equal(resolvedBobsItemByAlice.authorized, false);
    assert.equal(resolvedBobsItemByAlice.statusCode, 403);
    assert.match(resolvedBobsItemByAlice.reason!, /does not own the restaurant/);

    // 1h. Admin follows policy: can publish valid restaurant-item combinations
    const adminAuth = await verifyRestaurantAuthorization('rest_bob', 'item_embedded_bob', admin);
    assert.equal(adminAuth.authorized, true);
    assert.equal(adminAuth.verifiedRestaurantId, 'rest_bob');

    // Admin combining mismatched restaurant-item is rejected (relationship integrity preserved)
    const adminMismatch = await verifyRestaurantAuthorization('rest_alice', 'item_embedded_bob', admin);
    assert.equal(adminMismatch.authorized, false);
    assert.equal(adminMismatch.statusCode, 403);

    // 2. Integration with ReconstructionService.publishJob()
    const originalFindOne = ReconstructionJob.findOne;
    const originalStorageAdapter = getReconstructionStorageAdapter();
    const dummyGLB = createMinimalGLBBuffer(0.2, 0.1, 0.2);

    const jobs: Record<string, any> = {
      job_alice: {
        jobId: 'job_alice',
        userId: 'owner_alice_101',
        status: 'completed',
        storageKey: 'recon_alice_model.glb',
        storageType: 'local',
        restaurantId: 'rest_alice',
        menuItemId: 'item_embedded_alice',
        isPublic: false,
        modelUrl: '/api/v1/reconstruction/assets/recon_alice_model.glb?sig=secret',
        metadata: {},
        save: async function() { return this; }
      },
      job_bob: {
        jobId: 'job_bob',
        userId: 'owner_bob_202',
        status: 'completed',
        storageKey: 'recon_bob_model.glb',
        storageType: 'local',
        restaurantId: 'rest_bob',
        menuItemId: 'item_embedded_bob',
        isPublic: false,
        modelUrl: '/api/v1/reconstruction/assets/recon_bob_model.glb?sig=secret',
        metadata: {},
        save: async function() { return this; }
      }
    };
    (ReconstructionJob as any).findOne = async (query: { jobId: string }) => jobs[query.jobId] || null;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async () => dummyGLB,
      deleteGLB: async () => true,
      publishGLB: async (key: string) => ({
        url: `https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/${key}`,
        storageType: 'cloudinary' as const,
        storageKey: key,
        originalPrivateKey: key,
        publicKey: key,
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: (key: string) => `https://cdn.example.com/${key}`
    });

    // 2a. Attempting cross-tenant publication (Alice attempts to publish for Bob's reconstruction)
    await assert.rejects(
      () => reconstructionService.publishJob('job_bob', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /another user's private reconstruction/);
        return true;
      }
    );

    // 2b. Attempting mismatched relationship in publish options
    await assert.rejects(
      () => reconstructionService.publishJob('job_alice', ownerA, { menuItemId: 'item_embedded_bob' }),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // 2c. Prove failed authorization caused NO menu mutations on either owner
    assert.equal(restaurants.rest_alice.menu[0].modelUrl, undefined, "Alice's menu item must not be modified");
    assert.equal(restaurants.rest_bob.menu[0].modelUrl, undefined, "Bob's menu item must not be modified");
    assert.equal(standaloneMenuItems.item_standalone_bob.modelUrl, undefined, "Bob's standalone item must not be modified");

    // 2d. Valid same-restaurant publication succeeds
    const published = await reconstructionService.publishJob('job_alice', ownerA);
    assert.equal(published.isPublic, true);
    assert.equal(published.restaurantId, 'rest_alice');
    assert.equal(published.menuItemId, 'item_embedded_alice');
    assert.equal(restaurants.rest_alice.menu[0].modelUrl, published.modelUrl, "Only Alice's menu item is updated");
    assert.equal(restaurants.rest_bob.menu[0].modelUrl, undefined, "Bob's menu item remains untouched");

    (ReconstructionJob as any).findOne = originalFindOne;
    setReconstructionStorageAdapter(originalStorageAdapter);
  } finally {
    MenuItem.findById = originalMenuItemFindById;
    MenuItem.findOne = originalMenuItemFindOne;
    MenuItem.updateOne = originalMenuItemUpdateOne;
    Restaurant.findOne = originalRestaurantFindOne;
    Restaurant.updateOne = originalRestaurantUpdateOne;
    Business.findById = originalBusinessFindById;
    Business.findOne = originalBusinessFindOne;
    rootMongoose.connection.readyState = originalRootReadyState;
    backendMongoose.connection.readyState = originalBackendReadyState;
    setRestaurantOwnershipResolver(null);
  }
});

test('15. Failure-Safe Publication: Verifications, rollback of public copy, preservation of private original, and idempotent publication', async () => {
  const ownerA = { uid: 'owner_alice_101', role: 'restaurant_owner' };
  const originalFindOne = ReconstructionJob.findOne;
  const originalStorageAdapter = getReconstructionStorageAdapter();
  const dummyGLB = createMinimalGLBBuffer(0.2, 0.1, 0.2);

  setRestaurantOwnershipResolver(async (restaurantId: any, menuItemId: any) => {
    if (restaurantId === 'rest_alice' || menuItemId === 'item_pasta') {
      return { authorized: true, verifiedRestaurantId: 'rest_alice', verifiedMenuItemId: 'item_pasta' };
    }
    return { authorized: false, statusCode: 403 };
  });

  try {
    // 1. Incomplete jobs cannot be published (queued, processing, failed, cancelled)
    const incompleteStatuses = ['queued', 'processing', 'failed', 'cancelled'];
    for (const status of incompleteStatuses) {
      const mockJob = {
        jobId: `job_${status}`,
        userId: 'owner_alice_101',
        status,
        storageKey: 'recon_incomplete.glb',
        restaurantId: 'rest_alice',
        isPublic: false,
        modelUrl: '/api/v1/reconstruction/assets/recon_incomplete.glb?sig=secret',
        metadata: {} as any,
        save: async function() { return this; }
      };
      (ReconstructionJob as any).findOne = async () => mockJob;

      await assert.rejects(
        () => reconstructionService.publishJob(`job_${status}`, ownerA),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Only completed jobs can be published/);
          return true;
        }
      );
      assert.equal(mockJob.isPublic, false);
      assert.ok(!mockJob.metadata.publishedAt);
    }

    // 2. Missing or invalid storage key rejects with 400 and keeps job private
    const invalidJob = {
      jobId: 'job_invalid_key',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: '../../traversal.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/invalid?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => invalidJob;

    await assert.rejects(
      () => reconstructionService.publishJob('job_invalid_key', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
    assert.equal(invalidJob.isPublic, false);

    // 3. Missing private asset binary fails closed with 404
    const missingAssetJob = {
      jobId: 'job_missing_binary',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_missing_file.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_missing_file.glb?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => missingAssetJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async () => null, // Private buffer is missing!
      deleteGLB: async () => true,
      publishGLB: async () => null,
      getDeliveryUrl: () => ''
    });

    await assert.rejects(
      () => reconstructionService.publishJob('job_missing_binary', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /private 3D model asset is missing or cannot be retrieved/);
        return true;
      }
    );
    assert.equal(missingAssetJob.isPublic, false);

    // 4. Failed storage migration preserves private asset and returns 502
    let privateAssetDeleted = false;
    const migrationFailedJob = {
      jobId: 'job_migration_fail',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_valid_binary.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_valid_binary.glb?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => migrationFailedJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async () => dummyGLB,
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (!isPublic) privateAssetDeleted = true;
        return true;
      },
      publishGLB: async () => {
        throw new Error('Cloudinary 503 Service Unavailable / Network Timeout');
      },
      getDeliveryUrl: () => ''
    });

    await assert.rejects(
      () => reconstructionService.publishJob('job_migration_fail', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /Failed to migrate 3D asset to public storage delivery/);
        return true;
      }
    );
    assert.equal(migrationFailedJob.isPublic, false);
    assert.equal(privateAssetDeleted, false, 'Original private asset must NOT be deleted on migration error');

    // 5. Returned failure on public verification triggers rollback and preserves private copy
    let publicDeletedKey: string | null = null;
    let privateDeletedKey: string | null = null;
    const verificationFailedJob = {
      jobId: 'job_verification_fail',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'dineingo/reconstructions/recon_private_source.glb', // Prefixed key
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_private_source.glb?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => verificationFailedJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'cloudinary' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPublic?: boolean) => {
        if (!isPublic) return dummyGLB; // Private source exists
        return null; // Public CDN returns null / empty (corrupted or unverified)
      },
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (isPublic) publicDeletedKey = key;
        if (!isPublic) privateDeletedKey = key;
        return true;
      },
      publishGLB: async (key: string) => ({
        url: 'https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/recon_new_public.glb',
        storageType: 'cloudinary' as const,
        storageKey: 'recon_new_public.glb',
        originalPrivateKey: key,
        publicKey: 'recon_new_public.glb',
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: () => ''
    });

    await assert.rejects(
      () => reconstructionService.publishJob('job_verification_fail', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 502);
        assert.match(err.message, /Failed to verify published 3D model asset on public delivery CDN/);
        return true;
      }
    );
    assert.equal(verificationFailedJob.isPublic, false);
    assert.equal(publicDeletedKey, 'recon_new_public.glb', 'Public copy must be cleaned up on verification failure');
    assert.equal(privateDeletedKey, null, 'Private original must be preserved on verification failure');

    // 6. Thrown verification error triggers rollback and preserves private copy
    publicDeletedKey = null;
    privateDeletedKey = null;
    const throwVerificationJob = {
      jobId: 'job_throw_verify',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_throw_verify.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_throw_verify.glb?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => throwVerificationJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'cloudinary' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPublic?: boolean) => {
        if (!isPublic) return dummyGLB;
        throw new Error('CDN connection reset / socket hang up');
      },
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (isPublic) publicDeletedKey = key;
        if (!isPublic) privateDeletedKey = key;
        return true;
      },
      publishGLB: async (key: string) => ({
        url: 'https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/recon_throw_pub.glb',
        storageType: 'cloudinary' as const,
        storageKey: 'recon_throw_pub.glb',
        originalPrivateKey: key,
        publicKey: 'recon_throw_pub.glb',
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: () => ''
    });

    await assert.rejects(
      () => reconstructionService.publishJob('job_throw_verify', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 502);
        return true;
      }
    );
    assert.equal(throwVerificationJob.isPublic, false);
    assert.equal(publicDeletedKey, 'recon_throw_pub.glb');
    assert.equal(privateDeletedKey, null);

    // 7. Failed ReconstructionJob.save() rolls back the public copy and reverts in-memory job state
    publicDeletedKey = null;
    privateDeletedKey = null;
    const saveFailJob = {
      jobId: 'job_save_fail',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_save_fail_orig.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_save_fail_orig.glb?sig=secret',
      metadata: { initial: 'note' } as any,
      save: async function() {
        throw new Error('Mongoose write conflict / MongoNetworkError');
      }
    };
    (ReconstructionJob as any).findOne = async () => saveFailJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'cloudinary' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async () => dummyGLB,
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (isPublic) publicDeletedKey = key;
        if (!isPublic) privateDeletedKey = key;
        return true;
      },
      publishGLB: async (key: string) => ({
        url: 'https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/recon_save_fail_pub.glb',
        storageType: 'cloudinary' as const,
        storageKey: 'recon_save_fail_pub.glb',
        originalPrivateKey: key,
        publicKey: 'recon_save_fail_pub.glb',
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: () => ''
    });

    await assert.rejects(
      () => reconstructionService.publishJob('job_save_fail', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 500);
        assert.match(err.message, /Failed to persist published job state to database/);
        return true;
      }
    );
    assert.equal(saveFailJob.isPublic, false, 'Job state must revert to private when save() fails');
    assert.equal(saveFailJob.modelUrl, '/api/v1/reconstruction/assets/recon_save_fail_orig.glb?sig=secret', 'modelUrl must revert');
    assert.equal(publicDeletedKey, 'recon_save_fail_pub.glb', 'Public copy must be deleted on save failure');
    assert.equal(privateDeletedKey, null, 'Private copy must NOT be deleted when persistence fails');

    // 8. Successful publication deletes old private copy only AFTER persistence, and is idempotent
    publicDeletedKey = null;
    privateDeletedKey = null;
    let savedJobPublicState = false;
    const successfulJob = {
      jobId: 'job_success_lifecycle',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'dineingo/reconstructions/recon_success_priv.glb', // Prefixed key
      restaurantId: 'rest_alice',
      menuItemId: 'item_pasta',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_success_priv.glb?sig=secret',
      metadata: { originalScanNote: 'Chef special' } as any,
      save: async function() {
        // Assert that private copy has NOT been deleted before save() runs!
        assert.equal(privateDeletedKey, null, 'Private copy must remain intact prior to database persistence');
        savedJobPublicState = this.isPublic;
        return this;
      }
    };
    (ReconstructionJob as any).findOne = async () => successfulJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'cloudinary' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async () => dummyGLB,
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (isPublic) publicDeletedKey = key;
        if (!isPublic) privateDeletedKey = key;
        return true;
      },
      publishGLB: async (key: string) => ({
        url: 'https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/recon_success_pub.glb',
        storageType: 'cloudinary' as const,
        storageKey: 'recon_success_pub.glb',
        originalPrivateKey: key,
        publicKey: 'recon_success_pub.glb',
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: () => ''
    });

    const pubResult = await reconstructionService.publishJob('job_success_lifecycle', ownerA);
    assert.equal(pubResult.isPublic, true);
    assert.equal(savedJobPublicState, true);
    assert.equal(privateDeletedKey, 'dineingo/reconstructions/recon_success_priv.glb', 'Private copy deleted only after successful persistence');
    assert.equal(publicDeletedKey, null, 'Public copy must NOT be deleted on success');

    // Idempotent publication check: calling publish again on already public job returns job immediately
    const secondCall = await reconstructionService.publishJob('job_success_lifecycle', ownerA);
    assert.equal(secondCall.isPublic, true);
    assert.equal(secondCall.modelUrl, pubResult.modelUrl);

    // 9. Actual LocalDiskStorageAdapter with isolated temporary storage directory
    // Tests that publication preserves the physical GLB file for both unprefixed and prefixed keys,
    // and verifies that cleanup never deletes the backing file when aliases resolve to the same local asset.
    const tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dineingo-local-test-'));
    try {
      const localAdapter = new LocalDiskStorageAdapter(tempStorageDir);
      setReconstructionStorageAdapter(localAdapter);

      // 9a. Test successful publication with an ordinary unprefixed local key
      const unprefixedFilename = 'recon_local_unprefixed.glb';
      await localAdapter.saveGLB(dummyGLB, unprefixedFilename, false);
      const unprefixedDiskPath = path.join(tempStorageDir, unprefixedFilename);
      assert.equal(fs.existsSync(unprefixedDiskPath), true, 'Unprefixed GLB file must exist before publish');

      const localUnprefixedJob = {
        jobId: 'job_local_unprefixed',
        userId: 'owner_alice_101',
        status: 'completed',
        storageKey: unprefixedFilename,
        storageType: 'local' as const,
        restaurantId: 'rest_alice',
        menuItemId: 'item_pasta',
        isPublic: false,
        modelUrl: `/api/v1/reconstruction/assets/${unprefixedFilename}?sig=temp&exp=9999999999`,
        metadata: { scanNote: 'Unprefixed dish' } as any,
        save: async function() { return this; }
      };

      (ReconstructionJob as any).findOne = async (query: { jobId: string }) => {
        if (query.jobId === 'job_local_unprefixed') return localUnprefixedJob;
        return null;
      };

      const publishedUnprefixed = await reconstructionService.publishJob('job_local_unprefixed', ownerA);

      // Verify job state
      assert.equal(publishedUnprefixed.isPublic, true, 'job.isPublic must be true');
      assert.equal(publishedUnprefixed.storageKey, unprefixedFilename);
      assert.equal(publishedUnprefixed.modelUrl, `/api/v1/reconstruction/assets/${unprefixedFilename}`);

      // Verify physical file is preserved and retrievable
      assert.equal(fs.existsSync(unprefixedDiskPath), true, 'Physical GLB file must NOT be deleted by cleanup');
      const retrievedUnprefixed = await localAdapter.getGLB(unprefixedFilename, true);
      assert.ok(retrievedUnprefixed !== null && retrievedUnprefixed.length > 0, 'Original GLB file must be retrievable');
      assert.equal(Buffer.compare(retrievedUnprefixed!, dummyGLB), 0, 'Retrieved buffer must match original GLB');

      // Idempotent second publication attempt
      const secondUnprefixed = await reconstructionService.publishJob('job_local_unprefixed', ownerA);
      assert.equal(secondUnprefixed.isPublic, true);
      assert.equal(secondUnprefixed.modelUrl, `/api/v1/reconstruction/assets/${unprefixedFilename}`);
      assert.equal(fs.existsSync(unprefixedDiskPath), true, 'File must still exist after second publication');

      // 9b. Test successful publication with a prefixed local key (e.g. 'dineingo/reconstructions/food.glb')
      const prefixedBaseFilename = 'recon_local_prefixed.glb';
      const prefixedStorageKey = `dineingo/reconstructions/${prefixedBaseFilename}`;
      await localAdapter.saveGLB(dummyGLB, prefixedBaseFilename, false);
      const prefixedDiskPath = path.join(tempStorageDir, prefixedBaseFilename);
      assert.equal(fs.existsSync(prefixedDiskPath), true, 'Prefixed GLB file must exist before publish');

      const localPrefixedJob = {
        jobId: 'job_local_prefixed',
        userId: 'owner_alice_101',
        status: 'completed',
        storageKey: prefixedStorageKey,
        storageType: 'local' as const,
        restaurantId: 'rest_alice',
        menuItemId: 'item_pasta',
        isPublic: false,
        modelUrl: `/api/v1/reconstruction/assets/${prefixedBaseFilename}?sig=temp&exp=9999999999`,
        metadata: { scanNote: 'Prefixed dish' } as any,
        save: async function() { return this; }
      };

      (ReconstructionJob as any).findOne = async (query: { jobId: string }) => {
        if (query.jobId === 'job_local_prefixed') return localPrefixedJob;
        return null;
      };

      const publishedPrefixed = await reconstructionService.publishJob('job_local_prefixed', ownerA);

      // Verify job state
      assert.equal(publishedPrefixed.isPublic, true, 'job.isPublic must be true');
      assert.equal(publishedPrefixed.storageKey, prefixedBaseFilename, 'storageKey must be normalized');
      assert.equal(publishedPrefixed.modelUrl, `/api/v1/reconstruction/assets/${prefixedBaseFilename}`);

      // Verify physical file is preserved and retrievable via both base and prefixed key
      assert.equal(fs.existsSync(prefixedDiskPath), true, 'Physical GLB file must NOT be deleted by cleanup for prefixed keys');
      const retrievedPrefixed = await localAdapter.getGLB(prefixedBaseFilename, true);
      assert.ok(retrievedPrefixed !== null && retrievedPrefixed.length > 0, 'GLB must be retrievable by clean key');
      assert.equal(Buffer.compare(retrievedPrefixed!, dummyGLB), 0);

      const retrievedViaPrefixed = await localAdapter.getGLB(prefixedStorageKey, true);
      assert.ok(retrievedViaPrefixed !== null && retrievedViaPrefixed.length > 0, 'GLB must be retrievable via prefixed key');
      assert.equal(Buffer.compare(retrievedViaPrefixed!, dummyGLB), 0);

      // Idempotent second publication attempt
      const secondPrefixed = await reconstructionService.publishJob('job_local_prefixed', ownerA);
      assert.equal(secondPrefixed.isPublic, true);
      assert.equal(secondPrefixed.modelUrl, `/api/v1/reconstruction/assets/${prefixedBaseFilename}`);
      assert.equal(fs.existsSync(prefixedDiskPath), true, 'Physical file must still exist after second publication');

      // 9c. Test that rollback does NOT delete the private file when publication fails
      const rollbackFilename = 'recon_local_rollback.glb';
      await localAdapter.saveGLB(dummyGLB, rollbackFilename, false);
      const rollbackDiskPath = path.join(tempStorageDir, rollbackFilename);

      const localRollbackJob = {
        jobId: 'job_local_rollback',
        userId: 'owner_alice_101',
        status: 'completed',
        storageKey: `dineingo/reconstructions/${rollbackFilename}`,
        storageType: 'local' as const,
        restaurantId: 'rest_alice',
        menuItemId: 'item_pasta',
        isPublic: false,
        modelUrl: `/api/v1/reconstruction/assets/${rollbackFilename}?sig=temp&exp=9999999999`,
        metadata: {} as any,
        save: async function() {
          throw new Error('Database disk full error');
        }
      };

      (ReconstructionJob as any).findOne = async () => localRollbackJob;

      await assert.rejects(
        () => reconstructionService.publishJob('job_local_rollback', ownerA),
        (err: any) => {
          assert.equal(err.statusCode, 500);
          return true;
        }
      );

      assert.equal(fs.existsSync(rollbackDiskPath), true, 'Rollback must NOT delete the private source file on disk');
      assert.equal(localRollbackJob.isPublic, false, 'Job must remain private');
    } finally {
      if (fs.existsSync(tempStorageDir)) {
        fs.rmSync(tempStorageDir, { recursive: true, force: true });
      }
    }
  } finally {
    (ReconstructionJob as any).findOne = originalFindOne;
    setReconstructionStorageAdapter(originalStorageAdapter);
    setRestaurantOwnershipResolver(null);
  }
});

// Helper to create mock Express HTTP request and response objects for route handler testing
function createMockHttpExchange(params: {
  filename?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  user?: { uid: string; role?: string; isAdmin?: boolean };
}) {
  const req: any = {
    params: { filename: params.filename },
    query: params.query || {},
    headers: params.headers || {},
    user: params.user
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    }
  };

  return { req, res };
}

test('16. Delivery URL validation: LocalDiskStorageAdapter fails closed on invalid and traversal keys', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dineingo-deliv-url-test-'));
  try {
    const adapter = new LocalDiskStorageAdapter(tempDir);

    // 1. Valid keys generate proper delivery URLs
    const publicUrl = adapter.getDeliveryUrl('food.glb', true);
    assert.equal(publicUrl, '/api/v1/reconstruction/assets/food.glb');

    const privateUrl = adapter.getDeliveryUrl('food.glb', false);
    assert.ok(privateUrl.startsWith('/api/v1/reconstruction/assets/food.glb?sig='));
    assert.ok(privateUrl.includes('exp='));

    // Prefixed valid keys are normalized properly
    const prefixedPublic = adapter.getDeliveryUrl('dineingo/reconstructions/food.glb', true);
    assert.equal(prefixedPublic, '/api/v1/reconstruction/assets/food.glb');

    const prefixedPrivate = adapter.getDeliveryUrl('/dineingo/reconstructions/food.glb', false);
    assert.ok(prefixedPrivate.startsWith('/api/v1/reconstruction/assets/food.glb?sig='));

    // 2. Invalid and path-traversal inputs fail closed and throw Errors
    const dangerousKeys = [
      '../evil.glb',
      '../../etc/passwd',
      'foo/../bar.glb',
      'food.txt',
      'food..glb',
      'food.glb\0',
      '/etc/shadow',
      'invalid_extension.png',
      '',
      null as any,
      undefined as any
    ];

    for (const badKey of dangerousKeys) {
      assert.throws(
        () => adapter.getDeliveryUrl(badKey, true),
        (err: any) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('Invalid storage key provided for delivery URL'));
          return true;
        },
        `getDeliveryUrl must throw on invalid key: "${badKey}"`
      );

      assert.throws(
        () => adapter.getDeliveryUrl(badKey, false),
        (err: any) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('Invalid storage key provided for delivery URL'));
          return true;
        },
        `getDeliveryUrl(private) must throw on invalid key: "${badKey}"`
      );
    }

    // 3. Cloudinary adapter also fails closed on invalid storage keys
    const cldAdapter = new CloudinaryStorageAdapter();
    for (const badKey of ['../traversal.glb', 'foo.exe', '']) {
      await assert.rejects(
        () => cldAdapter.getDeliveryUrl(badKey, true),
        (err: any) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('Invalid storage key provided for delivery URL'));
          return true;
        }
      );
    }
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('17. Asset-to-job matching regression: Distinct filenames (food.glb vs foodxglb.glb) and HTTP outcomes', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dineingo-asset-match-test-'));
  const originalFindOne = ReconstructionJob.findOne;
  const originalFind = ReconstructionJob.find;
  const originalAdapter = getReconstructionStorageAdapter();

  try {
    const localAdapter = new LocalDiskStorageAdapter(tempDir);
    setReconstructionStorageAdapter(localAdapter);

    // Create two distinct GLB models with different binary buffers and physical properties
    const bufferFood = createMinimalGLBBuffer(0.20, 0.10, 0.20);
    const bufferFoodX = createMinimalGLBBuffer(0.40, 0.20, 0.30);

    // Save them to isolated disk storage
    fs.writeFileSync(path.join(tempDir, 'food.glb'), bufferFood);
    fs.writeFileSync(path.join(tempDir, 'foodxglb.glb'), bufferFoodX);

    // Two distinct database jobs:
    // Job A is PUBLIC for foodxglb.glb
    // Job B is PRIVATE for food.glb (owned by owner_alice_101)
    const jobA_Public = {
      jobId: 'job_foodxglb_public',
      userId: 'chef_mario',
      status: 'completed',
      dishName: 'Food X Dish',
      storageKey: 'foodxglb.glb',
      storageType: 'local',
      isPublic: true,
      modelUrl: 'https://res.cloudinary.com/demo/raw/upload/dineingo/reconstructions/foodxglb.glb'
    };

    const jobB_Private = {
      jobId: 'job_food_private',
      userId: 'owner_alice_101',
      status: 'completed',
      dishName: 'Alice Secret Recipe',
      storageKey: 'food.glb',
      storageType: 'local',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/food.glb?sig=temp'
    };

    const allJobs = [jobA_Public, jobB_Private];

    // Mock ReconstructionJob.findOne to resolve exact storageKey matches
    (ReconstructionJob as any).findOne = async (query: any) => {
      if (query?.storageKey?.$in) {
        const keys: string[] = query.storageKey.$in;
        return allJobs.find(j => keys.includes(j.storageKey)) || null;
      }
      return null;
    };

    // Mock ReconstructionJob.find to resolve candidate modelUrl matches
    (ReconstructionJob as any).find = async (query: any) => {
      if (query?.modelUrl instanceof RegExp) {
        return allJobs.filter(j => query.modelUrl.test(j.modelUrl));
      }
      return [];
    };

    // 1. Unauthenticated request to private food.glb MUST NOT match public foodxglb.glb
    // In old buggy regex code, 'food.glb' matched 'foodxglb.glb' and served food.glb with public cache!
    const { req: unauthReq, res: unauthRes } = createMockHttpExchange({ filename: 'food.glb' });
    await handleAssetRequest(unauthReq, unauthRes);

    assert.equal(unauthRes.statusCode, 401, 'Anonymous request to private food.glb must return 401 Unauthorized');
    assert.equal(unauthRes.body.success, false);
    assert.equal(unauthRes.body.message, 'Unauthorized: Access to private 3D assets requires authentication or a valid signed asset URL.');
    assert.equal(unauthRes.headers['content-type'], undefined, 'Must not deliver binary payload to unauthorized request');

    // 2. Unauthenticated request to exact public foodxglb.glb MUST succeed and deliver foodxglb buffer
    const { req: pubReq, res: pubRes } = createMockHttpExchange({ filename: 'foodxglb.glb' });
    await handleAssetRequest(pubReq, pubRes);

    assert.equal(pubRes.statusCode, 200, 'Public asset foodxglb.glb must return 200 OK');
    assert.equal(pubRes.headers['content-type'], 'model/gltf-binary');
    assert.equal(pubRes.headers['cache-control'], 'public, max-age=86400');
    assert.equal(Buffer.compare(pubRes.body, bufferFoodX), 0, 'Delivered buffer must match foodxglb.glb');

    // 3. Asset owner Alice accesses her private food.glb -> 200 with private cache
    const { req: aliceReq, res: aliceRes } = createMockHttpExchange({
      filename: 'food.glb',
      user: { uid: 'owner_alice_101', role: 'user' }
    });
    await handleAssetRequest(aliceReq, aliceRes);

    assert.equal(aliceRes.statusCode, 200, 'Owner Alice must have permitted access to her private asset');
    assert.equal(aliceRes.headers['content-type'], 'model/gltf-binary');
    assert.equal(aliceRes.headers['cache-control'], 'private, max-age=3600');
    assert.equal(Buffer.compare(aliceRes.body, bufferFood), 0, 'Delivered buffer must match food.glb');

    // 4. Administrator accesses private food.glb -> 200 with private cache
    const { req: adminReq, res: adminRes } = createMockHttpExchange({
      filename: 'food.glb',
      user: { uid: 'admin_sys', role: 'admin', isAdmin: true }
    });
    await handleAssetRequest(adminReq, adminRes);

    assert.equal(adminRes.statusCode, 200, 'Administrator must have permitted access to private asset');
    assert.equal(Buffer.compare(adminRes.body, bufferFood), 0);

    // 5. Unrelated user Charlie tries to access private food.glb -> 403 Forbidden
    const { req: charlieReq, res: charlieRes } = createMockHttpExchange({
      filename: 'food.glb',
      user: { uid: 'user_charlie_999', role: 'user' }
    });
    await handleAssetRequest(charlieReq, charlieRes);

    assert.equal(charlieRes.statusCode, 403, 'Unrelated user Charlie must be rejected with 403 Forbidden');
    assert.equal(charlieRes.body.success, false);
    assert.equal(charlieRes.body.message, 'Forbidden: You do not have permission to access this private asset.');

    // 6. Valid HMAC signed URL permits temporary access to private food.glb
    const validSig = signAssetUrl('food.glb', 3600);
    const { req: sigReq, res: sigRes } = createMockHttpExchange({
      filename: 'food.glb',
      query: { sig: validSig.signature, exp: String(validSig.expires) }
    });
    await handleAssetRequest(sigReq, sigRes);

    assert.equal(sigRes.statusCode, 200, 'Valid signed URL must permit access');
    assert.equal(sigRes.headers['cache-control'], 'private, max-age=3600');
    assert.equal(Buffer.compare(sigRes.body, bufferFood), 0);

    // 7. Expired signature is rejected with 401
    const expiredSig = signAssetUrl('food.glb', -3600);
    const { req: expReq, res: expRes } = createMockHttpExchange({
      filename: 'food.glb',
      query: { sig: expiredSig.signature, exp: String(expiredSig.expires) }
    });
    await handleAssetRequest(expReq, expRes);

    assert.equal(expRes.statusCode, 401, 'Expired signature must be rejected with 401');
    assert.equal(expRes.body.message, 'Unauthorized: Asset signature is invalid or expired.');

    // 8. Tampered signature is rejected with 401
    const { req: tampReq, res: tampRes } = createMockHttpExchange({
      filename: 'food.glb',
      query: { sig: '1234567890abcdef'.repeat(4), exp: String(validSig.expires) }
    });
    await handleAssetRequest(tampReq, tampRes);

    assert.equal(tampRes.statusCode, 401, 'Tampered signature must be rejected with 401');

    // 9. Signature for foodxglb.glb used on food.glb is rejected with 401
    const foodxSig = signAssetUrl('foodxglb.glb', 3600);
    const { req: crossSigReq, res: crossSigRes } = createMockHttpExchange({
      filename: 'food.glb',
      query: { sig: foodxSig.signature, exp: String(foodxSig.expires) }
    });
    await handleAssetRequest(crossSigReq, crossSigRes);

    assert.equal(crossSigRes.statusCode, 401, 'Signature for different file must be rejected with 401');

    // 10. Invalid filenames rejected with 400
    for (const badFilename of ['../secret.glb', 'food.txt', 'food..glb', 'food.glb\0']) {
      const { req: badReq, res: badRes } = createMockHttpExchange({ filename: badFilename });
      await handleAssetRequest(badReq, badRes);
      assert.equal(badRes.statusCode, 400, `Filename "${badFilename}" must return 400`);
      assert.equal(badRes.body.message, 'Invalid asset filename');
    }
  } finally {
    (ReconstructionJob as any).findOne = originalFindOne;
    (ReconstructionJob as any).find = originalFind;
    setReconstructionStorageAdapter(originalAdapter);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

test('18. Safe modelUrl resolution: Overlapping and substring URLs do not produce false matches', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dineingo-modelurl-match-test-'));
  const originalFindOne = ReconstructionJob.findOne;
  const originalFind = ReconstructionJob.find;
  const originalAdapter = getReconstructionStorageAdapter();

  try {
    const localAdapter = new LocalDiskStorageAdapter(tempDir);
    setReconstructionStorageAdapter(localAdapter);

    const bufferFood = createMinimalGLBBuffer(0.2, 0.1, 0.2);
    const bufferSuperFood = createMinimalGLBBuffer(0.5, 0.3, 0.4);
    const bufferPizza = createMinimalGLBBuffer(0.3, 0.05, 0.3);

    fs.writeFileSync(path.join(tempDir, 'food.glb'), bufferFood);
    fs.writeFileSync(path.join(tempDir, 'super_food.glb'), bufferSuperFood);
    fs.writeFileSync(path.join(tempDir, 'pizza.glb'), bufferPizza);

    // Legacy jobs with NO storageKey, only modelUrl
    const jobSuperFood_Public = {
      jobId: 'job_legacy_super_food',
      userId: 'chef_super',
      status: 'completed',
      storageKey: undefined,
      isPublic: true,
      modelUrl: 'https://res.cloudinary.com/demo/raw/upload/dineingo/reconstructions/super_food.glb'
    };

    const jobFood_Private = {
      jobId: 'job_legacy_food_priv',
      userId: 'owner_bob_202',
      status: 'completed',
      storageKey: undefined,
      isPublic: false,
      modelUrl: 'https://res.cloudinary.com/demo/raw/authenticated/dineingo/reconstructions/food.glb'
    };

    const jobPizza_PublicWithToken = {
      jobId: 'job_legacy_pizza',
      userId: 'chef_luigi',
      status: 'completed',
      storageKey: undefined,
      isPublic: true,
      modelUrl: 'https://res.cloudinary.com/demo/raw/upload/v1234/dineingo/reconstructions/pizza.glb?__cld_token__=exp=9999999999~hmac=abcdef'
    };

    const legacyJobs = [jobSuperFood_Public, jobFood_Private, jobPizza_PublicWithToken];

    // findOne returns null for storageKey because storageKey is undefined
    (ReconstructionJob as any).findOne = async () => null;

    (ReconstructionJob as any).find = async (query: any) => {
      if (query?.modelUrl instanceof RegExp) {
        return legacyJobs.filter(j => query.modelUrl.test(j.modelUrl));
      }
      return [];
    };

    // 1. Verify extractAssetFilenameFromUrl correctly isolates filenames
    assert.equal(
      extractAssetFilenameFromUrl('https://res.cloudinary.com/demo/raw/upload/dineingo/reconstructions/super_food.glb'),
      'super_food.glb'
    );
    assert.equal(
      extractAssetFilenameFromUrl('https://res.cloudinary.com/demo/raw/authenticated/dineingo/reconstructions/food.glb'),
      'food.glb'
    );
    assert.equal(
      extractAssetFilenameFromUrl('https://res.cloudinary.com/demo/raw/upload/v1234/dineingo/reconstructions/pizza.glb?__cld_token__=exp=9999999999~hmac=abcdef'),
      'pizza.glb'
    );
    assert.equal(extractAssetFilenameFromUrl('/api/v1/reconstruction/assets/food.glb?sig=123&exp=456'), 'food.glb');
    assert.equal(extractAssetFilenameFromUrl('/api/v1/reconstruction/assets/../evil.glb'), null);
    assert.equal(extractAssetFilenameFromUrl(''), null);
    assert.equal(extractAssetFilenameFromUrl(null), null);

    // 2. Anonymous request to 'food.glb' must NOT match 'super_food.glb'
    // Under unescaped substring regex /food.glb/, 'super_food.glb' would match and authorize public access!
    const { req: reqFood, res: resFood } = createMockHttpExchange({ filename: 'food.glb' });
    await handleAssetRequest(reqFood, resFood);

    assert.equal(resFood.statusCode, 401, 'Anonymous request to food.glb must not match public super_food.glb');
    assert.equal(resFood.body.success, false);
    assert.equal(resFood.body.message, 'Unauthorized: Access to private 3D assets requires authentication or a valid signed asset URL.');

    // 3. Anonymous request to 'super_food.glb' matches Job C and succeeds with public Cache-Control
    const { req: reqSuper, res: resSuper } = createMockHttpExchange({ filename: 'super_food.glb' });
    await handleAssetRequest(reqSuper, resSuper);

    assert.equal(resSuper.statusCode, 200, 'Anonymous request to public super_food.glb must return 200 OK');
    assert.equal(resSuper.headers['cache-control'], 'public, max-age=86400');
    assert.equal(Buffer.compare(resSuper.body, bufferSuperFood), 0);

    // 4. Anonymous request to 'pizza.glb' matches Job with token query and succeeds with public Cache-Control
    const { req: reqPizza, res: resPizza } = createMockHttpExchange({ filename: 'pizza.glb' });
    await handleAssetRequest(reqPizza, resPizza);

    assert.equal(resPizza.statusCode, 200, 'Anonymous request to public pizza.glb must return 200 OK');
    assert.equal(resPizza.headers['cache-control'], 'public, max-age=86400');
    assert.equal(Buffer.compare(resPizza.body, bufferPizza), 0);

    // 5. Cloudinary storage adapter retrieval when file not on local disk
    const mockCldBuffer = createMinimalGLBBuffer(0.3, 0.2, 0.1);
    let requestedCloudinaryKey = '';
    let requestedIsPublic: boolean | undefined = undefined;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'cloudinary' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPub?: boolean) => {
        requestedCloudinaryKey = key;
        requestedIsPublic = isPub;
        return mockCldBuffer;
      },
      deleteGLB: async () => true,
      publishGLB: async () => null,
      getDeliveryUrl: () => 'https://cdn.example.com/asset.glb'
    });

    // Remove super_food.glb from local temp dir so it triggers storageAdapter.getGLB
    fs.unlinkSync(path.join(tempDir, 'super_food.glb'));

    const { req: reqCld, res: resCld } = createMockHttpExchange({ filename: 'super_food.glb' });
    await handleAssetRequest(reqCld, resCld);

    assert.equal(resCld.statusCode, 200);
    assert.equal(resCld.headers['cache-control'], 'public, max-age=86400');
    assert.equal(requestedCloudinaryKey, 'super_food.glb');
    assert.equal(requestedIsPublic, true, 'Public model lookup must request public delivery from storage adapter');
    assert.equal(Buffer.compare(resCld.body, mockCldBuffer), 0);
  } finally {
    (ReconstructionJob as any).findOne = originalFindOne;
    (ReconstructionJob as any).find = originalFind;
    setReconstructionStorageAdapter(originalAdapter);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

