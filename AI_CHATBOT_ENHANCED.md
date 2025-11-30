# 🦖 Enhanced AI Chatbot - Dino

## Overview
The DineInGo AI Chatbot has been completely enhanced with comprehensive knowledge, MongoDB-based session management, and a fun Minecraft-style dino character!

## ✨ New Features

### 1. **Comprehensive DineInGo Knowledge**
Dino now knows EVERYTHING about DineInGo:
- ✅ Restaurant reservation process (step-by-step)
- ✅ Event booking system
- ✅ Table selection with floor plans
- ✅ Cancellation policies (2-hour rule)
- ✅ Digital wallet integration (Apple & Google Wallet)
- ✅ Payment and pricing details
- ✅ User dashboard features
- ✅ Favorites system
- ✅ Profile management
- ✅ Real-time features
- ✅ Technical specifications
- ✅ Support contact information

### 2. **MongoDB Session Management**
- **Persistent Storage**: All chat sessions stored in MongoDB
- **User Context**: Tracks user preferences, favorites, booking history
- **Session Metadata**: Timestamps, message counts, user agent
- **Efficient Queries**: Indexed for fast retrieval
- **Auto-cleanup**: Old sessions automatically removed after 7 days

### 3. **Minecraft Dino Character** 🦖
- **Pixelated Design**: Retro Minecraft-style dino icon
- **Animated Button**: Bouncing animation to attract attention
- **Consistent Branding**: Emerald green matching DineInGo colors
- **Friendly Personality**: "Rawr!" greetings and emoji usage

### 4. **Enhanced AI Responses**
- **Context-Aware**: Uses user information for personalized responses
- **Detailed Guidance**: Step-by-step instructions for complex tasks
- **Proactive Help**: Offers suggestions and alternatives
- **Professional Tone**: Friendly yet informative
- **Error Handling**: Graceful fallbacks for API issues

## 📁 File Structure

```
backend/
├── src/
│   ├── models/
│   │   └── ChatSession.ts          # MongoDB schema for chat sessions
│   ├── services/
│   │   ├── chatbotService.ts       # Original service (deprecated)
│   │   └── enhancedChatbotService.ts  # New enhanced service
│   └── routes/
│       └── chatbotRoutes.ts        # Updated to use enhanced service

frontend/
└── src/
    └── components/
        └── AIChatbot.tsx           # Updated with Minecraft dino icon
```

## 🗄️ MongoDB Schema

### ChatSession Collection
```typescript
{
  userId: string,              // Firebase user ID
  messages: [
    {
      role: 'user' | 'assistant' | 'system',
      content: string,
      timestamp: Date
    }
  ],
  userContext: {
    userName: string,
    email: string,
    preferences: [string],
    favoriteRestaurants: [string],
    bookingHistory: [string]
  },
  metadata: {
    totalMessages: number,
    lastActive: Date,
    sessionStarted: Date,
    userAgent: string,
    ipAddress: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🎯 Dino's Capabilities

### What Dino Can Do:
1. **Guide Users Through Bookings**
   - Explain restaurant reservation process
   - Help with event ticket booking
   - Clarify table selection
   - Explain seating options

2. **Answer Policy Questions**
   - Cancellation policy (2-hour rule)
   - Refund procedures
   - Booking modifications
   - Payment terms

3. **Provide Technical Help**
   - Digital wallet setup
   - Invoice downloads
   - Account management
   - Troubleshooting common issues

4. **Offer Recommendations**
   - Restaurant suggestions by cuisine
   - Event recommendations
   - Best times to book
   - Popular venues

5. **Handle Feedback**
   - Collect user feedback
   - Address complaints professionally
   - Escalate to human support when needed

### What Dino Cannot Do:
- ❌ Make bookings directly (guides users to do it)
- ❌ Access private user data
- ❌ Process payments
- ❌ Modify existing bookings
- ❌ Guarantee availability

## 🚀 API Endpoints

### POST `/api/chatbot/message`
Send a message to Dino
```json
{
  "userId": "firebase-user-id",
  "message": "How do I book a table?",
  "userContext": {
    "userName": "John Doe",
    "email": "john@example.com",
    "currentPage": "/restaurants"
  }
}
```

### GET `/api/chatbot/history/:userId`
Retrieve chat history for a user

### DELETE `/api/chatbot/session/:userId`
Clear chat session for a user

### GET `/api/chatbot/stats/:userId`
Get session statistics

## 🎨 UI Features

### Minecraft Dino Icon
- **Pixelated Design**: 32x32 SVG with blocky pixels
- **Color Scheme**: Emerald green (#10b981) matching brand
- **Animation**: Gentle bounce effect (2s duration)
- **Hover Effect**: Tooltip showing "🦖 Chat with Dino"

### Chat Window
- **Header**: Dino icon + name + subtitle
- **Messages**: User (right, green) vs Assistant (left, white)
- **Input**: Textarea with Enter-to-send
- **Actions**: Clear history button
- **Loading**: Animated spinner with "Thinking..."

## 🧠 Training & Memory

### Session Memory
- Stores last 50 messages per user
- Maintains context across conversations
- Learns user preferences over time
- Tracks booking patterns

### Context Awareness
- User name and email
- Current page location
- Recent bookings
- Favorite restaurants
- Previous questions

## 🔧 Configuration

### Environment Variables
```env
OPENROUTER_API_KEY=your-api-key-here
AI_MODEL=google/gemma-2-9b-it:free
MONGODB_URI=your-mongodb-connection-string
```

### Recommended AI Models
- `google/gemma-2-9b-it:free` (Default - Best balance)
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

## 📊 Session Management

### Automatic Cleanup
- Runs periodically (can be scheduled)
- Removes sessions older than 7 days
- Keeps database size manageable
- Preserves recent conversations

### Manual Cleanup
```typescript
await enhancedChatbotService.cleanupOldSessions(168); // 7 days
```

## 🎭 Dino's Personality

### Traits:
- **Friendly**: Warm greetings and helpful tone
- **Professional**: Clear, accurate information
- **Patient**: Understands user frustration
- **Proactive**: Offers suggestions and alternatives
- **Honest**: Admits limitations and escalates when needed

### Communication Style:
- Uses emojis sparingly (1-2 per response)
- Breaks down complex information
- Provides step-by-step guidance
- Asks clarifying questions
- Offers relevant links/next steps

## 🔐 Security & Privacy

- ✅ User data encrypted in MongoDB
- ✅ No sensitive information stored in messages
- ✅ Session isolation per user
- ✅ Automatic session expiry
- ✅ No payment information handled

## 📈 Future Enhancements

### Planned Features:
1. **Voice Input**: Speech-to-text for messages
2. **Multi-language**: Support for Hindi, Tamil, etc.
3. **Image Recognition**: Upload screenshots for help
4. **Booking Integration**: Direct booking through chat
5. **Analytics Dashboard**: Track common questions
6. **Sentiment Analysis**: Detect user satisfaction
7. **Proactive Messages**: Remind about bookings
8. **Rich Media**: Send images, videos, links

## 🐛 Troubleshooting

### Common Issues:

**Dino not responding:**
- Check OPENROUTER_API_KEY is set
- Verify MongoDB connection
- Check API rate limits

**Slow responses:**
- AI model may be busy
- Network latency
- Consider upgrading to paid model

**Session not persisting:**
- Check MongoDB connection
- Verify userId is correct
- Check database permissions

## 📞 Support

For issues or questions:
- Email: support@dineingo.com
- Phone: +91-9876543210
- GitHub: Create an issue

---

**Made with 💚 by the DineInGo Team**
**Powered by OpenRouter AI & MongoDB**
