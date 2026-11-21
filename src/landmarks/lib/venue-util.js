// Shared helpers for the venue landmarks (Memorial Stadium, Greek Theatre, Big C).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bilinear sampler over a packet grid {x0,z0,step,nx,nz,h}
export function gridSampler(g) {
  const h = g.h;
  return (x, z) => {
    const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
    const i = Math.max(0, Math.min(g.nz - 2, Math.floor(fz))), j = Math.max(0, Math.min(g.nx - 2, Math.floor(fx)));
    const u = Math.max(0, Math.min(1, fx - j)), v = Math.max(0, Math.min(1, fz - i));
    return h[i][j] * (1 - u) * (1 - v) + h[i][j + 1] * u * (1 - v) + h[i + 1][j] * (1 - u) * v + h[i + 1][j + 1] * u * v;
  };
}
// median of LiDAR samples in a small disc (robust to railings, people, poles)
export function medianSampler(g, rad = 0.75) {
  const s = gridSampler(g);
  const offs = [];
  for (let a = -rad; a <= rad + 1e-6; a += g.step) for (let b = -rad; b <= rad + 1e-6; b += g.step) if (a * a + b * b <= rad * rad + 1e-6) offs.push([a, b]);
  const buf = new Float64Array(offs.length);
  return (x, z) => {
    for (let k = 0; k < offs.length; k++) buf[k] = s(x + offs[k][0], z + offs[k][1]);
    const arr = Array.from(buf).sort((p, q) => p - q);
    return arr[arr.length >> 1];
  };
}
export function circSmooth(arr, sigma) {
  const n = arr.length, out = new Float64Array(n), R = Math.ceil(sigma * 3);
  const w = []; let ws = 0; for (let k = -R; k <= R; k++) { const v = Math.exp(-k * k / (2 * sigma * sigma)); w.push(v); ws += v; }
  for (let i = 0; i < n; i++) { let s = 0; for (let k = -R; k <= R; k++) s += arr[((i + k) % n + n) % n] * w[k + R]; out[i] = s / ws; }
  return out;
}
export function circMedian(arr, half) {
  const n = arr.length, out = new Float64Array(n);
  for (let i = 0; i < n; i++) { const t = []; for (let k = -half; k <= half; k++) t.push(arr[((i + k) % n + n) % n]); t.sort((a, b) => a - b); out[i] = t[t.length >> 1]; }
  return out;
}
export function pointInPoly(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (((p[i][1] > z) !== (p[j][1] > z)) && (x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) c = !c;
  }
  return c;
}
// Simple non-indexed triangle accumulator. Faces get flat normals; boxUV() adds UVs.
export class Geo {
  constructor() { this.p = []; }
  tri(a, b, c) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  // quad a-b-c-d counter-clockwise when seen from the front
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  // axis-aligned-ish box given 8 corners is overkill; use boxAt for oriented boxes
  get count() { return this.p.length / 9; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.computeVertexNormals();
    return g;
  }
}
// Oriented box: centre (cx,cy,cz), size (sx,sy,sz), rotation about Y (radians)
export function boxGeo(sx, sy, sz, cx, cy, cz, rotY = 0) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (rotY) g.rotateY(rotY);
  g.translate(cx, cy, cz);
  return g;
}
// Merge geometries after box-projecting UVs (all become non-indexed with position/normal/uv)
export function mergeUV(list, boxUV) {
  const prepared = list.filter(Boolean).map((g) => {
    let gg = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.normal) gg.computeVertexNormals();
    return boxUV(gg);
  });
  if (!prepared.length) return null;
  return mergeGeometries(prepared, false);
}
export function mergePlain(list) {
  const prepared = list.filter(Boolean).map((g) => {
    let gg = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    return gg;
  });
  if (!prepared.length) return null;
  return mergeGeometries(prepared, false);
}
export function canvasTex(w, h, draw, { repeat = false, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; else t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  return t;
}
// Raster-backed walkable: bilinear lookup with NaN = no surface
export function rasterWalkable(x0, z0, step, nx, nz, data) {
  return (x, z) => {
    const fx = (x - x0) / step, fz = (z - z0) / step;
    const j = Math.floor(fx), i = Math.floor(fz);
    if (i < 0 || j < 0 || i >= nz - 1 || j >= nx - 1) return null;
    const u = fx - j, v = fz - i;
    const a = data[i * nx + j], b = data[i * nx + j + 1], c = data[(i + 1) * nx + j], d = data[(i + 1) * nx + j + 1];
    const ok = [a, b, c, d].filter((q) => !Number.isNaN(q));
    if (!ok.length) return null;
    if (ok.length < 4) { // near an edge: nearest valid sample
      const near = [[a, (1 - u) * (1 - v)], [b, u * (1 - v)], [c, (1 - u) * v], [d, u * v]].filter((q) => !Number.isNaN(q[0])).sort((p, q) => q[1] - p[1]);
      return near[0][1] > 0.2 ? near[0][0] : null;
    }
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
}
