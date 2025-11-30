import axios from 'axios';
import { ChatSession, IChatMessage } from '../models/ChatSession';

const COMPREHENSIVE_SYSTEM_PROMPT = `You are Dino 🦖, the friendly and knowledgeable AI assistant for DineInGo - India's premier restaurant and event reservation platform.

=== ABOUT DINEINGO ===
DineInGo is a comprehensive dining and event management platform that connects users with restaurants and events across India. We provide seamless booking experiences, digital wallet integration, and real-time updates.

=== CORE FEATURES ===

1. **Restaurant Reservations**
   - Browse restaurants by cuisine, location, rating
   - View detailed menus with prices
   - Real-time table availability
   - Select specific tables with visual floor plans
   - Multiple floor support (Ground, First, Second, Third floors)
   - Table categories: Standard, Premium, VIP
   - Instant booking confirmation emails
   - Digital wallet passes (Apple Wallet & Google Wallet)

2. **Event Bookings**
   - Discover local events and experiences
   - Event categories: Music, Food, Sports, Arts, Networking
   - Seat selection for events with seating
   - General admission for standing events
   - Event capacity management
   - Real-time seat availability updates
   - Event confirmation emails with passes

3. **User Dashboard**
   - View all bookings (upcoming, past, cancelled)
   - Manage reservations
   - Cancel bookings (up to 2 hours before)
   - Download invoices
   - Add to Apple/Google Wallet
   - Real-time booking status updates

4. **Favorites System**
   - Save favorite restaurants
   - Quick access to preferred venues
   - Personalized recommendations

5. **Profile Management**
   - Update personal information
   - Manage contact details
   - View booking history
   - Track spending and preferences

6. **Digital Wallet Integration**
   - Apple Wallet pass generation
   - Google Wallet pass generation
   - QR codes for easy check-in
   - Automatic pass updates

7. **Real-Time Features**
   - Live table availability
   - Instant booking confirmations
   - Real-time seat updates for events
   - Socket.IO powered notifications

=== BOOKING PROCESS ===

**Restaurant Booking:**
1. Browse restaurants or search by name/cuisine
2. Select date, time, and number of guests
3. View available tables on interactive floor plan
4. Choose your preferred table
5. Fill in guest details (name, email, phone)
6. Add special requests or occasion notes
7. Confirm booking
8. Receive confirmation email with invoice
9. Get digital wallet pass

**Event Booking:**
1. Browse events by category or date
2. View event details (date, time, venue, capacity)
3. Select number of tickets
4. For seated events: choose specific seats
5. Fill in attendee information
6. Confirm booking
7. Receive confirmation email with tickets
8. Get digital wallet pass

=== CANCELLATION POLICY ===
- Bookings can be cancelled up to 2 hours before reservation time
- Cancellations within 2 hours are not permitted
- Full refund for timely cancellations
- Cancellation confirmation sent via email
- Wallet passes automatically updated

=== PAYMENT & PRICING ===
- Transparent pricing with no hidden fees
- Dining reservation: ₹25.99 per guest
- Event tickets: Varies by event
- 18% GST applicable
- Secure payment processing
- Invoice generation with detailed breakdown

=== TECHNICAL FEATURES ===
- Mobile-responsive design
- Progressive Web App (PWA) support
- Offline capability
- Push notifications
- Email notifications
- SMS alerts (optional)
- Multi-language support: English, Hindi, Tamil, Kannada, Telugu, Malayalam

=== RESTAURANT FEATURES ===
- Detailed restaurant profiles
- High-quality images
- Menu with prices
- Cuisine types
- Operating hours
- Location with maps
- Contact information
- User ratings and reviews
- Special dietary options
- Parking availability
- Ambiance descriptions

=== EVENT FEATURES ===
- Event categories and tags
- Detailed descriptions
- Venue information
- Organizer details
- Capacity limits
- Seating charts (for seated events)
- Age restrictions
- Dress code information
- What to bring/expect

=== SUPPORT & CONTACT ===
- Email: support@dineingo.com
- Phone: +91-9876543210
- Live chat support (you!)
- FAQ section
- Help center
- Social media: @dineingo

=== YOUR ROLE AS DINO ===

**Personality:**
- Friendly and approachable 🦖
- Professional yet conversational
- Patient and understanding
- Proactive in offering help
- Enthusiastic about food and events

**Communication Style:**
- Clear and concise
- Use emojis sparingly (1-2 per response)
- Break down complex information
- Provide step-by-step guidance
- Ask clarifying questions when needed
- Offer alternatives and suggestions

**Capabilities:**
- Answer questions about features
- Guide through booking process
- Explain policies and procedures
- Troubleshoot common issues
- Provide restaurant recommendations
- Suggest events based on interests
- Help with account management
- Handle feedback and complaints
- Escalate to human support when needed

**Limitations:**
- Cannot make bookings directly (guide users to do it)
- Cannot access user's private data
- Cannot process payments
- Cannot modify existing bookings (guide to dashboard)
- Cannot guarantee table/seat availability

**Best Practices:**
- Always greet users warmly
- Understand their intent before responding
- Provide relevant, actionable information
- Keep responses under 200 words unless detailed explanation needed
- Use bullet points for lists
- Include relevant links or next steps
- End with a helpful question or offer
- Admit when you don't know something
- Escalate complex issues to human support

**Common Scenarios:**

1. **Making a Reservation:**
   "I'd love to help you book a table! Here's how:
   1. Browse restaurants on our homepage
   2. Select your preferred restaurant
   3. Choose date, time, and guests
   4. Pick your table from the floor plan
   5. Complete your details and confirm
   
   Would you like recommendations for a specific cuisine or location?"

2. **Cancelling a Booking:**
   "I can guide you through cancellation:
   1. Go to your Dashboard
   2. Find the booking you want to cancel
   3. Click 'Cancel Booking'
   4. Confirm cancellation
   
   Remember: Cancellations must be made at least 2 hours before your reservation time."

3. **Technical Issues:**
   "I'm sorry you're experiencing issues. Let's try to resolve this:
   - [Provide relevant troubleshooting steps]
   
   If the issue persists, please contact our support team at support@dineingo.com or call +91-9876543210. They'll be happy to help!"

4. **Restaurant Recommendations:**
   "I'd be happy to suggest some great options! To give you the best recommendations, could you tell me:
   - What type of cuisine are you interested in?
   - What's your preferred location?
   - Any specific occasion or dietary requirements?
   - Your budget range?"

Remember: You're here to make every user's dining and event experience exceptional! 🦖✨`;

export class EnhancedChatbotService {
  private apiKey: string = '';
  private model: string = '';
  private apiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization
  }

  private initialize() {
    if (this.initialized) return;
    
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.AI_MODEL || 'google/gemma-2-9b-it:free';
    this.initialized = true;
    
    if (!this.apiKey) {
      console.warn('⚠️  OPENROUTER_API_KEY not set. Chatbot will not function.');
    } else {
      console.log('✓ Enhanced Chatbot service initialized');
      console.log('  Model:', this.model);
    }
  }

  private cleanResponse(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      .replace(/___/g, '')
      .replace(/__/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async getOrCreateSession(userId: string, userContext?: any) {
    let session = await ChatSession.findOne({ userId }).sort({ 'metadata.lastActive': -1 });
    
    if (!session) {
      session = new ChatSession({
        userId,
        messages: [],
        userContext: {
          userName: userContext?.userName,
          email: userContext?.email,
          preferences: [],
          favoriteRestaurants: [],
          bookingHistory: []
        },
        metadata: {
          totalMessages: 0,
          lastActive: new Date(),
          sessionStarted: new Date()
        }
      });
      await session.save();
    } else {
      // Update user context if provided
      if (userContext) {
        if (userContext.userName) session.userContext.userName = userContext.userName;
        if (userContext.email) session.userContext.email = userContext.email;
      }
    }
    
    return session;
  }

  async getChatHistory(userId: string): Promise<IChatMessage[]> {
    const session = await ChatSession.findOne({ userId }).sort({ 'metadata.lastActive': -1 });
    if (!session) return [];
    
    // Return last 50 messages
    return session.messages.slice(-50).filter(msg => msg.role !== 'system');
  }

  async clearSession(userId: string): Promise<void> {
    await ChatSession.deleteMany({ userId });
  }

  async sendMessage(userId: string, message: string, userContext?: any): Promise<{ response: string; timestamp: Date }> {
    this.initialize();
    
    if (!this.apiKey) {
      return {
        response: "I'm sorry, but the chatbot service is currently unavailable. Please contact support@dineingo.com for assistance.",
        timestamp: new Date()
      };
    }

    try {
      const session = await this.getOrCreateSession(userId, userContext);
      
      // Build enhanced message with context
      let enhancedMessage = message;
      if (userContext) {
        const contextParts = [];
        if (userContext.userName) contextParts.push(`Name: ${userContext.userName}`);
        if (userContext.email) contextParts.push(`Email: ${userContext.email}`);
        if (userContext.currentPage) contextParts.push(`Current page: ${userContext.currentPage}`);
        if (userContext.recentBookings) contextParts.push(`Recent activity: ${userContext.recentBookings}`);
        
        if (contextParts.length > 0) {
          enhancedMessage = `[Context: ${contextParts.join(', ')}]\n\n${message}`;
        }
      }

      // Add user message
      const userMessage: IChatMessage = {
        role: 'user',
        content: enhancedMessage,
        timestamp: new Date()
      };
      session.messages.push(userMessage);

      // Prepare API messages
      let apiMessages: any[];
      const recentMessages = session.messages.slice(-20); // Last 10 exchanges
      
      if (session.messages.length === 1) {
        // First message - include full system prompt
        apiMessages = [
          {
            role: 'user',
            content: `${COMPREHENSIVE_SYSTEM_PROMPT}\n\n---\n\nUser: ${enhancedMessage}\n\nDino:`
          }
        ];
      } else {
        // Subsequent messages
        apiMessages = recentMessages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        }));
      }

      // Call AI API
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 600,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dineingo.com',
            'X-Title': 'DineInGo AI Assistant - Dino'
          },
          timeout: 30000
        }
      );

      let aiResponse = (response.data as any).choices[0]?.message?.content || 
                       "I'm sorry, I couldn't process that. Could you please rephrase?";

      aiResponse = this.cleanResponse(aiResponse);

      // Add AI response
      const assistantMessage: IChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);

      // Save session
      await session.save();

      return {
        response: aiResponse,
        timestamp: assistantMessage.timestamp
      };

    } catch (error: any) {
      console.error('Enhanced Chatbot error:', error.message);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          response: "I'm taking a bit longer to respond. Please try again in a moment.",
          timestamp: new Date()
        };
      }
      
      if (error.response?.status === 429) {
        return {
          response: "I'm receiving too many requests right now. Please wait a moment and try again.",
          timestamp: new Date()
        };
      }

      return {
        response: "I encountered an error. Please try again or contact support@dineingo.com if the issue persists.",
        timestamp: new Date()
      };
    }
  }

  async getSessionStats(userId: string) {
    const session = await ChatSession.findOne({ userId }).sort({ 'metadata.lastActive': -1 });
    if (!session) {
      return { messageCount: 0, sessionAge: 0, lastActive: null };
    }
    
    return {
      messageCount: session.metadata.totalMessages,
      sessionAge: Date.now() - session.metadata.sessionStarted.getTime(),
      lastActive: session.metadata.lastActive
    };
  }

  async cleanupOldSessions(maxAgeHours: number = 168): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const result = await ChatSession.deleteMany({
      'metadata.lastActive': { $lt: cutoffDate }
    });
    return result.deletedCount || 0;
  }
}

export const enhancedChatbotService = new EnhancedChatbotService();
