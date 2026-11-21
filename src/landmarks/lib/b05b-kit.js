// b05b-southeast shared helpers (Hearst Gym, Wurster, music complex, Faculty Club group, Haas, CDSP, LBNL).
// Built on classic-kit's Kit: a SubKit authors in its own rotated frame but merges into the main kit's material buckets,
// so a building with wings at several angles still ends up as one draw call per material.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';

export { Kit, polysGeo };

// ---------- frames ----------
export class SubKit extends Kit {
  constructor(main, angleRad) {
    super(main.ctx, angleRad);
    this.main = main; this.buckets = main.buckets; this.detail = main.detail; this.extra = main.extra;
    this.pre = new THREE.Matrix4().makeRotationY(angleRad - main.a);
  }
  add(mat, geo, opts) { const g = super.add(mat, geo, opts); g.applyMatrix4(this.pre); return g; }
}
// angle (radians, Kit convention) that aligns the frame's +u with the local edge a->b (local x/z)
export const edgeAngle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
export const deg = (d) => THREE.MathUtils.degToRad(d);

// ---------- local materials (cached per shared-material library) ----------
const _cache = new WeakMap();
export function mats(M) {
  if (_cache.has(M)) return _cache.get(M);
  const tex = (src, opts) => { const m = new THREE.MeshStandardMaterial(opts); if (src.map) { m.map = src.map; m.normalMap = src.normalMap; m.roughnessMap = src.roughnessMap; m.normalScale = new THREE.Vector2(0.7, 0.7); } return m; };
  const X = {
    cedar: tex(M.shingle, { color: 0x7a4a36, roughness: 0.92 }),       // weathered brown cedar shingles (walls)
    cedarRoof: tex(M.shingle, { color: 0x6b6056, roughness: 0.95 }),   // grey-brown wood shingle roofs
    redwood: tex(M.wood, { color: 0x9a6a4c, roughness: 0.85 }),        // redwood boards / logs
    redwoodDark: tex(M.wood, { color: 0x6a4632, roughness: 0.88 }),
    buff: tex(M.stucco, { color: 0xe6eaf0, roughness: 0.93 }),          // Hearst Gym warm buff concrete
    boardForm: tex(M.concrete, { color: 0xd9d4ca, roughness: 0.95 }),   // board-formed concrete (Wurster)
    boardFormDark: tex(M.concrete, { color: 0xa8a399, roughness: 0.95 }),
    trimGreen: new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.6 }),
    frameDark: new THREE.MeshStandardMaterial({ color: 0x2b2d2f, roughness: 0.45, metalness: 0.6 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa7abae, roughness: 0.35, metalness: 0.8 }),
    zinc: tex(M.concrete, { color: 0x6f747a, roughness: 0.55, metalness: 0.35 }),
    terracotta: tex(M.marble, { color: 0xc98f6a, roughness: 0.8 }),
    limestone: tex(M.granite, { color: 0xf1e9d8, roughness: 0.85 }),
    creamPaint: new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 0.7 }),
  };
  _cache.set(M, X); return X;
}

// board-formed concrete: 15 cm horizontal boards with tone variation and thin joints (2 m tile, box-projected UVs)
let _board = null;
export function boardTex() {
  if (_board) return _board;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const cn = document.createElement('canvas'); cn.width = cn.height = N; const gn = cn.getContext('2d');
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const nb = 13; const bh = N / nb;
  gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(0, 0, N, N);
  for (let i = 0; i < nb; i++) {
    const v = 0.95 + rnd() * 0.07; const base = [169 * v, 168 * v, 163 * v];
    g.fillStyle = `rgb(${base.map((x) => x | 0).join(',')})`; g.fillRect(0, i * bh, N, bh + 1);
    for (let k = 0; k < 90; k++) { const x = rnd() * N, w = 8 + rnd() * 40, y = i * bh + rnd() * bh; const d = (rnd() - 0.5) * 14; g.fillStyle = `rgba(${d > 0 ? '255,255,255' : '0,0,0'},${Math.abs(d) / 160})`; g.fillRect(x, y, w, 1 + rnd() * 1.5); }
    g.fillStyle = 'rgba(40,40,38,0.14)'; g.fillRect(0, i * bh, N, 1.0);
    gn.fillStyle = 'rgb(128,90,240)'; gn.fillRect(0, i * bh, N, 1.5); gn.fillStyle = 'rgb(128,166,240)'; gn.fillRect(0, i * bh + 1.5, N, 1.2);
  }
  for (let k = 0; k < 2500; k++) { const x = rnd() * N, y = rnd() * N; g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(x, y, 1.5, 1.5); }
  const mk = (cv, srgb) => { const tx = new THREE.CanvasTexture(cv); if (srgb) tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8; return tx; };
  _board = { map: mk(c, true), normalMap: mk(cn, false) };
  return _board;
}
export function boardMat(color = 0xffffff) { const b = boardTex(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, map: b.map, normalMap: b.normalMap }); m.normalScale = new THREE.Vector2(0.3, 0.3); return m; }

// wood shingles: 0.2 m courses, random widths, dark butt shadow, variegated (2 m tile, box-projected UVs)
let _shing = null;
export function shingleTex() {
  if (_shing) return _shing;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const cn = document.createElement('canvas'); cn.width = cn.height = N; const gn = cn.getContext('2d');
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rows = 10, rh = N / rows; gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(0, 0, N, N);
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 40; const y0 = r * rh;
    while (x < N) { const w = 20 + rnd() * 90; const v = 0.62 + rnd() * 0.62; const c0 = [176 * v, 168 * v, 160 * v].map((q) => Math.min(255, q | 0));
      g.fillStyle = `rgb(${c0.join(',')})`; g.fillRect(x, y0, w, rh);
      for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '0,0,0' : '255,240,220'},${0.04 + rnd() * 0.06})`; g.fillRect(x + rnd() * w, y0, 1 + rnd() * 2, rh); }
      g.fillStyle = 'rgba(20,12,8,0.22)'; g.fillRect(x, y0, 1, rh); gn.fillStyle = 'rgb(105,128,245)'; gn.fillRect(x, y0, 1, rh);
      x += w; }
    // butt shadow at the bottom of each course (v increases downward in canvas = up the wall is lower y)
    const grd = g.createLinearGradient(0, y0 + rh - 14, 0, y0 + rh); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(10,6,4,0.85)');
    g.fillStyle = grd; g.fillRect(0, y0 + rh - 14, N, 14); gn.fillStyle = 'rgb(128,60,220)'; gn.fillRect(0, y0 + rh - 4, N, 4);
  }
  const mk = (cv, srgb) => { const tx = new THREE.CanvasTexture(cv); if (srgb) tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8; return tx; };
  _shing = { map: mk(c, true), normalMap: mk(cn, false) };
  return _shing;
}
export function shingleMat(color) { const s = shingleTex(); const m = new THREE.MeshStandardMaterial({ color, roughness: 0.93, map: s.map, normalMap: s.normalMap }); m.normalScale = new THREE.Vector2(0.9, 0.9); return m; }

// ---------- polygon utilities (local or frame coords [[x,z],...]) ----------
export function area(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function inside(x, z, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// orient so that Kit.run(a,b) of every consecutive edge faces OUTWARD (building on the left when walking a->b in x/z with +z south)
export function outward(poly) { return area(poly) < 0 ? poly.slice() : poly.slice().reverse(); }
export function centroid(poly) { let x = 0, z = 0; for (const p of poly) { x += p[0]; z += p[1]; } return [x / poly.length, z / poly.length]; }
export function toFrame(K, poly) { return poly.map(([x, z]) => K.uv(x, z)); }

// evenly spaced openings along a run length L (returns [{s0,s1,y0,y1}]), keeping margin m at both ends
export function bays(L, { bay = 3.6, w = 1.4, y0 = 1, y1 = 2.6, m = 0.8, n = null, ...rest } = {}) {
  const nb = n ?? Math.max(0, Math.floor((L - 2 * m) / bay));
  if (nb <= 0) return [];
  const step = (L - 2 * m) / nb; const out = [];
  for (let i = 0; i < nb; i++) { const c = m + step * (i + 0.5); out.push({ s0: c - w / 2, s1: c + w / 2, y0, y1, ...rest }); }
  return out;
}
// wall with openings + fillers on run R; ops [{s0,s1,y0,y1,arch,kind,doorTop,mull,tran}]
export function openWall(K, R, mat, s0, s1, y0, y1, ops, { depth = 0.4, rev, frame, glass, sill = true, sillMat } = {}) {
  const o2 = ops.filter((o) => o.s0 > s0 + 0.05 && o.s1 < s1 - 0.05 && o.y0 >= y0 - 0.01 && o.y1 <= y1 + 0.01);
  K.wall(R, mat, s0, s1, y0, y1, o2, depth);
  for (const o of o2) {
    if (o.noFill) continue;
    K.fill(R, { ...o, sill: o.sill ?? (sill ? undefined : false), sillMat: o.sillMat || sillMat }, { rev: rev ?? depth * 0.6, frame: o.frame || frame, glass: o.glass || glass, kind: o.kind || 'win', mull: o.mull ?? 1, tran: o.tran || [], door: o.door });
  }
  return o2;
}

// ---------- roofs ----------
// Hip roof over a frame rectangle with overhang; returns ridge height
export function hipRoof(K, mat, u0, v0, u1, v1, yE, slope, ov = 0.5, opts = {}) {
  const y = K.hip(mat, u0 - ov, v0 - ov, u1 + ov, v1 + ov, yE - ov * slope, slope, opts);
  // soffit
  K.flat(opts.soffit || mat, [[u0 - ov, v0 - ov], [u1 + ov, v0 - ov], [u1 + ov, v1 + ov], [u0 - ov, v1 + ov]], yE - ov * slope - 0.02, [], true);
  return y;
}
// Flat roof slab over polygon (frame coords) with a parapet/coping loop
export function flatRoof(K, poly, y, { mat, coping, parapet = 0.6, copeOut = 0.08, thick = 0.3 } = {}) {
  const M = K.M; mat = mat || M.concreteDark;
  K.prism(mat, poly, y - thick, y);
  if (parapet > 0) {
    K.loop(coping || M.concrete, poly, [[copeOut, y], [copeOut, y + parapet], [-0.3, y + parapet], [-0.3, y + parapet - 0.02]]);
  }
}
// Gable roof with explicit thickness and fascia, ridge along u ('u') or v
export function gableRoof(K, mat, u0, v0, u1, v1, yE, rise, axis = 'u', { overhang = 0.6, rake = 0.4, wallMat = null, fascia = null } = {}) {
  // extend along the ridge axis by `rake` (gable overhang), perpendicular by `overhang` (eave)
  if (axis === 'u') K.gable(mat, u0 - rake + overhang, v0, u1 + rake - overhang, v1, yE, rise, 'u', { overhang, wallMat: null });
  else K.gable(mat, u0, v0 - rake + overhang, u1, v1 + rake - overhang, yE, rise, 'v', { overhang, wallMat: null });
  if (wallMat) {
    if (axis === 'u') { const vm = (v0 + v1) / 2; for (const uu of [u0, u1]) K.add(wallMat, polysGeo([uu === u0 ? [[uu, yE, v1], [uu, yE + rise, vm], [uu, yE, v0]] : [[uu, yE, v0], [uu, yE + rise, vm], [uu, yE, v1]]])); }
    else { const um = (u0 + u1) / 2; for (const vv of [v0, v1]) K.add(wallMat, polysGeo([vv === v0 ? [[u0, yE, vv], [um, yE + rise, vv], [u1, yE, vv]] : [[u1, yE, vv], [um, yE + rise, vv], [u0, yE, vv]]])); }
  }
}
// gable-end wall triangle as a proper slab (thickness d) for runs: run R along the gable face, apex at s=L/2
export function gableEnd(K, R, mat, y0, rise, depth = 0.3, ops = []) {
  const sh = new THREE.Shape(); sh.moveTo(0, y0); sh.lineTo(R.L, y0); sh.lineTo(R.L / 2, y0 + rise); sh.lineTo(0, y0);
  for (const o of ops) { const h = new THREE.Path(); h.moveTo(o.s0, o.y0); h.lineTo(o.s1, o.y0); h.lineTo(o.s1, o.y1); h.lineTo(o.s0, o.y1); h.lineTo(o.s0, o.y0); sh.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth);
  K.addRun(R, mat, g);
  for (const o of ops) K.fill(R, o, { rev: depth * 0.6, mull: o.mull ?? 1, frame: o.frame });
}

// ---------- modern façades ----------
// Curtain wall: glass plane recessed `rev`, vertical mullions every `mw`, horizontal transoms at `rows` heights
export function curtain(K, R, s0, s1, y0, y1, { mw = 1.5, rows = [], glass, frame, rev = 0.12, mullD = 0.18, mullW = 0.07, spandrels = [] } = {}) {
  const M = K.M; glass = glass || M.glass; frame = frame || M.iron;
  K.rbox(R, glass, s0, y0, -rev - 0.02, s1, y1, -rev);
  const n = Math.max(1, Math.round((s1 - s0) / mw));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, frame, s - mullW / 2, y0, -rev, s + mullW / 2, y1, -rev + mullD, { detail: i !== 0 && i !== n }); }
  for (const y of [y0, y1, ...rows]) K.rbox(R, frame, s0, y - mullW / 2, -rev, s1, y + mullW / 2, -rev + mullD * 0.8, { detail: y !== y0 && y !== y1 });
  for (const [a, b] of spandrels) K.rbox(R, frame, s0, a, -rev, s1, b, -rev + 0.03);
}

// instanced repeated mesh helper (adds as an extra object, transformed by the main kit's rotation at finish)
export function instanced(K, geo, mat, mats4, { detail = false } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, mats4.length);
  mats4.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true; im.castShadow = im.receiveShadow = true;
  if (detail) im.userData.detail = true;
  K.extra.push(im); return im;
}

// lamp standard (campus style): iron post + glowing globe
export function lamp(K, u, y, v, h = 3.6) {
  const M = K.M;
  K.cyl(M.iron, u, y, v, 0.1, 0.07, h, 8, { detail: true });
  K.lathe(M.lampGlow, [[0.05, 0], [0.2, 0.12], [0.22, 0.42], [0.1, 0.6], [0.001, 0.62]], u, y + h, v, 10, { detail: true });
}

// inset a simple polygon (local or frame coords) by distance d (positive = inward), mitred corners
export function insetPoly(poly, d) {
  const P = outward(poly); const n = P.length; const out = [];
  // outward() orders so that Kit.run(a,b) faces outward: outward normal of edge a->b is (-t.z, t.x)
  const lines = P.map((a, i) => { const b = P[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; const nn = [-t[1], t[0]]; return { p: [a[0] - nn[0] * d, a[1] - nn[1] * d], t }; });
  for (let i = 0; i < n; i++) { const A = lines[(i - 1 + n) % n], B = lines[i]; const den = A.t[0] * B.t[1] - A.t[1] * B.t[0];
    if (Math.abs(den) < 1e-6) { out.push(B.p); continue; }
    const s = ((B.p[0] - A.p[0]) * B.t[1] - (B.p[1] - A.p[1]) * B.t[0]) / den; out.push([A.p[0] + A.t[0] * s, A.p[1] + A.t[1] * s]); }
  return out;
}
// drop near-collinear / very short edges from an OSM ring
export function simplify(poly, minLen = 1.0, angTol = 0.06) {
  let P = poly.slice(); if (P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 0.01) P.pop();
  let changed = true;
  while (changed && P.length > 3) { changed = false;
    for (let i = 0; i < P.length; i++) { const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const cr = ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) / (l1 * l2 + 1e-9);
      if (Math.abs(cr) < angTol || Math.min(l1, l2) < minLen * 0.3) { P.splice(i, 1); changed = true; break; } } }
  return P;
}
