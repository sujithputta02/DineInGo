import axios from 'axios';
import { aiOptimizationService } from './aiOptimizationService';
import { Business } from '../models/Business';
import { Event } from '../models/Event';
import { mockRestaurants, mockEvents } from '../utils/mockData';

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
const SYSTEM_PROMPT = `You are Dino 🦖, the friendly and knowledgeable AI assistant for DineInGo - India's premier restaurant and event reservation platform.

- **Context Awareness**: You have "dino-vision"! You can see what restaurants and events are currently visible on the user's screen. ALWAYS prioritize this "Visible on screen" data when answering "Is [X] here?" or "What's trending?" questions.

=== CRITICAL: USING REAL RESTAURANT DATA ===
**WHEN USER ASKS FOR RECOMMENDATIONS:**

1. **CHECK "AVAILABLE ON DINEINGO" LIST**: You will receive a list of real restaurants/events from the database
2. **USE ONLY THAT LIST**: Recommend ONLY from restaurants/events in "AVAILABLE ON DINEINGO (Real Data)" section
3. **CHECK VISIBLE ENTITIES**: If user context shows "Visible on screen right now:", prioritize those
4. **NEVER MAKE UP NAMES**: Do NOT invent restaurant names under any circumstances

**PRIORITY ORDER:**
1st: Recommend from "Visible on screen right now:" (user's current view)
2nd: Recommend from "AVAILABLE ON DINEINGO" list (database)
3rd: If neither available, guide user to browse platform

**CORRECT RESPONSES:**

✅ User wants Indian food → Check "AVAILABLE ON DINEINGO" list → Recommend actual Indian restaurants from that list

✅ User on specific page → Check "Visible on screen right now:" → Recommend from visible entities first

❌ NEVER say "Try Tandoori Nights" or any name not in the provided lists

=== ABOUT DINEINGO ===
DineInGo is a comprehensive dining and event management platform that connects users with restaurants and events across India. We provide seamless booking experiences, digital wallet integration, and real-time updates.

=== BRANDING EXCLUSIVITY & COMPETITOR BLOCKS (CRITICAL) 🛡️ ===
- **Exclusivity**: You are an exclusive representative of **DineInGo**. You DO NOT work for or mention other platforms.
- **Competitor Blocklist**: NEVER mention Zomato, Swiggy, Dineout, EazyDiner, or any other competitors.
- **Handling Competitor Inquiries**: If a user asks if a restaurant is on another platform (e.g., "Is this on Dineout?"), you must respond by promoting DineInGo. 
  - *Internal Rule*: Redirect users to DineInGo as the right place for bookings!
- **Brand Consistency**: Always refer to the current platform as **DineInGo**. Never suggest searching on other apps.

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

=== PROBLEM-SOLVING GUIDE (NEW) ===

**Common User Problems & Solutions:**

1. **"I can't find a restaurant I'm looking for"**
   Solution Steps:
   - Ask for restaurant name, location, or cuisine type
   - Try search with different spellings or variations
   - Check if they're looking at the correct city/area
   - Suggest similar alternatives based on their preference
   - If truly not available, explain: "That restaurant might not be partnered with DineInGo yet. Would you like me to suggest similar places?"

2. **"All tables are showing unavailable"**
   Solution Steps:
   - Suggest trying different time slots (±30 mins, ±1 hour)
   - Check other floors (Ground, First, Second, Third)
   - Try different date if flexible
   - Consider different table categories (Standard → Premium → VIP)
   - Recommend similar restaurants nearby with availability

3. **"I didn't receive booking confirmation"**
   Solution Steps:
   - Ask them to check spam/junk folder
   - Verify email address in their profile settings
   - Guide them to Dashboard → Upcoming bookings
   - Booking reference is always visible in dashboard
   - If still missing, provide support email: sec.dinelngo.team@gmail.com

4. **"Payment failed / Booking not completed"**
   Solution Steps:
   - Suggest retrying with same or different payment method
   - Check if they have sufficient balance
   - Ask them to check internet connection
   - Try different browser if on desktop
   - If card declined, suggest contacting their bank
   - Reassure: No amount will be charged for failed transactions

5. **"How do I cancel my booking?"**
   Solution Steps:
   - Go to Dashboard → Click on the booking
   - Click "Cancel Booking" button
   - Must be done 2+ hours before reservation time
   - Refund processed in 5-7 business days
   - Confirmation email will be sent
   - Within 2 hours? Explain no-cancellation policy

6. **"I can't choose a specific table/seat"**
   Solution Steps:
   - Explain the color coding: Green = Available, Red = Taken, Blue = Your Selection
   - For restaurants: Click on any green table on the floor plan
   - For events: Click on available seats in seating chart
   - If all show red, see problem #2 (unavailable tables)
   - Zoom in/out for better view if needed

7. **"Which table/seat should I choose?"**
   Solution Steps:
   - Ask their preferences:
     * Window view? → Suggest Premium tables near windows
     * Quiet/private? → Suggest corner tables or VIP sections
     * Large group? → Suggest connecting tables
     * Good view of stage (events)? → Suggest center/front sections
   - Explain table categories and their benefits
   - Show pricing differences if relevant

8. **"Wallet pass not working / QR code issues"**
   Solution Steps:
   - Ensure pass is updated (pull down to refresh)
   - Check internet connection for initial download
   - Show booking ID from email as backup
   - Guide to show invoice from dashboard
   - Contact venue staff with booking reference
   - Escalate if critical: sec.dinelngo.team@gmail.com

9. **"I want to modify my booking (time/guests/table)"**
   Solution Steps:
   - Explain: Modifications not directly supported
   - Solution: Cancel existing booking (if 2+ hrs before)
   - Make new booking with desired details
   - Refund for cancelled booking in 5-7 days
   - If within 2 hours, suggest contacting restaurant directly

10. **"How much will it cost?"**
    Solution Steps:
    - Restaurant bookings: ₹25.99 per guest + 18% GST
    - Events: Varies by ticket tier (shown on event page)
    - Calculate total: (Base price × quantity) + 18% GST
    - Example: 4 guests = ₹25.99 × 4 = ₹103.96 + GST = ₹122.67
    - No hidden fees, completely transparent
    - Full invoice provided after booking

=== HOW TO HELP USERS DISCOVER & CHOOSE ===

**Restaurant Selection Guidance:**
- Ask key questions:
  * "What cuisine are you in the mood for?"
  * "What's your budget? (₹, ₹₹, ₹₹₹, ₹₹₹₹)"
  * "Any special occasion? (Birthday, Anniversary, Date)"
  * "Preferred location/area?"
  * "Dietary requirements? (Vegan, Jain, Halal, etc.)"

- Check what's visible on their screen first
- Recommend based on ratings (4.5+ stars)
- Highlight unique features (rooftop, live music, pet-friendly)
- Consider ambiance for occasion (romantic, family, business)
- Mention parking availability if important

**Event Selection Guidance:**
- Ask interests:
  * Music lover? → Concerts, DJ nights, live bands
  * Foodie? → Food festivals, tasting events
  * Social? → Networking events, meetups
  * Arts enthusiast? → Theater, comedy shows

- Check date/time availability
- Explain venue and seating options
- Mention age restrictions or dress codes
- Highlight popular/trending events
- Suggest based on previous bookings if known

=== STEP-BY-STEP WALKTHROUGHS ===

**First-Time Restaurant Booking:**
"Great! Let me walk you through your first booking on DineInGo 🦖

1. Browse or search for a restaurant
2. Click on one you like to see details
3. Choose: Date, Time, Number of guests
4. You'll see an interactive floor plan (our unique feature!)
5. Green tables = Available. Click to select
6. Add your details (name, email, phone)
7. Any special requests? (Birthday cake, window seat, etc.)
8. Confirm & pay
9. Get instant email + add to your phone's wallet!

Want me to help you find a restaurant?"

**Using Digital Wallet Passes:**
"Here's how to use wallet passes 🎫

After booking:
- iOS: Click 'Add to Apple Wallet' button
- Android: Click 'Add to Google Wallet' button
- Pass downloads automatically with QR code

At the restaurant/event:
- Open your Wallet app
- Show QR code to staff
- They'll scan it and you're checked in!

Works offline too - no internet needed at venue! ✨"

**Managing Bookings:**
"Access your bookings anytime:

1. Go to Dashboard (top right menu)
2. See three tabs:
   - Upcoming: Your active reservations
   - Past: Completed bookings
   - Cancelled: Previous cancellations

For each booking you can:
- View full details
- Download invoice
- Add to wallet
- Cancel (if 2+ hours before)

Need help with a specific booking?"

=== UPDATED SUPPORT CONTACT ===
- **Primary Email**: sec.dinelngo.team@gmail.com
- **Response Time**: Within 24 hours
- **For Urgent Issues**: Guide users to contact venue directly with booking reference
- **You (Dino)**: Available 24/7 for instant help!

=== STRICT OUTPUT RULES (CRITICAL) ===
- **REASONING MUST BE HIDDEN**: If you need to think, plan, or reason before responding, you MUST wrap ALL your internal thoughts strictly inside <think>...</think> XML tags.
- NEVER output raw thought processes without wrapping them in <think> tags.
- The user will only see text outside of the <think> tags. Ensure your final response is outside the <think> tags.
- **DIRECT RESPONSE**: The visible response should be friendly, conversational, and direct.

Remember: You're here to make every user's dining and event experience exceptional! 🦖✨`;

export class ChatbotService {
  // Groq configuration
  private groqApiKey: string = '';
  private groqModel: string = '';
  private groqApiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';

  // Sarvam AI configuration
  private sarvamApiKey: string = '';
  private sarvamModel: string = '';
  private sarvamApiUrl: string = 'https://api.sarvam.ai/v1/chat/completions';

  // OpenRouter configuration
  private openrouterApiKey: string = '';
  private openrouterModel: string = '';
  private openrouterApiUrl: string = 'https://openrouter.ai/api/v1/chat/completions';

  // Provider settings
  private primaryProvider: 'groq' | 'sarvam' | 'openrouter' = 'groq';
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - do it lazily when first used
  }

  private initialize() {
    if (this.initialized) return;

    // Load Groq configuration
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    // Load Sarvam AI configuration
    this.sarvamApiKey = process.env.SARVAM_API_KEY || '';
    this.sarvamModel = process.env.SARVAM_MODEL || 'sarvam-30b';

    // Load OpenRouter configuration
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterModel = process.env.AI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

    // Load primary provider setting
    this.primaryProvider = (process.env.PRIMARY_LLM_PROVIDER as 'groq' | 'sarvam' | 'openrouter') || 'groq';

    this.initialized = true;

    // Log configuration
    console.log('✓ Chatbot service initialized with multi-provider support');
    console.log('  Primary Provider:', this.primaryProvider);

    if (this.groqApiKey) {
      console.log('  Groq: Configured');
      console.log('    Model:', this.groqModel);
      console.log('    API Key:', this.groqApiKey.substring(0, 20) + '...');
    } else {
      console.warn('  ⚠️  Groq: Not configured');
    }

    if (this.sarvamApiKey) {
      console.log('  Sarvam AI: Configured');
      console.log('    Model:', this.sarvamModel);
      console.log('    API Key:', this.sarvamApiKey.substring(0, 15) + '...');
    } else {
      console.warn('  ⚠️  Sarvam AI: Not configured');
    }

    if (this.openrouterApiKey) {
      console.log('  OpenRouter: Configured (fallback)');
      console.log('    Model:', this.openrouterModel);
      console.log('    API Key:', this.openrouterApiKey.substring(0, 20) + '...');
    } else {
      console.warn('  ⚠️  OpenRouter: Not configured');
    }

    if (!this.groqApiKey && !this.sarvamApiKey && !this.openrouterApiKey) {
      console.error('  ❌ No AI providers configured! Chatbot will not function.');
      console.error('     Please set GROQ_API_KEY, SARVAM_API_KEY, or OPENROUTER_API_KEY in backend/.env file');
    }
  }

  /**
   * Clean AI response from unwanted symbols and formatting
   */
  private cleanResponse(text: string): string {
    // 1. Remove <think>...</think> XML blocks that contain the AI's internal reasoning
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Strip any accidentally leaked internal info (if the AI forgot the think tags)
    const filterPatterns = [
      /^Okay, (the )?user just said.*/gi,
      /^Let me start by.*/gi,
      /^I should use a.*/gi,
      /^Looking at the context.*/gi,
      /^I need to offer.*/gi,
      /^The best practices say.*/gi,
      /^Maybe list some.*/gi,
      /^Also, include an.*/gi,
      /^Let me check the.*/gi,
      /^Yep, just promote.*/gi,
      /^Alright, draft a response.*/gi,
      /^(Thinking|Reasoning|Thought process):.*/gi,
      /^Let's analyze the input.*/gi,
    ];

    // First pass: remove block of patterns that look like internal reasoning at the start
    const lines = cleaned.split('\n');
    let firstActualLineIndex = 0;

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim().toLowerCase();
      if (line.startsWith('okay,') ||
        line.startsWith('let me') ||
        line.startsWith('let\'s') ||
        line.startsWith('i should') ||
        line.startsWith('thinking:') ||
        line.startsWith('i need to') ||
        line.startsWith('alright,') ||
        line.startsWith('the user') ||
        line.startsWith('they asked') ||
        line.startsWith('i will') ||
        line.startsWith('drafting') ||
        line.startsWith('checking') ||
        line.startsWith('searching')) {
        firstActualLineIndex = i + 1;
      } else if (line === '') {
        continue;
      } else {
        break;
      }
    }

    if (firstActualLineIndex > 0) {
      cleaned = lines.slice(firstActualLineIndex).join('\n').trim();
    }

    for (const p of filterPatterns) {
      cleaned = cleaned.replace(p, '');
    }

    return cleaned
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove excessive asterisks (bold/italic markdown)
      .replace(/\*\*\*/g, '')
      .replace(/\*\*/g, '')
      // Remove excessive underscores
      .replace(/___/g, '')
      .replace(/__/g, '')
      // Remove generic HTML tags (now safe since we already stripped <think>)
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
   * Call AI provider with the given configuration (with rate limiting and optimization)
   */
  private async callAIProvider(
    apiUrl: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    providerName: string
  ): Promise<string> {
    const providerKey = providerName.toLowerCase().replace(/\s+/g, '');
    
    // Check rate limits
    const estimatedTokens = aiOptimizationService.estimateTokens(
      JSON.stringify(messages)
    );
    
    if (!aiOptimizationService.canMakeRequest(providerKey, estimatedTokens)) {
      throw new Error(`Rate limit exceeded for ${providerName}`);
    }

    console.log(`  → Calling ${providerName} API...`);

    const headers: any = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add provider-specific headers
    if (providerName === 'OpenRouter') {
      headers['HTTP-Referer'] = 'https://dineingo.com';
      headers['X-Title'] = 'DineInGo AI Assistant';
    }

    // Get optimized max_tokens
    const maxTokens = aiOptimizationService.getMaxTokens(providerKey);

    const response = await axios.post(
      apiUrl,
      {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens, // Optimized token limit
        top_p: 0.9,
      },
      {
        headers,
        timeout: 30000 // 30 second timeout
      }
    );

    const aiMessage = (response.data as any).choices[0]?.message?.content ||
      "I'm sorry, I couldn't process that. Could you please rephrase?";

    // Record request for rate limiting
    const tokensUsed = aiOptimizationService.estimateTokens(aiMessage) + estimatedTokens;
    aiOptimizationService.recordRequest(providerKey, tokensUsed);

    console.log(`  ✓ ${providerName} responded successfully (Est. tokens: ${tokensUsed})`);
    return aiMessage;
  }

  /**
   * Fetch available restaurants and events from DB + Mock data for AI context
   */
  private async fetchAvailableEntities(): Promise<string> {
    try {
      console.log('[AI] Fetching restaurant/event data from database + mock data...');
      
      // Fetch directly from database models
      const [businesses, events] = await Promise.all([
        Business.find({}).limit(20).lean().catch(err => {
          console.error('[AI] Business query failed:', err.message);
          return [];
        }),
        Event.find({}).limit(10).lean().catch(err => {
          console.error('[AI] Event query failed:', err.message);
          return [];
        })
      ]);

      const entities: string[] = [];

      // Add real restaurants from DB
      if (businesses && businesses.length > 0) {
        console.log(`[AI] Found ${businesses.length} restaurants in database`);
        businesses.forEach((b: any) => {
          const name = b.name || b.title;
          const cuisine = Array.isArray(b.cuisine) ? b.cuisine[0] : (b.cuisine || 'Multi-cuisine');
          const location = b.location || b.address || 'India';
          if (name) {
            entities.push(`${name} (restaurant, ${cuisine}, ${location})`);
          }
        });
      }

      // Add mock restaurants
      mockRestaurants.forEach(r => {
        entities.push(`${r.name} (restaurant, ${r.cuisine}, ${r.location})`);
      });
      console.log(`[AI] Added ${mockRestaurants.length} mock restaurants`);

      // Add real events from DB
      if (events && events.length > 0) {
        console.log(`[AI] Found ${events.length} events in database`);
        events.forEach((e: any) => {
          const name = e.name || e.title;
          const category = e.category || 'General';
          const location = e.location || e.venue || 'India';
          if (name) {
            entities.push(`${name} (event, ${category}, ${location})`);
          }
        });
      }

      // Add mock events
      mockEvents.forEach(e => {
        entities.push(`${e.name} (event, ${e.category}, ${e.location})`);
      });
      console.log(`[AI] Added ${mockEvents.length} mock events`);

      if (entities.length > 0) {
        console.log(`[AI] Total loaded: ${entities.length} entities for AI context`);
        return `\n\n=== AVAILABLE ON DINEINGO (Real Data) ===\nCurrently available restaurants and events:\n${entities.join('\n')}\n\n⚠️ CRITICAL: When recommending, ONLY mention restaurants/events from this exact list above. Do NOT invent any other names!\n`;
      }

      console.warn('[AI] No entities found');
      return '';
    } catch (error: any) {
      console.error('[AI] Failed to fetch entities:', error.message);
      return '';
    }
  }

  /**
   * Send a message and get AI response with automatic fallback
   */
  async sendMessage(userId: string, message: string, userContext?: any, preferredLanguage?: string): Promise<string> {
    this.initialize();

    if (!this.groqApiKey && !this.sarvamApiKey && !this.openrouterApiKey) {
      return "I'm sorry, but the chatbot service is currently unavailable. Please contact sec.dinelngo.team@gmail.com for assistance.";
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
        
        // CRITICAL: Add visible entities if available
        if (userContext.visibleEntities && Array.isArray(userContext.visibleEntities) && userContext.visibleEntities.length > 0) {
          const entitiesStr = userContext.visibleEntities
            .map((e: any) => `${e.name} (${e.type}${e.cuisine ? `, ${e.cuisine}` : ''}${e.location ? ` in ${e.location}` : ''})`)
            .join(', ');
          contextInfo.push(`Visible on screen right now: ${entitiesStr}`);
        } else {
          // Explicitly tell AI there are no visible entities
          contextInfo.push(`No restaurants or events are currently visible on the user's screen`);
        }

        if (contextInfo.length > 0) {
          enhancedMessage = `[User Context: ${contextInfo.join(', ')}]\n\nUser message: ${message}`;
        }
      }

      // Add user message to session
      session.messages.push({
        role: 'user',
        content: enhancedMessage
      });

      // Prepare messages for API with language instruction
      let apiMessages: ChatMessage[];

      // Check cache first (for repeated questions)
      const cacheKey = aiOptimizationService.getCacheKey(userId, message, this.primaryProvider);
      const cachedResponse = aiOptimizationService.getCachedResponse(cacheKey);
      
      if (cachedResponse && session.messages.length > 5) { // Only use cache after 5+ messages
        console.log('  ✓ Using cached AI response');
        session.messages.push({
          role: 'assistant',
          content: cachedResponse
        });
        session.updatedAt = new Date();
        return cachedResponse;
      }

      // Map language codes to full language names
      const languageMap: { [key: string]: string } = {
        'en': 'English',
        'hi': 'Hindi (हिंदी)',
        'ta': 'Tamil (தமிழ்)',
        'kn': 'Kannada (ಕನ್ನಡ)',
        'te': 'Telugu (తెలుగు)',
        'ml': 'Malayalam (മലയാളം)',
        'english': 'English',
        'hindi': 'Hindi (हिंदी)',
        'tamil': 'Tamil (தமிழ்)',
        'kannada': 'Kannada (ಕನ್ನಡ)',
        'telugu': 'Telugu (తెలుగు)',
        'malayalam': 'Malayalam (മലയാളം)'
      };

      const languageName = preferredLanguage ? languageMap[preferredLanguage] || 'English' : 'English';
      const languageInstruction = preferredLanguage && preferredLanguage !== 'en'
        ? `\n\nIMPORTANT: The user has selected ${languageName} as their preferred language. You MUST respond in ${languageName}. Do not use English unless the user specifically asks a question in English.`
        : '';

      // Always send system prompt as a proper system role message
      // This ensures Dino's identity is enforced on every API call
      const systemMessage: ChatMessage = {
        role: 'system',
        content: `${SYSTEM_PROMPT}${languageInstruction}\n\nCRITICAL: Your name is Dino 🦖. When asked your name, ALWAYS say "I'm Dino 🦖". NEVER say you are "Sarvam AI" or that you were "created by Sarvam AI". You are Dino, DineInGo's assistant.`
      };

      // Fetch available entities from DB for better recommendations
      let availableEntities = '';
      try {
        availableEntities = await this.fetchAvailableEntities();
        if (availableEntities && session.messages.length === 1) {
          // Add entities data only on first message to save tokens
          systemMessage.content += availableEntities;
        }
      } catch (error: any) {
        console.error('[AI] Error fetching entities, continuing without:', error.message);
        // Continue without entity data - AI will use fallback logic
      }

      if (session.messages.length === 1) {
        // First message
        apiMessages = [systemMessage, { role: 'user', content: enhancedMessage }];
      } else {
        // Subsequent messages - optimize message history
        const languageReminder = preferredLanguage && preferredLanguage !== 'en'
          ? `[Remember: Respond in ${languageName}]\n\n`
          : '';

        const historyMessages = aiOptimizationService.optimizeMessages(
          session.messages.filter(m => m.role !== 'system'),
          9 // Keep last 9 conversation turns (18 messages)
        );

        if (historyMessages.length > 0 && languageReminder) {
          const lastMessage = historyMessages[historyMessages.length - 1];
          lastMessage.content = languageReminder + lastMessage.content;
        }

        apiMessages = [systemMessage, ...historyMessages];
      }

      let aiMessage: string = '';
      let usedProvider: string = '';

      // Determine provider order based on configuration
      const providers: Array<{
        name: string;
        apiKey: string;
        apiUrl: string;
        model: string;
      }> = [];

      // Add primary provider first
      if (this.primaryProvider === 'groq' && this.groqApiKey) {
        providers.push({
          name: 'Groq',
          apiKey: this.groqApiKey,
          apiUrl: this.groqApiUrl,
          model: this.groqModel
        });
      } else if (this.primaryProvider === 'sarvam' && this.sarvamApiKey) {
        providers.push({
          name: 'Sarvam AI',
          apiKey: this.sarvamApiKey,
          apiUrl: this.sarvamApiUrl,
          model: this.sarvamModel
        });
      }

      // Add fallback providers
      if (this.openrouterApiKey && this.primaryProvider !== 'openrouter') {
        providers.push({
          name: 'OpenRouter',
          apiKey: this.openrouterApiKey,
          apiUrl: this.openrouterApiUrl,
          model: this.openrouterModel
        });
      }

      if (this.sarvamApiKey && this.primaryProvider !== 'sarvam') {
        providers.push({
          name: 'Sarvam AI',
          apiKey: this.sarvamApiKey,
          apiUrl: this.sarvamApiUrl,
          model: this.sarvamModel
        });
      }

      if (this.groqApiKey && this.primaryProvider !== 'groq') {
        providers.push({
          name: 'Groq',
          apiKey: this.groqApiKey,
          apiUrl: this.groqApiUrl,
          model: this.groqModel
        });
      }

      if (this.primaryProvider === 'openrouter' && this.openrouterApiKey) {
        providers.unshift({
          name: 'OpenRouter',
          apiKey: this.openrouterApiKey,
          apiUrl: this.openrouterApiUrl,
          model: this.openrouterModel
        });
      }

      // Try providers in order with fallback
      let lastError: any = null;
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        try {
          aiMessage = await this.callAIProvider(
            provider.apiUrl,
            provider.apiKey,
            provider.model,
            apiMessages,
            provider.name
          );
          usedProvider = provider.name;
          break;
        } catch (error: any) {
          lastError = error;
          console.warn(`  ⚠️  ${provider.name} failed:`, error.message);

          // If this is not the last provider, try the next one
          if (i < providers.length - 1) {
            console.log(`  → Falling back to ${providers[i + 1].name}...`);
            continue;
          }
        }
      }

      // If all providers failed, throw the last error
      if (!aiMessage) {
        throw lastError || new Error('All AI providers failed');
      }

      // Clean the response
      aiMessage = this.cleanResponse(aiMessage);

      // Cache the response
      aiOptimizationService.cacheResponse(cacheKey, aiMessage);

      // Add AI response to session
      session.messages.push({
        role: 'assistant',
        content: aiMessage
      });

      session.updatedAt = new Date();

      console.log(`  ✓ Response generated using ${usedProvider}`);
      return aiMessage;

    } catch (error: any) {
      console.error('Chatbot error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return "I'm taking a bit longer to respond. Please try again in a moment.";
      }

      if (error.response?.status === 429) {
        return "I'm receiving too many requests right now. Please wait a moment and try again.";
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error with AI provider');
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
