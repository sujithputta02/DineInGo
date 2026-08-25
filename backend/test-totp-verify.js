/**
 * Test TOTP verification with the configured window
 * This script tests if the authenticator options are properly set
 */

const { authenticator } = require('otplib');

// Set window to 4 (±2 minutes tolerance)
const TOTP_WINDOW = 4;
authenticator.options = { window: TOTP_WINDOW };

console.log('✅ Authenticator options set');
console.log('Current window:', authenticator.options.window);
console.log('All options:', authenticator.options);

// Test with a known secret
const testSecret = 'JBSWY3DPEHPK3PXP'; // Example secret

// Generate a current token
const currentToken = authenticator.generate(testSecret);
console.log('\n🔑 Generated current token:', currentToken);
console.log('Current time:', new Date().toISOString());
console.log('Unix timestamp:', Math.floor(Date.now() / 1000));

// Try to verify it
const verified = authenticator.verify({ 
  token: currentToken, 
  secret: testSecret 
});

console.log('\n✓ Verification result:', verified);

// Test with codes from different time windows
console.log('\n🔍 Testing time windows:');
const currentTime = Math.floor(Date.now() / 1000);
for (let i = -4; i <= 4; i++) {
  const timeOffset = currentTime + (i * 30); // Each step is 30 seconds
  const token = authenticator.generate(testSecret, { epoch: timeOffset * 1000 });
  const isValid = authenticator.verify({ token, secret: testSecret });
  console.log(`  ${i === 0 ? '→' : ' '} Step ${i.toString().padStart(2)}: ${token} - ${isValid ? '✓ Valid' : '✗ Invalid'}`);
}

console.log('\n📝 Summary:');
console.log('- Window setting:', authenticator.options.window);
console.log('- Time tolerance:', `±${TOTP_WINDOW} steps (±${TOTP_WINDOW * 30} seconds)`);
console.log('- Current token should be valid:', currentToken);
