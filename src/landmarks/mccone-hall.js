// McCone Hall (1961): Earth and Planetary Science and Geography, on the west side of the engineering/science quarter.
// A long six-storey slab of cream concrete divided into ~6 m bays by shallow piers, two windows per bay on the typical floors,
// a continuous glazed top storey under a very deep cantilevered roof slab (its signature), a lower west wing and a long central
// penthouse. Massing follows the 2021 LiDAR: roof ~24 m above the lowest grade, penthouse ~28 m, west wing ~20 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, inset, gAt, storefront } from './lib/b03-kit.js';
import { panelMat, planting, bikes, entry, rnMats, tube } from './lib/rn-kit.js';

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
  const CREAM = panelMat('mcconePanel', { pw: 1.5, ph: 1.5, span: 6.0, base: 0xe7e0d0, joint: 0xc9c1ae, vary: 0.015, grain: 0.012, stagger: false }); const GL = M.windowNight;
  const FR = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.5, metalness: 0.2 }); const FASC = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.6 });
  const colliders = [];
  const u0 = -13.7, u1 = 14.4, v0 = -37.3, v1 = 37.7, ROOF = 24.2, TOPF = 20.3;
  const levels = [-2, 2.6, 6.2, 9.8, 13.4, 17.0, TOPF];
  const runs = massBlock(K, { poly: rect(u0, v0, u1, v1), levels, top: TOPF, wall: CREAM, style: 'punched', depth: 0.35, rev: 0.25, glass: GL, frame: FR,
    win: { w: 1.05, h: 1.95, sill: 0.8, bay: 3.05, mull: 0, tran: 0.78 }, pier: { w: 0.45, p: 0.18, mat: CREAM, top: TOPF + 0.5, ends: true }, roof: M.concreteDark });
  // dentil band under the top storey
  for (const R of runs) { K.rbox(R, CREAM, -0.1, TOPF - 0.1, -0.05, R.L + 0.1, TOPF + 0.45, 0.3); for (let s = 0.2; s < R.L; s += 0.5) K.rbox(R, M.concreteDark, s, TOPF + 0.05, 0.3, s + 0.22, TOPF + 0.3, 0.32, { detail: true }); }
  // continuous glazed top storey, set back slightly
  massBlock(K, { poly: inset(rect(u0, v0, u1, v1), 2.0), levels: [TOPF + 0.45, ROOF - 0.6], top: ROOF - 0.6, wall: CREAM, style: 'curtain', glass: GL, frame: B.alumDark, win: { mw: 1.5, spandrel: 0.0 }, core: true, roof: M.concreteDark });
  K.prism(M.concreteDark, rect(u0 + 0.3, v0 + 0.3, u1 - 0.3, v1 - 0.3), TOPF + 0.3, TOPF + 0.46); // open terrace floor in front of the recessed glass
  // piers rising through the recessed top storey to the roof slab, at every second bay line
  for (const R of runs) { const nb = Math.max(1, Math.round(R.L / 6.1)); for (let j = 0; j <= nb; j++) { const s = (R.L / nb) * j; K.rbox(R, CREAM, s - 0.3, TOPF + 0.45, -0.6, s + 0.3, ROOF - 0.42, 0.0); } }
  // very deep cantilevered roof slab (signature), thin bright fascia
  K.prism(FASC, rect(u0 - 2.6, v0 - 2.6, u1 + 2.6, v1 + 2.6), ROOF - 0.42, ROOF);
  // long central penthouse (LiDAR ~28 m)
  massBlock(K, { poly: rect(-4.6, -26.0, 7.2, 25.5), levels: [ROOF, 28.0], top: 28.0, wall: CREAM, style: 'blank', depth: 0.3, roof: B.roofMembrane, core: true });
  // lower west wing (~20 m)
  massBlock(K, { poly: rect(-17.6, -12.0, u0, 3.0), levels: [-2, 2.6, 6.2, 9.8, 13.4, 17.0, 20.0], top: 20.0, wall: CREAM, style: 'punched', depth: 0.35, rev: 0.25, glass: GL, frame: FR, win: { w: 1.6, h: 1.8, sill: 0.9, bay: 3.05, mull: 1 }, roof: M.concreteDark, parapet: 0.6, pmat: CREAM });
  // entrance doors at mid-length on the east face
  { const R = runs.find((r) => r.n[0] > 0.9); if (R) { const s = R.L / 2, gy = Math.max(gAt(K, R, s, 1.5), levels[0]); storefront(K, R, s - 3.0, s + 3.0, gy + 0.03, gy + 3.0, { glass: GL, frame: B.alumDark, rev: -0.36, transom: gy + 2.4 }); K.rbox(R, FASC, s - 4.0, gy + 3.2, 0, s + 4.0, gy + 3.55, 3.0); for (let k = 0; k < 4; k++) K.rbox(R, M.lampGlow, s - 3 + k * 2 - 0.1, gy + 3.19, 1.6, s - 3 + k * 2 + 0.1, gy + 3.2, 1.8, { detail: true }); } }
  // stacked cantilevered balconies with white rails on the west wing's end, planting along the long faces, bikes
  { const X = rnMats(M); const RWe = K.run([-17.6, -12.0], [-17.6, 3.0]);
    for (const y of [6.2, 9.8, 13.4, 17.0]) { K.rbox(RWe, CREAM, 1.0, y - 0.3, 0, RWe.L - 1.0, y, 2.0); tube(K, RWe, FR, [1.0, y + 1.05, 1.95], [RWe.L - 1.0, y + 1.05, 1.95], 0.03, 8, false); for (let s = 1.0; s <= RWe.L - 0.9; s += 0.9) K.rbox(RWe, FR, s - 0.02, y, 1.93, s + 0.02, y + 1.05, 1.97, { detail: true }); }
    for (const R of runs) if (R.L > 40) planting(K, R, 1.0, R.L - 1.0, { d0: 0.5, depth: 1.3, h: 0.9, skip: R.n[0] > 0.9 ? [[R.L / 2 - 6, R.L / 2 + 6]] : [], seed: 71 });
    const RE = runs.find((r) => r.n[0] > 0.9); if (RE) colliders.push(...bikes(K, RE, RE.L / 2 + 10, 3.2, 6, 3)); }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -3, ROOF + 0.3));
  colliders.push(K.colPoly(rect(-17.6, -12.0, u0, 3.0), -3, 20.6));
  const object3d = K.finish(); object3d.name = 'mccone-hall';
  return { object3d, colliders, walkables: [] };
}
