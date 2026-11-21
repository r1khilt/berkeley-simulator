// Beaux-Arts building kit shared by the Doe Library and Hearst Mining modules.
// Everything is authored in a "frame" aligned with the Howard campus grid:
//   u = along the building's east axis, v = along its south axis, y = up (metres, landmark-local).
// finish() rotates the merged geometry into landmark-local x/z (so the object itself is never rotated).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const SIDE_ANG = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

export class Kit {
  constructor(ctx, thetaDeg) {
    this.ctx = ctx; this.M = ctx.M;
    this.phi = THREE.MathUtils.degToRad(-thetaDeg); // three.js rotateY angle frame -> local
    this.c = Math.cos(this.phi); this.s = Math.sin(this.phi);
    this.buckets = new Map();
  }
  // frame (u,v) -> local (x,z)
  xz(u, v) { return [u * this.c + v * this.s, -u * this.s + v * this.c]; }
  uv(x, z) { return [x * this.c - z * this.s, x * this.s + z * this.c]; }
  ground(u, v) { const [x, z] = this.xz(u, v); return this.ctx.groundAt(x, z); }
  groundMin(pts) { let m = Infinity; for (const [u, v] of pts) m = Math.min(m, this.ground(u, v)); return m; }
  groundMax(pts) { let m = -Infinity; for (const [u, v] of pts) m = Math.max(m, this.ground(u, v)); return m; }

  // geometry g is in frame coords; uvMode: 'box' (walls, level courses) | 'slope' (roof tiles parallel to eaves) | 'keep'
  add(mat, g, { detail = false, uvMode = 'box' } = {}) {
    if (!mat) throw new Error('missing material');
    g = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    if (uvMode === 'box') g = this.ctx.boxUV(g);
    else if (uvMode === 'slope') slopeUV(g);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = mat.uuid + (detail ? ':d' : '');
    if (!this.buckets.has(key)) this.buckets.set(key, { mat, detail, list: [] });
    this.buckets.get(key).list.push(g);
    return g;
  }
  box(mat, u0, u1, y0, y1, v0, v1, o) {
    if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3 || v1 - v0 < 1e-3) return;
    const g = new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0).translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return this.add(mat, g, o);
  }
  // vertical prism from a frame polygon [[u,v],...]
  prism(mat, pts, y0, y1, o) {
    const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, y1, 0);
    return this.add(mat, g, o);
  }
  // Hip roof over rectangle; truncated to a flat deck at yTop if given. Includes soffit.
  hipRoof(mat, u0, u1, v0, v1, yEave, slope, yTop = Infinity, o = {}) {
    const hu = (u1 - u0) / 2, hv = (v1 - v0) / 2;
    let ins = Math.min(hu, hv), yR = yEave + ins * slope;
    if (yR > yTop) { ins = (yTop - yEave) / slope; yR = yTop; }
    const a = [u0, yEave, v0], b = [u1, yEave, v0], c = [u1, yEave, v1], d = [u0, yEave, v1];
    const A = [u0 + ins, yR, v0 + ins], B = [u1 - ins, yR, v0 + ins], C = [u1 - ins, yR, v1 - ins], D = [u0 + ins, yR, v1 - ins];
    const tris = [];
    const quad = (p, q, r, s) => { tris.push(p, q, r, p, r, s); };
    quad(a, A, B, b); quad(b, B, C, c); quad(c, C, D, d); quad(d, D, A, a);
    if (B[0] - A[0] > 1e-3 && D[2] - A[2] > 1e-3) quad(A, D, C, B);
    this.add(mat, triGeom(tris), { ...o, uvMode: 'slope' });
    this.add(o.soffit || mat, triGeom([a, b, c, a, c, d]), { uvMode: 'box', detail: false });
    return yR;
  }
  // Gable roof: ridge along 'u' or 'v'. Returns ridge height. Gable ends are open (cover with pediments).
  gableRoof(mat, u0, u1, v0, v1, yEave, yRidge, axis = 'u', o = {}) {
    let tris;
    if (axis === 'u') {
      const vm = (v0 + v1) / 2;
      tris = [[u0, yEave, v0], [u0, yRidge, vm], [u1, yRidge, vm], [u0, yEave, v0], [u1, yRidge, vm], [u1, yEave, v0],
        [u0, yRidge, vm], [u0, yEave, v1], [u1, yEave, v1], [u0, yRidge, vm], [u1, yEave, v1], [u1, yRidge, vm]];
    } else {
      const um = (u0 + u1) / 2;
      tris = [[u0, yEave, v0], [u0, yEave, v1], [um, yRidge, v1], [u0, yEave, v0], [um, yRidge, v1], [um, yRidge, v0],
        [um, yRidge, v0], [um, yRidge, v1], [u1, yEave, v1], [um, yRidge, v0], [u1, yEave, v1], [u1, yEave, v0]];
    }
    this.add(mat, triGeom(tris), { ...o, uvMode: 'slope' });
    this.add(o.soffit || mat, triGeom([[u0, yEave, v0], [u1, yEave, v0], [u1, yEave, v1], [u0, yEave, v0], [u1, yEave, v1], [u0, yEave, v1]]), { uvMode: 'box' });
    return yRidge;
  }
  pyramid(mat, cu, cv, hu, hv, y0, h, o = {}) {
    const a = [cu - hu, y0, cv - hv], b = [cu + hu, y0, cv - hv], c = [cu + hu, y0, cv + hv], d = [cu - hu, y0, cv + hv], t = [cu, y0 + h, cv];
    this.add(mat, triGeom([a, t, b, b, t, c, c, t, d, d, t, a]), { ...o, uvMode: o.uvMode || 'slope' });
  }
  side(name, at) { return new Side(this, name, at); }

  finish() {
    const group = new THREE.Group(), detail = new THREE.Group();
    detail.userData.detail = true; detail.name = 'detail';
    const rot = new THREE.Matrix4().makeRotationY(this.phi);
    for (const { mat, detail: isD, list } of this.buckets.values()) {
      const g = mergeGeometries(list, false);
      g.applyMatrix4(rot); g.computeBoundingBox(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true;
      (isD ? detail : group).add(m);
    }
    if (detail.children.length) group.add(detail);
    return group;
  }
  polyLocal(pts) { return pts.map(([u, v]) => this.xz(u, v).map((n) => +n.toFixed(3))); }
}

// A façade plane. Local coords: s = along the wall (to the right when facing it from outside), y = up, t = outward.
class Side {
  constructor(kit, name, at) {
    this.k = kit; this.name = name; this.at = at;
    this.m = new THREE.Matrix4().makeRotationY(SIDE_ANG[name]);
    const off = { S: [0, 0, at], N: [0, 0, at], E: [at, 0, 0], W: [at, 0, 0] }[name];
    this.m.premultiply(new THREE.Matrix4().makeTranslation(off[0], 0, off[2]));
  }
  // frame coordinate along this wall -> s
  s(c) { return { S: c, N: -c, E: -c, W: c }[this.name]; }
  geom(mat, g, o) { g.applyMatrix4(this.m); return this.k.add(mat, g, o); }
  box(mat, s0, s1, y0, y1, t0, t1, o) {
    if (s0 > s1) [s0, s1] = [s1, s0];
    if (s1 - s0 < 1e-3 || y1 - y0 < 1e-3 || t1 - t0 < 1e-3) return;
    return this.geom(mat, new THREE.BoxGeometry(s1 - s0, y1 - y0, t1 - t0).translate((s0 + s1) / 2, (y0 + y1) / 2, (t0 + t1) / 2), o);
  }
  // shape in (s,y) extruded along t from t0 to t1
  shape(mat, shape, t0, t1, o) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: t1 - t0, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, t0); return this.geom(mat, g, o);
  }
  // Solid wall slab (t in [-thick,0]) with openings [{s0,s1,y0,y1,arch}] (arch: semicircular head ending at y1)
  wall(mat, s0, s1, y0, y1, thick, openings = [], o) {
    const ops = openings.slice().sort((a, b) => a.s0 - b.s0);
    let cur = s0;
    for (const op of ops) {
      this.box(mat, cur, op.s0, y0, y1, -thick, 0, o);
      this.box(mat, op.s0, op.s1, y0, op.y0, -thick, 0, o);
      if (op.arch) {
        const r = (op.s1 - op.s0) / 2, cx = (op.s0 + op.s1) / 2, ys = op.y1 - r;
        const L = new THREE.Shape(); L.moveTo(op.s0, ys); L.lineTo(op.s0, op.y1); L.lineTo(cx, op.y1); L.absarc(cx, ys, r, Math.PI / 2, Math.PI, false);
        const R = new THREE.Shape(); R.moveTo(cx, op.y1); R.lineTo(op.s1, op.y1); R.lineTo(op.s1, ys); R.absarc(cx, ys, r, 0, Math.PI / 2, false);
        this.shape(mat, L, -thick, 0, o); this.shape(mat, R, -thick, 0, o);
      }
      this.box(mat, op.s0, op.s1, op.y1, y1, -thick, 0, o);
      cur = op.s1;
    }
    this.box(mat, cur, s1, y0, y1, -thick, 0, o);
  }
  // Recessed window: glass at depth, frame + mullions (detail). arch => semicircular head.
  window(s0, s1, y0, y1, { arch = false, depth = 0.35, mullions = 1, transoms = [], frameMat, glassMat, bar = 0.07 } = {}) {
    const M = this.k.M; frameMat = frameMat || M.darkBronze; glassMat = glassMat || M.windowNight;
    const w = s1 - s0, r = w / 2, cx = (s0 + s1) / 2, ys = arch ? y1 - r : y1;
    const sh = new THREE.Shape(); sh.moveTo(s0, y0); sh.lineTo(s1, y0); sh.lineTo(s1, ys);
    if (arch) sh.absarc(cx, ys, r, 0, Math.PI, false); else sh.lineTo(s0, ys);
    sh.lineTo(s0, y0);
    const gg = new THREE.ShapeGeometry(sh, 12); gg.translate(0, 0, -depth);
    this.geom(glassMat, gg, { uvMode: 'box' });
    const d = { detail: true };
    const t0 = -depth, t1 = -depth + 0.06;
    // outer frame
    this.box(frameMat, s0, s1, y0, y0 + bar, t0, t1, d);
    this.box(frameMat, s0, s0 + bar, y0, ys, t0, t1, d); this.box(frameMat, s1 - bar, s1, y0, ys, t0, t1, d);
    if (!arch) this.box(frameMat, s0, s1, ys - bar, ys, t0, t1, d);
    for (let i = 1; i <= mullions; i++) { const sx = s0 + (w * i) / (mullions + 1); this.box(frameMat, sx - bar / 2, sx + bar / 2, y0, arch ? ys + r * Math.sin(Math.acos(Math.min(1, Math.abs(sx - cx) / r))) : ys, t0, t1, d); }
    for (const ty of transoms) this.box(frameMat, s0, s1, ty - bar / 2, ty + bar / 2, t0, t1, d);
    if (arch) {
      const ring = new THREE.Shape(); ring.absarc(cx, ys, r, 0, Math.PI, false); ring.lineTo(cx - r + bar, ys); ring.absarc(cx, ys, r - bar, Math.PI, 0, true); ring.lineTo(cx + r, ys);
      this.shape(frameMat, ring, t0, t1, d);
      this.box(frameMat, s0, s1, ys - bar / 2, ys + bar / 2, t0, t1, d);
    }
  }
  // stacked moulding: profile [[height, projection], ...] from y upward, running s0..s1 (ends extended by projection)
  moulding(mat, s0, s1, y, profile, o) {
    let yy = y;
    for (const [h, p] of profile) { this.box(mat, s0 - Math.max(0, p), s1 + Math.max(0, p), yy, yy + h, -0.3, p, o); yy += h; }
    return yy;
  }
  // repeated small blocks along s (dentils, modillions, brackets)
  repeat(mat, s0, s1, spacing, w, y0, y1, t0, t1, o = { detail: true }) {
    const n = Math.max(1, Math.floor((s1 - s0) / spacing));
    const step = (s1 - s0) / n;
    for (let i = 0; i <= n; i++) { const sc = s0 + i * step; this.box(mat, sc - w / 2, sc + w / 2, y0, y1, t0, t1, o); }
  }
  // Engaged column (centre at t = tc). style: 'composite' | 'ionic' | 'tuscan'
  column(mat, sc, y0, y1, D, { tc = 0.15, fluted = true, style = 'composite', o = {} } = {}) {
    const r = D / 2, baseH = D * 0.5, capH = style === 'tuscan' ? D * 0.55 : style === 'ionic' ? D * 0.6 : D * 1.1;
    // plinth + torus-ish base
    this.box(mat, sc - r * 1.25, sc + r * 1.25, y0, y0 + baseH * 0.45, tc - r * 1.25, tc + r * 1.25, o);
    this.geom(mat, new THREE.CylinderGeometry(r * 1.12, r * 1.18, baseH * 0.55, 20).translate(sc, y0 + baseH * 0.725, tc), o);
    const sh0 = y0 + baseH, sh1 = y1 - capH;
    let shaft;
    if (fluted) {
      const s = new THREE.Shape(); const n = 24;
      for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? r * 0.94 : r; const p = [Math.cos(a) * rr, Math.sin(a) * rr]; i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]); }
      shaft = new THREE.ExtrudeGeometry(s, { depth: sh1 - sh0, bevelEnabled: false }); shaft.rotateX(-Math.PI / 2); shaft.translate(sc, sh0, tc);
    } else shaft = new THREE.CylinderGeometry(r * 0.9, r, sh1 - sh0, 20).translate(sc, (sh0 + sh1) / 2, tc);
    this.geom(mat, shaft, o);
    // capital
    if (style === 'tuscan') {
      this.geom(mat, new THREE.CylinderGeometry(r * 1.05, r * 0.92, capH * 0.45, 20).translate(sc, sh1 + capH * 0.225, tc), o);
      this.box(mat, sc - r * 1.2, sc + r * 1.2, sh1 + capH * 0.45, y1, tc - r * 1.2, tc + r * 1.2, o);
    } else if (style === 'ionic') {
      this.geom(mat, new THREE.CylinderGeometry(r * 1.0, r * 0.92, capH * 0.3, 20).translate(sc, sh1 + capH * 0.15, tc), o);
      this.box(mat, sc - r * 1.45, sc + r * 1.45, sh1 + capH * 0.3, sh1 + capH * 0.75, tc - r * 0.9, tc + r * 0.9, o); // volutes
      for (const sx of [-1, 1]) this.geom(mat, new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 1.8, 12).rotateX(Math.PI / 2).translate(sc + sx * r * 1.25, sh1 + capH * 0.5, tc), o);
      this.box(mat, sc - r * 1.2, sc + r * 1.2, sh1 + capH * 0.75, y1, tc - r * 1.2, tc + r * 1.2, o);
    } else { // composite: bell with two rows of leaves + volutes + abacus
      this.geom(mat, new THREE.CylinderGeometry(r * 1.22, r * 0.94, capH * 0.72, 20).translate(sc, sh1 + capH * 0.36, tc), o);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; this.geom(mat, new THREE.BoxGeometry(r * 0.32, capH * 0.42, r * 0.22).translate(0, capH * 0.21, r * 1.0).rotateY(a).translate(sc, sh1 + 0.02, tc), { detail: true }); }
      for (const sx of [-1, 1]) this.geom(mat, new THREE.CylinderGeometry(r * 0.24, r * 0.24, r * 0.5, 10).rotateX(Math.PI / 2).translate(sc + sx * r * 1.15, sh1 + capH * 0.72, tc + r * 0.75), { detail: true });
      this.box(mat, sc - r * 1.4, sc + r * 1.4, sh1 + capH * 0.72, y1, tc - r * 1.4, tc + r * 1.4, o);
    }
  }
  // balustrade along s between y0 and y0+h, at t in [t0,t1]
  balustrade(mat, s0, s1, y0, h, t0, t1, spacing = 0.32) {
    const d = { detail: true };
    this.box(mat, s0, s1, y0, y0 + 0.16, t0, t1); this.box(mat, s0 - 0.04, s1 + 0.04, y0 + h - 0.14, y0 + h, t0 - 0.04, t1 + 0.04);
    const n = Math.max(2, Math.round((s1 - s0) / spacing)), tc = (t0 + t1) / 2, rb = Math.min(0.09, (t1 - t0) * 0.45);
    for (let i = 0; i < n; i++) {
      const sc = s0 + (i + 0.5) * (s1 - s0) / n;
      const g = new THREE.LatheGeometry([[0, 0], [rb * 0.7, 0], [rb * 0.7, 0.05], [rb * 1.15, 0.22 * (h - 0.3) + 0.05], [rb * 0.55, 0.62 * (h - 0.3) + 0.05], [rb * 0.6, (h - 0.3) + 0.05], [0.0, (h - 0.3) + 0.05]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
      this.geom(mat, g.translate(sc, y0 + 0.16 - 0.05, tc), d);
    }
  }
}

function triGeom(pts) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.computeVertexNormals();
  return g;
}
// Roof UVs: u along the eave, v up the slope (true slope length), metres / 2
export function slopeUV(g) {
  const p = g.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    nn.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const hl = Math.hypot(nn.x, nn.z);
    for (let k = 0; k < 3; k++) {
      const q = k === 0 ? a : k === 1 ? b : c;
      let U, V;
      if (hl < 0.05) { U = q.x; V = q.z; } else {
        const hx = nn.x / hl, hz = nn.z / hl; // downslope dir
        U = q.x * -hz + q.z * hx; V = -(q.x * hx + q.z * hz) / Math.max(0.2, Math.abs(nn.y));
      }
      uv[(i + k) * 2] = U / 2; uv[(i + k) * 2 + 1] = V / 2;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
}
