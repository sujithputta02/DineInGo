import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/index.js');
const { CloudinaryStorageAdapter } = require('./backend/src/services/reconstructionStorageAdapter.ts');

function createMinimalGLBBuffer(): Buffer {
  const gltfObj = {
    asset: { version: '2.0', generator: 'DineInGo-LiveTest' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126,
      count: 3,
      type: 'VEC3',
      min: [-0.1, 0, -0.1],
      max: [0.1, 0.1, 0.1]
    }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36 }]
  };

  const jsonString = JSON.stringify(gltfObj);
  const jsonPadding = (4 - (jsonString.length % 4)) % 4;
  const jsonBuffer = Buffer.from(jsonString + ' '.repeat(jsonPadding), 'utf8');
  const totalLength = 12 + 8 + jsonBuffer.length;
  const glbBuffer = Buffer.alloc(totalLength);

  glbBuffer.writeUInt32LE(0x46546C67, 0); // "glTF"
  glbBuffer.writeUInt32LE(2, 4);          // version 2
  glbBuffer.writeUInt32LE(totalLength, 8);
  glbBuffer.writeUInt32LE(jsonBuffer.length, 12);
  glbBuffer.writeUInt32LE(0x4E4F534A, 16); // "JSON"
  jsonBuffer.copy(glbBuffer, 20);

  return glbBuffer;
}

async function runLiveCloudinaryPrivacyTest() {
  console.log('====================================================');
  console.log('🧪 LIVE CLOUDINARY ASSET PRIVACY INTEGRATION TEST');
  console.log('====================================================');

  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinary) {
    console.warn('⚠️ Cloudinary credentials not found in environment; skipping live test.');
    return;
  }

  const adapter = new CloudinaryStorageAdapter();
  const testGLB = createMinimalGLBBuffer();
  const testKey = `recon_live_priv_${crypto.randomBytes(6).toString('hex')}.glb`;

  // 1. Upload private GLB asset with isPublic=false
  console.log(`\n1. Uploading private GLB asset: ${testKey} with isPublic=false...`);
  const saveResult = await adapter.saveGLB(testGLB, testKey, false);

  console.log(`✅ Upload successful:`);
  console.log(`   - Storage Type: ${saveResult.storageType}`);
  console.log(`   - Storage Key:  ${saveResult.storageKey}`);
  console.log(`   - Delivery URL: ${saveResult.url}`);

  if (process.env.CLOUDINARY_AUTH_TOKEN_KEY) {
    if (!saveResult.url.includes('__cld_token__=exp=')) {
      throw new Error(`Expected Cloudinary tokenized URL with __cld_token__, got: ${saveResult.url}`);
    }
    console.log(`✅ Direct token-expiring URL verified via CLOUDINARY_AUTH_TOKEN_KEY`);
  } else {
    if (!saveResult.url.startsWith('/api/v1/reconstruction/assets/') || !saveResult.url.includes('sig=')) {
      throw new Error(`Expected DineInGo backend-proxied HMAC URL with cryptographic expiry, got: ${saveResult.url}`);
    }
    console.log(`✅ Backend-proxied HMAC time-limited URL verified (CLOUDINARY_AUTH_TOKEN_KEY not set)`);
  }

  // 2. Direct Cloudinary unauthorized fetch check
  const cleanKey = saveResult.storageKey.replace(/\.glb$/i, '');
  const directUnauthUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/authenticated/dineingo/reconstructions/${cleanKey}.glb`;
  const directPublicUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/dineingo/reconstructions/${cleanKey}.glb`;

  console.log(`\n2. Testing direct unauthenticated Cloudinary access attempts:`);
  console.log(`   Direct Authenticated URL: ${directUnauthUrl}`);
  const unauthRes = await fetch(directUnauthUrl);
  console.log(`   Response: HTTP ${unauthRes.status} ${unauthRes.statusText}`);
  if (unauthRes.status !== 401 && unauthRes.status !== 404) {
    throw new Error(`Expected HTTP 401/404 for unauthenticated Cloudinary access, got: ${unauthRes.status}`);
  }
  console.log(`✅ Direct /raw/authenticated/ request rejected as expected`);

  console.log(`   Direct Upload URL: ${directPublicUrl}`);
  const publicRes = await fetch(directPublicUrl);
  console.log(`   Response: HTTP ${publicRes.status} ${publicRes.statusText}`);
  if (publicRes.status !== 401 && publicRes.status !== 404) {
    throw new Error(`Expected HTTP 401/404 for premature public Cloudinary access, got: ${publicRes.status}`);
  }
  console.log(`✅ Direct /raw/upload/ request rejected as expected (asset is private)`);

  // 3. Retrieve private asset via adapter getGLB
  console.log(`\n3. Testing adapter.getGLB("${saveResult.storageKey}", false):`);
  const retrievedBuffer = await adapter.getGLB(saveResult.storageKey, false);
  if (!retrievedBuffer || Buffer.compare(retrievedBuffer, testGLB) !== 0) {
    throw new Error('adapter.getGLB() failed to retrieve matching private buffer');
  }
  console.log(`✅ adapter.getGLB() retrieved ${retrievedBuffer.length} bytes matching uploaded model`);

  // 4. Test fail-closed behavior: non-existent asset never falls back to public upload
  console.log(`\n4. Testing fail-closed behavior on non-existent asset:`);
  const nonExistentResult = await adapter.getGLB('nonexistent_asset_key_00000.glb', false);
  if (nonExistentResult !== null) {
    throw new Error('adapter.getGLB() should return null for non-existent asset, but returned non-null');
  }
  console.log(`✅ adapter.getGLB() cleanly failed closed (returned null without public fallback)`);

  // 5. Test publishing: migrate private asset to public catalog
  console.log(`\n5. Testing adapter.publishGLB("${saveResult.storageKey}"):`);
  const publishResult = await adapter.publishGLB(saveResult.storageKey);
  if (!publishResult || !publishResult.url) {
    throw new Error('adapter.publishGLB() failed to publish asset');
  }
  console.log(`✅ Asset published:`);
  console.log(`   - Public URL: ${publishResult.url}`);

  if (!publishResult.url.includes('/raw/upload/')) {
    throw new Error(`Expected public URL to contain /raw/upload/, got: ${publishResult.url}`);
  }

  // Verify public delivery via direct HTTP fetch
  const directPublicDeliveryRes = await fetch(publishResult.url);
  console.log(`   Direct HTTP Fetch of Public URL: HTTP ${directPublicDeliveryRes.status}`);
  if (!directPublicDeliveryRes.ok) {
    throw new Error(`Published asset failed to load via public CDN: HTTP ${directPublicDeliveryRes.status}`);
  }
  const publishedDownloadedBuffer = Buffer.from(await directPublicDeliveryRes.arrayBuffer());
  if (Buffer.compare(publishedDownloadedBuffer, testGLB) !== 0) {
    throw new Error('Published GLB buffer does not match original uploaded buffer');
  }
  console.log(`✅ Published asset downloaded from public CDN: ${publishedDownloadedBuffer.length} bytes match!`);

  // 6. Cleanup published asset from Cloudinary
  console.log(`\n6. Cleaning up test asset from Cloudinary:`);
  const deleted = await adapter.deleteGLB(saveResult.storageKey, true);
  console.log(`✅ Cleanup result: ${deleted ? 'Asset deleted successfully' : 'Delete returned false'}`);

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE CLOUDINARY PRIVACY CHECKS PASSED');
  console.log('====================================================\n');
}

runLiveCloudinaryPrivacyTest().catch((err) => {
  console.error('❌ Live test failed:', err);
  process.exit(1);
});
