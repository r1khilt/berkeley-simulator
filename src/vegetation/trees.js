// Berkeley Simulator — procedural tree library for InstancedMesh placement.
//
//   const lib = createTreeLibrary({ season: 'late-autumn' });
//   lib.species.oak = { lods: [lod0, lod1, lod2], normHeight: 1, normRadius, crownBase, trunkRadius, typical, name }
//   lod = { parts: [{ geometry, material, depthMaterial, distanceMaterial, castShadow, receiveShadow, kind }], triangles }
//
// Every species is normalised to height 1 (trunk base at the origin, +y up) with foliage radius `normRadius`.
// Engine instance matrix: T(x, groundY, z) · Ry(random) · S(crownR / normRadius, height, crownR / normRadius).
// instanceColor = aerial-photo foliage tint (linear RGB ~0.2–0.5); leaves multiply it in relative to TREE_REF_TINT
// (bark ignores it). Set mesh.customDepthMaterial / customDistanceMaterial from the part (needed for alpha-tested,
// wind-swaying shadows). Advance U.uTime every frame (or call lib.update(dt), which does it if nobody else does).
import * as THREE from 'three';
import { U } from '../materials.js';
import { mulberry32 } from '../lib/noise.js';
import { leafTexture, barkTexture, LEAF_KINDS, leafCellUV, puffTexture, SPRIGS } from './tree-textures.js';
import { makeTreeUniforms, patchLeaf, patchBark, patchBlob, makeDepthMaterials, patchPuff, makePuffDepthMaterials, TREE_REF_TINT, TREE_WIND_DIR, TREE_VIEW } from './tree-shaders.js';
export { TREE_REF_TINT, TREE_WIND_DIR };
export const TREE_LOD_DISTANCES = [120, 600];
export const SEASONS = ['spring', 'summer', 'early-autumn', 'late-autumn', 'winter'];

const TAU = Math.PI * 2, GOLD = 2.399963;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V3(0, 1, 0);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function randUnit(rnd) { const z = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - z * z); return V3(r * Math.cos(a), z, r * Math.sin(a)); }
function anyPerp(v) { const a = Math.abs(v.y) < 0.9 ? Y : V3(1, 0, 0); return V3().crossVectors(v, a).normalize(); }

// ---------------------------------------------------------------- geometry accumulator
class Acc {
  // extra: attribute names (float) or [name, 3] (vec3; defaults to the vertex position)
  constructor(extra = []) { this.p = []; this.n = []; this.t = []; this.i = []; this.x = {}; this.xs = {}; for (const e of extra) { const [k, n] = Array.isArray(e) ? e : [e, 1]; this.x[k] = []; this.xs[k] = n; } }
  get count() { return this.p.length / 3; }
  get tris() { return this.i.length / 3; }
  v(p, n, u, v, ex) {
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.t.push(u, v);
    for (const k in this.x) { const val = ex?.[k]; if (this.xs[k] === 1) this.x[k].push(val ?? 1); else if (this.xs[k] === 4) this.x[k].push(...(val ?? [0, 0, 0, 0])); /* r4-trees: vec4 (aPuff) */ else { const q = val ?? p; this.x[k].push(q.x, q.y, q.z); } }
    return this.count - 1;
  }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  tri(a, b, c) { this.i.push(a, b, c); }
  // orient every triangle away from an interior point (keeps closed blobs watertight under back-face culling)
  fixWinding(inside) {
    const P = this.p, I = this.i;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      const ox = (P[a] + P[b] + P[c]) / 3 - inside.x, oz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3 - inside.z;
      const oy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3 - inside.y;
      // trunk faces (horizontal normals) are judged by their horizontal offset from the axis only
      const horiz = Math.abs(fy) < 0.2 * Math.hypot(fx, fz);
      if (fx * ox + (horiz ? 0 : fy * oy) + fz * oz < 0) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
    }
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    for (const k in this.x) g.setAttribute(k, new THREE.Float32BufferAttribute(this.x[k], this.xs[k]));
    g.setIndex(this.i);
    return g;
  }
}

// tapered tube along a polyline, parallel-transport frames, UVs in metres (1 m around x 2 m along per tile)
function tube(acc, pts, rads, seg, vOff = 0) { // UVs: u = metres around (1 m bark tile), v = metres along / 2
  const n = pts.length; if (n < 2) return;
  const T = [];
  for (let i = 0; i < n; i++) T.push(pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
  const N = [anyPerp(T[0])], B = [V3().crossVectors(T[0], N[0])];
  for (let i = 1; i < n; i++) {
    const ax = V3().crossVectors(T[i - 1], T[i]); const s = ax.length(); const Ni = N[i - 1].clone();
    if (s > 1e-6) Ni.applyAxisAngle(ax.divideScalar(s), Math.atan2(s, T[i - 1].dot(T[i])));
    N.push(Ni); B.push(V3().crossVectors(T[i], Ni));
  }
  const circ = TAU * rads[0], uRep = circ >= 1.5 ? Math.round(circ) : Math.max(0.25, circ); // whole repeats on big trunks
  const base = acc.count; let len = vOff;
  for (let i = 0; i < n; i++) {
    if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * TAU; const d = N[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(B[i], Math.sin(a));
      acc.v(pts[i].clone().addScaledVector(d, rads[i]), d, j / seg * uRep, len * 0.5, { aRad: rads[i] });
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = base + i * (seg + 1) + j, b = a + seg + 1; acc.quad(a, a + 1, b + 1, b); }
}
function ico(acc, c, r, sy = 1) { // knob / fist: icosahedron (20 tris)
  const g = new THREE.IcosahedronGeometry(1, 0); const p = g.attributes.position; const base = acc.count;
  for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); acc.v(V3(c.x + v.x * r, c.y + v.y * r * sy, c.z + v.z * r), v.clone().normalize(), v.x * 0.5, v.y * 0.5, { aRad: r }); }
  for (let i = 0; i < p.count; i += 3) acc.tri(base + i, base + i + 1, base + i + 2);
}

// alpha cards. The card's base edge sits at `base` (its pivot, where it attaches to a twig) and it extends along `up`.
const LEAF_ATTRS = ['aAO', 'aRnd', ['aPivot', 3], ['aCardN', 3]];
let CARD_MIN_Y = -Infinity; // cards are lifted so they never dip below this height (metres)
function cardAt(acc, base, up, side, w, h, cell, nrm, ao, rnd01, flip = false) {
  let [u0, v0, u1, v1] = leafCellUV(cell); if (flip) [u0, u1] = [u1, u0];
  const low = Math.min(base.y, base.y + up.y * h) - Math.abs(side.y) * w * 0.5;
  if (low < CARD_MIN_Y) base = base.clone().add(V3(0, CARD_MIN_Y - low, 0));
  const P = [base.clone().addScaledVector(side, -w / 2), base.clone().addScaledVector(side, w / 2)];
  P.push(P[1].clone().addScaledVector(up, h), P[0].clone().addScaledVector(up, h));
  const UV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]; const i0 = acc.count;
  const cn = V3().crossVectors(side, up).normalize();
  for (let k = 0; k < 4; k++) acc.v(P[k], nrm(P[k]), UV[k][0], UV[k][1], { aAO: ao(P[k]) * (k < 2 ? 0.85 : 1), aRnd: rnd01, aPivot: base, aCardN: cn });
  acc.quad(i0, i0 + 1, i0 + 2, i0 + 3);
}
// one half (left = 0 / right = 1) of a card hinged on its centre line (folded palm blades)
function halfCard(acc, base, up, dir, s, cell, half, nrm, rnd01) {
  const [cu0, cv0, cu1, cv1] = leafCellUV(cell), um = (cu0 + cu1) / 2, uo = half ? cu1 : cu0;
  const P = [base.clone(), base.clone().addScaledVector(dir, s * 0.5)];
  P.push(P[1].clone().addScaledVector(up, s), P[0].clone().addScaledVector(up, s));
  const UV = [[um, cv0], [uo, cv0], [uo, cv1], [um, cv1]]; const i0 = acc.count;
  const cn = V3().crossVectors(dir, up).normalize();
  for (let k = 0; k < 4; k++) acc.v(P[k], nrm(P[k]), UV[k][0], UV[k][1], { aAO: k === 0 || k === 3 ? 0.85 : 1, aRnd: rnd01, aPivot: base, aCardN: cn });
  acc.quad(i0, i0 + 1, i0 + 2, i0 + 3);
}
function cardSide(up, rnd, C, radial, nAt) { // orientation of a card around its up axis
  let side; const r = rnd();
  if (r < (C.flat ?? 0)) side = V3(-radial.z, 0, radial.x).addScaledVector(randUnit(rnd), 0.25);      // horizontal sprays
  else if (r < (C.flat ?? 0) + (C.face ?? 0.5)) side = V3().crossVectors(up, nAt);                     // face outward
  else side = V3().crossVectors(up, randUnit(rnd));
  side.addScaledVector(up, -side.dot(up)); if (side.lengthSq() < 1e-6) side = anyPerp(up);
  return side.normalize();
}

// ---------------------------------------------------------------- crown envelopes
const SHAPES = {
  superegg: (p, n) => (s) => { const q = s < p ? (p - s) / p : (s - p) / (1 - p); return Math.pow(Math.max(0, 1 - Math.pow(q, n)), 1 / n); },
  cone: (k, round) => (s) => Math.pow(Math.max(0, 1 - s), k) * Math.min(1, 0.45 + s * round),
  column: () => (s) => Math.pow(Math.max(0, 1 - Math.pow(s, 2.4)), 0.55) * Math.min(1, 0.6 + s * 5),
};
function makeEnvelope(C, rnd) {
  const f = SHAPES[C.shape[0]](...C.shape.slice(1));
  const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU, rnd() * TAU];
  const irr = C.irr ?? 0;
  const r = (y, th = 0) => {
    if (y < C.base || y > C.top) return 0;
    const s = (y - C.base) / (C.top - C.base);
    const m = 1 + irr * (0.5 * Math.sin(2 * th + ph[0] + s * 1.5) + 0.3 * Math.sin(3 * th + ph[1] + s * 3) + 0.25 * Math.sin(5 * th + ph[2] + s * 5) + 0.2 * Math.sin(s * 7 + ph[3]));
    return C.R * f(s) * Math.max(0.3, m);
  };
  const peak = C.shape[0] === 'superegg' ? C.shape[1] : C.shape[0] === 'cone' ? 0.25 : 0.4;
  return { r, base: C.base, top: C.top, R: C.R, cy: C.base + peak * (C.top - C.base), ry: Math.max(peak, 1 - peak) * (C.top - C.base), cone: C.shape[0] !== 'superegg' };
}
function normalFn(env, mode, clumpC, wl = 0.35) {
  return (p) => {
    let n;
    if (mode === 'cone') { n = V3(p.x, 0, p.z); const l = n.length(); if (l < 1e-5) n.set(0, 1, 0); else n.divideScalar(l).add(V3(0, env.R / (env.top - env.base) + 0.2, 0)).normalize(); }
    else n = V3(p.x / (env.R * env.R), (p.y - env.cy) / (env.ry * env.ry), p.z / (env.R * env.R)).normalize();
    if (clumpC) { const l = p.clone().sub(clumpC); if (l.lengthSq() > 1e-8) n.multiplyScalar(1 - wl).addScaledVector(l.normalize(), wl); }
    return n.addScaledVector(Y, 0.12).normalize();
  };
}
function aoFn(env, lift = 0) {
  const f = aoBase(env); return lift ? (p) => 1 - (1 - f(p)) * (1 - lift) : f;
}
function aoBase(env) {
  return (p) => {
    const th = Math.atan2(p.z, p.x); const re = Math.max(env.r(clamp(p.y, env.base + 1e-3, env.top - 1e-3), th), env.R * 0.12);
    const dr = Math.min(1.2, Math.hypot(p.x, p.z) / re);
    const s = clamp((p.y - env.base) / (env.top - env.base), 0, 1);
    return clamp((0.5 + 0.5 * smooth(0.05, 1.0, dr)) * (0.8 + 0.2 * s) + 0.25 * s * s * s, 0.5, 1);
  };
}

// ---------------------------------------------------------------- skeletons
function pointAlong(tr, f) { // fraction of polyline length
  const L = []; let tot = 0; for (let i = 1; i < tr.pts.length; i++) { const d = tr.pts[i].distanceTo(tr.pts[i - 1]); L.push(d); tot += d; }
  let acc = 0, target = f * tot;
  for (let i = 0; i < L.length; i++) { if (acc + L[i] >= target) { const t = (target - acc) / L[i]; return { p: tr.pts[i].clone().lerp(tr.pts[i + 1], t), r: lerp(tr.rads[i], tr.rads[i + 1], t) }; } acc += L[i]; }
  return { p: tr.pts[tr.pts.length - 1].clone(), r: tr.rads[tr.rads.length - 1] };
}
function bez(a, b, c, t) { const u = 1 - t; return V3(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z); }

function makeTrunks(d, rnd) {
  const T = d.trunk, nT = T.n ?? 1, out = [];
  for (let k = 0; k < nT; k++) {
    const az = k / nT * TAU + rnd() * 0.8, lean = (T.lean ?? 0.03) + (nT > 1 ? (T.spread ?? 0.12) : 0);
    const lx = Math.cos(az) * lean, lz = Math.sin(az) * lean;
    const bx = nT > 1 ? Math.cos(az) * T.r0 * 0.9 : 0, bz = nT > 1 ? Math.sin(az) * T.r0 * 0.9 : 0;
    const segs = T.segs ?? 7, wob = rnd() * TAU, pts = [], rads = [];
    const sink = -Math.min(0.3, 0.025 * d.typical.height);
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, y = sink + (T.h - sink) * t, yy = Math.max(0, y);
      const wig = (T.wiggle ?? 0.02) * T.h * Math.sin(t * 3 + wob) * t;
      let x = bx + lx * yy + wig * Math.cos(wob), z = bz + lz * yy + wig * Math.sin(wob);
      if (T.droopTop && t > 0.9) { const q = (t - 0.9) / 0.1; x += Math.cos(az) * T.droopTop * q * q; } // deodar leader
      pts.push(V3(x, y, z));
      const fl = 1 + (T.flare ?? 0.3) * Math.pow(Math.max(0, 1 - Math.max(y, 0) / (0.05 * T.h + 0.5)), 2);
      rads.push(lerp(T.r0, T.r1, Math.pow(t, T.taperPow ?? 1)) * fl);
    }
    out.push({ pts, rads });
  }
  return out;
}

function polyPoint(pts, t) { // point + tangent at fraction t of a polyline's vertex parameter
  const f = clamp(t, 0, 1) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i;
  return { p: pts[i].clone().lerp(pts[i + 1], u), dir: pts[i + 1].clone().sub(pts[i]).normalize(), i, u };
}
function genDecurrent(d, rnd) {
  const env = makeEnvelope(d.crown, rnd);
  const sk = { env, trunks: makeTrunks(d, rnd), limbs: [], twigs: [], clumps: [], knobs: [] };
  const L = d.limbs, nT = sk.trunks.length, S = d.cardM, B = d.branch2 ?? { n: 4, spread: 1.0, twigs: 3 };
  for (let i = 0; i < L.n; i++) {
    const tr = sk.trunks[i % nT];
    const s = pointAlong(tr, L.h0 + (L.h1 - L.h0) * ((i + rnd() * 0.7) / L.n));
    const th = i * GOLD + rnd() * 0.5;
    const yT = Math.max(s.p.y + (env.top - s.p.y) * lerp(L.up[0], L.up[1], rnd()), env.base + 0.12 * (env.top - env.base));
    const rT = env.r(clamp(yT, env.base + 0.01, env.top - 0.01), th) * lerp(L.reach[0], L.reach[1], rnd());
    const e = V3(Math.cos(th) * rT, yT, Math.sin(th) * rT);
    const dist = s.p.distanceTo(e); const mid = s.p.clone().lerp(e, 0.5); mid.y += (L.arch ?? 0) * dist;
    const pts = [], rads = [], n = 5, r0 = s.r * (L.r ?? 0.6), ph = rnd() * TAU, side = V3(-Math.sin(th), 0, Math.cos(th));
    for (let j = 0; j <= n; j++) {
      const t = j / n, p = bez(s.p, mid, e, t);
      // smooth, low-frequency sinuous wander (elbows) instead of random kinks
      if (j > 0) { const w = (L.wiggle ?? 0.2) * dist * 0.09 * Math.sin(t * Math.PI); p.addScaledVector(side, w * Math.sin(ph + t * 4.2)); p.y += w * 0.6 * Math.cos(ph * 1.3 + t * 3.1); }
      pts.push(p); rads.push(lerp(r0, r0 * 0.22, Math.pow(t, 0.8)));
    }
    sk.limbs.push({ pts, rads, th });
  }
  // secondary branches: targets spread evenly over the crown shell (area-weighted, incl. the top), each grown from
  // the nearest point of the closest primary limb; then short twigs along them carry the foliage
  const seconds = [], primaries = sk.limbs.slice(), nTargets = L.n * B.n, targets = [];
  for (let k = 0; k < 3; k++) { const a = rnd() * TAU, rr = env.R * 0.15 * rnd(); targets.push(V3(Math.cos(a) * rr, env.top - S * 0.7, Math.sin(a) * rr)); }
  let tries = 0;
  while (targets.length < nTargets && tries++ < nTargets * 200) {
    const y = env.base + (env.top - env.base) * (0.04 + 0.92 * rnd()), th = rnd() * TAU, re = env.r(y, th);
    if (re < 0.1 || rnd() > re / env.R) continue;
    const rr = Math.max(re * lerp(0.84, 0.97, rnd()) - S * 0.45, 0.15);
    targets.push(V3(Math.cos(th) * rr, Math.min(y, env.top - S * 0.6), Math.sin(th) * rr));
  }
  for (const e of targets) {
    let best = null, bd = 1e9;
    for (const limb of primaries) for (let j = 2; j < limb.pts.length; j++) { const dd = limb.pts[j].distanceToSquared(e); if (dd < bd) { bd = dd; best = { limb, j }; } }
    if (!best) continue;
    const t = clamp((best.j - 0.5 + rnd() * 0.6) / (best.limb.pts.length - 1), 0.25, 0.95);
    const s = polyPoint(best.limb.pts, t), r = lerp(best.limb.rads[s.i], best.limb.rads[s.i + 1], s.u);
    const mid = s.p.clone().lerp(e, 0.5); mid.y += 0.1 * s.p.distanceTo(e);
    const pts = [s.p.clone(), bez(s.p, mid, e, 0.5), e];
    const r0 = Math.min(r * 0.7, (d.clumps?.twigR ?? 0.05) * 2.4);
    const sec = { pts, rads: [r0, r0 * 0.45, r0 * 0.06], thin: true };
    sk.limbs.push(sec); seconds.push(sec);
  }
  for (const limb of primaries) for (const t of [0.6, 0.85]) {
    const q0 = polyPoint(limb.pts, t - 0.2), q1 = polyPoint(limb.pts, t);
    const out = V3(q1.p.x, 0, q1.p.z); if (out.lengthSq() < 1e-6) out.set(1, 0, 0); out.normalize();
    sk.clumps.push({ c: q1.p.clone(), a: q0.p.clone(), dir: q1.dir.clone(), mode: 'tip', r: S * 0.7, out });
  }
  for (const sec of seconds) {
    const nA = B.twigs + 1;
    for (let k = 0; k < nA; k++) {
      const t0 = 0.15 + 0.85 * k / nA, t1 = Math.min(1, 0.15 + 0.85 * (k + 1) / nA); // foliage along most of the branch
      const q0 = polyPoint(sec.pts, t0), q1 = polyPoint(sec.pts, t1);
      const out = V3(q1.p.x, 0, q1.p.z); if (out.lengthSq() < 1e-6) out.set(1, 0, 0); out.normalize();
      sk.clumps.push({ c: q1.p.clone(), a: q0.p.clone(), dir: q1.dir.clone(), mode: 'tip', r: S * (k === nA - 1 ? 1 : 0.85), out });
    }
  }
  return sk;
}

function placeClumps(d, sk, rnd) {
  const env = sk.env, C = d.clumps, attach = [], S = d.cardM;
  for (const l of sk.limbs) for (let j = 2; j < l.pts.length; j++) attach.push({ p: l.pts[j], r: l.rads[j] });
  for (const t of sk.trunks) { const n = t.pts.length; for (let j = Math.floor(n * 0.6); j < n; j++) if (t.pts[j].y > env.base) attach.push({ p: t.pts[j], r: t.rads[j] }); }
  const twR = C.twigR ?? 0.05;
  const add = (c, cr) => {
    let best = null, bd = 1e9;
    for (const a of attach) { const dd = a.p.distanceToSquared(c); if (dd < bd) { bd = dd; best = a; } }
    const out = V3(c.x, 0, c.z); if (out.lengthSq() < 1e-6) out.set(1, 0, 0); out.normalize();
    let dir = out.clone().addScaledVector(Y, 0.5).normalize();
    if (best && bd > 0.01) {
      const a = best.p; dir = c.clone().sub(a).normalize();
      sk.twigs.push({ pts: [a.clone(), c.clone()], rads: [Math.min(best.r * 0.6, twR * 1.6), twR * 0.45] });
    }
    sk.clumps.push({ c, r: cr, out, dir, mode: 'tip' });
  };
  // apex clump defines the top of the silhouette
  const ar = lerp(C.r[0], C.r[1], 0.5);
  add(V3((rnd() - 0.5) * ar, env.top - S * 0.9, (rnd() - 0.5) * ar), ar);
  let tries = 0;
  while (sk.clumps.length < C.n && tries++ < C.n * 80) {
    const y = env.base + (env.top - env.base) * rnd(), th = rnd() * TAU, re = env.r(y, th);
    if (re < 0.05 || rnd() > re / env.R) continue;
    const cr = lerp(C.r[0], C.r[1], rnd());
    const rr = Math.max(0, re * lerp(C.shell[0], C.shell[1], Math.sqrt(rnd())) - S * 0.45);
    add(V3(Math.cos(th) * rr, Math.min(y, env.top - S * 0.8), Math.sin(th) * rr), cr);
  }
}

function genConifer(d, rnd) {
  const env = makeEnvelope(d.crown, rnd);
  const sk = { env, trunks: makeTrunks(d, rnd), limbs: [], twigs: [], clumps: [], knobs: [] };
  const W = d.whorls, tr = sk.trunks[0];
  let y = env.base + W.spacing * 0.5, k = 0;
  while (y < env.top - W.spacing * 0.4) {
    const s = (y - env.base) / (env.top - env.base);
    const nb = W.n + (rnd() < 0.3 ? 1 : 0) - (rnd() < 0.3 ? 1 : 0);
    const off = k * GOLD;
    const sp = pointAlong(tr, clamp((y - tr.pts[0].y) / (tr.pts[tr.pts.length - 1].y - tr.pts[0].y), 0, 1));
    for (let b = 0; b < nb; b++) {
      const th = off + b / nb * TAU + (rnd() - 0.5) * 0.6;
      const len = env.r(y, th) * lerp(W.lenK[0], W.lenK[1], rnd());
      if (len < 0.15) continue;
      const el = lerp(W.elev[0], W.elev[1], s) + (rnd() - 0.5) * 0.15;
      const dir = V3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el));
      const a = sp.p.clone(), e = a.clone().addScaledVector(dir, len); e.y = Math.max(e.y - W.droop * len, 0.3 + 0.02 * d.typical.height);
      const m = a.clone().addScaledVector(dir, len * 0.55); m.y -= W.droop * len * 0.2;
      const r0 = Math.min(sp.r * 0.5, W.r * Math.pow(len, 0.6));
      if (W.branches !== false) sk.limbs.push({ pts: [a, m, e], rads: [r0, r0 * 0.5, r0 * 0.05], thin: s > 0.55 });
      const nc = len > 2.5 ? 3 : len > 1.2 ? 2 : 1;
      for (let c = 0; c < nc; c++) {
        const t = nc === 1 ? 0.85 : lerp(0.45, 1.0, c / (nc - 1));
        const pc = bez(a, m, e, t), p0 = bez(a, m, e, Math.max(0.15, t - 0.25)), p1 = bez(a, m, e, Math.min(1, t + 0.12));
        const out = V3(Math.cos(th), 0, Math.sin(th)), dir = p1.clone().sub(p0).normalize();
        sk.clumps.push({ c: pc, r: clamp(len * W.clumpK, W.clumpR[0], W.clumpR[1]), out, dir, p0, p1, mode: W.branches === false ? 'core' : 'branch' });
      }
    }
    y += W.spacing * (0.8 + rnd() * 0.4); k++;
  }
  // leader tuft
  const top = tr.pts[tr.pts.length - 1];
  sk.clumps.push({ c: top.clone().add(V3(0, -d.cardM * 0.6, 0)), r: W.clumpR[0], out: V3(1, 0, 0), dir: Y.clone(), mode: 'core' });
  return sk;
}

function genPollard(d, rnd) {
  const P = d.pollard;
  const env = makeEnvelope(d.crown, rnd);
  const sk = { env, trunks: makeTrunks(d, rnd), limbs: [], twigs: [], clumps: [], knobs: [] };
  const tr = sk.trunks[0];
  for (let i = 0; i < P.limbs; i++) {
    const s = pointAlong(tr, lerp(0.86, 1.0, rnd()));
    const th = i / P.limbs * TAU + (rnd() - 0.5) * 0.7;
    const R = lerp(P.reach[0], P.reach[1], rnd()), H = lerp(P.height[0], P.height[1], rnd());
    const e = V3(Math.cos(th) * R, H, Math.sin(th) * R);
    const m = s.p.clone().lerp(e, 0.5); m.y -= 0.12 * R; // limbs go out, then up into the fist
    const pts = [], rads = [];
    for (let j = 0; j <= 4; j++) { const t = j / 4, p = bez(s.p, m, e, t); if (j && j < 4) p.addScaledVector(randUnit(rnd), 0.06); pts.push(p); rads.push(lerp(P.limbR, P.limbR * 0.7, t)); }
    sk.limbs.push({ pts, rads });
    sk.knobs.push({ c: e.clone().add(V3(0, P.knobR * 0.4, 0)), r: P.knobR * lerp(0.85, 1.2, rnd()) });
    // a secondary knob part-way along some limbs (old pruning cuts)
    if (rnd() < 0.5) sk.knobs.push({ c: pts[2].clone(), r: P.limbR * 1.25 });
    const nw = Math.max(4, P.whips - 6 + Math.floor(rnd() * 9)); // some fists were cut back harder than others
    for (let w = 0; w < nw; w++) {
      const a = e.clone().add(V3(0, P.knobR * 0.6, 0)).addScaledVector(randUnit(rnd), P.knobR * 0.5);
      const dir = V3(Math.cos(th) * 0.35, 1, Math.sin(th) * 0.35).addScaledVector(randUnit(rnd), 0.45).normalize();
      const len = lerp(P.whipLen[0], P.whipLen[1], rnd());
      const b = a.clone().addScaledVector(dir, len);
      sk.twigs.push({ pts: [a, a.clone().lerp(b, 0.5).add(V3(0, 0.03, 0)).addScaledVector(randUnit(rnd), len * 0.06), b], rads: [P.whipR, P.whipR * 0.6, 0.002] }); // slight bow
      sk.clumps.push({ c: b.clone(), a: a.clone().lerp(b, 0.45), r: P.clumpR, out: V3(Math.cos(th), 0, Math.sin(th)), dir, mode: 'tip' });
    }
  }
  return sk;
}

// ---------------------------------------------------------------- LOD builders
function capTube(pts, rads) { // r4-trees2: close an open tube end with a short rounded tip
  const n = pts.length, r = rads[n - 1]; if (n < 2 || r < 0.015) return [pts, rads];
  const dir = pts[n - 1].clone().sub(pts[n - 2]).normalize();
  return [[...pts, pts[n - 1].clone().addScaledVector(dir, r * 0.7), pts[n - 1].clone().addScaledVector(dir, r * 1.1)], [...rads, r * 0.6, r * 0.04]];
}
function buildBark(sk, d, lod) {
  const acc = new Acc(['aRad']);
  const tSeg = lod === 0 ? (d.trunk.seg ?? 8) : 6;
  for (const t of sk.trunks) {
    if (lod === 0) tube(acc, t.pts, t.rads, tSeg);
    else { const n = t.pts.length, idx = [0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1]; tube(acc, idx.map((i) => t.pts[i]), idx.map((i) => t.rads[i]), tSeg); }
  }
  const limbs = lod === 0 ? sk.limbs : sk.limbs.filter((l) => !l.thin).slice(0, d.lod1Limbs ?? 7);
  // (lod0 draws secondaries with 3 sides)
  for (const l of limbs) { // r4-trees2: limb ends closed with a short rounded tip (no blunt cut-off stubs poking out of crowns)
    if (lod === 0) tube(acc, ...capTube(l.pts, l.rads), l.thin ? 3 : (d.limbSeg ?? 5));
    else { const n = l.pts.length, idx = [0, Math.floor(n / 2), n - 1]; tube(acc, ...capTube(idx.map((i) => l.pts[i]), idx.map((i) => l.rads[i])), 5); }
  }
  if (lod === 0) for (const t of sk.twigs) tube(acc, t.pts.length > 2 && d.arche !== 'pollard' ? [t.pts[0], t.pts[t.pts.length - 1]] : t.pts, t.pts.length > 2 && d.arche !== 'pollard' ? [t.rads[0], t.rads[t.rads.length - 1]] : t.rads, 3);
  else if (d.arche === 'pollard') sk.twigs.forEach((t, i) => { if (i % 3 === 0) tube(acc, [t.pts[0], t.pts[t.pts.length - 1]], [t.rads[0] * 1.5, t.rads[t.rads.length - 1] * 1.5], 3); }); // keep the whip silhouette
  for (const k of sk.knobs) { ico(acc, k.c, k.r, 0.85); if (d.arche === 'pollard' && k.r > 0.2) ico(acc, k.c.clone().add(V3(k.r * 0.45, k.r * 0.3, -k.r * 0.3)), k.r * 0.7, 0.9); } // lumpy pollard fists
  return acc;
}

function buildLeaves0(sk, d, rnd, density) {
  const acc = new Acc(LEAF_ATTRS); const env = sk.env, C = d.cards, S = d.cardM;
  if (density <= 0.001 || !sk.clumps.length) return acc;
  const ao = aoFn(env, d.aoLift ?? 0);
  const totalW = sk.clumps.reduce((s, c) => s + c.r * c.r, 0);
  const nCards = Math.round(C.n * density);
  let made = 0;
  for (const cl of sk.clumps) {
    const k = Math.min(Math.round(nCards * cl.r * cl.r / totalW), nCards - made); made += k;
    const fc = cl.c.clone().addScaledVector(cl.dir, S * 0.4);
    const nrm = normalFn(env, d.normal, fc, d.clumpNormalW ?? 0.2);
    const radial = V3(cl.c.x, 0, cl.c.z); if (radial.lengthSq() < 1e-6) radial.copy(cl.out); radial.normalize();
    for (let i = 0; i < k; i++) {
      let base, up;
      if (cl.mode === 'branch') { // conifer: flat sprays leaving the branch on both sides
        base = cl.p0.clone().lerp(cl.p1, rnd());
        const lat = V3().crossVectors(cl.dir, Y); if (lat.lengthSq() < 1e-6) lat.copy(anyPerp(cl.dir)); lat.normalize();
        const phi = 0.3 + rnd() * 0.9, sg = rnd() < 0.5 ? -1 : 1;
        up = cl.dir.clone().multiplyScalar(Math.cos(phi)).addScaledVector(lat, sg * Math.sin(phi)).addScaledVector(Y, C.vbias ?? 0).addScaledVector(randUnit(rnd), C.jit ?? 0.3).normalize();
      } else if (cl.mode === 'core') { // dense column (cypress) / leader tuft: upright sprays filling the volume
        base = cl.c.clone().addScaledVector(randUnit(rnd), cl.r * 0.7);
        const rb = V3(base.x, 0, base.z); if (rb.lengthSq() < 1e-6) rb.copy(radial); rb.normalize();
        up = rb.multiplyScalar(C.out ?? 0.45).addScaledVector(Y, C.vbias ?? 1).addScaledVector(randUnit(rnd), C.jit ?? 0.35).normalize();
      } else { // broadleaf / pollard: leafy shoots along the outer part of the host branch and at its tip
        base = cl.a ? cl.a.clone().lerp(cl.c, 0.25 + 0.75 * Math.sqrt(rnd())) : cl.c.clone().addScaledVector(cl.dir, -S * 0.3 * rnd());
        base.addScaledVector(randUnit(rnd), S * 0.05);
        if (rnd() < (C.tangent ?? 0.65)) { // lie along the crown surface, facing out: reads as a continuous leafy shell
          const nS = nrm(base); const tv = cl.dir.clone().addScaledVector(randUnit(rnd), 0.9).addScaledVector(Y, 0.2);
          tv.addScaledVector(nS, -tv.dot(nS)); if (tv.lengthSq() < 1e-6) tv.copy(anyPerp(nS));
          up = tv.normalize().addScaledVector(nS, 0.25).normalize();
          const sz = S * (0.85 + 0.3 * rnd()), sd = V3().crossVectors(up, nS).normalize();
          cardAt(acc, base, up, sd, sz, sz, rnd() < 0.5 ? 0 : 1, nrm, ao, rnd(), rnd() < 0.5);
          continue;
        }
        up = cl.dir.clone().multiplyScalar(0.6).addScaledVector(radial, (C.out ?? 1) * 0.55).addScaledVector(Y, C.vbias ?? 0.3).addScaledVector(randUnit(rnd), (C.jit ?? 0.5) + 0.3).normalize();
      }
      const sz = S * (0.85 + 0.3 * rnd());
      const side = cardSide(up, rnd, C, radial, nrm(base.clone().addScaledVector(up, sz * 0.5)));
      cardAt(acc, base, up, side, sz, sz, rnd() < 0.5 ? 0 : 1, nrm, ao, rnd(), rnd() < 0.5);
    }
  }
  return acc;
}

function lathe(acc, env, scale, seg, rows, uvFn, extraFn, jitter, rnd) {
  // closed surface of revolution following the envelope (rows = number of rings)
  const ys = []; for (let i = 1; i <= rows; i++) ys.push(lerp(env.base, env.top, i / (rows + 1)));
  const bot = acc.count;
  const pB = V3(0, env.base + (env.top - env.base) * 0.02, 0), pT = V3(0, env.top, 0);
  const nrm = normalFn(env, env.cone ? 'cone' : 'ellipsoid', null);
  const push = (p) => { const n = nrm(p).clone(); return acc.v(p, n, ...uvFn(p), { aCardN: n, ...extraFn(p) }); };
  push(pB);
  const ringStart = acc.count;
  for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
    const th = (j + (i % 2) * 0.5) / seg * TAU;
    const r = env.r(ys[i], th) * scale * (1 + (rnd() - 0.5) * jitter);
    push(V3(Math.cos(th) * r, ys[i], Math.sin(th) * r));
  }
  const top = acc.count; push(pT);
  const tri = (a, b, c) => acc.tri(a, c, b); // outward-facing winding
  for (let j = 0; j < seg; j++) tri(bot, ringStart + (j + 1) % seg, ringStart + j);
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < seg; j++) {
    const a = ringStart + i * seg + j, b = ringStart + i * seg + (j + 1) % seg, c = ringStart + (i + 1) * seg + j, e = ringStart + (i + 1) * seg + (j + 1) % seg;
    if (i % 2 === 0) { tri(a, b, e); tri(a, e, c); } else { tri(a, b, c); tri(b, e, c); }
  }
  const last = ringStart + (rows - 1) * seg;
  for (let j = 0; j < seg; j++) tri(top, last + j, last + (j + 1) % seg);
}

function buildLeaves1(sk, d, rnd, density, budget) {
  const acc = new Acc(LEAF_ATTRS); const env = sk.env;
  if (density <= 0.001 || !sk.clumps.length) return acc;
  const ao = aoFn(env, d.aoLift ?? 0);
  if (d.lod1Core && density > 0.6) { // inner volume so the far crown doesn't look hollow (cell 0 at a coarse scale)
    const uvFn = (p) => [0.02 + 0.23 * (1 + Math.cos(Math.atan2(p.z, p.x))), 0.02 + 0.96 * clamp((p.y - env.base) / (env.top - env.base), 0, 1)];
    lathe(acc, env, 0.72, 6, 3, uvFn, (p) => ({ aAO: Math.min(1, ao(p) * 1.1 + 0.1) * (d.lod1AO ?? 1), aRnd: 0.5 }), 0.15, rnd);
  }
  const maxCards = Math.floor((budget - acc.tris) / 2);
  const order = sk.clumps.map((c, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const keep = Math.min(order.length, Math.ceil(order.length * Math.min(1, density * 1.3)));
  const perClump = clamp(Math.floor(maxCards / Math.max(1, keep)), 1, 3);
  let n = 0;
  for (let oi = 0; oi < keep && n + perClump <= maxCards; oi++) {
    const cl = sk.clumps[order[oi]];
    const fc = cl.mode === 'tip' ? cl.c.clone().addScaledVector(cl.dir, d.cardM * 0.4) : cl.c.clone();
    const nrm = normalFn(env, d.normal, fc, 0.3);
    for (let k = 0; k < perClump; k++) {
      const radial = V3(fc.x, 0, fc.z); if (radial.lengthSq() < 1e-6) radial.copy(cl.out); radial.normalize();
      const up = radial.clone().multiplyScalar(d.cards.out ?? 1).addScaledVector(Y, (d.cards.vbias ?? 0.3) + 0.3).addScaledVector(randUnit(rnd), 0.3).normalize();
      let side = k === 0 ? V3().crossVectors(up, nrm(fc)) : V3().crossVectors(up, randUnit(rnd));
      side.addScaledVector(up, -side.dot(up)); if (side.lengthSq() < 1e-6) side = anyPerp(up); side.normalize();
      const s = Math.max(cl.r * 2.3, d.cardM * 1.6) * (d.lod1CardK ?? (d.lod1Core && density > 0.6 ? 1.12 : 1.5));
      cardAt(acc, fc.clone().addScaledVector(up, -s * 0.45).addScaledVector(radial, cl.r * 0.2), up, side, s, s, rnd() < 0.5 ? 0 : 1, nrm, (p) => Math.min(1, ao(p) + 0.12) * (d.lod1AO ?? 1), rnd(), rnd() < 0.5);
      n++;
    }
  }
  return acc;
}

function buildBlob(sk, d, rnd, density) {
  const acc = new Acc(['aAO', 'aLeaf']); const env = sk.env;
  // trunk: 4-sided prism up into the crown
  const t = sk.trunks[0], top = d.arche === 'palm' ? t.pts[t.pts.length - 1].y : Math.min(t.pts[t.pts.length - 1].y, lerp(env.base, env.top, 0.35));
  const r0 = t.rads[1] * 0.95, r1 = d.arche === 'palm' ? t.rads[t.rads.length - 1] : r0 * 0.6, y0 = t.pts[0].y;
  const tb = acc.count;
  for (let j = 0; j < 4; j++) {
    const a = j / 4 * TAU + 0.4, n = V3(Math.cos(a), 0, Math.sin(a));
    acc.v(V3(n.x * r0, y0, n.z * r0), n, 0, 0, { aAO: 0.9, aLeaf: 0 });
    acc.v(V3(n.x * r1 + t.pts[t.pts.length - 1].x * 0.5, top, n.z * r1 + t.pts[t.pts.length - 1].z * 0.5), n, 0, 1, { aAO: 1, aLeaf: 0 });
  }
  for (let j = 0; j < 4; j++) { const a = tb + j * 2, b = tb + ((j + 1) % 4) * 2; acc.quad(a, a + 1, b + 1, b); }
  const ao = aoFn(env);
  const leafy = Math.sqrt(clamp(density * 1.6, 0, 1));
  const seg = d.arche === 'palm' ? 6 : 7, rows = d.arche === 'palm' ? 2 : 4;
  const n0 = acc.count;
  lathe(acc, env, 1, seg, rows, () => [0, 0], (p) => ({ aAO: 0.7 + 0.3 * ao(p), aLeaf: leafy }), 0.18, rnd);
  acc.fixWinding(V3(0, env.cy, 0));
  // soften the blob's shading toward the sky so it reads like a leafy volume, not a smooth ball
  for (let i = n0 * 3; i < acc.n.length; i += 3) { const v = V3(acc.n[i], acc.n[i + 1] + 0.45, acc.n[i + 2]).normalize(); acc.n[i] = v.x; acc.n[i + 1] = v.y; acc.n[i + 2] = v.z; }
  return acc;
}

// palm: trunk + boot + fan fronds (+ dead skirt), built directly per LOD
function buildPalm(d, rnd) {
  const P = d.palm;
  const env = makeEnvelope(d.crown, rnd);
  const trunks = makeTrunks(d, rnd);
  const tr = trunks[0]; const crownC = tr.pts[tr.pts.length - 1].clone();
  const sk = { env, trunks, limbs: [], twigs: [], clumps: [{ c: crownC.clone(), r: 1.5, out: V3(1, 0, 0), dir: Y.clone(), mode: 'core' }], knobs: [] };
  const fronds = [];
  for (let i = 0; i < P.fronds; i++) {
    const th = i * GOLD + rnd() * 0.3, f = i / P.fronds;
    const el = lerp(1.15, -0.55, Math.pow(f, 0.8)) + (rnd() - 0.5) * 0.2; // upper fronds upright, lower drooping
    const dir = V3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el));
    fronds.push({ th, dir, dead: false });
  }
  for (let i = 0; i < P.dead; i++) { const th = i / P.dead * TAU + rnd() * 0.4; fronds.push({ th, dir: V3(Math.cos(th) * 0.28, -1, Math.sin(th) * 0.28).normalize(), dead: true }); }
  sk.fronds = fronds; sk.crownC = crownC;
  return sk;
}
function palmLeaves(sk, d, rnd, lod) {
  const acc = new Acc(LEAF_ATTRS); const P = d.palm, c0 = sk.crownC;
  const list = lod === 0 ? sk.fronds : sk.fronds.filter((f, i) => !f.dead && i % 2 === 0);
  for (const f of list) {
    const pet = f.dead ? 0.3 : P.petiole;
    const base = c0.clone().addScaledVector(f.dir, pet).add(V3(0, f.dead ? -0.6 : 0, 0));
    const up = f.dir.clone();
    const tang = V3(-Math.sin(f.th), 0, Math.cos(f.th));
    const side = tang.addScaledVector(up, -tang.dot(up)).normalize();
    const s = (f.dead ? P.blade * 0.85 : P.blade) * (lod === 0 ? 1 : 1.25) * (0.9 + rnd() * 0.2);
    const n0 = V3().crossVectors(side, up).normalize(); if (n0.y < 0) n0.negate();
    const nrm = (p) => n0.clone().multiplyScalar(0.55).add(p.clone().sub(c0).normalize().multiplyScalar(0.45)).normalize();
    const cell = f.dead ? 1 : 0, rr = rnd();
    if (lod === 0 && !f.dead) {
      // costapalmate fold: the blade is two halves meeting at a shallow V along the midrib
      const fold = 0.35, n1 = side.clone().applyAxisAngle(up, fold), n2 = side.clone().applyAxisAngle(up, -fold);
      halfCard(acc, base, up, n1.negate(), s, cell, 0, nrm, rr);
      halfCard(acc, base, up, n2, s, cell, 1, nrm, rr);
    } else cardAt(acc, base, up, side, s, s, cell, nrm, () => (f.dead ? 0.6 : 0.95), rr, rnd() < 0.5);
  }
  return acc;
}
function palmBark(sk, d, lod) {
  const acc = new Acc(['aRad']); const tr = sk.trunks[0];
  if (lod === 0) tube(acc, tr.pts, tr.rads, 8);
  else { const n = tr.pts.length, idx = [0, Math.floor(n / 2), n - 1]; tube(acc, idx.map((i) => tr.pts[i]), idx.map((i) => tr.rads[i]), 5); }
  const c = sk.crownC, r = tr.rads[tr.rads.length - 1];
  // boot of old leaf bases, widening into the crown
  tube(acc, [c.clone().add(V3(0, -1.6, 0)), c.clone().add(V3(0, -0.5, 0)), c.clone().add(V3(0, 0.4, 0))], [r * 1.05, r * 1.5, r * 0.8], lod === 0 ? 8 : 5);
  if (lod === 0) for (const f of sk.fronds) {
    if (f.dead) continue;
    const a = c.clone().addScaledVector(f.dir, 0.15), b = c.clone().addScaledVector(f.dir, d.palm.petiole);
    tube(acc, [a, b], [0.05, 0.03], 3);
  }
  return acc;
}

// ---------------------------------------------------------------- r4-trees: volumetric puff crowns
// Mid/far crowns (and the dense core of near crowns) are camera-facing leaf puffs (tree-shaders.js patchPuff): one
// quad per puff, never seen edge-on, shaded as a sphere. They are fitted to the same skeleton clumps and envelope as
// the near cards, so every LOD shares one silhouette.
const PUFF_ATTRS = ['aAO', 'aRnd', ['aPuff', 4]];
function puffQuad(acc, c, r, n, ao, rnd01, cell, rot) {
  const [u0, v0, u1, v1] = leafCellUV(cell); const i0 = acc.count;
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) acc.v(c, n, u0 + (x * 0.5 + 0.5) * (u1 - u0), v0 + (y * 0.5 + 0.5) * (v1 - v0), { aAO: ao, aRnd: rnd01, aPuff: [x, y, r, rot] });
  acc.quad(i0, i0 + 1, i0 + 2, i0 + 3);
}
function kmeans(pts, k, iters = 6) { // weighted, deterministic (farthest-point seeding)
  if (pts.length <= k) return pts.map((p) => ({ c: p.c.clone(), w: p.w, n: 1, ext: Math.sqrt(p.w) }));
  const C = [pts.reduce((a, b) => (b.w > a.w ? b : a)).c.clone()];
  const dmin = pts.map((p) => p.c.distanceToSquared(C[0]));
  while (C.length < k) { let bi = 0; for (let i = 1; i < pts.length; i++) if (dmin[i] * pts[i].w > dmin[bi] * pts[bi].w) bi = i; C.push(pts[bi].c.clone()); for (let i = 0; i < pts.length; i++) dmin[i] = Math.min(dmin[i], pts[i].c.distanceToSquared(C[C.length - 1])); }
  const asg = new Int32Array(pts.length);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < pts.length; i++) { let b = 0, bd = 1e18; for (let j = 0; j < C.length; j++) { const dd = pts[i].c.distanceToSquared(C[j]); if (dd < bd) { bd = dd; b = j; } } asg[i] = b; }
    const S = C.map(() => [V3(), 0]);
    for (let i = 0; i < pts.length; i++) { const q = S[asg[i]]; q[0].addScaledVector(pts[i].c, pts[i].w); q[1] += pts[i].w; }
    S.forEach((q, j) => { if (q[1] > 0) C[j].copy(q[0].divideScalar(q[1])); });
  }
  const out = C.map((c) => ({ c, w: 0, n: 0, ext: 0 }));
  for (let i = 0; i < pts.length; i++) { const o = out[asg[i]]; o.w += pts[i].w; o.n++; o.ext = Math.max(o.ext, pts[i].c.distanceTo(o.c) + Math.sqrt(pts[i].w)); }
  return out.filter((o) => o.n > 0);
}
function buildPuffs(sk, d, rnd, density, N, o = {}) {
  const acc = new Acc(PUFF_ATTRS); const env = sk.env, S = d.cardM, P = d.puff || {};
  if (!sk.clumps.length || (N <= 0 && !P.fists)) return acc;
  const pts = sk.clumps.map((cl) => ({ c: cl.mode === 'tip' && cl.dir ? cl.c.clone().addScaledVector(cl.dir, S * 0.3) : cl.c.clone(), w: cl.r * cl.r }));
  const n = N > 0 ? Math.max(3, Math.round(N * clamp(0.3 + density * 0.85, 0.3, 1))) : 0;
  const cent = n ? kmeans(pts, Math.min(n, pts.length)) : [];
  const ao = aoFn(env, d.aoLift ?? 0), nrm = normalFn(env, d.normal, null), R = env.R;
  for (const a of cent) { let d1 = 1e9, d2 = 1e9; for (const b of cent) { if (a === b) continue; const dd = a.c.distanceTo(b.c); if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; } a.nn = d2 < 1e8 ? d2 : R; }
  const rK = (o.rK ?? 1) * (P.rK ?? 1) * (0.72 + 0.28 * Math.min(1, density * 1.4));
  const list = [], irr = d.crown.irr ?? 0.15;
  for (const a of cent) {
    if (cent.length > 6 && rnd() < irr * (o.skipK ?? 0.3)) continue; // ragged crowns (eucalyptus, pines) get real gaps
    const r = clamp(Math.max(a.ext * 0.8, a.nn * 0.6), S * 0.5, Math.min(R * (P.rMax ?? 0.7), (env.top - env.base) * 0.33)) * rK * (0.8 + 0.4 * rnd()); // lumpy, not a uniform blob
    const c = a.c.clone(), th = Math.atan2(c.z, c.x), rad = Math.hypot(c.x, c.z);
    c.y = clamp(c.y, Math.max(env.base, o.fit?.base ?? -1e9) + 0.75 * r, env.top - 0.8 * r);
    let re = env.r(clamp(c.y, env.base + 1e-3, env.top - 1e-3), th) || R * 0.3;
    if (o.fit) re = Math.min(re, o.fit.R * (o.fit.R / R < 1 ? 1 : 1)); // never wider than the near LOD's leaves
    // snap onto the crown shell: the puff's edge (not its centre) meets the envelope, so far crowns keep the full
    // silhouette of the near ones instead of shrinking toward the k-means centroids
    const lim = Math.max(0, re * (o.shell ?? P.shell ?? 1.0) - 0.75 * r);
    const k = rad > 1e-4 ? (rad > lim ? lim / rad : lerp(1, lim / rad, (o.snap ?? 0.6) * (0.5 + rnd()))) : 1; c.x *= k; c.z *= k; // some lobes stand proud, some recess
    list.push({ c, r });
  }
  if (list.length) { const top = list.reduce((m, p) => Math.max(m, p.c.y + p.r), -1e9); if (top < env.top - 0.04 * (env.top - env.base) || d.arche === 'conifer') { const r = Math.min(R * 0.35, (env.top - env.base) * 0.12, Math.max(S * 0.5, env.r(env.top - (env.top - env.base) * 0.1, 0) * 1.1)); list.push({ c: V3(0, env.top - r * 0.85, 0), r }); } } // apex
  if (P.fists && o.fists !== false) for (const kn of sk.knobs) if (kn.r > 0.2) { // pollards: a leafy head over each fist, where the whips are
    const wl = (d.pollard?.whipLen?.[1] ?? 2) * 0.55, r = wl * (o.fistK ?? 0.75) * (0.6 + 0.6 * Math.min(1, density * 2));
    list.push({ c: kn.c.clone().add(V3(0, wl * 0.55, 0)).addScaledVector(V3(kn.c.x, 0, kn.c.z).normalize(), wl * 0.2), r });
  }
  { // r4-trees2: no small puffs floating on their own beside the crown: isolated ones are pulled in until they overlap
    // a neighbour (toward the crown axis), and tiny isolated ones are dropped
    const rs = list.map((p) => p.r).sort((a, b) => a - b), med = rs.length ? rs[rs.length >> 1] : 1;
    for (let it = 0; it < 2; it++) for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]; let gap = 1e9, nb = null;
      for (const q of list) { if (q === p) continue; const g = p.c.distanceTo(q.c) - p.r - q.r; if (g < gap) { gap = g; nb = q; } }
      if (!nb || gap < -0.25 * p.r) continue;
      if (p.r < 0.5 * med && list.length > 4) { list.splice(i, 1); continue; }
      const toNb = nb.c.clone().sub(p.c), dd = toNb.length(), need = gap + 0.3 * Math.min(p.r, nb.r);
      if (dd > 1e-4) p.c.addScaledVector(toNb, Math.min(1, need / dd) * 0.7); // most of the way toward its neighbour
      const ax = V3(-p.c.x, 0, -p.c.z), al = ax.length(); if (al > 1e-4) p.c.addScaledVector(ax, Math.min(1, need * 0.3 / al)); // and a little toward the axis
    }
  }
  const nc = o.core ?? P.core ?? 2; // dark core so the crown never reads hollow between the shell puffs
  for (let i = 0; i < nc; i++) { const y = lerp(env.base, env.top, (o.coreY ?? 0.36) + 0.22 * i / Math.max(1, nc - 1)); const re = env.r(y, i) || R * 0.5; list.push({ c: V3((rnd() - 0.5) * re * 0.25, y, (rnd() - 0.5) * re * 0.25), r: Math.min(re * (o.coreR ?? 0.5), (env.top - env.base) * 0.36, 4.5), core: true }); }
  for (const p of list) { const sH = clamp((p.c.y - env.base) / Math.max(env.top - env.base, 1e-3), 0, 1); puffQuad(acc, p.c, p.r, nrm(p.c), (p.core ? 0.6 : Math.min(1, ao(p.c) * 1.04)) * (0.8 + 0.2 * sH) * (o.aoK ?? 1), rnd(), rnd() < 0.5 ? 0 : 1, rnd()); } // lower puffs sit in the crown's own shade
  acc.puffs = list;
  return acc;
}
function trunkOnly(sk, d) { // far LOD trunk: 5-sided tube up to the crown base (bark material; sub-pixel parts are culled)
  const acc = new Acc(['aRad']);
  for (const t of sk.trunks) { const n = t.pts.length, top = Math.min(n - 1, Math.max(1, Math.round((n - 1) * (d.arche === 'conifer' ? 0.5 : 1)))); tube(acc, [t.pts[0], t.pts[top]], [t.rads[0], t.rads[top]], 4); }
  return acc;
}

// ---------------------------------------------------------------- r4-trees2: hero LOD (real 3D leaf clusters)
// Trees around the player are rebuilt from small sprigs of real-size leaves (tree-textures.js SPRIGS, one twig with a
// dozen or two leaves per card) gathered into 3D rosettes: every rosette sits at the tip of a tertiary twig that grows
// from the nearest skeleton branch out to a point on the crown shell, and its sprigs fan out over a hemisphere around
// the twig's growth direction, each with its own roll. From any side (walking past, or standing under the crown and
// looking up) you see overlapping leaf clusters at different depths, lit as small balls inside the crown's own shade,
// never a large flat plane. Conifers get flat drooping sprays along every whorl branch, pollards a rosette on each whip.
function heroAttach(sk) { // branch points a tertiary twig may grow from (resampled every ~0.6 m)
  const out = [], env = sk.env;
  for (const l of sk.limbs) for (let j = 1; j < l.pts.length; j++) {
    const a = l.pts[j - 1], b = l.pts[j], n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.6));
    for (let k = (j === 1 ? 1 : 0); k <= n; k++) { const t = k / n; out.push({ p: a.clone().lerp(b, t), r: lerp(l.rads[j - 1], l.rads[j], t) }); }
  }
  for (const t of sk.trunks) for (let j = 1; j < t.pts.length; j++) if (t.pts[j].y > env.base) out.push({ p: t.pts[j].clone(), r: t.rads[j] });
  return out;
}
function heroRosettes(sk, d, rnd, nRos) {
  const env = sk.env, R = env.R, H = env.top - env.base, Sp = d.sprigM, HH = d.hero || {}, sh = HH.shellR ?? [0.55, 1.0];
  const attach = heroAttach(sk), ros = [];
  // true surface-area weighting (ring radius x slope factor), so the flat top of a dome and the crown's underside get
  // their share of leaf clusters (a canopy you can't see the sky through from below)
  const hy = H * 0.01, wAt = (y, th) => { const re = env.r(y, th), g = (env.r(Math.min(y + hy, env.top - 1e-3), th) - env.r(Math.max(y - hy, env.base + 1e-3), th)) / (2 * hy); return re * Math.sqrt(1 + Math.min(g * g, 64)); };
  let wMax = 1e-6; for (let i = 0; i <= 64; i++) for (let j = 0; j < 4; j++) wMax = Math.max(wMax, wAt(env.base + H * (0.02 + 0.96 * i / 64), j * 1.57));
  let tries = 0;
  while (ros.length < nRos && tries++ < nRos * 80) {
    const y = env.base + H * (0.02 + 0.96 * rnd()), th = rnd() * TAU, re = env.r(y, th);
    if (re < 0.12 || rnd() * wMax * 1.1 > wAt(y, th)) continue; // area-weighted over the crown
    const rr = Math.max(0, re * lerp(sh[0], sh[1], Math.pow(rnd(), HH.shellPow ?? 0.55)) - Sp * 0.5); // mostly in the outer shell
    const P = V3(Math.cos(th) * rr, Math.min(y, env.top - Sp * 0.5), Math.sin(th) * rr);
    let best = null, bd = 1e9; for (const a of attach) { const dd = a.p.distanceToSquared(P); if (dd < bd) { bd = dd; best = a; } }
    ros.push({ c: P, a: best ? best.p : null, ar: best ? best.r : 0.05 });
  }
  return ros;
}
function heroFan(acc, P, grow, nC, k, d, rnd, nrm, ao, o = {}) { // one 3D rosette of k sprigs around P
  const Sp = d.sprigM, HH = d.hero || {}, shellF = o.shell ?? HH.shell ?? 0.55;
  for (let i = 0; i < k; i++) {
    if (rnd() < shellF) { // shell sprig: lies along the crown surface facing out (the rosettes merge into a continuous leafy crown)
      let t = randUnit(rnd); t.addScaledVector(nC, -t.dot(nC)); if (t.lengthSq() < 1e-6) t = anyPerp(nC); t.normalize();
      if (HH.droop) { t.y -= HH.droop * 0.5; t.addScaledVector(nC, -t.dot(nC)); if (t.lengthSq() < 1e-6) t = anyPerp(nC); t.normalize(); }
      const f = nC.clone().addScaledVector(randUnit(rnd), HH.shellJit ?? 0.4).normalize();
      let side = V3().crossVectors(t, f); if (side.lengthSq() < 1e-6) side = anyPerp(t); side.normalize();
      const sz = Sp * (0.9 + 0.4 * rnd()) * (o.size ?? 1);
      const base = P.clone().addScaledVector(t, -sz * 0.45).addScaledVector(randUnit(rnd), Sp * 0.3).addScaledVector(nC, Sp * 0.1 * rnd());
      cardAt(acc, base, t, side, sz, sz, rnd() < 0.5 ? 0 : 1, nrm, ao, rnd(), rnd() < 0.5);
      continue;
    }
    const dir = grow.clone().addScaledVector(randUnit(rnd), o.spread ?? HH.spread ?? 1.0).normalize();
    if (HH.droop) { dir.y -= HH.droop * (0.6 + 0.8 * rnd()); dir.normalize(); } // pendulous foliage hangs
    const base = P.clone().addScaledVector(randUnit(rnd), Sp * 0.14).addScaledVector(dir, -Sp * (o.back ?? 0.18));
    const face = Y.clone().multiplyScalar(HH.faceUp ?? 0.55).addScaledVector(nC, 0.45).addScaledVector(randUnit(rnd), HH.faceJit ?? 0.75);
    let side = V3().crossVectors(dir, face); if (side.lengthSq() < 1e-6) side = anyPerp(dir); side.normalize();
    const sz = Sp * (0.78 + 0.44 * rnd()) * (o.size ?? 1);
    cardAt(acc, base, dir, side, sz, sz, rnd() < 0.5 ? 0 : 1, nrm, ao, rnd(), rnd() < 0.5);
  }
}
function buildLeavesHero(sk, d, rnd, density, budget) {
  const acc = new Acc(LEAF_ATTRS), env = sk.env, Sp = d.sprigM, HH = d.hero || {};
  acc.ros = [];
  if (density <= 0.001 || !sk.clumps.length) return acc;
  const ao0 = aoFn(env, d.aoLift ?? 0), crownN = normalFn(env, d.normal, null);
  const nSpr = Math.max(60, Math.floor(budget / 2 * (d.arche === 'decurrent' ? 1 : Math.min(1, density * 1.15)))); // decurrent crowns thin by bare patches below
  const ballN = (P, w) => (p) => { const q = p.clone().sub(P), l = q.length(), n = crownN(p).multiplyScalar(1 - w); if (l > 1e-5) n.addScaledVector(q.divideScalar(l), w); return n.addScaledVector(Y, 0.08).normalize(); };
  const ballAO = (P, r) => (p) => Math.pow(ao0(p), HH.aoPow ?? 1.5) * (0.62 + 0.38 * smooth(0, r, p.distanceTo(P))); // rosette cores and the crown interior sit in their own shade
  if (d.arche === 'conifer') { // flat sprays leaving every whorl branch on both sides, drooping toward their tips
    const cl = sk.clumps, tot = cl.reduce((s, c) => s + (c.mode === 'branch' ? c.p0.distanceTo(c.p1) + 0.3 : c.r), 0);
    for (const c of cl) {
      const k = Math.max(2, Math.round(nSpr * (c.mode === 'branch' ? c.p0.distanceTo(c.p1) + 0.3 : c.r) / tot));
      if (c.mode !== 'branch') { const g = c.dir.clone().addScaledVector(V3(c.c.x, 0, c.c.z).normalize(), 0.6).normalize(); heroFan(acc, c.c, g, crownN(c.c), k, d, rnd, ballN(c.c, 0.4), ballAO(c.c, c.r), { spread: 1.1 }); continue; }
      const lat = V3().crossVectors(c.dir, Y); if (lat.lengthSq() < 1e-6) lat.copy(anyPerp(c.dir)); lat.normalize();
      const nrm = (p) => { const n = crownN(p).multiplyScalar(0.6).addScaledVector(Y, 0.4); return n.normalize(); };
      for (let i = 0; i < k; i++) {
        const base = c.p0.clone().lerp(c.p1, Math.pow(rnd(), 0.8)).addScaledVector(randUnit(rnd), Sp * 0.08);
        const phi = 0.35 + rnd() * 1.0, sg = rnd() < 0.5 ? -1 : 1;
        const up = c.dir.clone().multiplyScalar(Math.cos(phi)).addScaledVector(lat, sg * Math.sin(phi)).addScaledVector(randUnit(rnd), HH.jit ?? 0.25);
        up.y -= (HH.droop ?? 0.25) * (0.4 + rnd()); up.normalize();
        const face = Y.clone().addScaledVector(randUnit(rnd), HH.faceJit ?? 0.45); // sprays lie roughly flat
        let side = V3().crossVectors(up, face); if (side.lengthSq() < 1e-6) side = anyPerp(up); side.normalize();
        const sz = Sp * (0.75 + 0.5 * rnd());
        cardAt(acc, base, up, side, sz, sz, rnd() < 0.5 ? 0 : 1, nrm, (p) => ao0(p) * (0.8 + 0.2 * rnd()), rnd(), rnd() < 0.5);
      }
    }
    return acc;
  }
  if (d.arche === 'pollard') { // a rosette on every whip tip
    const per = Math.max(3, Math.round(nSpr / sk.clumps.length));
    for (const c of sk.clumps) heroFan(acc, c.c, c.dir.clone().addScaledVector(Y, 0.3).normalize(), crownN(c.c), per, d, rnd, ballN(c.c, 0.5), ballAO(c.c, Sp), { spread: 1.1 });
    return acc;
  }
  // decurrent: rosettes spread evenly over the crown shell (area-weighted, outer 45% of the radius), each on a stalk
  // grown from the nearest skeleton branch, so the leaf clusters merge into a closed crown with depth instead of
  // garlands along the limbs. Thinning crowns (late-autumn planes) lose whole patches of rosettes.
  const per = HH.per ?? 11, ros0 = heroRosettes(sk, d, rnd, Math.max(10, Math.round(nSpr / per))), ros = [];
  for (const l of sk.limbs) { const n = l.pts.length; ros0.push({ c: l.pts[n - 1].clone(), a: null, ar: 0, tip: true }); } // every limb ends in a leaf cluster, never a bare spike
  const ph = [rnd() * TAU, rnd() * TAU, rnd() * TAU], fq = HH.patchF ?? 0.55;
  const patch = (p) => 0.5 + 0.5 * Math.sin(p.x * fq + ph[0]) * Math.sin(p.y * fq * 0.8 + ph[1]) * Math.sin(p.z * fq + ph[2] + p.x * 0.3);
  for (const r of ros0) {
    const P = r.c;
    if (!r.tip && density < 0.98 && patch(P) * 0.75 + rnd() * 0.25 > density * (HH.densK ?? 1.05)) continue; // bare patches
    ros.push(r);
    const nC = crownN(P), out = r.a ? P.clone().sub(r.a) : nC.clone(); if (out.lengthSq() < 1e-6) out.copy(nC); out.normalize();
    const grow = out.multiplyScalar(0.5).addScaledVector(nC, 0.5).addScaledVector(Y, HH.up ?? 0.15).normalize();
    heroFan(acc, P, grow, nC, Math.max(3, per + Math.round((rnd() - 0.5) * per * 0.5)), d, rnd, ballN(P, HH.ballW ?? 0.25), ballAO(P, Sp * 0.9));
  }
  acc.ros = ros;
  return acc;
}
function buildBarkHero(sk, d, ros) { // smoother wood than LOD0 + the tertiary twigs that carry the rosettes
  const acc = new Acc(['aRad']), twR = d.clumps?.twigR ?? 0.05;
  const capped = capTube;
  for (const t of sk.trunks) { // broadleaf trunks taper into their top limbs (hidden inside the limb bases, no stump); leaders get a tip
    if (d.arche === 'conifer') { tube(acc, ...capped(t.pts, t.rads), (d.trunk.seg ?? 8) + 4); continue; }
    const n = t.rads.length, rr = t.rads.slice(); rr[n - 1] *= 0.45; if (n > 2) rr[n - 2] *= 0.8;
    tube(acc, t.pts, rr, (d.trunk.seg ?? 8) + 4);
  }
  for (const l of sk.limbs) tube(acc, ...capped(l.pts, l.rads), l.thin ? 5 : (d.limbSeg ?? 5) + 3);
  for (const t of sk.twigs) tube(acc, t.pts, t.rads, 3);
  for (const k of sk.knobs) { ico(acc, k.c, k.r, 0.85); if (d.arche === 'pollard' && k.r > 0.2) ico(acc, k.c.clone().add(V3(k.r * 0.45, k.r * 0.3, -k.r * 0.3)), k.r * 0.7, 0.9); }
  for (const r of ros || []) {
    if (!r.a) continue;
    const L = r.a.distanceTo(r.c); if (L < 0.08) continue;
    const r0 = Math.min(r.ar * 0.5, twR * 1.0), r1 = twR * 0.22; // thin stalks, mostly hidden in the foliage
    if (L > 2.2) continue; // long straight stalks read as sticks: those rosettes just sit among their neighbours
    if (L < 1.0) tube(acc, [r.a, r.c], [r0, r1], 3);
    else { const m = r.a.clone().lerp(r.c, 0.45); m.y += 0.1 * L; tube(acc, [r.a, m, r.c], [r0, (r0 + r1) * 0.5, r1], 3); }
  }
  return acc;
}

// ---------------------------------------------------------------- species definitions (metres, typical tree)
const SPECIES_DEF = {
  oak: {
    lod2K: 0.65, cardK: 1.5, name: 'Coast live oak', arche: 'decurrent', leaf: 'oak', bark: 'oak', seed: 101, typical: { height: 12, crownR: 9.5 },
    trunk: { h: 2.9, r0: 0.62, r1: 0.5, lean: 0.06, flare: 0.4, wiggle: 0.05, seg: 9 }, // r4-trees2: crown lifted (2.4 m, was 1.6) so walkers fit under campus oaks
    crown: { base: 2.4, top: 12, R: 9.5, shape: ['superegg', 0.3, 2.3], irr: 0.15 },
    limbs: { n: 7, h0: 0.65, h1: 1.0, up: [0.15, 0.55], reach: [0.62, 0.9], r: 0.5, arch: -0.1, wiggle: 1.2 },
    branch2: { n: 5, spread: 1.0, twigs: 3, up: [-0.55, 0.65] },
    clumps: { twigR: 0.045 },
    cards: { n: 1500, vbias: 0.25, out: 1.0, face: 0.6, jit: 0.5 },
    normal: 'ellipsoid', lod1Core: true, hero: { budgetK: 1.3, spread: 0.85, shell: 0.65, shellR: [0.3, 1.0], shellPow: 0.45 }, // r4-trees2: dense evergreen dome, some leaves inside
    look: { cols: ['#4f5c30', '#5d6a3a', '#767c55'], ramp: [0.45, 0.93, 0.12, 0.08], twig: '#5b5045', rough: 0.55, leafSpec: 0.3, transBack: 0.45, transWrap: 0.3, blobK: 0.91, sway: 0.007, flutter: 0.0010, tintK: 1.0 },
  },
  plane: {
    aoLift: 0.25, lod2K: 0.64, cardK: 1.0, name: 'London plane', arche: 'decurrent', leaf: 'plane', bark: 'plane', seed: 202, typical: { height: 18, crownR: 7.5 },
    trunk: { h: 5.5, r0: 0.42, r1: 0.3, lean: 0.02, flare: 0.25, wiggle: 0.02 },
    crown: { base: 4.5, top: 18, R: 7.5, shape: ['superegg', 0.5, 2.2], irr: 0.12 },
    limbs: { n: 7, h0: 0.65, h1: 1.0, up: [0.35, 0.75], reach: [0.5, 0.8], r: 0.6, arch: 0.05, wiggle: 0.3 },
    clumps: { n: 62, r: [1.1, 1.7], shell: [0.55, 0.97], twigR: 0.05 },
    branch2: { n: 4, spread: 1.0, twigs: 3, up: [-0.45, 0.75] },
    cards: { n: 1500, size: 1.5, vbias: 0.3, out: 0.9, face: 0.55, jit: 0.6 },
    normal: 'ellipsoid', seasonal: 'plane', hero: { densK: 0.9 },
    look: { twig: '#6b6250', rough: 0.8, transBack: 0.75, transWrap: 0.3, blobK: 0.64, sway: 0.010, flutter: 0.0016, tintK: 0.35 },
  },
  planePollard: {
    aoLift: 0.25, lod2K: 1.12, name: 'Pollarded London plane', arche: 'pollard', leaf: 'plane', bark: 'plane', seed: 303, typical: { height: 5.5, crownR: 2.8 },
    trunk: { h: 2.3, r0: 0.26, r1: 0.22, lean: 0.01, flare: 0.2, wiggle: 0.02, seg: 8 },
    crown: { base: 2.6, top: 5.5, R: 2.8, shape: ['superegg', 0.45, 2.5], irr: 0.1 },
    pollard: { limbs: 5, reach: [1.3, 1.9], height: [3.0, 3.5], limbR: 0.13, knobR: 0.3, whips: 14, whipLen: [0.6, 2.4], whipR: 0.016, clumpR: 0.3 }, // a year's whips: brooms on every fist
    cardK: 0.35, cards: { n: 1500, size: 0.9, vbias: 0.6, out: 0.6, face: 0.5, jit: 0.6 },
    normal: 'ellipsoid', seasonal: 'pollard', puff: { n0: 0, n1: 10, n2: 8, core: 0, core0: 0, rK: 0.8, fists: true },
    look: { twig: '#6e6553', rough: 0.8, transBack: 0.7, transWrap: 0.3, blobK: 0.71, sway: 0.006, flutter: 0.0018, tintK: 0.3 },
  },
  redwood: {
    lod2K: 0.5, name: 'Coast redwood', arche: 'conifer', leaf: 'spray', bark: 'redwood', seed: 404, typical: { height: 35, crownR: 5 },
    trunk: { h: 34.6, r0: 0.85, r1: 0.06, flare: 0.6, wiggle: 0.004, segs: 10, seg: 8, taperPow: 0.8 },
    crown: { base: 7.5, top: 35, R: 5, shape: ['cone', 0.8, 5], irr: 0.24 }, // r4-trees: clear red bole below a ragged, narrow crown (not a generic cone)
    whorls: { spacing: 1.15, n: 4, elev: [-0.35, 0.3], droop: 0.12, r: 0.07, lenK: [0.85, 1.0], clumpK: 0.35, clumpR: [0.6, 1.4] },
    cards: { n: 1500, size: 1.5, vbias: 0.05, out: 1.0, face: 0.35, flat: 0.45, jit: 0.35 },
    normal: 'cone', lod1Core: true, lod1Limbs: 0, puff: { n0: 24, rK0: 0.85, n1: 56, n2: 26, rK: 0.85, aspect: 1.65, core: 0, core0: 0, rMax: 0.5 }, sprigK: 1.0, hero: { faceJit: 0.75, droop: 0.45, jit: 0.25 }, // r4-trees2: drooping, tilted sprays (flat ones vanish edge-on from eye level) // dense, flat, ragged branch-spray tiers (the near cards alone read as a scrawny bottlebrush)
    look: { cols: ['#3a5230', '#466036', '#33482c'], ramp: [0.35, 0.8, 0.15, 0.2], twig: '#6b3d2a', rough: 0.8, transBack: 0.3, transWrap: 0.2, blobK: 0.41, sway: 0.006, flutter: 0.0006, tintK: 1.0 },
  },
  eucalyptus: {
    lod2K: 0.5, cardK: 0.9, name: 'Blue gum eucalyptus', arche: 'decurrent', leaf: 'euc', bark: 'euc', seed: 505, typical: { height: 40, crownR: 9 },
    trunk: { h: 26, r0: 0.85, r1: 0.3, lean: 0.03, flare: 0.5, wiggle: 0.04, segs: 8 },
    crown: { base: 18, top: 40, R: 9, shape: ['superegg', 0.45, 2.0], irr: 0.45 }, // blue gums: tall clear boles, high ragged crowns
    limbs: { n: 8, h0: 0.55, h1: 1.0, up: [0.35, 0.85], reach: [0.55, 0.9], r: 0.5, arch: 0.12, wiggle: 0.4 },
    clumps: { n: 38, r: [1.3, 2.3], shell: [0.5, 0.97], twigR: 0.07 }, // fewer, smaller clumps: sky shows through
    branch2: { n: 4, spread: 1.1, twigs: 2, up: [-0.5, 0.7] },
    cards: { n: 1500, size: 2.4, vbias: -0.9, out: 0.35, face: 0.4, jit: 0.35, tangent: 0.2 }, // most sprays hang (pendulous) instead of forming a shell
    normal: 'ellipsoid', puff: { rK: 0.8, core: 0, core0: 0, n0: 7, rK0: 0.6, n1: 30, aspect: 0.72 }, hero: { droop: 1.1, shell: 0.35, spread: 0.7, faceJit: 1.0, budgetK: 1.1 }, // r4-trees2: hanging gum foliage // pendulous: narrow, hanging leaf masses
    look: { cols: ['#6f7f6c', '#7f8e7a', '#647262'], ramp: [0.4, 0.8, 0.25, 0.2], twig: '#8a7a62', rough: 0.6, leafSpec: 0.3, transBack: 0.55, transWrap: 0.3, blobK: 0.79, sway: 0.012, flutter: 0.002, tintK: 0.6 }, // r4-trees: grey-green, less aerial tint (read as oak)
  },
  pine: {
    lod2K: 0.57, cardK: 1.05, name: 'Monterey pine', arche: 'decurrent', leaf: 'needle', bark: 'pine', seed: 606, typical: { height: 22, crownR: 8 },
    trunk: { h: 13, r0: 0.55, r1: 0.32, lean: 0.06, flare: 0.3, wiggle: 0.05 },
    crown: { base: 8, top: 22, R: 8, shape: ['superegg', 0.55, 3.0], irr: 0.3 },
    limbs: { n: 9, h0: 0.45, h1: 1.0, up: [0.1, 0.55], reach: [0.6, 0.95], r: 0.45, arch: -0.05, wiggle: 0.4 },
    clumps: { n: 60, r: [1.1, 1.8], shell: [0.55, 0.98], twigR: 0.06 },
    branch2: { n: 4, spread: 1.0, twigs: 3, up: [-0.35, 0.6] },
    cards: { n: 1500, size: 1.7, vbias: 0.45, out: 0.8, face: 0.55, jit: 0.5 },
    normal: 'ellipsoid', puff: { aspect: 1.15 },
    look: { cols: ['#3f5434', '#4b603b', '#384b30'], ramp: [0.35, 0.8, 0.15, 0.2], twig: '#5a4636', rough: 0.8, transBack: 0.3, transWrap: 0.2, blobK: 0.63, sway: 0.009, flutter: 0.0008, tintK: 1.0 },
  },
  cedar: {
    lod2K: 0.96, name: 'Deodar cedar', arche: 'conifer', leaf: 'tuft', bark: 'pine', seed: 707, typical: { height: 20, crownR: 6.5 },
    trunk: { h: 19.4, r0: 0.5, r1: 0.05, flare: 0.3, wiggle: 0.004, segs: 10, droopTop: 1.0 },
    crown: { base: 1.5, top: 20, R: 6.5, shape: ['cone', 1.05, 5], irr: 0.12 },
    whorls: { spacing: 1.3, n: 5, elev: [-0.05, 0.25], droop: 0.3, r: 0.08, lenK: [0.85, 1.0], clumpK: 0.3, clumpR: [0.7, 1.5] },
    cards: { n: 1500, size: 1.7, vbias: -0.35, out: 1.0, face: 0.4, flat: 0.3, jit: 0.4 },
    normal: 'cone', lod1Core: true, lod1Limbs: 0, lod1AO: 0.8, puff: { n0: 10, rK0: 0.72, n1: 40, n2: 22, aspect: 1.45, core: 0, core0: 0 },
    look: { cols: ['#56705a', '#637c66', '#4c6550'], ramp: [0.35, 0.8, 0.15, 0.2], twig: '#5c4b3d', rough: 0.8, transBack: 0.3, transWrap: 0.2, blobK: 0.35, sway: 0.008, flutter: 0.0008, tintK: 0.9 },
  },
  cypress: {
    lod2K: 0.94, name: 'Italian cypress', arche: 'conifer', leaf: 'scale', bark: 'smooth', seed: 808, typical: { height: 14, crownR: 1.5 },
    trunk: { h: 13.6, r0: 0.28, r1: 0.05, flare: 0.2, wiggle: 0.004, segs: 6, seg: 6 },
    crown: { base: 0.6, top: 14, R: 1.5, shape: ['column'], irr: 0.06 },
    whorls: { spacing: 0.75, n: 4, elev: [1.0, 1.1], droop: 0, r: 0.03, lenK: [0.75, 0.95], clumpK: 0.45, clumpR: [0.35, 0.6], branches: false },
    cards: { n: 1500, size: 0.9, vbias: 1.0, out: 0.45, face: 0.6, jit: 0.35 },
    normal: 'cone', lod1Core: true, lod1Limbs: 0, lod1CardK: 0.9, lod1AO: 0.78, puff: { n0: 14, n1: 26, n2: 16, core: 0, core0: 0 },
    look: { cols: ['#36542f', '#41623a', '#2f4a2c'], ramp: [0.35, 0.8, 0.15, 0.2], twig: '#4a3d33', rough: 0.85, transBack: 0.2, transWrap: 0.2, blobK: 0.64, sway: 0.01, flutter: 0.0005, tintK: 1.0 },
  },
  deciduous: {
    aoLift: 0.25, lod2K: 0.73, cardK: 1.1, name: 'Deciduous (maple / elm)', arche: 'decurrent', leaf: 'maple', bark: 'smooth', seed: 909, typical: { height: 13, crownR: 6 },
    trunk: { h: 3.5, r0: 0.32, r1: 0.24, lean: 0.03, flare: 0.3, wiggle: 0.03 },
    crown: { base: 3.0, top: 13, R: 6, shape: ['superegg', 0.55, 2.2], irr: 0.15 },
    limbs: { n: 6, h0: 0.7, h1: 1.0, up: [0.35, 0.8], reach: [0.5, 0.8], r: 0.6, arch: 0.1, wiggle: 0.35 },
    clumps: { n: 60, r: [0.9, 1.4], shell: [0.55, 0.97], twigR: 0.045 },
    branch2: { n: 4, spread: 1.0, twigs: 3, up: [-0.5, 0.75] },
    cards: { n: 1500, size: 1.35, vbias: 0.35, out: 0.9, face: 0.55, jit: 0.55 },
    normal: 'ellipsoid', seasonal: 'deciduous',
    look: { twig: '#5e5446', rough: 0.8, transBack: 0.8, transWrap: 0.3, blobK: 0.35, sway: 0.011, flutter: 0.0018, tintK: 0.25 },
  },
  ginkgo: {
    aoLift: 0.25, lod2K: 0.82, cardK: 1.15, name: 'Ginkgo', arche: 'decurrent', leaf: 'ginkgo', bark: 'smooth', seed: 1010, typical: { height: 14, crownR: 4.5 },
    trunk: { h: 9, r0: 0.32, r1: 0.15, lean: 0.02, flare: 0.25, wiggle: 0.02 },
    crown: { base: 2.5, top: 14, R: 4.5, shape: ['superegg', 0.45, 2.0], irr: 0.25 },
    limbs: { n: 9, h0: 0.25, h1: 1.0, up: [0.3, 0.7], reach: [0.55, 0.9], r: 0.45, arch: 0.15, wiggle: 0.3 },
    clumps: { n: 55, r: [0.8, 1.2], shell: [0.5, 0.97], twigR: 0.04 },
    branch2: { n: 4, spread: 0.9, twigs: 3, up: [-0.45, 0.75] },
    cards: { n: 1500, size: 1.25, vbias: 0.4, out: 0.9, face: 0.5, jit: 0.55 },
    normal: 'ellipsoid', seasonal: 'ginkgo',
    look: { twig: '#6a5d4c', rough: 0.75, transBack: 0.85, transWrap: 0.35, blobK: 0.55, sway: 0.010, flutter: 0.0018, tintK: 0.2 },
  },
  magnolia: {
    lod2K: 0.79, cardK: 1.0, name: 'Southern magnolia', arche: 'decurrent', leaf: 'magnolia', bark: 'smooth', seed: 1111, typical: { height: 12, crownR: 5 },
    trunk: { h: 2.0, r0: 0.3, r1: 0.24, lean: 0.02, flare: 0.3, wiggle: 0.02 },
    crown: { base: 1.0, top: 12, R: 5, shape: ['superegg', 0.38, 2.2], irr: 0.1 },
    limbs: { n: 7, h0: 0.5, h1: 1.0, up: [0.35, 0.8], reach: [0.45, 0.75], r: 0.55, arch: 0.1, wiggle: 0.3 },
    clumps: { n: 64, r: [0.9, 1.3], shell: [0.6, 0.98], twigR: 0.04 },
    branch2: { n: 4, spread: 1.0, twigs: 3, up: [-0.7, 0.7] },
    cards: { n: 1500, size: 1.35, vbias: 0.35, out: 0.9, face: 0.6, jit: 0.5 },
    normal: 'ellipsoid', lod1Core: true,
    look: { cols: ['#34492a', '#405632', '#5c5834'], ramp: [0.4, 0.9, 0.1, 0.2], twig: '#4f4538', rough: 0.38, leafSpec: 0.65, transBack: 0.2, transWrap: 0.2, blobK: 1.6, sway: 0.006, flutter: 0.0008, tintK: 1.0 },
  },
  bay: {
    lod2K: 0.7, cardK: 1.2, name: 'California bay laurel', arche: 'decurrent', leaf: 'bay', bark: 'smooth', seed: 1212, typical: { height: 11, crownR: 5.5 },
    trunk: { n: 3, h: 2.2, r0: 0.2, r1: 0.16, lean: 0.04, spread: 0.15, flare: 0.2, wiggle: 0.05 },
    crown: { base: 1.4, top: 11, R: 5.5, shape: ['superegg', 0.45, 2.3], irr: 0.15 },
    limbs: { n: 8, h0: 0.6, h1: 1.0, up: [0.3, 0.75], reach: [0.5, 0.8], r: 0.6, arch: 0.08, wiggle: 0.35 },
    clumps: { n: 64, r: [0.8, 1.3], shell: [0.58, 0.98], twigR: 0.04 },
    branch2: { n: 4, spread: 1.0, twigs: 3, up: [-0.6, 0.7] },
    cards: { n: 1500, size: 1.2, vbias: 0.35, out: 0.9, face: 0.55, jit: 0.5 },
    normal: 'ellipsoid', lod1Core: true,
    look: { cols: ['#5a6838', '#687642', '#505e32'], ramp: [0.35, 0.8, 0.15, 0.25], twig: '#5a4e40', rough: 0.6, leafSpec: 0.25, transBack: 0.45, transWrap: 0.3, blobK: 1.01, sway: 0.008, flutter: 0.0012, tintK: 1.0 },
  },
  palm: {
    lod2K: 0.75, name: 'Mexican fan palm', arche: 'palm', leaf: 'palm', bark: 'palm', seed: 1313, typical: { height: 18, crownR: 2.6 },
    trunk: { h: 16.6, r0: 0.36, r1: 0.27, lean: 0.035, flare: 0.25, wiggle: 0.015, segs: 9 },
    crown: { base: 14.6, top: 18, R: 2.6, shape: ['superegg', 0.55, 2.0], irr: 0.05 },
    palm: { fronds: 34, dead: 12, petiole: 1.0, blade: 2.0 },
    normal: 'ellipsoid',
    look: { cols: ['#4f7135', '#5d7f3c', '#8a744f'], ramp: [0.45, 0.93, 0.15, 0.1], twig: '#7a6a4c', rough: 0.7, transBack: 0.5, transWrap: 0.2, blobK: 0.9, sway: 0.010, flutter: 0.003, tintK: 0.8 },
  },
  shrub: {
    lod2K: 0.95, cardK: 1.1, name: 'Shrub / hedge', arche: 'decurrent', leaf: 'shrub', bark: 'smooth', seed: 1414, typical: { height: 1.6, crownR: 1.2 },
    trunk: { n: 4, h: 0.35, r0: 0.03, r1: 0.025, lean: 0.2, spread: 0.35, flare: 0, wiggle: 0.05, segs: 3, seg: 4 },
    crown: { base: 0.05, top: 1.6, R: 1.2, shape: ['superegg', 0.4, 2.2], irr: 0.12 },
    limbs: { n: 6, h0: 0.6, h1: 1.0, up: [0.3, 0.8], reach: [0.4, 0.75], r: 0.7, arch: 0.1, wiggle: 0.3 },
    clumps: { n: 46, r: [0.3, 0.45], shell: [0.55, 0.98], twigR: 0.012 },
    branch2: { n: 3, spread: 1.2, twigs: 3, up: [-0.8, 0.6] },
    cards: { n: 1500, size: 0.42, vbias: 0.3, out: 0.9, face: 0.55, jit: 0.5 },
    normal: 'ellipsoid', lod1Core: true, limbSeg: 3,
    look: { cols: ['#46612e', '#527036', '#3c5528'], ramp: [0.35, 0.8, 0.15, 0.25], twig: '#4a3f33', rough: 0.8, transBack: 0.35, transWrap: 0.2, blobK: 0.35, sway: 0.01, flutter: 0.002, tintK: 1.0 },
  },
};

// seasonal foliage: colours (sRGB) for ramp stops A -> B -> C, ramp [t1, t2, per-tree spread, per-card spread], leaf density
const SEASONAL = {
  plane: {
    spring: { cols: ['#6f9a3a', '#7ca843', '#5f8a33'], ramp: [0.35, 0.8, 0.2, 0.2], density: 0.85 },
    summer: { cols: ['#55762f', '#628237', '#4b6a2a'], ramp: [0.35, 0.8, 0.2, 0.2], density: 1 },
    'early-autumn': { cols: ['#6c7d33', '#8b8a38', '#a07f3a'], ramp: [0.4, 0.75, 0.35, 0.2], density: 0.9 },
    'late-autumn': { cols: ['#8a8040', '#a28446', '#7a5836'], ramp: [0.3, 0.62, 0.5, 0.25], density: 0.55 }, // planes: browning, thinning (r4-trees: 0.32 -> 0.55, crowns read as volumes)
    winter: { cols: ['#7d6a45', '#8a6f45', '#6b5538'], ramp: [0.4, 0.7, 0.3, 0.2], density: 0.05 },
  },
  pollard: {
    spring: { cols: ['#74a03c', '#82ad45', '#669036'], ramp: [0.35, 0.8, 0.2, 0.2], density: 0.75 },
    summer: { cols: ['#55762f', '#628237', '#4b6a2a'], ramp: [0.35, 0.8, 0.2, 0.2], density: 1 },
    'early-autumn': { cols: ['#6c7d33', '#8b8a38', '#a07f3a'], ramp: [0.4, 0.75, 0.35, 0.2], density: 0.8 },
    'late-autumn': { cols: ['#86704a', '#8e6c42', '#6a5036'], ramp: [0.3, 0.6, 0.4, 0.25], density: 0.38 }, // the esplanade pollards are mostly bare by late November (r4-trees: a few brown leaves still cling to the whips)
    winter: { cols: ['#7d6a45', '#8a6f45', '#6b5538'], ramp: [0.4, 0.7, 0.3, 0.2], density: 0.0 },
  },
  deciduous: {
    spring: { cols: ['#77a33f', '#86b048', '#689338'], ramp: [0.35, 0.8, 0.25, 0.2], density: 0.85 },
    summer: { cols: ['#4f7430', '#5e8138', '#46692a'], ramp: [0.35, 0.8, 0.25, 0.2], density: 1 },
    'early-autumn': { cols: ['#5f7a32', '#9a9a3a', '#c98a2e'], ramp: [0.45, 0.78, 0.7, 0.25], density: 0.9 },
    'late-autumn': { cols: ['#6c7336', '#ad8a40', '#8c6838'], ramp: [0.36, 0.76, 0.75, 0.28], density: 0.62 }, // late Nov in Berkeley: some still olive, most ochre, a few russet; a third of the leaves down
    winter: { cols: ['#7a5a3a', '#8a6a40', '#6b5035'], ramp: [0.4, 0.7, 0.3, 0.2], density: 0.03 },
  },
  ginkgo: {
    spring: { cols: ['#86b04a', '#94bb52', '#79a242'], ramp: [0.35, 0.8, 0.2, 0.2], density: 0.8 },
    summer: { cols: ['#5b8a3a', '#679640', '#517d33'], ramp: [0.35, 0.8, 0.2, 0.2], density: 1 },
    'early-autumn': { cols: ['#8fa33a', '#b8b83a', '#d8c23a'], ramp: [0.4, 0.75, 0.4, 0.2], density: 0.95 },
    'late-autumn': { cols: ['#d29a1e', '#e2b02a', '#ecc444'], ramp: [0.3, 0.7, 0.25, 0.2], density: 0.75 },
    winter: { cols: ['#c9a030', '#d8b040', '#b8902a'], ramp: [0.4, 0.7, 0.2, 0.2], density: 0.02 },
  },
};

// ---------------------------------------------------------------- normalisation & stats
function scaleGeo(g, sx, sy = sx, sz = sx) {
  g.scale(sx, sy, sz);
  const pv = g.attributes.aPivot; if (pv) { for (let i = 0; i < pv.count; i++) pv.setXYZ(i, pv.getX(i) * sx, pv.getY(i) * sy, pv.getZ(i) * sz); pv.needsUpdate = true; }
  const pf = g.attributes.aPuff; if (pf) { const k = Math.cbrt(Math.abs(sx * sy * sz)); for (let i = 0; i < pf.count; i++) pf.setZ(i, pf.getZ(i) * k); pf.needsUpdate = true; } // r4-trees
  const ra = g.attributes.aRad; if (ra) { const k = Math.cbrt(Math.abs(sx * sy * sz)); for (let i = 0; i < ra.count; i++) ra.setX(i, ra.getX(i) * k); ra.needsUpdate = true; }
  return g;
}
function percentile(arr, q) { if (!arr.length) return 0; const a = Float32Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))]; }
function radialList(g) { const p = g.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(Math.hypot(p.getX(i), p.getZ(i))); return out; }
function yList(g) { const p = g.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(p.getY(i)); return out; }
function maxY(geos) { let m = -1e9; for (const g of geos) { g.computeBoundingBox(); m = Math.max(m, g.boundingBox.max.y); } return m; }
function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }

function buildSpecies(id, d, season, opts) {
  // opts: { leafTexSize, alphaToCoverage }
  d = { ...d, cardM: (LEAF_KINDS[d.leaf]?.cellM ?? 1) * (d.cardK ?? 1), sprigM: (SPRIGS[d.leaf]?.M ?? 0.5) * (d.sprigK ?? 1) };
  const rnd = mulberry32(d.seed * 7919 + 17);
  const sea = d.seasonal ? SEASONAL[d.seasonal][season] ?? SEASONAL[d.seasonal]['late-autumn'] : null;
  const look = { ...d.look, ...(sea ? { cols: sea.cols, ramp: sea.ramp } : {}) };
  const density = sea ? sea.density : 1;
  const usePuffs = opts.puffs !== false && d.arche !== 'palm'; // r4-trees (?treepuffs=0 restores the round-3 card/blob LODs)

  // skeleton
  const sk = d.arche === 'conifer' ? genConifer(d, rnd) : d.arche === 'pollard' ? genPollard(d, rnd) : d.arche === 'palm' ? buildPalm(d, rnd) : genDecurrent(d, rnd);

  // extra fine twigs for bare-ish deciduous crowns (budget freed by the missing leaves)
  if (d.seasonal && d.arche === 'decurrent' && density < 0.45) { // r4-trees: < 0.8 -> < 0.45 (fuller crowns: no bare tips sticking out)
    const baseTris = buildBark(sk, d, 0).tris, B0 = opts.lod0Budget ?? 3000;
    const room = Math.floor((B0 - 10 - baseTris - 2 * Math.ceil(Math.min(d.cards.n, 1000) * density)) / 6);
    const nExtra = Math.max(0, Math.min(room, Math.round(sk.clumps.length * 3 * (1 - density))));
    for (let i = 0; i < nExtra; i++) {
      const cl = sk.clumps[i % sk.clumps.length]; const a = cl.c.clone();
      const dir = randUnit(rnd).addScaledVector(cl.out, 0.5).addScaledVector(Y, 0.6).normalize();
      let len = cl.r * (0.4 + rnd() * 0.35); const b = a.clone().addScaledVector(dir, len); // r4-trees: shorter (no bare tips poking out of the fuller crowns)
      const env = sk.env, re = env.r(clamp(b.y, env.base + 1e-3, env.top - 1e-3), Math.atan2(b.z, b.x)) * 1.02;
      if (Math.hypot(b.x, b.z) > re || b.y > env.top) { len *= 0.45; b.copy(a).addScaledVector(dir, len); } // stay inside the crown
      sk.twigs.push({ pts: [a, b], rads: [(d.clumps?.twigR ?? 0.05) * 0.45, 0.003] });
    }
  }

  CARD_MIN_Y = d.arche === 'palm' ? -Infinity : Math.max(0.03, Math.min(0.25, d.crown.base * 0.5));
  // ---- LOD geometry (metres)
  const L0 = { bark: null, leaves: null }, L1 = {}, L2 = {};
  if (d.arche === 'palm') {
    L0.bark = palmBark(sk, d, 0); L0.leaves = palmLeaves(sk, d, rnd, 0);
    L1.bark = palmBark(sk, d, 1); L1.leaves = palmLeaves(sk, d, rnd, 1);
  } else {
    L0.bark = buildBark(sk, d, 0);
    const B0 = opts.lod0Budget ?? 3000, budgetLeaves = B0 - 10 - L0.bark.tris;
    const dd = { ...d, cards: { ...d.cards, n: Math.min(d.cards.n * B0 / 3000, Math.floor(budgetLeaves / 2 / Math.max(density, 0.05))) } };
    L0.leaves = buildLeaves0(sk, dd, rnd, density);
    L1.bark = buildBark(sk, d, 1);
    if (usePuffs) { // r4-trees: volumetric puff crowns for the mid/far LODs + a dense puff core inside the near crown
      const PF = d.puff || {};
      // fit the puff crowns to where the near LOD's leaves actually are (95th-percentile radius, 3rd-percentile base)
      const lp = L0.leaves.p, rads = [], ys = []; for (let i = 0; i < lp.length; i += 3) { rads.push(Math.hypot(lp[i], lp[i + 2])); ys.push(lp[i + 1]); }
      const fit = rads.length > 60 ? { R: percentile(rads, 0.95), base: percentile(ys, 0.03) } : null;
      L0.puffs = buildPuffs(sk, d, rnd, density, Math.round((PF.n0 ?? 12) * (opts.puffK ?? 1)), { rK: PF.rK0 ?? 0.78, shell: 0.88, aoK: 0.86, core: PF.core0 ?? 1, coreY: 0.6, coreR: 0.36, fit, fistK: 0.68 });
      L1.leaves = buildPuffs(sk, d, rnd, density, Math.round((PF.n1 ?? 30) * (opts.puffK ?? 1)), { fit, aoK: 0.92, skipK: 0.2 });
      L2.trunk = trunkOnly(sk, d);
      L2.puffs = buildPuffs(sk, d, rnd, density, PF.n2 ?? 13, { core: 1, rK: 0.95, fit, aoK: 0.9, skipK: 0 });
    } else L1.leaves = buildLeaves1(sk, d, rnd, density, (opts.lod1Budget ?? 400) - 5 - L1.bark.tris);
  }
  if (!L2.puffs) L2.blob = buildBlob(sk, d, rnd, d.arche === 'palm' ? 1 : density);
  // [r7-lod] very-far LOD: the crown as 3-5 big puffs, no trunk (own random stream: LOD0-2 and hero are unchanged).
  // TreeSystem switches to it where the far LOD's lobes shrink below ~2 px (about 1.1 km on High at 1080p).
  const L3 = {}; if (L2.puffs && opts.far2 !== false) { const r3 = mulberry32(d.seed * 15485863 + 11); const lp0 = L0.leaves && L0.leaves.p; let fit3 = null;
    if (lp0 && lp0.length > 180) { const rads = [], ys = []; for (let i = 0; i < lp0.length; i += 3) { rads.push(Math.hypot(lp0[i], lp0[i + 2])); ys.push(lp0[i + 1]); } fit3 = { R: percentile(rads, 0.95), base: percentile(ys, 0.03) }; }
    L3.puffs = buildPuffs(sk, d, r3, density, d.arche === 'conifer' ? 5 : 4, { core: 1, rK: 1.12, fit: fit3, aoK: 0.9, skipK: 0, fists: false }); if (!L3.puffs.count) delete L3.puffs; }
  // r4-trees2: hero LOD (own random stream, so LOD0-2 are unchanged)
  const LH = {}, useHero = opts.hero !== false && d.arche !== 'palm';
  if (useHero) { const rh = mulberry32(d.seed * 104729 + 7); LH.leaves = buildLeavesHero(sk, d, rh, density, (opts.heroBudget ?? 14000) * (d.hero?.budgetK ?? 1)); LH.bark = buildBarkHero(sk, d, LH.leaves.ros); }

  const g0 = { bark: L0.bark.geometry(), leaves: L0.leaves.count ? L0.leaves.geometry() : null, puffs: L0.puffs?.count ? L0.puffs.geometry() : null };
  const g1 = { bark: L1.bark.geometry(), leaves: L1.leaves.count ? L1.leaves.geometry() : null };
  const g2 = L2.puffs ? { trunk: L2.trunk.geometry(), puffs: L2.puffs.geometry() } : { blob: L2.blob.geometry() };
  const g3 = L3.puffs ? { puffs: L3.puffs.geometry() } : null; // [r7-lod]
  const puff1 = !!(L1.leaves && L1.leaves.puffs);
  const gH = useHero ? { bark: LH.bark.geometry(), leaves: LH.leaves.count ? LH.leaves.geometry() : null, puffs: null } : opts.hero !== false ? { bark: g0.bark.clone(), leaves: g0.leaves ? g0.leaves.clone() : null, puffs: g0.puffs ? g0.puffs.clone() : null } : null; // palms: hero = a copy of LOD0

  // ---- normalise to height 1 using LOD0's top
  const H = maxY([g0.bark, g0.leaves].filter(Boolean));
  for (const g of [g0.bark, g0.leaves, g0.puffs, g1.bark, g1.leaves, g2.blob, g2.trunk, g2.puffs, g3?.puffs]) if (g) scaleGeo(g, 1 / H); // [r7-lod] + g3
  if (gH) for (const g of [gH.bark, gH.leaves, gH.puffs]) if (g) scaleGeo(g, 1 / H); // (cloned before LOD0 was scaled)
  const top1 = maxY([g1.bark, puff1 ? null : g1.leaves].filter(Boolean)), top2 = g2.blob ? maxY([g2.blob]) : 1;
  if (!puff1 && Math.abs(top1 - 1) > 0.01) for (const g of [g1.bark, g1.leaves]) if (g) scaleGeo(g, 1, 1 / top1, 1);
  if (g2.blob && Math.abs(top2 - 1) > 0.01) scaleGeo(g2.blob, 1, 1 / top2, 1);
  const foliage0 = g0.leaves && g0.leaves.attributes.position.count > 60 ? g0.leaves : g0.bark;
  const normRadius = percentile(radialList(foliage0), 0.95);
  const crownBase = g0.leaves && g0.leaves.attributes.position.count > 60 ? percentile(yList(g0.leaves), 0.03) : sk.env.base / H;
  // match the far LODs' crown radius to LOD0 (LOD2 is a solid blob, so it is drawn a little smaller to cover
  // the same screen area as the see-through alpha-tested crowns; factors measured with dev/assets.check.mjs --qa)
  if (g1.leaves && !puff1) { const r = percentile(radialList(g1.leaves), 0.95); if (r > 1e-4 && Math.abs(r / normRadius - 1) > 0.06) { const s = clamp(normRadius / r, 0.75, 1.3); scaleGeo(g1.leaves, s, 1, s); } }
  if (g2.blob) {
    const k2 = (d.lod2K ?? 0.9) * (d.seasonal ? 0.75 + 0.25 * density : 1);
    const r = percentile(radialList(g2.blob), 0.97); if (r > 1e-4) { const s = clamp(normRadius * k2 / r, 0.5, 1.3); scaleGeo(g2.blob, s, 1, s); }
  }
  for (const g of [g0.bark, g0.leaves, g0.puffs, g1.bark, g1.leaves, g2.blob, g2.trunk, g2.puffs, g3?.puffs, gH?.bark, gH?.leaves, gH?.puffs]) if (g) { g.computeBoundingBox(); g.computeBoundingSphere(); }

  // ---- materials (one set per species; all share the species' sway uniforms)
  const uni = makeTreeUniforms({ ...look, swayBase: clamp(crownBase * 0.55, 0.02, 0.6), typH: H });
  const leafTex = leafTexture(d.leaf, opts.leafTexSize);
  const bark = barkTexture(d.bark);
  const leafMat = patchLeaf(new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.42, alphaToCoverage: !!opts.alphaToCoverage, side: THREE.DoubleSide, roughness: look.rough ?? 0.8, metalness: 0 }), uni);
  const barkMat = patchBark(new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, roughness: 0.93, metalness: 0 }), uni);
  barkMat.normalScale.set(0.9, 0.9);
  const blobMat = patchBlob(new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 }), uni);
  leafMat.name = `tree:${id}:leaves`; barkMat.name = `tree:${id}:bark`; blobMat.name = `tree:${id}:far`;
  // r4-trees: puff materials (near-core puffs fade out as the camera closes in on them; mid/far puffs never fade)
  const puffTex = (g0.puffs || puff1 || g2.puffs) ? puffTexture(d.leaf, Math.max(256, (opts.leafTexSize ?? 1024) / 2), d.puff?.ballM ?? 3, opts.leafTexSize ?? 1024) : null; // half-res atlas: puffs are mid/far or behind cards
  const asp = d.puff?.aspect ?? 1, puffP0 = { value: new THREE.Vector4(3.4, 0.42, 0.45, asp) }, puffP1 = { value: new THREE.Vector4(0, 0.45, 0.45, asp) }; // x near-fade (radii), y ball-normal weight, z pull toward viewer
  const mkPuff = (pp, nm) => { const m = patchPuff(new THREE.MeshStandardMaterial({ map: puffTex, alphaTest: 0.42, alphaToCoverage: !!opts.alphaToCoverage, side: THREE.DoubleSide, roughness: look.rough ?? 0.8, metalness: 0 }), uni, pp); m.name = nm; return m; };
  const puffMat0 = puffTex ? mkPuff(puffP0, `tree:${id}:puff0`) : null, puffMat1 = puffTex ? mkPuff(puffP1, `tree:${id}:puff`) : null;
  const dp0 = puffTex ? makePuffDepthMaterials(uni, puffP0) : null;
  const dl = makeDepthMaterials(uni, true), db = makeDepthMaterials(uni, false);
  // r4-trees2: hero leaves use the sprig atlas (real-size leaves on small twigs)
  const heroMat = useHero && gH.leaves ? patchLeaf(new THREE.MeshStandardMaterial({ map: leafTexture(d.leaf, opts.leafTexSize, true), alphaTest: 0.42, alphaToCoverage: false /* sub-pixel leaves dithered into a visible dot grid under A2C */, side: THREE.DoubleSide, roughness: Math.max(0.75, look.rough ?? 0.8), metalness: 0 }), uni) : null;
  if (heroMat) heroMat.name = `tree:${id}:hero`;
  const dh = heroMat ? makeDepthMaterials(uni, true) : null;
  const P = (geometry, material, kind, dm) => ({ geometry, material, kind, depthMaterial: dm ? dm.depth : null, distanceMaterial: dm ? dm.distance : null, castShadow: true, receiveShadow: true });
  const lod = (parts) => ({ parts, triangles: parts.reduce((s, p) => s + triCount(p.geometry), 0) });
  const lodH = gH ? lod([P(gH.bark, barkMat, 'bark', db), ...(gH.leaves ? [P(gH.leaves, heroMat || leafMat, 'leaves', heroMat ? dh : dl)] : []), ...(gH.puffs ? [P(gH.puffs, puffMat0, 'puffs', dp0)] : [])]) : null;
  const lods = [
    lod([P(g0.bark, barkMat, 'bark', db), ...(g0.leaves ? [P(g0.leaves, leafMat, 'leaves', dl)] : []), ...(g0.puffs ? [P(g0.puffs, puffMat0, 'puffs', dp0)] : [])]),
    lod([P(g1.bark, barkMat, 'bark', db), ...(g1.leaves ? [puff1 ? P(g1.leaves, puffMat1, 'puffs', null) : P(g1.leaves, leafMat, 'leaves', dl)] : [])]),
    g2.puffs ? lod([P(g2.trunk, barkMat, 'bark', null), P(g2.puffs, puffMat1, 'puffs', null)]) : lod([P(g2.blob, blobMat, 'far', null)]),
  ];
  if (g3) lods.push(lod([P(g3.puffs, puffMat1, 'puffs', null)])); // [r7-lod] lods = [near, mid, far, far2]
  if (lodH) lods.unshift(lodH); // r4-trees2: lods = [hero, near, mid, far] (TreeSystem adds the hero distance)
  const trunkRadius = sk.trunks[0].rads[Math.min(1, sk.trunks[0].rads.length - 1)] / H;
  return {
    id, name: d.name, lods, far2: !!g3, normHeight: 1, normRadius, crownBase, trunkRadius, // [r7-lod] far2: lods end with the very-far puff LOD
    typical: { ...d.typical }, season, leafDensity: density, uniforms: uni, materials: [barkMat, leafMat, blobMat, ...(puffMat0 ? [puffMat0, puffMat1] : []), ...(heroMat ? [heroMat] : [])], hero: !!lodH,
  };
}

// ---------------------------------------------------------------- public API
export const TREE_SPECIES = Object.keys(SPECIES_DEF);

export function createTreeLibrary({ season = 'late-autumn', leafTexSize = 2048, alphaToCoverage = true, lod0Budget = 3000, lod1Budget = 400, only = null, puffs = true, puffK = 1, hero = true, heroBudget = 14000 } = {}) { // r4-trees2: hero = 3D-cluster LOD for nearby trees
  if (!SEASONS.includes(season)) throw new Error(`createTreeLibrary: unknown season '${season}' (${SEASONS.join(', ')})`);
  const species = {};
  for (const [id, d] of Object.entries(SPECIES_DEF)) { if (only && !only.includes(id)) continue; species[id] = buildSpecies(id, d, season, { leafTexSize, alphaToCoverage, lod0Budget, lod1Budget, puffs, puffK, hero, heroBudget }); }
  let lastTime = U.uTime.value, clock = 0;
  const baseDir = TREE_WIND_DIR.value.clone();
  return {
    species, season,
    lodDistances: TREE_LOD_DISTANCES.slice(),
    update(dt) {
      // advance the shared clock only if nobody else does (the engine/harness normally adds dt to U.uTime)
      if (U.uTime.value === lastTime) U.uTime.value += dt;
      lastTime = U.uTime.value; clock += dt;
      const a = Math.sin(clock * 0.021) * 0.18 + Math.sin(clock * 0.0073) * 0.1; // slow veer, about ±15°
      const c = Math.cos(a), s = Math.sin(a);
      TREE_WIND_DIR.value.set(baseDir.x * c - baseDir.y * s, baseDir.x * s + baseDir.y * c);
    },
    // thin twigs whose projected width drops below ~0.75 px are culled in the bark shader (no shimmering sticks)
    setViewportHeight(px) { TREE_VIEW.value = px; },
    dispose() {
      for (const sp of Object.values(species)) { for (const l of sp.lods) for (const p of l.parts) { p.geometry.dispose(); p.depthMaterial?.dispose(); p.distanceMaterial?.dispose(); } for (const m of sp.materials) m.dispose(); }
    },
  };
}

// Convenience: build InstancedMeshes for one LOD with the shadow materials wired up.
export function makeInstancedLOD(lod, count) {
  const group = new THREE.Group();
  for (const p of lod.parts) {
    const m = new THREE.InstancedMesh(p.geometry, p.material, count);
    applyTreePart(m, p);
    group.add(m);
  }
  return group;
}
export function applyTreePart(mesh, part) {
  if (part.depthMaterial) mesh.customDepthMaterial = part.depthMaterial;
  if (part.distanceMaterial) mesh.customDistanceMaterial = part.distanceMaterial;
  mesh.castShadow = part.castShadow !== false; mesh.receiveShadow = part.receiveShadow !== false;
  mesh.name = part.material.name;
  return mesh;
}

// Debug: skeleton statistics for one species (no textures/materials), used by dev QA.
export function debugSkeleton(id, season = 'late-autumn') {
  let d = SPECIES_DEF[id]; d = { ...d, cardM: (LEAF_KINDS[d.leaf]?.cellM ?? 1) * (d.cardK ?? 1) };
  const rnd = mulberry32(d.seed * 7919 + 17);
  const sk = d.arche === 'conifer' ? genConifer(d, rnd) : d.arche === 'pollard' ? genPollard(d, rnd) : d.arche === 'palm' ? buildPalm(d, rnd) : genDecurrent(d, rnd);
  const elev = (a, b) => Math.round(Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)) * 180 / Math.PI);
  const prim = sk.limbs.filter((l) => !l.thin), sec = sk.limbs.filter((l) => l.thin);
  const hist = (vals, lo, hi, n = 8) => { const h = new Array(n).fill(0); for (const v of vals) h[Math.min(n - 1, Math.max(0, Math.floor((v - lo) / (hi - lo) * n)))]++; return h.join(' '); };
  const env = sk.env;
  return {
    trunkTop: +sk.trunks[0].pts.at(-1).y.toFixed(2),
    primaries: prim.map((l) => ({ y0: +l.pts[0].y.toFixed(1), end: l.pts.at(-1).toArray().map((v) => +v.toFixed(1)), elev: elev(l.pts[0], l.pts.at(-1)), firstSeg: elev(l.pts[0], l.pts[1]) })),
    secondaryElev: hist(sec.map((l) => elev(l.pts[0], l.pts.at(-1))), -60, 90, 6),
    clumps: sk.clumps.length,
    clumpHeight: hist(sk.clumps.map((c) => (c.c.y - env.base) / (env.top - env.base)), 0, 1),
    clumpRadial: hist(sk.clumps.map((c) => Math.hypot(c.c.x, c.c.z) / Math.max(0.1, env.r(clamp(c.c.y, env.base + 1e-3, env.top - 1e-3), Math.atan2(c.c.z, c.c.x)))), 0, 1.2),
  };
}
