#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * 
 * This script tests your MongoDB Atlas connection and helps diagnose issues.
 * Run with: node test-mongodb-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

console.log('================================================================================');
console.log('          MONGODB CONNECTION DIAGNOSTIC TEST');
console.log('================================================================================\n');

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Mask password in URI for display
const displayUri = MONGODB_URI.replace(/:[^:@]+@/, ':****@');
console.log('🔗 Connection URI:', displayUri);
console.log('');

// Test with improved settings
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

console.log('⏳ Attempting to connect to MongoDB Atlas...\n');

const startTime = Date.now();

mongoose.connect(MONGODB_URI, options)
  .then(async () => {
    const duration = Date.now() - startTime;
    console.log('✅ SUCCESS: Connected to MongoDB Atlas');
    console.log(`⏱️  Connection time: ${duration}ms\n`);

    // Test database ping
    console.log('🏓 Testing database responsiveness...');
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingDuration = Date.now() - pingStart;
    console.log(`✅ Database responded in ${pingDuration}ms\n`);

    // Get database info
    console.log('📊 Database Information:');
    console.log('   - Database Name:', mongoose.connection.db.databaseName);
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Ready State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   - Collections: ${collections.length} found`);
    console.log('');

    console.log('================================================================================');
    console.log('✅ ALL TESTS PASSED - MongoDB connection is working correctly!');
    console.log('================================================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    const duration = Date.now() - startTime;
    
    console.log('================================================================================');
    console.log('❌ CONNECTION FAILED');
    console.log('================================================================================\n');
    
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error(`Time elapsed: ${duration}ms\n`);

    console.log('🔍 TROUBLESHOOTING STEPS:\n');

    if (error.name === 'MongoServerSelectionError') {
      console.log('1. CHECK NETWORK CONNECTION:');
      console.log('   - Ensure you have stable internet');
      console.log('   - Try: ping google.com\n');

      console.log('2. CHECK MONGODB ATLAS IP WHITELIST:');
      console.log('   - Go to: https://cloud.mongodb.com');
      console.log('   - Navigate to: Security > Network Access');
      console.log('   - Add your current IP address or use 0.0.0.0/0 (allow all) for testing');
      console.log('   - Your current IP might have changed if you\'re on dynamic IP\n');

      console.log('3. VERIFY CONNECTION STRING:');
      console.log('   - Check username and password are correct');
      console.log('   - Ensure no special characters need URL encoding');
      console.log('   - Verify database name is correct\n');

      console.log('4. CHECK MONGODB ATLAS STATUS:');
      console.log('   - Visit: https://status.mongodb.com');
      console.log('   - Ensure Atlas services are operational\n');
    }

    if (error.name === 'MongoParseError') {
      console.log('⚠️  CONNECTION STRING FORMAT ERROR:');
      console.log('   - Your MONGODB_URI format is invalid');
      console.log('   - Expected format: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority\n');
    }

    console.log('5. TEMPORARY WORKAROUND:');
    console.log('   - If IP whitelist is the issue, add 0.0.0.0/0 to allow all IPs (for testing only!)');
    console.log('   - Don\'t forget to restrict it later for security\n');

    console.log('================================================================================\n');

    process.exit(1);
  });

// Handle timeout
setTimeout(() => {
  console.log('\n⏱️  CONNECTION TIMEOUT (60 seconds)');
  console.log('This usually indicates:');
  console.log('  - Network connectivity issues');
  console.log('  - IP address not whitelisted in MongoDB Atlas');
  console.log('  - Firewall blocking outbound connections on port 27017\n');
  process.exit(1);
}, 60000);
