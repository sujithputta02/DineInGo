const fs = require('fs');
const path = require('path');

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(out, a, b) {
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

function fromRotationTranslationScale(out, q, v, s) {
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

function transformPoint(out, p, m) {
  const x = p[0], y = p[1], z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const invW = w ? 1 / w : 1;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
  return out;
}

function getNodeLocalMatrix(node) {
  if (node.matrix) return [...node.matrix];
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const out = [];
  return fromRotationTranslationScale(out, r, t, s);
}

function analyzeGlb(relPath) {
  const filePath = path.resolve(__dirname, '..', relPath);
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  const binBuf = buf.subarray(20 + jsonLen + 8);

  const worldMatrices = gltf.nodes.map(() => identity());
  const activeNodeIndices = new Set();
  const sceneRootIndices = (gltf.scenes && gltf.scenes[gltf.scene || 0]?.nodes) || [];

  function computeHierarchy(nodeIdx, parentMatrix) {
    activeNodeIndices.add(nodeIdx);
    const node = gltf.nodes[nodeIdx];
    if (!node) return;
    const localMat = getNodeLocalMatrix(node);
    const worldMat = [];
    multiply(worldMat, parentMatrix, localMat);
    worldMatrices[nodeIdx] = worldMat;

    (node.children || []).forEach(childIdx => {
      computeHierarchy(childIdx, worldMat);
    });
  }

  sceneRootIndices.forEach(rootIdx => {
    computeHierarchy(rootIdx, identity());
  });

  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];
  let totalVertices = 0;

  const meshDetails = [];

  activeNodeIndices.forEach(nodeIdx => {
    const node = gltf.nodes[nodeIdx];
    if (!node || node.mesh === undefined) return;
    const mesh = gltf.meshes[node.mesh];
    if (!mesh) return;
    const worldMat = worldMatrices[nodeIdx];

    let meshMin = [Infinity, Infinity, Infinity];
    let meshMax = [-Infinity, -Infinity, -Infinity];

    mesh.primitives.forEach(prim => {
      const posAccIdx = prim.attributes?.POSITION;
      if (posAccIdx === undefined) return;

      const acc = gltf.accessors[posAccIdx];
      const bv = gltf.bufferViews[acc.bufferView];
      const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const byteStride = bv.byteStride || 12;

      for (let i = 0; i < acc.count; i++) {
        const offset = byteOffset + i * byteStride;
        const x = binBuf.readFloatLE(offset);
        const y = binBuf.readFloatLE(offset + 4);
        const z = binBuf.readFloatLE(offset + 8);

        const transformed = [];
        transformPoint(transformed, [x, y, z], worldMat);

        globalMin[0] = Math.min(globalMin[0], transformed[0]);
        globalMin[1] = Math.min(globalMin[1], transformed[1]);
        globalMin[2] = Math.min(globalMin[2], transformed[2]);

        globalMax[0] = Math.max(globalMax[0], transformed[0]);
        globalMax[1] = Math.max(globalMax[1], transformed[1]);
        globalMax[2] = Math.max(globalMax[2], transformed[2]);

        meshMin[0] = Math.min(meshMin[0], transformed[0]);
        meshMin[1] = Math.min(meshMin[1], transformed[1]);
        meshMin[2] = Math.min(meshMin[2], transformed[2]);

        meshMax[0] = Math.max(meshMax[0], transformed[0]);
        meshMax[1] = Math.max(meshMax[1], transformed[1]);
        meshMax[2] = Math.max(meshMax[2], transformed[2]);
        totalVertices++;
      }
    });

    meshDetails.push({
      node: node.name || nodeIdx,
      mesh: mesh.name || node.mesh,
      min: meshMin,
      max: meshMax,
      width_cm: (meshMax[0] - meshMin[0]) * 100,
      height_cm: (meshMax[1] - meshMin[1]) * 100,
      depth_cm: (meshMax[2] - meshMin[2]) * 100
    });
  });

  const width = globalMax[0] - globalMin[0];
  const height = globalMax[1] - globalMin[1];
  const depth = globalMax[2] - globalMin[2];
  const center = [
    (globalMin[0] + globalMax[0]) / 2,
    (globalMin[1] + globalMax[1]) / 2,
    (globalMin[2] + globalMax[2]) / 2
  ];

  return {
    model: path.basename(relPath, '.glb'),
    filePath: relPath,
    totalVertices,
    min: globalMin,
    max: globalMax,
    dimensions: {
      width_m: width,
      height_m: height,
      depth_m: depth,
      width_cm: width * 100,
      height_cm: height * 100,
      depth_cm: depth * 100
    },
    center,
    lowestY_m: globalMin[1],
    meshDetails
  };
}

module.exports = { analyzeGlb };

if (require.main === module) {
  const names = ['french-onion-soup', 'salad-bowl', 'braised-beef', 'baked-pie', 'creme-brulee'];
  const results = names.map(n => analyzeGlb('public/models/ar/' + n + '.glb'));
  console.log(JSON.stringify(results, null, 2));
}
