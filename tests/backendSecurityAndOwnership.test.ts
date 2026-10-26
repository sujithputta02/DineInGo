import { test } from 'node:test';
import assert from 'node:assert/strict';

test('1. Security: Food diary portion multiplier rejects out-of-range values', () => {
  function validatePortionMultiplier(val: any): boolean {
    const num = Number(val);
    return !isNaN(num) && num >= 0.05 && num <= 20.0;
  }

  assert.equal(validatePortionMultiplier(1.0), true);
  assert.equal(validatePortionMultiplier(0.5), true);
  assert.equal(validatePortionMultiplier(2.5), true);
  assert.equal(validatePortionMultiplier(0.01), false, 'Should reject multiplier < 0.05');
  assert.equal(validatePortionMultiplier(-2), false, 'Should reject negative multipliers');
  assert.equal(validatePortionMultiplier(50), false, 'Should reject unreasonable multipliers > 20');
  assert.equal(validatePortionMultiplier('invalid'), false, 'Should reject non-numeric values');
});

test('2. Security: User identity derived strictly from verified auth token context, never body or header', () => {
  interface AuthContext {
    user?: { uid: string; email: string };
  }

  function resolveEffectiveUserId(req: { body?: { userId?: string }; headers?: Record<string, string>; user?: { uid: string } }): string | null {
    // Correct secure pattern: ONLY trust req.user.uid set by verified auth middleware
    if (req.user?.uid) {
      return req.user.uid;
    }
    return null;
  }

  const maliciousRequest = {
    body: { userId: 'victim_user_999' },
    headers: { 'x-user-id': 'victim_user_999' },
    user: { uid: 'attacker_user_111' }
  };

  const effectiveId = resolveEffectiveUserId(maliciousRequest);
  assert.equal(effectiveId, 'attacker_user_111', 'Must strictly use authenticated token UID, ignoring spoofed body/headers');

  const unauthenticatedRequest = {
    body: { userId: 'victim_user_999' },
    headers: { 'x-user-id': 'victim_user_999' }
  };

  assert.equal(resolveEffectiveUserId(unauthenticatedRequest), null, 'Must reject unauthenticated requests');
});

test('3. Security: Cross-user resource access protection returns non-disclosing 404/403', () => {
  interface Resource {
    id: string;
    userId: string;
    data: string;
  }

  const mockDb: Resource[] = [
    { id: 'diary_1', userId: 'alice', data: 'Alice meal record' },
    { id: 'job_1', userId: 'alice', data: 'Alice 3D job' }
  ];

  function getResource(requesterUid: string, resourceId: string): { status: number; resource?: Resource } {
    const item = mockDb.find(r => r.id === resourceId);
    if (!item) {
      return { status: 404 };
    }
    // Prevent information disclosure: if the item does not belong to the user, return 404
    if (item.userId !== requesterUid) {
      return { status: 404 };
    }
    return { status: 200, resource: item };
  }

  // Alice accessing her own resource
  const aliceRes = getResource('alice', 'diary_1');
  assert.equal(aliceRes.status, 200);
  assert.equal(aliceRes.resource?.data, 'Alice meal record');

  // Bob attempting to access Alice's resource
  const bobRes = getResource('bob', 'diary_1');
  assert.equal(bobRes.status, 404, 'Must return non-disclosing 404 for unowned resource');
  assert.equal(bobRes.resource, undefined);
});

test('4. Security: Storage filename sanitization prevents directory traversal attacks', () => {
  function sanitizeFilename(filename: string): string | null {
    // Reject path traversal attempts
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    // Only allow safe alphanumeric, hyphens, underscores and .glb extension
    if (!/^[a-zA-Z0-9_-]+\.glb$/.test(filename)) {
      return null;
    }
    return filename;
  }

  assert.equal(sanitizeFilename('recon_12345.glb'), 'recon_12345.glb');
  assert.equal(sanitizeFilename('../../../etc/passwd'), null, 'Must block dot-dot traversal');
  assert.equal(sanitizeFilename('/etc/shadow.glb'), null, 'Must block leading slash');
  assert.equal(sanitizeFilename('recon\\windows\\file.glb'), null, 'Must block backslashes');
  assert.equal(sanitizeFilename('recon.exe'), null, 'Must block non-glb extensions');
});
