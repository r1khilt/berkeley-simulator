// Shared kit for classical / historic campus landmarks (Wheeler, California, South, Sproul, Stephens halls).
// Everything is authored in a BUILDING FRAME (u along the building's long/primary axis, v perpendicular, y up),
// then baked into the landmark's local x/z frame with a single rotation, merged per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TEX = 0.5; // UV scale: metres / 2 (materials expect one repeat per 2 m)

// ---------- geometry normalisation ----------
function norm(g) {
  if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.morphAttributes = {}; g.groups = []; g.clearGroups && g.clearGroups();
  return g;
}

// Roof UVs: u along the eave (horizontal, perpendicular to the fall line), v up-slope along the surface.
export function roofUV(g) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    nn.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
    const hl = Math.hypot(nn.x, nn.z);
    for (let k = 0; k < 3; k++) {
      const q = k === 0 ? a : k === 1 ? b : c; let U, V;
      if (hl < 1e-3) { U = q.x; V = q.z; }
      else if (Math.abs(nn.y) < 0.2) { const tx = -nn.z / hl, tz = nn.x / hl; U = q.x * tx + q.z * tz; V = q.y; }
      else { const dx = nn.x / hl, dz = nn.z / hl; const cosS = Math.abs(nn.y); U = q.x * (-dz) + q.z * dx; V = -(q.x * dx + q.z * dz) / Math.max(0.2, cosS); }
      uv[(i + k) * 2] = U * TEX; uv[(i + k) * 2 + 1] = V * TEX;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Build a triangle-soup geometry from a list of polygons (each array of [x,y,z]); fan-triangulated (convex polys only)
export function polysGeo(polys) {
  const pos = [];
  for (const P of polys) for (let i = 1; i < P.length - 1; i++) pos.push(...P[0], ...P[i], ...P[i + 1]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

export class Kit {
  constructor(ctx, angleRad) {
    this.ctx = ctx; this.M = ctx.M; this.boxUV = ctx.boxUV; this.a = angleRad;
    this.ca = Math.cos(angleRad); this.sa = Math.sin(angleRad);
    this.buckets = new Map(); this.detail = new Map(); this.extra = [];
  }
  // frame transforms (building frame u,v  <->  landmark local x,z)
  xz(u, v) { return [u * this.ca - v * this.sa, u * this.sa + v * this.ca]; }
  uv(x, z) { return [x * this.ca + z * this.sa, -x * this.sa + z * this.ca]; }
  g(u, v) { const [x, z] = this.xz(u, v); return this.ctx.groundAt(x, z); }
  gMin(u0, v0, u1, v1, n = 6) { let m = Infinity; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) m = Math.min(m, this.g(u0 + (u1 - u0) * i / n, v0 + (v1 - v0) * j / n)); return m; }
  gMax(u0, v0, u1, v1, n = 6) { let m = -Infinity; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) m = Math.max(m, this.g(u0 + (u1 - u0) * i / n, v0 + (v1 - v0) * j / n)); return m; }
  polyXZ(ptsUV) { return ptsUV.map(([u, v]) => this.xz(u, v).map((q) => +q.toFixed(3))); }

  // add geometry (already in building frame). uvMode: 'box' | 'roof' | 'keep'
  add(mat, geo, { detail = false, uvMode = 'box' } = {}) {
    if (!mat) throw new Error('missing material');
    let g = geo;
    if (uvMode === 'box') g = this.boxUV(g.index ? g.toNonIndexed() : g);
    else if (uvMode === 'roof') g = roofUV(g);
    g = norm(g);
    const map = detail ? this.detail : this.buckets;
    if (!map.has(mat)) map.set(mat, []);
    map.get(mat).push(g);
    return g;
  }
  box(mat, u0, y0, v0, u1, y1, v1, opts) {
    const g = new THREE.BoxGeometry(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
    g.translate((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2);
    return this.add(mat, g, opts);
  }
  // oriented box: centre (u,y,v), size (w along dir, h, d across), dir angle in building frame (radians, 0 = +u)
  obox(mat, u, y, v, w, h, d, rot = 0, opts) {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateY(-rot); g.translate(u, y, v); return this.add(mat, g, opts);
  }
  cyl(mat, u, y0, v, r0, r1, h, seg = 12, opts) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(u, y0 + h / 2, v); return this.add(mat, g, opts);
  }
  lathe(mat, prof, u, y, v, seg = 16, opts) { // prof: [[r, y], ...] bottom→top
    const g = new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(Math.max(0.0001, r), yy)), seg); g.translate(u, y, v); return this.add(mat, g, opts);
  }

  // ---------- façade runs ----------
  // A run is a straight wall face from a=[u,v] to b=[u,v]; outward normal = (-tz, tx) (walk with the building on your LEFT... i.e.
  // south façade west→east, east façade south→north, north façade east→west, west façade north→south).
  run(a, b, off = 0) { // off: shift the face outward (e.g. 0.015 to win over a coincident face of another run)
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = [-t[1], t[0]]; if (off) { a = [a[0] + n[0] * off, a[1] + n[1] * off]; b = [b[0] + n[0] * off, b[1] + n[1] * off]; }
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(t[0], 0, t[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, n[1]));
    m.setPosition(a[0], 0, a[1]);
    return { a, b, L, t, n, m, at: (s, d = 0) => [a[0] + t[0] * s + n[0] * d, a[1] + t[1] * s + n[1] * d] };
  }
  // add geometry authored in run-local coords (x = along run, y = up, z = outward)
  addRun(R, mat, geo, opts) { geo.applyMatrix4(R.m); return this.add(mat, geo, opts); }
  rbox(R, mat, s0, y0, d0, s1, y1, d1, opts) {
    const g = new THREE.BoxGeometry(Math.abs(s1 - s0), Math.abs(y1 - y0), Math.abs(d1 - d0)); g.translate((s0 + s1) / 2, (y0 + y1) / 2, (d0 + d1) / 2);
    return this.addRun(R, mat, g, opts);
  }
  // Wall face with openings (real holes with reveals). openings: {s0,s1,y0,y1,arch?:true|'seg', rise?}
  // The slab spans d ∈ [-depth, 0]. Returns nothing; also builds glass/door fillers if requested.
  wall(R, mat, s0, s1, y0, y1, openings = [], depth = 0.45, opts) {
    const sh = new THREE.Shape(); sh.moveTo(s0, y0); sh.lineTo(s1, y0); sh.lineTo(s1, y1); sh.lineTo(s0, y1); sh.lineTo(s0, y0);
    for (const o of openings) {
      const h = new THREE.Path();
      const w = o.s1 - o.s0;
      if (o.arch === true) { // semicircular head; y1 = springing + w/2
        const spring = o.y1 - w / 2; h.moveTo(o.s0, o.y0); h.lineTo(o.s0, spring); h.absarc((o.s0 + o.s1) / 2, spring, w / 2, Math.PI, 0, true); h.lineTo(o.s1, o.y0); h.lineTo(o.s0, o.y0);
      } else if (o.arch === 'seg') { // segmental head with given rise
        const rise = o.rise ?? w * 0.15; const spring = o.y1 - rise; const R2 = (w * w / 4 + rise * rise) / (2 * rise); const cy = o.y1 - R2;
        const a0 = Math.atan2(spring - cy, o.s0 - (o.s0 + o.s1) / 2), a1 = Math.atan2(spring - cy, o.s1 - (o.s0 + o.s1) / 2);
        h.moveTo(o.s0, o.y0); h.lineTo(o.s0, spring); h.absarc((o.s0 + o.s1) / 2, cy, R2, a0, a1, true); h.lineTo(o.s1, o.y0); h.lineTo(o.s0, o.y0);
      } else if (o.arch === 'gothic') { // pointed / four-centred (Tudor) head; rise = o.rise (default 0.55 w)
        const rise = o.rise ?? w * 0.55; const spring = o.y1 - rise; const cx = (o.s0 + o.s1) / 2;
        h.moveTo(o.s0, o.y0); h.lineTo(o.s0, spring); h.quadraticCurveTo(o.s0, o.y1 - rise * 0.22, cx, o.y1); h.quadraticCurveTo(o.s1, o.y1 - rise * 0.22, o.s1, spring); h.lineTo(o.s1, o.y0); h.lineTo(o.s0, o.y0);
      } else { h.moveTo(o.s0, o.y0); h.lineTo(o.s1, o.y0); h.lineTo(o.s1, o.y1); h.lineTo(o.s0, o.y1); h.lineTo(o.s0, o.y0); }
      sh.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: this.curveSeg ?? 6 });
    g.translate(0, 0, -depth);
    this.addRun(R, mat, g, opts);
  }
  // Window/door filler inside an opening: glass (or door) at depth -rev, with frame + mullions.
  // kind: 'win' | 'door' ; mull: number of vertical mullions; tran: transom heights (abs y)
  fill(R, o, { rev = 0.35, glass, frame, kind = 'win', mull = 1, tran = [], door } = {}) {
    const M = this.M; glass = glass || M.windowNight; frame = frame || M.whitePaint;
    const w = o.s1 - o.s0; const d = -rev;
    let top = o.y1;
    // glass/door plane
    const shp = new THREE.Shape(); const pts = this._openingPts(o); shp.setFromPoints(pts.map(([s, y]) => new THREE.Vector2(s, y)));
    const gg = new THREE.ShapeGeometry(shp, 6); gg.translate(0, 0, d);
    if (kind === 'door') {
      // door leaves up to doorTop, glass fanlight above
      const dt = o.doorTop ?? Math.min(o.y1, o.y0 + 2.6);
      this.rbox(R, door || M.woodDark, o.s0, o.y0, d - 0.06, o.s1, dt, d);
      this.rbox(R, frame, (o.s0 + o.s1) / 2 - 0.04, o.y0, d, (o.s0 + o.s1) / 2 + 0.04, dt, d + 0.05, { detail: true });
      // panels
      for (const s of [o.s0 + w * 0.25, o.s0 + w * 0.75]) {
        this.rbox(R, door || M.woodDark, s - w * 0.17, o.y0 + 0.3, d, s + w * 0.17, o.y0 + (dt - o.y0) * 0.45, d + 0.03, { detail: true });
        this.rbox(R, door || M.woodDark, s - w * 0.17, o.y0 + (dt - o.y0) * 0.55, d, s + w * 0.17, dt - 0.25, d + 0.03, { detail: true });
      }
      if (o.y1 - dt > 0.2) {
        const clip = this._clipShape(pts, dt);
        if (clip) { const sg = new THREE.ShapeGeometry(clip, 6); sg.translate(0, 0, d); this.addRun(R, glass, sg, { uvMode: 'keep' }); }
        this.rbox(R, frame, o.s0, dt - 0.06, d, o.s1, dt + 0.06, d + 0.06, { detail: true });
      }
    } else {
      this.addRun(R, glass, gg, { uvMode: 'keep' });
    }
    // frame members (detail)
    const fw = o.fw ?? 0.07, fd = o.fd ?? 0.06;
    const sp = (o.arch ? o.y1 - (o.arch === true ? w / 2 : o.arch === 'gothic' ? (o.rise ?? w * 0.55) : (o.rise ?? w * 0.15)) : o.y1);
    if (kind !== 'door') {
      this.rbox(R, frame, o.s0, o.y0, d, o.s1, o.y0 + fw, d + fd, { detail: true });
      this.rbox(R, frame, o.s0, o.y0, d, o.s0 + fw, sp, d + fd, { detail: true });
      this.rbox(R, frame, o.s1 - fw, o.y0, d, o.s1, sp, d + fd, { detail: true });
      if (!o.arch) this.rbox(R, frame, o.s0, o.y1 - fw, d, o.s1, o.y1, d + fd, { detail: true });
      for (let i = 1; i <= mull; i++) { const s = o.s0 + w * i / (mull + 1); this.rbox(R, frame, s - 0.035, o.y0, d, s + 0.035, o.arch ? sp + (o.y1 - sp) * 0.8 : o.y1, d + fd, { detail: true }); }
      for (const ty of tran) this.rbox(R, frame, o.s0, ty - 0.035, d, o.s1, ty + 0.035, d + fd, { detail: true });
      if (o.muntins) { const top = o.arch ? sp : o.y1; for (let k = 1; k <= o.muntins; k++) { const yy = o.y0 + (top - o.y0) * k / (o.muntins + 1); this.rbox(R, frame, o.s0, yy - 0.02, d, o.s1, yy + 0.02, d + fd * 0.8, { detail: true }); } }
      if (o.arch) this.rbox(R, frame, o.s0, sp - 0.035, d, o.s1, sp + 0.035, d + fd, { detail: true });
    }
    // sill (projecting stone)
    if (o.sill !== false) this.rbox(R, o.sillMat || M.granite, o.s0 - 0.08, o.y0 - 0.12, -rev, o.s1 + 0.08, o.y0, 0.1);
  }
  _openingPts(o) {
    const w = o.s1 - o.s0, pts = [];
    if (o.arch === true) { const sp = o.y1 - w / 2, cx = (o.s0 + o.s1) / 2; pts.push([o.s0, o.y0], [o.s1, o.y0], [o.s1, sp]); for (let i = 1; i < 12; i++) { const a = Math.PI * i / 12; pts.push([cx + Math.cos(a) * w / 2, sp + Math.sin(a) * w / 2]); } pts.push([o.s0, sp]); }
    else if (o.arch === 'seg') { const rise = o.rise ?? w * 0.15, sp = o.y1 - rise, R2 = (w * w / 4 + rise * rise) / (2 * rise), cy = o.y1 - R2, cx = (o.s0 + o.s1) / 2; const a0 = Math.atan2(sp - cy, w / 2); pts.push([o.s0, o.y0], [o.s1, o.y0], [o.s1, sp]); for (let i = 1; i < 8; i++) { const a = a0 + (Math.PI - 2 * a0) * i / 8; pts.push([cx + Math.cos(a) * R2, cy + Math.sin(a) * R2]); } pts.push([o.s0, sp]); }
    else if (o.arch === 'gothic') { const sp = o.y1 - (o.rise ?? w * 0.55), cx = (o.s0 + o.s1) / 2; pts.push([o.s0, o.y0], [o.s1, o.y0], [o.s1, sp]); for (let i = 1; i <= 4; i++) { const t = i / 5; pts.push([o.s1 + (cx - o.s1) * t * t, sp + (o.y1 - sp) * Math.sin(t * Math.PI / 2)]); } pts.push([cx, o.y1]); for (let i = 4; i >= 1; i--) { const t = i / 5; pts.push([o.s0 + (cx - o.s0) * t * t, sp + (o.y1 - sp) * Math.sin(t * Math.PI / 2)]); } pts.push([o.s0, sp]); }
    else pts.push([o.s0, o.y0], [o.s1, o.y0], [o.s1, o.y1], [o.s0, o.y1]);
    return pts;
  }
  _clipShape(pts, ymin) { // keep the part of a (convex-ish) opening above ymin
    const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; const pin = p[1] >= ymin, qin = q[1] >= ymin; if (pin) out.push(p); if (pin !== qin) { const t = (ymin - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * t, ymin]); } }
    if (out.length < 3) return null; const s = new THREE.Shape(); s.setFromPoints(out.map(([a, b]) => new THREE.Vector2(a, b))); return s;
  }
  // Horizontal moulding along a run: profile [[out, y], ...] (out ≥ 0 outward from the face), from s0 to s1, with returns.
  mould(R, mat, s0, s1, prof, { ret0 = true, ret1 = true, detail = false } = {}) {
    const shape = new THREE.Shape(); shape.moveTo(0, prof[0][1]);
    for (const [o, y] of prof) shape.lineTo(o, y); shape.lineTo(0, prof[prof.length - 1][1]); shape.lineTo(0, prof[0][1]);
    const maxO = Math.max(...prof.map((p) => p[0]));
    const a = s0 - (ret0 ? maxO : 0), b = s1 + (ret1 ? maxO : 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: b - a, bevelEnabled: false, curveSegments: 4 });
    // shape is in (out, y); extrude along z → map to run: x = along, y = up, z = out
    const m = new THREE.Matrix4().set(0, 0, -1, b, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(m);
    this.addRun(R, mat, g, { detail });
  }
  // Closed moulding loop around a polygon (building frame, any orientation) with mitred corners.
  loop(mat, poly, prof, { detail = false, uvMode = 'box', skipEdges = [] } = {}) {
    let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const sgn = area > 0 ? 1 : -1; const n = poly.length;
    const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
    const off = (i, o) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [poly[i][0] + o * (n1[0] + n2[0]) / dd, poly[i][1] + o * (n1[1] + n2[1]) / dd]; };
    const pos = [];
    for (let k = 0; k < prof.length - 1; k++) {
      const [o0, y0] = prof[k], [o1, y1] = prof[k + 1];
      for (let i = 0; i < n; i++) {
        if (skipEdges.includes(i)) continue;
        const j = (i + 1) % n; const A = off(i, o0), B = off(j, o0), C = off(j, o1), D = off(i, o1);
        const P0 = [A[0], y0, A[1]], P1 = [B[0], y0, B[1]], P2 = [C[0], y1, C[1]], P3 = [D[0], y1, D[1]];
        if (sgn > 0) pos.push(...P0, ...P2, ...P1, ...P0, ...P3, ...P2); else pos.push(...P0, ...P1, ...P2, ...P0, ...P2, ...P3);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    this.add(mat, g, { detail, uvMode });
  }
  // Flat horizontal polygon (with optional holes) at height y, facing up (or down if down=true)
  flat(mat, poly, y, holes = [], down = false, opts) {
    const s = new THREE.Shape(); s.setFromPoints(poly.map(([u, v]) => new THREE.Vector2(u, -v)));
    for (const h of holes) { const p = new THREE.Path(); p.setFromPoints(h.map(([u, v]) => new THREE.Vector2(u, -v))); s.holes.push(p); }
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); if (down) g.rotateX(Math.PI); g.translate(0, y, 0);
    return this.add(mat, g, opts);
  }
  // Generic story-banded façade along run R from s0..s1 with nb equal bays.
  // stories: [{y0,y1, win:{h, sill, w, arch, mull, tran}, mat, rustic}], returns list of bay centres
  bands(R, s0, s1, nb, stories, { depth = 0.45, frame, glass, skip = [] } = {}) {
    const bw = (s1 - s0) / nb; const cs = [];
    for (let i = 0; i < nb; i++) cs.push(s0 + bw * (i + 0.5));
    for (const st of stories) {
      const ops = [];
      if (st.win) for (let i = 0; i < nb; i++) {
        if (skip.includes(i) && !st.allBays) continue;
        const w = st.win.w ?? bw * 0.42; const y0 = st.y0 + (st.win.sill ?? 0.9); const y1 = Math.min(st.y1 - 0.25, y0 + (st.win.h ?? 2.0));
        ops.push({ s0: cs[i] - w / 2, s1: cs[i] + w / 2, y0, y1, arch: st.win.arch, rise: st.win.rise, sill: st.win.noSill ? false : undefined, muntins: st.win.muntins, fw: st.win.fw });
      }
      this.wall(R, st.mat || this.M.granite, s0, s1, st.y0, st.y1, ops, depth);
      for (const o of ops) this.fill(R, o, { frame, glass, mull: st.win.mull ?? 1, tran: st.win.tran ? [o.y0 + (o.y1 - o.y0) * st.win.tran] : [], rev: depth - 0.1 });
      if (st.rustic) this.rustic(R, s0, s1, st.y0, st.y1, ops, st.rustic, st.rmat || this.M.granite);
    }
    return cs;
  }
  // Rustication: course slabs proud of the face (channel joints between them), split around openings
  rustic(R, s0, s1, y0, y1, ops, courseH = 0.6, mat, dep = 0.06, gap = 0.035) {
    const nC = Math.max(1, Math.round((y1 - y0) / courseH)); const ch = (y1 - y0) / nC;
    for (let c = 0; c < nC; c++) {
      const a = y0 + c * ch + gap, b = y0 + (c + 1) * ch - gap;
      let segs = [[s0, s1]];
      for (const o of ops) { if (o.y1 <= a || o.y0 >= b) continue; const ns = []; for (const [p, q] of segs) { if (o.s1 <= p || o.s0 >= q) { ns.push([p, q]); continue; } if (o.s0 - 0.02 > p) ns.push([p, o.s0 - 0.02]); if (o.s1 + 0.02 < q) ns.push([o.s1 + 0.02, q]); } segs = ns; }
      for (const [p, q] of segs) if (q - p > 0.1) this.rbox(R, mat, p, a, 0, q, b, dep);
    }
  }
  // Prism (vertical extrusion) of a polygon in building frame from y0 to y1
  prism(mat, poly, y0, y1, opts, holes = []) {
    const s = new THREE.Shape(); s.setFromPoints(poly.map(([u, v]) => new THREE.Vector2(u, -v)));
    for (const h of holes) { const p = new THREE.Path(); p.setFromPoints(h.map(([u, v]) => new THREE.Vector2(u, -v))); s.holes.push(p); }
    const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    return this.add(mat, g, opts);
  }
  // Hip roof over rectangle [u0,u1]x[v0,v1]; eave at yE; slope (rise/run); optional flat deck at yTop. Ridge along the long side.
  hip(mat, u0, v0, u1, v1, yE, slope, { yTop = Infinity, hipU = true, hipV = true } = {}) {
    const w = u1 - u0, d = v1 - v0; const r = Math.min(w, d) / 2; let h = r * slope; let inset = r;
    if (yE + h > yTop) { h = yTop - yE; inset = h / slope; }
    const iu = hipU ? inset : 0, iv = hipV ? inset : 0;
    const A = [u0, yE, v0], B = [u1, yE, v0], C = [u1, yE, v1], D = [u0, yE, v1];
    const yT = yE + h;
    const a = [u0 + iu, yT, v0 + iv], b = [u1 - iu, yT, v0 + iv], c = [u1 - iu, yT, v1 - iv], dd = [u0 + iu, yT, v1 - iv];
    const polys = [[A, a, b, B], [B, b, c, C], [C, c, dd, D], [D, dd, a, A]];
    const g = polysGeo(polys);
    this.add(mat, g, { uvMode: 'roof' });
    if (a[0] < b[0] - 0.01 && a[2] < dd[2] - 0.01) this.add(mat, polysGeo([[dd, c, b, a]]), { uvMode: 'roof' });
    return yT;
  }
  // Gable roof: ridge along u (axis='u') or v; gable ends get wall triangles in wallMat
  gable(mat, u0, v0, u1, v1, yE, rise, axis = 'u', { overhang = 0.3, wallMat = null, thick = 0.25 } = {}) {
    const polys = [];
    if (axis === 'u') {
      const vm = (v0 + v1) / 2, yR = yE + rise;
      const s = overhang * rise / ((v1 - v0) / 2);
      polys.push([[u0 - overhang, yE - s, v0 - overhang], [u1 + overhang, yE - s, v0 - overhang], [u1 + overhang, yR, vm], [u0 - overhang, yR, vm]]);
      polys.push([[u1 + overhang, yE - s, v1 + overhang], [u0 - overhang, yE - s, v1 + overhang], [u0 - overhang, yR, vm], [u1 + overhang, yR, vm]]);
      this.add(mat, polysGeo(polys.map((p) => p.slice().reverse())), { uvMode: 'roof' });
      // underside
      this.add(mat, polysGeo(polys.map((p) => p.map(([x, y, z]) => [x, y - thick, z]))), { uvMode: 'roof' });
      if (wallMat) for (const uu of [u0, u1]) this.add(wallMat, polysGeo([uu === u0 ? [[uu, yE, v1], [uu, yR, vm], [uu, yE, v0]] : [[uu, yE, v0], [uu, yR, vm], [uu, yE, v1]]]));
    } else {
      const um = (u0 + u1) / 2, yR = yE + rise;
      const s = overhang * rise / ((u1 - u0) / 2);
      polys.push([[u0 - overhang, yE - s, v1 + overhang], [u0 - overhang, yE - s, v0 - overhang], [um, yR, v0 - overhang], [um, yR, v1 + overhang]]);
      polys.push([[u1 + overhang, yE - s, v0 - overhang], [u1 + overhang, yE - s, v1 + overhang], [um, yR, v1 + overhang], [um, yR, v0 - overhang]]);
      this.add(mat, polysGeo(polys.map((p) => p.slice().reverse())), { uvMode: 'roof' });
      this.add(mat, polysGeo(polys.map((p) => p.map(([x, y, z]) => [x, y - thick, z]))), { uvMode: 'roof' });
      if (wallMat) for (const vv of [v0, v1]) this.add(wallMat, polysGeo([vv === v0 ? [[u0, yE, vv], [um, yR, vv], [u1, yE, vv]] : [[u1, yE, vv], [um, yR, vv], [u0, yE, vv]]]));
    }
  }
  // Steps rising from (yLo) to (yHi) along direction: run R (s along width, climbing toward -d i.e. toward the wall)
  // simple axis-aligned version in building frame: climbs along +u or -u or +v or -v.
  stairs(mat, u0, v0, u1, v1, yLo, yHi, dir, n, { foot = 1.0 } = {}) {
    const rise = (yHi - yLo) / n; const span = dir === '+u' || dir === '-u' ? u1 - u0 : v1 - v0; const tread = span / n;
    for (let i = 0; i < n; i++) { // each step is its own tread strip (no overlapping volumes / coplanar side faces)
      const top = yLo + rise * (i + 1); const bot = yLo - foot;
      if (dir === '+u') this.box(mat, u0 + tread * i, bot, v0, u0 + tread * (i + 1), top, v1);
      else if (dir === '-u') this.box(mat, u1 - tread * (i + 1), bot, v0, u1 - tread * i, top, v1);
      else if (dir === '+v') this.box(mat, u0, bot, v0 + tread * i, u1, top, v0 + tread * (i + 1));
      else this.box(mat, u0, bot, v1 - tread * (i + 1), u1, top, v1 - tread * i);
    }
    const heightAtUV = (u, v) => {
      if (u < u0 - 0.05 || u > u1 + 0.05 || v < v0 - 0.05 || v > v1 + 0.05) return null;
      let t; if (dir === '+u') t = (u - u0) / span; else if (dir === '-u') t = (u1 - u) / span; else if (dir === '+v') t = (v - v0) / span; else t = (v1 - v) / span;
      const i = Math.min(n - 1, Math.max(0, Math.floor(t * n))); return yLo + rise * (i + 1);
    };
    return this.walkFn(u0, v0, u1, v1, heightAtUV);
  }
  walkFn(u0, v0, u1, v1, heightAtUV) {
    const cs = [this.xz(u0, v0), this.xz(u1, v0), this.xz(u1, v1), this.xz(u0, v1)];
    const xs = cs.map((c) => c[0]), zs = cs.map((c) => c[1]);
    return { type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], heightAt: (x, z) => { const [u, v] = this.uv(x, z); return heightAtUV(u, v); } };
  }
  walkPoly(ptsUV, y) { return { type: 'poly', pts: this.polyXZ(ptsUV), y }; }
  colPoly(ptsUV, y0, y1) { return { type: 'poly', pts: this.polyXZ(ptsUV), y0, y1 }; }
  colCyl(u, v, r, y0, y1) { const [x, z] = this.xz(u, v); return { type: 'cyl', x: +x.toFixed(3), z: +z.toFixed(3), r, y0, y1 }; }

  // ---------- finish: merge per material and bake rotation ----------
  finish() {
    const root = new THREE.Group(); const det = new THREE.Group(); det.userData.detail = true; det.name = 'detail';
    const rot = new THREE.Matrix4().makeRotationY(-this.a);
    const mk = (map, parent) => { for (const [mat, list] of map) { const g = mergeGeometries(list, false); if (!g) { console.warn('merge failed'); continue; } g.applyMatrix4(rot); g.computeBoundingSphere(); g.computeBoundingBox(); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); } };
    mk(this.buckets, root); mk(this.detail, det);
    root.add(det);
    for (const o of this.extra) { o.applyMatrix4(rot); root.add(o); }
    return root;
  }
}

// ---------- classical elements ----------
// Ionic column (attic base, entasis shaft optional flutes, capital with volutes). Origin at base centre; returns geometries in local coords.
export function ionicColumn(kit, mat, u, y0, v, D, H, { flutes = 24, rotV = 0, seg = 24, capMat = null, volute = 1.0 } = {}) {
  const r = D / 2;
  const baseH = 0.5 * D, capH = 0.42 * D, shaftH = H - baseH - capH;
  // base (plinth + torus + scotia + torus)
  kit.box(mat, u - r * 1.35, y0, v - r * 1.35, u + r * 1.35, y0 + 0.16 * D, v + r * 1.35);
  kit.lathe(mat, [[r * 1.32, 0.16 * D], [r * 1.34, 0.22 * D], [r * 1.3, 0.28 * D], [r * 1.12, 0.3 * D], [r * 1.05, 0.36 * D], [r * 1.14, 0.4 * D], [r * 1.12, 0.46 * D], [r * 1.02, 0.5 * D], [r, 0.5 * D]], u, y0, v, seg);
  // shaft with entasis + flutes (custom lathe)
  const rows = 8, pos = [];
  const radAt = (t) => r * (1 - 0.14 * Math.max(0, (t - 0.33) / 0.67) ** 1.5);
  const ring = (t, a) => { const fl = flutes ? 1 - 0.035 * Math.max(0, Math.cos(a * flutes)) : 1; return radAt(t) * fl; };
  const N = flutes ? flutes * 2 : seg;
  for (let i = 0; i < rows; i++) {
    const t0 = i / rows, t1 = (i + 1) / rows; const ya = y0 + baseH + shaftH * t0, yb = y0 + baseH + shaftH * t1;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const p = (t, a, y) => [u + Math.cos(a) * ring(t, a), y, v + Math.sin(a) * ring(t, a)];
      const A = p(t0, a0, ya), B = p(t0, a1, ya), C = p(t1, a1, yb), Dd = p(t1, a0, yb);
      pos.push(...A, ...C, ...B, ...A, ...Dd, ...C);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  kit.add(mat, g);
  const yc = y0 + baseH + shaftH; const rt = radAt(1);
  // astragal + echinus
  kit.lathe(capMat || mat, [[rt, 0], [rt * 1.08, 0.04 * D], [rt * 1.08, 0.08 * D], [rt, 0.1 * D], [rt * 1.18, 0.2 * D], [rt * 1.25, 0.26 * D], [0.01, 0.26 * D]], u, yc, v, seg);
  // volutes: bolster cylinders running front-back at each side, plus canalis band and abacus
  const vr = 0.2 * D * volute, vy = yc + 0.22 * D;
  const ax = rotV; // 0: façade normal along v (columns on a u-running façade)
  for (const sx of [-1, 1]) {
    const cg = new THREE.CylinderGeometry(vr, vr, D * 0.95, 14); cg.rotateX(Math.PI / 2); if (ax) cg.rotateY(Math.PI / 2);
    const off = sx * r * (1.12 + 0.25 * (volute - 1)); cg.translate(u + (ax ? 0 : off), vy, v + (ax ? off : 0)); kit.add(capMat || mat, cg);
    // volute eye/spiral rings (detail)
    for (const fz of [-1, 1]) {
      const tg = new THREE.TorusGeometry(vr * 0.62, vr * 0.12, 5, 14); if (ax) tg.rotateY(Math.PI / 2);
      tg.translate(u + (ax ? fz * D * 0.48 : off), vy, v + (ax ? off : fz * D * 0.48)); kit.add(capMat || mat, tg, { detail: true });
    }
  }
  if (!ax) kit.box(capMat || mat, u - r * 1.12, vy, v - D * 0.46, u + r * 1.12, vy + vr, v + D * 0.46); else kit.box(capMat || mat, u - D * 0.46, vy, v - r * 1.12, u + D * 0.46, vy + vr, v + r * 1.12);
  kit.box(capMat || mat, u - r * 1.38, yc + 0.34 * D, v - r * 1.38, u + r * 1.38, yc + capH, v + r * 1.38);
  return yc + capH;
}
// Pilaster on a run: from s-w/2..s+w/2, projecting p; with base and capital blocks
export function pilaster(kit, R, mat, s, w, y0, y1, p = 0.25, { ionic = true, flutes = 0 } = {}) {
  kit.rbox(R, mat, s - w / 2 - 0.06, y0, 0, s + w / 2 + 0.06, y0 + 0.45, p + 0.06);
  kit.rbox(R, mat, s - w / 2, y0 + 0.45, 0, s + w / 2, y1 - 0.5, p);
  if (flutes) for (let i = 1; i < flutes; i++) { const x = s - w / 2 + (w * i) / flutes; kit.rbox(R, kit.M.graniteDark, x - 0.025, y0 + 0.7, p, x + 0.025, y1 - 0.75, p + 0.012, { detail: true }); }
  kit.rbox(R, mat, s - w / 2 - 0.05, y1 - 0.5, 0, s + w / 2 + 0.05, y1 - 0.38, p + 0.05);
  kit.rbox(R, mat, s - w / 2 - 0.12, y1 - 0.12, 0, s + w / 2 + 0.12, y1, p + 0.12);
  if (ionic) for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.13, 0.13, p + 0.02, 10); g.rotateX(Math.PI / 2); g.translate(s + sx * (w / 2 - 0.05), y1 - 0.26, (p + 0.02) / 2); kit.addRun(R, mat, g); }
  kit.rbox(R, mat, s - w / 2 + 0.05, y1 - 0.38, 0, s + w / 2 - 0.05, y1 - 0.12, p + 0.02);
}
// Classical urn
export function urn(kit, mat, u, y, v, h = 1.6) {
  const s = h / 1.6;
  kit.box(mat, u - 0.32 * s, y, v - 0.32 * s, u + 0.32 * s, y + 0.18 * s, v + 0.32 * s);
  kit.lathe(mat, [[0.22, 0.18], [0.14, 0.3], [0.12, 0.42], [0.3, 0.55], [0.42, 0.75], [0.44, 0.95], [0.36, 1.12], [0.3, 1.2], [0.36, 1.25], [0.3, 1.3], [0.12, 1.36], [0.1, 1.45], [0.06, 1.6], [0.001, 1.6]].map(([r, yy]) => [r * s, yy * s]), u, y, v, 14);
}
// Balustrade along a run from s0..s1 at base height y, total height h
export function balustrade(kit, R, mat, s0, s1, y, h = 1.0, { pitch = 0.32, d = 0, piers = [] } = {}) {
  kit.rbox(R, mat, s0, y, d - 0.22, s1, y + 0.16, d + 0.22);
  kit.rbox(R, mat, s0 - 0.03, y + h - 0.14, d - 0.24, s1 + 0.03, y + h, d + 0.24);
  const n = Math.max(1, Math.floor((s1 - s0) / pitch));
  const prof = [[0.07, 0], [0.07, 0.05], [0.05, 0.08], [0.11, 0.28], [0.12, 0.4], [0.05, 0.6], [0.045, 0.66], [0.08, 0.7], [0.08, 0.72]];
  const bh = h - 0.3;
  for (let i = 0; i < n; i++) {
    const s = s0 + (s1 - s0) * (i + 0.5) / n; if (piers.some((p) => Math.abs(p - s) < 0.35)) continue;
    const g = new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy * bh / 0.72)), 6); g.translate(s, y + 0.16, d);
    kit.addRun(R, mat, g, { detail: true });
  }
  for (const p of piers) kit.rbox(R, mat, p - 0.3, y, d - 0.3, p + 0.3, y + h + 0.1, d + 0.3);
}
// standard cornice profile helper: projection P at top height y (profile goes up to y)
export function corniceProfile(y, P = 1.0, H = 1.2) {
  const k = H;
  return [[0, y - k], [0.08 * P, y - k], [0.08 * P, y - k * 0.86], [0.18 * P, y - k * 0.8], [0.18 * P, y - k * 0.66], [0.3 * P, y - k * 0.6], [0.3 * P, y - k * 0.5],
    [0.85 * P, y - k * 0.44], [0.85 * P, y - k * 0.3], [0.92 * P, y - k * 0.25], [1.0 * P, y - k * 0.1], [1.0 * P, y], [0, y]];
}

// Rectangular classical block: four façades with storeys of recessed windows, cornice, core and roof.
// spec: {u0,u1,v0,v1, y0 (bottom, below grade), stories:[{y0,y1,win,mat,rustic}], eave, bay (target bay width),
//        faces:{N,S,E,W: false | {nb, skip, extra(R)}}, cornice:{P,H,mat}, roof:{type:'hip'|'flat'|'gable', slope, yTop, axis, mat}, core}
export function classicBlock(K, sp) {
  const M = K.M; const { u0, u1, v0, v1 } = sp; const eave = sp.eave;
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  const runs = {};
  for (const f of ['S', 'E', 'N', 'W']) {
    const fo = sp.faces?.[f]; if (fo === false) continue;
    const R = K.run(defs[f][0], defs[f][1]); runs[f] = R;
    const nb = fo?.nb ?? Math.max(1, Math.round(R.L / (sp.bay || 3.8)));
    const st = (fo?.stories || sp.stories);
    K.bands(R, 0, R.L, nb, st, { skip: fo?.skip || [], frame: sp.frame, glass: sp.glass, depth: sp.depth ?? 0.45 });
    const c = sp.cornice || {}; const cm = c.mat || M.granite;
    if (c.H !== 0) {
      const ret0 = !(fo?.noRet0), ret1 = !(fo?.noRet1);
      if (c.frieze !== false) K.rbox(R, cm, 0, eave - (c.H ?? 0.8) - (c.frieze ?? 0.5), -0.4, R.L, eave - (c.H ?? 0.8), 0.03);
      K.mould(R, cm, 0, R.L, corniceProfile(eave, c.P ?? 0.8, c.H ?? 0.8), { ret0, ret1 });
    }
    if (fo?.extra) fo.extra(R, nb);
  }
  // core
  const ci = sp.coreInset ?? 0.65; // keep the core behind window glass (reveals are 0.35–0.45 deep)
  if (sp.core !== false) K.box(M.concreteDark, u0 + ci, sp.y0, v0 + ci, u1 - ci, eave - 0.3, v1 - ci);
  // roof
  const r = sp.roof;
  if (r) {
    const ov = r.overhang ?? (sp.cornice?.P ?? 0.8) * 0.85;
    if (r.type === 'hip') K.hip(r.mat || M.redTile, u0 - ov, v0 - ov, u1 + ov, v1 + ov, eave - 0.05, r.slope ?? 0.45, { yTop: r.yTop ?? Infinity, hipU: r.hipU ?? true, hipV: r.hipV ?? true });
    else if (r.type === 'gable') K.gable(r.mat || M.redTile, u0, v0, u1, v1, eave, r.rise, r.axis || 'u', { overhang: ov, wallMat: r.wallMat || sp.stories[sp.stories.length - 1].mat || M.granite });
    else if (r.type === 'flat') { K.box(r.mat || M.concreteDark, u0 + 0.2, eave - 0.3, v0 + 0.2, u1 - 0.2, eave - 0.05, v1 - 0.2); if (r.parapet) for (const f of Object.keys(runs)) K.rbox(runs[f], sp.cornice?.mat || M.granite, -0.1, eave, -0.35, runs[f].L + 0.1, eave + r.parapet, 0.02); }
  }
  return runs;
}

// Annular-sector band (arched hood moulding / archivolt) on a run: centre (cx, cy) in run coords, radii r0..r1, angles a0..a1, depth d0..d1
export function arcBand(K, R, mat, cx, cy, r0, r1, a0, a1, d0, d1, opts) {
  const s = new THREE.Shape(); const n = 10;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const p = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; s.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d1 - d0, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, d0);
  return K.addRun(R, mat, g, opts);
}
// Mansard roof over rectangle: steep lower slope from yC (at the wall line + out0) to yK at `inset`, then a low hip to yTop.
export function mansard(K, u0, v0, u1, v1, yC, yK, inset, yTop, mat, upperMat, { out0 = 0.05 } = {}) {
  const poly = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  K.loop(mat, poly, [[out0, yC], [-inset, yK]], { uvMode: 'roof' });
  const a = [u0 + inset, v0 + inset, u1 - inset, v1 - inset];
  const slope = (yTop - yK) / (Math.min(a[2] - a[0], a[3] - a[1]) / 2);
  K.hip(upperMat || mat, a[0], a[1], a[2], a[3], yK, slope);
}
