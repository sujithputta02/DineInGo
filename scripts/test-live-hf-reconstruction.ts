import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load backend environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/index.js');

const { HuggingFaceTripoSRProvider } = require('./backend/src/services/reconstructionService.ts');
const { extractGlbDimensions } = require('./backend/src/utils/glbDimensionExtractor.ts');
const { getReconstructionStorageAdapter, LocalDiskStorageAdapter } = require('./backend/src/services/reconstructionStorageAdapter.ts');
const { signAssetUrl, verifyAssetSignature } = require('./backend/src/utils/assetSecurity.ts');

async function runLiveIntegrationTest() {
  console.log('================================================================================');
  console.log('       DINEINGO LIVE INTEGRATION: ZERO-GPU TRIPOSR RECONSTRUCTION VERIFY        ');
  console.log('================================================================================\n');

  const provider = new HuggingFaceTripoSRProvider();

  // 1. Check Space Readiness
  console.log('[Step 1/6] Verifying Hugging Face Space readiness...');
  const readiness = await provider.checkSpaceReadiness();
  console.log(`  Space Host: ${readiness.host}`);
  console.log(`  Ready: ${readiness.ready ? 'YES 🟢' : 'NO 🔴'}`);
  if (!readiness.ready) {
    throw new Error(`Space not ready: ${readiness.message}`);
  }

  // 2. Load Real Food Image
  console.log('\n[Step 2/6] Loading real food input image...');
  const imageArtifactPath = '/Users/sujithputta/.gemini/antigravity-ide/brain/be871af0-71be-4b36-9a64-c416e2c2228b/apple_tarte_1792996224499.jpg';

  let imageBuffer: Buffer;
  if (fs.existsSync(imageArtifactPath)) {
    imageBuffer = fs.readFileSync(imageArtifactPath);
    console.log(`  Loaded real food image (${imageBuffer.length} bytes): ${imageArtifactPath}`);
  } else {
    // Fallback to sample or existing image
    const sampleImgPath = path.resolve(process.cwd(), 'backend/storage/sample_food.jpg');
    if (fs.existsSync(sampleImgPath)) {
      imageBuffer = fs.readFileSync(sampleImgPath);
      console.log(`  Loaded sample food image (${imageBuffer.length} bytes): ${sampleImgPath}`);
    } else {
      throw new Error('No test food image found.');
    }
  }

  // 3. Submit real inference to ZeroGPU
  console.log('\n[Step 3/6] Submitting inference job to ZeroGPU (NVIDIA A10G)...');
  const startTime = Date.now();
  const result = await provider.reconstructRemote(
    {
      userId: 'test_live_verify_user',
      dishName: 'Warm Apple Tarte Tatin',
      imageBuffer,
      referencePlateDiameterMeters: 0.24
    },
    (pct) => {
      console.log(`  [Progress] ZeroGPU pipeline: ${pct}%`);
    },
    false
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ZeroGPU inference completed in ${durationSec}s!`);
  console.log(`  Model URL: ${result.modelUrl}`);
  console.log(`  Storage Key: ${result.storageKey}`);
  console.log(`  Storage Type: ${result.storageType}`);
  console.log(`  Durable: ${result.isDurable ? 'YES' : 'NO'}`);

  // 4. Validate Dimensions derived from actual GLB
  console.log('\n[Step 4/6] Validating verified dimensions derived from GLB geometry...');
  if (!result.dimensions) {
    throw new Error('FAILED: Dimensions were undefined or unmeasured.');
  }

  console.log(`  Width: ${(result.dimensions.widthMeters * 100).toFixed(1)} cm`);
  console.log(`  Height: ${(result.dimensions.heightMeters * 100).toFixed(1)} cm`);
  console.log(`  Depth: ${(result.dimensions.depthMeters * 100).toFixed(1)} cm`);
  console.log(`  Tabletop contact plane aligned: ${result.contactPlaneAligned ? 'YES 🟢' : 'NO 🔴'}`);
  console.log(`  Total mesh vertices: ${result.metadata?.totalVertices}`);

  // 5. Test Asset Access Control & URL Signing
  console.log('\n[Step 5/6] Verifying asset access control and HMAC signed token...');
  const { signature, expires, signedQuery } = signAssetUrl(result.storageKey);
  const isValid = verifyAssetSignature(result.storageKey, expires, signature);
  console.log(`  Signed Query: ${signedQuery}`);
  console.log(`  Signature Verification: ${isValid ? 'VALID 🟢' : 'INVALID 🔴'}`);
  if (!isValid) {
    throw new Error('Signature verification failed.');
  }

  // 6. Test Model Retrieval from Storage Adapter / CDN
  console.log('\n[Step 6/6] Retrieving model from persistent storage adapter / CDN...');
  let retrievedGlb: Buffer | null = null;
  if (result.storageType === 'cloudinary') {
    const res = await fetch(result.modelUrl);
    if (res.ok) {
      retrievedGlb = Buffer.from(await res.arrayBuffer());
    }
  } else {
    const adapter = getReconstructionStorageAdapter();
    retrievedGlb = await adapter.getGLB(result.storageKey);
  }

  if (!retrievedGlb) {
    throw new Error(`Failed to retrieve GLB by key: ${result.storageKey}`);
  }

  const magic = retrievedGlb.readUInt32LE(0);
  console.log(`  Retrieved GLB bytes: ${retrievedGlb.length}`);
  console.log(`  Magic Header: 0x${magic.toString(16)} ("${retrievedGlb.toString('ascii', 0, 4)}")`);
  if (magic !== 0x46546C67) {
    throw new Error('Retrieved file is not a valid glTF 2.0 binary!');
  }

  console.log('\n================================================================================');
  console.log('   [SUCCESS] Live Hugging Face ZeroGPU + DineInGo AR pipeline FULLY VERIFIED!   ');
  console.log('================================================================================');
}

runLiveIntegrationTest().catch((err) => {
  console.error('\n[FATAL ERROR in Live Integration Test]:', err);
  process.exit(1);
});
