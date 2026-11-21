// McCone Hall (1961): Earth and Planetary Science and Geography, on the west side of the engineering/science quarter.
// A long six-storey slab of cream concrete divided into ~6 m bays by shallow piers, two windows per bay on the typical floors,
// a continuous glazed top storey under a very deep cantilevered roof slab (its signature), a lower west wing and a long central
// penthouse. Massing follows the 2021 LiDAR: roof ~24 m above the lowest grade, penthouse ~28 m, west wing ~20 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, inset, gAt, storefront } from './lib/b03-kit.js';

export const info = {
  id: 'mccone-hall',
  name: 'McCone Hall',
  subtitle: 'Earth & Planetary Science · Geography',
  blurb: 'Home of the Department of Earth and Planetary Science and the Department of Geography, named for John A. McCone. A long cream concrete slab with a deep floating roof slab.',
  replaces: ['w/24025437'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.8);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CREAM = B.offWhite, GL = B.glassGrey, FR = B.alumDark;
  const colliders = [];
  const u0 = -13.7, u1 = 14.4, v0 = -37.3, v1 = 37.7, ROOF = 24.2, TOPF = 20.3;
  const levels = [-2, 2.6, 6.2, 9.8, 13.4, 17.0, TOPF];
  const runs = massBlock(K, { poly: rect(u0, v0, u1, v1), levels, top: TOPF, wall: CREAM, style: 'punched', depth: 0.35, rev: 0.25, glass: GL, frame: FR,
    win: { w: 1.6, h: 1.8, sill: 0.9, bay: 3.05, mull: 1, tran: 0.75 }, pier: { w: 0.55, p: 0.45, mat: CREAM, top: TOPF + 0.5, ends: true }, roof: M.concreteDark });
  // dentil band under the top storey
  for (const R of runs) { K.rbox(R, CREAM, -0.1, TOPF - 0.1, -0.05, R.L + 0.1, TOPF + 0.45, 0.3); for (let s = 0.2; s < R.L; s += 0.5) K.rbox(R, M.concreteDark, s, TOPF + 0.05, 0.3, s + 0.22, TOPF + 0.3, 0.32, { detail: true }); }
  // continuous glazed top storey, set back slightly
  massBlock(K, { poly: inset(rect(u0, v0, u1, v1), 0.4), levels: [TOPF + 0.45, ROOF - 0.6], top: ROOF - 0.6, wall: CREAM, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.0 }, core: true, roof: M.concreteDark });
  // very deep cantilevered roof slab (signature)
  K.prism(B.offWhite, rect(u0 - 2.0, v0 - 2.0, u1 + 2.0, v1 + 2.0), ROOF - 0.42, ROOF);
  // long central penthouse (LiDAR ~28 m)
  massBlock(K, { poly: rect(-4.6, -26.0, 7.2, 25.5), levels: [ROOF, 28.0], top: 28.0, wall: CREAM, style: 'blank', depth: 0.3, roof: B.roofMembrane, core: true });
  // lower west wing (~20 m)
  massBlock(K, { poly: rect(-17.6, -12.0, u0, 3.0), levels: [-2, 2.6, 6.2, 9.8, 13.4, 17.0, 20.0], top: 20.0, wall: CREAM, style: 'punched', depth: 0.35, rev: 0.25, glass: GL, frame: FR, win: { w: 1.6, h: 1.8, sill: 0.9, bay: 3.05, mull: 1 }, roof: M.concreteDark, parapet: 0.6, pmat: CREAM });
  // entrance doors at mid-length on the east face
  { const R = runs.find((r) => r.n[0] > 0.9); if (R) { const s = R.L / 2, gy = Math.max(gAt(K, R, s, 1.5), levels[0]); storefront(K, R, s - 2.5, s + 2.5, gy + 0.03, gy + 3.0, { glass: GL, frame: FR, rev: -0.36, transom: gy + 2.4 }); K.rbox(R, B.precastWarm, s - 3.5, gy + 3.2, 0, s + 3.5, gy + 3.5, 2.5); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -3, ROOF + 0.3));
  colliders.push(K.colPoly(rect(-17.6, -12.0, u0, 3.0), -3, 20.6));
  const object3d = K.finish(); object3d.name = 'mccone-hall';
  return { object3d, colliders, walkables: [] };
}
