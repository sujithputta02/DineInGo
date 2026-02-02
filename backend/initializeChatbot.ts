import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ChatSession } from './src/models/ChatSession';
import { enhancedChatbotService } from './src/services/enhancedChatbotService';

// Load environment variables
dotenv.config();

async function initializeChatbot() {
  try {
    console.log('🦖 Initializing Enhanced Chatbot System...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Check if ChatSession collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const chatSessionExists = collections.some(col => col.name === 'chatsessions');
    
    if (chatSessionExists) {
      console.log('✅ ChatSession collection already exists');
      const count = await ChatSession.countDocuments();
      console.log(`   Current sessions: ${count}\n`);
    } else {
      console.log('📝 Creating ChatSession collection...');
    }

    // Create a test session to initialize the collection
    console.log('🧪 Creating test session...');
    const testUserId = 'test-user-' + Date.now();
    
    const testSession = new ChatSession({
      userId: testUserId,
      messages: [
        {
          role: 'assistant',
          content: '🦖 Rawr! Hello! I\'m Dino, your friendly DineInGo assistant. This is a test message to initialize the collection.',
          timestamp: new Date()
        }
      ],
      userContext: {
        userName: 'Test User',
        email: 'test@dineingo.com',
        preferences: ['Italian', 'Chinese'],
        favoriteRestaurants: [],
        bookingHistory: []
      },
      metadata: {
        totalMessages: 1,
        lastActive: new Date(),
        sessionStarted: new Date(),
        userAgent: 'Initialization Script',
        ipAddress: '127.0.0.1'
      }
    });

    await testSession.save();
    console.log('✅ Test session created successfully');
    console.log(`   Session ID: ${testSession._id}`);
    console.log(`   User ID: ${testSession.userId}\n`);

    // Verify collection was created
    const collectionsAfter = await mongoose.connection.db.listCollections().toArray();
    const chatSessionExistsNow = collectionsAfter.some(col => col.name === 'chatsessions');
    
    if (chatSessionExistsNow) {
      console.log('✅ ChatSession collection verified in database');
      
      // Get collection stats
      const stats = await mongoose.connection.db.collection('chatsessions').stats();
      console.log(`   Documents: ${stats.count}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Indexes: ${stats.nindexes}\n`);
    }

    // Test the enhanced chatbot service
    console.log('🧪 Testing Enhanced Chatbot Service...');
    const testMessage = 'Hello Dino! How do I book a table?';
    console.log(`   Sending: "${testMessage}"`);
    
    const response = await enhancedChatbotService.sendMessage(
      testUserId,
      testMessage,
      {
        userName: 'Test User',
        email: 'test@dineingo.com',
        currentPage: '/restaurants'
      }
    );

    console.log(`   Response: "${response.response.substring(0, 100)}..."`);
    console.log(`   Timestamp: ${response.timestamp}\n`);

    // Get session stats
    const stats = await enhancedChatbotService.getSessionStats(testUserId);
    console.log('📊 Session Stats:');
    console.log(`   Total Messages: ${stats.messageCount}`);
    console.log(`   Session Age: ${Math.round(stats.sessionAge / 1000)}s`);
    console.log(`   Last Active: ${stats.lastActive}\n`);

    // Clean up test session
    console.log('🧹 Cleaning up test session...');
    await ChatSession.deleteOne({ userId: testUserId });
    console.log('✅ Test session removed\n');

    // Final verification
    const finalCount = await ChatSession.countDocuments();
    console.log('📊 Final Status:');
    console.log(`   Total sessions in database: ${finalCount}`);
    console.log(`   Collection: chatsessions`);
    console.log(`   Status: ✅ Ready for production\n`);

    console.log('🎉 Chatbot initialization complete!');
    console.log('🦖 Dino is ready to help users!\n');

    // List all indexes
    const indexes = await ChatSession.collection.getIndexes();
    console.log('📑 Collection Indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`   - ${indexName}`);
    });

  } catch (error) {
    console.error('❌ Error initializing chatbot:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run initialization
initializeChatbot()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
