#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps developers set up their .env files securely
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnv() {
  console.log('\n🔐 DineInGo Environment Setup\n');
  console.log('This script will help you set up your environment variables securely.\n');

  // Check if .env files already exist
  const frontendEnvExists = fs.existsSync(path.join(__dirname, '../.env'));
  const backendEnvExists = fs.existsSync(path.join(__dirname, '../backend/.env'));

  if (frontendEnvExists || backendEnvExists) {
    console.log('⚠️  Warning: .env files already exist!');
    const overwrite = await question('Do you want to overwrite them? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Frontend Configuration\n');

  const frontendConfig = {
    VITE_API_URL: await question('API URL (default: http://localhost:5000/api): ') || 'http://localhost:5000/api',
    VITE_GOOGLE_MAPS_API_KEY: await question('Google Maps API Key (optional): ') || '',
    VITE_MAPBOX_API_KEY: await question('Mapbox API Key (optional): ') || '',
    VITE_FIREBASE_API_KEY: await question('Firebase API Key: ') || '',
    VITE_FIREBASE_AUTH_DOMAIN: await question('Firebase Auth Domain: ') || '',
    VITE_FIREBASE_PROJECT_ID: await question('Firebase Project ID: ') || '',
    VITE_FIREBASE_STORAGE_BUCKET: await question('Firebase Storage Bucket: ') || '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: await question('Firebase Messaging Sender ID: ') || '',
    VITE_FIREBASE_APP_ID: await question('Firebase App ID: ') || '',
    VITE_FIREBASE_MEASUREMENT_ID: await question('Firebase Measurement ID (optional): ') || ''
  };

  console.log('\n📝 Backend Configuration\n');

  const backendConfig = {
    MONGODB_URI: await question('MongoDB URI: ') || '',
    EMAIL_USER: await question('Gmail Email: ') || '',
    EMAIL_PASS: await question('Gmail App Password: ') || '',
    PORT: await question('Server Port (default: 5000): ') || '5000',
    NODE_ENV: 'development',
    JWT_SECRET: require('crypto').randomBytes(32).toString('hex'),
    ADMIN_CODE: await question('Admin Code (default: 492731): ') || '492731',
    CORS_ORIGINS: await question('CORS Origins (default: http://localhost:5173): ') || 'http://localhost:5173'
  };

  // Write frontend .env
  const frontendEnvContent = Object.entries(frontendConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(path.join(__dirname, '../.env'), frontendEnvContent);
  console.log('\n✅ Frontend .env file created');

  // Write backend .env
  const backendEnvContent = Object.entries(backendConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(path.join(__dirname, '../backend/.env'), backendEnvContent);
  console.log('✅ Backend .env file created');

  console.log('\n🎉 Setup complete!');
  console.log('\n⚠️  Important Security Notes:');
  console.log('1. Never commit .env files to Git');
  console.log('2. Keep your API keys and secrets private');
  console.log('3. Use different credentials for production');
  console.log('4. Regularly rotate your secrets');
  console.log('\n📖 Read SECURITY.md for more information\n');

  rl.close();
}

setupEnv().catch(error => {
  console.error('Error during setup:', error);
  rl.close();
  process.exit(1);
});
