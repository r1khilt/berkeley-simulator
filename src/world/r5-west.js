// [r5b] West campus landscape (round 5 photo audit, branch r5-audit-central-b): Strawberry Creek South Fork west of
// Sather Gate + the North Fork's lower reach, the Grinnell Natural Area / Eucalyptus Grove and the Oxford St gateway.
// Before this pass every creek crossing in the west was a path draped down into the ravine and back up (no bridge at
// all), the LiDAR had baked the Octagon (bay-tree) bridge and the car bridge beside it into a 17 m flat plug that
// filled the creek, and the campus sign at Oxford & Center was missing. Modelled from reference photos and the
// Loafer's Guide to the U.C. Berkeley Campus (bridge-by-bridge descriptions):
//  - footbridges/road bridges on every OSM bridge way in the area, each spanning bank top to bank top on abutments
//    with walkable decks and railings in its own style: the "wooden arch bridge with iron rails" west of the ASUC,
//    the Octagon / Bay Tree Bridge (concrete deck with an octagonal bench round the bay tree growing through it),
//    the concrete car bridge, the "concrete war memorial bridge with its Star of David railings" into the grove,
//    the L-shaped timber walk by the LSA, the Hilgard Way and Grinnell Pathway timber bridges ("long wooden skew
//    bridge from BART"), and the North Fork footbridge by Haviland;
//  - gradeR5West() re-opens the creek under the Octagon/car bridges (channel carved into the heightfield before
//    upload) and repaints the ground under every deck as creek bank so the creek is open water beneath;
//  - rubble-stone culvert headwalls where the South Fork dives under Oxford St (with its trash rack) and where the
//    North Fork comes out of its culvert below West Circle; boulder step-pool weirs and cut-stone check dams;
//  - the "UNIVERSITY OF CALIFORNIA" gateway marker at Oxford & Center (bronze plaque on a dark ornamental iron fence
//    between cast-stone piers with pinecone finials, low clipped hedges).
// ?nor5w=1 disables the whole module.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials, boxUV } from '../materials.js';

const qs = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const R5W_OFF = qs.get('nor5w') === '1';

// Octagon/car-bridge reach: the 2021 LiDAR returned the bridge decks as ground, so the creek bed is re-cut here
// (x, z, bed y) from the open channel either side (72.3 m upstream, 71.0 m below the car bridge).
const CARVE = [[-336.0, 204.6, 72.3], [-339.5, 203.6, 72.2], [-343.0, 199.3, 72.0], [-349.0, 195.0, 71.75], [-358.0, 192.0, 71.4], [-363.5, 189.2, 71.15], [-367.5, 186.8, 71.0]];
const NF_LOWER = [[-562.5, 49.6, 65.75], [-565.4, 51.7, 65.55], [-568.5, 54.8, 65.6], [-572.5, 58.5, 65.55], [-576.0, 62.0, 65.4], [-579.0, 65.9, 65.2], [-582.0, 72.0, 64.95], [-585.0, 79.0, 64.55], [-585.2, 86.0, 64.3], [-585.4, 92.9, 63.85], [-583.4, 99.0, 63.3], [-581.1, 104.6, 62.8]];
const OXFORD_APRON = [[-673.0, 189.6, 59.45], [-676.0, 187.6, 59.3], [-678.3, 186.9, 59.25]];
const BRIDGES = [
  { id: 'asuc-arch', style: 'arch', pts: [[-259.8, 219.2], [-258.7, 230.8]], w: 2.5, camber: 0.7 },
  { id: 'octagon', style: 'octagon', pts: [[-345.9, 191.6], [-345.7, 202.4]], w: 9.4, off: -1.9, tree: [-342.8, 194.8], flat: true },
  { id: 'wellman-foot', style: 'wood', pts: [[-355.1, 188.4], [-360.3, 196.0]], w: 2.0 },
  { id: 'wellman-car', style: 'concrete', pts: [[-368.3, 199.4], [-362.6, 191.6], [-357.9, 184.1], [-353.5, 178.8]], w: 5.0, trim: true },
  { id: 'star-of-david', style: 'star', pts: [[-465.2, 147.3], [-455.5, 143.8]], w: 5.2 },
  { id: 'lsa-walk', style: 'wood', pts: [[-459.0, 130.1], [-462.0, 120.1], [-470.5, 121.8], [-473.2, 121.0]], w: 1.8 },
  { id: 'hilgard', style: 'wood', pts: [[-510.7, 90.6], [-513.7, 95.8]], w: 2.8 },
  { id: 'grinnell', style: 'woodx', pts: [[-627.1, 153.6], [-613.4, 150.9]], w: 2.4 },
  { id: 'nf-haviland', style: 'wood', pts: [[-360.5, -45.7], [-364.1, -46.6], [-369.0, -45.9]], w: 1.8 },
];
const SIGN = { x: -693.7, z: 142.6, yaw: Math.PI / 2 };   // Oxford & Center campus sign: fence runs N-S along Oxford, faces west down Center St

let PLANS = null;   // bridge deck profiles, computed once from the graded heightfield

// ------------------------------------------------------------------ heightfield helpers
function hgrid(heights, c) {
  const x0 = c.x0 + 0.5 * c.step, z0 = c.z0 + 0.5 * c.step, s = c.step, nx = c.nx, nz = c.nz;
  const at = (x, z) => {
    let fx = (x - x0) / s, fz = (z - z0) / s; fx = Math.max(0, Math.min(nx - 1.0001, fx)); fz = Math.max(0, Math.min(nz - 1.0001, fz));
    const j = fx | 0, i = fz | 0, u = fx - j, v = fz - i, k = i * nx + j;
    return (heights[k] * (1 - u) + heights[k + 1] * u) * (1 - v) + (heights[k + nx] * (1 - u) + heights[k + nx + 1] * u) * v;
  };
  return { at, x0, z0, s, nx, nz };
}
// polyline resampled every `ds` metres, extended `ext` metres past both ends along the end tangents
function resample(pts, ds, ext) {
  const P = pts.map((p) => [p[0], p[1]]);
  const n = P.length; const d0 = norm2(P[0][0] - P[1][0], P[0][1] - P[1][1]), d1 = norm2(P[n - 1][0] - P[n - 2][0], P[n - 1][1] - P[n - 2][1]);
  const Q = ext > 0 ? [[P[0][0] + d0[0] * ext, P[0][1] + d0[1] * ext], ...P, [P[n - 1][0] + d1[0] * ext, P[n - 1][1] + d1[1] * ext]] : P;
  const out = []; let s = 0;
  for (let k = 0; k < Q.length - 1; k++) {
    const [ax, az] = Q[k], [bx, bz] = Q[k + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.round(L / ds));
    for (let i = 0; i < m; i++) { const t = i / m; out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, s: s + L * t }); }
    s += L;
  }
  out.push({ x: Q[Q.length - 1][0], z: Q[Q.length - 1][1], s });
  for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; const t = norm2(b.x - a.x, b.z - a.z); out[i].tx = t[0]; out[i].tz = t[1]; }
  return out;
}
function norm2(x, z) { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ 1) grading (runs right after gradeTerrain)
export function gradeR5West({ heights, c, gt, sdf }) {
  if (R5W_OFF) return null;
  const G = hgrid(heights, c);
  // a) re-cut channels the LiDAR missed: under the Octagon / car bridges (decks returned as ground), the North Fork's
  //    lower reach below its culvert (vegetation-smoothed; "a deep pool ... then a series of noisy cataracts"), and the
  //    apron in front of the Oxford St culvert mouth
  const cut = new Map();   // grid index -> depth cut
  const carve = (pts, half, slope, R, fadeA = true, fadeB = true) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az, ay] = pts[k], [bx, bz, by] = pts[k + 1]; const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const j0 = Math.floor((Math.min(ax, bx) - R - G.x0) / G.s), j1 = Math.ceil((Math.max(ax, bx) + R - G.x0) / G.s);
      const i0 = Math.floor((Math.min(az, bz) - R - G.z0) / G.s), i1 = Math.ceil((Math.max(az, bz) + R - G.z0) / G.s);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const x = G.x0 + j * G.s, z = G.z0 + i * G.s; let t = ((x - ax) * dx + (z - az) * dz) / L2;
        if ((t < 0 && k === 0) || (t > 1 && k === pts.length - 2)) continue; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)); if (d > R) continue;
        const bed = ay + (by - ay) * t; const target = bed + Math.max(0, d - half) * slope + Math.max(0, d - half) ** 2 * 0.05;
        const fade = (k === 0 && fadeA ? smooth(0, 0.35, t) : 1) * (k === pts.length - 2 && fadeB ? 1 - smooth(0.65, 1, t) : 1);
        const idx = i * G.nx + j, cur = heights[idx]; if (target >= cur) continue;
        const nh = cur - (cur - target) * fade; heights[idx] = nh; cut.set(idx, Math.max(cut.get(idx) || 0, cur - nh));
      }
    }
  };
  carve(CARVE, 1.3, 0.62, 6.5);
  carve(NF_LOWER, 0.9, 0.85, 4.5, false, true);
  carve(OXFORD_APRON, 1.6, 0.7, 4.5, true, false);
  const nCut = cut.size;
  // b) deck plans from the graded ground
  PLANS = BRIDGES.map((b) => planBridge(b, G.at));
  // c) the ground under each deck is creek bank, not paving (the path SDF had draped the walk into the ravine and hid
  //    the water there as a 'culvert'): asphalt/paved/grass out, dirt in, wherever the deck flies > 0.3 m up
  let nPaint = 0;
  if (sdf && gt) {
    const sx0 = c.x0 + 0.5 * gt.step, sz0 = c.z0 + 0.5 * gt.step, st = gt.step;
    for (const p of PLANS) {
      if (!p) continue; const [bx0, bz0, bx1, bz1] = p.bounds;
      const j0 = Math.max(0, Math.floor((bx0 - sx0) / st)), j1 = Math.min(gt.nx - 1, Math.ceil((bx1 - sx0) / st));
      const i0 = Math.max(0, Math.floor((bz0 - sz0) / st)), i1 = Math.min(gt.nz - 1, Math.ceil((bz1 - sz0) / st));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const x = sx0 + j * st, z = sz0 + i * st; const y = p.deckAt(x, z, 0.6); if (y == null) continue;
        if (y - G.at(x, z) < 0.3) continue;
        const o = (i * gt.nx + j) * 4; sdf[o] = Math.min(sdf[o], 70); sdf[o + 1] = Math.min(sdf[o + 1], 70); sdf[o + 2] = Math.min(sdf[o + 2], 90); sdf[o + 3] = Math.max(sdf[o + 3], 190); nPaint++;
      }
    }
    for (const [idx, d] of cut) {
      if (d < 0.25) continue; const x = G.x0 + (idx % G.nx) * G.s, z = G.z0 + Math.floor(idx / G.nx) * G.s;
      const j = Math.round((x - sx0) / st), i = Math.round((z - sz0) / st); if (i < 0 || j < 0 || i >= gt.nz || j >= gt.nx) continue;
      const o = (i * gt.nx + j) * 4; sdf[o] = Math.min(sdf[o], 70); sdf[o + 1] = Math.min(sdf[o + 1], 70); sdf[o + 2] = Math.min(sdf[o + 2], 100); sdf[o + 3] = Math.max(sdf[o + 3], 180); nPaint++;
    }
  }
  return { nCut, nPaint, plans: PLANS.length };
}

// deck profile: bank top to bank top over the dip, covering the mapped bridge extent (roads: only the dip)
function planBridge(b, H) {
  const EXT = 3.5, S = resample(b.pts, 0.25, EXT); const n = S.length; const L = S[n - 1].s - 2 * EXT;
  const off = b.off || 0;
  for (const q of S) { q.cx = q.x - q.tz * off; q.cz = q.z + q.tx * off; let t = -1e9; for (const o of [-0.35, 0, 0.35]) t = Math.max(t, H(q.cx - q.tz * o * b.w, q.cz + q.tx * o * b.w)); q.t = t; }
  const iA = Math.max(0, S.findIndex((q) => q.s >= EXT)); let iB = S.findIndex((q) => q.s >= EXT + L - 1e-6); if (iB < 0) iB = n - 1;
  let iMin = iA; for (let i = iA; i <= iB; i++) if (S[i].t < S[iMin].t) iMin = i;
  // walk out from the low point to the bank tops (within 0.06 m of the highest ground on that side)
  let mxA = -1e9; for (let i = 0; i <= iMin; i++) mxA = Math.max(mxA, S[i].t);
  let mxB = -1e9; for (let i = iMin; i < n; i++) mxB = Math.max(mxB, S[i].t);
  let ia = iMin; while (ia > 0 && S[ia].t < mxA - 0.06) ia--;
  let ib = iMin; while (ib < n - 1 && S[ib].t < mxB - 0.06) ib++;
  if (!b.trim) { ia = Math.min(ia, iA); ib = Math.max(ib, iB); } else { ia = Math.max(0, ia - 4); ib = Math.min(n - 1, ib + 4); }
  if (b.flat) { ia = iA; ib = iB; }
  const D = S.slice(ia, ib + 1); const s0 = D[0].s, s1 = D[D.length - 1].s, span = Math.max(0.5, s1 - s0);
  let ya = D[0].t + 0.04, yb = D[D.length - 1].t + 0.04;
  if (b.flat) { const y = Math.max(ya, yb); ya = y; yb = y; }
  for (const q of D) { const u = (q.s - s0) / span; q.y = ya + (yb - ya) * u + (b.camber || 0) * 4 * u * (1 - u); }
  if (!b.flat) for (let pass = 0; pass < 2; pass++) { for (const q of D) q.y = Math.max(q.y, q.t + 0.14); for (let i = 1; i < D.length - 1; i++) D[i].y = (D[i - 1].y + D[i].y * 2 + D[i + 1].y) / 4; }
  D[0].y = Math.max(D[0].y, D[0].t + 0.03); D[D.length - 1].y = Math.max(D[D.length - 1].y, D[D.length - 1].t + 0.03);
  let dip = 0; for (const q of D) dip = Math.max(dip, q.y - q.t);
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; const hw = b.w / 2 + 0.6;
  for (const q of D) { x0 = Math.min(x0, q.cx - hw); x1 = Math.max(x1, q.cx + hw); z0 = Math.min(z0, q.cz - hw); z1 = Math.max(z1, q.cz + hw); }
  // deck top at (x,z) or null (nearest sample; lateral within half width + pad, along within the deck)
  const deckAt = (x, z, pad = 0.05) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return null;
    let bi = -1, bd = 1e9; for (let i = 0; i < D.length; i++) { const d = (D[i].cx - x) ** 2 + (D[i].cz - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    const q = D[bi]; const rx = x - q.cx, rz = z - q.cz; const lat = -rx * q.tz + rz * q.tx, al = rx * q.tx + rz * q.tz;
    if (Math.abs(lat) > b.w / 2 + pad) return null;
    if ((bi === 0 && al < -0.05) || (bi === D.length - 1 && al > 0.05)) return null;
    if (b.tree && Math.hypot(x - b.tree[0], z - b.tree[1]) < 0.8) return null;
    return q.y;
  };
  return { b, D, s0, s1, span, dip, bounds: [x0, z0, x1, z1], deckAt };
}

// ------------------------------------------------------------------ geometry helpers
class Acc {  // merges oriented, box-UV'd boxes (and arbitrary geometries) per material
  constructor() { this.parts = new Map(); }
  add(mat, geo) { let l = this.parts.get(mat); if (!l) this.parts.set(mat, (l = [])); l.push(geo); }
  // box of size (lx along dir, ly up, lz across) centred at (x,y,z); yaw = atan2(dz, dx) of dir; pitch = rise angle along dir
  box(mat, x, y, z, lx, ly, lz, yaw = 0, pitch = 0, roll = 0) {
    const g = new THREE.BoxGeometry(lx, ly, lz); const m = new THREE.Matrix4();
    m.makeRotationFromEuler(new THREE.Euler(roll, -yaw, pitch, 'YZX')); m.setPosition(x, y, z); g.applyMatrix4(m);
    this.add(mat, boxUV(g));
  }
  // box between two 3D points (w across, h up), e.g. rails, stringers
  seg(mat, a, b, w, h, roll = 0) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const run = Math.hypot(dx, dz), L = Math.hypot(run, dy);
    if (L < 1e-4) return;
    this.box(mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, L, h, w, Math.atan2(dz, dx), Math.atan2(dy, run), roll);
  }
  build(group, name) {
    for (const [mat, l] of this.parts) {
      const geos = l.map((g) => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); if (!q.attributes.normal) q.computeVertexNormals(); if (!q.attributes.uv) q.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); return q; });
      const g = mergeGeometries(geos, false); if (!g) continue; g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
  }
}
const tint = (base, color, rough) => { const m = base.clone(); m.color = new THREE.Color(color); if (rough != null) m.roughness = rough; return m; };

// ------------------------------------------------------------------ 2) install (after the water, so the creek can be opened under the decks)
export function installR5West({ scene, heightAt, physics, water, setupMaterials, quality = 'high' }) {
  if (R5W_OFF) return null;
  const group = new THREE.Group(); group.name = 'r5-west'; scene.add(group);
  const M = materials();
  const MAT = {
    timber: tint(M.wood, 0xa08a6a, 0.88), timberDark: tint(M.wood, 0x6e5d48, 0.9), deck: tint(M.wood, 0x8f7d66, 0.92),
    conc: tint(M.concrete, 0xc9c3b6, 0.95), concDark: tint(M.concrete, 0xa8a296, 0.95), concDeck: tint(M.concrete, 0xb8b2a6, 0.95),
    iron: M.iron, ironGreen: Object.assign(new THREE.MeshStandardMaterial({ color: 0x1c221f, roughness: 0.45, metalness: 0.25 }), { name: 'r5-paintedIron' }), stone: tint(M.ashlar || M.granite, 0x9a9488, 0.95), rubble: tint(M.ashlar || M.granite, 0x878479, 0.97),
    castStone: tint(M.concrete, 0xe2ddd0, 0.85), bronze: tint(M.bronze || M.iron, 0x46594c, 0.5), dark: new THREE.MeshStandardMaterial({ color: 0x0b0c0b, roughness: 1 }),
  };
  const A = new Acc();
  const plans = PLANS || BRIDGES.map((b) => planBridge(b, heightAt));
  const stats = { bridges: 0, weirs: 0 };
  for (const p of plans) if (p) { try { buildBridge(A, MAT, p, physics, heightAt); stats.bridges++; } catch (e) { console.warn('r5-west bridge', p.b.id, e); } }
  try { stats.weirs = buildCreekWorks(A, MAT, heightAt, water, physics, quality, group); } catch (e) { console.warn('r5-west creek works', e); }
  try { buildGatewaySign(A, MAT, heightAt, physics, group); } catch (e) { console.warn('r5-west sign', e); }
  A.build(group, 'r5-west');
  // open the creek under the decks (the water module hid it wherever the path SDF was paved)
  let nOpen = 0;
  const creek = water && water.group && water.group.getObjectByName('creek-r4');
  if (creek) {
    const pos = creek.geometry.attributes.position, vis = creek.geometry.attributes.aVis;
    for (let i = 0; i < pos.count; i++) { if (vis.getX(i) > 0.5) continue; const x = pos.getX(i), z = pos.getZ(i); for (const p of plans) { if (p && p.deckAt(x, z, 1.5) != null) { vis.setX(i, 1); nOpen++; break; } } }
    if (nOpen) vis.needsUpdate = true;
  }
  if (setupMaterials) setupMaterials(group);
  return { group, plans, nOpen, stats };
}

// ------------------------------------------------------------------ bridges
function buildBridge(A, MAT, p, physics, heightAt) {
  const { b, D } = p; const hw = b.w / 2, n = D.length;
  const L = (q, o) => [q.cx - q.tz * o, q.cz + q.tx * o];   // lateral offset point (left normal)
  const wood = b.style === 'wood' || b.style === 'woodx' || b.style === 'arch';
  const deckT = wood ? 0.07 : 0.4;
  // ---- deck
  if (b.style === 'octagon') buildOctagonDeck(A, MAT, p);
  else if (wood) {
    const pitch = 0.17; let next = D[0].s + 0.08;   // transverse planks on stringers
    for (let i = 0; i < n - 1; i++) {
      const a = D[i], c = D[i + 1];
      while (next <= c.s) {
        const u = (next - a.s) / Math.max(1e-6, c.s - a.s); const x = a.cx + (c.cx - a.cx) * u, z = a.cz + (c.cz - a.cz) * u, y = a.y + (c.y - a.y) * u;
        const yaw = Math.atan2(a.tz, a.tx); const jit = Math.abs(Math.sin(next * 91.7) * 43758.5) % 1;
        A.box(jit > 0.85 ? MAT.timberDark : MAT.deck, x, y - deckT / 2, z, 0.145, deckT, b.w, yaw, Math.atan2(c.y - a.y, c.s - a.s));
        next += pitch;
      }
    }
    const nS = b.w > 2.2 ? 3 : 2;
    for (let k = 0; k < nS; k++) { const o = -hw + 0.18 + (b.w - 0.36) * k / (nS - 1); for (let i = 0; i < n - 1; i += 2) { const a = D[i], c = D[Math.min(n - 1, i + 2)]; const pa = L(a, o), pc = L(c, o); const bd = p.span > 10 ? 0.62 : 0.4; A.seg(MAT.timberDark, [pa[0], a.y - deckT - bd / 2, pa[1]], [pc[0], c.y - deckT - bd / 2, pc[1]], 0.18, bd); } }
  } else {
    for (let i = 0; i < n - 1; i += 2) { const a = D[i], c = D[Math.min(n - 1, i + 2)]; A.seg(MAT.concDeck, [a.cx, a.y - deckT / 2, a.cz], [c.cx, c.y - deckT / 2, c.cz], b.w, deckT); }
  }
  // ---- abutments: footings at both ends from under the deck into the bank
  for (const q of [D[0], D[n - 1]]) {
    const g = heightAt(q.cx, q.cz); const top = q.y - deckT - (wood ? 0.3 : 0.0), bot = Math.min(g, q.y) - 0.9; if (top - bot < 0.15) continue;
    A.box(wood ? MAT.concDark : MAT.stone, q.cx, (top + bot) / 2, q.cz, 0.9, top - bot, b.w + 0.5, Math.atan2(q.tz, q.tx));
  }
  // piers under long spans where the deck flies > 1.4 m up, every ~6 m
  if (p.span > 9 && !wood && b.style !== 'octagon') for (let s = p.s0 + 5.5; s < p.s1 - 4; s += 6) {
    const q = D.reduce((m, r) => (Math.abs(r.s - s) < Math.abs(m.s - s) ? r : m), D[0]); const g = heightAt(q.cx, q.cz); if (q.y - g < 1.4) continue;
    for (const o of [-hw + 0.3, hw - 0.3]) { const [x, z] = L(q, o); A.box(wood ? MAT.timberDark : MAT.concDark, x, (q.y - deckT + g - 0.6) / 2, z, 0.3, q.y - deckT - g + 0.6, 0.3, Math.atan2(q.tz, q.tx)); }
  }
  // ---- railings on both sides (+ colliders so nobody walks off the side)
  for (const side of [-1, 1]) {
    const o = side * (hw - (wood ? 0.07 : 0.13));
    if (b.style === 'concrete' || b.style === 'octagon') concreteParapet(A, MAT, D, L, o, b.style === 'octagon' ? 0.55 : 0.8);
    else if (b.style === 'star') starParapet(A, MAT, D, L, o);
    else if (b.style === 'arch') ironRail(A, MAT, D, L, o);
    else timberRail(A, MAT, D, L, o, b.style === 'woodx');
    if (physics) for (let i = 0; i < n - 1; i += 2) { const a = D[i], c = D[Math.min(n - 1, i + 2)]; const pa = L(a, o), pc = L(c, o); physics.addSeg(pa[0], pa[1], pc[0], pc[1], Math.min(a.y, c.y) - 0.2, Math.max(a.y, c.y) + 1.0, 'r5-bridge'); }
  }
  if (physics) physics.addWalkable({ type: 'fn', tag: 'r5-bridge', bounds: p.bounds, heightAt: (x, z) => p.deckAt(x, z) });
}
function postIdx(D, gap) { const n = D.length; const out = [0]; let last = D[0].s; for (let i = 1; i < n - 1; i++) if (D[i].s - last >= gap) { out.push(i); last = D[i].s; } if (D[n - 1].s - D[out[out.length - 1]].s < gap * 0.4 && out.length > 1) out.pop(); out.push(n - 1); return out; }
function timberRail(A, MAT, D, L, o, xbrace) {
  const H = 1.05; const posts = postIdx(D, 1.55);
  for (const i of posts) { const q = D[i], [x, z] = L(q, o); const yaw = Math.atan2(q.tz, q.tx); A.box(MAT.timber, x, q.y + H / 2 - 0.15, z, 0.13, H + 0.3, 0.13, yaw); A.box(MAT.timberDark, x, q.y + H + 0.02, z, 0.17, 0.04, 0.17, yaw); }
  for (let k = 0; k < posts.length - 1; k++) {
    const a = D[posts[k]], c = D[posts[k + 1]]; const pa = L(a, o), pc = L(c, o);
    A.seg(MAT.timber, [pa[0], a.y + H - 0.04, pa[1]], [pc[0], c.y + H - 0.04, pc[1]], 0.15, 0.07);         // handrail
    A.seg(MAT.timber, [pa[0], a.y + 0.52, pa[1]], [pc[0], c.y + 0.52, pc[1]], 0.06, 0.1);                  // mid rail
    A.seg(MAT.timberDark, [pa[0], a.y + 0.1, pa[1]], [pc[0], c.y + 0.1, pc[1]], 0.05, 0.16);               // kick board
    if (xbrace) { A.seg(MAT.timber, [pa[0], a.y + 0.2, pa[1]], [pc[0], c.y + H - 0.12, pc[1]], 0.05, 0.09); A.seg(MAT.timber, [pa[0], a.y + H - 0.12, pa[1]], [pc[0], c.y + 0.2, pc[1]], 0.05, 0.09); }
  }
}
function ironRail(A, MAT, D, L, o) {      // wooden arch bridge "with iron rails": posts, top + bottom rail, close balusters
  const n = D.length; const H = 1.0;
  for (let i = 0; i < n - 1; i++) { const a = D[i], c = D[i + 1]; const pa = L(a, o), pc = L(c, o); A.seg(MAT.ironGreen, [pa[0], a.y + H, pa[1]], [pc[0], c.y + H, pc[1]], 0.06, 0.05); A.seg(MAT.ironGreen, [pa[0], a.y + 0.12, pa[1]], [pc[0], c.y + 0.12, pc[1]], 0.04, 0.04); }
  const posts = new Set(postIdx(D, 1.5));
  for (let i = 0; i < n; i++) {
    const q = D[i], [x, z] = L(q, o); const post = posts.has(i); const yaw = Math.atan2(q.tz, q.tx);
    A.box(MAT.ironGreen, x, q.y + H / 2, z, post ? 0.07 : 0.022, H, post ? 0.07 : 0.022, yaw);
    if (i < n - 1) { const c = D[i + 1]; const [x2, z2] = L({ cx: (q.cx + c.cx) / 2, cz: (q.cz + c.cz) / 2, tx: q.tx, tz: q.tz }, o); A.box(MAT.ironGreen, x2, (q.y + c.y) / 2 + H / 2, z2, 0.022, H, 0.022, yaw); }
  }
}
function concreteParapet(A, MAT, D, L, o, H) {
  const n = D.length;
  for (let i = 0; i < n - 1; i += 2) { const a = D[i], c = D[Math.min(n - 1, i + 2)]; const pa = L(a, o), pc = L(c, o);
    A.seg(MAT.conc, [pa[0], a.y + H / 2 - 0.3, pa[1]], [pc[0], c.y + H / 2 - 0.3, pc[1]], 0.24, H + 0.6);
    A.seg(MAT.castStone, [pa[0], a.y + H + 0.04, pa[1]], [pc[0], c.y + H + 0.04, pc[1]], 0.34, 0.08); }
}
// "the concrete war memorial bridge, with its Star of David railings": cast panels pierced with hexagrams between piers
function starPanelGeo(len, H) {
  const sh = new THREE.Shape(); sh.moveTo(-len / 2, 0); sh.lineTo(len / 2, 0); sh.lineTo(len / 2, H); sh.lineTo(-len / 2, H); sh.closePath();
  const nStars = Math.max(1, Math.round(len / 0.95)), R = Math.min(0.3, H * 0.36), r = R / Math.sqrt(3);
  for (let k = 0; k < nStars; k++) {
    const cx = -len / 2 + len * (k + 0.5) / nStars, cy = H * 0.5; const pts = [];
    for (let i = 0; i < 12; i++) { const ang = Math.PI / 2 + i * Math.PI / 6, rr = i % 2 ? r : R; pts.push(new THREE.Vector2(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr)); }
    sh.holes.push(new THREE.Path(pts.reverse()));
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }); g.translate(0, 0, -0.09); return g;
}
function starParapet(A, MAT, D, L, o) {
  const H = 0.95; const piers = postIdx(D, 2.3);
  for (const i of piers) { const q = D[i], [x, z] = L(q, o); const yaw = Math.atan2(q.tz, q.tx); A.box(MAT.conc, x, q.y + (H + 0.55) / 2 - 0.45, z, 0.42, H + 0.55, 0.42, yaw); A.box(MAT.castStone, x, q.y + H + 0.16, z, 0.52, 0.12, 0.52, yaw); }
  for (let k = 0; k < piers.length - 1; k++) {
    const a = D[piers[k]], c = D[piers[k + 1]]; const pa = L(a, o), pc = L(c, o); const run = Math.hypot(pc[0] - pa[0], pc[1] - pa[1]); const len = run - 0.42; if (len < 0.4) continue;
    const g = starPanelGeo(len, H - 0.12); const m = new THREE.Matrix4(); const yaw = Math.atan2(pc[1] - pa[1], pc[0] - pa[0]); const pitch = Math.atan2(c.y - a.y, run);
    m.makeRotationFromEuler(new THREE.Euler(0, -yaw, pitch, 'YZX')); m.setPosition((pa[0] + pc[0]) / 2, (a.y + c.y) / 2 + 0.06 - (H - 0.12) / 2 + (H - 0.12) / 2, (pa[1] + pc[1]) / 2); g.applyMatrix4(m);
    A.add(MAT.conc, boxUV(g));
    A.seg(MAT.castStone, [pa[0], a.y + H, pa[1]], [pc[0], c.y + H, pc[1]], 0.3, 0.1);          // coping
    A.seg(MAT.conc, [pa[0], a.y - 0.2, pa[1]], [pc[0], c.y - 0.2, pc[1]], 0.26, 0.5);          // curb/fascia under the panel
  }
}
// the Octagon / Bay Tree Bridge: a broad concrete deck with an octagonal hole round the bay that grows through it,
// ringed by an octagonal timber bench
function buildOctagonDeck(A, MAT, p) {
  const { b, D } = p; const y = D[0].y; const q0 = D[0], q1 = D[D.length - 1]; const yaw = Math.atan2(q0.tz, q0.tx);
  const len = q1.s - q0.s, cx = (q0.cx + q1.cx) / 2, cz = (q0.cz + q1.cz) / 2;
  // deck-local frame: u along (tx,tz), v across (left normal (-tz,tx)); world = c + u*t + v*nrm
  const tx = b.tree[0] - cx, tz = b.tree[1] - cz; const tu = tx * q0.tx + tz * q0.tz, tv = -tx * q0.tz + tz * q0.tx;
  const sh = new THREE.Shape(); sh.moveTo(-len / 2, -b.w / 2); sh.lineTo(len / 2, -b.w / 2); sh.lineTo(len / 2, b.w / 2); sh.lineTo(-len / 2, b.w / 2); sh.closePath();
  const RH = 0.85, hp = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; hp.push(new THREE.Vector2(tu + Math.cos(a) * RH, tv + Math.sin(a) * RH)); }
  sh.holes.push(new THREE.Path(hp.reverse()));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: false });
  // shape (u, v, depth) -> world: x = cx + u*tx - v*tz, z = cz + u*tz + v*tx, y = y - depth
  const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getY(i), d = pos.getZ(i); pos.setXYZ(i, cx + u * q0.tx - v * q0.tz, y - d, cz + u * q0.tz + v * q0.tx); }
  g.deleteAttribute('normal'); g.computeVertexNormals();
  A.add(MAT.concDeck, boxUV(g));
  // octagonal bench round the hole (seat boards on concrete plinths)
  const RB0 = 1.0, RB1 = 1.5, SY = y + 0.45, rm = (RB0 + RB1) / 2;
  for (let i = 0; i < 8; i++) {
    const am = i * Math.PI / 4 + Math.PI / 4;   // octagon edges face these angles (vertices at pi/8 + k pi/4)
    const lu = tu + Math.cos(am) * rm, lv = tv + Math.sin(am) * rm;
    const wx = cx + lu * q0.tx - lv * q0.tz, wz = cz + lu * q0.tz + lv * q0.tx; const side = 2 * RB1 * Math.tan(Math.PI / 8);
    // edge direction in world: along local angle am + 90deg
    const ex = Math.cos(am + Math.PI / 2), ev = Math.sin(am + Math.PI / 2); const dwx = ex * q0.tx - ev * q0.tz, dwz = ex * q0.tz + ev * q0.tx; const segYaw = Math.atan2(dwz, dwx);
    A.box(MAT.timber, wx, SY, wz, side, 0.07, RB1 - RB0, segYaw);
    A.box(MAT.concDark, wx, (SY + y) / 2 - 0.02, wz, side * 0.5, SY - y - 0.04, (RB1 - RB0) * 0.6, segYaw);
  }
}

// ------------------------------------------------------------------ creek works
function buildCreekWorks(A, MAT, heightAt, water, physics, quality, group) {
  const nc = water && water.nearestCreek; if (!nc) return 0;
  // culvert headwalls: South Fork into the Oxford St culvert (in its redwood grove), North Fork out of its culvert below West Circle
  headwall(A, MAT, heightAt, nc, [-678.9, 186.8], [-674.0, 188.9], 7.0, true);
  headwall(A, MAT, heightAt, nc, [-562.2, 49.3], [-558.0, 45.2], 6.0, false, true);
  // weirs: boulder step pools and cut-stone check dams where the creek drops (walk the mapped lines at 1 m)
  const reaches = [
    [[-302, 210], [-318, 204], [-329, 202], [-339, 204]],
    [[-367, 187], [-381, 184], [-398, 191], [-414, 192], [-428, 185], [-440, 181], [-454, 178], [-460, 169], [-462, 151], [-462, 135], [-466, 125], [-471, 124], [-495, 122], [-506, 112], [-507, 97], [-514, 93], [-526, 95], [-535, 103], [-553, 96], [-571, 98], [-581, 105], [-582, 120], [-589, 130], [-604, 132], [-615, 145], [-622, 156], [-642, 179], [-658, 190], [-674, 189]],
    [[-569, 56], [-579, 66], [-585, 79], [-585, 93], [-581, 105]],
  ];
  const rocks = []; let lastW = null, nW = 0;
  for (const R of reaches) {
    const S = resample(R, 1.0, 0); const lv = S.map((q) => { const c = nc(q.x, q.z); return c && c.d < 4 ? c.s : null; });
    for (let i = 3; i < S.length - 3; i++) {
      const a = lv[i - 3], c = lv[i + 3], m0 = lv[i]; if (!a || !c || !m0) continue;
      const drop = a[2] - c[2]; if (drop < 0.2) continue;
      if (lastW && Math.hypot(m0[0] - lastW[0], m0[1] - lastW[1]) < 13) continue;
      if (BRIDGES.some((b) => b.pts.some((p) => Math.hypot(p[0] - m0[0], p[1] - m0[1]) < 7))) continue;
      lastW = m0; nW++;
      const t = norm2(c[0] - a[0], c[1] - a[1]); const nx = -t[1], nz = t[0];
      let hwid = 0.8; for (; hwid < 2.4; hwid += 0.1) if (heightAt(m0[0] + nx * hwid, m0[1] + nz * hwid) > m0[2] + 0.25 && heightAt(m0[0] - nx * hwid, m0[1] - nz * hwid) > m0[2] + 0.25) break;
      if (nW % 3 === 0) {   // an old cut-stone check dam (late-1800s style): a straight sill of squared blocks across the bed
        const yaw = Math.atan2(nz, nx); const crest = m0[2] + 0.12; const W = hwid * 2 + 0.8, nb = 5;
        for (let k = 0; k < nb; k++) { const o = -W / 2 + W * (k + 0.5) / nb; A.box(MAT.stone, m0[0] + nx * o, crest - 0.4, m0[1] + nz * o, W / nb - 0.04, 0.8 + (k % 2) * 0.04, 0.55, yaw); }
      } else {              // 2014 TGIF rock step pool: a line of boulders across the channel plus a few below
        const nb = Math.max(4, Math.round(hwid * 2 / 0.45));
        for (let k = 0; k < nb; k++) { const o = -hwid + (2 * hwid) * (k + 0.5) / nb; const h = ((k * 7919 + nW * 104729) % 1000) / 1000; const r = 0.26 + h * 0.18; rocks.push([m0[0] + nx * o + t[0] * (h - 0.5) * 0.3, m0[2] - r * 0.3 + 0.05, m0[1] + nz * o + t[1] * (h - 0.5) * 0.3, r, h]); }
        for (let k = 0; k < 3; k++) { const h = ((k * 3571 + nW * 7907) % 1000) / 1000; const o = (h - 0.5) * hwid * 1.6; rocks.push([m0[0] + nx * o + t[0] * (0.9 + h), m0[2] - 0.3, m0[1] + nz * o + t[1] * (0.9 + h), 0.22 + h * 0.12, h]); }
      }
    }
  }
  if (rocks.length) {
    const geo = new THREE.IcosahedronGeometry(1, quality === 'low' ? 0 : 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.82 + 0.3 * Math.abs(Math.sin(x * 5.1 + y * 3.7 + z * 7.3)); p.setXYZ(i, x * k * 1.15, y * k * 0.72, z * k); }
    geo.deleteAttribute('normal'); geo.computeVertexNormals();
    const im = new THREE.InstancedMesh(geo, MAT.stone, rocks.length); const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler();
    rocks.forEach(([x, y, z, r, h], i) => { e.set((h - 0.5) * 0.4, h * 6.28, (h - 0.5) * 0.3); qn.setFromEuler(e); m.compose(new THREE.Vector3(x, y, z), qn, new THREE.Vector3(r, r, r)); im.setMatrixAt(i, m); });
    im.castShadow = true; im.receiveShadow = true; im.name = 'r5-weir-stones'; group.add(im);
  }
  return nW;
}
// rubble-stone culvert headwall across the creek at `at` (`up` = a point upstream), with wingwalls and an optional trash rack
function headwall(A, MAT, heightAt, nc, at, up, width, grate, outlet = false) {
  const c = nc(at[0], at[1]); const bed = c ? c.s[2] - 0.22 : heightAt(at[0], at[1]);
  const t = norm2(at[0] - up[0], at[1] - up[1]); const nx = -t[1], nz = t[0]; const yaw = Math.atan2(t[1], t[0]);
  const bank = Math.max(heightAt(at[0] + nx * width * 0.5, at[1] + nz * width * 0.5), heightAt(at[0] - nx * width * 0.5, at[1] - nz * width * 0.5));
  const top = Math.max(bed + 2.0, bank + 0.3), OW = 2.0, OH = 1.5;
  const cx = at[0] + t[0] * 0.35, cz = at[1] + t[1] * 0.35;
  // wall (thickness along t) in three parts round the opening
  const side = (width - OW) / 2;
  for (const sg of [-1, 1]) { const o = sg * (OW / 2 + side / 2); A.box(MAT.rubble, cx + nx * o, (top + bed - 0.8) / 2, cz + nz * o, 0.7, top - bed + 0.8, side, yaw); }
  A.box(MAT.rubble, cx, bed + OH + (top - bed - OH) / 2, cz, 0.7, top - bed - OH, OW + 0.02, yaw);
  A.box(MAT.castStone, cx, top + 0.08, cz, 0.85, 0.16, width + 0.2, yaw);                                              // coping
  A.box(MAT.concDark, cx - t[0] * (outlet ? -0.38 : 0.38), bed + OH + 0.1, cz - t[1] * (outlet ? -0.38 : 0.38), 0.12, 0.22, OW + 0.3, yaw); // lintel on the open face
  A.box(MAT.dark, cx + t[0] * 0.2, bed + OH / 2 - 0.1, cz + t[1] * 0.2, 0.45, OH + 0.2, OW, yaw);                       // the dark barrel
  // wingwalls flaring back along the open side
  const fwd = outlet ? 1 : -1;   // inlet: open face upstream (-t); outlet: open face downstream (+t)
  for (const sg of [-1, 1]) {
    const ex = cx + nx * sg * width / 2, ez = cz + nz * sg * width / 2; const wd = norm2(t[0] * 0.85 * fwd + nx * sg * 0.5, t[1] * 0.85 * fwd + nz * sg * 0.5); const wl = 3.4;
    const mx = ex + wd[0] * wl / 2, mz = ez + wd[1] * wl / 2; const g = heightAt(mx, mz); const wtop = Math.max(g + 0.35, (top + g) / 2);
    A.box(MAT.rubble, mx, (wtop + bed - 0.8) / 2, mz, wl, wtop - bed + 0.8, 0.55, Math.atan2(wd[1], wd[0]));
    A.box(MAT.castStone, mx, wtop + 0.06, mz, wl, 0.12, 0.62, Math.atan2(wd[1], wd[0]));
  }
  if (grate) {   // the heavy steel trash rack in front of the mouth, leaning back
    const gx = cx - t[0] * 0.75, gz = cz - t[1] * 0.75;
    for (let k = 0; k <= 12; k++) { const o = -OW / 2 + OW * k / 12; A.box(MAT.iron, gx + nx * o, bed + OH / 2 + 0.05, gz + nz * o, 0.05, OH + 0.4, 0.05, yaw, 0, 0); }
    for (const yy of [0.2, OH * 0.55, OH + 0.15]) A.box(MAT.iron, gx, bed + yy, gz, 0.07, 0.07, OW + 0.25, yaw);
  }
}

// ------------------------------------------------------------------ Oxford & Center gateway sign
function signTexture() {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 208; const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 208); grd.addColorStop(0, '#4f6b5a'); grd.addColorStop(1, '#3a5245'); g.fillStyle = grd; g.fillRect(0, 0, 2048, 208);
  g.strokeStyle = '#b8954a'; g.lineWidth = 8; g.strokeRect(12, 12, 2024, 184);
  g.textBaseline = 'middle';
  const parts = [['UNIVERSITY', 124], ['OF', 84], ['CALIFORNIA', 124]]; const sp = 14, gap = 56;
  const widths = parts.map(([t, s]) => { g.font = `600 ${s}px "Times New Roman", Georgia, serif`; let w = 0; for (const ch of t) w += g.measureText(ch).width + sp; return w - sp; });
  let x = 1024 - (widths.reduce((a, b) => a + b, 0) + gap * 2) / 2;
  parts.forEach(([t, s], i) => { g.font = `600 ${s}px "Times New Roman", Georgia, serif`; for (const ch of t) { const cw = g.measureText(ch).width; g.fillStyle = '#5b4a22'; g.fillText(ch, x + 3, 108); g.fillStyle = '#dcb85e'; g.fillText(ch, x, 104); x += cw + sp; } x += gap - sp; });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function buildGatewaySign(A, MAT, heightAt, physics, group) {
  const { x, z, yaw } = SIGN; const dx = Math.cos(yaw), dz = Math.sin(yaw); const fx = -dz, fz = dx;   // along the fence (dx,dz); front face normal (fx,fz) (yaw pi/2 -> faces -x, west)
  const g0 = heightAt(x, z); const LEN = 7.2, H = 1.2;
  const P = (u, h, v = 0) => [x + dx * u + fx * v, g0 + h, z + dz * u + fz * v];
  const ay = Math.atan2(dz, dx);
  { const [bx, by, bz] = P(0, 0.12); A.box(MAT.castStone, bx, by - 0.2, bz, LEN + 0.6, 0.65, 0.42, ay); }                       // low base wall
  for (const u of [-LEN / 2 - 0.1, LEN / 2 + 0.1]) {                                                                            // two cast-stone piers
    const [px, , pz] = P(u, 0);
    A.box(MAT.castStone, px, g0 + 0.2, pz, 0.78, 0.4, 0.78, ay);
    A.box(MAT.castStone, px, g0 + 0.95, pz, 0.62, 1.5, 0.62, ay);
    A.box(MAT.castStone, px, g0 + 1.76, pz, 0.78, 0.12, 0.78, ay);
    A.box(MAT.castStone, px, g0 + 1.86, pz, 0.6, 0.1, 0.6, ay);
    const cone = new THREE.SphereGeometry(0.17, 12, 10); cone.scale(1, 1.6, 1); cone.translate(px, g0 + 2.16, pz); A.add(MAT.castStone, boxUV(cone));   // pinecone finial
    const neck = new THREE.CylinderGeometry(0.07, 0.11, 0.14, 10); neck.translate(px, g0 + 1.97, pz); A.add(MAT.castStone, boxUV(neck));
  }
  // ornamental iron fence: rails, close pickets, scroll bands (rings), posts with ball tops
  const bot = 0.42, top = bot + H;
  for (const hh of [bot + 0.05, bot + 0.3, top - 0.32, top - 0.05]) A.seg(MAT.ironGreen, P(-LEN / 2, hh), P(LEN / 2, hh), 0.04, 0.035);
  for (let k = 0; k <= 48; k++) { const u = -LEN / 2 + LEN * k / 48; const [qx, qy, qz] = P(u, (bot + top) / 2); A.box(MAT.ironGreen, qx, qy, qz, 0.022, H, 0.022, ay); }
  for (let k = 0; k < 24; k++) { const u = -LEN / 2 + LEN * (k + 0.5) / 24; for (const hh of [bot + 0.175, top - 0.185]) { const ring = new THREE.TorusGeometry(0.1, 0.012, 5, 14); ring.rotateY(-ay); const [rx, ry, rz] = P(u, hh); ring.translate(rx, ry, rz); A.add(MAT.ironGreen, ring); } }
  for (const u of [-LEN / 4, 0, LEN / 4]) { const [qx, , qz] = P(u, 0); A.box(MAT.ironGreen, qx, g0 + bot + H / 2 + 0.05, qz, 0.07, H + 0.1, 0.07, ay); const ball = new THREE.SphereGeometry(0.06, 8, 6); ball.translate(qx, g0 + top + 0.14, qz); A.add(MAT.ironGreen, ball); }
  // the plaque: long verdigris bronze panel with raised gilt Roman capitals on both faces
  const plaqueMat = new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.42, metalness: 0.5 });
  for (const sgn of [1, -1]) {
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.47), plaqueMat); const [qx, qy, qz] = P(0, (bot + top) / 2 + 0.02, sgn * 0.036);
    pm.position.set(qx, qy, qz); pm.lookAt(qx + fx * sgn, qy, qz + fz * sgn); pm.receiveShadow = true; pm.name = 'r5-gate-plaque'; group.add(pm);
  }
  { const [qx, qy, qz] = P(0, (bot + top) / 2 + 0.02); A.box(MAT.bronze, qx, qy, qz, 4.72, 0.53, 0.06, ay); }
  // clipped hedges either side of the sign, just behind the fence line
  const hedge = new THREE.MeshStandardMaterial({ color: 0x3d5a2b, roughness: 0.95 });
  for (const [u0, u1] of [[-LEN / 2 - 8.5, -LEN / 2 - 0.7], [LEN / 2 + 0.7, LEN / 2 + 3.4]]) {
    const um = (u0 + u1) / 2, len = u1 - u0; const [hx, , hz] = P(um, 0, -0.2); const hg = heightAt(hx, hz);
    const geo = new THREE.CapsuleGeometry(0.5, Math.max(0.2, len - 1.0), 4, 10); geo.rotateZ(Math.PI / 2); geo.scale(1, 0.95, 1.1);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); if (yy < -0.1) p.setY(i, -0.1 + (yy + 0.1) * 0.2); } geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, hedge); m.position.set(hx, hg + 0.4, hz); m.rotation.y = -ay; m.castShadow = true; m.receiveShadow = true; m.name = 'r5-gate-hedge'; group.add(m);
    if (physics) { const a = [hx - dx * len / 2, hz - dz * len / 2], b2 = [hx + dx * len / 2, hz + dz * len / 2]; physics.addSeg(a[0], a[1], b2[0], b2[1], hg - 1, hg + 0.95, 'r5-gate'); }
  }
  if (physics) { const a = P(-LEN / 2 - 0.5, 0), b2 = P(LEN / 2 + 0.5, 0); physics.addSeg(a[0], a[2], b2[0], b2[2], g0 - 1, g0 + 2.2, 'r5-gate'); }
}
