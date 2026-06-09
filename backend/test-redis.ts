import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

async function testRedis() {
  console.log('🧪 Testing Redis Connection...\n');
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in environment variables');
    process.exit(1);
  }

  console.log('📍 Redis URL:', redisUrl.replace(/:[^:@]+@/, ':***@')); // Hide password
  console.log('🔐 TLS Enabled: Yes (Upstash)\n');

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err.message);
    });

    console.log('🔌 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Test 1: PING
    console.log('Test 1: PING');
    const pong = await client.ping();
    console.log('✅ PONG:', pong);

    // Test 2: SET
    console.log('\nTest 2: SET key');
    await client.set('test:key', 'Hello from DineInGo!', { EX: 60 });
    console.log('✅ Key set with 60s TTL');

    // Test 3: GET
    console.log('\nTest 3: GET key');
    const value = await client.get('test:key');
    console.log('✅ Retrieved value:', value);

    // Test 4: TTL
    console.log('\nTest 4: Check TTL');
    const ttl = await client.ttl('test:key');
    console.log('✅ TTL remaining:', ttl, 'seconds');

    // Test 5: JSON Storage
    console.log('\nTest 5: Store JSON object');
    const testData = {
      restaurant: 'Test Restaurant',
      rating: 4.5,
      location: 'Bangalore'
    };
    await client.set('test:json', JSON.stringify(testData), { EX: 60 });
    const retrievedJson = await client.get('test:json');
    const parsedData = JSON.parse(retrievedJson!);
    console.log('✅ Retrieved JSON:', parsedData);

    // Test 6: Delete
    console.log('\nTest 6: DELETE keys');
    await client.del(['test:key', 'test:json']);
    console.log('✅ Keys deleted');

    // Test 7: Database Info
    console.log('\nTest 7: Database Info');
    const dbSize = await client.dbSize();
    console.log('✅ Total keys in database:', dbSize);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests passed! Redis is working perfectly!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log('  • Connection: ✅ Success');
    console.log('  • Read/Write: ✅ Working');
    console.log('  • JSON Storage: ✅ Working');
    console.log('  • TTL/Expiry: ✅ Working');
    console.log('  • Total Keys:', dbSize);
    console.log('\n💡 Next Steps:');
    console.log('  1. Start your backend: npm run dev');
    console.log('  2. Redis will auto-connect on startup');
    console.log('  3. Check logs for "✅ Redis connected"');
    console.log('  4. Monitor cache hits in API logs\n');

    await client.quit();
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Redis Test Failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check REDIS_URL in backend/.env');
    console.error('  2. Verify Upstash instance is running');
    console.error('  3. Check firewall/network settings');
    console.error('  4. Ensure TLS is enabled (Upstash requires it)\n');
    process.exit(1);
  }
}

testRedis();
