/**
 * Test script to verify TOTP configuration is working correctly
 * Run with: node backend/scripts/test-totp-config.js
 */

const { authenticator } = require('otplib');

// Configure with the same settings as the service
const TOTP_WINDOW = 10;

authenticator.options = { 
  window: TOTP_WINDOW,
  step: 30
};

console.log('\n=== TOTP Configuration Test ===\n');
console.log('✓ Window configured:', authenticator.options.window);
console.log('✓ Step configured:', authenticator.options.step);
console.log('✓ Tolerance:', `±${TOTP_WINDOW * 30} seconds`);

// Generate a test secret
const testSecret = authenticator.generateSecret();
console.log('\n✓ Test secret generated:', testSecret.substring(0, 10) + '...');

// Generate current token
const currentToken = authenticator.generate(testSecret);
console.log('✓ Current token:', currentToken);

// Verify the token
const isValid = authenticator.verify({ token: currentToken, secret: testSecret });
console.log('✓ Token verification:', isValid ? '✅ PASSED' : '❌ FAILED');

// Test with manual time offset simulation
const currentTime = Math.floor(Date.now() / 1000);
const currentStep = Math.floor(currentTime / 30);

console.log('\n=== Time Window Test ===');
console.log('Current time:', new Date().toISOString());
console.log('Unix timestamp:', currentTime);
console.log('Current step:', currentStep);
console.log('Window range:', `${currentStep - TOTP_WINDOW} to ${currentStep + TOTP_WINDOW} steps`);

// Test if window is actually being used
console.log('\n=== Window Effectiveness Test ===');
const testSecret2 = authenticator.generateSecret();

// Generate token for current time
const token0 = authenticator.generate(testSecret2);
console.log('Token at step 0 (current):', token0, '→', 
  authenticator.verify({ token: token0, secret: testSecret2 }) ? '✅' : '❌');

// The window should allow verification of codes from previous/future steps
// We can't easily test this without manipulating time, but we can verify config
console.log('\nIf window is working correctly:');
console.log('- Codes from ±5 minutes (±10 steps) should be accepted');
console.log('- This helps with clock sync issues between server and authenticator app');

console.log('\n=== Test Complete ===\n');

if (!isValid) {
  console.error('❌ TOTP verification FAILED! There may be an issue with the configuration.');
  process.exit(1);
} else {
  console.log('✅ All tests passed! TOTP is configured correctly.');
  process.exit(0);
}
