import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Test GLB Magic Header and Structural Validation
function validateGLBBuffer(buffer: Buffer): { valid: boolean; error?: string; byteLength?: number } {
  if (buffer.length < 12) {
    return { valid: false, error: 'File too small to be a valid glTF 2.0 binary asset (<12 bytes)' };
  }
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) { // ASCII "glTF"
    return { valid: false, error: `Invalid magic header: expected 0x46546C67 ("glTF"), got 0x${magic.toString(16)}` };
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    return { valid: false, error: `Unsupported glTF version: ${version}. Expected version 2.` };
  }
  const totalLength = buffer.readUInt32LE(8);
  if (totalLength > buffer.length) {
    return { valid: false, error: `Truncated GLB: header declared ${totalLength} bytes but received ${buffer.length}` };
  }
  return { valid: true, byteLength: buffer.length };
}

// Test Duplicate Cache Fingerprint
function computeCacheKey(userId: string, imageBase64: string, model: string = 'triposr-zerogpu'): string {
  const contentHash = crypto.createHash('sha256').update(imageBase64).digest('hex').substring(0, 24);
  return `${userId}:${model}:${contentHash}`;
}

test('1. GLB Validation: Correctly identifies authentic glTF 2.0 binary assets', () => {
  // Construct minimal valid glTF 2.0 binary header: magic=0x46546C67, version=2, length=12
  const validHeader = Buffer.alloc(12);
  validHeader.writeUInt32LE(0x46546C67, 0); // "glTF"
  validHeader.writeUInt32LE(2, 4);          // Version 2
  validHeader.writeUInt32LE(12, 8);         // Total byte length

  const res = validateGLBBuffer(validHeader);
  assert.equal(res.valid, true);
  assert.equal(res.byteLength, 12);
});

test('2. GLB Validation: Rejects HTML error responses returned as fake GLBs', () => {
  const htmlError = Buffer.from('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>');
  const res = validateGLBBuffer(htmlError);
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes('Invalid magic header'));
});

test('3. GLB Validation: Rejects truncated or partial GLB files', () => {
  const truncated = Buffer.alloc(12);
  truncated.writeUInt32LE(0x46546C67, 0);
  truncated.writeUInt32LE(2, 4);
  truncated.writeUInt32LE(1000, 8); // Header claims 1000 bytes, but buffer only has 12

  const res = validateGLBBuffer(truncated);
  assert.equal(res.valid, false);
  assert.ok(res.error?.includes('Truncated GLB'));
});

test('4. Caching & GPU Conservation: Generates deterministic content fingerprints', () => {
  const img1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  const img2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  const img3 = 'data:image/jpeg;base64,/9j/DIFFERENT_IMAGE_DATA...';

  const key1 = computeCacheKey('user_123', img1);
  const key2 = computeCacheKey('user_123', img2);
  const key3 = computeCacheKey('user_123', img3);
  const keyOtherUser = computeCacheKey('user_456', img1);

  assert.equal(key1, key2, 'Identical image and user must yield identical cache fingerprint');
  assert.notEqual(key1, key3, 'Different images must yield different cache fingerprints');
  assert.notEqual(key1, keyOtherUser, 'Fingerprint must be user-scoped to prevent unauthorized cross-user cache access');
});

test('5. ZeroGPU Quota & Error Classification: Detects quota exhaustion and rate limiting', () => {
  function classifyHfError(status: number, message: string): { type: string; retryable: boolean; userMessage: string } {
    if (status === 429 || message.toLowerCase().includes('zerogpu quota') || message.toLowerCase().includes('gpu quota exceeded')) {
      return {
        type: 'ZEROGPU_QUOTA_EXHAUSTED',
        retryable: false,
        userMessage: 'Hugging Face ZeroGPU daily quota exhausted for this space. 3D reconstruction is temporarily paused.'
      };
    }
    if (status === 401 || status === 403 || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('token')) {
      return {
        type: 'AUTH_FAILED',
        retryable: false,
        userMessage: 'Authentication to private Hugging Face Space failed. Please check backend token permissions.'
      };
    }
    if (status === 503 || message.toLowerCase().includes('building') || message.toLowerCase().includes('no_app_file')) {
      return {
        type: 'SPACE_NOT_READY',
        retryable: true,
        userMessage: 'Hugging Face Space is currently building or starting up. Please try again shortly.'
      };
    }
    return {
      type: 'INFERENCE_ERROR',
      retryable: false,
      userMessage: '3D reconstruction failed during model processing.'
    };
  }

  const quotaErr = classifyHfError(429, 'GPU quota exceeded for today');
  assert.equal(quotaErr.type, 'ZEROGPU_QUOTA_EXHAUSTED');
  assert.equal(quotaErr.retryable, false);

  const authErr = classifyHfError(401, 'Invalid HF token');
  assert.equal(authErr.type, 'AUTH_FAILED');

  const buildingErr = classifyHfError(503, 'Stage is BUILDING');
  assert.equal(buildingErr.type, 'SPACE_NOT_READY');
  assert.equal(buildingErr.retryable, true);
});

test('6. Job Lifecycle Transitions: Strictly follows queued -> processing -> completed / failed', () => {
  const allowedTransitions: Record<string, string[]> = {
    'queued': ['processing', 'failed', 'cancelled'],
    'processing': ['completed', 'failed', 'cancelled'],
    'completed': [],
    'failed': [],
    'cancelled': []
  };

  function canTransition(from: string, to: string): boolean {
    return (allowedTransitions[from] || []).includes(to);
  }

  assert.equal(canTransition('queued', 'processing'), true);
  assert.equal(canTransition('processing', 'completed'), true);
  assert.equal(canTransition('processing', 'failed'), true);
  assert.equal(canTransition('completed', 'processing'), false, 'Completed jobs cannot regress to processing');
  assert.equal(canTransition('failed', 'completed'), false, 'Failed jobs cannot magically succeed');
  assert.equal(canTransition('queued', 'completed'), false, 'Cannot complete without processing');
});
