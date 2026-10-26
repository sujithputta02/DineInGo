import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDishModel,
  detectDeviceARSupport,
  validateModelUrl,
  ALLOWED_EXTERNAL_MODEL_DOMAINS,
  VERIFIED_MODELS,
  DEMO_MENU_ITEMS,
  DEMO_RESTAURANT
} from '../src/services/arModelService.js';

// ============================================================================
// SUITE 1: 3D MODEL URL SECURITY & VALIDATION
// ============================================================================

test('1. Model URL Security: Valid local relative paths resolve correctly', () => {
  const validRel1 = validateModelUrl('/models/ar/french-onion-soup.glb');
  assert.equal(validRel1.valid, true);

  const validRel2 = validateModelUrl('/models/custom-dish.gltf?v=2');
  assert.equal(validRel2.valid, true);
});

test('2. Model URL Security: Rejects relative paths with path traversal and outside /models/', () => {
  const traversal1 = validateModelUrl('/models/../etc/passwd.glb');
  assert.equal(traversal1.valid, false);
  assert.ok(traversal1.reason?.includes('traversal'));

  const traversal2 = validateModelUrl('/models/ar/..\\windows.glb');
  assert.equal(traversal2.valid, false);

  const outsideDir = validateModelUrl('/uploads/dish.glb');
  assert.equal(outsideDir.valid, false);
  assert.ok(outsideDir.reason?.includes('/models/'));

  const protocolRelative = validateModelUrl('//malicious.com/dish.glb');
  assert.equal(protocolRelative.valid, false);
});

test('3. Model URL Security: Rejects dangerous schemes (javascript, data, file, http)', () => {
  const jsScheme = validateModelUrl('javascript:alert(1)');
  assert.equal(jsScheme.valid, false);
  assert.ok(jsScheme.reason?.includes('scheme'));

  const dataScheme = validateModelUrl('data:model/gltf-binary;base64,AAAA');
  assert.equal(dataScheme.valid, false);

  const fileScheme = validateModelUrl('file:///etc/model.glb');
  assert.equal(fileScheme.valid, false);

  const insecureHttp = validateModelUrl('http://s3.amazonaws.com/bucket/model.glb');
  assert.equal(insecureHttp.valid, false);
  assert.ok(insecureHttp.reason?.includes('HTTPS'));
});

test('4. Model URL Security: Enforces trusted external domain whitelist and rejects untrusted/placeholder hosts', () => {
  const trustedS3 = validateModelUrl('https://dineingo-assets.s3.amazonaws.com/models/salad.glb');
  assert.equal(trustedS3.valid, true);

  const trustedCloudfront = validateModelUrl('https://d123456.cloudfront.net/models/dish.glb?sig=xyz');
  assert.equal(trustedCloudfront.valid, true);

  const trustedCloudinary = validateModelUrl('https://res.cloudinary.com/dineingo/raw/upload/dish.glb');
  assert.equal(trustedCloudinary.valid, true);

  const untrustedHost = validateModelUrl('https://random-untrusted-host.xyz/model.glb');
  assert.equal(untrustedHost.valid, false);
  assert.ok(untrustedHost.reason?.includes('whitelist'));

  const placeholderHost = validateModelUrl('https://example.com/model.glb');
  assert.equal(placeholderHost.valid, false);

  const sketchfabPlaceholder = validateModelUrl('https://sketchfab.com/models/d1d1d1d1d1d1d1d1d1d1d1d1/download');
  assert.equal(sketchfabPlaceholder.valid, false);
});

test('5. Model URL Security: Rejects non-3D file extensions and malformed URLs', () => {
  const imageAsModel = validateModelUrl('https://s3.amazonaws.com/models/dish.png');
  assert.equal(imageAsModel.valid, false);
  assert.ok(imageAsModel.reason?.includes('.glb or .gltf'));

  const scriptAsModel = validateModelUrl('https://s3.amazonaws.com/models/dish.js');
  assert.equal(scriptAsModel.valid, false);

  const malformed = validateModelUrl('https://::malformed-url::');
  assert.equal(malformed.valid, false);
});

// ============================================================================
// SUITE 2: 4-TIER MODEL RESOLUTION PIPELINE
// ============================================================================

test('6. Priority 1 (Explicit modelUrl): Trusted external HTTPS GLB takes highest priority', () => {
  const customDish = {
    name: 'Chef Custom Tenderloin',
    modelUrl: 'https://dineingo-assets.s3.amazonaws.com/models/custom-beef.glb'
  };

  const result = resolveDishModel(customDish);
  assert.equal(result.hasModel, true);
  assert.equal(result.tier, 'explicit');
  assert.equal(result.modelUrl, 'https://dineingo-assets.s3.amazonaws.com/models/custom-beef.glb');
  assert.equal(result.isRepresentativePreview, false);
});

test('7. Priority 1 (Explicit modelUrl): Invalid modelUrl rejected and falls back safely', () => {
  const maliciousDish = {
    name: 'Artisanal French Onion Soup',
    modelUrl: 'javascript:alert(document.cookie)' // should be rejected!
  };

  const result = resolveDishModel(maliciousDish);
  // Malicious URL rejected; falls through to Priority 2 (verified exact dish match)
  assert.notEqual(result.modelUrl, 'javascript:alert(document.cookie)');
  assert.equal(result.tier, 'dish-match');
  assert.equal(result.modelUrl, '/models/ar/french-onion-soup.glb');
});

test('8. Priority 2 (Specific Dish Match): Exact dish names match verified models', () => {
  // 8a: French Onion Soup
  const soup = resolveDishModel({ name: 'Artisanal French Onion Soup' });
  assert.equal(soup.hasModel, true);
  assert.equal(soup.tier, 'dish-match');
  assert.equal(soup.modelUrl, '/models/ar/french-onion-soup.glb');
  assert.equal(soup.isRepresentativePreview, false);

  // 8b: Caesar Salad
  const salad = resolveDishModel({ name: 'Fresh Garden Caesar Salad' });
  assert.equal(salad.hasModel, true);
  assert.equal(salad.tier, 'dish-match');
  assert.equal(salad.modelUrl, '/models/ar/salad-bowl.glb');

  // 8c: Beef Bourguignon
  const beef = resolveDishModel({ name: 'Slow-Braised Beef Bourguignon' });
  assert.equal(beef.hasModel, true);
  assert.equal(beef.tier, 'dish-match');
  assert.equal(beef.modelUrl, '/models/ar/braised-beef.glb');

  // 8d: Apple Tarte Tatin
  const pie = resolveDishModel({ name: 'Warm Apple Tarte Tatin' });
  assert.equal(pie.hasModel, true);
  assert.equal(pie.tier, 'dish-match');
  assert.equal(pie.modelUrl, '/models/ar/baked-pie.glb');

  // 8e: Crème Brûlée
  const creme = resolveDishModel({ name: 'Vanilla Bean Crème Brûlée' });
  assert.equal(creme.hasModel, true);
  assert.equal(creme.tier, 'dish-match');
  assert.equal(creme.modelUrl, '/models/ar/creme-brulee.glb');
});

test('9. Conservative Category Match: Generic dishes DO NOT match specific twins as exact matches', () => {
  // A generic "Grandma's Chicken Noodle Soup" must NOT match as exact French Onion Soup!
  const genericChickenSoup = {
    name: "Grandma's Chicken Noodle Soup",
    categoryName: 'Soups & Starters'
  };

  const result = resolveDishModel(genericChickenSoup);
  // It should match Priority 3 (Category match) with explicit representative preview label, NOT Priority 2!
  assert.equal(result.hasModel, true);
  assert.equal(result.tier, 'category-match');
  assert.equal(result.isRepresentativePreview, true);
  assert.ok(result.label.includes('Representative Preview'));
});

test('10. Priority 4 (Photo Fallback): Dishes without 3D models degrade gracefully to photo preview', () => {
  const pastaDish = {
    name: 'Truffle Tagliatelle al Tartufo',
    categoryName: 'Chef Pasta Specials'
  };

  const result = resolveDishModel(pastaDish);
  assert.equal(result.hasModel, false);
  assert.equal(result.modelUrl, null);
  assert.equal(result.tier, 'none');
  assert.equal(result.isRepresentativePreview, false);
  assert.ok(result.label.includes('Photo Preview'));
});

test('11. Safe handling of null, undefined, or empty inputs without throwing', () => {
  assert.doesNotThrow(() => {
    const resNull = resolveDishModel(null);
    assert.equal(resNull.hasModel, false);

    const resUndef = resolveDishModel(undefined);
    assert.equal(resUndef.hasModel, false);

    const resEmpty = resolveDishModel({ name: '' });
    assert.equal(resEmpty.hasModel, false);
  });
});

// ============================================================================
// SUITE 3: DEMO DATA ISOLATION & AR CAPABILITY DETECTION
// ============================================================================

test('12. Sample Demo Data integrity and isolation', () => {
  assert.ok(DEMO_MENU_ITEMS.length >= 5, 'Demo must contain at least 5 sample dishes');
  assert.equal(DEMO_RESTAURANT.isDemo, true);

  DEMO_MENU_ITEMS.forEach((dish) => {
    assert.ok(dish.id, 'Dish must have stable ID');
    assert.ok(dish.name, 'Dish must have name');
    assert.ok(dish.price > 0, 'Dish must have sensible price');
    assert.ok(dish.image, 'Dish must have image');
    assert.equal(dish.isDemoDish, true, 'Dish must be flagged as demo dish');
  });

  // Verify dishes with real 3D models
  const dishesWith3D = DEMO_MENU_ITEMS.filter((d) => d.modelUrl && d.modelUrl.endsWith('.glb'));
  assert.ok(dishesWith3D.length >= 4, 'Demo must have verified 3D models');

  // Verify photo fallback dish
  const fallbackDish = DEMO_MENU_ITEMS.find((d) => !d.modelUrl);
  assert.ok(fallbackDish, 'Demo must contain a photo-only fallback dish');
});

test('13. Device AR detection structure and security context awareness', () => {
  const status = detectDeviceARSupport();
  assert.ok(typeof status.isARSupported === 'boolean');
  assert.ok(typeof status.isMobile === 'boolean');
  assert.ok(typeof status.isSecureContext === 'boolean');
  assert.ok(['android', 'ios', 'desktop', 'unknown'].includes(status.platform));
  assert.ok(['scene-viewer', 'quick-look', 'webxr', 'none'].includes(status.recommendedMode));
  assert.ok(typeof status.reason === 'string');
});
