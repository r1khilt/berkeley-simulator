// Hal and Audrey Norton House, 2539 Hillegass Avenue — part of the Berkeley Student Cooperative's Hillegass-Parker House.
// A two-and-a-half-storey South Berkeley house: painted shingle walls with white trim, a hipped composition-shingle roof
// with a front dormer, double-hung windows and a front porch with steps facing Hillegass Avenue.
// Massing from the 2021 LiDAR (eaves ≈7.5 m, hip peak ≈11.2 m).
import * as THREE from 'three';
import { Kit, pal, house, roof, porch, chimney, woodShingle, facade } from './lib/b08a-kit.js';

export const info = {
  id: 'hal-and-audrey-norton-house',
  name: 'Norton House',
  subtitle: 'Hillegass-Parker House · Berkeley Student Cooperative',
  blurb: 'The Hal and Audrey Norton House on Hillegass Avenue is part of Hillegass-Parker House, a Berkeley Student Cooperative house.',
  replaces: ['w/185773038'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-3.7)); const M = ctx.M; const P = pal(ctx);
  const SH = woodShingle(0xc4c9b6), TR = P.trimWhite, RF = P.roofComp; const colliders = [];
  const g0 = Math.max(K.g(-7.5, 0), K.g(-7.5, -4)) + 0.9;
  const H = house(K, { u0: -6.96, u1: 6.95, v0: -5.48, v1: 5.48, g0, y0: -2, eave: g0 + 6.4, storeys: 2, mat: SH, frame: TR, sillMat: TR, trim: TR, trimW: 0.09,
    faces: { W: { nb: 3, doors: [1], ww: 0.9, wh: 1.55, tran: 0.55 }, E: { nb: 3, ww: 0.9, wh: 1.55, tran: 0.55 }, N: { nb: 4, ww: 0.85, wh: 1.5, tran: 0.55 }, S: { nb: 4, ww: 0.85, wh: 1.5, tran: 0.55, wide: [1] } },
    plinth: { h: g0, mat: P.concreteBuff, out: 0.04 },
    roof: { type: 'hip', slope: 0.68, ov: 0.6, mat: RF, fascia: TR, soffit: TR } });
  // front dormer on the west slope
  { const yb = g0 + 6.4 + 0.9; K.box(SH, -6.1, yb - 0.6, -1.3, -4.4, yb + 1.5, 1.3);
    roof(K, { type: 'gable', u0: -6.2, u1: -3.4, v0: -1.4, v1: 1.4, y: yb + 1.5, rise: 0.9, axis: 'u', ov: 0.25, rake: 0.25, mat: RF, fascia: TR, wallMat: SH });
    const R = K.run([-6.2, -1.3], [-6.2, 1.3]); facade(K, R, { s0: 0, s1: R.L, y0: yb - 0.6, y1: yb + 1.5, mat: SH, depth: 0.2, frame: TR, ops: [{ s0: 0.5, s1: R.L - 0.5, y0: yb - 0.1, y1: yb + 1.1, mull: 1 }] }); }
  // front porch facing Hillegass Avenue
  { const R = H.runs.W; const s = R.L / 2; const g = K.g(-8.5, 0);
    porch(K, R, { s, w: 3.6, d: 2.2, y0: g0, y1: g0 + 2.7, postMat: TR, roofMat: RF, beamMat: TR, gable: false, rise: 0.6, post: 0.2, floor: P.woodStain });
    const n = Math.max(1, Math.round((g0 - g) / 0.17)); for (let k = 0; k < n; k++) K.rbox(R, P.concreteBuff, s - 0.9, g - 0.5, 2.2 + (n - k - 1) * 0.3, s + 0.9, g + (g0 - g) * (k + 1) / n, 2.2 + (n - k) * 0.3); }
  chimney(K, M.brick, 3.5, -5.48 + 0.4, 0.8, 0.6, g0 + 4, g0 + 10.6, P.concreteBuff);
  colliders.push(K.colPoly([[-6.96, -5.48], [6.95, -5.48], [6.95, 5.48], [-6.96, 5.48]], -2, 12));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
