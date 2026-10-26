export interface ExtractedGlbDimensions {
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  lowestYMeters: number;
  centerMeters: [number, number, number];
  contactPlaneAligned: boolean;
  totalVertices?: number;
  source: 'gltf-accessor-measured';
}

function identityMatrix(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrices(out: number[], a: number[], b: number[]): number[] {
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

function matrixFromTRS(out: number[], q: number[], v: number[], s: number[]): number[] {
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

function transformPoint(out: number[], p: [number, number, number], m: number[]): number[] {
  const x = p[0], y = p[1], z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const invW = w ? 1 / w : 1;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
  return out;
}

function getNodeLocalMatrix(node: any): number[] {
  if (node.matrix) return [...node.matrix];
  const t = node.translation || [0, 0, 0];
  const r = node.rotation || [0, 0, 0, 1];
  const s = node.scale || [1, 1, 1];
  const out: number[] = [];
  return matrixFromTRS(out, r, t, s);
}

/**
 * Parses a glTF 2.0 binary (.glb) buffer, extracts vertex accessors and scene node
 * hierarchy, and calculates the true world-space bounding dimensions in meters.
 *
 * If the asset is invalid, corrupted, or does not contain 3D mesh geometry,
 * returns null rather than fabricating fallback numbers.
 */
export function extractGlbDimensions(glbBuffer: Buffer): ExtractedGlbDimensions | null {
  try {
    // 1. Verify GLB header (12 bytes)
    if (glbBuffer.length < 12) return null;
    const magic = glbBuffer.readUInt32LE(0);
    const version = glbBuffer.readUInt32LE(4);
    if (magic !== 0x46546C67 || version !== 2) return null;

    // 2. Parse JSON chunk (chunk 0)
    const jsonLen = glbBuffer.readUInt32LE(12);
    const chunkType = glbBuffer.readUInt32LE(16);
    if (chunkType !== 0x4E4F534A) return null; // 'JSON'

    const jsonStr = glbBuffer.toString('utf8', 20, 20 + jsonLen);
    const gltf = JSON.parse(jsonStr);

    if (!gltf.meshes || gltf.meshes.length === 0 || !gltf.accessors) {
      return null;
    }

    // Binary buffer chunk (chunk 1) if available
    const binChunkOffset = 20 + jsonLen;
    let binBuf: Buffer | null = null;
    if (glbBuffer.length >= binChunkOffset + 8) {
      const binLen = glbBuffer.readUInt32LE(binChunkOffset);
      const binType = glbBuffer.readUInt32LE(binChunkOffset + 4);
      if (binType === 0x004E4942) { // 'BIN\0'
        binBuf = glbBuffer.subarray(binChunkOffset + 8, binChunkOffset + 8 + binLen);
      }
    }

    const nodes = gltf.nodes || [];
    const worldMatrices: number[][] = nodes.map(() => identityMatrix());
    const activeNodeIndices = new Set<number>();
    const sceneRootIndices: number[] = (gltf.scenes && gltf.scenes[gltf.scene || 0]?.nodes) || [];

    if (sceneRootIndices.length === 0 && nodes.length > 0) {
      // If no scene specified, treat top-level nodes as roots
      nodes.forEach((_: any, idx: number) => sceneRootIndices.push(idx));
    }

    function computeHierarchy(nodeIdx: number, parentMatrix: number[]) {
      if (nodeIdx < 0 || nodeIdx >= nodes.length) return;
      activeNodeIndices.add(nodeIdx);
      const node = nodes[nodeIdx];
      if (!node) return;

      const localMat = getNodeLocalMatrix(node);
      const worldMat: number[] = [];
      multiplyMatrices(worldMat, parentMatrix, localMat);
      worldMatrices[nodeIdx] = worldMat;

      (node.children || []).forEach((childIdx: number) => {
        computeHierarchy(childIdx, worldMat);
      });
    }

    sceneRootIndices.forEach(rootIdx => {
      computeHierarchy(rootIdx, identityMatrix());
    });

    let globalMin = [Infinity, Infinity, Infinity];
    let globalMax = [-Infinity, -Infinity, -Infinity];
    let totalVertices = 0;
    let foundGeometry = false;

    // Helper to incorporate transformed point into global bounding box
    function includePoint(transformed: number[]) {
      globalMin[0] = Math.min(globalMin[0], transformed[0]);
      globalMin[1] = Math.min(globalMin[1], transformed[1]);
      globalMin[2] = Math.min(globalMin[2], transformed[2]);

      globalMax[0] = Math.max(globalMax[0], transformed[0]);
      globalMax[1] = Math.max(globalMax[1], transformed[1]);
      globalMax[2] = Math.max(globalMax[2], transformed[2]);
      foundGeometry = true;
    }

    activeNodeIndices.forEach(nodeIdx => {
      const node = nodes[nodeIdx];
      if (!node || node.mesh === undefined) return;
      const mesh = gltf.meshes[node.mesh];
      if (!mesh || !mesh.primitives) return;
      const worldMat = worldMatrices[nodeIdx];

      mesh.primitives.forEach((prim: any) => {
        const posAccIdx = prim.attributes?.POSITION;
        if (posAccIdx === undefined || posAccIdx >= gltf.accessors.length) return;

        const acc = gltf.accessors[posAccIdx];
        if (!acc) return;

        // If binary buffer chunk is present, read exact vertex coordinates
        if (binBuf && acc.bufferView !== undefined && gltf.bufferViews && gltf.bufferViews[acc.bufferView]) {
          const bv = gltf.bufferViews[acc.bufferView];
          const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
          const byteStride = bv.byteStride || 12;

          for (let i = 0; i < acc.count; i++) {
            const offset = byteOffset + i * byteStride;
            if (offset + 12 <= binBuf.length) {
              const x = binBuf.readFloatLE(offset);
              const y = binBuf.readFloatLE(offset + 4);
              const z = binBuf.readFloatLE(offset + 8);
              const transformed: number[] = [];
              transformPoint(transformed, [x, y, z], worldMat);
              includePoint(transformed);
              totalVertices++;
            }
          }
        } else if (Array.isArray(acc.min) && Array.isArray(acc.max) && acc.min.length === 3 && acc.max.length === 3) {
          // If binary chunk is not embedded, transform the 8 corners of the accessor bounding box
          const corners: [number, number, number][] = [
            [acc.min[0], acc.min[1], acc.min[2]],
            [acc.max[0], acc.min[1], acc.min[2]],
            [acc.min[0], acc.max[1], acc.min[2]],
            [acc.max[0], acc.max[1], acc.min[2]],
            [acc.min[0], acc.min[1], acc.max[2]],
            [acc.max[0], acc.min[1], acc.max[2]],
            [acc.min[0], acc.max[1], acc.max[2]],
            [acc.max[0], acc.max[1], acc.max[2]]
          ];

          for (const corner of corners) {
            const transformed: number[] = [];
            transformPoint(transformed, corner, worldMat);
            includePoint(transformed);
          }
          totalVertices += (acc.count || 0);
        }
      });
    });

    if (!foundGeometry || !isFinite(globalMin[0]) || !isFinite(globalMax[0])) {
      return null;
    }

    const widthMeters = globalMax[0] - globalMin[0];
    const heightMeters = globalMax[1] - globalMin[1];
    const depthMeters = globalMax[2] - globalMin[2];
    const lowestYMeters = globalMin[1];

    const centerMeters: [number, number, number] = [
      (globalMin[0] + globalMax[0]) / 2,
      (globalMin[1] + globalMax[1]) / 2,
      (globalMin[2] + globalMax[2]) / 2
    ];

    // Contact plane alignment: lowest vertex is within 5mm of tabletop surface Y=0
    const contactPlaneAligned = Math.abs(lowestYMeters) <= 0.005;

    return {
      widthMeters,
      heightMeters,
      depthMeters,
      lowestYMeters,
      centerMeters,
      contactPlaneAligned,
      totalVertices,
      source: 'gltf-accessor-measured'
    };
  } catch (err) {
    // Malformed JSON, corrupted buffer, or out-of-bounds reading
    return null;
  }
}
