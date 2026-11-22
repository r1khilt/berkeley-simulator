// Baked sculpture meshes (r4-props): compact quantised geometry produced offline by tools/sculpt/*.mjs from SDF sculpts
// (public/assets/sculpt/<name>.bin, gzipped). Each vertex carries an SDF-normal and a baked cavity-AO value, which we
// expose as a grey vertex colour so carved recesses (mane curls, mouth, under the chin, between the legs) read in any light.
//   loadSculpt(name)            -> Promise<BufferGeometry> (non-indexed; position, normal, color, uv)
//   sculptMaterial(base)        -> clone of a shared material with vertex colours on (cached per base material)
import * as THREE from 'three';

const BASE = (import.meta.env && import.meta.env.BASE_URL || '/') + 'assets/sculpt/';
const cache = new Map();

async function bytes(url) {
  const r = await fetch(url); if (!r.ok) throw new Error('sculpt: ' + url + ' ' + r.status);
  let b = new Uint8Array(await r.arrayBuffer());
  if (b[0] === 0x1f && b[1] === 0x8b) b = new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  return b;
}

function decode(b, uvScale) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'SCL1') throw new Error('sculpt: bad magic');
  const nv = dv.getUint32(4, true), ni = dv.getUint32(8, true);
  const o = [0, 1, 2].map((c) => dv.getFloat32(12 + c * 4, true)), s = [0, 1, 2].map((c) => dv.getFloat32(24 + c * 4, true));
  const offP = 36, offN = offP + nv * 6, offA = offN + nv * 3, offI = (offA + nv + 3) & ~3;
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) {
    for (let c = 0; c < 3; c++) {
      pos[v * 3 + c] = o[c] + (dv.getUint16(offP + v * 6 + c * 2, true) / 65535) * s[c];
      nrm[v * 3 + c] = dv.getInt8(offN + v * 3 + c) / 127;
    }
    const a = b[offA + v] / 255; col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = a;
  }
  const idx = nv < 65536 ? new Uint16Array(b.buffer.slice(b.byteOffset + offI, b.byteOffset + offI + ni * 2)) : new Uint32Array(b.buffer.slice(b.byteOffset + offI, b.byteOffset + offI + ni * 4));
  // un-index so every face gets its own box-projected UVs (no stretching where the projection axis flips);
  // normals stay the smooth SDF normals, so shading is unaffected by the split.
  const n3 = idx.length, P = new Float32Array(n3 * 3), N = new Float32Array(n3 * 3), C = new Float32Array(n3 * 3), UV = new Float32Array(n3 * 2);
  for (let t = 0; t < n3; t += 3) {
    const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
    const ex = pos[i1 * 3] - pos[i0 * 3], ey = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], ez = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
    const fx = pos[i2 * 3] - pos[i0 * 3], fy = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], fz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
    const cx = Math.abs(ey * fz - ez * fy), cy = Math.abs(ez * fx - ex * fz), cz = Math.abs(ex * fy - ey * fx);
    const ax = cy >= cx && cy >= cz ? 1 : cx >= cz ? 0 : 2;
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k], o = t + k;
      for (let c = 0; c < 3; c++) { P[o * 3 + c] = pos[v * 3 + c]; N[o * 3 + c] = nrm[v * 3 + c]; C[o * 3 + c] = col[v * 3 + c]; }
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
      UV[o * 2] = (ax === 0 ? z : x) * uvScale; UV[o * 2 + 1] = (ax === 1 ? z : y) * uvScale;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

export function loadSculpt(name, { uvScale = 1.1 } = {}) { // uvScale: texture repeats per metre (finer speckle than walls)
  const key = name + '@' + uvScale;
  if (!cache.has(key)) cache.set(key, bytes(BASE + name + '.bin').then((b) => decode(b, uvScale)));
  return cache.get(key).then((g) => g.clone());
}

const mats = new WeakMap();
export function sculptMaterial(base, { color } = {}) {
  let m = mats.get(base);
  if (!m) { m = base.clone(); m.vertexColors = true; if (color !== undefined) m.color.set(color); m.name = (base.name || 'stone') + '+ao'; mats.set(base, m); } // one clone per base material
  return m;
}
