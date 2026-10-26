const fs = require('fs');
const path = require('path');
const { analyzeGlb } = require('./diagnose-models.cjs');

/**
 * Calibrates a GLB file:
 * 1. Optionally filters out unwanted nodes/meshes (such as phantom floor planes).
 * 2. Computes the effective world-space bounding box of the remaining active scene nodes.
 * 3. Applies a uniform scale factor S to achieve the target physical dimension.
 * 4. Applies translation [tx, ty, tz] so that:
 *    - Lowest contact base Y_min = 0.000m (sits flush on table)
 *    - Center X = 0.000m and Center Z = 0.000m (horizontally centered)
 * 5. Bakes this as an explicit top-level anchor node in the glTF hierarchy.
 * 6. Validates the resulting GLB.
 */

function calibrateModel({
  filePath,
  targetWidth,
  targetZDimension, // optional alternate reference dimension
  excludeNodeNames = [],
  centerOnNode = null // optional node name to center on (e.g. ramekin rather than off-center spoon)
}) {
  const fullPath = path.resolve(filePath);
  const buf = fs.readFileSync(fullPath);
  const jsonLength = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));
  const binChunk = buf.subarray(20 + jsonLength);

  // 1. Filter out unwanted nodes (e.g. phantom floor planes)
  if (excludeNodeNames.length > 0) {
    const excludeIndices = new Set();
    gltf.nodes.forEach((node, idx) => {
      if (excludeNodeNames.includes(node.name)) {
        excludeIndices.add(idx);
        // Also exclude all descendant children
        function collectChildren(n) {
          (n.children || []).forEach(c => {
            excludeIndices.add(c);
            if (gltf.nodes[c]) collectChildren(gltf.nodes[c]);
          });
        }
        collectChildren(node);
      }
    });

    gltf.nodes.forEach((node, idx) => {
      if (node.children) {
        node.children = node.children.filter(c => !excludeIndices.has(c));
      }
      if (excludeIndices.has(idx)) {
        delete node.mesh;
        delete node.children;
        node.name = `[EXCLUDED]_${node.name}`;
      }
    });
  }

  // Helper matrix math for computing world positions
  function mult(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }

  function fromRTS(out, q, v, s) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = s[0], sy = s[1], sz = s[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }

  function getNodeLocalMatrix(node) {
    if (node.matrix) return [...node.matrix];
    const q = node.rotation || [0, 0, 0, 1];
    const v = node.translation || [0, 0, 0];
    const s = node.scale || [1, 1, 1];
    const out = new Array(16);
    return fromRTS(out, q, v, s);
  }

  const scene = gltf.scenes[gltf.scene || 0];
  const rootNodeIndices = scene.nodes || [];

  function computeWorldMatrices(nodeIdx, parentMat, map) {
    const node = gltf.nodes[nodeIdx];
    const local = getNodeLocalMatrix(node);
    const world = parentMat ? mult(new Array(16), parentMat, local) : local;
    map.set(nodeIdx, world);
    if (node.children) {
      for (const childIdx of node.children) {
        computeWorldMatrices(childIdx, world, map);
      }
    }
  }

  const worldMatMap = new Map();
  for (const rootIdx of rootNodeIndices) {
    computeWorldMatrices(rootIdx, null, worldMatMap);
  }

  const binData = binChunk.subarray(8); // skip chunk header

  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  let centerRefMin = [Infinity, Infinity, Infinity];
  let centerRefMax = [-Infinity, -Infinity, -Infinity];

  worldMatMap.forEach((worldMat, nodeIdx) => {
    const node = gltf.nodes[nodeIdx];
    if (node.mesh === undefined) return;
    const mesh = gltf.meshes[node.mesh];
    const isCenterRef = !centerOnNode || node.name === centerOnNode;

    for (const prim of mesh.primitives) {
      const posAccIdx = prim.attributes.POSITION;
      if (posAccIdx === undefined) continue;
      const acc = gltf.accessors[posAccIdx];
      const bv = gltf.bufferViews[acc.bufferView];
      const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const byteStride = bv.byteStride || 12;

      for (let i = 0; i < acc.count; i++) {
        const offset = byteOffset + i * byteStride;
        const x = binData.readFloatLE(offset);
        const y = binData.readFloatLE(offset + 4);
        const z = binData.readFloatLE(offset + 8);

        const w = worldMat[3] * x + worldMat[7] * y + worldMat[11] * z + worldMat[15];
        const wx = (worldMat[0] * x + worldMat[4] * y + worldMat[8] * z + worldMat[12]) / w;
        const wy = (worldMat[1] * x + worldMat[5] * y + worldMat[9] * z + worldMat[13]) / w;
        const wz = (worldMat[2] * x + worldMat[6] * y + worldMat[10] * z + worldMat[14]) / w;

        if (wx < globalMin[0]) globalMin[0] = wx;
        if (wy < globalMin[1]) globalMin[1] = wy;
        if (wz < globalMin[2]) globalMin[2] = wz;

        if (wx > globalMax[0]) globalMax[0] = wx;
        if (wy > globalMax[1]) globalMax[1] = wy;
        if (wz > globalMax[2]) globalMax[2] = wz;

        if (isCenterRef) {
          if (wx < centerRefMin[0]) centerRefMin[0] = wx;
          if (wy < centerRefMin[1]) centerRefMin[1] = wy;
          if (wz < centerRefMin[2]) centerRefMin[2] = wz;

          if (wx > centerRefMax[0]) centerRefMax[0] = wx;
          if (wy > centerRefMax[1]) centerRefMax[1] = wy;
          if (wz > centerRefMax[2]) centerRefMax[2] = wz;
        }
      }
    }
  });

  const rawWidth = globalMax[0] - globalMin[0];
  const rawHeight = globalMax[1] - globalMin[1];
  const rawDepth = globalMax[2] - globalMin[2];

  const refWidth = centerOnNode ? (centerRefMax[0] - centerRefMin[0]) : rawWidth;
  const scale = targetWidth / refWidth;

  const centerX = (centerRefMin[0] + centerRefMax[0]) / 2;
  const centerZ = (centerRefMin[2] + centerRefMax[2]) / 2;
  const lowestY = globalMin[1];

  const tx = -scale * centerX;
  const ty = -scale * lowestY;
  const tz = -scale * centerZ;

  // Create calibrated anchor node
  const calibratedRootIdx = gltf.nodes.length;
  gltf.nodes.push({
    name: 'AR_Tabletop_Calibrated_Root',
    translation: [tx, ty, tz],
    scale: [scale, scale, scale],
    children: [...rootNodeIndices]
  });

  scene.nodes = [calibratedRootIdx];

  // Serialize updated glTF
  let jsonStr = JSON.stringify(gltf);
  while (jsonStr.length % 4 !== 0) {
    jsonStr += ' ';
  }

  const newJsonByteLength = Buffer.byteLength(jsonStr, 'utf8');
  const totalLength = 12 + 8 + newJsonByteLength + binChunk.length;

  const outBuf = Buffer.alloc(totalLength);
  outBuf.write('glTF', 0);
  outBuf.writeUInt32LE(2, 4);
  outBuf.writeUInt32LE(totalLength, 8);

  outBuf.writeUInt32LE(newJsonByteLength, 12);
  outBuf.write('JSON', 16);
  outBuf.write(jsonStr, 20, 'utf8');

  binChunk.copy(outBuf, 20 + newJsonByteLength);
  fs.writeFileSync(fullPath, outBuf);

  // Validate the calibrated GLB
  const validation = analyzeGlb(filePath);

  return {
    filePath,
    rawDimensions: { width: rawWidth, height: rawHeight, depth: rawDepth },
    targetWidth,
    scale,
    tx,
    ty,
    tz,
    calibratedDimensions: validation.dimensions,
    lowestY: validation.lowestY_m,
    center: validation.center
  };
}

module.exports = { calibrateModel };

if (require.main === module) {
  console.log('=== CALIBRATING AR MODELS TO PHYSICAL DIMENSIONS & TABLETOP PLACEMENT ===\n');

  const configs = [
    {
      filePath: 'public/models/ar/french-onion-soup.glb',
      targetWidth: 0.160 // 16cm diameter French onion soup crock
    },
    {
      filePath: 'public/models/ar/salad-bowl.glb',
      targetWidth: 0.210 // 21cm diameter garden Caesar salad bowl
    },
    {
      filePath: 'public/models/ar/braised-beef.glb',
      targetWidth: 0.200 // 20cm width braised beef plated entrée
    },
    {
      filePath: 'public/models/ar/baked-pie.glb',
      targetWidth: 0.170 // 17cm diameter warm apple tarte
    },
    {
      filePath: 'public/models/ar/creme-brulee.glb',
      targetWidth: 0.120, // 12cm ramekin diameter
      excludeNodeNames: ['Plane.002'], // Remove 4.4-meter phantom floor plane
      centerOnNode: 'pot_LR_PBR.001_0' // Center on ramekin base
    }
  ];

  const results = configs.map(cfg => {
    const res = calibrateModel(cfg);
    console.log(`Calibrated ${path.basename(cfg.filePath)}:`);
    console.log(`  Scale Factor: ${res.scale.toFixed(8)}`);
    console.log(`  Target Width: ${(res.targetWidth * 100).toFixed(2)} cm`);
    console.log(`  Final Width:  ${res.calibratedDimensions.width_cm.toFixed(2)} cm`);
    console.log(`  Final Height: ${res.calibratedDimensions.height_cm.toFixed(2)} cm`);
    console.log(`  Final Depth:  ${res.calibratedDimensions.depth_cm.toFixed(2)} cm`);
    console.log(`  Lowest Y (ground plane): ${res.lowestY.toFixed(6)} m`);
    console.log(`  Center: [${res.center.map(v => v.toFixed(6)).join(', ')}]`);
    console.log('');
    return res;
  });

  console.log('All 5 models calibrated successfully.');
}
