// O'Brien Hall (1959; Van Bourg & Nakamura): a modernist three-storey laboratory building adjoining the east side of Hesse Hall,
// named in 1968 for Morrough O'Brien, dean of engineering 1948-59. A light concrete frame with tall lab storeys, continuous
// ribbon windows between solid spandrel bands with teal-grey panels, a slightly taller west service strip, and a flat roof.
// Massing follows the 2021 LiDAR: roof ~18.2 m, west strip and south end ~20 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, storefront, signText } from './lib/b03-kit.js';
import { pathEntrances, planting, bikes } from './lib/rn-kit.js';

export const info = {
  id: 'o-brien-hall',
  name: "O'Brien Hall",
  subtitle: 'Van Bourg & Nakamura · 1959',
  blurb: "A modernist three-storey engineering building joined to the east side of Hesse Hall, named in 1968 for Morrough O'Brien, a professor who served as dean of the College of Engineering from 1948 to 1959.",
  replaces: ['w/24025434'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.7);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xcdbfb2, roughness: 0.92, map: B.precast.map, normalMap: B.precast.normalMap, roughnessMap: B.precast.roughnessMap }); // warm taupe board-formed
  const WING = new THREE.MeshStandardMaterial({ color: 0xb09a8a, roughness: 0.9, map: B.brickBuff.map, normalMap: B.brickBuff.normalMap }); const BASEC = new THREE.MeshStandardMaterial({ color: 0xcfc6bd, roughness: 0.9 });
  const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x5e6e66, roughness: 0.5, metalness: 0.4 });
  const SPAN = new THREE.MeshStandardMaterial({ color: 0x8fa88a, roughness: 0.6, metalness: 0.1 });
  const colliders = [];
  const u0 = -8.4, u1 = 8.4, v0 = -23.6, v1 = 23.6, ROOF = 18.2;
  const levels = [-1.5, 0.3, 6.2, 12.2, ROOF];
  const runs = massBlock(K, { poly: rect(-4.2, v0, u1, 17.0), levels, top: ROOF, wall: CON, style: 'punched', depth: 0.45, rev: 0.3, glass: GL, frame: FR,
    win: { w: 2.4, h: 4.7, sill: 0.8, bay: 7.6, mull: 1, tran: 0.62 }, roof: B.roofMembrane, parapet: 0.6, pmat: CON, coping: FR });
  // teal-grey spandrel panels below the ribbons
  // pale green spandrel panels tie the stacked windows of each bay into one tall recessed strip; lighter base course
  for (const R of runs) { if (R.L < 5) continue; const nb = Math.max(1, Math.round(R.L / 7.6));
    for (let j = 0; j < nb; j++) { const c = (R.L / nb) * (j + 0.5); for (const k of [2, 3]) { const fl = levels[k]; if (fl < gAt(K, R, c, 1) + 0.5) continue; K.rbox(R, SPAN, c - 1.2, fl - 0.9 - 0.25, -0.32, c + 1.2, fl + 0.8, -0.28); } }
    const g0 = Math.min(gAt(K, R, 0, 0.6), gAt(K, R, R.L, 0.6)); K.rbox(R, BASEC, -0.03, g0 - 0.5, -0.05, R.L + 0.03, Math.max(g0 + 0.9, 0.9), 0.06); }
  // taller west service strip and south end block (~20 m), with fewer, smaller windows
  for (const r of [rect(u0, v0, -4.2, v1), rect(-4.2, 17.0, u1, v1)]) {
    massBlock(K, { poly: r, levels: [-1.5, 0.3, 6.2, 12.2, 19.8], top: 19.8, wall: WING, style: 'ribbon', depth: 0.35, rev: 0.25, glass: GL, frame: FR, win: { sill: 1.6, h: 3.0, mw: 1.5, edge: 0.6 }, roof: B.roofMembrane, parapet: 0.5, pmat: CON, coping: FR, floorBand: { mat: CON, h: 0.4, p: 0.12 } });
  }
  { const R = runs.find((r) => r.n[0] > 0.9); if (R) { const s = R.L * 0.5, gy = Math.max(gAt(K, R, s, 1.5), -1);
    K.rbox(R, M.concreteDark, s - 2.2, gy, -0.6, s + 2.2, gy + 3.3, -0.05); storefront(K, R, s - 2.0, s + 2.0, gy + 0.03, gy + 3.0, { glass: GL, frame: FR, rev: 0.6, transom: gy + 2.4 });
    planting(K, R, 1.0, R.L - 1.0, { d0: 0.2, depth: 1.1, h: 0.8, hedge: true, skip: [[s - 3.2, s + 3.2]], seed: 121 }); colliders.push(...bikes(K, R, s + 8, 3.0, 8, 4));
    signText(K, R, "O'BRIEN HALL", s, gy + 3.5, 0.38, { color: '#3a3a38', metal: 0.4, spacing: 0.08, font: 'Helvetica, Arial, sans-serif' }); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, 20.4));
  const object3d = K.finish(); object3d.name = 'o-brien-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables: [] };
}
