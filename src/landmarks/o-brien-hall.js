// O'Brien Hall (1959; Van Bourg & Nakamura): a modernist three-storey laboratory building adjoining the east side of Hesse Hall,
// named in 1968 for Morrough O'Brien, dean of engineering 1948-59. A light concrete frame with tall lab storeys, continuous
// ribbon windows between solid spandrel bands with teal-grey panels, a slightly taller west service strip, and a flat roof.
// Massing follows the 2021 LiDAR: roof ~18.2 m, west strip and south end ~20 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, storefront, signText } from './lib/b03-kit.js';

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
  const CON = B.offWhite, GL = B.glassBlue, FR = B.alum;
  const SPAN = new THREE.MeshStandardMaterial({ color: 0x8a9aa0, roughness: 0.6, metalness: 0.2 });
  const colliders = [];
  const u0 = -8.4, u1 = 8.4, v0 = -23.6, v1 = 23.6, ROOF = 18.2;
  const levels = [-1.5, 0.3, 6.2, 12.2, ROOF];
  const runs = massBlock(K, { poly: rect(-4.2, v0, u1, 17.0), levels, top: ROOF, wall: CON, style: 'ribbon', depth: 0.35, rev: 0.25, glass: GL, frame: FR,
    win: { sill: 1.6, h: 3.0, mw: 1.5, edge: 0.6, bay: 6.0 }, pier: { w: 0.4, p: 0.15, mat: CON, top: ROOF, ends: true }, roof: B.roofMembrane, parapet: 0.6, pmat: CON, coping: FR, floorBand: { mat: CON, h: 0.4, p: 0.12 } });
  // teal-grey spandrel panels below the ribbons
  for (const R of runs) { if (R.L < 5) continue; for (let k = 1; k < levels.length - 1; k++) { const fl = levels[k]; if (fl + 1.5 < gAt(K, R, R.L / 2, 1)) continue; K.rbox(R, SPAN, 0.6, fl + 0.35, -0.05, R.L - 0.6, fl + 1.55, 0.02); } }
  // taller west service strip and south end block (~20 m), with fewer, smaller windows
  for (const r of [rect(u0, v0, -4.2, v1), rect(-4.2, 17.0, u1, v1)]) {
    massBlock(K, { poly: r, levels: [-1.5, 0.3, 6.2, 12.2, 19.8], top: 19.8, wall: CON, style: 'ribbon', depth: 0.35, rev: 0.25, glass: GL, frame: FR, win: { sill: 1.6, h: 3.0, mw: 1.5, edge: 0.6 }, roof: B.roofMembrane, parapet: 0.5, pmat: CON, coping: FR, floorBand: { mat: CON, h: 0.4, p: 0.12 } });
  }
  { const R = runs.find((r) => r.n[0] > 0.9); if (R) { const s = R.L * 0.5, gy = Math.max(gAt(K, R, s, 1.5), -1);
    storefront(K, R, s - 2.0, s + 2.0, gy + 0.03, gy + 3.0, { glass: GL, frame: FR, rev: -0.36 });
    signText(K, R, "O'BRIEN HALL", s, gy + 3.5, 0.38, { color: '#3a3a38', metal: 0.4, spacing: 0.08, font: 'Helvetica, Arial, sans-serif' }); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, 20.4));
  const object3d = K.finish(); object3d.name = 'o-brien-hall';
  return { object3d, colliders, walkables: [] };
}
