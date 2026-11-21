// Refine-north (rn) kit: finished ground floors for hand-built buildings in any classic-Kit module (building frame u,v,y).
// - pathEntrances(): where the packet's footpaths/steps actually meet the walls (so doors go where people arrive)
// - entry(): projecting portal with glazed doors (shared M.windowNight glass), canopy, landing, steps + handrails, wall lights, sign
// - planting(): foundation shrubs / hedges in mulch beds along a wall, skipping doors
// - planter(), bikes(), propAt() (street furniture from src/props), furniture()
// Everything small is flagged detail so the engine hides it beyond ~350 m. Backward-compatible: nothing here changes other kits.
import * as THREE from 'three';
import { PROPS } from '../../props/props.js';
import { fbm, hash2 } from '../../lib/noise.js';

// ---------------------------------------------------------------- materials (once per shared material library)
const _mm = new WeakMap();
function leafTex(seed, base, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const img = g.createImageData(size, size); const hgt = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size; const n = fbm(u * 6, v * 6, 6, 4, seed); const l = fbm(u * 28, v * 28, 28, 2, seed + 7);
    const leaf = Math.max(0, Math.min(1, (l - 0.38) * 3.2)); const k = 0.55 + n * 0.55 + leaf * 0.35; const i = y * size + x;
    hgt[i] = leaf * 0.7 + n * 0.3;
    img.data[i * 4] = Math.min(255, base[0] * k * (0.95 + leaf * 0.12)); img.data[i * 4 + 1] = Math.min(255, base[1] * k); img.data[i * 4 + 2] = Math.min(255, base[2] * k * 0.95); img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const cn = document.createElement('canvas'); cn.width = cn.height = size; const gn = cn.getContext('2d'); const nd = gn.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = hgt[y * size + ((x - 1 + size) % size)], xp = hgt[y * size + ((x + 1) % size)], ym = hgt[((y - 1 + size) % size) * size + x], yp = hgt[((y + 1) % size) * size + x];
    const nx = (xm - xp) * 3, ny = (ym - yp) * 3, l = Math.hypot(nx, ny, 1); const i = (y * size + x) * 4;
    nd.data[i] = (nx / l * 0.5 + 0.5) * 255; nd.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; nd.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
  }
  gn.putImageData(nd, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  const tn = new THREE.CanvasTexture(cn); tn.wrapS = tn.wrapT = THREE.RepeatWrapping;
  return { map: t, normalMap: tn };
}
export function rnMats(M) {
  if (_mm.has(M)) return _mm.get(M);
  const leaf = (seed, rgb, rough) => { const t = leafTex(seed, rgb); const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, map: t.map, normalMap: t.normalMap }); m.normalScale = new THREE.Vector2(1.2, 1.2); m.name = 'rn:leaf' + seed; return m; };
  const tint = (base, c, r) => { const m = base.clone(); m.color = new THREE.Color(c); if (r != null) m.roughness = r; return m; };
  const o = {
    leafA: leaf(11, [70, 98, 52], 0.85),     // glossy dark green (pittosporum / laurel)
    leafB: leaf(23, [96, 112, 62], 0.9),     // olive / rosemary
    leafC: leaf(37, [62, 92, 72], 0.85),     // blue-green (agapanthus, ceanothus)
    mulch: tint(M.soil, 0x4b3b2e, 1.0),
    steel: new THREE.MeshStandardMaterial({ color: 0xc4c8ca, roughness: 0.3, metalness: 0.85, name: 'rn:steel' }),
    alum: new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.38, metalness: 0.75, name: 'rn:alum' }),
    curb: tint(M.concrete, 0xcfcac0, 0.95),
    bark: new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.95, name: 'rn:bark' }),
  };
  _mm.set(M, o); return o;
}

// ---------------------------------------------------------------- small utilities
export const facing = (R) => Math.atan2(R.n[0], R.n[1]); // rotation that turns a prop's +z front to face out of run R
const _proto = {};
function proto(name) { return _proto[name] || (_proto[name] = PROPS[name]()); }
// Street furniture from src/props/props.js at building-frame (u,v), rotated about y (0 = front toward +v). Returns its collider.
export function propAt(K, name, u, v, rot = 0, { y = null, detail = true } = {}) {
  const Pr = proto(name); const gy = y ?? K.g(u, v);
  for (const part of Pr.parts) {
    if (part.depthMaterial) continue;
    const g = part.geometry.clone(); g.rotateY(rot); g.translate(u, gy, v);
    K.add(part.material, g, { uvMode: 'keep', detail });
  }
  const c = Pr.collider; if (!c) return null;
  if (c.type === 'cyl') return K.colCyl(u, v, c.r, gy - 0.2, gy + c.h);
  const ca = Math.cos(rot), sa = Math.sin(rot); // box collider -> rotated polygon (same rotation as rotateY)
  const pts = [[c.min[0], c.min[2]], [c.max[0], c.min[2]], [c.max[0], c.max[2]], [c.min[0], c.max[2]]].map(([x, z]) => [u + x * ca + z * sa, v - x * sa + z * ca]);
  return K.colPoly(pts, gy - 0.2, gy + c.max[1]);
}
const P = (R, s, d) => R.at(s, d);
// ground under a run point (s along, d out)
export function gRun(K, R, s, d = 0.8) { const p = R.at(s, d); return K.g(p[0], p[1]); }
// tube between two run-local points [s, y, d]
export function tube(K, R, mat, a, b, r = 0.022, seg = 8, detail = true) {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]); const L = A.distanceTo(B); if (L < 1e-3) return;
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.applyQuaternion(q); g.translate(A.x, A.y, A.z);
  K.addRun(R, mat, g, { uvMode: 'keep', detail });
}
// lumpy shrub blob centred at building-frame (u, y, v)
export function blob(K, mat, u, y, v, rx, ry, rz, seed = 1) {
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i), z = p.getZ(i); const k = 0.82 + 0.3 * hash2(Math.round(x * 7 + seed * 13), Math.round(z * 7 + yy * 5), seed);
    p.setXYZ(i, x * rx * k, Math.max(-0.35, yy) * ry * k, z * rz * k);
  }
  g.computeVertexNormals(); g.translate(u, y, v);
  K.add(mat, g, { detail: true });
}

// ---------------------------------------------------------------- where paths meet the building
// Returns [{R, s, kind, n}] — stations on the given runs where packet footways/steps/pedestrian ways arrive (≤ maxDist from
// the wall, or crossing it), merged within `merge` metres, most-used first.
export function pathEntrances(K, ctx, runs, { maxDist = 3.5, merge = 7, minS = 1.2, kinds = ['footway', 'steps', 'pedestrian', 'path', 'corridor'] } = {}) {
  const cand = [];
  const ways = (ctx.packet?.context || []).filter((w) => kinds.includes(w.tags?.highway) && w.pts && w.pts.length > 1);
  const near = (u, v) => { let best = null; for (const R of runs) { const du = u - R.a[0], dv = v - R.a[1]; const s = du * R.t[0] + dv * R.t[1]; const d = du * R.n[0] + dv * R.n[1]; if (s < minS || s > R.L - minS || d < -1.0 || d > maxDist) continue; if (!best || Math.abs(d) < Math.abs(best.d)) best = { R, s, d }; } return best; };
  for (const w of ways) {
    const pts = w.pts.map(([x, z]) => K.uv(x, z));
    for (let i = 0; i < pts.length; i++) { const h = near(pts[i][0], pts[i][1]); if (h) cand.push({ ...h, kind: w.tags.highway, w: i === 0 || i === pts.length - 1 ? 2 : 1 }); }
    for (let i = 0; i < pts.length - 1; i++) { // segment crossings of each wall
      const [a, b] = [pts[i], pts[i + 1]];
      for (const R of runs) {
        const da = (a[0] - R.a[0]) * R.n[0] + (a[1] - R.a[1]) * R.n[1], db = (b[0] - R.a[0]) * R.n[0] + (b[1] - R.a[1]) * R.n[1];
        if (da * db >= 0) continue; const t = da / (da - db); const u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t;
        const s = (u - R.a[0]) * R.t[0] + (v - R.a[1]) * R.t[1]; if (s < minS || s > R.L - minS) continue;
        cand.push({ R, s, d: 0, kind: w.tags.highway, w: 3 });
      }
    }
  }
  const out = [];
  for (const c of cand.sort((x, y) => y.w - x.w)) {
    const o = out.find((e) => e.R === c.R && Math.abs(e.s - c.s) < merge);
    if (o) { o.n += c.w; continue; }
    out.push({ R: c.R, s: c.s, kind: c.kind, n: c.w });
  }
  return out.sort((a, b) => b.n - a.n);
}

// ---------------------------------------------------------------- entrance
// Portal proud of the wall face (no wall cut needed), glazed double doors with sidelights and transom, landing, steps with
// stainless handrails down to grade, optional canopy with downlights, wall sconces and a name sign.
// o: { w (door group width 2.6), h (to frame top 3.1), floor (abs y; default grade at the door), grade, surround: mat|false,
//      sw (surround width 0.35), sp (surround projection 0.32), frame, glass, door: 'glass'|'wood', doorMat, stepMat,
//      landing (depth 1.6), canopy: {d, w, t, mat, fascia, posts, postMat}|false, lamps (true), sign: {text, h, opts}, signText }
export function entry(K, R, s, o = {}) {
  const M = K.M; const X = rnMats(M);
  const w = o.w ?? 2.6, h = o.h ?? 3.1, sw = o.sw ?? 0.35, sp = o.sp ?? 0.32;
  const gy = o.grade ?? gRun(K, R, s, 1.6); const fl = o.floor ?? gy; const FR = o.frame || X.alum; const GL = o.glass || M.windowNight;
  const walk = [], cols = [];
  const s0 = s - w / 2, s1 = s + w / 2;
  if (o.surround !== false) { // portal surround (jambs + head)
    const S = o.surround || M.concrete;
    K.rbox(R, S, s0 - sw, fl - 0.4, -0.05, s0, fl + h + sw, sp); K.rbox(R, S, s1, fl - 0.4, -0.05, s1 + sw, fl + h + sw, sp);
    K.rbox(R, S, s0 - sw, fl + h, -0.05, s1 + sw, fl + h + sw, sp);
  }
  const dz = o.surround === false ? 0.03 : 0.04; // door plane just proud of the wall face, inside the portal
  K.rbox(R, M.concreteDark, s0, fl, -0.02, s1, fl + h, dz - 0.01);
  K.rbox(R, GL, s0, fl, dz - 0.01, s1, fl + h, dz);
  const tr = fl + Math.min(2.35, h - 0.45); const side = w > 2.3 ? Math.min(0.55, (w - 1.9) / 2) : 0;
  const vs = [s0, s0 + side, s, s1 - side, s1].filter((v, i, a) => a.indexOf(v) === i);
  for (const v of vs) K.rbox(R, FR, v - 0.045, fl, dz, v + 0.045, fl + h, dz + 0.09, { detail: true });
  K.rbox(R, FR, s0, tr - 0.05, dz, s1, tr + 0.05, dz + 0.09, { detail: true });
  K.rbox(R, FR, s0, fl + h - 0.08, dz, s1, fl + h, dz + 0.09, { detail: true });
  if (o.door === 'wood') { const D = o.doorMat || M.woodDark; K.rbox(R, D, s0 + side + 0.04, fl, dz, s1 - side - 0.04, tr - 0.05, dz + 0.05); K.rbox(R, M.bronze, s - 0.16, fl + 0.95, dz + 0.05, s - 0.1, fl + 1.25, dz + 0.1, { detail: true }); K.rbox(R, M.bronze, s + 0.1, fl + 0.95, dz + 0.05, s + 0.16, fl + 1.25, dz + 0.1, { detail: true }); }
  else for (const [a, b] of [[s0 + side, s], [s, s1 - side]]) { K.rbox(R, FR, a, fl, dz, b, fl + 0.28, dz + 0.07, { detail: true }); K.rbox(R, X.steel, a + 0.12, fl + 0.98, dz + 0.09, b - 0.12, fl + 1.04, dz + 0.14, { detail: true }); }
  // landing + steps to grade
  const ld = o.landing ?? 1.6; const lw = o.lw ?? (w + 2 * sw + 0.6); const SM = o.stepMat || M.concrete;
  const top = fl; const rise = top - gy;
  if (ld > 0) { K.rbox(R, SM, s - lw / 2, Math.min(gy, top) - 0.8, 0, s + lw / 2, top, ld); walk.push(K.walkPoly([P(R, s - lw / 2, 0), P(R, s + lw / 2, 0), P(R, s + lw / 2, ld), P(R, s - lw / 2, ld)], top)); }
  if (rise > 0.12) {
    const n = Math.max(1, Math.round(rise / 0.16)); const tread = 0.32; const rr = rise / n; const sw2 = Math.min(lw, o.stairW ?? (w + 0.8));
    for (let i = 0; i < n; i++) { const yt = top - rr * (i + 1); K.rbox(R, SM, s - sw2 / 2, gy - 0.6, ld + tread * i, s + sw2 / 2, yt, ld + tread * (i + 1)); }
    const d1 = ld + tread * n;
    const cs = [P(R, s - sw2 / 2, ld), P(R, s + sw2 / 2, ld), P(R, s + sw2 / 2, d1), P(R, s - sw2 / 2, d1)].map(([u, v]) => K.xz(u, v));
    const xs = cs.map((c) => c[0]), zs = cs.map((c) => c[1]);
    walk.push({ type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
      heightAt: (x, z) => { const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1]; if (Math.abs(ss - s) > sw2 / 2 + 0.05 || dd < ld - 0.05 || dd > d1 + 0.05) return null; const i = Math.min(n - 1, Math.max(0, Math.floor((dd - ld) / tread))); return top - rr * (i + 1); } });
    if (n >= 3) for (const sx of [s - sw2 / 2 + 0.12, s + sw2 / 2 - 0.12]) { // stainless handrails on posts
      tube(K, R, X.steel, [sx, top + 0.9, ld - 0.25], [sx, gy + 0.9, d1 + 0.25], 0.022);
      for (const t of [0, 0.5, 1]) { const dd = ld + (d1 - ld) * t; const yb = top - rise * t; tube(K, R, X.steel, [sx, yb - 0.05, dd], [sx, yb + 0.9, dd], 0.02); }
    }
  }
  if (o.canopy) {
    const C = o.canopy; const cw = C.w ?? w + 2 * sw + 1.2, cd = C.d ?? 2.2, ct = C.t ?? 0.22; const cy = C.y ?? (fl + h + (o.surround === false ? 0.15 : sw + 0.1));
    K.rbox(R, C.mat || M.concreteDark, s - cw / 2, cy, 0, s + cw / 2, cy + ct, cd);
    K.rbox(R, C.fascia || C.mat || M.concreteDark, s - cw / 2, cy - 0.12, cd - 0.06, s + cw / 2, cy + ct + 0.05, cd + 0.02, { detail: true });
    const nl = Math.max(2, Math.round(cw / 1.6));
    for (let k = 0; k < nl; k++) { const ss = s - cw / 2 + (k + 0.5) * cw / nl; K.rbox(R, M.lampGlow, ss - 0.09, cy - 0.015, cd * 0.55 - 0.09, ss + 0.09, cy, cd * 0.55 + 0.09, { detail: true }); }
    if (C.posts) for (const ss of [s - cw / 2 + 0.2, s + cw / 2 - 0.2]) { const g2 = gRun(K, R, ss, cd - 0.2); K.rbox(R, C.postMat || X.alum, ss - 0.07, Math.min(g2, top) - 0.3, cd - 0.3, ss + 0.07, cy, cd - 0.16); const pp = P(R, ss, cd - 0.23); cols.push(K.colCyl(pp[0], pp[1], 0.12, g2 - 0.5, cy)); }
  }
  if (o.lamps !== false) for (const ss of [s0 - (o.surround === false ? 0 : sw) - 0.45, s1 + (o.surround === false ? 0 : sw) + 0.45]) {
    const y = fl + Math.min(2.6, h - 0.2);
    K.rbox(R, M.darkBronze, ss - 0.1, y - 0.25, 0, ss + 0.1, y + 0.2, 0.12, { detail: true });
    K.rbox(R, M.lampGlow, ss - 0.07, y - 0.18, 0.12, ss + 0.07, y + 0.12, 0.17, { detail: true });
  }
  if (o.sign && o.signText) o.signText(K, R, o.sign.text, s, o.sign.y ?? (fl + h + (o.surround === false ? 0.45 : sw / 2)), o.sign.h ?? Math.min(0.28, sw * 0.7), { d: (o.surround === false ? 0.03 : sp) + 0.012, ...(o.sign.opts || {}) });
  return { walkables: walk, colliders: cols, floor: fl, grade: gy, span: [s - lw / 2, s + lw / 2] };
}

// ---------------------------------------------------------------- planting
// Foundation planting along a run between s0..s1: mulch bed (curbed) + loose shrub clumps or a clipped hedge.
// o: { d (0.85 clump offset), depth (bed depth 1.4), h (0.9), w (clump width 1.1), gap, skip: [[a,b],...], hedge, seed, mats, curb }
export function planting(K, R, s0, s1, o = {}) {
  const X = rnMats(K.M); const d = o.d ?? 0.85, bd = o.depth ?? 1.4, h = o.h ?? 0.9; const seed = o.seed ?? 1; const d0 = o.d0 ?? 0; // d0: bed inner edge (from the wall)
  const mats = o.mats || [X.leafA, X.leafB, X.leafC];
  const segs = []; let a = s0; const skip = (o.skip || []).slice().sort((x, y) => x[0] - y[0]);
  for (const [k0, k1] of skip) { if (k1 <= a) continue; if (k0 > a) segs.push([a, Math.min(k0, s1)]); a = Math.max(a, k1); if (a >= s1) break; }
  if (a < s1) segs.push([a, s1]);
  for (const [a0, a1] of segs) {
    const L = a1 - a0; if (L < 1.2) continue;
    const n = Math.max(1, Math.round(L / 2.5));
    for (let k = 0; k < n; k++) { // bed pieces step with the slope
      const b0 = a0 + L * k / n, b1 = a0 + L * (k + 1) / n; const dm = d0 + bd / 2; const gy = Math.min(gRun(K, R, b0, dm), gRun(K, R, b1, dm), gRun(K, R, (b0 + b1) / 2, dm));
      const gx = Math.max(gRun(K, R, b0, dm), gRun(K, R, b1, dm));
      K.rbox(R, X.mulch, b0, gy - 0.4, d0, b1, gx + 0.06, d0 + bd, { detail: true });
      if (o.curb !== false) K.rbox(R, X.curb, b0, gy - 0.4, d0 + bd, b1, gx + 0.14, d0 + bd + 0.12, { detail: true });
    }
    if (o.hedge) {
      const m = mats[0]; const nh = Math.max(1, Math.round(L / 1.8));
      for (let k = 0; k < nh; k++) { const b0 = a0 + 0.15 + (L - 0.3) * k / nh, b1 = a0 + 0.15 + (L - 0.3) * (k + 1) / nh; const gy = gRun(K, R, (b0 + b1) / 2, d0 + bd / 2); K.rbox(R, m, b0, gy, d0 + 0.25, b1, gy + h, d0 + bd - 0.15, { detail: true }); }
    } else {
      const step = (o.w ?? 1.1) + (o.gap ?? 0.15); const nc = Math.max(1, Math.floor((L - 0.3) / step));
      for (let k = 0; k < nc; k++) {
        const r = hash2(Math.round(a0 * 10) + k, seed, 5); const ss = a0 + 0.15 + (L - 0.3) * (k + 0.5) / nc; const dd = d0 + Math.min(bd - 0.35, d * 0.5 + bd * (0.3 + 0.2 * hash2(k, seed, 9)));
        const p = R.at(ss, dd); const gy = K.g(p[0], p[1]); const hh = h * (0.75 + 0.5 * r); const ww = step * (0.5 + 0.18 * r);
        blob(K, mats[Math.floor(hash2(k, seed, 3) * mats.length) % mats.length], p[0], gy + hh * 0.42, p[1], ww, hh * 0.58, ww * 0.9, k + seed * 31);
      }
    }
  }
}
// Concrete planter box on run R (s centre, d0 inner edge from the wall) with shrubs or a small tree; returns its collider.
export function planter(K, R, s, d0, w = 1.6, dep = 1.6, h = 0.55, o = {}) {
  const M = K.M; const X = rnMats(M); const gy = Math.min(gRun(K, R, s - w / 2, d0 + dep / 2), gRun(K, R, s + w / 2, d0 + dep / 2));
  const C = o.mat || M.concrete;
  K.rbox(R, C, s - w / 2, gy - 0.4, d0, s + w / 2, gy + h, d0 + dep, { detail: true });
  K.rbox(R, X.mulch, s - w / 2 + 0.1, gy + h, d0 + 0.1, s + w / 2 - 0.1, gy + h + 0.02, d0 + dep - 0.1, { detail: true });
  const p = R.at(s, d0 + dep / 2);
  if (o.tree) {
    const th = o.tree.h ?? 4.5; K.cyl(X.bark, p[0], gy + h, p[1], 0.09, 0.06, th * 0.55, 7, { detail: true });
    blob(K, X.leafA, p[0], gy + h + th * 0.68, p[1], th * 0.32, th * 0.3, th * 0.32, Math.round(s * 7));
  } else {
    for (let k = 0; k < 3; k++) { const q = R.at(s - w * 0.25 + w * 0.25 * k, d0 + dep / 2 + (k % 2 ? 0.2 : -0.15)); blob(K, [X.leafA, X.leafC, X.leafB][k], q[0], gy + h + 0.28, q[1], w * 0.24, 0.42, dep * 0.3, k + Math.round(s * 3)); }
  }
  return K.colPoly([R.at(s - w / 2, d0), R.at(s + w / 2, d0), R.at(s + w / 2, d0 + dep), R.at(s - w / 2, d0 + dep)], gy - 0.4, gy + h);
}
// Row of n inverted-U bike racks along run R (centred at s, d out from the wall), bikes perpendicular to the wall; nb parked bikes.
export function bikes(K, R, s, d, n = 4, nb = 2, o = {}) {
  const rot = facing(R) + Math.PI / 2; const cols = []; const pitch = o.pitch ?? 0.95;
  for (let i = 0; i < n; i++) {
    const ss = s + (i - (n - 1) / 2) * pitch; const p = R.at(ss, d);
    const c = propAt(K, 'bikeRack', p[0], p[1], rot); if (c) cols.push(c);
    if (i < nb) { const q = R.at(ss + 0.2, d); propAt(K, 'parkedBike', q[0], q[1], facing(R) + (i % 2 ? Math.PI : 0)); }
  }
  return cols;
}
// a prop on a run: s along, d out, facing outward (rotated further by `turn`)
export function furniture(K, R, name, s, d, turn = 0) { const p = R.at(s, d); return propAt(K, name, p[0], p[1], facing(R) + turn); }

// ---------------------------------------------------------------- procedural surface materials (baked once per key)
const _bk = {};
// fn(u, v) -> [r, g, b, height(0..1), roughness(0..1), alpha(0..1)?] over one texture tile covering `span` metres (u along, v up)
export function bakeMat(key, fn, { size = 512, span = 2, normal = 2.0, rough = 0.85, metal = 0, color = 0xffffff, alpha = false, side, envMapIntensity } = {}) {
  if (_bk[key]) return _bk[key];
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const ca = mk(), cn = mk(), cr = mk(); const ia = ca.getContext('2d').createImageData(size, size), inn = cn.getContext('2d').createImageData(size, size), ir = cr.getContext('2d').createImageData(size, size);
  const hg = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = fn(x / size, 1 - y / size); const i = y * size + x;
    ia.data[i * 4] = o[0]; ia.data[i * 4 + 1] = o[1]; ia.data[i * 4 + 2] = o[2]; ia.data[i * 4 + 3] = alpha ? Math.round((o[5] ?? 1) * 255) : 255;
    hg[i] = o[3] ?? 0.5; const r = Math.round(Math.max(0, Math.min(1, o[4] ?? rough)) * 255); ir.data[i * 4] = ir.data[i * 4 + 1] = ir.data[i * 4 + 2] = r; ir.data[i * 4 + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xm = hg[y * size + ((x - 1 + size) % size)], xp = hg[y * size + ((x + 1) % size)], ym = hg[((y - 1 + size) % size) * size + x], yp = hg[((y + 1) % size) * size + x];
    const nx = (xm - xp) * normal, ny = (yp - ym) * normal, l = Math.hypot(nx, ny, 1); const i = (y * size + x) * 4;
    inn.data[i] = (nx / l * 0.5 + 0.5) * 255; inn.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; inn.data[i + 3] = 255;
  }
  ca.getContext('2d').putImageData(ia, 0, 0); cn.getContext('2d').putImageData(inn, 0, 0); cr.getContext('2d').putImageData(ir, 0, 0);
  const rep = 2 / span; const tx = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; };
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: metal, map: tx(ca, true), normalMap: tx(cn, false), roughnessMap: tx(cr, false), name: 'rn:' + key });
  if (alpha) { m.alphaTest = 0.5; m.side = THREE.DoubleSide; }
  if (side != null) m.side = side; if (envMapIntensity != null) m.envMapIntensity = envMapIntensity;
  m.normalScale = new THREE.Vector2(0.8, 0.8);
  return (_bk[key] = m);
}
const _rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
// stone / metal / fibre-cement panels in columns `pw` wide; per-column horizontal joints every `ph` with a staggered offset.
// span must be a multiple of pw and ph so the tile wraps.
export function panelMat(key, { pw = 1.32, ph = 3.3, span = 6.6, base = 0xdedcd6, joint = 0x9c9a94, jw = 0.012, vary = 0.035, stagger = true, rough = 0.8, metal = 0, grain = 0.03 } = {}) {
  const B = _rgb(base), J = _rgb(joint); const nc = Math.round(span / pw), nr = Math.round(span / ph);
  return bakeMat(key, (u, v) => {
    const cu = u * nc; const col = Math.floor(cu); const fu = cu - col;
    const off = stagger ? hash2(col, 7, 3) : 0; const rv = v * nr + off; const row = Math.floor(rv); const fv = rv - row;
    const jx = jw * nc / span, jy = jw * nr / span; const isJ = fu < jx || fv < jy;
    if (isJ) return [...J, 0.15, Math.min(1, rough + 0.1)];
    const k = 1 + (hash2(col, row, 11) - 0.5) * 2 * vary + (fbm(u * 24, v * 24, 24, 3, 5) - 0.5) * grain * 2;
    return [Math.min(255, B[0] * k), Math.min(255, B[1] * k), Math.min(255, B[2] * k), 0.55, rough];
  }, { span, rough, metal, normal: 3 });
}
// flat clay / slate roof tiles: rows `rh` exposed, tiles `tw` wide, staggered half a tile
export function flatTileMat(key, { tw = 0.33, rh = 0.25, base = 0x8a4a33, vary = 0.12, rough = 0.85 } = {}) {
  const B = _rgb(base); const span = 2; const nc = Math.round(span / tw), nr = Math.round(span / rh);
  return bakeMat(key, (u, v) => {
    const rv = v * nr; const row = Math.floor(rv); const fv = rv - row; const cu = u * nc + (row % 2) * 0.5; const col = Math.floor(cu); const fu = cu - col;
    const gap = fu < 0.03; const shadow = fv < 0.14; const k = (1 + (hash2(col, row, 21) - 0.5) * 2 * vary) * (shadow ? 0.62 : 1) * (gap ? 0.7 : 1) * (0.94 + fbm(u * 16, v * 16, 16, 3, 9) * 0.12);
    return [Math.min(255, B[0] * k), Math.min(255, B[1] * k), Math.min(255, B[2] * k), shadow ? 0.1 : 0.4 + fv * 0.4, rough];
  }, { span, rough, normal: 4 });
}
