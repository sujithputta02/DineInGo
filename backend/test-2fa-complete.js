/**
 * Complete 2FA test - verify TOTP with real admin secret
 */

const { authenticator } = require('otplib');
const crypto = require('crypto');

// Configure authenticator EXACTLY as in twoFactorService.ts
const TOTP_WINDOW = 4;
authenticator.options = { window: TOTP_WINDOW };

console.log('🔧 Authenticator Configuration:');
console.log('  Window:', authenticator.options.window);
console.log('  Step:', authenticator.options.step || 30);
console.log('  Epoch:', authenticator.options.epoch || 'default (0)');
console.log('');

// Test with a sample secret (this is what's stored encrypted in DB)
const testSecret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret

console.log('📝 Test Secret:', testSecret);
console.log('');

// Generate current token
const currentToken = authenticator.generate(testSecret);
console.log('✅ Current Token:', currentToken);
console.log('   Time:', new Date().toISOString());
console.log('   Unix:', Math.floor(Date.now() / 1000));
console.log('');

// Verify the token
const isValid = authenticator.verify({ token: currentToken, secret: testSecret });
console.log('🔍 Verification Result:', isValid ? '✓ VALID' : '✗ INVALID');
console.log('');

// Test with manual token input
if (process.argv[2]) {
  const manualToken = process.argv[2];
  console.log('🧪 Testing Manual Token:', manualToken);
  const manualValid = authenticator.verify({ token: manualToken, secret: testSecret });
  console.log('   Result:', manualValid ? '✓ VALID' : '✗ INVALID');
  console.log('');
}

// Show valid tokens for next few time windows
console.log('⏰ Valid tokens across time windows:');
const currentTime = Math.floor(Date.now() / 1000);
for (let i = -2; i <= 2; i++) {
  const timeOffset = currentTime + (i * 30);
  const token = authenticator.generate(testSecret);
  console.log(`  ${i === 0 ? '→' : ' '} ${i.toString().padStart(2)} steps: ${token}`);
}
console.log('');

console.log('💡 To test with your authenticator app:');
console.log('   1. Scan this secret into your app:', testSecret);
console.log('   2. Run: node test-2fa-complete.js <YOUR_CODE>');
console.log('   3. It should verify within ±2 minutes (±4 steps)');
