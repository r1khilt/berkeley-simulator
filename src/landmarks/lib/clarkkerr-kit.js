// Clark Kerr Campus style kit: the former California Schools for the Deaf and Blind (Berkeley), 1914–1986.
// Spanish Colonial Revival by Alfred Eichler / Office of the State Architect (1920s–1950): cream stucco walls, low red
// two-piece barrel-tile roofs (hips and simple gables, ~0.45–0.5 rise/run) with tight boxed eaves and rolled ridge caps,
// punched windows with dark steel multi-light casements set in plain stucco reveals, trabeated loggias on slender
// Tuscan columns or square piers, round-arched arcades used sparingly, square stucco chimneys with tile caps,
// red quarry-tile terraces and low stucco garden walls. Later infill (1950s gyms/shops, 1986 Redwood Gardens)
// reuses the palette.
//
// ─────────────────────────────── API ───────────────────────────────
// const K = new CKKit(ctx, angleDeg)      // extends classic-kit Kit: building frame (u along angleDeg from +x toward +z,
//                                          // v perpendicular, +v ≈ south), y up. All coordinates below are building-frame metres.
//   K.C                                     // palette: wall (cream stucco), trim, tile, glass, sash (dark steel), bronze (alu frame),
//                                           // door, conc, concDark, floor (red quarry tile), membrane, paintedBrick, shingle, glassBlind,
//                                           // plywood, iron, glassBlock, louver, white
//   K.sub(angleDeg, [u0,v0], fn)            // build fn() in a rotated sub-frame (angled wings); geometry and colliders made
//                                           // inside are rotated by angleDeg about [u0,v0]
//   K.run(a, b)                             // façade run from a to b (walk with the building on your LEFT: S façade W→E,
//                                           // E façade S→N, N façade E→W, W façade N→S); R.L = length, R.at(s, d) = point
//   K.bays(s0, s1, spec) -> ops             // window/door openings by bay: spec {n | bay (target width), edge (end margin),
//                                           //   floors:[{y (sill abs), h, w, kind, panes:[nx,ny], arch, rise, rev, skip:[i]}],
//                                           //   skip:[bay idx], only:[bay idx], doors:[{i (bay), w, h, y, kind, arch, transom}]}
//   K.facade(R, s0, s1, {y0, y1, ops, depth=0.32, mat, rev})   // stucco wall slab with real holes + fills each op:
//        op.kind: 'casement' (steel multi-light, panes [nx,ny]) | 'slider' (bronze 2-light aluminium) | 'industrial'
//                 (big steel grid) | 'french' (glazed door pair) | 'door' (plank) | 'glassdoor' | 'louver' | 'glassblock'
//                 | 'boarded' (plywood) | 'blind' (recessed infill panel, op.mat) | 'open' (no fill) ; op.arch true|'seg' for arched
//                 heads; op.frame overrides the sash material; op.glass the glass; op.tympanum fills a door's arched head
//   K.roofHip(u0,v0,u1,v1, eave, slope, {ov, hipU, hipV, yTop, caps, fascia, tile, wallMat, rake}) -> ridge y
//                                           // wall-plate rectangle in, tile hip/gable roof out (+boxed soffit, fascia,
//                                           // rolled ridge/hip caps, stucco gable triangles when hipU/hipV=false)
//   K.roofShed(u0,v0,u1,v1, yLow, yHigh, low:'+u'|'-u'|'+v'|'-v', {ov, tile})   // lean-to tile roof with flat soffit
//   K.roofFlat(u0,v0,u1,v1, y, {parapet, coping:'tile'|'cap', mat, overhang})   // flat roof with parapet + coping
//   K.wing({u0,u1,v0,v1, y0, eave, slope, faces:{N,S,E,W: spec|false}, roof:{type:'hip'|'gable-u'|'gable-v'|'flat'|'shed', ...}})
//                                           // rectangular wing: façades (spec = facade spec minus y0/y1; ops may be a
//                                           // function (R)=>ops), roof, dark core, collider. Returns runs {S,E,N,W, ridge}.
//   K.wingGroup(wings, face)                 // overlapping rectangular wings (courtyard/L/T/U plans); hidden façade
//                                           // segments dropped; face(wing, f, R, s0, s1) -> facade spec | false per visible segment
//   K.loggia(R, s0, s1, {depth, y (floor), h (beam bottom), col:'tuscan'|'pier', n, arch, roof, floor, yHigh})
//                                           // colonnade (or round-arched arcade) in front of run R with shed tile roof
//   K.chimney(u, v, yBase, yTop, {w, d, cap:'tile'|'slab', oculus, oculusAxis})
//   K.ventCluster(R, s, y, {rows, size, gap})  // pierced square gable vents (triangular cluster)
//   K.gableTri(R, s0, s1, yE, yR, mat)        // stucco triangle filling a gable end along run R
//   K.siteWall(pts, y0, h, {t, mat})          // low stucco garden wall along a polyline with flat cap (+colliders)
//   K.foundation(poly, yTop, {mat, y0})       // concrete plinth prism (seats buildings on slopes)
//   K.pad(poly, y, {mat})                     // paved terrace slab (+walkable)
//   K.col(ptsUV, y0, y1) / K.colRect(u0,v0,u1,v1,y0,y1) / K.walkRect(...)  // collider/walkable helpers (respect sub-frames)
//   K.colliders / K.walkables                 // accumulated by the helpers above
//   K.finish()                                // merge per material, returns THREE.Group (detail children flagged)
// outward(poly)                             // orient a polygon so consecutive-vertex runs face outward
// Rules of thumb (measured on campus): walls 0.32 m, glass 0.2 m back, steel sash #2b302d, eaves 0.35–0.5 m,
// roof rise/run 0.45–0.5, caps r 0.11 m, storeys ~3.1–3.4 m. Keep < ~40 openings per wall for fast triangulation.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { nightGlow } from '../../materials.js';

const _cache = new WeakMap();
function localMats(M) {
  if (_cache.has(M)) return _cache.get(M);
  const sash = new THREE.MeshStandardMaterial({ color: 0x2b302d, roughness: 0.5, metalness: 0.45 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3d342c, roughness: 0.45, metalness: 0.6 });
  const floor = M.paving.clone(); floor.color = new THREE.Color(0xc07a62);
  const paintedBrick = new THREE.MeshStandardMaterial({ color: 0xece2c9, roughness: 0.9, normalMap: M.brick.normalMap, normalScale: new THREE.Vector2(1.0, 1.0) });
  const plywood = M.wood.clone(); plywood.color = new THREE.Color(0x5b5c60);
  const glassBlock = new THREE.MeshStandardMaterial({ color: 0xb9c7c9, roughness: 0.25, metalness: 0.0 });
  const membrane = new THREE.MeshStandardMaterial({ color: 0xb5b2ab, roughness: 0.95 });
  const louver = new THREE.MeshStandardMaterial({ color: 0x3e3935, roughness: 0.85 });
  // muted, weathered terracotta (campus tile reads #9C4A36 in photos; shared redTile is brighter)
  const tile = M.redTile.clone(); tile.color = new THREE.Color(0xd8c6bc);
  // pale grey-blue glass with blinds behind (1980s aluminium sliders); glows like windowNight after dark
  const glassBlind = nightGlow(new THREE.MeshStandardMaterial({ color: 0x66707a, roughness: 0.18, metalness: 0.25, emissive: 0xffc77a, emissiveIntensity: 1.5 }), 1.0);
  // warm, smooth cream stucco (campus paint ~#E6DCC8); a warmer, smoother clone of the shared stucco
  const wall = M.stucco.clone(); wall.color = new THREE.Color(0xfff4e4); wall.normalScale = new THREE.Vector2(0.3, 0.3);
  const out = { wall, trim: wall, tile, glass: M.windowNight, glassBlind, sash, bronze, door: M.woodDark, conc: M.concrete,
    concDark: M.concreteDark, floor, membrane, paintedBrick, shingle: M.shingle, plywood, iron: M.iron, glassBlock, louver, white: M.whitePaint };
  _cache.set(M, out);
  return out;
}

export class CKKit extends Kit {
  constructor(ctx, angleDeg = 0) {
    super(ctx, THREE.MathUtils.degToRad(angleDeg));
    this.C = localMats(ctx.M);
    this._pre = null; this._preFn = null;
    this.colliders = []; this.walkables = [];
  }
  // ---------- sub-frames ----------
  sub(angleDeg, origin, fn) {
    const a = THREE.MathUtils.degToRad(angleDeg), ca = Math.cos(a), sa = Math.sin(a), [ou, ov] = origin;
    const prev = this._pre, prevFn = this._preFn;
    const m = new THREE.Matrix4().makeTranslation(ou, 0, ov).multiply(new THREE.Matrix4().makeRotationY(-a)).multiply(new THREE.Matrix4().makeTranslation(-ou, 0, -ov));
    const f = (u, v) => [ou + (u - ou) * ca - (v - ov) * sa, ov + (u - ou) * sa + (v - ov) * ca];
    this._pre = prev ? prev.clone().multiply(m) : m;
    this._preFn = prevFn ? (u, v) => prevFn(...f(u, v)) : f;
    try { fn(); } finally { this._pre = prev; this._preFn = prevFn; }
  }
  toMain(u, v) { return this._preFn ? this._preFn(u, v) : [u, v]; }
  add(mat, geo, opts) { if (this._pre) geo.applyMatrix4(this._pre); return super.add(mat, geo, opts); }
  g(u, v) { const [a, b] = this.toMain(u, v); return super.g(a, b); }
  col(ptsUV, y0, y1) { const c = this.colPoly(ptsUV.map(([u, v]) => this.toMain(u, v)), y0, y1); this.colliders.push(c); return c; }
  colRect(u0, v0, u1, v1, y0, y1) { return this.col([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], y0, y1); }
  walkRect(u0, v0, u1, v1, y) { const w = this.walkPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => this.toMain(u, v)), y); this.walkables.push(w); return w; }
  gMinRun(R, s0, s1, d = 0.3, n = 8) { let m = Infinity; for (let i = 0; i <= n; i++) { const p = R.at(s0 + (s1 - s0) * i / n, d); m = Math.min(m, this.g(p[0], p[1])); } return m; }
  gMaxRun(R, s0, s1, d = 0.6, n = 8) { let m = -Infinity; for (let i = 0; i <= n; i++) { const p = R.at(s0 + (s1 - s0) * i / n, d); m = Math.max(m, this.g(p[0], p[1])); } return m; }

  // ---------- bays → openings ----------
  bays(s0, s1, sp) {
    const edge = sp.edge ?? 0;
    const L = s1 - s0 - 2 * edge; const n = sp.n ?? Math.max(1, Math.round(L / (sp.bay ?? 3.6)));
    const bw = L / n; const ops = [];
    for (let i = 0; i < n; i++) {
      const c = s0 + edge + bw * (i + 0.5);
      if (sp.skip?.includes(i)) continue; if (sp.only && !sp.only.includes(i)) continue;
      const door = sp.doors?.find((d) => d.i === i);
      for (const [fi, f] of (sp.floors || []).entries()) {
        if (door && fi === (door.floor ?? 0)) continue;
        if (f.skip?.includes(i)) continue;
        const w = f.w ?? bw * 0.45;
        ops.push({ s0: c - w / 2, s1: c + w / 2, y0: f.y, y1: f.y + f.h, kind: f.kind || 'casement', panes: f.panes, arch: f.arch, rise: f.rise, rev: f.rev, sill: f.sill });
      }
      if (door) { const w = door.w ?? 1.8; ops.push({ s0: c - w / 2, s1: c + w / 2, y0: door.y, y1: door.y + (door.h ?? 2.4), kind: door.kind || 'door', arch: door.arch, rise: door.rise, rev: door.rev ?? 0.3, sill: false, transom: door.transom }); }
    }
    return ops;
  }
  // ---------- façade wall with openings ----------
  facade(R, s0, s1, sp) {
    const depth = sp.depth ?? 0.32;
    const ops = (typeof sp.ops === 'function' ? sp.ops(R) : sp.ops) || [];
    const clip = ops.filter((o) => o.s0 > s0 + 0.05 && o.s1 < s1 - 0.05 && o.y0 > sp.y0 + 0.02 && o.y1 < sp.y1 - 0.02);
    this.wall(R, sp.mat || this.C.wall, s0, s1, sp.y0, sp.y1, clip, depth);
    for (const o of clip) this.fillOp(R, o, { rev: o.rev ?? sp.rev ?? 0.2, depth });
    return clip;
  }
  fillOp(R, o, { rev = 0.2, depth = 0.32 } = {}) {
    const C = this.C; const k = o.kind || 'casement';
    if (k === 'open') return;
    const d = -Math.min(rev, depth - 0.04);
    const w = o.s1 - o.s0;
    const pts = this._openingPts(o);
    const spring = o.arch ? o.y1 - (o.arch === true ? w / 2 : (o.rise ?? w * 0.15)) : o.y1;
    const det = { detail: true };
    if (k === 'blind') { this.rbox(R, o.mat || C.wall, o.s0, o.y0, d - 0.05, o.s1, o.arch ? spring : o.y1, d); if (o.sill !== false) this.rbox(R, o.sillMat || C.wall, o.s0 - 0.05, o.y0 - 0.07, d, o.s1 + 0.05, o.y0 + 0.01, 0.06); return; }
    if (k === 'door' || k === 'glassdoor' || k === 'boarded' || k === 'louver') {
      const top = o.arch ? spring : o.y1;
      const leafTop = o.transom ? Math.min(top, o.y0 + o.transom) : top;
      const mat = k === 'door' ? C.door : k === 'boarded' ? C.plywood : k === 'louver' ? C.louver : C.glass;
      this.rbox(R, mat, o.s0, o.y0, d - 0.05, o.s1, leafTop, d);
      if (k === 'door') {
        for (let s = o.s0 + 0.16; s < o.s1 - 0.08; s += 0.16) this.rbox(R, C.sash, s - 0.006, o.y0 + 0.05, d, s + 0.006, leafTop - 0.05, d + 0.008, det);
        if (w > 1.3) this.rbox(R, C.sash, (o.s0 + o.s1) / 2 - 0.025, o.y0, d, (o.s0 + o.s1) / 2 + 0.025, leafTop, d + 0.02, det);
      } else if (k === 'glassdoor') {
        const fw = 0.07;
        this.rbox(R, C.sash, o.s0, o.y0, d, o.s0 + fw, leafTop, d + 0.05, det); this.rbox(R, C.sash, o.s1 - fw, o.y0, d, o.s1, leafTop, d + 0.05, det);
        this.rbox(R, C.sash, o.s0, o.y0, d, o.s1, o.y0 + 0.25, d + 0.05, det); this.rbox(R, C.sash, o.s0, leafTop - fw, d, o.s1, leafTop, d + 0.05, det);
        if (w > 1.3) this.rbox(R, C.sash, (o.s0 + o.s1) / 2 - 0.04, o.y0, d, (o.s0 + o.s1) / 2 + 0.04, leafTop, d + 0.05, det);
      } else if (k === 'louver') {
        for (let y = o.y0 + 0.08; y < leafTop - 0.04; y += 0.12) this.rbox(R, C.louver, o.s0, y - 0.02, d, o.s1, y + 0.02, d + 0.06, det);
      }
      if ((o.arch || o.transom) && leafTop < o.y1 - 0.15) {
        const clip = this._clipShape(pts, leafTop);
        if (clip) { const sg = new THREE.ShapeGeometry(clip, 6); sg.translate(0, 0, d + (o.tympanum ? 0.02 : 0)); this.addRun(R, o.tympanum || C.glass, sg, { uvMode: o.tympanum ? 'box' : 'keep' }); }
        this.rbox(R, o.tympanum || C.sash, o.s0, leafTop - 0.04, d, o.s1, leafTop + 0.04, d + 0.05, det);
        if (!o.tympanum) for (let i = 1; i < 4; i++) { const s = o.s0 + w * i / 4; this.rbox(R, C.sash, s - 0.02, leafTop, d, s + 0.02, o.y1 - 0.05, d + 0.04, det); }
      }
      return;
    }
    if (k === 'glassblock') {
      this.rbox(R, C.glassBlock, o.s0, o.y0, d - 0.04, o.s1, o.y1, d);
      for (let y = o.y0 + 0.2; y < o.y1 - 0.05; y += 0.2) this.rbox(R, C.wall, o.s0, y - 0.012, d, o.s1, y + 0.012, d + 0.01, det);
      for (let s = o.s0 + 0.2; s < o.s1 - 0.05; s += 0.2) this.rbox(R, C.wall, s - 0.012, o.y0, d, s + 0.012, o.y1, d + 0.01, det);
      return;
    }
    // glazed windows
    { const shape = new THREE.Shape(); shape.setFromPoints(pts.map(([s, y]) => new THREE.Vector2(s, y))); const gg = new THREE.ShapeGeometry(shape, 6); gg.translate(0, 0, d); this.addRun(R, o.glass || C.glass, gg, { uvMode: 'keep' }); }
    const frame = o.frame || (k === 'slider' ? C.bronze : C.sash);
    const fw = k === 'slider' ? 0.06 : 0.05, fd = 0.045;
    this.rbox(R, frame, o.s0, o.y0, d, o.s1, o.y0 + fw, d + fd, det);
    this.rbox(R, frame, o.s0, o.y0, d, o.s0 + fw, spring, d + fd, det);
    this.rbox(R, frame, o.s1 - fw, o.y0, d, o.s1, spring, d + fd, det);
    if (!o.arch) this.rbox(R, frame, o.s0, o.y1 - fw, d, o.s1, o.y1, d + fd, det);
    else this.rbox(R, frame, o.s0, spring - 0.025, d, o.s1, spring + 0.025, d + fd, det);
    let nx, ny;
    if (k === 'slider') { nx = 2; ny = 1; }
    else if (k === 'industrial') { nx = o.panes?.[0] ?? Math.max(3, Math.round(w / 0.45)); ny = o.panes?.[1] ?? Math.max(4, Math.round((spring - o.y0) / 0.42)); }
    else if (k === 'french') { nx = o.panes?.[0] ?? 4; ny = o.panes?.[1] ?? 5; }
    else { nx = o.panes?.[0] ?? Math.max(2, Math.round(w / 0.32)); ny = o.panes?.[1] ?? Math.max(3, Math.round((spring - o.y0) / 0.32)); }
    const mw = k === 'slider' ? 0.045 : 0.02;
    for (let i = 1; i < nx; i++) { const s = o.s0 + w * i / nx; const heavy = (k === 'casement' || k === 'french') && nx >= 4 && nx % 2 === 0 && i === nx / 2; const hw = heavy ? 0.035 : mw; this.rbox(R, frame, s - hw, o.y0, d, s + hw, o.arch ? spring + (o.y1 - spring) * 0.85 : o.y1, d + fd * 0.8, det); }
    for (let j = 1; j < ny; j++) { const y = o.y0 + (spring - o.y0) * j / ny; this.rbox(R, frame, o.s0, y - mw, d, o.s1, y + mw, d + fd * 0.8, det); }
    if (o.sill !== false) this.rbox(R, o.sillMat || C.wall, o.s0 - 0.05, o.y0 - 0.07, d, o.s1 + 0.05, o.y0 + 0.01, 0.06);
  }

  // ---------- roofs ----------
  _cap(P, Q, r = 0.11, mat) { // rolled barrel-tile cap along a ridge/hip line
    const a = new THREE.Vector3(...P), b = new THREE.Vector3(...Q); const L = a.distanceTo(b); if (L < 0.05) return;
    const g = new THREE.CylinderGeometry(r, r, L, 7, 1, true);
    const mid = a.clone().add(b).multiplyScalar(0.5); const dir = b.clone().sub(a).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); g.translate(mid.x, mid.y + r * 0.35, mid.z);
    this.add(mat || this.C.tile, g, { uvMode: 'roof' });
  }
  _poly(mat, P, wantUp, opts) { // add a planar polygon with the requested facing (up/down) regardless of winding
    let g = polysGeo([P]); g.computeVertexNormals(); const ny = g.attributes.normal.getY(0);
    if ((wantUp && ny < 0) || (!wantUp && ny > 0)) g = polysGeo([P.slice().reverse()]);
    return this.add(mat, g, opts);
  }
  roofHip(u0, v0, u1, v1, eave, slope, o = {}) {
    // o.ends = {u0, u1, v0, v1}: 'hip' (default) | 'gable' (stucco gable wall + rake) | 'open' (runs into another roof:
    // no overhang, no trim). Legacy o.hipU=false / o.hipV=false make both ends of that axis gables.
    const C = this.C; const ov = o.ov ?? 0.45; const tile = o.tile || C.tile; const trim = o.trim || C.trim;
    const rake = o.rake ?? 0.3; const th = o.th ?? 0.16; const fasc = o.fascia ?? 0.2;
    const E = { u0: 'hip', u1: 'hip', v0: 'hip', v1: 'hip', ...(o.hipU === false ? { u0: 'gable', u1: 'gable' } : {}), ...(o.hipV === false ? { v0: 'gable', v1: 'gable' } : {}), ...(o.ends || {}) };
    const ext = (k) => (E[k] === 'hip' ? ov : E[k] === 'gable' ? rake : 0);
    const U0 = u0 - ext('u0'), U1 = u1 + ext('u1'), V0 = v0 - ext('v0'), V1 = v1 + ext('v1');
    const yE = eave + th - ov * slope; // eave-edge height (long sides)
    const w = U1 - U0, d = V1 - V0;
    let alongU = (u1 - u0) >= (v1 - v0);
    if (E.u0 !== 'hip' || E.u1 !== 'hip') alongU = true; if (E.v0 !== 'hip' || E.v1 !== 'hip') alongU = false;
    const half = alongU ? d / 2 : w / 2;
    let h = half * slope, hin = half; if (o.yTop != null && yE + h > o.yTop) { h = o.yTop - yE; hin = h / slope; }
    const yT = yE + h;
    const i = { u0: 0, u1: 0, v0: 0, v1: 0 };
    if (alongU) { i.v0 = hin; i.v1 = hin; i.u0 = E.u0 === 'hip' ? Math.min(hin, w / 2) : 0; i.u1 = E.u1 === 'hip' ? Math.min(hin, w / 2) : 0; }
    else { i.u0 = hin; i.u1 = hin; i.v0 = E.v0 === 'hip' ? Math.min(hin, d / 2) : 0; i.v1 = E.v1 === 'hip' ? Math.min(hin, d / 2) : 0; }
    const A = [U0, yE, V0], B = [U1, yE, V0], Cc = [U1, yE, V1], D = [U0, yE, V1];
    // gable/open ends keep the eave-line height constant along the rake: corners sit at yE on the long sides only
    const a = [U0 + i.u0, yT, V0 + i.v0], b = [U1 - i.u1, yT, V0 + i.v0], c = [U1 - i.u1, yT, V1 - i.v1], dd = [U0 + i.u0, yT, V1 - i.v1];
    const tri = (P) => { const q = []; for (const p of P) if (!q.some((x) => Math.hypot(x[0] - p[0], x[1] - p[1], x[2] - p[2]) < 1e-3)) q.push(p); return q; };
    const faces = [[A, a, b, B], [B, b, c, Cc], [Cc, c, dd, D], [D, dd, a, A]];
    for (const P of faces) { const q = tri(P); if (q.length >= 3) { const area = new THREE.Vector3().crossVectors(new THREE.Vector3(...q[1]).sub(new THREE.Vector3(...q[0])), new THREE.Vector3(...q[2]).sub(new THREE.Vector3(...q[0]))).length(); if (area > 1e-4) this._poly(tile, q, true, { uvMode: 'roof' }); } }
    if (b[0] - a[0] > 0.02 && dd[2] - a[2] > 0.02) this._poly(o.deck || C.membrane, [a, b, c, dd], true);
    // eave trim per edge: fascia + soffit for eave/hip edges, rake board for gables, nothing for open ends
    const W0 = [u0, v0], W1 = [u1, v0], W2 = [u1, v1], W3 = [u0, v1];
    const edges = [ // [edge key, eave pts (outer), wall pts]
      ['v0', [U0, V0], [U1, V0], W0, W1], ['u1', [U1, V0], [U1, V1], W1, W2], ['v1', [U1, V1], [U0, V1], W2, W3], ['u0', [U0, V1], [U0, V0], W3, W0]];
    const isRake = (k) => (alongU ? (k === 'u0' || k === 'u1') : (k === 'v0' || k === 'v1')) && E[k] !== 'hip';
    for (const [k, p, q, wp, wq] of edges) {
      if (E[k] === 'open') continue;
      if (isRake(k)) {
        // sloped rake board under the gable edge
        const mid = alongU ? [p[0], yT, (V0 + V1) / 2] : [(U0 + U1) / 2, yT, p[1]];
        const P0 = [p[0], yE, p[1]], Q0 = [q[0], yE, q[1]];
        for (const [s, t] of [[P0, mid], [mid, Q0]]) { const g = polysGeo([[s, t, [t[0], t[1] - fasc, t[2]], [s[0], s[1] - fasc, s[2]]], [s, [s[0], s[1] - fasc, s[2]], [t[0], t[1] - fasc, t[2]], t]]); this.add(trim, g); }
        continue;
      }
      // fascia (double-sided strip) and soffit trapezoid
      const P0 = [p[0], yE + 0.02, p[1]], Q0 = [q[0], yE + 0.02, q[1]], P1 = [p[0], yE - fasc, p[1]], Q1 = [q[0], yE - fasc, q[1]];
      this.add(trim, polysGeo([[P1, Q1, Q0, P0], [P0, Q0, Q1, P1]]));
      this._poly(trim, [[p[0], yE - fasc, p[1]], [q[0], yE - fasc, q[1]], [wq[0], yE - fasc, wq[1]], [wp[0], yE - fasc, wp[1]]], false);
    }
    // gable walls
    const wm = o.wallMat || C.wall;
    for (const k of ['u0', 'u1', 'v0', 'v1']) {
      if (E[k] !== 'gable' || !isRake(k)) continue;
      let P;
      if (k === 'u0' || k === 'u1') { const uu = k === 'u0' ? u0 : u1; P = [[uu, eave - 0.02, v0], [uu, yT - th - 0.03, (v0 + v1) / 2], [uu, eave - 0.02, v1]]; }
      else { const vv = k === 'v0' ? v0 : v1; P = [[u0, eave - 0.02, vv], [(u0 + u1) / 2, yT - th - 0.03, vv], [u1, eave - 0.02, vv]]; }
      let g = polysGeo([P]); g.computeVertexNormals();
      const n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, 0);
      const want = { u0: [-1, 0], u1: [1, 0], v0: [0, -1], v1: [0, 1] }[k];
      if (n.x * want[0] + n.z * want[1] < 0) g = polysGeo([P.slice().reverse()]);
      this.add(wm, g);
    }
    // caps: ridge, hips, rake rolls
    if (o.caps !== false) {
      if (alongU) this._cap(a, b); else this._cap(a, dd);
      const corner = { A: [A, a], B: [B, b], C: [Cc, c], D: [D, dd] };
      const use = new Set();
      if (alongU) { if (E.u0 === 'hip') use.add('A').add('D'); if (E.u1 === 'hip') use.add('B').add('C'); }
      else { if (E.v0 === 'hip') use.add('A').add('B'); if (E.v1 === 'hip') use.add('C').add('D'); }
      for (const k of use) this._cap(...corner[k]);
      if (alongU) { if (E.u0 === 'gable') { this._cap(A, [U0, yT, (V0 + V1) / 2]); this._cap(D, [U0, yT, (V0 + V1) / 2]); } if (E.u1 === 'gable') { this._cap(B, [U1, yT, (V0 + V1) / 2]); this._cap(Cc, [U1, yT, (V0 + V1) / 2]); } }
      else { if (E.v0 === 'gable') { this._cap(A, [(U0 + U1) / 2, yT, V0]); this._cap(B, [(U0 + U1) / 2, yT, V0]); } if (E.v1 === 'gable') { this._cap(D, [(U0 + U1) / 2, yT, V1]); this._cap(Cc, [(U0 + U1) / 2, yT, V1]); } }
    }
    return yT;
  }
  roofShed(u0, v0, u1, v1, yLow, yHigh, low = '+v', o = {}) {
    const C = this.C; const ov = o.ov ?? 0.35; const tile = o.tile || C.tile; const fasc = o.fascia ?? 0.18; const trim = o.trim || C.trim;
    const run = low[1] === 'u' ? u1 - u0 : v1 - v0; const sl = (yHigh - yLow) / run;
    const yl = yLow - ov * sl, yh = yHigh;
    let P;
    if (low === '+v') P = [[u0 - ov, yh, v0], [u1 + ov, yh, v0], [u1 + ov, yl, v1 + ov], [u0 - ov, yl, v1 + ov]];
    else if (low === '-v') P = [[u1 + ov, yh, v1], [u0 - ov, yh, v1], [u0 - ov, yl, v0 - ov], [u1 + ov, yl, v0 - ov]];
    else if (low === '+u') P = [[u0, yh, v1 + ov], [u0, yh, v0 - ov], [u1 + ov, yl, v0 - ov], [u1 + ov, yl, v1 + ov]];
    else P = [[u1, yh, v0 - ov], [u1, yh, v1 + ov], [u0 - ov, yl, v1 + ov], [u0 - ov, yl, v0 - ov]];
    this._poly(tile, P, true, { uvMode: 'roof' });
    const dn = (p) => [p[0], p[1] - fasc, p[2]];
    this._poly(trim, P.map(dn), false);
    for (let i = 1; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4]; const g = polysGeo([[p, q, dn(q), dn(p)], [p, dn(p), dn(q), q]]); this.add(trim, g); }
    this._cap(P[0], P[1], 0.1);
    return sl;
  }
  roofFlat(u0, v0, u1, v1, y, o = {}) {
    const C = this.C; const par = o.parapet ?? 0.6; const t = 0.25;
    this.box(o.mat || C.membrane, u0 + 0.05, y - 0.3, v0 + 0.05, u1 - 0.05, y, v1 - 0.05);
    if (par > 0) {
      const W = o.wallMat || C.wall;
      for (const [a, b, c, d] of [[u0, v0, u1, v0 + t], [u0, v1 - t, u1, v1], [u0, v0, u0 + t, v1], [u1 - t, v0, u1, v1]]) this.box(W, a, y - 0.3, b, c, y + par, d);
      const ring = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
      if (o.coping === 'tile') this.loop(C.tile, ring, [[0.06, y + par], [0.06, y + par + 0.05], [-t / 2, y + par + 0.15], [-t - 0.06, y + par + 0.05], [-t - 0.06, y + par]], { uvMode: 'roof' });
      else this.loop(C.trim, ring, [[0.04, y + par], [0.04, y + par + 0.07], [-t - 0.04, y + par + 0.07], [-t - 0.04, y + par]]);
    } else if (o.overhang) {
      const ov = o.overhang; this.box(o.edgeMat || C.trim, u0 - ov, y - 0.35, v0 - ov, u1 + ov, y, v1 + ov);
    }
  }
  // ---------- compound helpers ----------
  wing(sp) {
    const { u0, u1, v0, v1 } = sp; const y0 = sp.y0 ?? -1.5; const E = sp.eave;
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    const runs = {};
    for (const f of ['S', 'E', 'N', 'W']) {
      const fs = sp.faces?.[f]; if (fs === false) continue;
      const R = this.run(defs[f][0], defs[f][1]); runs[f] = R;
      this.facade(R, fs?.s0 ?? 0, fs?.s1 ?? R.L, { y0, y1: E, depth: sp.depth, mat: sp.mat, ...(fs || {}), ops: fs?.ops ?? [] });
    }
    const r = sp.roof || { type: 'hip' };
    const sl = r.slope ?? sp.slope ?? 0.48;
    if (r.type === 'hip') runs.ridge = this.roofHip(u0, v0, u1, v1, E, sl, r);
    else if (r.type === 'gable-u') runs.ridge = this.roofHip(u0, v0, u1, v1, E, sl, { ...r, hipU: false });
    else if (r.type === 'gable-v') runs.ridge = this.roofHip(u0, v0, u1, v1, E, sl, { ...r, hipV: false });
    else if (r.type === 'flat') this.roofFlat(u0, v0, u1, v1, E, r);
    else if (r.type === 'shed') this.roofShed(u0, v0, u1, v1, r.yLow ?? E, r.yHigh ?? E + 1, r.low || '+v', r);
    if (sp.core !== false) this.box(this.C.concDark, u0 + 0.35, y0 + 0.2, v0 + 0.35, u1 - 0.35, E - 0.02, v1 - 0.35);
    if (sp.collide !== false) this.colRect(u0, v0, u1, v1, y0, (runs.ridge ?? E) + 0.5);
    return runs;
  }
  // Group of overlapping rectangular wings (courtyard blocks, L/T/U plans). Façade segments hidden inside another
  // wing are dropped automatically. wings: [{u0,u1,v0,v1, y0, eave, slope, roof:{type, ends, ov, ...}, core, collide}]
  // face(wing, f, R, s0, s1) -> facade spec ({ops, mat, depth}) | false, called per visible segment (f ∈ S,E,N,W).
  wingGroup(wings, face) {
    const defs = (w) => ({ S: [[w.u0, w.v1], [w.u1, w.v1]], E: [[w.u1, w.v1], [w.u1, w.v0]], N: [[w.u1, w.v0], [w.u0, w.v0]], W: [[w.u0, w.v0], [w.u0, w.v1]] });
    const out = [];
    for (const w of wings) {
      const y0 = w.y0 ?? -1.5; const res = { wing: w, runs: {} };
      for (const f of ['S', 'E', 'N', 'W']) {
        const R = this.run(...defs(w)[f]); res.runs[f] = R;
        // hidden intervals: outward probe point inside another wing
        let vis = [[0, R.L]];
        for (const o of wings) {
          if (o === w) continue;
          const e = 0.06; const inO = (p) => p[0] > o.u0 - e && p[0] < o.u1 + e && p[1] > o.v0 - e && p[1] < o.v1 + e;
          // sample to find covered span (faces are axis-aligned so the covered set is one interval)
          let a = null, b = null; const N = Math.max(8, Math.ceil(R.L / 0.25));
          for (let k = 0; k <= N; k++) { const s = R.L * k / N; if (inO(R.at(s, 0.12)) && (o.y1cut == null)) { if (a == null) a = s; b = s; } }
          if (a == null) continue;
          a = Math.max(0, a - R.L / N * 0.5); b = Math.min(R.L, b + R.L / N * 0.5);
          if (a < 0.3) a = 0; if (b > R.L - 0.3) b = R.L;
          const nv = []; for (const [p, q] of vis) { if (b <= p || a >= q) { nv.push([p, q]); continue; } if (a > p + 0.05) nv.push([p, a]); if (b < q - 0.05) nv.push([b, q]); } vis = nv;
        }
        for (const [s0, s1] of vis) {
          if (s1 - s0 < 0.1) continue;
          const sp = face ? face(w, f, R, s0, s1) : {};
          if (sp === false) continue;
          this.facade(R, s0, s1, { y0, y1: w.eave, depth: w.depth, mat: w.mat, ...(sp || {}) });
        }
      }
      const r = w.roof || { type: 'hip' }; const sl = r.slope ?? w.slope ?? 0.48;
      if (r.type === 'hip' || !r.type) res.ridge = this.roofHip(w.u0, w.v0, w.u1, w.v1, w.eave, sl, r);
      else if (r.type === 'flat') this.roofFlat(w.u0, w.v0, w.u1, w.v1, w.eave, r);
      else if (r.type === 'shed') this.roofShed(w.u0, w.v0, w.u1, w.v1, r.yLow ?? w.eave, r.yHigh ?? w.eave + 1, r.low || '+v', r);
      if (w.core !== false) this.box(this.C.concDark, w.u0 + 0.35, y0 + 0.2, w.v0 + 0.35, w.u1 - 0.35, w.eave - 0.02, w.v1 - 0.35);
      if (w.collide !== false) this.colRect(w.u0, w.v0, w.u1, w.v1, y0, (res.ridge ?? w.eave) + 0.5);
      out.push(res);
    }
    return out;
  }
  loggia(R, s0, s1, o) {
    const C = this.C; const D = o.depth ?? 2.6; const y = o.y ?? 0; const h = o.h ?? 2.8; const n = o.n ?? Math.max(2, Math.round((s1 - s0) / 2.7) + 1);
    const cs = []; for (let i = 0; i < n; i++) cs.push(s0 + 0.3 + (s1 - s0 - 0.6) * i / (n - 1));
    const dC = D - 0.3;
    if (o.arch) {
      const ops = []; for (let i = 0; i < n - 1; i++) { const a = cs[i] + 0.32, b = cs[i + 1] - 0.32; ops.push({ s0: a - s0, s1: b - s0, y0: y, y1: y + h }); ops[ops.length - 1].arch = true; }
      const RF = this.run(R.at(s0, D), R.at(s1, D));
      this.wall(RF, C.wall, 0, s1 - s0, y - 0.6, y + h + 0.75, ops, 0.45);
      for (const s of [s0, s1]) this.rbox(R, C.wall, s - (s === s0 ? 0 : 0.45), y - 0.6, 0, s + (s === s0 ? 0.45 : 0), y + h + 0.75, D - 0.45);
      for (let i = 0; i < n; i++) { const p = R.at(cs[i], D - 0.22); this.colliders.push(this.colCyl(...this.toMain(p[0], p[1]), 0.3, y - 1, y + h)); }
    } else {
      for (const s of cs) {
        const [x, z] = R.at(s, dC);
        if (o.col === 'pier') { this.rbox(R, C.wall, s - 0.24, y, dC - 0.24, s + 0.24, y + h, dC + 0.24); }
        else {
          const lg = new THREE.LatheGeometry([[0.2, 0], [0.2, 0.12], [0.16, 0.18], [0.15, 0.3], [0.13, h - 0.3], [0.15, h - 0.22], [0.17, h - 0.16], [0.21, h - 0.12], [0.21, h], [0.001, h]].map(([r2, yy]) => new THREE.Vector2(r2, yy)), 10);
          lg.translate(x, y, z); this.add(C.wall, lg);
        }
        this.colliders.push(this.colCyl(...this.toMain(x, z), 0.22, y - 1, y + h));
      }
      this.rbox(R, C.wall, s0, y + h, dC - 0.25, s1, y + h + 0.45, dC + 0.25);
    }
    if (o.roof !== false) {
      const top = o.arch ? y + h + 0.75 : y + h + 0.45;
      const pA = R.at(s0, 0), pB = R.at(s1, 0), pC = R.at(s1, D + 0.35), pD = R.at(s0, D + 0.35);
      const yH = o.yHigh ?? (top + 0.9), yL = top + 0.12;
      const P = [[pA[0], yH, pA[1]], [pB[0], yH, pB[1]], [pC[0], yL, pC[1]], [pD[0], yL, pD[1]]];
      this._poly(C.tile, P, true, { uvMode: 'roof' });
      this._poly(C.trim, P.map(([x, yy, z]) => [x, yy - 0.16, z]), false);
      this.rbox(R, C.trim, s0 - 0.05, yL - 0.2, D + 0.15, s1 + 0.05, yL, D + 0.38);
      this._cap(P[0], P[1], 0.1);
      if (!o.arch) this.rbox(R, C.trim, s0, top - 0.02, 0, s1, top, dC);
    }
    if (o.floor !== false) {
      this.rbox(R, C.floor, s0, y - 0.8, 0, s1, y + 0.02, D);
      this.walkables.push(this.walkPoly([R.at(s0, 0), R.at(s1, 0), R.at(s1, D), R.at(s0, D)].map(([u, v]) => this.toMain(u, v)), y + 0.02));
    }
  }
  chimney(u, v, yBase, yTop, o = {}) {
    const C = this.C; const w = o.w ?? 0.9, d = o.d ?? w;
    this.box(C.wall, u - w / 2, yBase, v - d / 2, u + w / 2, yTop, v + d / 2);
    if (o.cap === 'slab') this.box(C.trim, u - w / 2 - 0.08, yTop, v - d / 2 - 0.08, u + w / 2 + 0.08, yTop + 0.12, v + d / 2 + 0.08);
    else {
      this.box(C.trim, u - w / 2 - 0.05, yTop - 0.06, v - d / 2 - 0.05, u + w / 2 + 0.05, yTop, v + d / 2 + 0.05);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(C.wall, u + a * (w / 2 - 0.09) - 0.09, yTop, v + b * (d / 2 - 0.09) - 0.09, u + a * (w / 2 - 0.09) + 0.09, yTop + 0.28, v + b * (d / 2 - 0.09) + 0.09);
      this.hip(C.tile, u - w / 2 - 0.16, v - d / 2 - 0.16, u + w / 2 + 0.16, v + d / 2 + 0.16, yTop + 0.26, 0.55);
    }
    if (o.oculus) for (const sgn of [-1, 1]) { const g = new THREE.CircleGeometry(0.16, 12); if (o.oculusAxis === 'u') { g.rotateY(sgn * Math.PI / 2); g.translate(u + sgn * (w / 2 + 0.005), yTop - 0.55, v); } else { if (sgn < 0) g.rotateY(Math.PI); g.translate(u, yTop - 0.55, v + sgn * (d / 2 + 0.005)); } this.add(C.louver, g, { uvMode: 'keep' }); }
    this.colliders.push(this.colCyl(...this.toMain(u, v), Math.max(w, d) * 0.6, yBase, yTop + 0.6));
  }
  ventCluster(R, s, y, o = {}) {
    const sz = o.size ?? 0.13, gap = o.gap ?? 0.12; const rows = o.rows ?? 3;
    for (let r = 0; r < rows; r++) { const n = rows - r; for (let i = 0; i < n; i++) { const ss = s + (i - (n - 1) / 2) * (sz + gap); const yy = y + r * (sz + gap); this.rbox(R, this.C.louver, ss - sz / 2, yy, -0.1, ss + sz / 2, yy + sz, 0.004); } }
  }
  gableTri(R, s0, s1, yE, yR, mat) { this.addRun(R, mat || this.C.wall, polysGeo([[[s0, yE, 0], [s1, yE, 0], [(s0 + s1) / 2, yR, 0]]])); }
  siteWall(pts, y0, h, o = {}) {
    const t = o.t ?? 0.3;
    for (let i = 0; i < pts.length - 1; i++) {
      const R = this.run(pts[i], pts[i + 1]); const gA = this.g(...pts[i]), gB = this.g(...pts[i + 1]);
      const top = Math.max(gA, gB, y0 ?? -Infinity) + h;
      this.rbox(R, o.mat || this.C.wall, 0, Math.min(gA, gB) - 0.8, -t / 2, R.L, top, t / 2);
      this.rbox(R, this.C.trim, -0.03, top, -t / 2 - 0.04, R.L + 0.03, top + 0.07, t / 2 + 0.04);
      this.colliders.push(this.colPoly([R.at(0, -t / 2), R.at(R.L, -t / 2), R.at(R.L, t / 2), R.at(0, t / 2)].map(([u, v]) => this.toMain(u, v)), top - h - 1, top + 0.1));
    }
  }
  foundation(poly, yTop, o = {}) { this.prism(o.mat || this.C.concDark, poly, o.y0 ?? -2.5, yTop); }
  pad(poly, y, o = {}) { this.prism(o.mat || this.C.floor, poly, o.y0 ?? y - 1.5, y); const w = this.walkPoly(poly.map(([u, v]) => this.toMain(u, v)), y); this.walkables.push(w); return w; }
}

// Orient a polygon so that runs a→b built from consecutive vertices face outward (building on the left).
export function outward(poly) {
  let A = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; A += p[0] * q[1] - q[0] * p[1]; }
  return A < 0 ? poly.slice() : poly.slice().reverse();
}
