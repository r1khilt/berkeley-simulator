// Evans Hall (1971, Gardner Dailey): the brutalist home of mathematics, statistics and economics north-east of the Campanile.
// A grey-green concrete slab tower: full-height projecting piers that rise above the parapet into terracotta-red caps, deep
// stacked spandrel bands with small paired windows recessed behind them (an egg-crate grid), a shadowed recessed ground storey,
// a central light well and two big concrete penthouses. Massing follows the 2021 LiDAR: parapet ~50 m above the lowest grade,
// light well roof ~42 m, penthouses ~55.5 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, inset, gAt, storefront } from './lib/b03-kit.js';

export const info = {
  id: 'evans-hall',
  name: 'Evans Hall',
  subtitle: 'Gardner Dailey · 1971',
  blurb: 'Home to mathematics, statistics and economics. Before Soda Hall opened, computer science was housed here too, and Berkeley Unix (BSD) was developed in its machine rooms. Its grey-green brutalist concrete has been loved and loathed for half a century.',
  replaces: ['r/6411209'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.6);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xaab2a3, roughness: 0.88, map: M.concrete.map, normalMap: M.concrete.normalMap, roughnessMap: M.concrete.roughnessMap });
  const CAP = new THREE.MeshStandardMaterial({ color: 0xc0705a, roughness: 0.85 });
  const GL = B.glassGrey, FR = B.alumDark;
  const colliders = [], walkables = [];
  const u0 = -20.6, u1 = 20.6, v0 = -27.6, v1 = 27.6;
  const PAR = 50.8, ROOF = 50.0;
  const levels = [-1.0, 3.6]; for (let k = 0; k < 12; k++) levels.push(+(3.6 + 3.75 * (k + 1)).toFixed(2)); // 12 typical storeys
  levels[levels.length - 1] = ROOF;
  const well = rect(-5.5, -8.5, 8.5, 6.5);
  // egg-crate façade: small paired windows behind deep projecting spandrel bands
  const runs = massBlock(K, {
    poly: rect(u0, v0, u1, v1), holes: [well], levels, top: ROOF, wall: CON, style: 'punched', depth: 0.6, rev: 0.55, glass: GL, frame: FR,
    win: { w: 1.25, h: 1.2, sill: 1.65, bay: 2.05, mull: 1 }, roof: B.roofMembrane, parapet: PAR - ROOF, pmat: CON,
    floorBand: { mat: CON, h: 1.45, p: 0.35 },
  });
  // full-height piers rising above the parapet with terracotta caps (wide bays on the long faces, a denser comb on the ends)
  for (const R of runs) {
    if (R.L < 20) continue;
    const isLong = R.L > 50; const nb = isLong ? 6 : 13;
    for (let j = 0; j <= nb; j++) {
      const s = (R.L / nb) * j; const g = gAt(K, R, s, 1);
      K.rbox(R, CON, s - 0.4, g - 1, -0.05, s + 0.4, PAR + 0.7, 1.15);
      K.rbox(R, CAP, s - 0.45, PAR + 0.7, -0.1, s + 0.45, PAR + 1.25, 1.2);
      if (isLong && j < nb) { const s2 = s + R.L / nb / 2; K.rbox(R, CON, s2 - 0.2, g - 1, -0.05, s2 + 0.2, PAR + 0.3, 0.6); K.rbox(R, CAP, s2 - 0.24, PAR + 0.3, -0.1, s2 + 0.24, PAR + 0.65, 0.64); }
    }
  }
  // recessed, shadowed ground storey: dark glazed lobby band set behind the piers
  for (const R of runs) { if (R.L < 20) continue; K.rbox(R, M.concreteDark, 0.5, levels[1] - 0.3, -0.05, R.L - 0.5, levels[1] + 0.4, 0.5); }
  // light-well floor (LiDAR ~42 m) and the two concrete penthouses (~55.5 m)
  K.prism(B.roofMembrane, inset(well, -0.6), -1, 42.0);
  for (const [a, b, c, d] of [[-12.6, 10.6, 13.6, 21.3], [-13.0, -22.0, 13.6, -11.2]]) {
    massBlock(K, { poly: rect(a, b, c, d), levels: [ROOF, 55.4], top: 55.4, wall: CON, style: 'blank', depth: 0.4, roof: B.roofMembrane, parapet: 0.4, pmat: CON, core: true });
    for (let x = a + 2; x < c - 1; x += 6) K.cyl(B.alum, x, 55.6, (b + d) / 2, 0.3, 0.3, 1.2, 10, { detail: true });
  }
  // entrances: glazed doors at the plaza on both long sides
  for (const R of runs) {
    if (R.L < 50) continue;
    const s = R.L / 2; const g = gAt(K, R, s, 2);
    if (g < levels[1] - 0.5) storefront(K, R, s - 3, s + 3, Math.max(g, levels[0]) + 0.02, Math.max(g, levels[0]) + 3.0, { glass: GL, frame: FR, rev: -0.62, mw: 1.5 });
  }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, PAR + 1.3));
  const object3d = K.finish(); object3d.name = 'evans-hall';
  return { object3d, colliders, walkables };
}
