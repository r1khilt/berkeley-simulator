// Stern Hall (1942; Corbett & MacMurray with William W. Wurster's Bay Region modernism), the women's residence hall at
// Hearst Avenue and Highland Place, sister hall to Bowles. Low wings of ochre-yellow stucco with an oxide-red accent block,
// low-pitched roofs with razor-thin, deeply projecting teal eaves, pale-blue casements, and a courtyard porch whose
// cantilevered balcony (welded-wire grid guard) rests on a slender red steel column. Massing from the 2021 LiDAR;
// the plan uses two frames (11° for the main bars, 40° for the north-west wing along Highland Place).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { bmats, stuccoBlock } from './lib/b08c-kit.js';
import { combine } from './lib/b08c-foothill.js';
import { pathEntrances, entry, planting, bikes, furniture, rnMats, gRun, blob } from './lib/rn-kit.js';

export const info = {
  id: 'stern-hall',
  name: 'Stern Hall',
  subtitle: '1942 · Hearst Avenue at Highland Place',
  blurb: 'Built in 1942 with a gift from Rosalie Meyer Stern in memory of her husband Sigmund Stern (class of 1879), Stern Hall opened for 90 women and is the sister hall to Bowles Hall.',
  replaces: ['w/473599694', 'way/473599694'],
};

// refine-north A: finished ground floor - entrances where the packet paths arrive (pale-blue glazed doors in a teal portal under a
// thin teal canopy, landing + steps), foundation planting along the exterior walls, bike racks and a bench at the main door.
function groundFloor(ctx, K, B, M, wings, colliders, walkables, entries) {
  const X = rnMats(M);
  const inside = (u, v, skip) => wings.some((w) => w !== skip && u > w.b.u0 - 0.2 && u < w.b.u1 + 0.2 && v > w.b.v0 - 0.2 && v < w.b.v1 + 0.2);
  const ext = []; for (const w of wings) for (const R of Object.values(w.runs)) ext.push({ R, w });
  const ents = [];
  for (const c of pathEntrances(K, ctx, ext.map((e) => e.R), { maxDist: 4.5, merge: 10 })) {
    const e = ext.find((x) => x.R === c.R); const p = c.R.at(c.s, 1.5);
    if (inside(p[0], p[1], null) || c.s < 2.6 || c.s > c.R.L - 2.6) continue;
    if (ents.some((q) => Math.hypot(q.R.at(q.s)[0] - c.R.at(c.s)[0], q.R.at(q.s)[1] - c.R.at(c.s)[1]) < 15)) continue;
    ents.push({ R: c.R, s: c.s, w: e.w }); if (ents.length >= entries) break;
  }
  const skipBy = new Map();
  ents.forEach((e, k) => {
    const gy = gRun(K, e.R, e.s, 1.6); const fl0 = e.w.b.g + 1.0; const fl = fl0 > gy && fl0 - gy < 2.0 ? fl0 : gy + 0.15;
    const r = entry(K, e.R, e.s, { w: 2.4, h: 2.7, floor: fl, grade: gy, surround: B.teal, sw: 0.2, sp: 0.2, frame: B.paleBlue, door: 'glass', landing: 1.5, canopy: { d: 2.4, t: 0.14, mat: B.teal, fascia: B.teal }, lamps: true });
    walkables.push(...r.walkables); colliders.push(...r.colliders);
    skipBy.set(e.R, [...(skipBy.get(e.R) || []), [e.s - 3.0, e.s + 3.0]]);
    if (k === 0) { colliders.push(...bikes(K, e.R, e.s + 6.2, 2.4, 4, 0)); colliders.push(furniture(K, e.R, 'bench', e.s - 5.6, 2.2, Math.PI)); }
  });
  let seed = 3;
  for (const x of ext) {
    const R = x.R; let a = null; const spans = [];
    for (let s = 0.5; s <= R.L - 0.5 + 1e-6; s += 0.5) { const p = R.at(s, 1.0); const free = !inside(p[0], p[1], x.w); if (free && a === null) a = s; if ((!free || s + 0.5 > R.L - 0.5) && a !== null) { spans.push([a, free ? s : s - 0.5]); a = null; } }
    for (const [s0, s1] of spans) if (s1 - s0 > 2.5) planting(K, R, s0, s1, { d0: 0.1, depth: 1.3, h: 0.85, w: 1.7, gap: 0.9, curb: false, skip: skipBy.get(R) || [], seed: seed++, mats: [X.leafA, X.leafB] });
  }
}

const _sm = new WeakMap();
function sternMats(M) { // refine-north A: warmer, less saturated ochre stucco; dark low roofs; red steel for the loggia columns
  if (_sm.has(M)) return _sm.get(M); const B = bmats(M);
  const wall = B.sternWall.clone(); wall.color = new THREE.Color(0xdcb868); wall.name = 'stern:wall';
  const roof = B.sternRoof.clone(); roof.color = new THREE.Color(0x6e7368); roof.name = 'stern:roof';
  const red = new THREE.MeshStandardMaterial({ color: 0xb5544a, roughness: 0.45, metalness: 0.3, name: 'stern:redSteel' });
  const soffit = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.7, name: 'stern:soffit' });
  const o = { wall, roof, red, soffit }; _sm.set(M, o); return o;
}

function wingSet(ctx, ang, blocks, extra, entries = 1) {
  const M = ctx.M; const B = bmats(M); const SM = sternMats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(ang)); const colliders = [], walkables = [], wings = [];
  for (const b0 of blocks) {
    const hs = Math.min(b0.u1 - b0.u0, b0.v1 - b0.v0) / 2 + 1.15; const b = { ...b0, eave: Math.max(b0.eave, b0.ridge - Math.max(0.45, hs * 0.13)) }; // 5-8 degree roofs
    const res = stuccoBlock(K, { ...b, mat: b.red ? B.sternRed : SM.wall, roofMat: SM.roof, corniceMat: B.teal, corniceP: 0.12, corniceH: 0.2, frame: B.paleBlue, overhang: 1.15, fh: 3.1, base: b.g + 0.4, y0: Math.min(b.g, K.gMin(b.u0, b.v0, b.u1, b.v1, 5)) - 1.5, depth: 0.32, win: { w: 1.5, h: 1.55, mull: 1, tran: 0.62 }, groundWin: { w: 1.9, h: 2.2, mull: 2, tran: 0.8 }, bay: 3.2 });
    wings.push({ b, runs: res.runs });
    // thin teal eave slab edge
    const ov = 1.15; K.box(B.teal, b.u0 - ov, b.eave - 0.16, b.v0 - ov, b.u1 + ov, b.eave - 0.02, b.v1 + ov, {});
    K.box(M.concreteDark, b.u0 - 0.04, Math.min(b.g, K.gMin(b.u0, b.v0, b.u1, b.v1, 5)) - 1.5, b.v0 - 0.04, b.u1 + 0.04, b.g + 0.45, b.v1 + 0.04); // darker base course
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, b.ridge + 0.5));
  }
  if (extra) extra(K, B, M, SM, colliders);
  groundFloor(ctx, K, B, M, wings, colliders, walkables, entries);
  return { obj: K.finish(), colliders, walkables };
}

export async function build(ctx) {
  const a = wingSet(ctx, 11, [
    { u0: 44.5, u1: 55.5, v0: -16.0, v1: 30.0, g: 1.8, eave: 13.4, ridge: 15.0, faces: {} },
    { u0: 44.5, u1: 55.5, v0: 30.0, v1: 43.5, g: 2.2, eave: 10.4, ridge: 11.8, faces: { N: false } },
    { u0: -3.0, u1: 44.5, v0: -7.5, v1: 0.0, g: 1.7, eave: 13.0, ridge: 14.4, faces: { E: false } },
    { u0: -24.5, u1: -3.0, v0: -7.5, v1: -2.0, g: 3.2, eave: 13.0, ridge: 14.3, faces: { E: false } },
    { u0: -3.0, u1: 9.5, v0: 0.0, v1: 7.5, g: 2.0, eave: 13.6, ridge: 15.0, faces: { N: false }, red: true },
    { u0: -3.0, u1: 9.5, v0: 7.5, v1: 25.5, g: -0.1, eave: 10.3, ridge: 11.6, faces: { N: false } },
    { u0: -32.0, u1: -24.5, v0: -11.0, v1: -1.0, g: 3.4, eave: 13.0, ridge: 14.4, faces: {} },
    { u0: -37.0, u1: -24.5, v0: -1.0, v1: 17.5, g: 0.4, eave: 10.4, ridge: 11.7, faces: { N: false } },
  ], (K, B, M, SM, cols) => {
    // court-side loggia along the main bar (south face, v = 0): slender red steel pipe columns carrying a thin flat canopy over
    // brick paving, with London plane trees in the court
    {
      const ua = 11.0, ub = 43.0, d = 3.4; const gL = K.gMin(ua, 0, ub, d, 6); const y = gL + 3.35;
      K.box(B.teal, ua - 0.3, y, 0, ub + 0.3, y + 0.22, d + 0.25);
      K.box(SM.soffit, ua - 0.3, y - 0.06, d + 0.1, ub + 0.3, y + 0.26, d + 0.3);
      K.box(M.brick, ua - 0.4, gL - 0.4, 0.05, ub + 0.4, gL + 0.05, d + 0.6);
      const nc = 9;
      for (let i = 0; i < nc; i++) { const u = ua + 0.4 + (ub - ua - 0.8) * i / (nc - 1); K.cyl(SM.red, u, gL, d - 0.2, 0.12, 0.12, y - gL, 10); const [x, z] = K.xz(u, d - 0.2); cols.push({ type: 'cyl', x, z, r: 0.15, y0: gL - 0.5, y1: y }); }
      const X = rnMats(M);
      for (const [u, v] of [[14, 20], [40, 22], [27, 26]]) { const g = K.g(u, v); K.cyl(M.woodDark, u, g, v, 0.22, 0.17, 4.2, 8, { detail: true }); blob(K, X.leafA, u, g + 6.2, v, 3.2, 2.4, 3.2, u * 3 + v); blob(K, X.leafB, u + 1.2, g + 7.4, v - 0.8, 2.2, 1.8, 2.2, u + v * 5); const [x, z] = K.xz(u, v); cols.push({ type: 'cyl', x, z, r: 0.3, y0: g - 0.5, y1: g + 4 }); }
    }
    // courtyard porch: cantilevered balcony slab with wire-grid guard on a slender red steel column (south wing, east face)
    const u = 9.5, v0 = 10.0, v1 = 22.0, g = K.gMin(u, v0, u + 3, v1), y = g + 3.3, d = 2.6;
    K.box(B.teal, u, y - 0.25, v0, u + d, y, v1);
    for (let v = v0 + 0.1; v <= v1 - 0.1; v += 0.15) K.box(M.iron, u + d - 0.05, y, v - 0.01, u + d - 0.02, y + 1.05, v + 0.01, { detail: true });
    for (let yy = y + 0.15; yy < y + 1.05; yy += 0.15) K.box(M.iron, u + d - 0.05, yy - 0.01, v0, u + d - 0.02, yy + 0.01, v1, { detail: true });
    K.box(B.sternRed, u + d - 0.12, y + 1.0, v0, u + d + 0.02, y + 1.08, v1);
    K.cyl(B.sternRed, u + d - 0.4, g, (v0 + v1) / 2, 0.11, 0.11, y - g - 0.25, 10);
    K.box(M.brick, u, g - 0.3, v0 - 4, u + 7, g + 0.04, v1 + 3);
    for (let v = v0 - 2; v < v1 + 2; v += 4) { K.cyl(M.woodDark, u + 5.5, g, v, 0.14, 0.12, 3.0, 7, { detail: true }); K.lathe(M.turf, [[0.1, 0], [1.3, 0.5], [1.4, 1.3], [0.8, 2.1], [0.001, 2.3]], u + 5.5, g + 2.8, v, 8, { detail: true }); }
  }, 2);
  const b = wingSet(ctx, 40, [
    { u0: -70.5, u1: -36.0, v0: -1.0, v1: 14.0, g: 4.6, eave: 12.6, ridge: 14.4, faces: {} },
  ]);
  const object3d = combine([a.obj, b.obj]);
  object3d.name = 'stern-hall';
  return { object3d, colliders: [...a.colliders, ...b.colliders].filter(Boolean), walkables: [...a.walkables, ...b.walkables] };
}
