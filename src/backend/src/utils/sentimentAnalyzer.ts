/**
 * Offline Sentiment Analyzer
 * Tokenizes text and scores it based on matched positive and negative keywords.
 * Returns a score between -1.0 (very negative) and 1.0 (very positive).
 */

const POSITIVE_WORDS = new Set([
  'great', 'good', 'excellent', 'delicious', 'tasty', 'amazing', 'friendly', 
  'best', 'love', 'clean', 'fast', 'prompt', 'satisfied', 'nice', 'perfect',
  'wonderful', 'awesome', 'fantastic', 'fabulous', 'superb', 'lovely',
  'recommend', 'happy', 'pleasant', 'glad', 'enjoy', 'enjoyed', 'authentic',
  'fresh', 'cozy', 'outstanding', 'top-notch', 'stellar', 'perfectly',
  'yummy', 'mouthwatering', 'incredible', 'delightful', 'attentive',
  'polite', 'helpful', 'promptly', 'reasonable', 'generous', 'worth',
  'okay', 'ok', 'decent'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'slow', 'poor', 'worst', 'dirty', 'cold', 'expensive', 'rude', 
  'disappointed', 'avoid', 'average', 'mediocre', 'delay', 'delayed',
  'terrible', 'horrible', 'awful', 'hate', 'dislike', 'unpleasant',
  'noisy', 'loud', 'overpriced', 'disappointing', 'unfriendly', 'rushed',
  'bland', 'stale', 'burnt', 'undercooked', 'tasteless', 'salty', 'greasy',
  'unclean', 'waste', 'regret', 'uncomfortable', 'inattentive', 'ignored',
  'rude', 'arrogant', 'unhelpful', 'slowly', 'ruined', 'fail', 'failed'
]);

export const analyzeSentiment = (text: string): number => {
  if (!text || typeof text !== 'string') {
    return 0; // Neutral fallback
  }

  // Normalize, replace common punctuation (except apostrophes for contractions like n't), and convert to lowercase
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, ' ')
    .split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;
  let negate = false;

  for (const word of words) {
    if (!word) continue;

    // Check for negation words
    if (word === 'not' || word === 'no' || word === 'never' || word.endsWith("n't")) {
      negate = true;
      continue;
    }

    if (POSITIVE_WORDS.has(word)) {
      if (negate) {
        negativeCount++;
      } else {
        positiveCount++;
      }
      negate = false;
    } else if (NEGATIVE_WORDS.has(word)) {
      if (negate) {
        positiveCount++; // "not bad" is positive
      } else {
        negativeCount++;
      }
      negate = false;
    } else {
      // Reset negation on other words to prevent far-reaching negation carryover
      negate = false;
    }
  }

  const totalMatched = positiveCount + negativeCount;
  if (totalMatched === 0) {
    return 0; // Neutral if no keywords match
  }

  // Calculate score between -1.0 and 1.0
  return (positiveCount - negativeCount) / totalMatched;
};
