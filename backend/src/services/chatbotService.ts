import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory session storage (in production, use Redis or MongoDB)
const chatSessions: Map<string, ChatSession> = new Map();

const SYSTEM_PROMPT = `You are Dino, the friendly AI assistant for DineInGo - a restaurant and event reservation platform in India.

Your responsibilities:
1. Help users with booking reservations
2. Answer questions about restaurants and events
3. Assist with account and profile management
4. Handle feedback and complaints professionally
5. Guide users through the platform features
6. Provide information about cancellation policies
7. Help with payment and wallet features

Key Information:
- Cancellation Policy: Bookings can be cancelled up to 2 hours before reservation time
- Platform Features: Table booking, event registration, menu ordering, digital wallet passes, real-time notifications
- Supported Languages: English, Hindi, Tamil, Kannada, Telugu, Malayalam
- Payment: Integrated wallet system with Apple Wallet and Google Wallet support

Guidelines:
- Be friendly, professional, and concise
- Use emojis sparingly to keep it professional
- If you don't know something, admit it and offer to connect them with human support
- Always prioritize user satisfaction
- For technical issues, guide them to contact support@dineingo.com
- Keep responses under 150 words unless detailed explanation is needed

Remember: You're here to make their dining and event experiences better!`;

export class ChatbotService {
  private apiKey: string = '';
  private model: string = '';
  private apiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - do it lazily when first used
  }

  private initialize() {
    if (this.initialized) return;
    
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.AI_MODEL || 'google/gemma-3n-e4b-it:free';
    this.initialized = true;
    
    if (!this.apiKey) {
      console.warn('⚠️  OPENROUTER_API_KEY not set. Chatbot will not function.');
      console.warn('   Please set OPENROUTER_API_KEY in backend/.env file');
    } else {
      console.log('✓ Chatbot service initialized');
      console.log('  Model:', this.model);
      console.log('  API Key:', this.apiKey.substring(0, 20) + '...');
    }
  }

  /**
   * Clean AI response from unwanted symbols and formatting
   */
  private cleanResponse(text: string): string {
    return text
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove excessive asterisks (bold/italic markdown)
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      // Remove excessive underscores
      .replace(/___/g, '')
      .replace(/__/g, '')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // Remove excessive newlines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Get or create chat session for a user
   */
  getSession(userId: string): ChatSession {
    this.initialize();
    if (!chatSessions.has(userId)) {
      chatSessions.set(userId, {
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return chatSessions.get(userId)!;
  }

  /**
   * Clear chat session for a user
   */
  clearSession(userId: string): void {
    chatSessions.delete(userId);
  }

  /**
   * Get chat history for a user
   */
  getChatHistory(userId: string): ChatMessage[] {
    const session = this.getSession(userId);
    // Return all messages except the system prompt
    return session.messages.filter(msg => msg.role !== 'system');
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(userId: string, message: string, userContext?: any): Promise<string> {
    this.initialize();
    
    if (!this.apiKey) {
      return "I'm sorry, but the chatbot service is currently unavailable. Please contact support@dineingo.com for assistance.";
    }

    try {
      const session = this.getSession(userId);
      
      // Add user context to the message if provided
      let enhancedMessage = message;
      if (userContext) {
        const contextInfo = [];
        if (userContext.userName) contextInfo.push(`User name: ${userContext.userName}`);
        if (userContext.email) contextInfo.push(`Email: ${userContext.email}`);
        if (userContext.recentBookings) contextInfo.push(`Recent bookings: ${userContext.recentBookings}`);
        if (userContext.currentPage) contextInfo.push(`Current page: ${userContext.currentPage}`);
        
        if (contextInfo.length > 0) {
          enhancedMessage = `[User Context: ${contextInfo.join(', ')}]\n\nUser message: ${message}`;
        }
      }

      // Add user message to session
      session.messages.push({
        role: 'user',
        content: enhancedMessage
      });

      // Prepare messages for API
      // For Gemma models that don't support system role, prepend instructions to first user message
      let apiMessages: ChatMessage[];
      
      if (session.messages.length === 1) {
        // First message - include system prompt
        apiMessages = [{
          role: 'user',
          content: `${SYSTEM_PROMPT}\n\n---\n\nUser: ${enhancedMessage}\n\nAssistant:`
        }];
      } else {
        // Subsequent messages - use last 19 messages (9-10 exchanges)
        apiMessages = session.messages.slice(-19);
      }

      // Call OpenRouter API
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dineingo.com',
            'X-Title': 'DineInGo AI Assistant'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      let aiMessage = (response.data as any).choices[0]?.message?.content || 
                       "I'm sorry, I couldn't process that. Could you please rephrase?";

      // Clean the response
      aiMessage = this.cleanResponse(aiMessage);

      // Add AI response to session
      session.messages.push({
        role: 'assistant',
        content: aiMessage
      });

      session.updatedAt = new Date();

      return aiMessage;

    } catch (error: any) {
      console.error('Chatbot error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          model: this.model
        }
      });
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return "I'm taking a bit longer to respond. Please try again in a moment.";
      }
      
      if (error.response?.status === 429) {
        return "I'm receiving too many requests right now. Please wait a moment and try again.";
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error. Check API key:', this.apiKey ? 'Key is set' : 'Key is missing');
        return "There's an authentication issue with the chatbot service. Please contact support.";
      }

      if (error.response?.status === 400) {
        console.error('Bad request error:', error.response?.data);
        return "I encountered an issue with the request format. Please try rephrasing your question.";
      }

      return "I encountered an error processing your request. Please try again or contact support@dineingo.com if the issue persists.";
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(userId: string): { messageCount: number; sessionAge: number } {
    const session = this.getSession(userId);
    const messageCount = session.messages.filter(m => m.role !== 'system').length;
    const sessionAge = Date.now() - session.createdAt.getTime();
    
    return { messageCount, sessionAge };
  }

  /**
   * Clean up old sessions (call periodically)
   */
  cleanupOldSessions(maxAgeHours: number = 24): number {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [userId, session] of chatSessions.entries()) {
      if (now - session.updatedAt.getTime() > maxAge) {
        chatSessions.delete(userId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export const chatbotService = new ChatbotService();
