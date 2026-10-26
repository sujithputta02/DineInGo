import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDishModel,
  detectDeviceARSupport,
  VERIFIED_MODELS,
  DEMO_MENU_ITEMS,
  DEMO_RESTAURANT,
  get3DModelUrl,
  has3DModel
} from '../src/services/arModelService.js';

test('1. Priority 1 (Explicit modelUrl): Explicit valid GLB takes highest priority', () => {
  const customDish = {
    name: 'Special Dish',
    modelUrl: 'https://example.com/custom-model.glb'
  };

  const result = resolveDishModel(customDish);
  assert.equal(result.hasModel, true);
  assert.equal(result.tier, 'explicit');
  assert.equal(result.modelUrl, 'https://example.com/custom-model.glb');
  assert.equal(result.isRepresentativePreview, false);
});

test('2. Priority 2 (Specific Dish Match): Verified dish names match correct GLB models', () => {
  // Test 2a: French Onion Soup
  const soupResult = resolveDishModel({ name: 'Artisanal French Onion Soup' });
  assert.equal(soupResult.hasModel, true);
  assert.equal(soupResult.tier, 'dish-match');
  assert.equal(soupResult.modelUrl, '/models/ar/french-onion-soup.glb');
  assert.equal(soupResult.isRepresentativePreview, false);

  // Test 2b: Caesar Salad
  const saladResult = resolveDishModel({ name: 'Fresh Garden Caesar Salad' });
  assert.equal(saladResult.hasModel, true);
  assert.equal(saladResult.tier, 'dish-match');
  assert.equal(saladResult.modelUrl, '/models/ar/salad-bowl.glb');

  // Test 2c: Braised Beef Bourguignon
  const beefResult = resolveDishModel({ name: 'Slow-Braised Beef Bourguignon' });
  assert.equal(beefResult.hasModel, true);
  assert.equal(beefResult.tier, 'dish-match');
  assert.equal(beefResult.modelUrl, '/models/ar/braised-beef.glb');

  // Test 2d: Apple Tarte Tatin
  const pieResult = resolveDishModel({ name: 'Warm Apple Tarte Tatin' });
  assert.equal(pieResult.hasModel, true);
  assert.equal(pieResult.tier, 'dish-match');
  assert.equal(pieResult.modelUrl, '/models/ar/baked-pie.glb');

  // Test 2e: Crème Brûlée
  const cremeResult = resolveDishModel({ name: 'Vanilla Bean Crème Brûlée' });
  assert.equal(cremeResult.hasModel, true);
  assert.equal(cremeResult.tier, 'dish-match');
  assert.equal(cremeResult.modelUrl, '/models/ar/creme-brulee.glb');
});

test('3. Priority 3 (Category Match): Generic category match gives representative preview', () => {
  const genericSoup = {
    name: 'House Special Velouté',
    categoryName: 'Soups & Broths'
  };

  const result = resolveDishModel(genericSoup);
  assert.equal(result.hasModel, true);
  assert.equal(result.tier, 'category-match');
  assert.equal(result.isRepresentativePreview, true);
  assert.ok(result.label.includes('Representative Preview'));
});

test('4. Priority 4 (Photo Fallback): Dishes without 3D models degrade gracefully to photo preview', () => {
  const pastaDish = {
    name: 'Truffle Tagliatelle al Tartufo',
    categoryName: 'Chef Pasta Specials'
    // No modelUrl, no match in verified catalog
  };

  const result = resolveDishModel(pastaDish);
  assert.equal(result.hasModel, false);
  assert.equal(result.modelUrl, null);
  assert.equal(result.tier, 'none');
  assert.equal(result.isRepresentativePreview, false);
});

test('5. Safe handling of null, undefined, or empty objects without throwing', () => {
  assert.doesNotThrow(() => {
    const resNull = resolveDishModel(null);
    assert.equal(resNull.hasModel, false);

    const resUndef = resolveDishModel(undefined);
    assert.equal(resUndef.hasModel, false);

    const resEmpty = resolveDishModel({ name: '' });
    assert.equal(resEmpty.hasModel, false);
  });
});

test('6. Fake placeholder URLs (e.g. sketchfab d1d1...) are rejected', () => {
  const fakeDish = {
    name: 'Unrelated Food Item',
    modelUrl: 'https://sketchfab.com/models/d1d1d1d1d1d1d1d1d1d1d1d1/download'
  };

  const result = resolveDishModel(fakeDish);
  // Should reject fake URL and fall back to photo preview
  assert.notEqual(result.modelUrl, 'https://sketchfab.com/models/d1d1d1d1d1d1d1d1d1d1d1d1/download');
  assert.notEqual(result.tier, 'explicit');
});

test('7. Sample Demo Data integrity and isolation', () => {
  assert.ok(DEMO_MENU_ITEMS.length >= 5, 'Demo must have at least 5 sample dishes');
  assert.equal(DEMO_RESTAURANT.isDemo, true);

  // Verify all dishes have required fields and are tagged as demo dishes
  DEMO_MENU_ITEMS.forEach((dish) => {
    assert.ok(dish.id, 'Dish must have stable ID');
    assert.ok(dish.name, 'Dish must have name');
    assert.ok(dish.price > 0, 'Dish must have price');
    assert.ok(dish.image, 'Dish must have image');
    assert.equal(dish.isDemoDish, true, 'Dish must be flagged as demo dish');
  });

  // Verify that at least one dish demonstrates genuine 3D model loading
  const dishesWith3D = DEMO_MENU_ITEMS.filter((d) => d.modelUrl && d.modelUrl.endsWith('.glb'));
  assert.ok(dishesWith3D.length >= 4, 'Demo must have verified 3D models');

  // Verify that at least one dish tests the photo fallback (no model)
  const fallbackDish = DEMO_MENU_ITEMS.find((d) => !d.modelUrl);
  assert.ok(fallbackDish, 'Demo must contain a photo-only fallback dish');
});

test('8. Device AR detection structure', () => {
  const status = detectDeviceARSupport();
  assert.ok(typeof status.isARSupported === 'boolean');
  assert.ok(typeof status.isMobile === 'boolean');
  assert.ok(['android', 'ios', 'desktop', 'unknown'].includes(status.platform));
  assert.ok(['scene-viewer', 'quick-look', 'webxr', 'none'].includes(status.recommendedMode));
  assert.ok(typeof status.reason === 'string');
});
