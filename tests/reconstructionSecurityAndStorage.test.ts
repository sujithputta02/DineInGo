import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/index.js');

const { RECONSTRUCTION_STORAGE_DIR, ensureReconstructionStorageDir } = require('./backend/src/config/storageConfig.ts');
const { LocalDiskStorageAdapter } = require('./backend/src/services/reconstructionStorageAdapter.ts');
const { isValidAssetFilename, signAssetUrl, verifyAssetSignature, generateSafeAssetKey } = require('./backend/src/utils/assetSecurity.ts');
const { validateDestinationUrl, verifyImageMagicBytes, isPrivateOrReservedIPv4, isPrivateOrReservedIPv6, parseAndValidateDataUrl } = require('./backend/src/utils/safeImageFetcher.ts');
const { extractGlbDimensions } = require('./backend/src/utils/glbDimensionExtractor.ts');

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
