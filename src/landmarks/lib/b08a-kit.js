// b08a kit: houses, dorms and Spanish Colonial Revival halls (Clark Kerr, Holy Hill, south-side co-ops).
// Builds on classic-kit's Kit (building frame u/v, façade runs, merge-per-material). Everything here is parametric:
// a building module describes wings (rectangles in the building frame), window grids per face and a roof per wing.
import * as THREE from 'three';
import { Kit, polysGeo, corniceProfile } from './classic-kit.js';
export { Kit, polysGeo, corniceProfile };

// ---------- local palette (cached per shared material library) ----------
const _pal = new WeakMap();
export function pal(ctx) {
  const M = ctx.M; if (_pal.has(M)) return _pal.get(M);
  const c = (base, hex, extra = {}) => { const m = base.clone(); m.color = new THREE.Color(hex); Object.assign(m, extra); return m; };
  const P = {
    stuccoWhite: c(M.stuccoWhite, 0xfff8ec), // limewashed Spanish-revival stucco (warm near-white)
    tileCK: c(M.redTile, 0xeccfc2, { roughness: 0.95 }), // weathered clay barrel tile
    stuccoCream: c(M.stucco, 0xf0e4cc),
    stuccoGrey: c(M.stucco, 0xe9eaec),      // mid-century apartment stucco
    stuccoBuff: c(M.stucco, 0xe6d6b8),
    shingleBrown: c(M.shingle, 0x86603f),   // weathered cedar shingle walls (Berkeley brown shingle)
    shingleDark: c(M.shingle, 0x5e4230),    // dark-stained shingles (Hillside Club)
    roofComp: c(M.shingle, 0x6a6762),       // composition shingle roofs
    roofCompDark: c(M.shingle, 0x4f4d4a),
    roofMetal: c(M.concrete, 0x9a9e95, { roughness: 0.7, metalness: 0.2 }), // grey-green standing seam / roll roofing
    trimWhite: c(M.whitePaint, 0xf1efe8),
    trimCream: c(M.whitePaint, 0xe8e0cc),
    trimTeal: c(M.whitePaint, 0x2f8486),
    trimBlueGrey: c(M.whitePaint, 0xa9b8c0),
    trimGreen: c(M.whitePaint, 0x3c5446),
    frameDark: c(M.whitePaint, 0x2c2c2a, { roughness: 0.5 }),
    frameCK: c(M.whitePaint, 0x2e3a36, { roughness: 0.5 }),       // dark green-grey steel casements
    frameBronze: c(M.whitePaint, 0x4a463f, { roughness: 0.45, metalness: 0.3 }),
    woodBeam: c(M.woodDark, 0x6b4c34),
    woodStain: c(M.wood, 0x9a7a5a),
    concreteBuff: c(M.concrete, 0xd8d0bf),
    concreteWarm: c(M.concrete, 0xcbc3b2),
    brickRed: M.brick,
    tile: M.redTile,
    sandstone: c(M.ashlar, 0xb39a86),
    tileFloor: c(M.paving, 0xc98a6e),
  };
  _pal.set(M, P); return P;
}

// ---------- window lists ----------
// regular grid of windows on a run: bays between s0..s1 (nb bays, centred), on each floor y (bottom of floor)
export function grid(s0, s1, nb, floors, w, h, sill = 0.9, opts = {}) {
  const out = []; const bw = (s1 - s0) / nb;
  for (let i = 0; i < nb; i++) {
    if (opts.skip && opts.skip.includes(i)) continue;
    const c = s0 + bw * (i + 0.5);
    floors.forEach((fy, k) => {
      if (opts.skipFloor && opts.skipFloor(i, k)) return;
      const ww = typeof w === 'function' ? w(i, k) : w, hh = typeof h === 'function' ? h(i, k) : h;
      const pair = opts.pair || 0; // paired windows: two openings per bay separated by `pair` metres
      const mk = (cc) => out.push({ s0: cc - ww / 2, s1: cc + ww / 2, y0: fy + sill, y1: fy + sill + hh, arch: opts.arch, rise: opts.rise, mull: opts.mull, muntins: opts.muntins, tran: opts.tran, k, i });
      if (pair) { mk(c - (ww + pair) / 2); mk(c + (ww + pair) / 2); } else mk(c);
    });
  }
  return out;
}
export function at(list, floors, w, h, sill = 0.9, opts = {}) { // explicit bay centres
  const out = [];
  for (const c of list) floors.forEach((fy, k) => out.push({ s0: c - w / 2, s1: c + w / 2, y0: fy + sill, y1: fy + sill + h, arch: opts.arch, rise: opts.rise, mull: opts.mull, muntins: opts.muntins, tran: opts.tran, k }));
  return out;
}

// ---------- façade ----------
// One wall run with openings (windows/doors), filled with glass + frames. spec:
//  {s0,s1,y0,y1, mat, ops:[{s0,s1,y0,y1,kind,arch,mull,muntins,tran,door}], depth, rev, frame, sillMat, glass, shutters}
export function facade(K, R, sp) {
  const depth = sp.depth ?? 0.35, rev = sp.rev ?? Math.max(0.12, depth - 0.12);
  const ops = (sp.ops || []).filter((o) => o.s0 > sp.s0 + 0.05 && o.s1 < sp.s1 - 0.05 && o.y0 >= sp.y0 - 0.01 && o.y1 <= sp.y1 - 0.02);
  K.wall(R, sp.mat, sp.s0, sp.s1, sp.y0, sp.y1, ops, depth);
  for (const o of ops) {
    if (o.noFill) continue;                     // open recess (loggia/balcony bay): no glazing
    const kind = o.kind || 'win';
    K.fill(R, { ...o, sill: o.sill ?? (kind === 'door' ? false : sp.sill ?? true) === false ? false : undefined, sillMat: sp.sillMat }, {
      rev: o.rev ?? rev, glass: o.glass || sp.glass, frame: o.frame || sp.frame, kind, mull: o.mull ?? sp.mull ?? 0,
      tran: o.tran ? [o.y0 + (o.y1 - o.y0) * o.tran] : [], door: o.door || sp.door });
    if (sp.shutters && kind !== 'door' && !o.noShut) for (const sx of [-1, 1]) {
      const w = (o.s1 - o.s0) * 0.48; const a = sx < 0 ? o.s0 - w - 0.04 : o.s1 + 0.04;
      K.rbox(R, sp.shutters, a, o.y0, 0, a + w, o.y1, 0.04, { detail: true });
    }
    if (sp.lintel && kind !== 'door') K.rbox(R, sp.lintel, o.s0 - 0.1, o.y1, 0, o.s1 + 0.1, o.y1 + 0.16, 0.05);
    if (sp.trim && !o.arch) { // flat casing around the opening (Craftsman trim)
      const t = sp.trimW ?? 0.1, d = 0.035;
      K.rbox(R, sp.trim, o.s0 - t, o.y1, 0, o.s1 + t, o.y1 + t * 1.4, d, { detail: true });
      K.rbox(R, sp.trim, o.s0 - t, o.y0 - (kind === 'door' ? 0 : t * 0.6), 0, o.s0, o.y1, d, { detail: true });
      K.rbox(R, sp.trim, o.s1, o.y0 - (kind === 'door' ? 0 : t * 0.6), 0, o.s1 + t, o.y1, d, { detail: true });
    }
  }
  return ops;
}

// ---------- rectangular wing ----------
// sp: {u0,u1,v0,v1, y0 (base, below grade), y1 (wall top/eave), mat, faces:{S,E,N,W: false | ops[] | fn(R)->ops},
//      depth, frame, sillMat, trim, shutters, core (default true), plinth:{h, mat, out}, roof:{...}}
// Face runs follow classic-kit (building frame): S = +v side (u0→u1), E = +u side, N = -v side, W = -u side.
export function wing(K, sp) {
  const { u0, u1, v0, v1 } = sp; const runs = {};
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  for (const f of ['S', 'E', 'N', 'W']) {
    const fo = sp.faces ? sp.faces[f] : []; if (fo === false) continue;
    const R = K.run(defs[f][0], defs[f][1], sp.off || 0); runs[f] = R;
    let ops = typeof fo === 'function' ? fo(R) : (fo || []);
    if (sp.cull !== false) ops = ops.filter((o) => { if (o.noFill) return true; // drop openings buried by the slope
      const c = (o.s0 + o.s1) / 2; const g = Math.max(K.g(...R.at(c, 0.4)), K.g(...R.at(o.s0, 0.4)), K.g(...R.at(o.s1, 0.4)));
      return o.kind === 'door' ? g <= o.y0 + 0.35 : g <= o.y0 + 0.05; });
    facade(K, R, { s0: 0, s1: R.L, y0: sp.y0, y1: sp.y1, mat: sp.mat, ops, depth: sp.depth, frame: sp.frame, sillMat: sp.sillMat, trim: sp.trim, shutters: sp.shutters, lintel: sp.lintel, glass: sp.glass, door: sp.door, mull: sp.mull });
    if (sp.plinth) K.rbox(R, sp.plinth.mat, -(sp.plinth.out ?? 0.06), sp.y0, -0.3, R.L + (sp.plinth.out ?? 0.06), sp.plinth.h, sp.plinth.out ?? 0.06);
    if (sp.belt) for (const b of [].concat(sp.belt)) K.rbox(R, b.mat, -(b.out ?? 0.05), b.y, -0.2, R.L + (b.out ?? 0.05), b.y + (b.h ?? 0.2), b.out ?? 0.05);
  }
  const d = (sp.depth ?? 0.35) + 0.08;
  if (sp.core !== false) K.box(sp.coreMat || K.M.concreteDark, u0 + d, sp.y0, v0 + d, u1 - d, sp.y1 - 0.05, v1 - d);
  if (sp.roof) roof(K, { u0, u1, v0, v1, y: sp.y1, wallMat: sp.mat, ...sp.roof });
  return runs;
}

// ---------- roofs ----------
// r: {type:'gable'|'hip'|'flat'|'shed'|'pyramid', mat, u0,u1,v0,v1, y (eave), rise|slope, axis ('u'|'v'), ov (eave overhang), rake (gable-end overhang),
//     fascia (mat), soffit (mat), rafters (mat), parapet {h, mat, coping}, yTop, ridgeCap (mat), wallMat}
export function roof(K, r) {
  const M = K.M; const mat = r.mat || M.redTile; const ov = r.ov ?? 0.5;
  const { u0, u1, v0, v1 } = r; const y = r.y;
  if (r.type === 'flat') {
    K.box(r.deck || M.concreteDark, u0 + 0.05, y - 0.3, v0 + 0.05, u1 - 0.05, y, v1 - 0.05);
    if (r.parapet) {
      const ph = r.parapet.h ?? 0.8, pm = r.parapet.mat || r.wallMat, t = r.parapet.t ?? 0.25;
      K.box(pm, u0, y - 0.3, v0, u1, y + ph, v0 + t); K.box(pm, u0, y - 0.3, v1 - t, u1, y + ph, v1);
      K.box(pm, u0, y - 0.3, v0 + t, u0 + t, y + ph, v1 - t); K.box(pm, u1 - t, y - 0.3, v0 + t, u1, y + ph, v1 - t);
      if (r.parapet.coping) { const cm = r.parapet.coping, co = r.parapet.cOut ?? 0.06;
        K.box(cm, u0 - co, y + ph, v0 - co, u1 + co, y + ph + 0.08, v0 + t + co); K.box(cm, u0 - co, y + ph, v1 - t - co, u1 + co, y + ph + 0.08, v1 + co);
        K.box(cm, u0 - co, y + ph, v0 + t + co, u0 + t + co, y + ph + 0.08, v1 - t - co); K.box(cm, u1 - t - co, y + ph, v0 + t + co, u1 + co, y + ph + 0.08, v1 - t - co); }
    } else if (r.ovFlat) { // thin projecting slab edge (mid-century)
      K.box(r.slab || M.whitePaint, u0 - r.ovFlat, y - 0.25, v0 - r.ovFlat, u1 + r.ovFlat, y, v1 + r.ovFlat);
    }
    return y;
  }
  if (r.type === 'gable') {
    const axis = r.axis || (u1 - u0 >= v1 - v0 ? 'u' : 'v');
    const half = axis === 'u' ? (v1 - v0) / 2 : (u1 - u0) / 2;
    const rise = r.rise ?? half * (r.slope ?? 0.5);
    const rake = r.rake ?? ov;
    // roof planes (with eave overhang ov and rake overhang); built manually so eave and rake overhangs differ
    const s = ov * rise / half; const yR = y + rise; const th = r.thick ?? 0.18;
    const P = [];
    if (axis === 'u') { const vm = (v0 + v1) / 2;
      P.push([[u0 - rake, y - s, v0 - ov], [u1 + rake, y - s, v0 - ov], [u1 + rake, yR, vm], [u0 - rake, yR, vm]]);
      P.push([[u1 + rake, y - s, v1 + ov], [u0 - rake, y - s, v1 + ov], [u0 - rake, yR, vm], [u1 + rake, yR, vm]]);
    } else { const um = (u0 + u1) / 2;
      P.push([[u0 - ov, y - s, v1 + rake], [u0 - ov, y - s, v0 - rake], [um, yR, v0 - rake], [um, yR, v1 + rake]]);
      P.push([[u1 + ov, y - s, v0 - rake], [u1 + ov, y - s, v1 + rake], [um, yR, v1 + rake], [um, yR, v0 - rake]]);
    }
    K.add(mat, polysGeo(P.map((p) => p.slice().reverse())), { uvMode: 'roof' });
    K.add(r.soffit || mat, polysGeo(P.map((p) => p.map(([a, b, c]) => [a, b - th, c]))), { uvMode: r.soffit ? 'box' : 'roof' });
    // edges (fascia / barge boards) as thin slabs around the roof perimeter
    const fm = r.fascia || mat;
    for (const p of P) { // eave edge = p[0]-p[1], rake edges p[1]-p[2], p[3]-p[0]
      edgeSlab(K, fm, p[0], p[1], th + 0.06); edgeSlab(K, fm, p[1], p[2], th + 0.06); edgeSlab(K, fm, p[3], p[0], th + 0.06);
    }
    // gable-end wall triangles (flush with the wall plane)
    const wm = r.gableMat || r.wallMat;
    if (wm) {
      if (axis === 'u') { const vm = (v0 + v1) / 2; for (const uu of [u0, u1]) K.add(wm, polysGeo([uu === u0 ? [[uu, y - 0.02, v1], [uu, yR - 0.05, vm], [uu, y - 0.02, v0]] : [[uu, y - 0.02, v0], [uu, yR - 0.05, vm], [uu, y - 0.02, v1]]]));
        K.box(wm, u0 + 0.05, y - 0.1, v0 + 0.05, u1 - 0.05, y + 0.02, v1 - 0.05); }
      else { const um = (u0 + u1) / 2; for (const vv of [v0, v1]) K.add(wm, polysGeo([vv === v0 ? [[u0, y - 0.02, vv], [um, yR - 0.05, vv], [u1, y - 0.02, vv]] : [[u1, y - 0.02, vv], [um, yR - 0.05, vv], [u0, y - 0.02, vv]]]));
        K.box(wm, u0 + 0.05, y - 0.1, v0 + 0.05, u1 - 0.05, y + 0.02, v1 - 0.05); }
      // attic interior fill so the gable never shows daylight
      if (axis === 'u') K.add(r.core || M.concreteDark, prismTri([u0 + 0.06, u1 - 0.06], (v0 + v1) / 2, half - 0.06, y, rise - 0.12, 'u'));
      else K.add(r.core || M.concreteDark, prismTri([v0 + 0.06, v1 - 0.06], (u0 + u1) / 2, half - 0.06, y, rise - 0.12, 'v'));
    }
    if (r.rafters) rafterTails(K, r.rafters, axis, u0, u1, v0, v1, y, ov, s, r.rafterStep ?? 0.6);
    if (r.ridgeCap) ridge(K, r.ridgeCap, axis === 'u' ? [u0 - rake, yR, (v0 + v1) / 2] : [(u0 + u1) / 2, yR, v0 - rake], axis === 'u' ? [u1 + rake, yR, (v0 + v1) / 2] : [(u0 + u1) / 2, yR, v1 + rake]);
    return yR;
  }
  if (r.type === 'hip' || r.type === 'pyramid') {
    const a0 = u0 - ov, a1 = u1 + ov, b0 = v0 - ov, b1 = v1 + ov;
    const slope = r.slope ?? 0.45; const yE = y - ov * slope;
    const yT = K.hip(mat, a0, b0, a1, b1, yE, slope, { yTop: r.yTop ?? Infinity });
    const th = r.thick ?? 0.16;
    // soffit + fascia band
    K.flat(r.soffit || r.fascia || mat, [[a0, b0], [a1, b0], [a1, b1], [a0, b1]], yE - th, [], true);
    const fm = r.fascia || mat;
    K.box(fm, a0, yE - th, b0, a1, yE + 0.02, b0 + 0.05); K.box(fm, a0, yE - th, b1 - 0.05, a1, yE + 0.02, b1);
    K.box(fm, a0, yE - th, b0 + 0.05, a0 + 0.05, yE + 0.02, b1 - 0.05); K.box(fm, a1 - 0.05, yE - th, b0 + 0.05, a1, yE + 0.02, b1 - 0.05);
    if (r.yTop !== undefined && isFinite(r.yTop)) { const ins = (r.yTop - yE) / slope; K.box(r.deck || M.concreteDark, a0 + ins, yT - 0.05, b0 + ins, a1 - ins, yT + 0.02, b1 - ins); }
    if (r.ridgeCap) hipCaps(K, r.ridgeCap, a0, b0, a1, b1, yE, slope, r.yTop);
    if (r.rafters) rafterTails(K, r.rafters, 'u', u0, u1, v0, v1, y, ov, ov * slope, r.rafterStep ?? 0.6, true);
    return yT;
  }
  if (r.type === 'shed') { // single slope falling toward r.low ('N'|'S'|'E'|'W')
    const rise = r.rise ?? 1; const low = r.low || 'N'; const th = r.thick ?? 0.18;
    const a0 = u0 - ov, a1 = u1 + ov, b0 = v0 - ov, b1 = v1 + ov;
    const hAt = (u, v) => { const t = low === 'N' ? (v - v0) / (v1 - v0) : low === 'S' ? (v1 - v) / (v1 - v0) : low === 'W' ? (u - u0) / (u1 - u0) : (u1 - u) / (u1 - u0); return y + rise * t; };
    const C = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([u, v]) => [u, hAt(u, v), v]);
    K.add(mat, polysGeo([[C[3], C[2], C[1], C[0]]]), { uvMode: 'roof' });
    K.add(r.soffit || mat, polysGeo([[C[0], C[1], C[2], C[3]].map(([a, b, c]) => [a, b - th, c])]), { uvMode: 'roof' });
    const fm = r.fascia || mat; for (let i = 0; i < 4; i++) edgeSlab(K, fm, C[i], C[(i + 1) % 4], th + 0.05);
    // high-side wall fill
    if (r.wallMat) { const W = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [u, hAt(u, v), v]);
      const lo = [[u0, y, v0], [u1, y, v0], [u1, y, v1], [u0, y, v1]];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; if (W[i][1] - y < 0.02 && W[j][1] - y < 0.02) continue; K.add(r.wallMat, polysGeo([[lo[i], lo[j], W[j], W[i]].reverse()])); K.add(r.wallMat, polysGeo([[lo[i], lo[j], W[j], W[i]]])); } }
    return y + rise;
  }
}
function prismTri(range, mid, half, y, rise, axis) { // triangular attic prism (closed)
  const sh = new THREE.Shape(); sh.moveTo(-half, 0); sh.lineTo(half, 0); sh.lineTo(0, rise); sh.lineTo(-half, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: range[1] - range[0], bevelEnabled: false });
  if (axis === 'u') { g.rotateY(Math.PI / 2); g.translate(range[0], y, mid); } else { g.translate(mid, y, range[0]); }
  return g;
}
// thin slab along a 3D edge (fascia/barge board), hanging down by h, 0.05 m thick
function edgeSlab(K, mat, a, b, h) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 0.05) return;
  const g = new THREE.BoxGeometry(L, h, 0.05);
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const yaw = Math.atan2(-dz, dx), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  g.translate(0, -h / 2 + 0.03, 0); g.rotateZ(pitch); g.rotateY(yaw); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  K.add(mat, g, { detail: false });
}
// ridge / hip cap: rounded bar between two 3D points
export function ridge(K, mat, a, b, r = 0.13) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (L < 0.05) return;
  const g = new THREE.CylinderGeometry(r, r, L, 6, 1); g.rotateZ(Math.PI / 2);
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  g.rotateZ(Math.atan2(dy, Math.hypot(dx, dz))); g.rotateY(Math.atan2(-dz, dx));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + r * 0.3, (a[2] + b[2]) / 2);
  K.add(mat, g, { detail: true, uvMode: 'box' });
}
function hipCaps(K, mat, a0, b0, a1, b1, yE, slope, yTop) {
  const w = a1 - a0, d = b1 - b0; const r = Math.min(w, d) / 2; let h = r * slope, ins = r;
  if (yTop !== undefined && isFinite(yTop) && yE + h > yTop) { h = yTop - yE; ins = h / slope; }
  const yT = yE + h; const A = [a0 + ins, yT, b0 + ins], B = [a1 - ins, yT, b0 + ins], C = [a1 - ins, yT, b1 - ins], D = [a0 + ins, yT, b1 - ins];
  ridge(K, mat, [a0, yE, b0], A); ridge(K, mat, [a1, yE, b0], B); ridge(K, mat, [a1, yE, b1], C); ridge(K, mat, [a0, yE, b1], D);
  if (!(yTop !== undefined && isFinite(yTop))) { if (B[0] - A[0] > 0.05) ridge(K, mat, A, B); else if (D[2] - A[2] > 0.05) ridge(K, mat, A, D); }
}
function rafterTails(K, mat, axis, u0, u1, v0, v1, y, ov, drop, step, allFour = false) {
  const n = (L) => Math.max(1, Math.round(L / step));
  const tails = (along0, along1, fixed, sgn, isU) => {
    const N = n(along1 - along0);
    for (let i = 0; i <= N; i++) { const a = along0 + (along1 - along0) * i / N;
      if (isU) K.box(mat, a - 0.035, y - drop - 0.2, Math.min(fixed, fixed + sgn * ov), a + 0.035, y - 0.02, Math.max(fixed, fixed + sgn * ov), { detail: true });
      else K.box(mat, Math.min(fixed, fixed + sgn * ov), y - drop - 0.2, a - 0.035, Math.max(fixed, fixed + sgn * ov), y - 0.02, a + 0.035, { detail: true }); }
  };
  if (axis === 'u' || allFour) { tails(u0, u1, v0, -1, true); tails(u0, u1, v1, 1, true); }
  if (axis === 'v' || allFour) { tails(v0, v1, u0, -1, false); tails(v0, v1, u1, 1, false); }
}
// Hipped roof over a convex polygon (building frame), uniform slope, optional flat deck at yTop (mitred loop + deck).
export function polyHip(K, mat, poly, yE, slope, { ov = 0.6, yTop, deck, fascia, soffit } = {}) {
  const rise = isFinite(yTop) ? yTop - yE : 1e9; const inset = rise / slope;
  K.loop(mat, poly, [[ov, yE - ov * slope], [-inset, yE + inset * slope]], { uvMode: 'roof' });
  const ins = offsetPoly(poly, -inset);
  if (deck !== false) K.flat(deck || K.M.concreteDark, ins, yE + inset * slope + 0.01);
  const out = offsetPoly(poly, ov);
  K.flat(soffit || fascia || mat, out, yE - ov * slope - 0.15, [], true);
  if (fascia) K.loop(fascia, poly, [[ov, yE - ov * slope - 0.15], [ov, yE - ov * slope + 0.03]]);
  return ins;
}
export function offsetPoly(poly, o) {
  let area = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const sgn = area > 0 ? 1 : -1; const n = poly.length;
  const N = poly.map((p, i) => { const q = poly[(i + 1) % n]; const L = Math.hypot(q[0] - p[0], q[1] - p[1]); const tx = (q[0] - p[0]) / L, tz = (q[1] - p[1]) / L; return sgn > 0 ? [tz, -tx] : [-tz, tx]; });
  return poly.map((p, i) => { const n1 = N[(i - 1 + n) % n], n2 = N[i]; const dd = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [p[0] + o * (n1[0] + n2[0]) / dd, p[1] + o * (n1[1] + n2[1]) / dd]; });
}

// ---------- details ----------
export function chimney(K, mat, u, v, w, d, y0, y1, cap) {
  K.box(mat, u - w / 2, y0, v - d / 2, u + w / 2, y1, v + d / 2);
  K.box(cap || mat, u - w / 2 - 0.06, y1, v - d / 2 - 0.06, u + w / 2 + 0.06, y1 + 0.12, v + d / 2 + 0.06);
  K.box(K.M.concreteDark, u - 0.12, y1 + 0.12, v - 0.12, u + 0.12, y1 + 0.35, v + 0.12, { detail: true });
}
// railing along a run: top rail + pickets, from s0..s1 at height y (outward offset d)
export function rail(K, R, mat, s0, s1, y, d, h = 1.0, pitch = 0.12, bars = 'v') {
  K.rbox(R, mat, s0, y + h - 0.05, d - 0.03, s1, y + h, d + 0.03, { detail: true });
  K.rbox(R, mat, s0, y + 0.08, d - 0.015, s1, y + 0.12, d + 0.015, { detail: true });
  if (bars === 'h') { for (let yy = y + 0.25; yy < y + h - 0.1; yy += 0.14) K.rbox(R, mat, s0, yy, d - 0.012, s1, yy + 0.025, d + 0.012, { detail: true }); }
  else { const n = Math.max(1, Math.round((s1 - s0) / pitch)); for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, mat, s - 0.012, y + 0.1, d - 0.012, s + 0.012, y + h, d + 0.012, { detail: true }); } }
  for (const s of [s0, s1]) K.rbox(R, mat, s - 0.03, y, d - 0.03, s + 0.03, y + h, d + 0.03, { detail: true });
}
// cantilevered balcony slab with railing on a run
export function balcony(K, R, slabMat, railMat, s0, s1, y, depth, { h = 1.0, brackets = null, bars = 'v' } = {}) {
  K.rbox(R, slabMat, s0, y - 0.18, -0.1, s1, y, depth);
  rail(K, R, railMat, s0 + 0.03, s1 - 0.03, y, depth - 0.05, h, 0.12, bars);
  // side rails
  const Rl = { ...R }; // reuse rbox along the depth direction via small boxes
  for (const s of [s0 + 0.03, s1 - 0.03]) K.rbox(R, railMat, s - 0.02, y + h - 0.05, 0, s + 0.02, y + h, depth - 0.05, { detail: true });
  if (brackets) for (const s of [s0 + 0.2, s1 - 0.2]) K.rbox(R, brackets, s - 0.08, y - 0.6, 0, s + 0.08, y - 0.18, depth * 0.6);
}
// arcade of round arches along a run (loggia front): piers + arches as a pierced wall
export function arcade(K, R, mat, s0, s1, n, y0, yTop, archTop, depth = 0.4, opts = {}) {
  const bw = (s1 - s0) / n; const pier = opts.pier ?? Math.min(0.6, bw * 0.22); const ops = [];
  for (let i = 0; i < n; i++) { const a = s0 + bw * i + pier / 2, b = s0 + bw * (i + 1) - pier / 2; ops.push({ s0: a, s1: b, y0, y1: archTop, arch: opts.arch ?? true }); }
  K.wall(R, mat, s0, s1, y0, yTop, ops, depth);
  return ops;
}
// gable-front porch / entry hood: posts + beam + small gable roof, in front of a run at s (centre), width w, depth d
export function porch(K, R, { s, w, d, y0, y1, postMat, roofMat, beamMat, gable = true, rise = 0.8, post = 0.18, floor, steps = 0 }) {
  const pts = [[s - w / 2 + post / 2, d - post / 2], [s + w / 2 - post / 2, d - post / 2]];
  for (const [ps, pd] of pts) K.rbox(R, postMat, ps - post / 2, y0, pd - post / 2, ps + post / 2, y1, pd + post / 2);
  K.rbox(R, beamMat || postMat, s - w / 2 - 0.1, y1, 0, s + w / 2 + 0.1, y1 + 0.25, d + 0.05);
  if (floor) K.rbox(R, floor, s - w / 2, y0 - 0.6, 0, s + w / 2, y0, d);
  // roof in run-local coords: build as world geometry by mapping run coords
  const mk = (pp) => pp.map(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(R.m); return [v.x, v.y, v.z]; });
  const yb = y1 + 0.25, ov = 0.25;
  if (gable) {
    const P1 = mk([[s - w / 2 - ov, yb, d + ov], [s, yb + rise, d + ov], [s, yb + rise, -0.05], [s - w / 2 - ov, yb, -0.05]]);
    const P2 = mk([[s, yb + rise, d + ov], [s + w / 2 + ov, yb, d + ov], [s + w / 2 + ov, yb, -0.05], [s, yb + rise, -0.05]]);
    K.add(roofMat, polysGeo([P1, P2]), { uvMode: 'roof' }); K.add(roofMat, polysGeo([P1.slice().reverse(), P2.slice().reverse()].map((p) => p.map(([a, b, c]) => [a, b - 0.1, c]))), { uvMode: 'roof' });
    K.add(beamMat || postMat, polysGeo([mk([[s - w / 2, yb, d], [s + w / 2, yb, d], [s, yb + rise - 0.05, d]])]));
  } else {
    const P = mk([[s - w / 2 - ov, yb, d + ov], [s + w / 2 + ov, yb, d + ov], [s + w / 2 + ov, yb + rise * 0.5, -0.05], [s - w / 2 - ov, yb + rise * 0.5, -0.05]]);
    K.add(roofMat, polysGeo([P]), { uvMode: 'roof' }); K.add(roofMat, polysGeo([P.slice().reverse().map(([a, b, c]) => [a, b - 0.1, c])]), { uvMode: 'roof' });
  }
}
// steps climbing toward the wall of a run, centred at s, from ground g to floor y (n risers), projecting outward
export function runSteps(K, R, mat, s, w, g, y, { tread = 0.32 } = {}) {
  const n = Math.max(1, Math.round((y - g) / 0.17)); const rise = (y - g) / n;
  for (let i = 0; i < n; i++) { const top = g + rise * (i + 1); const d1 = (n - i) * tread; K.rbox(R, mat, s - w / 2, g - 0.8, d1 - tread, s + w / 2, top, d1); }
  return n * tread;
}
export function walkStepsFn(K, R, s, w, g, y, tread = 0.32) { // walkable fn for runSteps
  const n = Math.max(1, Math.round((y - g) / 0.17)); const rise = (y - g) / n; const D = n * tread;
  const c = [R.at(s - w / 2, 0), R.at(s + w / 2, 0), R.at(s + w / 2, D), R.at(s - w / 2, D)].map(([u, v]) => K.xz(u, v));
  const xs = c.map((q) => q[0]), zs = c.map((q) => q[1]);
  return { type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], heightAt: (x, z) => {
    const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1];
    if (ss < s - w / 2 - 0.05 || ss > s + w / 2 + 0.05 || dd < -0.05 || dd > D + 0.05) return null;
    const i = Math.min(n - 1, Math.max(0, Math.floor((D - dd) / tread))); return g + rise * (i + 1); } };
}
// foundation skirt following terrain under a rectangle (so nothing floats on slopes)
export function skirt(K, mat, u0, v0, u1, v1, yTop, yBot = -3) { K.box(mat, u0, yBot, v0, u1, yTop, v1); }

// ---------- procedural cedar-shingle wall material (random widths, 0.19 m courses, dark butt shadows) ----------
let _shTex = null;
function shingleTexture() {
  if (_shTex) return _shTex;
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rows = 10; const rh = N / rows; // 2 m tile → 0.2 m courses
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * 40;
    while (x < N) {
      const w = 30 + rnd() * 40; const v = 0.9 + rnd() * 0.2;
      const c = (b) => Math.max(0, Math.min(255, Math.round(b * v)));
      g.fillStyle = `rgb(${c(205)},${c(200)},${c(195)})`; g.fillRect(x, r * rh, w, rh);
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(60,50,40,${0.05 + rnd() * 0.08})`; g.fillRect(x + rnd() * w, r * rh, 1, rh); } // grain
      g.fillStyle = 'rgba(30,24,18,0.18)'; g.fillRect(x, r * rh, 1, rh);                                                        // keyway gap
      x += w;
    }
    g.fillStyle = 'rgba(20,15,10,0.45)'; g.fillRect(0, (r + 1) * rh - 3, N, 3);                                                  // butt shadow
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, (r + 1) * rh - 7, N, 2);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  _shTex = t; return t;
}
const _shMats = new Map();
export function woodShingle(hex) {
  if (_shMats.has(hex)) return _shMats.get(hex);
  const m = new THREE.MeshStandardMaterial({ map: shingleTexture(), color: new THREE.Color(hex), roughness: 0.92 });
  _shMats.set(hex, m); return m;
}

// ---------- simple house helper: wing + roof + regular windows on each face ----------
// sp: {u0,u1,v0,v1, g0 (floor-0 level), y0 (wall base), eave, storeys, mat, frame, trim, roof:{...}, faces:{S,E,N,W:false|{nb,skip,doors,up,ww,wh,mull,muntins}}}
export function house(K, sp) {
  const fl = []; const n = sp.storeys || 2; const fh = (sp.eave - sp.g0 - 0.3) / n; for (let k = 0; k < n; k++) fl.push(sp.g0 + k * fh);
  const mk = (f) => { const fo = sp.faces?.[f]; if (fo === false) return false; if (Array.isArray(fo) || typeof fo === 'function') return fo; return (R) => {
    const o = fo || {}; const nb = o.nb ?? Math.max(1, Math.round(R.L / (o.bay ?? 3.0))); const bw = R.L / nb; const ops = [];
    const ww = o.ww ?? 1.0, wh = Math.min(o.wh ?? 1.45, fh - 1.1);
    for (let i = 0; i < nb; i++) { if (o.skip?.includes(i)) continue; const c = bw * (i + 0.5) + (o.shift ?? 0);
      fl.forEach((y, k) => {
        if (k === 0 && o.doors?.includes(i)) { ops.push({ s0: c - 0.55, s1: c + 0.55, y0: y, y1: y + 2.4, kind: 'door', doorTop: y + 1.9, sill: false, arch: sp.doorArch }); return; }
        if (k > 0 && o.up && !o.up.includes(i)) return; if (k === 0 && o.down && !o.down.includes(i)) return;
        const w = (o.wide?.includes(i)) ? ww * 2.1 : ww;
        ops.push({ s0: c - w / 2, s1: c + w / 2, y0: y + (o.sill ?? 0.85), y1: y + (o.sill ?? 0.85) + wh, mull: (o.wide?.includes(i)) ? 2 : (o.mull ?? 1), muntins: o.muntins ?? 0, tran: o.tran });
      }); }
    return ops; }; };
  const runs = wing(K, { u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y0: sp.y0 ?? sp.g0 - 2.5, y1: sp.eave, mat: sp.mat, depth: sp.depth ?? 0.28, frame: sp.frame, sillMat: sp.sillMat || sp.frame, trim: sp.trim, trimW: sp.trimW,
    faces: { S: mk('S'), E: mk('E'), N: mk('N'), W: mk('W') }, plinth: sp.plinth, core: sp.core, door: sp.door, lintel: sp.lintel });
  if (sp.roof) roof(K, { u0: sp.u0, u1: sp.u1, v0: sp.v0, v1: sp.v1, y: sp.eave, wallMat: sp.mat, ...sp.roof });
  return { runs, floors: fl };
}

// Merge the finished groups of several Kits (different building frames) into one group, one mesh per material
// (detail meshes stay in a 'detail' child so the engine can hide them at distance).
import { mergeGeometries as _mergeG } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function mergeKits(groups) {
  const main = new Map(), det = new Map();
  for (const g of groups) g.traverse((o) => {
    if (!o.isMesh) return; let isDet = false; let p = o.parent; while (p) { if (p.userData && p.userData.detail) { isDet = true; break; } p = p.parent; }
    const m = isDet ? det : main; const geo = o.geometry.clone(); o.updateWorldMatrix(true, false); geo.applyMatrix4(o.matrixWorld);
    if (!m.has(o.material)) m.set(o.material, []); m.get(o.material).push(geo);
  });
  const root = new THREE.Group(); const dg = new THREE.Group(); dg.userData.detail = true; dg.name = 'detail';
  const mk = (map, parent) => { for (const [mat, list] of map) { const g = list.length > 1 ? _mergeG(list, false) : list[0]; if (!g) continue; g.computeBoundingSphere(); g.computeBoundingBox(); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); } };
  mk(main, root); mk(det, dg); root.add(dg); return root;
}
