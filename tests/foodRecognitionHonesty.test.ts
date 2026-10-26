import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFoodImage } from '../src/services/foodRecognitionService';

test('1. Food Recognition Honesty: Inconclusive/empty input returns Unrecognized Dish, never French Onion Soup', async () => {
  // Pass an empty/dummy image string to simulate inconclusive inference
  const report = await analyzeFoodImage('');

  assert.equal(report.primaryFood.dishName, 'Unrecognized Dish');
  assert.equal(report.primaryFood.confidence, 0);
  assert.equal(report.primaryFood.confidenceTier, 'low');
  assert.equal(report.needsUserConfirmation, true);
  assert.equal(report.providerStatus.isRealProvider, false);
  assert.notEqual(report.primaryFood.dishName.toLowerCase(), 'french onion soup');
});

test('2. Food Recognition Honesty: User confirmation is mandatory for all recognition outcomes', async () => {
  const report = await analyzeFoodImage('data:image/jpeg;base64,mockfooddata');
  assert.equal(report.needsUserConfirmation, true, 'User confirmation must be required before nutrition tracking');
});

test('3. Food Recognition Honesty: Undetermined culinary factors are explicitly declared', async () => {
  const report = await analyzeFoodImage('');
  assert.ok(report.primaryFood.undeterminedFactors.length > 0);
  assert.ok(report.primaryFood.undeterminedFactors.includes('Actual dish identity'));
});
