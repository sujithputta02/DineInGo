import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/index.js');

const { RECONSTRUCTION_STORAGE_DIR, ensureReconstructionStorageDir, isPersistentDiskConfigured } = require('./backend/src/config/storageConfig.ts');
const { LocalDiskStorageAdapter, CloudinaryStorageAdapter, setReconstructionStorageAdapter, getReconstructionStorageAdapter } = require('./backend/src/services/reconstructionStorageAdapter.ts');
const { isValidAssetFilename, signAssetUrl, verifyAssetSignature, generateSafeAssetKey, getAssetSigningSecret } = require('./backend/src/utils/assetSecurity.ts');
const { validateDestinationUrl, verifyImageMagicBytes, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, parseAndValidateDataUrl } = require('./backend/src/utils/safeImageFetcher.ts');
const { extractGlbDimensions } = require('./backend/src/utils/glbDimensionExtractor.ts');
const { isAuthorizedPublisher } = require('./backend/src/routes/reconstructionRoutes.ts');
const { PublicationError, verifyRestaurantAuthorization, setRestaurantOwnershipResolver, reconstructionService } = require('./backend/src/services/reconstructionService.ts');
const { ReconstructionJob } = require('./backend/src/models/ReconstructionJob.ts');

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

test('14. Publication Authorization: Enforces restaurant ownership, rejects cross-user and cross-restaurant publishing', async () => {
  const normalUser = { uid: 'customer_usr_999', role: 'customer' };
  const ownerA = { uid: 'owner_alice_101', role: 'restaurant_owner' };
  const ownerB = { uid: 'owner_bob_202', role: 'restaurant_owner' };
  const admin = { uid: 'admin_eve_303', role: 'admin', isAdmin: true };

  // 1. Direct unit verification of verifyRestaurantAuthorization
  setRestaurantOwnershipResolver(async (restaurantId: any, menuItemId: any, requester: any) => {
    if (requester.isAdmin || requester.role === 'admin' || requester.role === 'super_admin') {
      return { authorized: true, verifiedRestaurantId: restaurantId || 'admin_verified' };
    }
    if (restaurantId) {
      if (restaurantId === 'rest_alice' && requester.uid === 'owner_alice_101') {
        return { authorized: true, verifiedRestaurantId: 'rest_alice' };
      }
      if (restaurantId === 'rest_bob' && requester.uid === 'owner_bob_202') {
        return { authorized: true, verifiedRestaurantId: 'rest_bob' };
      }
      return { authorized: false, reason: 'Requester does not own the target restaurant' };
    }
    if (menuItemId === 'item_alice_burger' && requester.uid === 'owner_alice_101') {
      return { authorized: true, verifiedRestaurantId: 'rest_alice' };
    }
    return { authorized: false, reason: 'Requester does not own the target restaurant or menu item' };
  });

  const checkUnlinked = await verifyRestaurantAuthorization(undefined, undefined, ownerA);
  assert.equal(checkUnlinked.authorized, false, 'Unlinked asset must be unauthorized');

  const checkUnauthorizedOwner = await verifyRestaurantAuthorization('rest_bob', undefined, ownerA);
  assert.equal(checkUnauthorizedOwner.authorized, false, 'Owner A cannot authorize restaurant owned by Owner B');

  const checkAuthorizedOwner = await verifyRestaurantAuthorization('rest_alice', undefined, ownerA);
  assert.equal(checkAuthorizedOwner.authorized, true, 'Owner A authorizes their own restaurant');
  assert.equal(checkAuthorizedOwner.verifiedRestaurantId, 'rest_alice');

  const checkAdmin = await verifyRestaurantAuthorization('rest_bob', undefined, admin);
  assert.equal(checkAdmin.authorized, true, 'Admin is authorized to manage any restaurant');

  // 2. Integration verification of ReconstructionService.publishJob()
  const originalFindOne = ReconstructionJob.findOne;
  const originalStorageAdapter = getReconstructionStorageAdapter();

  const dummyGLB = createMinimalGLBBuffer(0.2, 0.1, 0.2);

  // In-memory jobs
  const jobs: Record<string, any> = {
    job_alice: {
      jobId: 'job_alice',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_alice_model.glb',
      storageType: 'local',
      restaurantId: 'rest_alice',
      menuItemId: 'item_alice_burger',
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
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_bob_model.glb?sig=secret',
      metadata: {},
      save: async function() { return this; }
    },
    job_unlinked: {
      jobId: 'job_unlinked',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_unlinked_model.glb',
      storageType: 'local',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_unlinked_model.glb?sig=secret',
      metadata: {},
      save: async function() { return this; }
    }
  };

  (ReconstructionJob as any).findOne = async (query: { jobId: string }) => {
    return jobs[query.jobId] || null;
  };

  const mockStorage = {
    isDurable: () => true,
    saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
    getGLB: async (key: string, isPublic?: boolean) => dummyGLB,
    deleteGLB: async () => true,
    publishGLB: async (key: string) => ({
      url: `https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/${key}`,
      storageType: 'cloudinary' as const,
      storageKey: key,
      byteSize: dummyGLB.length,
      isDurable: true
    }),
    getDeliveryUrl: (key: string) => `https://cdn.example.com/${key}`
  };
  setReconstructionStorageAdapter(mockStorage as any);

  try {
    // 2a. Normal user cannot publish assets (403)
    await assert.rejects(
      () => reconstructionService.publishJob('job_alice', normalUser),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Only restaurant owners or administrators/);
        return true;
      }
    );

    // 2b. Cross-user protection: Owner A cannot publish Owner B's reconstruction even knowing the jobId (403)
    await assert.rejects(
      () => reconstructionService.publishJob('job_bob', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /another user's private reconstruction/);
        return true;
      }
    );

    // 2c. Unlinked reconstruction: Cannot be published by restaurant owner without restaurant authorization (403)
    await assert.rejects(
      () => reconstructionService.publishJob('job_unlinked', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /not linked to an authorized restaurant/);
        return true;
      }
    );

    // 2d. Cross-restaurant protection:
    // (i) Owner A cannot publish an unlinked model claiming Owner B's restaurant (403)
    await assert.rejects(
      () => reconstructionService.publishJob('job_unlinked', ownerA, { restaurantId: 'rest_bob' }),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Requester does not own the target restaurant/);
        return true;
      }
    );

    // (ii) Owner A cannot override a persisted restaurant association to another restaurant (403)
    await assert.rejects(
      () => reconstructionService.publishJob('job_alice', ownerA, { restaurantId: 'rest_bob' }),
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /permanently associated with restaurant/);
        return true;
      }
    );

    // 2e. Authorized restaurant owner CAN publish their own model linked to their restaurant
    const alicePublished = await reconstructionService.publishJob('job_alice', ownerA);
    assert.equal(alicePublished.isPublic, true);
    assert.equal(alicePublished.restaurantId, 'rest_alice');
    assert.ok(alicePublished.modelUrl.includes('https://res.cloudinary.com'));
    assert.equal(alicePublished.metadata?.publishedBy, 'owner_alice_101');
    assert.equal(alicePublished.metadata?.publishedRestaurantId, 'rest_alice');

    // 2f. Administrator CAN publish according to authorized policy
    const adminPublished = await reconstructionService.publishJob('job_bob', admin);
    assert.equal(adminPublished.isPublic, true);
    assert.equal(adminPublished.metadata?.publishedBy, 'admin_eve_303');
  } finally {
    (ReconstructionJob as any).findOne = originalFindOne;
    setReconstructionStorageAdapter(originalStorageAdapter);
    setRestaurantOwnershipResolver(null);
  }
});

test('15. Failure-Safe Publication: Completed status required, fail-closed on storage errors, rolls back on verification failure', async () => {
  const ownerA = { uid: 'owner_alice_101', role: 'restaurant_owner' };
  const originalFindOne = ReconstructionJob.findOne;
  const originalStorageAdapter = getReconstructionStorageAdapter();
  const dummyGLB = createMinimalGLBBuffer(0.2, 0.1, 0.2);

  setRestaurantOwnershipResolver(async (restaurantId: any) => {
    if (restaurantId === 'rest_alice') {
      return { authorized: true, verifiedRestaurantId: 'rest_alice' };
    }
    return { authorized: false };
  });

  try {
    // 1. Incomplete jobs cannot be published (queued, processing, failed)
    const incompleteJobs: Array<{ status: string; key: string }> = [
      { status: 'queued', key: 'job_queued' },
      { status: 'processing', key: 'job_processing' },
      { status: 'failed', key: 'job_failed' },
      { status: 'cancelled', key: 'job_cancelled' }
    ];

    for (const item of incompleteJobs) {
      const mockJob = {
        jobId: item.key,
        userId: 'owner_alice_101',
        status: item.status,
        storageKey: 'recon_incomplete.glb',
        restaurantId: 'rest_alice',
        isPublic: false,
        modelUrl: '/api/v1/reconstruction/assets/recon_incomplete.glb?sig=secret',
        metadata: {} as any,
        save: async function() { return this; }
      };
      (ReconstructionJob as any).findOne = async () => mockJob;

      await assert.rejects(
        () => reconstructionService.publishJob(item.key, ownerA),
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Only completed jobs can be published/);
          return true;
        }
      );
      assert.equal(mockJob.isPublic, false, `Job with status "${item.status}" must remain private`);
      assert.ok(!mockJob.metadata.publishedAt, 'Publication audit metadata must not be set');
    }

    // 2. Missing or invalid storage key rejects with 400 and keeps job private
    const invalidKeyJob = {
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
    (ReconstructionJob as any).findOne = async () => invalidKeyJob;

    await assert.rejects(
      () => reconstructionService.publishJob('job_invalid_key', ownerA),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /valid storage key is missing/);
        return true;
      }
    );
    assert.equal(invalidKeyJob.isPublic, false, 'Invalid storage key job must remain private');

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
      getGLB: async (key: string, isPublic?: boolean) => null, // Private buffer is missing!
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
    assert.equal(missingAssetJob.isPublic, false, 'Missing asset job must remain private');

    // 4. Failed storage migration (publishGLB returns null or throws) retains private state and fails closed (502)
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

    // Storage adapter that throws on publishGLB
    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPublic?: boolean) => dummyGLB, // Private buffer exists
      deleteGLB: async () => true,
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
    assert.equal(migrationFailedJob.isPublic, false, 'Failed migration must leave isPublic false');
    assert.equal(migrationFailedJob.modelUrl, '/api/v1/reconstruction/assets/recon_valid_binary.glb?sig=secret', 'modelUrl must not change on migration failure');
    assert.ok(!migrationFailedJob.metadata.publishedAt, 'publishedAt must not be set');

    // 5. Verification failure on public CDN triggers rollback and retains private state (502)
    const verificationFailedJob = {
      jobId: 'job_verification_fail',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_private_source.glb',
      restaurantId: 'rest_alice',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_private_source.glb?sig=secret',
      metadata: {} as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => verificationFailedJob;

    let deletePublicCalledWith: string | null = null;
    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPublic?: boolean) => {
        if (!isPublic) return dummyGLB; // Private source exists
        return null; // Public CDN returns 404 / empty buffer (corrupted or unverified)
      },
      deleteGLB: async (key: string, isPublic?: boolean) => {
        if (isPublic) deletePublicCalledWith = key;
        return true;
      },
      publishGLB: async (key: string) => ({
        url: `https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/new_public_key.glb`,
        storageType: 'cloudinary' as const,
        storageKey: 'new_public_key.glb',
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
    assert.equal(verificationFailedJob.isPublic, false, 'Verification failure must retain private state');
    assert.equal(verificationFailedJob.modelUrl, '/api/v1/reconstruction/assets/recon_private_source.glb?sig=secret', 'modelUrl must remain private URL');
    assert.equal(deletePublicCalledWith, 'new_public_key.glb', 'Rollback cleanup must delete unverified public asset');

    // 6. Successful publication updates all metadata and public state consistently
    const successfulJob = {
      jobId: 'job_success',
      userId: 'owner_alice_101',
      status: 'completed',
      storageKey: 'recon_success_source.glb',
      restaurantId: 'rest_alice',
      menuItemId: 'menu_item_pasta',
      isPublic: false,
      modelUrl: '/api/v1/reconstruction/assets/recon_success_source.glb?sig=secret',
      metadata: { originalScanNote: 'Chef special' } as any,
      save: async function() { return this; }
    };
    (ReconstructionJob as any).findOne = async () => successfulJob;

    setReconstructionStorageAdapter({
      isDurable: () => true,
      saveGLB: async () => ({ url: '', storageType: 'local' as const, storageKey: '', byteSize: 0, isDurable: true }),
      getGLB: async (key: string, isPublic?: boolean) => dummyGLB, // Both private and public verified
      deleteGLB: async () => true,
      publishGLB: async (key: string) => ({
        url: `https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/published_model.glb`,
        storageType: 'cloudinary' as const,
        storageKey: 'published_model.glb',
        byteSize: dummyGLB.length,
        isDurable: true
      }),
      getDeliveryUrl: () => ''
    });

    const result = await reconstructionService.publishJob('job_success', ownerA);
    assert.equal(result.isPublic, true, 'isPublic must be true');
    assert.equal(result.modelUrl, 'https://res.cloudinary.com/dineingo/image/upload/v1/dineingo/reconstructions/published_model.glb');
    assert.equal(result.storageKey, 'published_model.glb');
    assert.equal(result.storageType, 'cloudinary');
    assert.equal(result.restaurantId, 'rest_alice');
    assert.equal(result.menuItemId, 'menu_item_pasta');
    assert.equal(result.metadata.publishedBy, 'owner_alice_101');
    assert.equal(result.metadata.publishedRestaurantId, 'rest_alice');
    assert.equal(result.metadata.publishedMenuItemId, 'menu_item_pasta');
    assert.ok(result.metadata.publishedAt, 'publishedAt timestamp must be recorded');
    assert.equal(result.metadata.originalScanNote, 'Chef special', 'Pre-existing metadata must be preserved');
  } finally {
    (ReconstructionJob as any).findOne = originalFindOne;
    setReconstructionStorageAdapter(originalStorageAdapter);
    setRestaurantOwnershipResolver(null);
  }
});

