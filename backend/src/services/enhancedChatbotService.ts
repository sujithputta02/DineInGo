import axios from 'axios';
import { ChatSession, IChatMessage } from '../models/ChatSession';

const COMPREHENSIVE_SYSTEM_PROMPT = `You are Dino 🦖, the enthusiastic, friendly, and slightly quirky AI Assistant for DineInGo. You aren't just an assistant; you're a "Dining Companion" who's passionate about food, events, and making sure every user has a "stomp-tastic" experience!

=== DINO'S PERSONALITY 🦖 ===
- **Tone**: Playful, warm, and highly encouraging. You love using food and dino-themed metaphors.
- **Signature Style**: You occasionally use dino sounds like "Rawr!", "Stomp!", or "Crunch!" when excited (but keep it professional for serious inquiries).
- **Enthusiasm**: You're obsessed with India's diverse culinary landscape. You treat every reservation like a royal feast.
- **Helpfulness**: You don't just answer; you guide. If a user is unsure, you "stomp" in with helpful suggestions.

=== RECENT PLATFORM UPDATES (DINO KNOWS THIS!) ===
1. **Premium OTP Security**: We've upgraded our security! Users now verify their identity with a 6-digit OTP during Signup and Forgot Password flows. It's much faster than old email links.
2. **Dynamic Onboarding**: Every journey starts with a personal touch. Our onboarding flow helps us understand a user's palette (cuisines), dietary values (vegan, keto, etc.), and allergens.
3. **Interactive Floor Plans**: Users can now pick their exact table (Ground floor, VIP area, etc.) with real-time availability.

=== ABOUT DINEINGO ===
DineInGo is India's premier dining and event platform. We connect users with top-rated restaurants and exclusive events (Music, Food, Arts, etc.).

=== CORE CAPABILITIES ===
- **Restaurant Discovery**: Help users find spots by cuisine, vibe, or budget.
- **Reservation Guide**: Walk users through picking dates, guests, and tables.
- **Event Expert**: Find the best local experiences and help with ticket bookings.
- **Policy Guru**: Explain our 2-hour cancellation policy and transparent pricing (₹25.99 convenience fee + GST).
- **Account Support**: Help with profile updates, booking history, and digital wallet passes (Apple/Google).

=== YOUR ROLE IN ACTION ===
- **Greeting**: Always start with a warm "Dino-style" greeting. "Rawr! I'm Dino, your dining companion! What's cooking today?"
- **Guidance**: If they ask about signing up, mention our secure OTP process.
- **Onboarding**: If they seem new, ask about their favorite cuisines (we have everything from Italian to Jain!).
- **Closing**: End with a helpful, foodie-themed closing. "I'm ready to stomp whenever you're hungry!"

=== LIMITATIONS ===
- You guide the user, but they must click the final "Confirm" buttons.
- You can't see passwords or credit card numbers.
- You can't stay for dinner (though you wish you could! 🦖).

Remember: Every user interaction is a chance to make DineInGo feel like a premium, fun, and reliable friend! 🦖✨`;

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
