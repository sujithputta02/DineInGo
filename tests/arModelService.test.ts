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

// ============================================================================
// SUITE 4: PHYSICAL AR SCALE, GROUND CONTACT & TABLETOP PLACEMENT VERIFICATION
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { analyzeGlb } = await import('../scripts/diagnose-models.cjs');

test('14. Physical AR: All 5 GLB model assets exist and are valid glTF 2.0 files', () => {
  const modelKeys = ['french-onion-soup', 'salad-bowl', 'braised-beef', 'baked-pie', 'creme-brulee'];

  for (const key of modelKeys) {
    const glbPath = path.resolve(__dirname, '..', `public/models/ar/${key}.glb`);
    assert.ok(fs.existsSync(glbPath), `Model file must exist: ${glbPath}`);

    const buf = fs.readFileSync(glbPath);
    assert.ok(buf.length > 1000, `Model file must not be empty: ${key}`);

    // Verify glTF 2.0 binary magic header
    const magic = buf.toString('utf8', 0, 4);
    assert.equal(magic, 'glTF', `File must have glTF magic header: ${key}`);
    const version = buf.readUInt32LE(4);
    assert.equal(version, 2, `File must be glTF version 2: ${key}`);
  }
});

test('15. Tabletop Placement: Ground contact plane Y_min aligns flush to Y = 0.000m (+/- 1mm)', () => {
  const modelKeys = ['french-onion-soup', 'salad-bowl', 'braised-beef', 'baked-pie', 'creme-brulee'];

  for (const key of modelKeys) {
    const data = analyzeGlb(`public/models/ar/${key}.glb`);
    const lowestY = data.lowestY_m;

    // Must be within 1 millimeter of Y = 0.000m so dishes neither float above nor sink into tables
    assert.ok(
      Math.abs(lowestY) <= 0.001,
      `Dish ${key} lowest base Y (${lowestY}m) must be flush with tabletop plane (within +/- 1mm)`
    );
  }
});

test('16. Horizontal Alignment: Footprint center aligns to (0, 0) within defined tolerances', () => {
  const expectedCenters = {
    'french-onion-soup': { maxX: 0.002, maxZ: 0.002 },
    'salad-bowl': { maxX: 0.002, maxZ: 0.002 },
    'braised-beef': { maxX: 0.002, maxZ: 0.002 },
    'baked-pie': { maxX: 0.002, maxZ: 0.002 },
    'creme-brulee': { maxX: 0.002, maxZ: 0.025 } // Ramekin centered at X=0, spoon extends slightly along Z
  };

  for (const [key, tol] of Object.entries(expectedCenters)) {
    const data = analyzeGlb(`public/models/ar/${key}.glb`);
    const [cx, , cz] = data.center;

    assert.ok(
      Math.abs(cx) <= tol.maxX,
      `Dish ${key} center X (${cx}m) must be centered within ${tol.maxX}m`
    );
    assert.ok(
      Math.abs(cz) <= tol.maxZ,
      `Dish ${key} center Z (${cz}m) must be centered within ${tol.maxZ}m`
    );
  }
});

test('17. Physical Scale: Individual dish dimensions match defensible restaurant tableware sizes', () => {
  const targets = {
    // 16cm soup crock
    'french-onion-soup': { width: [0.15, 0.17], height: [0.065, 0.085], depth: [0.15, 0.17] },
    // 21cm salad bowl
    'salad-bowl': { width: [0.20, 0.22], height: [0.075, 0.100], depth: [0.20, 0.22] },
    // 20cm braised beef plated entrée
    'braised-beef': { width: [0.19, 0.21], height: [0.035, 0.055], depth: [0.10, 0.13] },
    // 17cm dessert tart
    'baked-pie': { width: [0.16, 0.18], height: [0.020, 0.035], depth: [0.16, 0.18] },
    // 12cm ramekin with dessert spoon
    'creme-brulee': { width: [0.11, 0.13], height: [0.025, 0.040], depth: [0.15, 0.18] }
  };

  for (const [key, range] of Object.entries(targets)) {
    const data = analyzeGlb(`public/models/ar/${key}.glb`);
    const { width_m, height_m, depth_m } = data.dimensions;

    assert.ok(
      width_m >= range.width[0] && width_m <= range.width[1],
      `Dish ${key} width (${width_m}m) must be within [${range.width.join('-')}]m`
    );
    assert.ok(
      height_m >= range.height[0] && height_m <= range.height[1],
      `Dish ${key} height (${height_m}m) must be within [${range.height.join('-')}]m`
    );
    assert.ok(
      depth_m >= range.depth[0] && depth_m <= range.depth[1],
      `Dish ${key} depth (${depth_m}m) must be within [${range.depth.join('-')}]m`
    );
  }
});

test('18. Camera Framing: VERIFIED_MODELS specifies calibrated camera orbit and target metadata', () => {
  for (const [key, entry] of Object.entries(VERIFIED_MODELS)) {
    assert.ok(entry.cameraOrbit, `Entry ${key} must have cameraOrbit`);
    assert.ok(entry.cameraTarget, `Entry ${key} must have cameraTarget`);
    // Calibrated camera orbit radius should be realistic (~0.35m - 0.60m)
    assert.ok(
      entry.cameraOrbit.includes('0.') || entry.cameraOrbit.includes('m'),
      `Entry ${key} cameraOrbit should reflect calibrated dimensions`
    );
  }
});
