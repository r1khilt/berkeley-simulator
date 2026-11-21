// b06c helpers for 1960s–2020s concrete/modern campus buildings (Lawrence Hall of Science, Bakar BioEnginuity Hub,
// Earl Warren Hall, Social Sciences Building). Works on top of classic-kit's Kit (building frame u,v,y; merge per material).
import * as THREE from 'three';
import { polysGeo } from './classic-kit.js';

// ---------- procedural board-formed / precast concrete materials (cached) ----------
const _cache = new Map();
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 100000) / 100000; }
function vnoise(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const w = (t) => t * t * (3 - 2 * t);
  const p = (a) => ((a % per) + per) % per;
  const a = hash(p(xi), p(yi), s), b = hash(p(xi + 1), p(yi), s), c = hash(p(xi), p(yi + 1), s), d = hash(p(xi + 1), p(yi + 1), s);
  return (a + (b - a) * w(xf)) * (1 - w(yf)) + (c + (d - c) * w(xf)) * w(yf);
}
// kind: 'board' (horizontal board marks, ~0.14 m), 'precast' (smooth panels w/ faint joints every 1 m), 'smooth'
function concreteTex(kind, size = 256) {
  const key = 'tex:' + kind; if (_cache.has(key)) return _cache.get(key);
  const ca = document.createElement('canvas'), cn = document.createElement('canvas'), cr = document.createElement('canvas');
  for (const c of [ca, cn, cr]) { c.width = c.height = size; }
  const ia = ca.getContext('2d').createImageData(size, size), ir = cr.getContext('2d').createImageData(size, size), inn = cn.getContext('2d').createImageData(size, size);
  const H = new Float32Array(size * size);
  const boards = 14; // per 2 m tile
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let u = x / size, v = y / size; let k = 0.93, h = 0.5, rough = 0.9;
    if (kind === 'boardV') { const t = u; u = v; v = t; }
    const n = vnoise(u * 16, v * 16, 16, 3) * 0.6 + vnoise(u * 48, v * 48, 48, 5) * 0.4;
    if (kind === 'board' || kind === 'boardV') {
      const bv = v * boards, row = Math.floor(bv), fv = bv - row;
      const tone = (hash(row, 7, 11) - 0.5) * 0.05;
      const grain = vnoise(u * 6 + hash(row, 3, 2) * 9, fv * 3 + row * 5.3, 6, 13) * 0.5 + vnoise(u * 40, (row + fv) * 3, 40, 17) * 0.5;
      const seam = fv < 0.07 || fv > 0.95;
      k = 0.92 + tone + (grain - 0.5) * 0.06 + (n - 0.5) * 0.09 - (seam ? 0.05 : 0);
      h = 0.5 + (grain - 0.5) * 0.2 - (seam ? 0.25 : 0) + (n - 0.5) * 0.1;
      const tie = (((u * 4) % 1) - 0.5) ** 2 + ((fv - 0.5) * 0.36) ** 2 < 0.0012 && row % 4 === 1; // form-tie holes
      if (tie) { k -= 0.18; h -= 0.4; }
    } else if (kind === 'precast') {
      const ju = (u * 2) % 1, jv = (v * 2) % 1; const joint = ju < 0.006 || jv < 0.008;
      k = 0.95 + (n - 0.5) * 0.08 - (joint ? 0.16 : 0) + (hash(Math.floor(u * 2), Math.floor(v * 2), 4) - 0.5) * 0.04;
      h = 0.5 + (n - 0.5) * 0.08 - (joint ? 0.35 : 0); rough = 0.85;
      const sp = hash(x, y, 9); if (sp > 0.985) { k -= 0.1; h -= 0.1; }
    } else { k = 0.95 + (n - 0.5) * 0.1; h = 0.5 + (n - 0.5) * 0.1; }
    const i = y * size + x; H[i] = h; const c = Math.max(0, Math.min(255, 228 * k));
    ia.data[i * 4] = c; ia.data[i * 4 + 1] = c; ia.data[i * 4 + 2] = c; ia.data[i * 4 + 3] = 255;
    const r = Math.max(0, Math.min(255, rough * 255 + (n - 0.5) * 30)); ir.data[i * 4] = ir.data[i * 4 + 1] = ir.data[i * 4 + 2] = r; ir.data[i * 4 + 3] = 255;
  }
  const S = kind === 'board' || kind === 'boardV' ? 2.5 : 2.0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = H[y * size + ((x - 1 + size) % size)], xp = H[y * size + ((x + 1) % size)], ym = H[((y - 1 + size) % size) * size + x], yp = H[((y + 1) % size) * size + x];
    let nx = (xm - xp) * S, ny = (ym - yp) * S, nz = 1; const l = Math.hypot(nx, ny, nz); const i = (y * size + x) * 4;
    inn.data[i] = (nx / l * 0.5 + 0.5) * 255; inn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
  }
  ca.getContext('2d').putImageData(ia, 0, 0); cr.getContext('2d').putImageData(ir, 0, 0); cn.getContext('2d').putImageData(inn, 0, 0);
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const out = { map: mk(ca, true), normalMap: mk(cn, false), roughnessMap: mk(cr, false) };
  _cache.set(key, out); return out;
}
// Concrete material with a given tint (sRGB hex) and texture kind. Cached so every b06c building shares instances.
export function concreteMat(hex, kind = 'board', { rough = 0.92, normal = 0.7 } = {}) {
  const key = `m:${hex}:${kind}:${rough}:${normal}`; if (_cache.has(key)) return _cache.get(key);
  const t = concreteTex(kind);
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap });
  m.normalScale = new THREE.Vector2(normal, normal); m.name = `b06c-${kind}-${hex.toString(16)}`;
  _cache.set(key, m); return m;
}
export function plainMat(hex, opts = {}) {
  const key = `p:${hex}:${JSON.stringify(opts)}`; if (_cache.has(key)) return _cache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, ...opts }); _cache.set(key, m); return m;
}

// ---------- geometry helpers ----------
export function signedArea(ring) { let a = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// ring oriented for Kit.run façades (outward normal on the right-hand side of travel in u,v ⇒ negative signed area)
export function facadeRing(ring) { const r = ring.slice(); if (r.length > 2 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) r.pop(); return signedArea(r) > 0 ? r.reverse() : r; }
// Truncated pyramid / frustum between a base ring and a top ring (same vertex count, corresponding vertices).
// Rings in building frame [u,v]; base ring must be listed NW→NE→SE→SW style (positive signed area). Adds the top cap.
export function frustum(K, mat, base, top, yb, yt, { cap = true, uvMode = 'roof', bottom = false, detail = false } = {}) {
  if (signedArea(base) < 0) { base = base.slice().reverse(); top = top.slice().reverse(); }
  const n = base.length, polys = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; polys.push([[base[i][0], yb, base[i][1]], [top[i][0], yt, top[i][1]], [top[j][0], yt, top[j][1]], [base[j][0], yb, base[j][1]]]); }
  K.add(mat, polysGeo(polys), { uvMode, detail });
  if (cap) K.add(mat, polysGeo([top.map(([u, v]) => [u, yt, v]).reverse()]), { uvMode: 'box', detail });
  if (bottom) K.add(mat, polysGeo([base.map(([u, v]) => [u, yb, v])]), { uvMode: 'box', detail });
}
// Vertical prism of a convex-or-not ring (uses Kit.prism, which triangulates with holes support)
export function slab(K, mat, ring, y0, y1, opts) { return K.prism(mat, ring, y0, y1, opts); }
// Offset a convex quad/polygon ring outward by d (negative = inward). Works for convex rings.
export function offsetRing(ring, d) {
  const sgn = signedArea(ring) > 0 ? 1 : -1, n = ring.length;
  const N = ring.map((p, i) => { const q = ring[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
  return ring.map((p, i) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [p[0] + d * (n1[0] + n2[0]) / dd, p[1] + d * (n1[1] + n2[1]) / dd]; });
}
// Ribbon / curtain glazing in a run R from s0..s1 between y0..y1 (no wall): glass plane at depth d, mullions every pitch,
// optional transoms (absolute y list). Glass + frame members.
export function glazing(K, R, s0, s1, y0, y1, { d = 0, pitch = 1.5, glass, frame, transoms = [], mw = 0.07, md = 0.12, detail = true, sill = true } = {}) {
  const M = K.M; glass = glass || M.windowNight; frame = frame || M.darkBronze;
  if (s1 - s0 < 0.2 || y1 - y0 < 0.2) return;
  K.rbox(R, glass, s0, y0, d - 0.03, s1, y1, d);
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, frame, s - mw / 2, y0, d, s + mw / 2, y1, d + md, { detail: detail && i > 0 && i < n }); }
  if (sill) K.rbox(R, frame, s0, y0, d, s1, y0 + mw, d + md);
  K.rbox(R, frame, s0, y1 - mw, d, s1, y1, d + md);
  for (const ty of transoms) K.rbox(R, frame, s0, ty - mw / 2, d, s1, ty + mw / 2, d + md, { detail });
}
// Wall slab along run R with horizontal window bands cut through it (real openings), glazing recessed by `rev`.
// bands: [{y0,y1, m0?, m1?}] (margins from the run ends); returns nothing.
export function bandWall(K, R, mat, yb, yt, bands, { depth = 0.4, rev = 0.25, pitch = 1.5, margin = 0.6, glass, frame, ledge = 0, ledgeMat, s0 = 0, s1 = R.L, transom } = {}) {
  const ops = [];
  for (const b of bands) {
    const a = s0 + (b.m0 ?? margin), c = s1 - (b.m1 ?? margin);
    if (c - a < 1.0 || b.y0 < yb + 0.2 || b.y1 > yt - 0.1) continue;
    ops.push({ s0: a, s1: c, y0: b.y0, y1: b.y1 });
  }
  K.wall(R, mat, s0, s1, yb, yt, ops, depth);
  for (const o of ops) {
    glazing(K, R, o.s0, o.s1, o.y0, o.y1, { d: -rev, pitch, glass, frame, transoms: transom ? [o.y0 + (o.y1 - o.y0) * transom] : [] });
    if (ledge) K.rbox(R, ledgeMat || mat, o.s0 - 0.1, o.y0 - 0.18, -rev, o.s1 + 0.1, o.y0, ledge);
  }
}
// Simple horizontal band (fascia / spandrel / coping) along a run, projecting p beyond the face
export function fascia(K, R, mat, y0, y1, p = 0.3, { s0 = 0, s1 = R.L, back = 0.4, ext = 0 } = {}) { K.rbox(R, mat, s0 - ext, y0, -back, s1 + ext, y1, p); }
// Ground-seated stairs along a run (perpendicular to the façade): width w centred at s, from ground up to yTop.
export function frontSteps(K, R, mat, s, w, yTop, { maxRun = 6, rise = 0.16, tread = 0.32 } = {}) {
  const p = R.at(s, 0.5); const g = K.g(p[0], p[1]); const h = yTop - g; if (h < 0.08) return null;
  const n = Math.max(1, Math.round(h / rise)); const L = Math.min(maxRun, n * tread);
  const a = R.at(s - w / 2, 0), b = R.at(s + w / 2, L);
  const us = [a[0], b[0]].sort((x, y) => x - y), vs = [a[1], b[1]].sort((x, y) => x - y);
  // climbing toward the wall = against the outward normal
  const nrm = R.n; let dir;
  if (Math.abs(nrm[0]) > Math.abs(nrm[1])) dir = nrm[0] > 0 ? '-u' : '+u'; else dir = nrm[1] > 0 ? '-v' : '+v';
  return K.stairs(mat, us[0], vs[0], us[1], vs[1], g, yTop, dir, n);
}

// Rectangular block with real wall slabs per face (openings via ops(face, R) → [{s0,s1,y0,y1}]), core, flat roof and coping.
// Optional cantilevered upper storey: the lower part is set back by `cant` on every face below yt - cantH.
// faces: N (v0, run E→W), E (u1, run S→N), S (v1, run W→E), W (u0, run N→S). Returns the runs of the top part.
export function block(K, mat, u0, v0, u1, v1, yb, yt, { cant = 0, cantH = 3.8, ops = () => [], fill, roofMat, coping = 0.25, copingMat, depth = 0.5, skip = [] } = {}) {
  const M = K.M; const parts = [];
  if (cant > 0) parts.push([u0 + cant, v0 + cant, u1 - cant, v1 - cant, yb, yt - cantH, 'lo'], [u0, v0, u1, v1, yt - cantH, yt, 'hi']);
  else parts.push([u0, v0, u1, v1, yb, yt, 'hi']);
  const runsHi = {};
  for (const [a0, b0, a1, b1, y0, y1, tag] of parts) {
    const defs = { N: [[a1, b0], [a0, b0]], E: [[a1, b1], [a1, b0]], S: [[a0, b1], [a1, b1]], W: [[a0, b0], [a0, b1]] };
    for (const f of ['N', 'E', 'S', 'W']) {
      if (skip.includes(f)) continue;
      const R = K.run(defs[f][0], defs[f][1]); if (tag === 'hi') runsHi[f] = R;
      const o = (ops(f, R, tag, y0, y1) || []).filter((q) => q.y0 >= y0 + 0.05 && q.y1 <= y1 - 0.05);
      K.wall(R, mat, 0, R.L, y0, y1, o, depth);
      for (const q of o) (fill || ((RR, qq) => glazing(K, RR, qq.s0, qq.s1, qq.y0, qq.y1, { d: -depth + 0.12, pitch: qq.pitch || 1.6, transoms: qq.tr || [] })))(R, q);
    }
    K.box(M.concreteDark, a0 + depth + 0.05, y0, b0 + depth + 0.05, a1 - depth - 0.05, y1 - 0.02, b1 - depth - 0.05);
    if (tag === 'hi' && cant > 0) K.box(mat, u0 + 0.02, y0 - 0.02, v0 + 0.02, u1 - 0.02, y0 + 0.3, v1 - 0.02); // soffit slab of the cantilever
  }
  K.box(roofMat || M.concreteDark, u0 + depth, yt - 0.35, v0 + depth, u1 - depth, yt - 0.1, v1 - depth);
  if (coping) K.box(copingMat || mat, u0 - 0.04, yt, v0 - 0.04, u1 + 0.04, yt + 0.12, v0 + depth), K.box(copingMat || mat, u0 - 0.04, yt, v1 - depth, u1 + 0.04, yt + 0.12, v1 + 0.04),
    K.box(copingMat || mat, u0 - 0.04, yt, v0 + depth, u0 + depth, yt + 0.12, v1 - depth), K.box(copingMat || mat, u1 - depth, yt, v0 + depth, u1 + 0.04, yt + 0.12, v1 - depth);
  return runsHi;
}
