// Garments for the near-LOD people: real cloth shells instead of colour painted on the skin.
// Built once per body (f/m) and outfit at load/first use from the body mesh itself: the covered region is copied, pushed
// off the skin by a per-garment fit profile (loose hoodie torso, snug ribbed cuffs, straight jeans legs, flared shorts),
// relaxed so it bridges the body's concavities like fabric instead of following every muscle, hem/cuff edges snapped
// straight and turned under (visible cloth thickness), and skinned with the body's own weights. Skirts are lathed and
// hang from the hips with soft thigh weights. Body triangles hidden under the clothes are dropped from that outfit's
// body index (no poke-through, fewer triangles). One merged geometry per outfit key = one draw call for all clothes.
// The clothing shader (outfitMaterial) adds fabric: denim fades, seams, back pockets and stitching, fleece, ribbing,
// kangaroo pockets, puffer quilting, flannel plaid, chest prints, and procedural fold/crease bump detail.
import * as THREE from 'three';
import { REG } from './assets.js';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// top kinds / bottom kinds (ids are shader constants too)
export const TOP = { tee: 1, long: 2, hoodie: 3, crew: 4, jacket: 5, puffer: 6, flannel: 7 };
export const BOT = { jeans: 1, chinos: 2, joggers: 3, shorts: 4, skirt: 5, leggings: 6 };
const TOP_FIT = { // base offset, lower-torso blousing, hem drop below waist, ribbed hem/cuffs
  1: { base: 0.009, loose: 0.009, drop: 0.07, rib: 0 }, 2: { base: 0.009, loose: 0.008, drop: 0.07, rib: 0 }, 3: { base: 0.02, loose: 0.016, drop: 0.095, rib: 1 },
  4: { base: 0.015, loose: 0.01, drop: 0.085, rib: 1 }, 5: { base: 0.024, loose: 0.01, drop: 0.095, rib: 0 }, 6: { base: 0.04, loose: 0.006, drop: 0.09, rib: 1 }, 7: { base: 0.015, loose: 0.012, drop: 0.095, rib: 0 },
};

// per-body cache of derived data (welding, adjacency, chain lengths)
const _bodyInfo = new WeakMap();
function info(B) {
  let I = _bodyInfo.get(B); if (I) return I;
  const g = B.body.geometry, P = g.attributes.position, N = P.count, ix = g.index.array; const canon = g.userData.canon || Int32Array.from({ length: N }, (_, i) => i);
  const nb = Array.from({ length: N }, () => []); const seen = new Set();
  for (let f = 0; f < ix.length; f += 3) for (let e = 0; e < 3; e++) { const a = canon[ix[f + e]], b = canon[ix[f + (e + 1) % 3]]; if (a === b) continue; const k = a < b ? a * N + b : b * N + a; if (seen.has(k)) continue; seen.add(k); nb[a].push(b); nb[b].push(a); }
  const J = B.J; const chain = (s, limb) => limb === 'arm' ? [J['upperarm_' + s], J['lowerarm_' + s], J['hand_' + s]] : [J['thigh_' + s], J['calf_' + s], J['foot_' + s]];
  I = { canon, nb, chain }; _bodyInfo.set(B, I); return I;
}
// move p along its limb chain so that the chain coordinate becomes t1 (straight hems/cuffs)
function slideChain(p, t0, t1, C) {
  const l1 = C[0].distanceTo(C[1]), l2 = C[1].distanceTo(C[2]); const L = l1 + l2; const tm = (t0 + t1) / 2 * L;
  const d = tm < l1 ? new THREE.Vector3().subVectors(C[1], C[0]).normalize() : new THREE.Vector3().subVectors(C[2], C[1]).normalize();
  return p.addScaledVector(d, (t1 - t0) * L);
}

// ---------------------------------------------------------------- shell from the body
// fit(i, p, n, reg, t) -> offset in metres, or -1 when the vertex isn't covered. cut(i, reg, t, p) -> snap function for boundary vertices.
function shell(B, part, fit, snap, opts = {}) {
  const I = info(B); const g = B.body.geometry; const P = g.attributes.position, NA = g.attributes.normal, CL = g.attributes.aCloth, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight; const ix = g.index.array; const N = P.count;
  const off = new Float32Array(N).fill(-1); const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < N; i++) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(NA, i); off[i] = fit(i, p, n, CL.getX(i), CL.getY(i)); }
  // faces: all three corners covered
  const faces = []; for (let f = 0; f < ix.length; f += 3) if (off[ix[f]] >= 0 && off[ix[f + 1]] >= 0 && off[ix[f + 2]] >= 0) faces.push(ix[f], ix[f + 1], ix[f + 2]);
  const canon = I.canon;
  // boundary (welded) edges and vertices
  const ecount = new Map(); const ek = (a, b) => (a < b ? a * N + b : b * N + a);
  for (let f = 0; f < faces.length; f += 3) for (let e = 0; e < 3; e++) { const a = canon[faces[f + e]], b = canon[faces[f + (e + 1) % 3]]; const k = ek(a, b); ecount.set(k, (ecount.get(k) || 0) + 1); }
  const bnd = new Uint8Array(N); const bEdges = [];
  for (let f = 0; f < faces.length; f += 3) for (let e = 0; e < 3; e++) { const ra = faces[f + e], rb = faces[f + (e + 1) % 3]; const a = canon[ra], b = canon[rb]; if (ecount.get(ek(a, b)) === 1) { bnd[a] = 1; bnd[b] = 1; bEdges.push(ra, rb, faces[f + (e + 2) % 3]); } }
  // welded working positions: body + normal * offset, then relax (fabric bridges hollows), never closer than minK*offset
  const used = new Uint8Array(N); for (const v of faces) used[canon[v]] = 1;
  const base = new Map(), cur = new Map(), nrm = new Map(), offC = new Map();
  for (let i = 0; i < N; i++) if (used[i]) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(NA, i); base.set(i, p.clone()); nrm.set(i, n.clone()); offC.set(i, off[i]); cur.set(i, p.clone().addScaledVector(n, off[i])); }
  const minK = opts.minK ?? 0.55, iters = opts.relax ?? 6; const tmp = new THREE.Vector3(), d = new THREE.Vector3();
  for (let it = 0; it < iters; it++) {
    const next = new Map();
    for (const [i, c] of cur) {
      if (bnd[i]) { next.set(i, c); continue; }
      let k = 0; tmp.set(0, 0, 0); for (const j of I.nb[i]) { const q = cur.get(j); if (q) { tmp.add(q); k++; } }
      if (!k) { next.set(i, c); continue; } tmp.multiplyScalar(1 / k); const q = c.clone().lerp(tmp, 0.5);
      const b = base.get(i), nn = nrm.get(i), o = offC.get(i); d.subVectors(q, b); const h = d.dot(nn);
      const lo = o * minK, hi = o + 0.02; if (h < lo) q.addScaledVector(nn, lo - h); else if (h > hi) q.addScaledVector(nn, hi - h);
      // keep the shell over its own skin point (skin weights stay valid)
      d.subVectors(q, b); const tang = d.clone().addScaledVector(nn, -d.dot(nn)); if (tang.length() > 0.012) q.addScaledVector(tang, -(1 - 0.012 / tang.length()));
      next.set(i, q);
    }
    for (const [i, q] of next) cur.set(i, q);
  }
  // snap boundary vertices onto their cut (straight hems)
  for (let i = 0; i < N; i++) if (bnd[i] && used[i] && snap) snap(cur.get(i), CL.getX(i), CL.getY(i), base.get(i), i);
  // then relax every open edge along itself (necklines and anything unsnapped become clean curves, not sawtooth)
  { const bn = new Map(); for (let e = 0; e < bEdges.length; e += 3) { const a = canon[bEdges[e]], b = canon[bEdges[e + 1]]; if (!bn.has(a)) bn.set(a, []); if (!bn.has(b)) bn.set(b, []); bn.get(a).push(b); bn.get(b).push(a); }
    for (let it = 0; it < (opts.edgeRelax ?? 4); it++) { const nx = new Map(); for (const [i, l] of bn) { if (l.length !== 2) continue; const a = cur.get(l[0]), b = cur.get(l[1]), c = cur.get(i); nx.set(i, c.clone().multiplyScalar(0.5).addScaledVector(a, 0.25).addScaledVector(b, 0.25)); } for (const [i, q] of nx) cur.get(i).copy(q); } }
  // ring distance from the boundary (for hiding the body underneath, and ribbing masks)
  const ring = new Map(); let front = []; for (const [i] of cur) if (bnd[i]) { ring.set(i, 0); front.push(i); }
  for (let r = 1; r < 4 && front.length; r++) { const nf = []; for (const i of front) for (const j of I.nb[i]) if (cur.has(j) && !ring.has(j)) { ring.set(j, r); nf.push(j); } front = nf; }
  // ---- emit: unwelded vertices (keep the body's seams so normals can be welded the same way)
  const map = new Map(); const pos = [], nor = [], sIdx = [], sWt = [], gat = [];
  const vid = (ri) => { let v = map.get(ri); if (v != null) return v; v = pos.length / 3; map.set(ri, v); const c = cur.get(canon[ri]); pos.push(c.x, c.y, c.z); nor.push(0, 0, 0);
    for (let k = 0; k < 4; k++) { sIdx.push(SI.getComponent(ri, k)); sWt.push(SW.getComponent(ri, k)); } gat.push(part, CL.getX(ri), CL.getY(ri), Math.min(3, ring.get(canon[ri]) ?? 3)); return v; };
  const idx = []; for (const v of faces) idx.push(vid(v));
  // welded face normals
  const wn = new Map(); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < faces.length; f += 3) { const A = cur.get(canon[faces[f]]), Bv = cur.get(canon[faces[f + 1]]), C = cur.get(canon[faces[f + 2]]); a.subVectors(Bv, A); b.subVectors(C, A); a.cross(b);
    for (let e = 0; e < 3; e++) { const k = canon[faces[f + e]]; const s = wn.get(k) || wn.set(k, new THREE.Vector3()).get(k); s.add(a); } }
  for (const [ri, v] of map) { const s = wn.get(canon[ri]).clone().normalize(); nor[v * 3] = s.x; nor[v * 3 + 1] = s.y; nor[v * 3 + 2] = s.z; }
  // ---- turn-under band at every open edge: a strip from the hem back toward the skin, so the cloth has thickness
  for (let e = 0; e < bEdges.length; e += 3) {
    const ra = bEdges[e], rb = bEdges[e + 1], rc = bEdges[e + 2]; const va = vid(ra), vb = vid(rb);
    const A = cur.get(canon[ra]), Bv = cur.get(canon[rb]), C = cur.get(canon[rc]);
    const mid = A.clone().add(Bv).multiplyScalar(0.5); const inward = C.clone().sub(mid); // toward the garment interior
    const out = [];
    for (const [ri, V] of [[ra, A], [rb, Bv]]) {
      const bi = canon[ri], bp = base.get(bi), nn = nrm.get(bi); const depth = V.clone().sub(bp).dot(nn);
      const q = V.clone().addScaledVector(nn, -Math.max(0, depth - 0.004)).addScaledVector(inward.clone().normalize(), 0.006);
      const v = pos.length / 3; pos.push(q.x, q.y, q.z); const en = inward.clone().normalize().negate(); nor.push(en.x, en.y, en.z);
      for (let k = 0; k < 4; k++) { sIdx.push(SI.getComponent(ri, k)); sWt.push(SW.getComponent(ri, k)); } gat.push(part, CL.getX(ri), CL.getY(ri), 0); out.push(v);
    }
    idx.push(va, vb, out[1], va, out[1], out[0]);
  }
  // covered body faces (to drop from the body index): fully inside, at least 2 rings from any open edge
  const hide = new Set(); for (let f = 0; f < ix.length; f += 3) { let ok = true; for (let e = 0; e < 3; e++) { const c = canon[ix[f + e]]; const r = cur.has(c) ? (ring.get(c) ?? 9) : -1; if (r < 2) { ok = false; break; } } if (ok) hide.add(f); }
  return { pos, nor, sIdx, sWt, gat, idx, hide };
}

// ---------------------------------------------------------------- garment specs
function topFit(B, kind, sleeve) {
  const J = B.J, F = TOP_FIT[kind] || TOP_FIT[1];
  const hemY = Math.max(B.waistY - F.drop, J.thigh_l.y + 0.035), chestY = J.spine_03.y, nk = B.neckR; const nY = B.collarY;
  const open = false; // (open fronts tore at the placket; jackets are zipped, flannels buttoned: see the shader)
  const fit = (i, p, n, reg, t) => {
    if (reg === REG.TRUNK) {
      if (p.y < hemY) return -1;
      const neckDrop = kind === TOP.tee || kind === TOP.long ? 0.026 : kind === TOP.hoodie ? 0.0 : 0.016; // crew necks dip at the front
      const front = Math.max(0, p.z - J.neck_01.z);
      if (p.y > nY - front * (neckDrop > 0 ? 0.55 : 0.25) - (front > 0.02 ? neckDrop * Math.min(1, front / 0.06) : 0) && Math.hypot(p.x - J.neck_01.x, p.z - J.neck_01.z) < nk * (kind === TOP.hoodie || kind === TOP.puffer ? 1.18 : 1.05)) return -1;
      if (open && p.z > J.spine_02.z + 0.02 && Math.abs(p.x) < (kind === TOP.flannel ? 0.05 : 0.03) + Math.max(0, p.y - chestY) * 0.5) return -1; // open front shows the shirt underneath
      let o = F.base + F.loose * sstep(chestY, hemY + 0.06, p.y) * (p.z > 0 ? 1 : 0.6);
      if (F.rib) o = THREE.MathUtils.lerp(o, F.base * 0.75, sstep(hemY + 0.06, hemY + 0.02, p.y));
      if (kind === TOP.hoodie && p.z > J.spine_02.z + 0.03 && p.y < B.waistY + 0.15 && p.y > B.waistY - 0.07 && Math.abs(p.x) < 0.14 - (p.y - B.waistY + 0.07) * 0.18) o += 0.007; // kangaroo pocket
      if (kind === TOP.puffer) o += 0.013 * Math.pow(Math.abs(Math.sin(Math.PI * (p.y - hemY) / 0.105)), 0.6);
      return o;
    }
    if (reg === REG.ARM) {
      if (t > sleeve) return -1;
      let o = F.base + 0.004;
      if (sleeve < 0.6) o += 0.012 * sstep(sleeve - 0.12, sleeve, t); // short sleeves stand off the arm
      else { o += 0.007 * sstep(0.62, 0.84, t) * (1 - sstep(0.88, 0.93, t)); if (F.rib) o = THREE.MathUtils.lerp(o, F.base * 0.6, sstep(sleeve - 0.07, sleeve - 0.03, t)); }
      if (kind === TOP.puffer) o += 0.012 * Math.pow(Math.abs(Math.sin(Math.PI * t / 0.13)), 0.6);
      return o;
    }
    return -1;
  };
  return { fit, hemY };
}
function topShell(B, kind, sleeve) {
  const I = info(B); const { fit, hemY } = topFit(B, kind, sleeve);
  const J = B.J; const open = false; const cutX = (y) => (kind === TOP.flannel ? 0.05 : 0.03) + Math.max(0, y - J.spine_03.y) * 0.5;
  const snap = (c, reg, t, b) => {
    if (reg === REG.ARM && Math.abs(t - sleeve) < 0.08) { const s = b.x > 0 ? 'l' : 'r'; slideChain(c, t, sleeve, I.chain(s, 'arm')); }
    else if (open && reg === REG.TRUNK && b.z > J.spine_02.z + 0.02 && Math.abs(b.x) < cutX(b.y) + 0.035 && b.y > hemY + 0.01) c.x = Math.sign(b.x || 1) * (cutX(b.y) + 0.002); // straight placket
    else if (reg === REG.TRUNK && c.y < hemY + 0.03 && Math.abs(b.x) > 0.035) c.y = hemY - (open ? 0.01 : 0);
  };
  return shell(B, 0, fit, snap, { minK: kind === TOP.puffer ? 0.8 : 0.5, relax: kind === TOP.tee || kind === TOP.long ? 5 : 7 });
}
function bottomShell(B, kind, leg) {
  const J = B.J; const I = info(B); const riseY = B.waistY + (kind === BOT.joggers ? 0.035 : 0.015);
  const fit = (i, p, n, reg, t) => {
    if (reg === REG.TRUNK) { if (p.y > riseY) return -1; return (kind === BOT.joggers ? 0.012 : 0.008) + 0.004 * sstep(riseY, riseY - 0.12, p.y); }
    if (reg === REG.LEG) {
      if (t > leg) return -1;
      if (kind === BOT.jeans) return 0.011 + 0.017 * sstep(0.42, 0.95, t) + (t > 0.86 ? 0.004 * Math.max(0, Math.sin((t - 0.86) * 95)) : 0);
      if (kind === BOT.chinos) return 0.01 + 0.011 * sstep(0.42, 0.9, t);
      if (kind === BOT.joggers) { const g = t > 0.82 && t < 0.935 ? 0.0035 * Math.pow(Math.sin((t - 0.82) * 82), 2) : 0; return t > 0.935 ? 0.008 : 0.017 + 0.006 * sstep(0.4, 0.8, t) + g; }
      if (kind === BOT.shorts) return 0.016 + 0.02 * sstep(leg - 0.2, leg, t);
      return 0.01;
    }
    return -1;
  };
  const snap = (c, reg, t, b) => { if (reg === REG.LEG && Math.abs(t - leg) < 0.08) { const s = b.x > 0 ? 'l' : 'r'; slideChain(c, t, leg, I.chain(s, 'leg')); } else if (reg === REG.TRUNK && c.y > riseY - 0.05) c.y = riseY; };
  return shell(B, 1, fit, snap, { minK: 0.6, relax: 5 });
}
// backpack straps: bands of the body surface over each shoulder, riding 7 mm above whatever top is worn
function strapShell(B, kind, sleeve) {
  const J = B.J; const { fit } = topFit(B, kind, sleeve); const fem = B.sex === 'f'; const xs = fem ? 0.085 : 0.095; const zMid = J.spine_03.z; const packTop = J.spine_02.y + 0.24;
  const f = (i, p, n, reg, t) => {
    if (reg !== REG.TRUNK) return -1;
    const s = p.x > 0 ? 1 : -1; const front = p.z > zMid;
    const lo = J.spine_02.y + 0.04; const cx = front ? xs + Math.max(0, lo - p.y) * 1.3 : xs + Math.max(0, packTop - p.y) * 0.3; if (Math.abs(Math.abs(p.x) - cx) > 0.021) return -1;
    if (front ? p.y < J.spine_02.y - 0.07 || cx > 0.2 : p.y < packTop) return -1;
    const o = Math.max(0, fit(i, p, n, REG.TRUNK, 0)); return o + 0.011;
  };
  const snap = (c, reg, t, b) => { const s = b.x > 0 ? 1 : -1; const front = b.z > zMid; const cx = front ? xs : xs + Math.max(0, packTop - b.y) * 0.3; const e = Math.abs(b.x) - cx;
    if (Math.abs(b.z - zMid) < 0.06 && b.y > J.spine_03.y + 0.05) return; if (!front && b.y < packTop + 0.02) c.y = packTop; else if (!front && Math.abs(e) > 0.008) c.x = s * (cx + Math.sign(e) * 0.021); };
  const r = shell(B, 3, f, snap, { minK: 0.85, relax: 3, edgeRelax: 2 }); r.hide = new Set(); return r;
}
// messenger-bag strap: a diagonal band from the left hip over the right shoulder, front and back
function sashShell(B, kind, sleeve) {
  const J = B.J; const { fit } = topFit(B, kind, sleeve); const A = [0.17, J.pelvis.y + 0.06], C = [-0.115, J.spine_03.y + 0.16]; const dx = C[0] - A[0], dy = C[1] - A[1], L = Math.hypot(dx, dy);
  const f = (i, p, n, reg, t) => { if (reg !== REG.TRUNK) return -1; const u = ((p.x - A[0]) * dx + (p.y - A[1]) * dy) / (L * L); if (u < 0 || u > 1.15) return -1;
    const dist = Math.abs((p.x - A[0]) * dy - (p.y - A[1]) * dx) / L; if (dist > 0.023) return -1; return Math.max(0, fit(i, p, n, REG.TRUNK, 0)) + 0.01; };
  const r = shell(B, 3, f, null, { minK: 0.85, relax: 3, edgeRelax: 6 }); r.hide = new Set(); return r;
}
// lathed skirt hanging from the hips; soft weights to the thighs so it follows the stride
function skirtShell(B, len) {
  const J = B.J, g = B.body.geometry, P = g.attributes.position, CL = g.attributes.aCloth; const bones = B.body.skeleton.bones; const bi = (n) => bones.findIndex((b) => b.name === n);
  const iPel = bi('pelvis'), iTL = bi('thigh_l'), iTR = bi('thigh_r');
  const top = B.waistY + 0.015, hipY = J.thigh_l.y, bot = hipY - len; const SEG = 30, RINGS = 9; const cz = J.pelvis.z;
  // body radius per angle bin and height band (max), then the skirt hangs from the widest point above each height
  const bins = Array.from({ length: RINGS }, () => new Float32Array(SEG));
  const ys = Array.from({ length: RINGS }, (_, k) => top + (bot - top) * Math.pow(k / (RINGS - 1), 0.85));
  const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { const r = CL.getX(i); if (r !== REG.TRUNK && r !== REG.LEG) continue; v.fromBufferAttribute(P, i); if (v.y > top + 0.02 || v.y < bot - 0.02) continue;
    const a = Math.atan2(v.x, v.z - cz); const s = Math.floor(((a / (Math.PI * 2)) + 1) % 1 * SEG) % SEG; const rad = Math.hypot(v.x, v.z - cz);
    for (let k = 0; k < RINGS; k++) if (Math.abs(v.y - ys[k]) < 0.035) bins[k][s] = Math.max(bins[k][s], rad); }
  for (let k = 0; k < RINGS; k++) { const b = bins[k]; const c = b.slice(); for (let s = 0; s < SEG; s++) b[s] = Math.max(c[s], 0.7 * Math.max(c[(s + 1) % SEG], c[(s + SEG - 1) % SEG])); }
  const pos = [], nor = [], sIdx = [], sWt = [], gat = [], idx = []; const run = new Float32Array(SEG);
  for (let k = 0; k < RINGS; k++) for (let s = 0; s < SEG; s++) {
    run[s] = Math.max(run[s], bins[k][s] || run[s] || 0.12); const a = (s / SEG) * Math.PI * 2; const depth = (top - ys[k]);
    const r = run[s] + 0.012 + 0.11 * Math.max(0, depth - 0.12) * (len > 0.4 ? 0.7 : 1);
    pos.push(Math.sin(a) * r, ys[k], cz + Math.cos(a) * r); nor.push(Math.sin(a), 0.15, Math.cos(a));
    const w = 0.5 * sstep(hipY, bot, ys[k]); const side = Math.min(1, Math.max(0, 0.5 + Math.sin(a) * 0.8));
    sIdx.push(iPel, iTL, iTR, 0); sWt.push(1 - w, w * side, w * (1 - side), 0); gat.push(2, 1, k / (RINGS - 1), k === 0 ? 0 : 3);
  }
  for (let k = 0; k < RINGS - 1; k++) for (let s = 0; s < SEG; s++) { const a = k * SEG + s, b = k * SEG + (s + 1) % SEG; idx.push(a, b, a + SEG, b, b + SEG, a + SEG); }
  // hem thickness: an inner ring a little up and in
  const o = pos.length / 3; const L = (RINGS - 1) * SEG;
  for (let s = 0; s < SEG; s++) { const x = pos[(L + s) * 3], y = pos[(L + s) * 3 + 1], z = pos[(L + s) * 3 + 2]; const dx = x, dz = z - cz; const l = Math.hypot(dx, dz); pos.push(x - dx / l * 0.006, y + 0.008, z - dz / l * 0.006); nor.push(0, -1, 0); for (let q = 0; q < 4; q++) { sIdx.push(sIdx[(L + s) * 4 + q]); sWt.push(sWt[(L + s) * 4 + q]); } gat.push(2, 1, 1, 0); }
  for (let s = 0; s < SEG; s++) { const a = L + s, b = L + (s + 1) % SEG; idx.push(a, o + s, b, b, o + s, o + (s + 1) % SEG); }
  return { pos, nor, sIdx, sWt, gat, idx, hide: new Set() };
}

// ---------------------------------------------------------------- parts (cached per body + key, no combinatorial outfits)
// A character wears up to three garment meshes (top, bottom, straps) sharing one material, plus a body index that drops the
// triangles hidden under that top + bottom. Each part is built once per body on first use (~20-60 ms) or ahead of time by
// prebuildParts() in idle slices after load; tee sleeves, shorts and skirt lengths are quantised so the cache stays small.
const _parts = new Map(), _bodyIdx = new Map();
function toGeometry(p) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(p.sIdx, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(p.sWt, 4)); g.setAttribute('aGarm', new THREE.Float32BufferAttribute(p.gat, 4));
  g.setIndex(p.idx); g.computeBoundingSphere(); g.userData.hide = p.hide; return g;
}
export function partKey(type, kind, len) { return `${type}:${kind}:${len.toFixed(2)}`; }
export function garmentPart(B, type, kind, len) {
  const key = B.sex + '|' + partKey(type, kind, len); let g = _parts.get(key); if (g) return g;
  const p = type === 'top' ? topShell(B, kind, len) : type === 'strap' ? strapShell(B, kind, len) : type === 'sash' ? sashShell(B, kind, len) : kind === BOT.skirt ? skirtShell(B, len) : bottomShell(B, kind, len);
  g = toGeometry(p); _parts.set(key, g); return g;
}
export function hasPart(B, type, kind, len) { return _parts.has(B.sex + '|' + partKey(type, kind, len)); }
// body geometry for a top + bottom: same attributes, minus hidden triangles and the feet (inside the kit's shoes)
export function bodyFor(B, top, bot) {
  const key = B.sex + '|' + (top ? top.uuid : '-') + '|' + (bot ? bot.uuid : '-'); let body = _bodyIdx.get(key); if (body) return body;
  const hide = new Set(); for (const g of [top, bot]) if (g && g.userData.hide) for (const h of g.userData.hide) hide.add(h);
  const bg = B.body.geometry; const bix = bg.index.array; const keep = []; const BP = bg.attributes.position, BC = bg.attributes.aCloth; const fy = B.shoeY - 0.012;
  const foot = (i) => BC.getX(i) === REG.LEG && BP.getY(i) < fy;
  for (let f = 0; f < bix.length; f += 3) if (!hide.has(f) && !(foot(bix[f]) && foot(bix[f + 1]) && foot(bix[f + 2]))) keep.push(bix[f], bix[f + 1], bix[f + 2]);
  body = new THREE.BufferGeometry(); for (const [k, a] of Object.entries(bg.attributes)) body.setAttribute(k, a); body.setIndex(keep); body.boundingSphere = bg.boundingSphere; body.boundingBox = bg.boundingBox;
  _bodyIdx.set(key, body); return body;
}
// quantised garment choices
export const SLEEVE = { tee: [0.4, 0.46], long: 0.94, outer: 0.955 }, LEG = { jeans: 0.985, chinos: 0.975, joggers: 0.965, shorts: [0.36, 0.43], skirt: [0.22, 0.3, 0.42] };
// build the common parts ahead of time, one per idle slice, so the first people to walk up don't hitch the frame
export function prebuildParts(B, budgetMs = 12) {
  const todo = [];
  for (const k of [TOP.hoodie, TOP.crew, TOP.jacket, TOP.puffer, TOP.flannel, TOP.long]) { const sl = k === TOP.jacket || k === TOP.puffer ? SLEEVE.outer : SLEEVE.long; todo.push(['top', k, sl], ['strap', k, sl], ['sash', k, sl]); }
  for (const sl of SLEEVE.tee) todo.push(['top', TOP.tee, sl], ['strap', TOP.tee, sl], ['sash', TOP.tee, sl]);
  todo.push(['bot', BOT.jeans, LEG.jeans], ['bot', BOT.chinos, LEG.chinos], ['bot', BOT.joggers, LEG.joggers]); for (const l of LEG.shorts) todo.push(['bot', BOT.shorts, l]); if (B.sex === 'f') for (const l of LEG.skirt) todo.push(['bot', BOT.skirt, l]);
  const step = () => { const t0 = performance.now(); while (todo.length && performance.now() - t0 < budgetMs) { const [t, k, l] = todo.shift(); if (!hasPart(B, t, k, l)) garmentPart(B, t, k, l); } if (todo.length) setTimeout(step, 60); };
  setTimeout(step, 400);
}

// ---------------------------------------------------------------- clothing material
let _printTex = null;
function printAtlas() { // 4 chest prints in a 512x256 canvas (2x2): CAL script, BERKELEY arc, UC BERKELEY block, bear + CAL
  if (_printTex || typeof document === 'undefined') return _printTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.clearRect(0, 0, 512, 256); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'italic bold 100px Georgia, serif'; x.fillText('Cal', 128, 66);
  x.font = 'bold 50px Arial, sans-serif'; x.fillText('BERKELEY', 384, 64);
  x.font = 'bold 92px Georgia, serif'; x.fillText('CAL', 128, 196);
  x.font = 'bold 48px Georgia, serif'; x.fillText('BERKELEY', 384, 184); x.fillRect(290, 222, 188, 5); x.fillRect(290, 140, 188, 5);
  _printTex = new THREE.CanvasTexture(c); _printTex.colorSpace = THREE.NoColorSpace; _printTex.anisotropy = 4; _printTex.generateMipmaps = true; return _printTex;
}
export function outfitMaterial(B) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, side: THREE.DoubleSide, name: 'people:outfit' });
  const J = B.J;
  const u = { uTopA: { value: new THREE.Color(0.2, 0.25, 0.4) }, uTopB: { value: new THREE.Color(0.9, 0.9, 0.9) }, uBotA: { value: new THREE.Color(0.1, 0.12, 0.2) }, uBotB: { value: new THREE.Color(0.6, 0.5, 0.3) },
    uKind: { value: new THREE.Vector4(1, 1, -1, 0) }, // top kind, bottom kind, print index (-1 none), seed
    uPrintCol: { value: new THREE.Color(0.95, 0.75, 0.2) }, uPrint: { value: printAtlas() }, uStrap: { value: new THREE.Color(0.05, 0.05, 0.06) },
    uJ: { value: new THREE.Vector4(B.waistY, J.spine_03.y, J.pelvis.y, J.thigh_l.y) }, uJ2: { value: new THREE.Vector4(J.spine_02.z, J.neck_01.y, B.collarY, J.pelvis.z) } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec4 aGarm; varying vec4 vGarm; varying vec3 vBind; varying vec3 vBindN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 vGarm = aGarm; vBind = position; vBindN = normal;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uTopA, uTopB, uBotA, uBotB, uPrintCol, uStrap; uniform vec4 uKind, uJ, uJ2; uniform sampler2D uPrint;
varying vec4 vGarm; varying vec3 vBind; varying vec3 vBindN;
float gH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float gN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gH(i), gH(i + vec3(1,0,0)), f.x), mix(gH(i + vec3(0,1,0)), gH(i + vec3(1,1,0)), f.x), f.y), mix(mix(gH(i + vec3(0,0,1)), gH(i + vec3(1,0,1)), f.x), mix(gH(i + vec3(0,1,1)), gH(i + vec3(1,1,1)), f.x), f.y), f.z); }
float gLine(float d, float w){ float fw = max(fwidth(d), 1e-5); return 1.0 - smoothstep(w, w + fw * 1.5, abs(d)); }
// procedural fold height (metres): creases at elbows/knees, stacking at cuffs and ankles, drape lines on loose torsos
float foldH(vec3 p, float part, float reg, float t, float kT, float kB){
  float n = gN(p * 14.0), h = 0.0;
  if (part < 0.5) {
    if (reg > 1.5) { // sleeves
      h += 0.0035 * sin(t * 95.0 + n * 4.0 + p.x * 20.0) * exp(-pow((t - 0.5) / 0.09, 2.0));
      h += 0.0015 * sin(t * 120.0 + n * 7.0 + p.y * 30.0) * smoothstep(0.66, 0.86, t);
    } else { // torso
      float loose = (kT > 2.5) ? 1.0 : 0.6;
      h += loose * 0.003 * sin(p.y * 120.0 + n * 5.0 + sin(p.x * 30.0) * 1.5) * (1.0 - smoothstep(uJ.x - 0.02, uJ.y, p.y)); // waist wrinkles
      h += 0.0025 * sin((p.x * 0.8 + p.y) * 70.0 + n * 3.0) * smoothstep(0.08, 0.16, abs(p.x)) * (1.0 - smoothstep(uJ.y - 0.08, uJ.y + 0.1, p.y)); // drape from the armpits
    }
  } else if (part < 1.5) { // trousers
    if (reg > 3.5) {
      h += 0.0035 * sin(t * 110.0 + n * 5.0 + p.x * 25.0) * exp(-pow((t - 0.5) / 0.08, 2.0));
      h += (kB < 1.5 ? 0.004 : 0.0025) * sin(t * 160.0 + n * 6.0) * smoothstep(0.8, 0.95, t);
    } else h += 0.0015 * sin(p.y * 160.0 + n * 6.0);
  } else { // skirt: soft vertical drape / pleats
    float a = atan(p.x, p.z - uJ2.w); h += 0.004 * sin(a * (kB > 0.0 ? 22.0 : 14.0) + n * 2.0) * smoothstep(0.0, 0.5, t);
  }
  return h;
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
 float part = vGarm.x, reg = vGarm.y, lt = vGarm.z, ring = vGarm.w; float kT = uKind.x, kB = uKind.y;
 vec3 col = part < 0.5 ? uTopA : uBotA; float rough = 0.9, sheen = 0.0; vec3 p = vBind;
 float n1 = gN(p * 60.0), n2 = gN(p * 9.0);
 if (part < 0.5) {
   float rib = 0.0; // ribbed hems/cuffs (hoodie, crew, puffer)
   if ((kT == 3.0 || kT == 4.0 || kT == 6.0) && ring < 1.5) rib = 1.0;
   if (kT == 3.0) { col *= 0.94 + 0.08 * n1; sheen = 0.25; // fleece
     float pk = (p.z > uJ2.x + 0.03 && p.y > uJ.x - 0.07 && p.y < uJ.x + 0.15) ? 1.0 : 0.0; float pw = 0.14 - (p.y - uJ.x + 0.07) * 0.18;
     col *= 1.0 - 0.35 * pk * max(gLine(abs(p.x) - pw, 0.0018), gLine(p.y - (uJ.x + 0.15), 0.0018) * step(abs(p.x), pw)); }
   else if (kT == 6.0) { rough = 0.48; col *= 0.9 + 0.12 * n2; sheen = 0.4; }
   else if (kT == 5.0) { rough = 0.62; col *= 0.95 + 0.06 * n2; // zip jacket: zipper tape + teeth down the centre front, pocket welts
     float fz = step(uJ2.x + 0.02, p.z) * step(reg, 1.5); col = mix(col, vec3(0.03), fz * gLine(p.x, 0.004)); col = mix(col, vec3(0.6), fz * gLine(p.x, 0.0012) * step(0.5, fract(p.y * 220.0))); }
   else if (kT == 7.0) { // flannel plaid
     float sx = fract(p.x * 9.0 + 0.5 * step(0.0, p.x)), sy = fract(p.y * 9.0); float bx = step(sx, 0.32), by = step(sy, 0.32); float lx = step(abs(sx - 0.66), 0.04), ly = step(abs(sy - 0.66), 0.04);
     col = mix(uTopA, uTopB, 0.5 * (bx + by)); col *= 1.0 - 0.35 * bx * by; col = mix(col, vec3(0.9, 0.88, 0.8), 0.6 * max(lx, ly) * (1.0 - bx * by)); col *= 0.94 + 0.08 * n1;
     float fz = step(uJ2.x + 0.02, p.z) * step(reg, 1.5); col *= 1.0 - 0.3 * fz * gLine(abs(p.x) - 0.013, 0.0012); // button placket
     col = mix(col, vec3(0.85, 0.82, 0.75), fz * (1.0 - smoothstep(0.003, 0.0045, length(vec2(p.x, (fract(p.y * 11.0) - 0.5) / 11.0))))); }
   else { col *= 0.95 + 0.06 * n1; }
   if (rib > 0.0) { col *= reg > 1.5 ? 0.92 : 0.93 + 0.05 * (0.5 + 0.5 * sin(p.x * 450.0)); }
   // chest print
   if (uKind.z >= 0.0 && reg < 1.5 && p.z > 0.0 && kT != 5.0 && kT != 7.0) {
     vec2 c = vec2((p.x) / 0.28 + 0.5, (p.y - (uJ.y - 0.03)) / 0.14 + 0.5); float pi = uKind.z;
     if (c.x > 0.0 && c.x < 1.0 && c.y > 0.0 && c.y < 1.0) { vec2 uv = vec2((mod(pi, 2.0) + c.x) * 0.5, 1.0 - (floor(pi / 2.0) + 1.0 - c.y) * 0.5); float a = texture2D(uPrint, uv).r; col = mix(col, uPrintCol, a * 0.92); }
   }
 } else if (part < 1.5) {
   if (kB == 1.0) { // denim: fades on thigh fronts and knees, twill mottling, outseam stitching, back pockets, waistband
     float fade = smoothstep(0.2, 0.9, vBindN.z) * (exp(-pow((lt - 0.2) / 0.16, 2.0)) * 0.9 + exp(-pow((lt - 0.5) / 0.07, 2.0)) * 0.6) * step(3.5, reg);
     col = mix(col, col * 1.6 + 0.03, fade * 0.4); col *= 0.9 + 0.16 * gN(vec3(p.x * 220.0 + p.y * 220.0, p.z * 50.0, p.y * 30.0)) * (0.6 + 0.4 * n2);
     float outs = gLine(1.0 - abs(vBindN.x), 0.02) * step(3.5, reg) * step(0.0, vBindN.x * p.x); col = mix(col, col * 1.25 + vec3(0.03, 0.02, 0.0), outs * 0.5);
     vec2 bp = vec2(abs(p.x) - 0.085, p.y - (uJ.z - 0.06)); float pkt = step(p.z, uJ2.w - 0.02) * step(abs(bp.x), 0.06) * step(abs(bp.y), 0.065);
     col *= 1.0 - 0.3 * step(p.z, uJ2.w - 0.02) * max(gLine(abs(bp.x) - 0.06, 0.0015) * step(abs(bp.y), 0.065), gLine(bp.y - 0.065, 0.0015) * step(abs(bp.x), 0.06));
     col = mix(col, vec3(0.62, 0.48, 0.22), 0.35 * pkt * gLine(abs(bp.x) - 0.052, 0.001));
     col *= 1.0 - 0.25 * gLine(p.y - (uJ.x - 0.02), 0.0015) * step(reg, 1.5);
   } else if (kB == 2.0) { col *= 0.97 + 0.03 * n1; col *= 1.0 - 0.07 * gLine(vBindN.x * (p.x > 0.0 ? 1.0 : -1.0) - 0.0, 0.03) * step(3.5, reg) * step(0.0, vBindN.z); }
   else if (kB == 3.0) { col *= 0.9 + 0.14 * gN(p * 140.0); sheen = 0.15; if (lt > 0.93) col *= 0.85 + 0.15 * sin(atan(p.z, p.x) * 50.0); }
   else { col *= 0.95 + 0.06 * n1; }
 } else if (part < 2.5) { col = uBotA * (0.95 + 0.07 * n1); rough = 0.85; }
 else { col = uStrap * (0.92 + 0.08 * sin(p.y * 500.0)) * (ring < 0.5 ? 0.6 : 1.0); rough = 0.7; }
 if (!gl_FrontFacing) col *= 0.7; // inside of the garment (looking up a sleeve)
 diffuseColor.rgb = col;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
 roughnessFactor = rough;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
 { // procedural fold bump (faded with distance to avoid shimmer)
   float h = foldH(vBind, part, reg, lt, kT, kB); vec3 sp = -vViewPosition; vec3 dpx = dFdx(sp), dpy = dFdy(sp);
   float fade = 1.0 - smoothstep(0.004, 0.012, length(fwidth(vBind)));
   vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1); vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * fade * 0.9;
   normal = normalize(abs(det) * normal - grad);
 }`)
      .replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>
 { float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); totalEmissiveRadiance += diffuseColor.rgb * fr * sheen * 0.35; }`);
  };
  m.customProgramCacheKey = () => 'people-outfit';
  return m;
}
