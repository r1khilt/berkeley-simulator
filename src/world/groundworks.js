// [r4-ground] Ground geometry: how the campus meets its terrain (round 4, "raise the floor").
//  gradeTerrain()  edits the 1 m core heightfield IN PLACE, before it is uploaded or sampled, so physics, props,
//                  landmarks and the GPU terrain all agree:
//                    - roads drop a kerb height below their sidewalks (asphalt SDF > 0.12 m),
//                    - OSM steps get a clean ramp bed with flat landings (the stair geometry always sits on/above it),
//                    - retaining walls get a real terrace step whose 1 m interpolation band hides under wall + cap.
//  buildGroundworks()  the matching geometry: stairs (treads, risers, nosings, cheek walls, handrails), walls with
//                  coping (replaces streetscape's flat extrusions), road kerbs and path/plaza edging traced from the
//                  ground SDF per 96 m tile on demand, and tree grates where trees stand in paving.
//  ?nogw=1 disables both passes (A/B comparisons).
import * as THREE from 'three';
import { materials, TEX_M } from '../materials.js';
import { noiseTexture } from './noiseTex.js';

const KERB = 0.13;        // road surface drop below the sidewalk (m)
const KERB_W = 0.17;      // kerb top width
const EDGE_W = 0.12;      // path/plaza edging width
const TILE = 128;         // kerb/edging tile size (m)
const KERB_R = 170;       // kerbs/edging drawn within this radius
const CAMPUS = (x, z) => x > -760 && x < 520 && z > -560 && z < 420;

// ---------- samplers over the decoded arrays
class HGrid {
  constructor(h, c) { this.h = h; this.x0 = c.x0 + 0.5 * c.step; this.z0 = c.z0 + 0.5 * c.step; this.s = c.step; this.nx = c.nx; this.nz = c.nz; }
  at(x, z) {
    let fx = (x - this.x0) / this.s, fz = (z - this.z0) / this.s; const nx = this.nx;
    fx = Math.max(0, Math.min(nx - 1.0001, fx)); fz = Math.max(0, Math.min(this.nz - 1.0001, fz));
    const j = fx | 0, i = fz | 0, u = fx - j, v = fz - i, k = i * nx + j, d = this.h;
    return (d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + nx] * (1 - u) + d[k + nx + 1] * u) * v;
  }
  inside(x, z, m = 2) { return x > this.x0 + m && z > this.z0 + m && x < this.x0 + (this.nx - 1) * this.s - m && z < this.z0 + (this.nz - 1) * this.s - m; }
  each(x0, z0, x1, z1, cb) { // grid points inside the box
    const s = this.s, j0 = Math.max(0, Math.ceil((x0 - this.x0) / s)), j1 = Math.min(this.nx - 1, Math.floor((x1 - this.x0) / s));
    const i0 = Math.max(0, Math.ceil((z0 - this.z0) / s)), i1 = Math.min(this.nz - 1, Math.floor((z1 - this.z0) / s));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) cb(this.x0 + j * s, this.z0 + i * s, i * this.nx + j);
  }
}
class SDF { // ground SDF (asphalt, paved, grass, dirt), metres, positive inside
  constructor(sdf, gt, c) { this.d = sdf; this.nx = gt.nx; this.nz = gt.nz; this.s = gt.step; this.x0 = c.x0 + 0.5 * gt.step; this.z0 = c.z0 + 0.5 * gt.step; }
  at(x, z, ch) {
    let fx = (x - this.x0) / this.s, fz = (z - this.z0) / this.s; const nx = this.nx;
    fx = Math.max(0, Math.min(nx - 1.0001, fx)); fz = Math.max(0, Math.min(this.nz - 1.0001, fz));
    const j = fx | 0, i = fz | 0, u = fx - j, v = fz - i, k = (i * nx + j) * 4 + ch, d = this.d, r = nx * 4;
    const val = (d[k] * (1 - u) + d[k + 4] * u) * (1 - v) + (d[k + r] * (1 - u) + d[k + r + 4] * u) * v;
    return (val / 255 - 0.5) * 6;
  }
  raw(i, j, ch) { return (this.d[(i * this.nx + j) * 4 + ch] / 255 - 0.5) * 6; }
}
// building mask at 1 m (1 = procedural building, 2 = landmark footprint)
function buildingMask(G, bjson, manifest) {
  const m = new Uint8Array(G.nx * G.nz);
  const fill = (poly, val) => {
    let z0 = 1e9, z1 = -1e9; for (const p of poly) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const i0 = Math.max(0, Math.ceil((z0 - G.z0) / G.s)), i1 = Math.min(G.nz - 1, Math.floor((z1 - G.z0) / G.s)); const xs = [];
    for (let i = i0; i <= i1; i++) {
      const z = G.z0 + i * G.s; xs.length = 0;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const A = poly[a], B = poly[b]; if ((A[1] > z) !== (B[1] > z)) xs.push(A[0] + (z - A[1]) * (B[0] - A[0]) / (B[1] - A[1])); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const j0 = Math.max(0, Math.ceil((xs[k] - G.x0) / G.s)), j1 = Math.min(G.nx - 1, Math.floor((xs[k + 1] - G.x0) / G.s)); for (let j = j0; j <= j1; j++) m[i * G.nx + j] = Math.max(m[i * G.nx + j], val); }
    }
  };
  for (const b of (bjson && bjson.b) || []) for (const part of b[7]) { const f = part[5], poly = []; for (let i = 0; i < f.length; i += 2) poly.push([f[i] / 10, f[i + 1] / 10]); if (poly.length >= 3) fill(poly, 1); }
  for (const l of (manifest && manifest.landmarks) || []) for (const fp of l.footprints || []) if (fp.length >= 3) fill(fp, 2);
  return { at: (x, z) => { const j = Math.round((x - G.x0) / G.s), i = Math.round((z - G.z0) / G.s); return i < 0 || j < 0 || i >= G.nz || j >= G.nx ? 0 : m[i * G.nx + j]; } };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function resample(pts, step) {
  const R = []; for (let k = 0; k < pts.length - 1; k++) { const [x0, z0] = pts[k], [x1, z1] = pts[k + 1]; const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.ceil(L / step)); for (let i = 0; i < n; i++) R.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
  R.push(pts[pts.length - 1]); return R;
}
const polyLen = (P) => { let L = 0; for (let k = 1; k < P.length; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); return L; };
// point + unit tangent at arc length s along polyline P (cumulative lengths C)
function along(P, C, s) {
  let k = 1; while (k < P.length - 1 && C[k] < s) k++;
  const a = P[k - 1], b = P[k], L = C[k] - C[k - 1] || 1; const t = Math.max(0, Math.min(1, (s - C[k - 1]) / L));
  const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, dx, dz];
}

// =====================================================================================================================
// pass 1: terrain grading
export function gradeTerrain({ heights, c, gt, sdf, vectors, manifest, bjson }) {
  const t0 = performance.now();
  const G = new HGrid(heights, c), S = new SDF(sdf, gt, c);
  const orig = heights.slice(); // pre-grading copy: things baked against the old terrain (trees) are reseated by the delta
  const bmask = buildingMask(G, bjson, manifest);
  const tA = performance.now();
  // 0b) denoise campus ground: the 2021 LiDAR DTM carries 10-60 cm bumps (people, benches, sparse returns under
  //     canopies) that read as lumpy plazas and lawns. Masked Gaussian (sigma 2.5 m, buildings excluded) with the
  //     correction clamped to +-0.3 m, so real terraces, berms and the creek ravine (left alone within 10 m) survive.
  { const R = { x0: -760, z0: -560, x1: 520, z1: 420 };
    const j0 = Math.max(0, Math.ceil((R.x0 - G.x0) / G.s)), j1 = Math.min(G.nx - 1, Math.floor((R.x1 - G.x0) / G.s));
    const i0 = Math.max(0, Math.ceil((R.z0 - G.z0) / G.s)), i1 = Math.min(G.nz - 1, Math.floor((R.z1 - G.z0) / G.s));
    const W = j1 - j0 + 1, Hn = i1 - i0 + 1, N = W * Hn;
    const num = new Float32Array(N), den = new Float32Array(N), keep = new Float32Array(N);
    for (let i = 0; i < Hn; i++) for (let j = 0; j < W; j++) { const x = G.x0 + (j0 + j) * G.s, z = G.z0 + (i0 + i) * G.s; const w = bmask.at(x, z) ? 0 : 1; const k = (i0 + i) * G.nx + j0 + j; num[i * W + j] = heights[k] * w; den[i * W + j] = w; keep[i * W + j] = w; }
    for (const wv of vectors.water || []) { const P = wv.pts; for (let q = 0; q < P.length - 1; q++) { const a = P[q], b = P[q + 1]; const bx0 = Math.min(a[0], b[0]) - 10, bx1 = Math.max(a[0], b[0]) + 10, bz0 = Math.min(a[1], b[1]) - 10, bz1 = Math.max(a[1], b[1]) + 10;
      for (let z = Math.ceil(bz0 - G.z0); z <= bz1 - G.z0; z++) for (let x = Math.ceil(bx0 - G.x0); x <= bx1 - G.x0; x++) { const i = z - i0, j = x - j0; if (i < 0 || j < 0 || i >= Hn || j >= W) continue; const wx = G.x0 + x, wz = G.z0 + z; const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((wx - a[0]) * dx + (wz - a[1]) * dz) / L2)); if (Math.hypot(a[0] + t * dx - wx, a[1] + t * dz - wz) < 10) keep[i * W + j] = 0; } } }
    const sig = 2.5, rad = 7, ker = []; let ks = 0; for (let o = -rad; o <= rad; o++) { const v = Math.exp(-o * o / (2 * sig * sig)); ker.push(v); ks += v; } for (let o = 0; o < ker.length; o++) ker[o] /= ks;
    const blur = (src) => { const tmp = new Float32Array(N), out = new Float32Array(N);
      for (let i = 0; i < Hn; i++) { const r = i * W; for (let j = 0; j < W; j++) { let acc = 0; for (let o = -rad; o <= rad; o++) { const jj = j + o; if (jj >= 0 && jj < W) acc += src[r + jj] * ker[o + rad]; } tmp[r + j] = acc; } }
      for (let i = 0; i < Hn; i++) for (let j = 0; j < W; j++) { let acc = 0; for (let o = -rad; o <= rad; o++) { const ii = i + o; if (ii >= 0 && ii < Hn) acc += tmp[ii * W + j] * ker[o + rad]; } out[i * W + j] = acc; }
      return out; };
    const bn = blur(num), bd = blur(den);
    for (let i = 0; i < Hn; i++) for (let j = 0; j < W; j++) { const q = i * W + j; if (!keep[q] || bd[q] < 0.3) continue; const k = (i0 + i) * G.nx + j0 + j; const d = bn[q] / bd[q] - heights[k]; heights[k] += Math.max(-0.3, Math.min(0.3, d)) * Math.min(1, (bd[q] - 0.3) / 0.4); }
  }
  const tB = performance.now();
  // 0) landmark aprons: where the DTM bulges up against a landmark wall (the LiDAR fill under the footprint) and falls
  //    away outward, cut it back toward the outer ground so plinths and basement windows show. Only ever lowers, never
  //    below the building's base (anchor y), never under other buildings, and leaves flat plazas and uphill sides alone.
  let nApron = 0;
  const APRON_SKIP = new Set(['doe-library', 'sproul-hall']); // the quality bar: leave their ground exactly as authored
  for (const l of (manifest && manifest.landmarks) || []) {
    if (l.always || APRON_SKIP.has(l.id)) continue;
    const ay = l.anchor ? l.anchor.y : -1e9;
    for (const fp of l.footprints || []) {
      if (fp.length < 3) continue; const n = fp.length;
      for (let e = 0; e < n; e++) {
        const a = fp[e], b = fp[(e + 1) % n]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.5) continue;
        let nx = dz / L, nz = -dx / L; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        if (inRing(mx + nx * 0.3, mz + nz * 0.3, fp)) { nx = -nx; nz = -nz; } // outward
        const ns = Math.max(1, Math.round(L)); 
        for (let k = 0; k <= ns; k++) {
          const px = a[0] + dx * k / ns, pz = a[1] + dz * k / ns; if (!G.inside(px, pz, 8)) continue;
          const h1 = G.at(px + nx * 1.0, pz + nz * 1.0), h5 = G.at(px + nx * 5.5, pz + nz * 5.5);
          if (h1 - h5 < 0.2) continue;
          const target = Math.max(h5 + 0.05, ay - 0.05); if (target >= h1 - 0.05) continue;
          nApron++;
          G.each(px - 6.5, pz - 6.5, px + 6.5, pz + 6.5, (x, z, idx) => {
            const rx = x - px, rz = z - pz; const d = rx * nx + rz * nz, lat = Math.abs(-rx * nz + rz * nx);
            if (d < 0 || d > 5.5 || lat > 0.8 + 0.5 * (k === 0 || k === ns ? 1 : 0)) return;
            if (bmask.at(x, z) === 1) return;
            const cur = heights[idx]; if (cur <= target) return;
            const w = 1 - smooth(2.5, 5.5, d); heights[idx] = Math.max(orig[idx] - 0.8, cur - (cur - target) * w); // overlapping samples never cut > 0.8 m in total
          });
        }
      }
    }
  }
  // 1) roads sit a kerb below their sidewalks: lower every grid point well inside the asphalt
  let nLow = 0; const sd = S.d, snx = S.nx;
  for (let i = 0; i < G.nz; i++) { const z = G.z0 + i * G.s; const si = Math.max(0, Math.min(S.nz - 1, Math.round((z - S.z0) / S.s)));
    for (let j = 0; j < G.nx; j++) { const x = G.x0 + j * G.s; const sj = Math.max(0, Math.min(snx - 1, Math.round((x - S.x0) / S.s)));
      if (sd[(si * snx + sj) * 4] < 76) continue; // nearest texel > 1.2 m outside the asphalt (texel half-diagonal 1.13 m): skip the bilinear sample
      const dA = S.at(x, z, 0); if (dA > 0.12) { heights[i * G.nx + j] -= KERB * smooth(0.12, 0.3, dA); nLow++; } } }
  // 1b) campus lawns and beds sit a few cm below the walks that cross them, so path edging reads as a real edge
  let nSoft = 0;
  G.each(-760, -560, 520, 420, (x, z, k) => {
    const dP = S.at(x, z, 1); if (dP > -0.05 || dP < -1.4) return;
    if (S.at(x, z, 0) > -0.5 || (S.at(x, z, 2) < -0.3 && S.at(x, z, 3) < -0.3) || bmask.at(x, z)) return;
    heights[k] -= 0.045 * (1 - smooth(0.8, 1.4, -dP)); nSoft++;
  });
  // 2) stairs: plan from the (road-graded) terrain, then bed them in
  const stairs = [];
  for (const p of vectors.paths) {
    if (!p.steps || p.tunnel || p.bridge || p.pts.length < 2) continue;
    const P = p.pts.map((q) => [q[0], q[1]]); const L = polyLen(P); if (L < 0.7 || L > 80) continue;
    if (!P.every(([x, z]) => G.inside(x, z, 6))) continue;
    const w = Math.max(1.2, Math.min(14, p.w || 2.6));
    const C = [0]; for (let k = 1; k < P.length; k++) C.push(C[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    // skip indoor steps and anything hugging a landmark (landmark modules build their own entrance steps)
    let skip = false;
    for (let s = 0; s <= L && !skip; s += 0.8) { const [x, z, dx, dz] = along(P, C, s); for (const o of [0, 1, -1]) { const ox = x - dz * o * (w / 2 + 1.2), oz = z + dx * o * (w / 2 + 1.2); const b = bmask.at(ox, oz); if (b === 2 || (o === 0 && b === 1)) { skip = true; break; } } }
    if (skip) continue;
    const [ax, az, adx, adz] = along(P, C, 0), [bx, bz, bdx, bdz] = along(P, C, L);
    let ha = Math.min(G.at(ax, az), G.at(ax - adx * 1.0, az - adz * 1.0)), hb = Math.max(G.at(bx, bz), G.at(bx + bdx * 1.0, bz + bdz * 1.0));
    let ha2 = Math.max(G.at(ax, az), G.at(ax - adx * 1.0, az - adz * 1.0)), hb2 = Math.min(G.at(bx, bz), G.at(bx + bdx * 1.0, bz + bdz * 1.0));
    let up = hb >= ha; // way runs low -> high?
    if (!up) { ha = ha2; hb = hb2; }
    const rise = Math.abs(hb - ha); if (rise < 0.12) continue;
    let n = Math.max(1, Math.round(rise / 0.155)); if (L / n < 0.27) n = Math.max(1, Math.floor(L / 0.27));
    const lo = Math.min(ha, hb), hi = Math.max(ha, hb);
    // the stair must roughly agree with the ground it climbs: skip ones whose bed would cut > 1.1 m or that stand > 1.4 m
    // above the terrain (elevated flights, bridges, mis-tagged indoor stairs)
    let worstCut = 0, worstFill = 0;
    for (let s2 = 0; s2 <= L; s2 += 0.7) { const [x, z] = along(P, C, s2); const sl = up ? s2 : L - s2; const ramp = lo + (hi - lo) * (sl / L); const dz = G.at(x, z) - ramp; worstCut = Math.max(worstCut, dz); worstFill = Math.max(worstFill, -dz); }
    if (worstCut > 1.1 || worstFill > 1.4) continue;
    stairs.push({ P, C, L, w, n, lo, hi, up, mat: /stone|granite|sett|paving/.test(p.surface || '') ? 'granite' : (p.surface === 'brick' ? 'brick' : 'concrete'), cheeks: w <= 5.5 && rise >= 0.45 });
  }
  // landings first (blend toward the landing heights), then beds (only ever lowered, so treads always cover terrain)
  for (const st of stairs) {
    const { P, C, L, w, lo, hi, up } = st; const hw = w / 2 + 0.3, pad = 1.8;
    const bb = bbox(P, hw + pad + 1.5);
    G.each(bb[0], bb[1], bb[2], bb[3], (x, z, k) => {
      const q = project(P, C, x, z); const s = q.s, d = Math.abs(q.d);
      const sl = up ? s : L - s; // distance from the low end along the stair
      const side = 1 - smooth(hw, hw + pad, d);
      if (side <= 0) return;
      const lim = (v) => Math.max(orig[k] - 0.9, Math.min(orig[k] + 0.9, v)); // landings and side grading move ground <= 0.9 m
      if (sl < 0 && sl > -1.5 - pad) { const wgt = side * (1 - smooth(1.2, 1.2 + pad, -sl)); heights[k] = lim(heights[k] + (lo - heights[k]) * wgt); }
      else if (sl > L && sl < L + 1.5 + pad) { const wgt = side * (1 - smooth(1.2, 1.2 + pad, sl - L)); heights[k] = lim(heights[k] + (hi - heights[k]) * wgt); }
      else if (!st.cheeks && sl >= 0 && sl <= L && d > hw) { const ramp = lo + (hi - lo) * (sl / L); heights[k] = lim(heights[k] + (ramp - heights[k]) * side); }
    });
  }
  for (const st of stairs) {
    const { P, C, L, w, lo, hi, up } = st; const hw = w / 2 + (st.cheeks ? 0.45 : 0.25);
    const bb = bbox(P, hw + 1);
    G.each(bb[0], bb[1], bb[2], bb[3], (x, z, k) => {
      const q = project(P, C, x, z); if (Math.abs(q.d) > hw || q.s < -0.2 || q.s > L + 0.2) return;
      const sl = Math.max(0, Math.min(L, up ? q.s : L - q.s)); const ramp = lo + (hi - lo) * (sl / L) - 0.04;
      if (heights[k] > ramp) heights[k] = ramp;
    });
  }
  // 3) walls: classify retaining vs freestanding from the terrain on both sides, then terrace the retaining ones
  const walls = [];
  for (const b of vectors.barriers) {
    if (!(b.type === 'wall' || b.type === 'retaining_wall' || b.type === 'city_wall') || b.pts.length < 2) continue;
    if (!b.pts.every(([x, z]) => G.inside(x, z, 6))) continue;
    // extend both ends a little so pieces that meet at corners overlap instead of leaving a slot
    const E = b.pts.map((q) => [q[0], q[1]]); const ext = b.type === 'retaining_wall' ? 0.6 : 0.2;
    { const [a0, a1] = [E[0], E[1]], la = Math.hypot(a0[0] - a1[0], a0[1] - a1[1]) || 1; E[0] = [a0[0] + (a0[0] - a1[0]) / la * ext, a0[1] + (a0[1] - a1[1]) / la * ext];
      const m = E.length - 1, [b0, b1] = [E[m], E[m - 1]], lb = Math.hypot(b0[0] - b1[0], b0[1] - b1[1]) || 1; E[m] = [b0[0] + (b0[0] - b1[0]) / lb * ext, b0[1] + (b0[1] - b1[1]) / lb * ext]; }
    const P = resample(E, 1.0); if (P.length < 2) continue;
    const C = [0]; for (let k = 1; k < P.length; k++) C.push(C[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    const L = C[C.length - 1]; if (L < 0.8) continue;
    const hl = [], hr = [];
    for (let k = 0; k < P.length; k++) { const [, , dx, dz] = along(P, C, Math.min(L, C[k] + 0.01)); const nx = -dz, nz = dx; hl.push(G.at(P[k][0] + nx * 2.3, P[k][1] + nz * 2.3)); hr.push(G.at(P[k][0] - nx * 2.3, P[k][1] - nz * 2.3)); }
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const dH = mean(hl) - mean(hr); const ret = Math.abs(dH) >= 0.35 && Math.abs(dH) <= 4.0 && b.type !== 'city_wall'; // > 4 m: smoothed cliffs/structures, leave the ground alone
    const sgn = dH >= 0 ? 1 : -1; // +1: high side on the left normal
    const sm = (a, r) => a.map((_, k) => { let s = 0, n = 0; for (let o = -r; o <= r; o++) { const v = a[k + o]; if (v != null) { s += v; n++; } } return s / n; });
    // terrace tops read as level runs: a straight fit when the high ground varies little along the wall, else a wide average
    const fit = (a) => { const m = a.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; a.forEach((v, k) => { sx += k; sy += v; sxx += k * k; sxy += k * v; }); const den = m * sxx - sx * sx || 1; const bb = (m * sxy - sx * sy) / den, aa = (sy - bb * sx) / m; return a.map((_, k) => aa + bb * k); };
    const rawH = sgn > 0 ? hl : hr; const spanH = Math.max(...rawH) - Math.min(...rawH);
    const H = spanH < 0.8 ? fit(rawH) : sm(rawH, 4), Lo = sm(sgn > 0 ? hr : hl, 2);
    const defaultH = Math.abs(b.h - 1.4) < 1e-6; // bake default for untagged walls: campus walls are mostly seat height
    const hFree = defaultH ? (CAMPUS(P[0][0], P[0][1]) ? 0.55 : 1.1) : Math.max(0.4, Math.min(2.5, b.h));
    walls.push({ P, C, L, ret, sgn, H, Lo, hFree, bh: b.h, hlS: sm(hl, 2), hrS: sm(hr, 2) });
  }
  for (const wl of walls) {
    if (wl.ret) continue;
    // freestanding: the 2021 DTM counts low walls as ground, leaving a ~0.3-0.5 m ridge along the line that buries the
    // new wall. Lower ground within 1.6 m of the line to each side's level (sampled 2.3 m out); never raise.
    const { P, C, L } = wl; const bb = bbox(P, 2.2);
    G.each(bb[0], bb[1], bb[2], bb[3], (x, z, k) => {
      const q = project(P, C, x, z); if (q.s < -0.4 || q.s > L + 0.4 || Math.abs(q.d) > 1.6) return;
      const fi = Math.max(0, Math.min(P.length - 1, Math.round(q.s))); const side = q.d >= 0 ? wl.hlS[fi] : wl.hrS[fi];
      const w = 1 - smooth(0.9, 1.6, Math.abs(q.d)); if (heights[k] > side) heights[k] = Math.max(orig[k] - 0.8, heights[k] - (heights[k] - side) * w);
    });
  }
  for (const wl of walls) {
    if (!wl.ret) continue;
    const { P, C, L, sgn, H, Lo } = wl; const bb = bbox(P, 3.2);
    G.each(bb[0], bb[1], bb[2], bb[3], (x, z, k) => {
      const q = project(P, C, x, z); if (q.s < -0.3 || q.s > L + 0.3) return;
      const dl = -q.d * sgn; // signed distance toward the LOW side
      if (dl < -3.0 || dl > 3.0) return;
      const fi = Math.max(0, Math.min(P.length - 1, Math.round(q.s))); // samples every ~1 m
      const endFade = 1 - smooth(0, 0.3, Math.max(-q.s, q.s - L));
      const lim = (v) => Math.max(orig[k] - 2.5, Math.min(orig[k] + 2.5, v));
      if (dl < -0.48) { const wgt = endFade * (1 - smooth(1.3, 3.0, -dl)); heights[k] = lim(heights[k] + (H[fi] - 0.02 - heights[k]) * wgt); }
      else { const wgt = endFade * (1 - smooth(1.3, 3.0, dl)); heights[k] = lim(heights[k] + (Lo[fi] - heights[k]) * wgt); }
    });
  }
  // 4) hedges: collected here, swept with a clipped-hedge profile in buildGroundworks (replaces streetscape's boxes)
  const hedges = [];
  for (const b of vectors.barriers) { if (b.type !== 'hedge' || b.pts.length < 2 || !b.pts.every(([x, z]) => G.inside(x, z, 4))) continue; const P = resample(b.pts.map((q) => [q[0], q[1]]), 0.8); if (polyLen(P) < 0.8) continue; hedges.push({ P, h: Math.max(0.6, Math.min(1.6, b.h || 1.1)) }); }
  const ms = Math.round(performance.now() - t0);
  console.log('groundworks grade', JSON.stringify({ ms, denoiseMs: Math.round(tB - tA), lowered: nLow, soft: nSoft, aprons: nApron, stairs: stairs.length, walls: walls.length, retaining: walls.filter((w) => w.ret).length }));
  return { G, S, bmask, stairs, walls, hedges, c, gt, orig, aprons: nApron };
}
// trees were baked against the ungraded terrain: move each by the local grading delta (cm units, as decoded)
export function reseatTrees(plan, trees) {
  if (!plan || !plan.orig || !trees) return 0; const O = new HGrid(plan.orig, plan.c); let n = 0;
  for (let i = 0; i < trees.n; i++) { const x = trees.x[i] / 10, z = trees.z[i] / 10; if (!plan.G.inside(x, z, 2)) continue; const d = plan.G.at(x, z) - O.at(x, z); if (Math.abs(d) > 0.02) { trees.y[i] = Math.max(0, Math.round(trees.y[i] + d * 100)); n++; } }
  plan.orig = null; return n;
}
function inRing(x, z, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
function bbox(P, m) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); } return [x0 - m, z0 - m, x1 + m, z1 + m]; }
// nearest point on polyline: s = arc length (may run past the ends along the end tangents), d = signed (left +)
function project(P, C, x, z) {
  let best = null;
  for (let k = 0; k < P.length - 1; k++) {
    const a = P[k], b = P[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9; const L = Math.sqrt(L2);
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; const first = k === 0, last = k === P.length - 2;
    const tc = Math.max(first ? -1e9 : 0, Math.min(last ? 1e9 : 1, t));
    const px = a[0] + dx * tc, pz = a[1] + dz * tc; const dd = Math.hypot(x - px, z - pz);
    if (!best || dd < best.dd) { const cr = (dx * (z - a[1]) - dz * (x - a[0])) / L; best = { dd, s: C[k] + tc * L, d: -cr }; }
  }
  return best; // left normal = (-dz, dx): d > 0 on that side
}

// =====================================================================================================================
// pass 2: geometry
class Geo { // simple non-indexed builder: positions, normals, uvs
  constructor() { this.p = []; this.n = []; this.u = []; }
  quad(a, b, c, d, nrm, uvs) { // a,b,c,d around the quad; if nrm is given the winding is flipped to face it
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    let P = [a, b, c, a, c, d], U = uvs ? [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]] : null;
    if (nrm) { if (nx * nrm[0] + ny * nrm[1] + nz * nrm[2] < 0) { P = [a, c, b, a, d, c]; if (U) U = [uvs[0], uvs[2], uvs[1], uvs[0], uvs[3], uvs[2]]; } [nx, ny, nz] = nrm; }
    for (let i = 0; i < 6; i++) { this.p.push(P[i][0], P[i][1], P[i][2]); this.n.push(nx, ny, nz); if (U) this.u.push(U[i][0], U[i][1]); else this.u.push(0, 0); }
  }
  // box-projected quad uvs in metres / TEX_M
  quadB(a, b, c, d, nrm) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const uv = (p) => (ay >= ax && ay >= az ? [p[0] / TEX_M, p[2] / TEX_M] : ax >= az ? [p[2] / TEX_M, p[1] / TEX_M] : [p[0] / TEX_M, p[1] / TEX_M]);
    this.quad(a, b, c, d, nrm || [nx, ny, nz], [uv(a), uv(b), uv(c), uv(d)]);
  }
  get count() { return this.p.length / 3; }
  geometry(origin) {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(this.p);
    if (origin) for (let i = 0; i < p.length; i += 3) { p[i] -= origin[0]; p[i + 1] -= origin[1]; p[i + 2] -= origin[2]; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere(); return g;
  }
}
// solid box between two plan points (a->b along the axis), half-width hw, from y0 to y1 (top may slope: y1a/y1b)
function slab(geo, a, b, hw, y0, y1a, y1b, faces = { top: 1, front: 1, back: 1, left: 1, right: 1 }) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; const tx = dx / L, tz = dz / L, nx = -tz, nz = tx;
  const A = [a[0] + nx * hw, a[1] + nz * hw], B = [b[0] + nx * hw, b[1] + nz * hw], Cc = [b[0] - nx * hw, b[1] - nz * hw], D = [a[0] - nx * hw, a[1] - nz * hw];
  const y0a = Array.isArray(y0) ? y0[0] : y0, y0b = Array.isArray(y0) ? y0[1] : y0;
  if (faces.top) { const sx = (y1b - y1a) / L; const tn = [-tx * sx, 1, -tz * sx], tl = Math.hypot(tn[0], 1, tn[2]); geo.quadB([D[0], y1a, D[1]], [Cc[0], y1b, Cc[1]], [B[0], y1b, B[1]], [A[0], y1a, A[1]], [tn[0] / tl, 1 / tl, tn[2] / tl]); }
  if (faces.front) geo.quadB([A[0], y0a, A[1]], [D[0], y0a, D[1]], [D[0], y1a, D[1]], [A[0], y1a, A[1]], [-tx, 0, -tz]); // faces back along -t (toward a)
  if (faces.back) geo.quadB([Cc[0], y0b, Cc[1]], [B[0], y0b, B[1]], [B[0], y1b, B[1]], [Cc[0], y1b, Cc[1]], [tx, 0, tz]);
  if (faces.left) geo.quadB([B[0], y0b, B[1]], [A[0], y0a, A[1]], [A[0], y1a, A[1]], [B[0], y1b, B[1]], [nx, 0, nz]);
  if (faces.right) geo.quadB([D[0], y0a, D[1]], [Cc[0], y0b, Cc[1]], [Cc[0], y1b, Cc[1]], [D[0], y1a, D[1]], [-nx, 0, -nz]);
}

export function buildGroundworks(plan, { scene, heightAt, trees, treeSys, physics, pois, vectors }) {
  const t0 = performance.now();
  const { G, S, bmask } = plan; const M = materials();
  const group = new THREE.Group(); group.name = 'groundworks'; scene.add(group);
  // own lightly tinted copies so the ground pieces separate from the slabs they sit on
  const stepMat = { concrete: M.concrete, granite: M.graniteDark, brick: M.brick || M.concrete };
  const capMat = M.graniteDark, kerbMat = M.concrete;
  // ---- chunked static meshes (stairs + walls), 128 m buckets, hidden beyond ~420 m
  const buckets = new Map();
  const BK = 256; // one mesh per material per 256 m cell keeps draw calls low
  const bucket = (x, z, key) => { const k = key + Math.floor(x / BK) + ',' + Math.floor(z / BK); let b = buckets.get(k); if (!b) buckets.set(k, (b = { geo: new Geo(), key, cx: (Math.floor(x / BK) + 0.5) * BK, cz: (Math.floor(z / BK) + 0.5) * BK })); return b.geo; };
  // ---- stairs
  let nTreads = 0;
  for (const st of plan.stairs) {
    const { P, C, L, w, n, lo, hi, up } = st; const r = (hi - lo) / n, t = L / n, hw = w / 2;
    const mid = along(P, C, L / 2); const key = st.mat === 'granite' ? 'gran' : st.mat === 'brick' ? 'brick' : 'conc';
    const geo = bucket(mid[0], mid[1], key), cheekGeo = bucket(mid[0], mid[1], 'concd'), railGeo = bucket(mid[0], mid[1], 'rail');
    const yBase = (x, z) => Math.min(heightAt(x, z), lo) - 0.35;
    for (let i = 0; i < n; i++) {
      // tread i spans [s0, s1] measured from the LOW end; top at lo + (i+1) r; 2.5 cm nosing over the riser below
      const s0 = i * t, s1 = (i + 1) * t; const sa = up ? s0 : L - s0, sb = up ? s1 : L - s1;
      const A = along(P, C, sa), B = along(P, C, sb); const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz) || 1;
      const a = [A[0] - dx / l * 0.025, A[1] - dz / l * 0.025], b = [B[0], B[1]];
      const y1 = lo + (i + 1) * r;
      slab(geo, a, b, hw, [yBase(a[0], a[1]), yBase(b[0], b[1])], y1, y1, { top: 1, front: 1, back: i === n - 1, left: 1, right: 1 });
      // dark anti-slip nosing strip along each tread edge: makes the flight read as steps from mid distance
      { const ux = dx / l, uz = dz / l, nx = -uz, nz = ux, e = hw - 0.06; const n0 = [a[0], a[1]], n1 = [a[0] + ux * 0.08, a[1] + uz * 0.08];
        (st.mat === 'brick' ? bucket(mid[0], mid[1], 'gran') : railGeo).quad([n0[0] - nx * e, y1 + 0.004, n0[1] - nz * e], [n0[0] + nx * e, y1 + 0.004, n0[1] + nz * e], [n1[0] + nx * e, y1 + 0.004, n1[1] + nz * e], [n1[0] - nx * e, y1 + 0.004, n1[1] - nz * e], [0, 1, 0], [[0, 0], [1, 0], [1, 0.03], [0, 0.03]]); }
      nTreads++;
    }
    if (st.cheeks) {
      // cheek walls follow the nosing line (+0.12 m) and step down to the landing at both ends
      const thick = 0.26, off = hw + thick / 2;
      for (const sd of [1, -1]) {
        const N = Math.max(1, Math.ceil(L / 1.0));
        for (let k = 0; k < N; k++) {
          const sa = (k / N) * L, sb = ((k + 1) / N) * L; const A = along(P, C, sa), B = along(P, C, sb);
          const pa = [A[0] - A[3] * off * sd, A[1] + A[2] * off * sd], pb = [B[0] - B[3] * off * sd, B[1] + B[2] * off * sd];
          const la = up ? sa : L - sa, lb = up ? sb : L - sb; // distance from the low end
          const ya = lo + (hi - lo) * Math.min(1, (la + t) / L) + 0.12, yb = lo + (hi - lo) * Math.min(1, (lb + t) / L) + 0.12;
          // keep the cheek above the soil it retains on the outside
          const ga = heightAt(pa[0] - A[3] * 0.5 * sd, pa[1] + A[2] * 0.5 * sd), gb = heightAt(pb[0] - B[3] * 0.5 * sd, pb[1] + B[2] * 0.5 * sd);
          slab(cheekGeo, pa, pb, thick / 2, [yBase(pa[0], pa[1]), yBase(pb[0], pb[1])], Math.max(ya, ga + 0.05), Math.max(yb, gb + 0.05), { top: 1, front: k === 0, back: k === N - 1, left: 1, right: 1 });
        }
        // handrail on longer flights
        if (hi - lo > 0.9) {
          const nP = Math.max(2, Math.ceil(L / 1.6) + 1); let prev = null;
          for (let k = 0; k < nP; k++) {
            const s = (k / (nP - 1)) * L; const A = along(P, C, s); const p = [A[0] - A[3] * off * sd, A[1] + A[2] * off * sd]; const ls = up ? s : L - s;
            const y = lo + (hi - lo) * Math.min(1, (ls + t) / L) + 0.12; const top = y + 0.86;
            slab(railGeo, [p[0] - A[2] * 0.02, p[1] - A[3] * 0.02], [p[0] + A[2] * 0.02, p[1] + A[3] * 0.02], 0.02, y, top, top, { top: 0, front: 1, back: 1, left: 1, right: 1 });
            if (prev) slab(railGeo, [prev[0], prev[1]], [p[0], p[1]], 0.024, [prev[2] - 0.05, top - 0.05], prev[2], top);
            prev = [p[0], p[1], top];
          }
        }
      }
    }
  }
  // ---- walls (retaining terraces + freestanding seat walls), replacing the streetscape extrusions
  let nWallSeg = 0;
  for (const wl of plan.walls) {
    const { P, C, L, ret, sgn, H, Lo, hFree } = wl;
    const mid = along(P, C, L / 2); const geo = bucket(mid[0], mid[1], 'concd'), cap = bucket(mid[0], mid[1], 'gran');
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const nx = -dz / l * sgn, nz = dx / l * sgn; // unit normal toward the HIGH side
      const ex = dx / l * 0.02, ez = dz / l * 0.02; // tiny overlap between pieces
      const aa = [a[0] - ex, a[1] - ez], bb = [b[0] + ex, b[1] + ez];
      if (ret) {
        // body spans 1.24 m: low face 0.14 m toward the low side, back edge 1.1 m into the high side
        const top0 = H[k] + 0.04, top1 = H[k + 1] + 0.04, bot0 = Lo[k] - 0.4, bot1 = Lo[k + 1] - 0.4;
        const c0 = [aa[0] + nx * (-0.14 + 0.62), aa[1] + nz * (-0.14 + 0.62)], c1 = [bb[0] + nx * (-0.14 + 0.62), bb[1] + nz * (-0.14 + 0.62)];
        slab(geo, c0, c1, 0.62, [bot0, bot1], top0, top1, { top: 1, front: k === 0, back: k === P.length - 2, left: 1, right: 1 });
        // coping along the drop edge: 0.4 m wide, 6 cm proud, 3 cm overhang over the face
        const q0 = [aa[0] + nx * (-0.17 + 0.2), aa[1] + nz * (-0.17 + 0.2)], q1 = [bb[0] + nx * (-0.17 + 0.2), bb[1] + nz * (-0.17 + 0.2)];
        slab(cap, q0, q1, 0.2, [top0 - 0.03, top1 - 0.03], top0 + 0.06, top1 + 0.06, { top: 1, front: k === 0, back: k === P.length - 2, left: 1, right: 1 });
        if (physics && Math.max(top0 - bot0, top1 - bot1) > 1.0) physics.addSeg(a[0] - nx * 0.14, a[1] - nz * 0.14, b[0] - nx * 0.14, b[1] - nz * 0.14, Math.min(bot0, bot1) - 1, Math.max(top0, top1) - 0.45, 'gw-wall');
      } else {
        const g0 = Math.max(heightAt(a[0] + nx * 0.5, a[1] + nz * 0.5), heightAt(a[0] - nx * 0.5, a[1] - nz * 0.5)), g1 = Math.max(heightAt(b[0] + nx * 0.5, b[1] + nz * 0.5), heightAt(b[0] - nx * 0.5, b[1] - nz * 0.5));
        const lo0 = Math.min(heightAt(a[0] + nx * 0.5, a[1] + nz * 0.5), heightAt(a[0] - nx * 0.5, a[1] - nz * 0.5)) - 0.3, lo1 = Math.min(heightAt(b[0] + nx * 0.5, b[1] + nz * 0.5), heightAt(b[0] - nx * 0.5, b[1] - nz * 0.5)) - 0.3;
        const top0 = g0 + hFree, top1 = g1 + hFree;
        slab(geo, aa, bb, 0.17, [lo0, lo1], top0, top1, { top: 0, front: k === 0, back: k === P.length - 2, left: 1, right: 1 });
        slab(cap, aa, bb, 0.22, [top0 - 0.02, top1 - 0.02], top0 + 0.06, top1 + 0.06, { top: 1, front: k === 0, back: k === P.length - 2, left: 1, right: 1 });
        if (physics && hFree >= 0.9) physics.addSeg(a[0], a[1], b[0], b[1], Math.min(lo0, lo1), Math.max(top0, top1) + 0.06, 'gw-wall');
      }
      nWallSeg++;
    }
  }
  const statics = [];
  // ---- hedges: clipped profile (flared base, rounded shoulders), lumpy, seated 15 cm into the soil, leaf-tone jitter
  const hedgeGeo = new Map();
  for (const hd of plan.hedges || []) {
    const { P, h } = hd; const mid = P[Math.floor(P.length / 2)]; const k = Math.floor(mid[0] / BK) + ',' + Math.floor(mid[1] / BK);
    let H = hedgeGeo.get(k); if (!H) hedgeGeo.set(k, (H = { p: [], c: [], cx: (Math.floor(mid[0] / BK) + 0.5) * BK, cz: (Math.floor(mid[1] / BK) + 0.5) * BK }));
    const prof = [[-0.40, -0.15], [-0.46, 0.22], [-0.45, 0.62], [-0.38, 0.9], [-0.2, 1.0], [0.2, 1.0], [0.38, 0.9], [0.45, 0.62], [0.46, 0.22], [0.40, -0.15]];
    const ring = (i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; const nx = -dz / l, nz = dx / l; const [x, z] = P[i];
      const g = Math.min(heightAt(x + nx * 0.45, z + nz * 0.45), heightAt(x - nx * 0.45, z - nz * 0.45));
      return prof.map(([d, t], j) => { const jit = Math.sin(x * 3.1 + z * 2.3 + j * 1.7) * 0.05 + Math.sin(x * 7.7 - z * 5.9 + j) * 0.03; const w = t < 0 ? d : d * (1 + jit); const y = t < 0 ? g + t : g + t * h * (1 + jit * 0.4); return [x + nx * w, y, z + nz * w, 0.5 + jit * 4]; }); };
    let prev = ring(0);
    const col = (v) => { const k2 = Math.max(0, Math.min(1, v)); return [0.17 + 0.05 * k2, 0.27 + 0.07 * k2, 0.12 + 0.03 * k2]; };
    const tri = (a, b, c) => { H.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); H.c.push(...col(a[3]), ...col(b[3]), ...col(c[3])); };
    const cap = (R, flip) => { for (let j = 1; j < R.length - 1; j++) flip ? tri(R[0], R[j + 1], R[j]) : tri(R[0], R[j], R[j + 1]); };
    cap(prev, true);
    for (let i = 1; i < P.length; i++) { const cur = ring(i); for (let j = 0; j < prof.length - 1; j++) { tri(prev[j], cur[j + 1], cur[j]); tri(prev[j], prev[j + 1], cur[j + 1]); } prev = cur; } // outward winding
    cap(prev, false);
  }
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x9fb48f, vertexColors: true, roughness: 1 }); hedgeMat.name = 'gw-hedge';
  hedgeMat.onBeforeCompile = (sh) => { sh.uniforms.uNoise = { value: noiseTexture() }; // leaf clumps (same recipe as the old streetscape hedges)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWH=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uNoise; varying vec3 vWH;').replace('#include <map_fragment>', '#include <map_fragment>\nfloat hn = texture(uNoise, vWH.xz*0.9+vWH.y*0.7).b*0.6 + texture(uNoise, vec2(vWH.x+vWH.z, vWH.y)*0.6).g*0.4; diffuseColor.rgb *= 0.55 + 0.75*hn;'); };
  hedgeMat.customProgramCacheKey = () => 'gw-hedge';
  for (const H of hedgeGeo.values()) {
    if (!H.p.length) continue; const y = heightAt(H.cx, H.cz); const pos = new Float32Array(H.p); for (let i = 0; i < pos.length; i += 3) { pos[i] -= H.cx; pos[i + 1] -= y; pos[i + 2] -= H.cz; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(H.c, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, hedgeMat); m.position.set(H.cx, y, H.cz); m.castShadow = true; m.receiveShadow = true; m.name = 'gw:hedge'; m.matrixAutoUpdate = false; m.updateMatrix(); group.add(m); statics.push(m);
  }
  const matFor = (key) => key === 'conc' ? stepMat.concrete : key === 'concd' ? (M.concreteDark || M.concrete) : key === 'gran' ? capMat : key === 'brick' ? stepMat.brick : M.iron; // walls/cheeks a shade darker than treads and copings
  for (const b of buckets.values()) {
    if (!b.geo.count) continue; const y = heightAt(b.cx, b.cz);
    const mesh = new THREE.Mesh(b.geo.geometry([b.cx, y, b.cz]), matFor(b.key)); mesh.position.set(b.cx, y, b.cz);
    mesh.castShadow = b.key !== 'rail'; mesh.receiveShadow = true; mesh.name = 'gw:' + b.key; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    if (b.key === 'rail') mesh.userData.detail = true;
    group.add(mesh); statics.push(mesh);
  }
  // ---- tree grates where trunks stand in paving (Sproul Plaza, Dwinelle Plaza, streets)
  let grates = null;
  if (trees) {
    const items = [];
    for (let i = 0; i < trees.n; i++) {
      if (treeSys && treeSys.hidden && treeSys.hidden.has(i)) continue;
      const x = trees.x[i] / 10, z = trees.z[i] / 10; if (!G.inside(x, z, 4)) continue;
      const dP = S.at(x, z, 1), dA = S.at(x, z, 0); if (!(dP > 0.75 || dA > 1.0)) continue;
      if (S.at(x, z, 2) > 0.2 || S.at(x, z, 3) > 0.3 || bmask.at(x, z)) continue;
      // street trees square up to the kerb; plaza trees to the world-aligned paving grid
      let rot = 0; if (dA > -2.5) { const gx = S.at(x + 0.8, z, 0) - S.at(x - 0.8, z, 0), gz = S.at(x, z + 0.8, 0) - S.at(x, z - 0.8, 0); if (Math.hypot(gx, gz) > 0.3) rot = Math.atan2(gx, gz); }
      const sz = Math.max(1.2, Math.min(1.6, 1.1 + (trees.h[i] / 100) * 0.02));
      const nrm = new THREE.Vector3(heightAt(x - 0.7, z) - heightAt(x + 0.7, z), 1.4, heightAt(x, z - 0.7) - heightAt(x, z + 0.7)).normalize(); // sit flush on sloping paving
      items.push([x, heightAt(x, z), z, rot, sz, nrm]);
    }
    if (items.length) grates = makeGrates(items, M); if (grates) group.add(grates);
  }
  // ---- kerbs + edging: traced per tile from the ground SDF, built on demand near the camera
  // kerb ramps: no kerb where a marked crossing meets the kerb line, i.e. within ~1.9 m (along the road) of the crossing
  // line; the gap radius is grown by the road's half width since crossing nodes sit on the centreline
  const roadHW = (x, z) => { let best = 4, bd = 15 * 15; for (const r of roadsNear(x, z)) { const P = r.pts; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); const d = (a[0] + t * dx - x) ** 2 + (a[1] + t * dz - z) ** 2; if (d < bd) { bd = d; best = (r.w || 8) / 2; } } } return best; };
  const rHash = new Map(); for (const r of (vectors && vectors.roads) || []) { if (r.tunnel) continue; const seen = new Set(); for (const [x, z] of r.pts) { const k = Math.floor(x / 64) + ',' + Math.floor(z / 64); if (seen.has(k)) continue; seen.add(k); let l = rHash.get(k); if (!l) rHash.set(k, (l = [])); l.push(r); } }
  function roadsNear(x, z) { const out = new Set(); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const r of rHash.get((Math.floor(x / 64) + i) + ',' + (Math.floor(z / 64) + j)) || []) out.add(r); return out; }
  const crossings = []; for (const [x, z, kind] of (pois && pois.p && pois.p.crossing) || []) if (kind !== 'no' && G.inside(x, z, 4)) { const hw = roadHW(x, z); crossings.push([x, z, Math.hypot(hw + 0.3, 1.9)]); }
  const xHash = new Map(); for (const [x, z] of crossings) { const k = Math.floor(x / 8) + ',' + Math.floor(z / 8); let l = xHash.get(k); if (!l) xHash.set(k, (l = [])); l.push([x, z]); }
  const nearCrossing = (x, z) => { const r = 9; const i0 = Math.floor((x - r) / 8), i1 = Math.floor((x + r) / 8), j0 = Math.floor((z - r) / 8), j1 = Math.floor((z + r) / 8); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const l = xHash.get(i + ',' + j); if (l) for (const p of l) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < p[2] * p[2]) return true; } return false; };
  const tiles = new Map(); let lastCP = null; const kerbStats = { tiles: 0, segs: 0 };
  const buildTile = (ti, tj) => {
    const x0 = ti * TILE, z0 = tj * TILE; const geo = new Geo();
    traceTile(S, G, bmask, x0, z0, nearCrossing, geo, kerbStats);
    let mesh = null;
    if (geo.count) { const cx = x0 + TILE / 2, cz = z0 + TILE / 2, cy = heightAt(cx, cz); mesh = new THREE.Mesh(geo.geometry([cx, cy, cz]), kerbMat); mesh.position.set(cx, cy, cz); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = 'gw:kerbs'; group.add(mesh); }
    tiles.set(ti + ',' + tj, { mesh, ti, tj }); kerbStats.tiles++;
  };
  const updateTiles = (cp, budget) => {
    const ti0 = Math.floor((cp.x - KERB_R) / TILE), ti1 = Math.floor((cp.x + KERB_R) / TILE), tj0 = Math.floor((cp.z - KERB_R) / TILE), tj1 = Math.floor((cp.z + KERB_R) / TILE);
    const want = [];
    for (let ti = ti0; ti <= ti1; ti++) for (let tj = tj0; tj <= tj1; tj++) {
      const cx = ti * TILE + TILE / 2, cz = tj * TILE + TILE / 2; const d = Math.hypot(cx - cp.x, cz - cp.z) - TILE * 0.71; if (d > KERB_R) continue;
      if (!G.inside(cx, cz, -TILE)) continue;
      if (!tiles.has(ti + ',' + tj)) want.push([d, ti, tj]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < want.length && k < budget; k++) buildTile(want[k][1], want[k][2]);
    for (const [key, t] of tiles) {
      const cx = t.ti * TILE + TILE / 2, cz = t.tj * TILE + TILE / 2; const d = Math.hypot(cx - cp.x, cz - cp.z) - TILE * 0.71;
      if (t.mesh) t.mesh.visible = d < KERB_R;
      if (d > KERB_R + 260) { if (t.mesh) { group.remove(t.mesh); t.mesh.geometry.dispose(); } tiles.delete(key); }
    }
  };
  // material holder so setupMaterials (CSM/contact AO) sees every material before lazily built tiles use it
  const holder = new THREE.Mesh(new THREE.BufferGeometry(), kerbMat); holder.visible = false; group.add(holder);
  console.log('groundworks build', JSON.stringify({ ms: Math.round(performance.now() - t0), treads: nTreads, wallSegs: nWallSeg, grates: grates ? grates.count : 0, meshes: statics.length }));
  return {
    group, stats: kerbStats,
    update(cp) {
      const jump = !lastCP || Math.hypot(cp.x - lastCP.x, cp.z - lastCP.z) > 120;
      if (!jump && lastCP && (cp.x - lastCP.x) ** 2 + (cp.z - lastCP.z) ** 2 < 4 && !this._pending) return;
      updateTiles(cp, jump ? 999 : 2); lastCP = { x: cp.x, z: cp.z };
      this._pending = false;
      if (grates) grates.userData.update(cp);
      for (const m of statics) { const d = Math.hypot(m.position.x - cp.x, m.position.z - cp.z) - 181; m.visible = d < (m.userData.detail ? 120 : 380); }
    },
  };
}

// marching squares on the asphalt (kerbs) and paved (edging) SDF channels inside one tile; kept segments are chained
// into polylines, simplified (5 cm) and re-split at <= 3 m, then swept with a kerb or edging profile. Shared vertices
// along a run mean no cracks between pieces and ~3x fewer triangles than one box per contour cell.
function traceTile(S, G, bmask, x0, z0, nearCrossing, geo, stats) {
  const st = S.s; const j0 = Math.max(0, Math.floor((x0 - S.x0) / st)), j1 = Math.min(S.nx - 2, Math.ceil((x0 + TILE - S.x0) / st) - 1);
  const i0 = Math.max(0, Math.floor((z0 - S.z0) / st)), i1 = Math.min(S.nz - 2, Math.ceil((z0 + TILE - S.z0) / st) - 1);
  for (const ch of [0, 1]) {
    const segs = []; const key = (p) => Math.round(p.x * 1000) + ',' + Math.round(p.z * 1000);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const v = [S.raw(i, j, ch), S.raw(i, j + 1, ch), S.raw(i + 1, j + 1, ch), S.raw(i + 1, j, ch)];
      const code = (v[0] > 0 ? 1 : 0) | (v[1] > 0 ? 2 : 0) | (v[2] > 0 ? 4 : 0) | (v[3] > 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const px = [S.x0 + j * st, S.x0 + (j + 1) * st, S.x0 + (j + 1) * st, S.x0 + j * st], pz = [S.z0 + i * st, S.z0 + i * st, S.z0 + (i + 1) * st, S.z0 + (i + 1) * st];
      const E = [];
      for (let e = 0; e < 4; e++) { let a = e, b = (e + 1) % 4; if ((v[a] > 0) === (v[b] > 0)) continue; if (a > b || (e === 3)) { const t = a; a = b; b = t; } // canonical edge direction -> identical floats in both cells
        const t = v[a] / (v[a] - v[b]); E.push({ x: px[a] + (px[b] - px[a]) * t, z: pz[a] + (pz[b] - pz[a]) * t }); }
      const pairs = E.length === 2 ? [[E[0], E[1]]] : E.length === 4 ? [[E[0], E[1]], [E[2], E[3]]] : [];
      for (const [p, q] of pairs) { const type = classify(ch, p, q, S, G, bmask, nearCrossing); if (type) segs.push({ p, q, kp: key(p), kq: key(q), type, used: false }); }
    }
    // chain segments of the same type that share endpoints
    const adj = new Map(); const add = (k, i) => { let l = adj.get(k); if (!l) adj.set(k, (l = [])); l.push(i); };
    segs.forEach((sg, i) => { add(sg.kp, i); add(sg.kq, i); });
    const next = (k, type) => { const l = adj.get(k); if (!l) return -1; for (const i of l) if (!segs[i].used && segs[i].type === type) return i; return -1; };
    const order = segs.map((sg, i) => i).sort((a, b) => (adj.get(segs[a].kp).length + adj.get(segs[a].kq).length) - (adj.get(segs[b].kp).length + adj.get(segs[b].kq).length));
    for (const i of order) {
      if (segs[i].used) continue; const sg = segs[i]; sg.used = true; const type = sg.type;
      const pts = [sg.p, sg.q]; let kEnd = sg.kq, kStart = sg.kp;
      for (let n; (n = next(kEnd, type)) >= 0;) { const s2 = segs[n]; s2.used = true; if (s2.kp === kEnd) { pts.push(s2.q); kEnd = s2.kq; } else { pts.push(s2.p); kEnd = s2.kp; } }
      for (let n; (n = next(kStart, type)) >= 0;) { const s2 = segs[n]; s2.used = true; if (s2.kp === kStart) { pts.unshift(s2.q); kStart = s2.kq; } else { pts.unshift(s2.p); kStart = s2.kp; } }
      const run = splitLong(simplify(pts, 0.05), 3.0);
      if (run.length >= 2) sweep(type, run, ch, S, G, geo, stats);
    }
  }
}
// kerb (asphalt boundary next to sidewalk/verge) | edge (paving next to soft ground) | null
function classify(ch, p, q, S, G, bmask, nearCrossing) {
  const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2; if (Math.hypot(q.x - p.x, q.z - p.z) < 0.02 || !G.inside(mx, mz, 3)) return null;
  const n = inward(S, ch, mx, mz); if (!n) return null;
  const ox = mx - n[0] * 0.6, oz = mz - n[1] * 0.6; // outside probe
  if (bmask.at(ox, oz) || bmask.at(mx, mz)) return null;
  if (ch === 0) {
    if (nearCrossing(mx, mz)) return null; // kerb ramps at crossings
    if (S.at(ox, oz, 0) > -0.2) return null; // asphalt both sides (lanes, lots)
    return 'kerb';
  }
  if (S.at(ox, oz, 0) > -0.3) return null; // asphalt outside: the kerb handles it
  if (S.at(ox, oz, 1) > -0.3) return null; // still paving outside (noisy contour)
  if (!CAMPUS(mx, mz) && S.at(ox, oz, 2) < -0.25) return null; // off campus only along lawns; on campus wherever paving meets soft ground
  return 'edge';
}
function inward(S, ch, x, z) { let gx = S.at(x + 0.4, z, ch) - S.at(x - 0.4, z, ch), gz = S.at(x, z + 0.4, ch) - S.at(x, z - 0.4, ch); const gl = Math.hypot(gx, gz); return gl < 1e-4 ? null : [gx / gl, gz / gl]; }
function simplify(P, tol) { // Douglas-Peucker on {x,z}
  if (P.length < 3) return P; const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1; const stack = [[0, P.length - 1]];
  while (stack.length) { const [a, b] = stack.pop(); const A = P[a], B = P[b]; const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1e-9; let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i].x - A.x) * dz - (P[i].z - A.z) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); } }
  return P.filter((_, i) => keep[i]);
}
function splitLong(P, maxL) { const out = [P[0]]; for (let i = 1; i < P.length; i++) { const A = P[i - 1], B = P[i]; const n = Math.ceil(Math.hypot(B.x - A.x, B.z - A.z) / maxL); for (let k = 1; k <= n; k++) out.push({ x: A.x + (B.x - A.x) * k / n, z: A.z + (B.z - A.z) * k / n }); } return out; }
// sweep a kerb / edging profile along a run; per-vertex inward normals from the SDF gradient keep offsets consistent
function sweep(type, run, ch, S, G, geo, stats) {
  const V = run.map((p, i) => {
    let n = inward(S, ch, p.x, p.z);
    if (!n) { const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)]; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; n = [-dz / l, dx / l]; }
    const [nx, nz] = n;
    if (type === 'kerb') {
      const yT = G.at(p.x - nx * 0.6, p.z - nz * 0.6) + 0.015, yR = G.at(p.x + nx * 0.7, p.z + nz * 0.7) - 0.06;
      return { F: [p.x, p.z], B: [p.x - nx * KERB_W, p.z - nz * KERB_W], yT, yR, nx, nz };
    }
    const yT = G.at(p.x + nx * 0.5, p.z + nz * 0.5) + 0.02; const yG = Math.min(G.at(p.x - nx * 0.5, p.z - nz * 0.5), yT - 0.04) - 0.05;
    return { F: [p.x, p.z], B: [p.x + nx * EDGE_W, p.z + nz * EDGE_W], yT, yR: yG, nx, nz };
  });
  for (let i = 0; i < V.length - 1; i++) {
    const a = V[i], b = V[i + 1]; const nx = (a.nx + b.nx) / 2, nz = (a.nz + b.nz) / 2;
    if (type === 'kerb') {
      orientQuad(geo, [a.B[0], a.yT, a.B[1]], [b.B[0], b.yT, b.B[1]], [b.F[0], b.yT, b.F[1]], [a.F[0], a.yT, a.F[1]], [0, 1, 0]); // top
      orientQuad(geo, [a.F[0], a.yT, a.F[1]], [b.F[0], b.yT, b.F[1]], [b.F[0], b.yR, b.F[1]], [a.F[0], a.yR, a.F[1]], [nx, 0.15, nz]); // road face
      orientQuad(geo, [a.B[0], a.yT - 0.09, a.B[1]], [b.B[0], b.yT - 0.09, b.B[1]], [b.B[0], b.yT, b.B[1]], [a.B[0], a.yT, a.B[1]], [-nx, 0, -nz]); // back
    } else {
      orientQuad(geo, [a.F[0], a.yT, a.F[1]], [b.F[0], b.yT, b.F[1]], [b.B[0], b.yT, b.B[1]], [a.B[0], a.yT, a.B[1]], [0, 1, 0]); // top
      orientQuad(geo, [a.F[0], a.yR, a.F[1]], [b.F[0], b.yR, b.F[1]], [b.F[0], b.yT, b.F[1]], [a.F[0], a.yT, a.F[1]], [-nx, 0.1, -nz]); // lawn face
      orientQuad(geo, [a.B[0], a.yT - 0.07, a.B[1]], [b.B[0], b.yT - 0.07, b.B[1]], [b.B[0], b.yT, b.B[1]], [a.B[0], a.yT, a.B[1]], [nx, 0, nz]); // paving side
    }
    stats.segs++;
  }
}
// emit a quad whose winding faces along `want` (flip if needed); uv: u along, v across/up
function orientQuad(geo, a, b, c, d, want) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(want[0], want[1], want[2]) || 1; const w = [want[0] / l, want[1] / l, want[2] / l];
  const L = Math.hypot(ux, uz) / TEX_M, H = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / TEX_M; const u0 = (a[0] + a[2]) / TEX_M;
  geo.quad(a, b, c, d, w, [[u0, 0], [u0 + L, 0], [u0 + L, H], [u0, H]]); // quad() flips the winding to face `want`
}
// instanced tree grates: cast-iron radial grate with a mulch centre inside a granite frame
function makeGrates(items, M) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  // weathered cast iron (sunlit mid grey-brown), dark slots showing soil, mulch ring around the trunk
  x.fillStyle = '#857e74'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#5e4a37'; x.beginPath(); x.arc(64, 64, 21, 0, 7); x.fill();
  x.strokeStyle = '#3b352f'; x.lineWidth = 1.6; for (let r = 30; r < 62; r += 7) { x.beginPath(); x.arc(64, 64, r, 0, 7); x.stroke(); }
  x.lineWidth = 2.0; for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; x.beginPath(); x.moveTo(64 + Math.cos(t) * 23, 64 + Math.sin(t) * 23); x.lineTo(64 + Math.cos(t) * 90, 64 + Math.sin(t) * 90); x.stroke(); }
  x.strokeStyle = '#948c80'; x.lineWidth = 5; x.strokeRect(2.5, 2.5, 123, 123);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const grateMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); g.translate(0, 0.008, 0);
  // frame: a 0.1 m granite band ~1 cm proud of the paving (top ring + outer faces, 16 triangles)
  const fg = new Geo(); const o = 0.6, i = 0.5, yt = 0.012, yb = -0.05; const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; const nrm = [(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2];
    fg.quad([a[0] * i, yt, a[1] * i], [b[0] * i, yt, b[1] * i], [b[0] * o, yt, b[1] * o], [a[0] * o, yt, a[1] * o], [0, 1, 0], [[a[0] * i, a[1] * i], [b[0] * i, b[1] * i], [b[0] * o, b[1] * o], [a[0] * o, a[1] * o]]);
    fg.quad([a[0] * o, yb, a[1] * o], [b[0] * o, yb, b[1] * o], [b[0] * o, yt, b[1] * o], [a[0] * o, yt, a[1] * o], nrm, [[0, 0], [0.6, 0], [0.6, 0.04], [0, 0.04]]); }
  const inst = new THREE.Group(); inst.name = 'gw:grates';
  const cap = Math.min(items.length, 900);
  const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; };
  const meshes = [mk(g, grateMat), mk(fg.geometry(), M.graniteDark)]; inst.add(...meshes);
  const mats = new Float32Array(items.length * 16); { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const qy = new THREE.Quaternion();
    items.forEach(([px, py, pz, r, s, nrm], k) => { q.setFromUnitVectors(up, nrm).multiply(qy.setFromAxisAngle(up, r)); m4.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(s, 1, s)); m4.toArray(mats, k * 16); }); }
  inst.count = items.length;
  // only grates within ~160 m are drawn (refilled as the camera moves)
  inst.userData.update = (cp) => { let k = 0; const R2 = 160 * 160;
    for (let n = 0; n < items.length && k < cap; n++) { const dx = items[n][0] - cp.x, dz = items[n][2] - cp.z; if (dx * dx + dz * dz > R2) continue; for (const m of meshes) m.instanceMatrix.array.set(mats.subarray(n * 16, n * 16 + 16), k * 16); k++; }
    for (const m of meshes) { m.count = k; m.instanceMatrix.needsUpdate = true; } };
  return inst;
}
