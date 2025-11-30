# 🦖 Chatbot Setup Instructions

## Quick Start

To initialize the enhanced chatbot system and create the MongoDB collection, follow these steps:

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies (if not already done)
```bash
npm install
```

### 3. Ensure Environment Variables are Set
Make sure your `backend/.env` file has:
```env
MONGODB_URI=your_mongodb_connection_string_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_MODEL=google/gemma-2-9b-it:free
```

**Note**: Replace the placeholder values with your actual credentials. Never commit these values to Git!

### 4. Run the Chatbot Initialization Script
```bash
npm run init:chatbot
```

This will:
- ✅ Connect to MongoDB
- ✅ Create the `chatsessions` collection
- ✅ Add necessary indexes
- ✅ Create a test session
- ✅ Test the AI chatbot service
- ✅ Verify everything is working
- ✅ Clean up test data

### 5. Verify in MongoDB

After running the script, you should see:
- A new collection called `chatsessions` in your MongoDB database
- Indexes on `userId` and `metadata.lastActive`
- The collection will be empty (test data is cleaned up)

### 6. Start Your Backend Server
```bash
npm run dev
```

### 7. Test the Chatbot

Open your frontend application and:
1. Log in as a user
2. Click the bouncing Dino button (bottom-right)
3. Send a message like "How do I book a table?"
4. Dino should respond with detailed instructions

### 8. Verify Collection in MongoDB

Go back to MongoDB and refresh - you should now see:
- Documents in the `chatsessions` collection
- Each document contains user messages and AI responses
- User context and metadata

## What Gets Created

### MongoDB Collection: `chatsessions`

**Structure:**
```javascript
{
  _id: ObjectId,
  userId: "firebase-user-id",
  messages: [
    {
      role: "user" | "assistant" | "system",
      content: "message text",
      timestamp: ISODate
    }
  ],
  userContext: {
    userName: "User Name",
    email: "user@email.com",
    preferences: ["Italian", "Chinese"],
    favoriteRestaurants: ["restaurant-id-1"],
    bookingHistory: ["booking-id-1"]
  },
  metadata: {
    totalMessages: 5,
    lastActive: ISODate,
    sessionStarted: ISODate,
    userAgent: "Mozilla/5.0...",
    ipAddress: "192.168.1.1"
  },
  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes:**
- `userId` (ascending)
- `metadata.lastActive` (descending)
- Compound index on both for efficient queries

## Troubleshooting

### Issue: "MONGODB_URI not found"
**Solution:** Make sure your `.env` file exists in the `backend` directory and contains the MongoDB connection string.

### Issue: "OPENROUTER_API_KEY not found"
**Solution:** Add your OpenRouter API key to the `.env` file. The chatbot will still work but won't be able to generate AI responses.

### Issue: "Collection not appearing in MongoDB"
**Solution:** 
1. Run the init script: `npm run init:chatbot`
2. Refresh your MongoDB interface
3. Make sure you're looking at the correct database (`dineingoapp`)

### Issue: "Chatbot not responding"
**Solution:**
1. Check backend console for errors
2. Verify OPENROUTER_API_KEY is valid
3. Check network connectivity
4. Try clearing the chat and sending a new message

### Issue: "Cannot find module 'axios'"
**Solution:**
```bash
cd backend
npm install axios
```

## Manual Collection Creation (Alternative)

If the script doesn't work, you can manually create the collection:

1. Open MongoDB Compass or Atlas
2. Navigate to your `dineingoapp` database
3. Click "Create Collection"
4. Name it: `chatsessions`
5. Click "Create"

Then create indexes:
```javascript
// In MongoDB shell or Compass
db.chatsessions.createIndex({ userId: 1 })
db.chatsessions.createIndex({ "metadata.lastActive": -1 })
db.chatsessions.createIndex({ userId: 1, "metadata.lastActive": -1 })
```

## Testing the Chatbot

### Test Questions to Ask Dino:

1. **Booking Questions:**
   - "How do I book a table?"
   - "Can I select a specific table?"
   - "What's the cancellation policy?"

2. **Event Questions:**
   - "How do I book event tickets?"
   - "Can I choose my seat for events?"
   - "What types of events are available?"

3. **Account Questions:**
   - "How do I update my profile?"
   - "Where can I see my bookings?"
   - "How do I add a restaurant to favorites?"

4. **Technical Questions:**
   - "How do I add to Apple Wallet?"
   - "Where can I download my invoice?"
   - "How do I get notifications?"

5. **General Questions:**
   - "What is DineInGo?"
   - "What features do you offer?"
   - "How do I contact support?"

## Expected Behavior

### First Message:
Dino should greet you with:
```
🦖 Rawr! Hello! I'm Dino, your friendly DineInGo assistant. I'm here to help you with:

• 🍽️ Making restaurant reservations
• 🎉 Booking events
• 📍 Finding the perfect dining spot
• 👤 Account management
• ❓ Answering your questions
• 💬 Handling feedback

I know everything about DineInGo - from table bookings to event tickets, cancellation policies to digital wallet passes. How can I assist you today?
```

### Subsequent Messages:
- Detailed, helpful responses
- Step-by-step instructions
- Relevant information about DineInGo features
- Professional yet friendly tone
- Occasional emoji usage (1-2 per response)

## Monitoring

### Check Session Count:
```bash
# In MongoDB shell
db.chatsessions.countDocuments()
```

### View Recent Sessions:
```bash
# In MongoDB shell
db.chatsessions.find().sort({ "metadata.lastActive": -1 }).limit(10)
```

### Check Session for Specific User:
```bash
# In MongoDB shell
db.chatsessions.find({ userId: "your-user-id" })
```

## Cleanup

### Remove Old Sessions (7+ days):
The system automatically cleans up old sessions, but you can manually trigger it:

```bash
# In MongoDB shell
db.chatsessions.deleteMany({
  "metadata.lastActive": {
    $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
})
```

## Success Indicators

✅ Collection `chatsessions` exists in MongoDB
✅ Indexes are created
✅ Dino button appears (bottom-right, bouncing)
✅ Chat window opens when clicked
✅ Messages are sent and received
✅ Responses are relevant and helpful
✅ Session persists across page refreshes
✅ Chat history loads correctly

## Support

If you encounter any issues:
1. Check the backend console for errors
2. Check the browser console for frontend errors
3. Verify MongoDB connection
4. Verify API keys are correct
5. Contact: support@dineingo.com

---

**Made with 💚 by the DineInGo Team**
