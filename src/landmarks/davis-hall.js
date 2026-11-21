// Davis Hall: civil and environmental engineering, home of the structural testing laboratories, north of the Grimes terrace.
// Brutalist board-formed concrete with fine vertical ribbing: deep, nearly windowless piers rising the full height between narrow
// recessed window strips, deep projecting volumes, light wells, and a tall windowless stair tower; "DAVIS HALL" incised in
// serif capitals on a pier. Massing follows the 2021 LiDAR: main roof ~28.5 m, north band ~30-31 m, light wells ~23.5 m, tower ~40 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, signText, storefront, polysGeo } from './lib/b03-kit.js';

export const info = {
  id: 'davis-hall',
  name: 'Davis Hall',
  subtitle: 'Civil & Environmental Engineering',
  blurb: 'Home of civil and environmental engineering, with large structural testing laboratories where full-scale beams, columns and walls are loaded to failure. Named for Raymond E. Davis, a pioneer of concrete research.',
  replaces: ['w/24024351'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.8);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xc4bdb0, roughness: 0.93, map: M.concrete.map, normalMap: M.concrete.normalMap, roughnessMap: M.concrete.roughnessMap });
  const GL = B.glassGrey, FR = B.alumDark;
  const colliders = [];
  const u0 = -31.4, u1 = 31.4, v0 = -15.8, v1 = 15.7, ROOF = 27.9, VN = -4.6;
  const levels = [-2, 3.0, 7.6, 12.0, 16.4, 20.8, 25.0, ROOF];
  const runs = massBlock(K, { poly: rect(u0, VN, u1, v1), holes: [rect(-14.5, -2.6, -8.8, 4.0), rect(9.6, -2.6, 15.2, 4.0)], levels, top: ROOF, wall: CON, style: 'punched', depth: 0.5, rev: 0.4, glass: GL, frame: FR,
    win: { w: 2.0, h: 2.6, sill: 0.9, bay: 4.4, mull: 1, tran: 0.7 }, pier: { w: 0.7, p: 1.2, mat: CON, top: ROOF + 0.9, ends: true }, roof: B.roofMembrane, parapet: 0.9, pmat: CON, floorBand: { mat: CON, h: 1.0, p: 0.25 } });
  // light-well floors (LiDAR ~23.5 m)
  for (const r of [rect(-14.5, -2.6, -8.8, 4.0), rect(9.6, -2.6, 15.2, 4.0)]) K.prism(B.roofMembrane, r, -1, 23.5);
  // north band: a shed roof rising from ~26.6 m at the north edge to ~30.2 m (LiDAR), with a raised central plant block
  {
    const yN = 26.6, yS = 30.2, a0 = u0 + 0.3, a1 = u1 - 0.3, b0 = v0 + 0.3, b1 = VN;
    runs.push(...massBlock(K, { poly: rect(u0, v0, u1, VN), levels: levels.filter((y) => y < yN - 1).concat([yN]), top: yN, wall: CON, style: 'punched', depth: 0.5, rev: 0.4, glass: GL, frame: FR,
      win: { w: 1.1, h: 3.2, sill: 0.6, bay: 4.4, mull: 0, tran: 0.7 }, pier: { w: 1.6, p: 1.1, mat: CON, top: yN + 0.6, ends: true }, roof: B.roofMembrane }));
    const P = (u, y, v) => [u, y, v];
    const wedge = [[P(a0, yN, b0), P(a1, yN, b0), P(a1, yS, b1), P(a0, yS, b1)], [P(a0, yN, b0), P(a0, yS, b1), P(a0, yN, b1)], [P(a1, yN, b0), P(a1, yN, b1), P(a1, yS, b1)], [P(a0, yN, b1), P(a0, yS, b1), P(a1, yS, b1), P(a1, yN, b1)]];
    K.add(B.roofMembrane, polysGeo([wedge[0].slice().reverse()]), { uvMode: 'roof' }); K.add(CON, polysGeo(wedge.slice(1)));
    massBlock(K, { poly: rect(-9.0, -14.2, 9.0, -8.0), levels: [28.5, 31.2], y0: 27, top: 31.2, wall: CON, style: 'blank', depth: 0.4, roof: B.roofMembrane, core: true });
    massBlock(K, { poly: rect(u0 + 0.6, 5.4, u1 - 0.6, 8.6), levels: [ROOF, 30.0], top: 30.0, wall: CON, style: 'blank', depth: 0.4, roof: B.roofMembrane, core: true });
  }
  // tall windowless stair / lift tower near the west end (LiDAR ~38-43 m) with vertical ribbing
  massBlock(K, { poly: rect(-26.5, 4.2, -17.0, 13.2), levels: [ROOF, 39.5], top: 39.5, wall: CON, style: 'blank', depth: 0.5, roof: B.roofMembrane, core: true, parapet: 0.6, pmat: CON });
  for (let u = -26.3; u < -17.1; u += 0.6) K.box(CON, u, ROOF, 13.2, u + 0.25, 39.9, 13.45, { detail: true });
  // "DAVIS HALL" incised on a pier of the south face and an entrance
  { const R = runs.find((r) => r.n[1] > 0.9); if (R) { const s = R.L * 0.36, gy = Math.max(gAt(K, R, s, 2), levels[0]);
    signText(K, R, 'DAVIS HALL', s, gy + 4.2, 0.42, { color: '#5c5a55', metal: 0.0, rough: 0.9, d: 1.12, spacing: 0.1 });
    storefront(K, R, s + 2.4, s + 6.4, gy + 0.03, gy + 3.0, { glass: GL, frame: FR, rev: -0.42 }); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -3, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'davis-hall';
  return { object3d, colliders, walkables: [] };
}
