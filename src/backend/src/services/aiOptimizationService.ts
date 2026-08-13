/**
 * AI Optimization Service
 * Rate limiting, token optimization, and cost management for AI APIs
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxTokensPerRequest: number;
}

interface RequestRecord {
  timestamp: number;
  tokens: number;
}

// Rate limit configurations per provider
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'groq': {
    maxRequestsPerMinute: 25, // Conservative limit (free tier: 30 RPM)
    maxTokensPerMinute: 200000, // 250K TPM in free tier
    maxTokensPerRequest: 400 // Reduced from 500-600 to save tokens
  },
  'sarvam': {
    maxRequestsPerMinute: 50,
    maxTokensPerMinute: 100000,
    maxTokensPerRequest: 400
  },
  'openrouter': {
    maxRequestsPerMinute: 20,
    maxTokensPerMinute: 50000,
    maxTokensPerRequest: 400
  }
};

// In-memory tracking (in production, use Redis)
const requestHistory: Record<string, RequestRecord[]> = {
  'groq': [],
  'sarvam': [],
  'openrouter': []
};

// Cache for AI responses (30 minutes)
const responseCache = new Map<string, { response: string, timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export class AIOptimizationService {
  
  /**
   * Check if request is within rate limits
   */
  canMakeRequest(provider: string, estimatedTokens: number = 100): boolean {
    const config = RATE_LIMITS[provider];
    if (!config) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old records
    requestHistory[provider] = requestHistory[provider].filter(
      record => record.timestamp > oneMinuteAgo
    );

    const recentRequests = requestHistory[provider];
    const totalTokens = recentRequests.reduce((sum, r) => sum + r.tokens, 0);

    // Check RPM and TPM limits
    if (recentRequests.length >= config.maxRequestsPerMinute) {
      console.warn(`[AI Opt] ${provider}: RPM limit reached (${recentRequests.length}/${config.maxRequestsPerMinute})`);
      return false;
    }

    if (totalTokens + estimatedTokens > config.maxTokensPerMinute) {
      console.warn(`[AI Opt] ${provider}: TPM limit reached (${totalTokens}/${config.maxTokensPerMinute})`);
      return false;
    }

    return true;
  }

  /**
   * Record a request
   */
  recordRequest(provider: string, tokens: number): void {
    if (!requestHistory[provider]) {
      requestHistory[provider] = [];
    }

    requestHistory[provider].push({
      timestamp: Date.now(),
      tokens
    });
  }

  /**
   * Get max tokens for provider
   */
  getMaxTokens(provider: string): number {
    return RATE_LIMITS[provider]?.maxTokensPerRequest || 400;
  }

  /**
   * Optimize messages for token efficiency
   * - Keep only last N conversation turns
   * - Trim long messages
   */
  optimizeMessages(messages: any[], maxHistory: number = 10): any[] {
    // Keep system message + last N turns
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    const recentConversation = conversationMessages.slice(-maxHistory * 2); // user+assistant pairs
    
    return [...systemMessages, ...recentConversation];
  }

  /**
   * Generate cache key for response caching
   */
  getCacheKey(userId: string, message: string, provider: string): string {
    // Normalize message to avoid cache misses from minor differences
    const normalizedMessage = message.toLowerCase().trim().slice(0, 100);
    return `${provider}:${userId}:${normalizedMessage}`;
  }

  /**
   * Get cached response if available
   */
  getCachedResponse(cacheKey: string): string | null {
    const cached = responseCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('[AI Opt] Cache hit:', cacheKey.substring(0, 50));
      return cached.response;
    }

    return null;
  }

  /**
   * Cache a response
   */
  cacheResponse(cacheKey: string, response: string): void {
    responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        responseCache.delete(key);
      }
    }
  }

  /**
   * Calculate approximate token count
   * Rough estimate: 1 token ≈ 4 characters
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get rate limit stats
   */
  getRateLimitStats(provider: string): {
    requestsLastMinute: number;
    tokensLastMinute: number;
    remainingRequests: number;
    remainingTokens: number;
  } {
    const config = RATE_LIMITS[provider];
    if (!config) {
      return {
        requestsLastMinute: 0,
        tokensLastMinute: 0,
        remainingRequests: 999,
        remainingTokens: 999999
      };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = requestHistory[provider].filter(
      record => record.timestamp > oneMinuteAgo
    );

    const tokensUsed = recentRequests.reduce((sum, r) => sum + r.tokens, 0);

    return {
      requestsLastMinute: recentRequests.length,
      tokensLastMinute: tokensUsed,
      remainingRequests: config.maxRequestsPerMinute - recentRequests.length,
      remainingTokens: config.maxTokensPerMinute - tokensUsed
    };
  }

  /**
   * Wait with exponential backoff if rate limited
   */
  async waitForRateLimit(provider: string, attempt: number = 0): Promise<void> {
    const maxAttempts = 3;
    
    if (attempt >= maxAttempts) {
      throw new Error(`Rate limit exceeded for ${provider} after ${maxAttempts} attempts`);
    }

    // Exponential backoff: 2s, 4s, 8s
    const delay = Math.pow(2, attempt) * 2000;
    
    console.log(`[AI Opt] Rate limit reached for ${provider}, waiting ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const aiOptimizationService = new AIOptimizationService();

// Cleanup cache every 10 minutes
setInterval(() => {
  aiOptimizationService.cleanupCache();
}, 10 * 60 * 1000);
