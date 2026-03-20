import { chatbotService } from './chatbotService';

interface ItemContext {
  id: string;
  name: string;
  type: 'restaurant' | 'event';
  cuisine?: string;
  category?: string;
}

interface UserContext {
  displayName: string;
  favoriteCuisines: string[];
  cuisinesTried: number;
}

interface AIReason {
  id: string;
  reason: string;
}

// In-memory cache: userId_date -> AIReason[]
const reasonCache = new Map<string, { reasons: AIReason[], timestamp: number }>();

export const aiRecommendationService = {
  async generateReasons(
    userId: string, 
    items: ItemContext[], 
    userContext: UserContext, 
    language: string = 'en',
    refresh: boolean = false
  ): Promise<AIReason[]> {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${userId}_${today}_${language}`;

    // 1. Check Cache (Skip if refresh is requested)
    if (!refresh) {
      const cached = reasonCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
        console.log(`[AI Recs] Using cached reasons for user ${userId}`);
        return cached.reasons;
      }
    }

    // 2. Prepare AI Prompt
    const itemsDescription = items.map(item => 
      `- ${item.name} (${item.type}${item.cuisine ? `, ${item.cuisine}` : ''}${item.category ? `, ${item.category}` : ''})`
    ).join('\n');

    const favs = userContext.favoriteCuisines.length > 0 ? userContext.favoriteCuisines.join(', ') : 'Global Cuisines';

    const prompt = `[SYSTEM: DINO_AI_CONCIERGE]
Return ONLY a JSON array of 4 unique, witty, one-sentence reasons for these items for user "${userContext.displayName}" (Favs: ${favs}).
Rules: No intro/outro. Direct advice only. Mention item name specifically. 1 emoji per reason.

ITEMS:
${itemsDescription}

JSON OUTPUT:`;

    try {
      console.log(`[AI Recs] Generating new AI reasons for user ${userId} (Refresh: ${refresh})...`);
      
      const aiResponse = await chatbotService.sendMessage(
        `system_rec_${userId}_${Date.now()}`, // Force a fresh session for fresh output
        prompt,
        null,
        language
      );

      // 3. Parse and Extract
      let reasons: string[] = [];
      try {
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.includes('```')) {
          const match = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) cleanedResponse = match[1];
        }

        const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          reasons = JSON.parse(jsonMatch[0]);
          
          // CRITICAL: Filter out chatter (e.g., "The items are:", "Okay, let's...")
          reasons = reasons.filter(r => 
            typeof r === 'string' && 
            !r.toLowerCase().includes('items are') && 
            !r.toLowerCase().includes('tackle this') &&
            !r.toLowerCase().includes('select for user') &&
            r.length > 5
          );
        }
      } catch (e) {
        console.warn('[AI Recs] JSON parse failed, extracting quoted strings...');
        // Match anything inside double quotes to at least try to get content
        const quotedMatches = aiResponse.match(/"([^"]{20,})"/g);
        if (quotedMatches) {
          reasons = quotedMatches.map(m => m.replace(/^"|"$/g, ''));
        }
      }

      // If reasons are still empty or look like item names only, use fallback
      if (reasons.length === 0) {
        console.warn('[AI Recs] No valid reasons extracted, using fallbacks');
      }

      // 4. Map back to IDs with smart fallback
      const mappedReasons: AIReason[] = items.map((item, idx) => {
        let reason = reasons[idx] || "";
        
        // Validation: If the AI just repeated the item name/type as the reason, it's a fail
        const looksLikeLabel = reason.toLowerCase().includes(item.name.toLowerCase().substring(0, 5));
        const isChatty = reason.toLowerCase().includes('the user') || reason.toLowerCase().includes('selected');

        if (!reason || reason.length < 15 || isChatty) {
          const fallbacks = [
            `Dino believes ${item.name} is a top-tier choice for your ${userContext.favoriteCuisines[0] || 'foodie'} DNA! 🦖`,
            `Found a hidden gem! ${item.name} is hitting all the right notes for a ${item.cuisine || 'legendary'} feast. 💎`,
            `Time to stomp! ${item.name} offers precisely the vibe Dino suggests for ${userContext.displayName}. 🍱`,
            `This spot is fossil-certified! ${item.name} matches your unique taste profile perfectly. ✨`
          ];
          reason = fallbacks[idx % fallbacks.length];
        }

        return { id: item.id, reason };
      });

      // 5. Save to Cache
      reasonCache.set(cacheKey, {
        reasons: mappedReasons,
        timestamp: Date.now()
      });

      return mappedReasons;

    } catch (error) {
      console.error('[AI Recs] Error in AI reasoning engine:', error);
      return items.map(item => ({
        id: item.id,
        reason: "Dino's top pick for your legendary appetite! 🍖🦖"
      }));
    }
  }
};
