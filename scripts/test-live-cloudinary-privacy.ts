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

  console.log(`\n1. Uploading private GLB asset: ${testKey} with isPublic=false...`);
  const saveResult = await adapter.saveGLB(testGLB, testKey, false);

  console.log(`✅ Upload successful:`);
  console.log(`   - Storage Type: ${saveResult.storageType}`);
  console.log(`   - Storage Key:  ${saveResult.storageKey}`);
  console.log(`   - Signed URL:   ${saveResult.url}`);

  if (!saveResult.url.includes('/raw/authenticated/')) {
    throw new Error(`Expected /raw/authenticated/ delivery path, got: ${saveResult.url}`);
  }
  if (!/\/s--[A-Za-z0-9_\-]+--\//.test(saveResult.url)) {
    throw new Error(`Expected HMAC signature token in URL, got: ${saveResult.url}`);
  }

  // 2. Unsigned request test: strip the signature segment
  const unsignedUrl = saveResult.url.replace(/\/s--[A-Za-z0-9_\-]+--\//, '/');
  console.log(`\n2. Testing UNAUTHORIZED request without cryptographic signature:`);
  console.log(`   URL: ${unsignedUrl}`);

  const unauthRes = await fetch(unsignedUrl);
  console.log(`   Response Status: ${unauthRes.status} ${unauthRes.statusText}`);

  if (unauthRes.status !== 401 && unauthRes.status !== 404) {
    throw new Error(`Expected HTTP 401 or 404 for unsigned request, got: ${unauthRes.status}`);
  }
  console.log(`✅ UNAUTHORIZED REQUEST REJECTED as expected (HTTP ${unauthRes.status})`);

  // 3. Authorized request test with full signed URL
  console.log(`\n3. Testing AUTHORIZED request with signed URL:`);
  console.log(`   URL: ${saveResult.url}`);

  const authRes = await fetch(saveResult.url);
  console.log(`   Response Status: ${authRes.status} ${authRes.statusText}`);

  if (!authRes.ok) {
    throw new Error(`Expected HTTP 200 for signed URL request, got: ${authRes.status}`);
  }

  const downloadedBuffer = Buffer.from(await authRes.arrayBuffer());
  if (Buffer.compare(downloadedBuffer, testGLB) !== 0) {
    throw new Error('Downloaded GLB buffer does not match original uploaded buffer');
  }
  console.log(`✅ AUTHORIZED REQUEST SUCCEEDED: Downloaded ${downloadedBuffer.length} bytes (matches original GLB)`);

  // 4. Retrieve via adapter getGLB
  console.log(`\n4. Testing adapter.getGLB("${saveResult.storageKey}"):`);
  const retrievedBuffer = await adapter.getGLB(saveResult.storageKey);
  if (!retrievedBuffer || Buffer.compare(retrievedBuffer, testGLB) !== 0) {
    throw new Error('adapter.getGLB() failed to retrieve matching private buffer');
  }
  console.log(`✅ adapter.getGLB() retrieved ${retrievedBuffer.length} bytes matching uploaded model`);

  // 5. Cleanup: delete asset from Cloudinary
  console.log(`\n5. Cleaning up test asset from Cloudinary:`);
  const deleted = await adapter.deleteGLB(saveResult.storageKey);
  console.log(`✅ Cleanup result: ${deleted ? 'Asset deleted successfully' : 'Delete returned false'}`);

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE CLOUDINARY PRIVACY CHECKS PASSED');
  console.log('====================================================\n');
}

runLiveCloudinaryPrivacyTest().catch((err) => {
  console.error('❌ Live test failed:', err);
  process.exit(1);
});
