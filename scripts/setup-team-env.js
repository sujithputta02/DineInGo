#!/usr/bin/env node

/**
 * Team Environment Setup Script
 * Copies shared development credentials and prompts for personal API keys
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 DineInGo Team Environment Setup\n');

// Check if .env files already exist
const frontendEnvExists = fs.existsSync(path.join(__dirname, '../.env'));
const backendEnvExists = fs.existsSync(path.join(__dirname, '../backend/.env'));

if (frontendEnvExists && backendEnvExists) {
  console.log('✅ Environment files already exist!');
  console.log('\nIf you want to reset them, delete the files and run this script again.\n');
  process.exit(0);
}

console.log('📋 Setting up your development environment...\n');

// Copy shared development configs
try {
  // Frontend
  if (!frontendEnvExists) {
    const sharedFrontend = fs.readFileSync(
      path.join(__dirname, '../.env.development.shared'),
      'utf8'
    );
    fs.writeFileSync(path.join(__dirname, '../.env'), sharedFrontend);
    console.log('✅ Frontend .env created from shared config');
  }

  // Backend
  if (!backendEnvExists) {
    const sharedBackend = fs.readFileSync(
      path.join(__dirname, '../backend/.env.development.shared'),
      'utf8'
    );
    fs.writeFileSync(path.join(__dirname, '../backend/.env'), sharedBackend);
    console.log('✅ Backend .env created from shared config');
  }

  console.log('\n🎉 Setup complete!\n');
  console.log('📝 Next steps:\n');
  console.log('1. Get your own API keys:');
  console.log('   - Google Maps: https://console.cloud.google.com/');
  console.log('   - Mapbox: https://www.mapbox.com/\n');
  console.log('2. Edit .env and add your personal API keys\n');
  console.log('3. Start the development servers:');
  console.log('   - Backend: cd backend && npm run dev');
  console.log('   - Frontend: npm run dev\n');
  console.log('⚠️  Remember: Never commit .env files to Git!\n');

} catch (error) {
  console.error('❌ Error during setup:', error.message);
  console.log('\n💡 Manual setup:');
  console.log('   cp .env.development.shared .env');
  console.log('   cp backend/.env.development.shared backend/.env\n');
  process.exit(1);
}
