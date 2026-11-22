// Accessory kit for the near-LOD people: every accessory a character might wear, built once per body (f/m) in bind
// space, skinned to the body's own bones, merged into ONE geometry and drawn as ONE skinned mesh per character. Parts a
// character doesn't wear collapse in the vertex shader (uMask bit per part), colours come from a per-character slot table.
// Parts: four shoe styles (court sneaker, chunky runner, skate shoe, boot), backpack + straps, messenger bag, cap,
// beanie, glasses, over-ear headphones, a hoodie's hood + drawstrings, and hair built from the head itself: a slick
// pulled-back cap (ponytail / bun / man bun), curls, an afro, a bob, a ponytail, buns and a hijab.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { REG } from './assets.js';

export const KP = { sneaker: 0, runner: 1, skate: 2, boot: 3, backpack: 4, bag: 5, cap: 6, beanie: 7, glasses: 8, phones: 9, hood: 10, strings: 11,
  slick: 12, curls: 13, afro: 14, bob: 15, pony: 16, bun: 17, manbun: 18, hijab: 19, lens: 20 };
export const KS = { upper: 0, sole: 1, accent: 2, bag: 3, strap: 4, hat: 5, frame: 6, phones: 7, hair: 8, hood: 9, string: 10, scarf: 11, lens: 12, dark: 13 };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

class KitBuilder {
  constructor(B) { this.B = B; this.pos = []; this.nor = []; this.si = []; this.sw = []; this.kit = []; this.idx = []; const bones = B.body.skeleton.bones; this.bi = (n) => bones.findIndex((b) => b.name === n); }
  // weights: bone name | (pos) => [[bone, w], ...]
  add(g, part, slot, weights) {
    g = g.index ? g : mergeIdx(g); if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, b0 = this.pos.length / 3; const v = new THREE.Vector3();
    const fixed = typeof weights === 'string' ? [[this.bi(weights), 1]] : null;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); this.pos.push(v.x, v.y, v.z); this.nor.push(N.getX(i), N.getY(i), N.getZ(i));
      const w = fixed || weights(v).map(([n, k]) => [typeof n === 'string' ? this.bi(n) : n, k]);
      for (let k = 0; k < 4; k++) { this.si.push(w[k] ? w[k][0] : 0); this.sw.push(w[k] ? w[k][1] : 0); }
      this.kit.push(part, slot);
    }
    const ix = g.index.array; for (let i = 0; i < ix.length; i++) this.idx.push(ix[i] + b0);
  }
  addRaw(r, part, slot) { // a shell() result from garments-style builders: {pos, nor, sIdx, sWt, idx}
    const b0 = this.pos.length / 3; this.pos.push(...r.pos); this.nor.push(...r.nor); this.si.push(...r.sIdx); this.sw.push(...r.sWt);
    for (let i = 0; i < r.pos.length / 3; i++) this.kit.push(part, slot); for (const i of r.idx) this.idx.push(i + b0);
  }
  build() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4)); g.setAttribute('aKit', new THREE.Float32BufferAttribute(this.kit, 2));
    g.setIndex(this.idx); g.computeBoundingSphere();
    // triangle ranges per part, for per-character index buffers (worn parts only; the vertex buffers stay shared)
    const tp = []; for (let i = 0; i < this.idx.length; i += 3) tp.push(this.kit[this.idx[i] * 2]); g.userData.triPart = tp; g.userData.masks = new Map();
    return g;
  }
}
// geometry sharing the kit's attributes with an index of the masked parts only (cached per mask)
export function kitGeometry(base, mask) {
  const M = base.userData.masks; let g = M.get(mask); if (g) return g;
  const tp = base.userData.triPart, src = base.index.array, idx = [];
  for (let t = 0; t < tp.length; t++) if ((mask >> tp[t]) & 1) idx.push(src[t * 3], src[t * 3 + 1], src[t * 3 + 2]);
  g = new THREE.BufferGeometry(); for (const [k, a] of Object.entries(base.attributes)) g.setAttribute(k, a); g.setIndex(idx); g.boundingSphere = base.boundingSphere; M.set(mask, g); return g;
}
function mergeIdx(g) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); return g; }
function deform(g, fn) { const P = g.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); fn(v); P.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; }
// tube with varying radius along a polyline of points
function taperTube(pts, r0, r1, seg = 8) {
  const curve = new THREE.CatmullRomCurve3(pts); const N = 14; const pos = [], idx = []; const fr = curve.computeFrenetFrames(N, false);
  for (let i = 0; i <= N; i++) { const u = i / N; const c = curve.getPointAt(u); const r = r0 + (r1 - r0) * Math.pow(u, 1.3); const nn = fr.normals[i], bb = fr.binormals[i];
    for (let s = 0; s < seg; s++) { const a = (s / seg) * Math.PI * 2; pos.push(c.x + (nn.x * Math.cos(a) + bb.x * Math.sin(a)) * r, c.y + (nn.y * Math.cos(a) + bb.y * Math.sin(a)) * r, c.z + (nn.z * Math.cos(a) + bb.z * Math.sin(a)) * r); } }
  for (let i = 0; i < N; i++) for (let s = 0; s < seg; s++) { const a = i * seg + s, b = i * seg + (s + 1) % seg; idx.push(a, a + seg, b, b, a + seg, b + seg); }
  const e = pos.length / 3; const end = curve.getPointAt(1); pos.push(end.x, end.y, end.z); for (let s = 0; s < seg; s++) idx.push(N * seg + s, e, N * seg + (s + 1) % seg);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- head reference frame (bind space)
export function headFrame(B) {
  if (B._head) return B._head;
  const g = B.body.geometry, P = g.attributes.position, CL = g.attributes.aCloth; const hb = new THREE.Box3(); const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) if (CL.getX(i) === REG.HEAD) { v.fromBufferAttribute(P, i); if (v.y > B.J.neck_01.y + 0.02) hb.expandByPoint(v); }
  const eyes = { l: new THREE.Vector3(), r: new THREE.Vector3() }; let nl = 0, nr = 0;
  if (B.eyes) { const E = B.eyes.geometry.attributes.position; for (let i = 0; i < E.count; i++) { v.fromBufferAttribute(E, i); if (v.x > 0) { eyes.l.add(v); nl++; } else { eyes.r.add(v); nr++; } } }
  if (nl) eyes.l.multiplyScalar(1 / nl); if (nr) eyes.r.multiplyScalar(1 / nr);
  const c = hb.getCenter(new THREE.Vector3()), s = hb.getSize(new THREE.Vector3());
  if (!nl || !nr) { eyes.l.set(0.032, c.y + s.y * 0.05, hb.max.z - 0.02); eyes.r.set(-0.032, c.y + s.y * 0.05, hb.max.z - 0.02); }
  const eyeY = (eyes.l.y + eyes.r.y) / 2; const front = Math.max(eyes.l.z, eyes.r.z);
  return (B._head = { box: hb, c, s, eyes, eyeY, front, top: hb.max.y, R: s.z * 0.5, halfW: s.x * 0.5 });
}

// ---------------------------------------------------------------- hair shells from the head mesh
function headShell(B, fit, relax = 3) {
  // same idea as the garment shells, simplified (no hems): copy the covered head triangles, offset, relax
  const g = B.body.geometry, P = g.attributes.position, NA = g.attributes.normal, CL = g.attributes.aCloth, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, ix = g.index.array; const N = P.count;
  const canon = g.userData.canon || Int32Array.from({ length: N }, (_, i) => i);
  const off = new Float32Array(N).fill(-1); const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < N; i++) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(NA, i); off[i] = fit(p, n, CL.getX(i)); }
  const faces = []; for (let f = 0; f < ix.length; f += 3) if (off[ix[f]] >= 0 && off[ix[f + 1]] >= 0 && off[ix[f + 2]] >= 0) faces.push(ix[f], ix[f + 1], ix[f + 2]);
  const cur = new Map(); for (const v of faces) { const c = canon[v]; if (!cur.has(c)) { p.fromBufferAttribute(P, c); n.fromBufferAttribute(NA, c); cur.set(c, p.clone().addScaledVector(n, off[c])); } }
  const nb = new Map(); for (let f = 0; f < faces.length; f += 3) for (let e = 0; e < 3; e++) { const a = canon[faces[f + e]], b = canon[faces[f + (e + 1) % 3]]; if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); if (!nb.has(b)) nb.set(b, new Set()); nb.get(b).add(a); }
  for (let it = 0; it < relax; it++) { const nx = new Map(); for (const [i, c] of cur) { const s = new THREE.Vector3(); let k = 0; for (const j of nb.get(i)) { s.add(cur.get(j)); k++; } nx.set(i, k > 3 ? c.clone().lerp(s.multiplyScalar(1 / k), 0.4) : c); } for (const [i, q] of nx) { p.fromBufferAttribute(P, i); n.fromBufferAttribute(NA, i); const h = q.clone().sub(p).dot(n); if (h < off[i] * 0.7) q.addScaledVector(n, off[i] * 0.7 - h); cur.set(i, q); } }
  const map = new Map(); const pos = [], nor = [], sIdx = [], sWt = [], idx = [];
  for (const v of faces) { let k = map.get(v); if (k == null) { k = pos.length / 3; map.set(v, k); const c = cur.get(canon[v]); pos.push(c.x, c.y, c.z); nor.push(0, 0, 0); for (let q = 0; q < 4; q++) { sIdx.push(SI.getComponent(v, q)); sWt.push(SW.getComponent(v, q)); } } idx.push(k); }
  const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tmp.setIndex(idx); tmp.computeVertexNormals();
  // weld normals across seams
  const acc = new Map(); const NN = tmp.attributes.normal; for (const [v, k] of map) { const c = canon[v]; const s = acc.get(c) || acc.set(c, new THREE.Vector3()).get(c); s.x += NN.getX(k); s.y += NN.getY(k); s.z += NN.getZ(k); }
  for (const [v, k] of map) { const s = acc.get(canon[v]).clone().normalize(); nor[k * 3] = s.x; nor[k * 3 + 1] = s.y; nor[k * 3 + 2] = s.z; }
  return { pos, nor, sIdx, sWt, idx };
}

// ---------------------------------------------------------------- the kit
const _kits = {};
export function kitFor(B) {
  if (_kits[B.sex]) return _kits[B.sex];
  const K = new KitBuilder(B); const J = B.J; const H = headFrame(B); const fem = B.sex === 'f';
  // ---- shoes (foot space: the foot points +z; heel part on foot_, toe part on ball_)
  for (const sd of ['l', 'r']) {
    const A = J['foot_' + sd], Bl = J['ball_' + sd]; const xo = A.x + (sd === 'l' ? 0.004 : -0.004); const len = fem ? 0.25 : 0.272; const back = 0.068; const z0 = A.z - back;
    const wts = (v) => { const k = sstep(Bl.z - 0.03, Bl.z + 0.03, v.z); return [['foot_' + sd, 1 - k], ['ball_' + sd, k]]; };
    const outline = (fz) => 0.5 * (fz < 0.18 ? 0.84 + 0.16 * Math.sin(fz / 0.18 * Math.PI / 2) : fz < 0.55 ? 1 - (fz - 0.18) * 0.18 : 0.93 + (fz - 0.55) * 0.25 - Math.pow(Math.max(0, fz - 0.82) / 0.18, 2) * 0.55);
    const shoe = (style) => {
      const W = style === 1 ? 0.112 : style === 3 ? 0.112 : 0.104; const soleH = style === 1 ? 0.04 : style === 3 ? 0.034 : style === 2 ? 0.026 : 0.03; const L = len + (style === 1 ? 0.01 : 0);
      // sole: an outlined slab with a slight toe spring
      const sole = deform(new THREE.CylinderGeometry(1, 1, 1, 28, 2, false), (v) => { const a = Math.atan2(v.x, v.z); const fz = 0.5 + v.z * 0.5; const w = outline(fz) * W * 1.04; v.x = xo + Math.sign(v.x) * Math.min(Math.abs(v.x), 1) * w; v.y = (v.y + 0.5) * soleH + Math.pow(Math.max(0, fz - 0.8) / 0.2, 2) * 0.012; v.z = z0 + fz * L; });
      K.add(sole, KP.sneaker + style, style === 3 ? KS.dark : KS.sole, wts);
      // upper: a dome over the outline, collar at the heel, low toe box
      const up = deform(new THREE.SphereGeometry(1, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), (v) => { const fz = 0.5 + v.z * 0.5; const prof = style === 3 ? (fz < 0.5 ? 0.12 : 0.12 - (fz - 0.5) * 0.14) : (fz < 0.35 ? 0.095 + (style === 2 ? -0.012 : 0) : 0.095 - (fz - 0.35) * 0.09) - (fz > 0.85 ? (fz - 0.85) * 0.12 : 0);
        v.x = xo + v.x * outline(fz) * W * 0.98; v.y = soleH - 0.002 + v.y * prof * (style === 2 ? 0.92 : 1); v.z = z0 + 0.004 + fz * (L - 0.008); });
      K.add(up, KP.sneaker + style, KS.upper, wts);
      if (style !== 3) { // lace panel + heel tab + toe cap accents
        const lace = new RoundedBoxGeometry(0.046, 0.012, 0.1, 1, 0.004); lace.rotateX(0.62); lace.translate(xo, soleH + 0.07, z0 + L * 0.48); K.add(lace, KP.sneaker + style, KS.accent, wts);
        const tab = new RoundedBoxGeometry(0.04, 0.05, 0.012, 1, 0.005); tab.translate(xo, soleH + 0.07, z0 + 0.004); K.add(tab, KP.sneaker + style, KS.accent, wts);
        if (style === 0 || style === 2) { const stripe = deform(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), (v) => { const fz = 0.5 + v.z * 0.5; v.x = xo + v.x * outline(fz) * W * 1.03; v.y = soleH + (v.y + 0.5) * 0.008 + 0.002; v.z = z0 + fz * L; }); K.add(stripe, KP.sneaker + style, KS.accent, wts); }
      } else { // boot shaft round the ankle
        const shaft = new THREE.CylinderGeometry(0.047, 0.052, 0.12, 16, 1, true); shaft.scale(1, 1, 1.12); shaft.translate(xo, A.y + 0.04, A.z - 0.012); K.add(shaft, KP.boot, KS.upper, 'foot_' + sd);
        const top = new THREE.TorusGeometry(0.048, 0.005, 4, 16); top.rotateX(Math.PI / 2); top.scale(1, 1, 1.12); top.translate(xo, A.y + 0.1, A.z - 0.012); K.add(top, KP.boot, KS.dark, 'foot_' + sd);
      }
    };
    const yaw = Math.atan2(Bl.x - A.x, Bl.z - A.z); const nAdd = K.pos.length;
    for (let s = 0; s < 4; s++) shoe(s);
    { const c = Math.cos(yaw), si = Math.sin(yaw); for (let i = nAdd; i < K.pos.length; i += 3) { const x = K.pos[i] - xo, z = K.pos[i + 2] - A.z; K.pos[i] = xo + x * c + z * si; K.pos[i + 2] = A.z - x * si + z * c; const nx = K.nor[i], nz = K.nor[i + 2]; K.nor[i] = nx * c + nz * si; K.nor[i + 2] = -nx * si + nz * c; } }
  }
  // ---- backpack (spine_03) with straps, a front pocket and a grab handle
  {
    const g = B.body.geometry, P = g.attributes.position, CL = g.attributes.aCloth; const tb = new THREE.Box3(); const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (CL.getX(i) === REG.TRUNK && v.y > J.spine_02.y && v.y < J.spine_03.y + 0.1) tb.expandByPoint(v); }
    const back = tb.min.z - 0.014, frontZ = tb.max.z + 0.02, shY = J.spine_03.y + 0.13, w = tb.max.x - tb.min.x;
    const body = new RoundedBoxGeometry(0.31, 0.42, 0.15, 3, 0.05); body.translate(0, J.spine_02.y + 0.06, back - 0.075); K.add(body, KP.backpack, KS.bag, 'spine_03');
    const pocket = new RoundedBoxGeometry(0.23, 0.17, 0.055, 2, 0.02); pocket.translate(0, J.spine_02.y - 0.04, back - 0.16); K.add(pocket, KP.backpack, KS.bag, 'spine_03');
    const zip = new THREE.TorusGeometry(0.15, 0.004, 3, 20, Math.PI); zip.scale(1, 1.25, 1); zip.translate(0, J.spine_02.y + 0.08, back - 0.152); K.add(zip, KP.backpack, KS.strap, 'spine_03');
    const handle = new THREE.TorusGeometry(0.03, 0.007, 4, 10, Math.PI); handle.translate(0, J.spine_02.y + 0.27, back - 0.06); K.add(handle, KP.backpack, KS.strap, 'spine_03');
    // messenger bag at the left hip with a strap across the chest
    const bag = new RoundedBoxGeometry(0.3, 0.24, 0.085, 2, 0.03); bag.translate(0.195, J.pelvis.y - 0.02, J.pelvis.z - 0.015); K.add(bag, KP.bag, KS.bag, 'pelvis');
    const flap = new RoundedBoxGeometry(0.3, 0.14, 0.012, 1, 0.005); flap.translate(0.195, J.pelvis.y + 0.035, J.pelvis.z + 0.033); K.add(flap, KP.bag, KS.strap, 'pelvis');
    // hood lying on the upper back + drawstrings (hoodies)
    const nk = B.neckR; const roll = new THREE.TorusGeometry(nk * 1.38, 0.025, 8, 20, Math.PI * 1.25); roll.rotateX(Math.PI / 2); roll.rotateY(Math.PI * 0.5 - Math.PI * 0.125 + Math.PI); roll.scale(1.08, 1.5, 1); roll.rotateX(-0.25); roll.translate(J.neck_01.x, B.collarY - 0.022, J.neck_01.z - 0.012); K.add(roll, KP.hood, KS.hood, 'spine_03');
    const bagH = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); bagH.rotateX(-Math.PI / 2 - 0.25); bagH.scale(0.13, 0.15, 0.055); bagH.translate(0, B.collarY - 0.09, tb.min.z - 0.008); K.add(bagH, KP.hood, KS.hood, 'spine_03');
    for (const s of [-1, 1]) { const ds = taperTube([new THREE.Vector3(s * 0.04, B.collarY - 0.02, J.neck_01.z + nk * 1.25), new THREE.Vector3(s * 0.045, B.collarY - 0.12, frontZ + 0.012), new THREE.Vector3(s * 0.043, B.collarY - 0.22, frontZ + 0.016)], 0.0038, 0.0045, 5); K.add(ds, KP.strings, KS.string, 'spine_03'); }
  }
  // ---- head wear: cap, beanie, glasses, headphones
  {
    const c = H.c, R0 = H.R, hw = H.halfW;
    const crown = new THREE.SphereGeometry(R0 * 1.06, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.5); crown.scale(hw / R0 * 1.08, 0.74, 1.04); crown.translate(c.x, H.top - H.s.y * 0.3, c.z - H.s.z * 0.02); K.add(crown, KP.cap, KS.hat, 'Head');
    const brim = new THREE.CylinderGeometry(R0 * 0.82, R0 * 0.82, 0.011, 16, 1, false, -Math.PI / 2, Math.PI); brim.scale(1, 1, 1.6); brim.rotateX(0.1); brim.translate(c.x, H.top - H.s.y * 0.29, c.z + H.s.z * 0.37); K.add(brim, KP.cap, KS.hat, 'Head');
    const button = new THREE.SphereGeometry(0.009, 6, 4); button.translate(c.x, H.top + 0.005, c.z); K.add(button, KP.cap, KS.hat, 'Head');
    // beanie: brim just above the brows at the front, over the tops of the ears at the back
    const by = H.eyeY + 0.04, bh = H.top + 0.03 - by;
    const bea = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); bea.scale(hw * 1.14, bh, R0 * 1.1); bea.rotateX(0.16); bea.translate(c.x, by, c.z - 0.006); K.add(bea, KP.beanie, KS.hat, 'Head');
    const cuff = new THREE.CylinderGeometry(1, 1.02, 0.045, 20, 1, true); cuff.scale(hw * 1.17, 1, R0 * 1.13); cuff.translate(0, 0.02, 0); cuff.rotateX(0.16); cuff.translate(c.x, by, c.z - 0.006); K.add(cuff, KP.beanie, KS.hat, 'Head');
    // glasses: two rounded-rectangle rims, a bridge and temples back to the ears
    const lw = fem ? 0.024 : 0.026, lh = 0.017;
    for (const [sd, E] of [['l', H.eyes.l], ['r', H.eyes.r]]) {
      const pts = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const cx = Math.cos(a), cy = Math.sin(a); pts.push(new THREE.Vector3(E.x + Math.sign(cx) * Math.pow(Math.abs(cx), 0.6) * lw, E.y + 0.002 + Math.sign(cy) * Math.pow(Math.abs(cy), 0.7) * lh, H.front + 0.014 - Math.abs(E.x) * 0.08)); }
      K.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 24, 0.0034, 5, true), KP.glasses, KS.frame, 'Head');
      const lens = new THREE.CircleGeometry(1, 16); lens.scale(lw * 0.95, lh * 0.95, 1); lens.translate(E.x, E.y + 0.002, H.front + 0.0135 - Math.abs(E.x) * 0.08); K.add(lens, KP.lens, KS.lens, 'Head');
      const sx = Math.sign(E.x); const tp = taperTube([new THREE.Vector3(E.x + sx * lw, E.y + 0.008, H.front + 0.01 - Math.abs(E.x) * 0.08), new THREE.Vector3(sx * (hw + 0.004), E.y + 0.01, H.front - 0.03), new THREE.Vector3(sx * (hw + 0.002), E.y + 0.004, c.z - 0.005)], 0.0028, 0.0024, 4); K.add(tp, KP.glasses, KS.frame, 'Head');
    }
    const br = taperTube([new THREE.Vector3(H.eyes.r.x + lw * 0.7, H.eyes.r.y + 0.008, H.front + 0.013), new THREE.Vector3(0, H.eyes.r.y + 0.011, H.front + 0.016), new THREE.Vector3(H.eyes.l.x - lw * 0.7, H.eyes.l.y + 0.008, H.front + 0.013)], 0.003, 0.003, 4); K.add(br, KP.glasses, KS.frame, 'Head');
    // over-ear headphones
    const band = new THREE.TorusGeometry(hw + 0.016, 0.009, 6, 20, Math.PI); band.scale(1, 1.05, 1.6); band.translate(c.x, H.eyeY - 0.005, c.z - 0.012); K.add(band, KP.phones, KS.phones, 'Head');
    for (const s of [-1, 1]) { const cup = new THREE.CylinderGeometry(0.037, 0.04, 0.03, 16); cup.rotateZ(Math.PI / 2); cup.translate(s * (hw + 0.012), H.eyeY - 0.02, c.z - 0.008); K.add(cup, KP.phones, KS.phones, 'Head');
      const pad = new THREE.TorusGeometry(0.03, 0.009, 6, 16); pad.rotateY(Math.PI / 2); pad.translate(s * (hw - 0.002), H.eyeY - 0.02, c.z - 0.008); K.add(pad, KP.phones, KS.dark, 'Head'); }
  }
  // ---- hair from the head: hairline = forehead at the front, above the ears at the sides, nape at the back
  {
    const c = H.c; const fore = H.eyeY + 0.052, nape = J.neck_01.y + 0.035;
    const frontness = (p) => (p.z - c.z) / Math.max(0.05, H.R);
    const hairline = (p) => { const f = frontness(p); const side = Math.abs(p.x) / H.halfW; return THREE.MathUtils.lerp(nape, fore, sstep(-0.35, 0.45, f)) + (side > 0.7 && f > -0.3 && f < 0.5 ? 0.012 : 0); };
    const nz = (p, s) => { const q = p.clone().multiplyScalar(s); return (Math.sin(q.x * 1.7 + Math.sin(q.y * 2.3)) + Math.sin(q.y * 1.9 + Math.sin(q.z * 2.1)) + Math.sin(q.z * 2.2 + Math.sin(q.x * 1.6))) / 3; };
    const isHead = (p, reg) => reg === REG.HEAD || (reg === REG.TRUNK && p.y > J.neck_01.y + 0.02);
    K.addRaw(headShell(B, (p, n, reg) => (isHead(p, reg) && p.y > hairline(p) ? 0.0045 + 0.004 * sstep(fore, H.top, p.y) : -1)), KP.slick, KS.hair);
    K.addRaw(headShell(B, (p, n, reg) => { const hl = hairline(p); return isHead(p, reg) && p.y > hl + 0.004 ? 0.004 + (0.016 + 0.014 * sstep(-0.6, 0.3, frontness(p))) * sstep(0, 0.05, p.y - hl) + 0.008 * (0.5 + 0.5 * nz(p, 140)) * sstep(0, 0.03, p.y - hl) : -1; }, 2), KP.curls, KS.hair);
    K.addRaw(headShell(B, (p, n, reg) => { const hl = hairline(p); return isHead(p, reg) && p.y > hl - 0.002 ? 0.005 + 0.06 * sstep(0, 0.075, p.y - hl) + 0.012 * (0.5 + 0.5 * nz(p, 110)) * sstep(0, 0.04, p.y - hl) : -1; }, 4), KP.afro, KS.hair);
    // bob: a curtain round the back and sides from the temples to the jaw
    { const segA = 22, rings = 6; const pos = [], idx = []; const y0 = H.eyeY + 0.035, y1 = H.eyeY - 0.085;
      for (let r = 0; r < rings; r++) { const y = y0 + (y1 - y0) * (r / (rings - 1)); for (let s = 0; s <= segA; s++) { const a = -Math.PI * 0.62 + (s / segA) * Math.PI * 1.24 + Math.PI; const rx = H.halfW + 0.016 + 0.012 * (r / (rings - 1)), rz = H.R + 0.012 + 0.01 * (r / (rings - 1)); pos.push(c.x + Math.sin(a) * rx, y, c.z - 0.006 + Math.cos(a) * rz); } }
      for (let r = 0; r < rings - 1; r++) for (let s = 0; s < segA; s++) { const a = r * (segA + 1) + s, b = a + 1; idx.push(a, a + segA + 1, b, b, a + segA + 1, b + segA + 1); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals(); K.add(bg, KP.bob, KS.hair, 'Head');
      K.addRaw(headShell(B, (p, n, reg) => (isHead(p, reg) && p.y > hairline(p) ? 0.012 + 0.012 * sstep(fore, H.top, p.y) : -1)), KP.bob, KS.hair); }
    // ponytail, bun, man bun
    const bk = c.z - H.R; const py = H.eyeY + 0.035;
    K.add(taperTube([new THREE.Vector3(c.x, py + 0.02, bk + 0.004), new THREE.Vector3(c.x, py - 0.04, bk - 0.045), new THREE.Vector3(c.x, py - 0.14, bk - 0.05), new THREE.Vector3(c.x, py - 0.24, bk - 0.03)], 0.03, 0.01, 10), KP.pony, KS.hair, 'Head');
    const tie = new THREE.TorusGeometry(0.02, 0.006, 4, 10); tie.rotateX(Math.PI / 2 - 0.6); tie.translate(c.x, py + 0.012, bk - 0.006); K.add(tie, KP.pony, KS.dark, 'Head');
    const bun = deform(new THREE.SphereGeometry(0.048, 12, 9), (v) => { v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 180) * Math.sin(v.y * 160)); }); bun.translate(c.x, H.top - 0.005, c.z - H.R * 0.45); K.add(bun, KP.bun, KS.hair, 'Head');
    const mb = new THREE.SphereGeometry(0.034, 10, 8); mb.scale(1, 0.85, 1); mb.translate(c.x, H.top - 0.03, bk + 0.012); K.add(mb, KP.manbun, KS.hair, 'Head');
    // hijab: head wrap leaving the face open, falling over the neck to the shoulders
    K.addRaw(headShell(B, (p, n, reg) => { if (!(isHead(p, reg))) return -1; const f = frontness(p); const face = f > 0.25 && p.y < fore + 0.004 && p.y > H.eyeY - 0.11 && Math.abs(p.x) < H.halfW * 0.78; return face ? -1 : 0.012; }, 3), KP.hijab, KS.scarf);
    { const segA = 26, rings = 6; const pos = [], idx = []; const y0 = H.eyeY - 0.06, y1 = B.collarY - 0.07; const nk = B.neckR; const sk = [];
      for (let r = 0; r < rings; r++) { const u = r / (rings - 1); const y = y0 + (y1 - y0) * u; for (let s = 0; s <= segA; s++) { const a = (s / segA) * Math.PI * 2; const rx = THREE.MathUtils.lerp(H.halfW + 0.012, nk * 2.6, u * u), rz = THREE.MathUtils.lerp(H.R * 0.95, nk * 2.1, u * u); pos.push(Math.sin(a) * rx + c.x, y, J.neck_01.z + 0.005 + Math.cos(a) * rz); sk.push(u); } }
      for (let r = 0; r < rings - 1; r++) for (let s = 0; s < segA; s++) { const a = r * (segA + 1) + s, b = a + 1; idx.push(a, b, a + segA + 1, b, b + segA + 1, a + segA + 1); }
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx); hg.computeVertexNormals();
      K.add(hg, KP.hijab, KS.scarf, (v) => { const u = sstep(H.eyeY - 0.06, B.collarY - 0.07, v.y); return u < 0.5 ? [['Head', 1 - u * 2], ['neck_01', u * 2]] : [['neck_01', 2 - u * 2], ['spine_03', u * 2 - 1]]; }); }
  }
  return (_kits[B.sex] = K.build());
}

// ---------------------------------------------------------------- material (per character: mask + colour slots)
export function kitMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, name: 'people:kit', side: THREE.DoubleSide });
  const cols = Array.from({ length: 14 }, () => new THREE.Color(0.5, 0.5, 0.5)); const rough = new Float32Array(14).fill(0.75);
  rough[KS.lens] = 0.08; rough[KS.frame] = 0.35; rough[KS.phones] = 0.4; rough[KS.sole] = 0.85; rough[KS.hair] = 0.68; rough[KS.upper] = 0.62;
  const u = { uMask: { value: 0 }, uCols: { value: cols }, uRough: { value: rough }, uPackOff: { value: 0 } }; m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aKit; uniform int uMask; uniform float uPackOff; flat varying int vSlot; varying vec3 vKitP;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 { int pid = int(aKit.x + 0.5); if (pid == 4) transformed.z -= uPackOff; if (((uMask >> pid) & 1) == 0) transformed = vec3(0.0); vSlot = int(aKit.y + 0.5); vKitP = position; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uCols[14]; uniform float uRough[14]; flat varying int vSlot; varying vec3 vKitP;
float kH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
 vec3 kc = uCols[vSlot]; float kr = uRough[vSlot];
 if (vSlot == 8) { // hair: fine strands running down the head + a little clumping
   float s = sin(vKitP.x * 420.0 + sin(vKitP.y * 60.0) * 3.0 + sin(vKitP.z * 300.0)) * 0.5 + 0.5; float cl = sin(vKitP.x * 90.0 + vKitP.z * 70.0 + vKitP.y * 40.0) * 0.5 + 0.5; kc *= 0.6 + 0.55 * s * (0.55 + 0.45 * cl); }
 if (vSlot == 11) kc *= 0.93 + 0.07 * sin(vKitP.y * 300.0 + vKitP.x * 120.0);
 diffuseColor.rgb = kc; if (vSlot == 12) diffuseColor.rgb = kc * 0.35;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
 roughnessFactor = kr;`);
  };
  m.customProgramCacheKey = () => 'people-kit';
  return m;
}
