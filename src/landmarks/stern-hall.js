// Stern Hall (1942; Corbett & MacMurray with William W. Wurster's Bay Region modernism), the women's residence hall at
// Hearst Avenue and Highland Place, sister hall to Bowles. Low wings of ochre-yellow stucco with an oxide-red accent block,
// low-pitched roofs with razor-thin, deeply projecting teal eaves, pale-blue casements, and a courtyard porch whose
// cantilevered balcony (welded-wire grid guard) rests on a slender red steel column. Massing from the 2021 LiDAR;
// the plan uses two frames (11° for the main bars, 40° for the north-west wing along Highland Place).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { bmats, stuccoBlock } from './lib/b08c-kit.js';
import { combine } from './lib/b08c-foothill.js';

export const info = {
  id: 'stern-hall',
  name: 'Stern Hall',
  subtitle: '1942 · Hearst Avenue at Highland Place',
  blurb: 'Built in 1942 with a gift from Rosalie Meyer Stern in memory of her husband Sigmund Stern (class of 1879), Stern Hall opened for 90 women and is the sister hall to Bowles Hall.',
  replaces: ['w/473599694', 'way/473599694'],
};

function wingSet(ctx, ang, blocks, extra) {
  const M = ctx.M; const B = bmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(ang)); const colliders = [];
  for (const b of blocks) {
    stuccoBlock(K, { ...b, mat: b.red ? B.sternRed : B.sternWall, roofMat: B.sternRoof, corniceMat: B.teal, corniceP: 0.12, corniceH: 0.2, frame: B.paleBlue, overhang: 1.15, fh: 3.1, base: b.g + 0.4, y0: b.g - 1.5, depth: 0.32, win: { w: 1.5, h: 1.55, mull: 1, tran: 0.62 }, groundWin: { w: 1.9, h: 2.2, mull: 2, tran: 0.8 }, bay: 3.2 });
    // thin teal eave slab edge
    const ov = 1.15; K.box(B.teal, b.u0 - ov, b.eave - 0.16, b.v0 - ov, b.u1 + ov, b.eave - 0.02, b.v1 + ov, {});
    K.box(B.sternRed.clone ? M.concreteDark : M.concreteDark, b.u0 - 0.04, b.g - 1.5, b.v0 - 0.04, b.u1 + 0.04, b.g + 0.45, b.v1 + 0.04); // darker base course
    colliders.push(K.colPoly([[b.u0, b.v0], [b.u1, b.v0], [b.u1, b.v1], [b.u0, b.v1]], -2, b.ridge + 0.5));
  }
  if (extra) extra(K, B, M);
  return { obj: K.finish(), colliders };
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
  ], (K, B, M) => {
    // courtyard porch: cantilevered balcony slab with wire-grid guard on a slender red steel column (south wing, east face)
    const u = 9.5, v0 = 10.0, v1 = 22.0, g = K.gMin(u, v0, u + 3, v1), y = g + 3.3, d = 2.6;
    K.box(B.teal, u, y - 0.25, v0, u + d, y, v1);
    for (let v = v0 + 0.1; v <= v1 - 0.1; v += 0.15) K.box(M.iron, u + d - 0.05, y, v - 0.01, u + d - 0.02, y + 1.05, v + 0.01, { detail: true });
    for (let yy = y + 0.15; yy < y + 1.05; yy += 0.15) K.box(M.iron, u + d - 0.05, yy - 0.01, v0, u + d - 0.02, yy + 0.01, v1, { detail: true });
    K.box(B.sternRed, u + d - 0.12, y + 1.0, v0, u + d + 0.02, y + 1.08, v1);
    K.cyl(B.sternRed, u + d - 0.4, g, (v0 + v1) / 2, 0.11, 0.11, y - g - 0.25, 10);
    K.box(M.brick, u, g - 0.3, v0 - 4, u + 7, g + 0.04, v1 + 3);
    for (let v = v0 - 2; v < v1 + 2; v += 4) { K.cyl(M.woodDark, u + 5.5, g, v, 0.14, 0.12, 3.0, 7, { detail: true }); K.lathe(M.turf, [[0.1, 0], [1.3, 0.5], [1.4, 1.3], [0.8, 2.1], [0.001, 2.3]], u + 5.5, g + 2.8, v, 8, { detail: true }); }
  });
  const b = wingSet(ctx, 40, [
    { u0: -70.5, u1: -36.0, v0: -1.0, v1: 14.0, g: 4.6, eave: 12.6, ridge: 14.4, faces: {} },
  ]);
  const object3d = combine([a.obj, b.obj]);
  object3d.name = 'stern-hall';
  return { object3d, colliders: [...a.colliders, ...b.colliders], walkables: [] };
}
