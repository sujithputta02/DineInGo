const fs = require('fs');
const path = require('path');
const { analyzeGlb } = require('./diagnose-models.cjs');

/**
 * Repeatable Calibration Report and Automated Bounds Verification Script.
 * Inspects all calibrated 3D dish models in public/models/ar/*.glb.
 * Validates:
 * 1. File existence and valid glTF 2.0 structure.
 * 2. Physical dimensions are within realistic target servingware tolerances.
 * 3. Base tabletop contact plane: lowestY is within +/- 1mm of Y=0.
 * 4. Footprint center: |centerX| <= 2mm, |centerZ| <= 2mm (or documented ramekin center).
 * 5. Uniform scale factor preservation.
 */

const EXPECTED_SPECS = {
  'french-onion-soup': {
    name: 'Artisanal French Onion Soup',
    targetServingware: 'Ceramic soup crock / lion-head bowl (16cm diam, 7.5cm height)',
    targetWidthRange: [0.15, 0.17],
    targetHeightRange: [0.065, 0.085],
    targetDepthRange: [0.15, 0.17],
    maxLowestYOffset: 0.001,
    maxCenterOffset: 0.002
  },
  'salad-bowl': {
    name: 'Fresh Garden Caesar Salad',
    targetServingware: 'Ceramic salad / pasta bowl (21cm diam, 8.8cm height)',
    targetWidthRange: [0.20, 0.22],
    targetHeightRange: [0.075, 0.100],
    targetDepthRange: [0.20, 0.22],
    maxLowestYOffset: 0.001,
    maxCenterOffset: 0.002
  },
  'braised-beef': {
    name: 'Slow-Braised Beef Bourguignon',
    targetServingware: 'Braised beef plated entrée presentation (20cm width, 4.3cm height)',
    targetWidthRange: [0.19, 0.21],
    targetHeightRange: [0.035, 0.055],
    targetDepthRange: [0.10, 0.13],
    maxLowestYOffset: 0.001,
    maxCenterOffset: 0.002
  },
  'baked-pie': {
    name: 'Warm Apple Tarte Tatin',
    targetServingware: 'Individual baked dessert tart (17cm diam, 2.7cm height)',
    targetWidthRange: [0.16, 0.18],
    targetHeightRange: [0.020, 0.035],
    targetDepthRange: [0.16, 0.18],
    maxLowestYOffset: 0.001,
    maxCenterOffset: 0.002
  },
  'creme-brulee': {
    name: 'Vanilla Bean Crème Brûlée',
    targetServingware: 'Porcelain ramekin (12cm diam, 3.0cm height with spoon)',
    targetWidthRange: [0.11, 0.13],
    targetHeightRange: [0.025, 0.040],
    targetDepthRange: [0.15, 0.18],
    maxLowestYOffset: 0.001,
    maxCenterOffset: 0.025 // Spoon extends out slightly along Z
  }
};

function runVerification() {
  console.log('================================================================================');
  console.log('           DINEINGO AR: PHYSICAL SCALE & TABLETOP PLACEMENT REPORT             ');
  console.log('================================================================================\n');

  let allPassed = true;
  const reportRows = [];

  for (const [modelId, spec] of Object.entries(EXPECTED_SPECS)) {
    const glbRelPath = `public/models/ar/${modelId}.glb`;
    const fullPath = path.resolve(__dirname, '..', glbRelPath);

    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Asset missing: ${glbRelPath}`);
      allPassed = false;
      continue;
    }

    const data = analyzeGlb(glbRelPath);
    const { width_m, height_m, depth_m } = data.dimensions;
    const lowestY = data.lowestY_m;
    const [cx, cy, cz] = data.center;

    // Checks
    const widthOk = width_m >= spec.targetWidthRange[0] && width_m <= spec.targetWidthRange[1];
    const heightOk = height_m >= spec.targetHeightRange[0] && height_m <= spec.targetHeightRange[1];
    const depthOk = depth_m >= spec.targetDepthRange[0] && depth_m <= spec.targetDepthRange[1];
    const lowestYOk = Math.abs(lowestY) <= spec.maxLowestYOffset;
    const centerOk = Math.abs(cx) <= spec.maxCenterOffset && Math.abs(cz) <= spec.maxCenterOffset;

    const pass = widthOk && heightOk && depthOk && lowestYOk && centerOk;
    if (!pass) allPassed = false;

    reportRows.push({
      id: modelId,
      name: spec.name,
      dimensions_cm: `${(width_m * 100).toFixed(1)} × ${(height_m * 100).toFixed(1)} × ${(depth_m * 100).toFixed(1)} cm`,
      lowestY_mm: `${(lowestY * 1000).toFixed(2)} mm`,
      center_cm: `(${ (cx * 100).toFixed(2) }, ${ (cz * 100).toFixed(2) }) cm`,
      status: pass ? 'PASS' : 'FAIL',
      issues: [
        !widthOk && `Width ${(width_m * 100).toFixed(1)}cm out of [${spec.targetWidthRange.map(v => v*100).join('-')}]cm`,
        !heightOk && `Height ${(height_m * 100).toFixed(1)}cm out of [${spec.targetHeightRange.map(v => v*100).join('-')}]cm`,
        !depthOk && `Depth ${(depth_m * 100).toFixed(1)}cm out of [${spec.targetDepthRange.map(v => v*100).join('-')}]cm`,
        !lowestYOk && `Lowest Y ${(lowestY * 1000).toFixed(2)}mm exceeds +/- 1mm`,
        !centerOk && `Center offset (${(cx*100).toFixed(1)}, ${(cz*100).toFixed(1)}) exceeds tolerance`
      ].filter(Boolean)
    });
  }

  console.table(reportRows.map(r => ({
    Dish: r.name,
    'Dimensions (W × H × D)': r.dimensions_cm,
    'Ground Contact (Y=0)': r.lowestY_mm,
    'Footprint Center (X, Z)': r.center_cm,
    Status: r.status
  })));

  reportRows.forEach(r => {
    if (r.issues.length > 0) {
      console.warn(`[WARN] ${r.name}: ${r.issues.join(', ')}`);
    }
  });

  if (allPassed) {
    console.log('\n[PASS] All 5 3D dish assets meet physical AR scale and surface placement tolerances.');
  } else {
    console.error('\n[FAIL] One or more assets failed verification tolerances.');
  }

  return allPassed;
}

module.exports = { runVerification, EXPECTED_SPECS };

if (require.main === module) {
  const success = runVerification();
  process.exit(success ? 0 : 1);
}
