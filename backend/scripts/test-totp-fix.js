/**
 * Smoke test for the 2FA verify fix.
 * Generates a secret, derives a TOTP token, and verifies it both:
 *   - immediately (current step)
 *   - with an old 30s-step token that a window=0 verify would reject
 * Reproduces the original bug and confirms the fix.
 */
'use strict';

const { authenticator } = require('otplib');

function tryLabel(label, fn) {
  let result;
  try { result = fn(); } catch (e) { result = 'THREW: ' + e.message; }
  console.log(label, '->', JSON.stringify(result));
}

// 1) Reproduce the BUG: mutating a frozen getter return is a no-op (or throws in strict mode)
try {
  authenticator.options.window = 4;
} catch (e) {
  console.log('mutate options.window threw:', e.message);
}
console.log('after mutate, effective window:', authenticator.allOptions().window);

// 2) Apply the CORRECT fix: assign via setter
authenticator.options = { window: 4 };
console.log('after setter-assign, effective window:', authenticator.allOptions().window);

const secret = authenticator.generateSecret();

const currentToken = authenticator.generate(secret);
console.log('current token:', currentToken);

tryLabel('verify current (window=4)', () => authenticator.verify({ token: currentToken, secret }));

// Build a token from a 2-steps-old counter by temporarily rolling epoch back 60s.
// otplib reads epoch from allOptions() each call, so we fake via options.
const twoStepsAgo = Date.now() - (2 * 30 * 1000);
authenticator.options = { window: 4, epoch: twoStepsAgo };
const oldToken = authenticator.generate(secret);
// reset epoch to now for verify
authenticator.options = { window: 4, epoch: Date.now() };
console.log('old (2-step) token:', oldToken);
tryLabel('verify 2-steps-old token (window=4)', () => authenticator.verify({ token: oldToken, secret }));

// 3) Confirm window=0 would reject the old token (reproduces original behaviour)
const { authenticator: strictAuth } = require('otplib');
strictAuth.options = { window: 0 };
tryLabel('verify 2-steps-old token with WINDOW=0 (bug repro)', () => strictAuth.verify({ token: oldToken, secret }));
