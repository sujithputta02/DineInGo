import { analyzeSentiment } from '../src/utils/sentimentAnalyzer';

const testCases = [
  {
    text: "The food was absolutely wonderful and the seating was perfect!",
    expected: "positive"
  },
  {
    text: "Worst experience ever. The service was terrible and slow.",
    expected: "negative"
  },
  {
    text: "It was okay, nothing special but not bad either.",
    expected: "neutral/mixed"
  },
  {
    text: "Highly recommended, great atmosphere and delicious dessert!",
    expected: "positive"
  },
  {
    text: "Dirty tables and cold food. Disappointed.",
    expected: "negative"
  }
];

console.log("=== Sentiment Analyzer Verification ===");
testCases.forEach((tc, idx) => {
  const score = analyzeSentiment(tc.text);
  const rating = 3.0 + (score * 2.0);
  console.log(`\nTest #${idx + 1}: "${tc.text}"`);
  console.log(`Expected: ${tc.expected}`);
  console.log(`Score: ${score.toFixed(2)} (Range: [-1.0, 1.0])`);
  console.log(`Rating Equiv: ${rating.toFixed(1)} / 5.0`);
});
console.log("\n=======================================");
