// Campbell Hall (rebuilt 2015), home of astronomy and physics research groups, on the site of the 1959 Campbell Hall.
// Buff precast slab with a tight grid of punched square windows over a grey concrete base, a full-height glazed stair slot,
// a lower wing wrapped in horizontal aluminium sun-louvres, and set-back metal penthouses and roof terrace on top.
// Massing from LiDAR: north bar ~28 m, main body ~25 m, lower west/south wings ~21.5 m, penthouse ~28 m.
import * as THREE from 'three';
import { Kit, grid, curtain, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'campbell-hall',
  name: 'Campbell Hall',
  subtitle: 'Astronomy & physics · 2015',
  blurb: 'Rebuilt in 2015 to replace the seismically unsafe 1959 building of the same name, Campbell Hall houses astronomy and physics research, with a rooftop deck for observing.',
  replaces: ['w/24024499'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.9)); const M = ctx.M;
  const P = tint(M, 'stuccoWhite', 0xe9e3d3), Pd = tint(M, 'stuccoWhite', 0xc9c4b8), ROOF = tint(M, 'redTile', 0xd7a088), PJ = tint(M, 'stuccoWhite', 0xd3cdbd), AL = plain(M, 0xa9adb0, { rough: 0.35, metal: 0.7 }), GL = glassTint(M, 0x2f3b42);
  const colliders = [], walkables = [];
  const base = 4.5;
  const lvMain = [base, 8.5, 12.5, 16.5, 20.4, 24.3], lvBar = [base, 8.5, 12.4, 16.3, 20.2, 24.1, 26.1];
  const punch = (R, lv, o = {}) => grid(K, R, 0, R.L, lv, { mat: P, bay: 2.45, pier: 0.95, sill: 1.0, head: 1.2, rec: 0.28, mull: 0, glass: GL, frame: AL, endPier: 0.8, topBand: 0.6, ...o });
  const plinth = (R) => grid(K, R, 0, R.L, [-1.5, base], { mat: Pd, bay: 3.6, pier: 0.5, sill: 1.3, head: 0.5, rec: 0.2, mull: 2, glass: GL, frame: AL });
  // north bar (taller)
  const bar = rect(-13.3, -18.3, 15.5, -9.0);
  for (const { R, i } of runsOf(K, bar)) { if (i === 0) continue; punch(R, lvBar); plinth(R); for (let ss = 1.5; ss < R.L; ss += 1.5) K.rbox(R, PJ, ss - 0.012, base, 0, ss + 0.012, 26.1, 0.012, { detail: true }); for (let y = base + 0.75; y < 26; y += 0.75) K.rbox(R, PJ, 0, y - 0.01, 0, R.L, y + 0.01, 0.012, { detail: true }); }
  // steep red-tile gable roof over the north slab (LiDAR: eaves ~26 m, ridge ~29.3 m along the slab)
  K.box(M.concreteDark, -13.2, 25.9, -18.2, 15.4, 26.15, -9.1);
  K.gable(ROOF, -13.3, -18.3, 15.5, -9.0, 26.1, 3.2, 'u', { overhang: 0.6, wallMat: P });
  // main body
  const body = rect(-13.3, -9.0, 15.5, 11.0);
  for (const { R, i } of runsOf(K, body)) { if (i === 2 || i === 3) continue; punch(R, lvMain, i === 0 ? { solidLv: [] } : {}); plinth(R); }
  flatRoof(K, body, 24.3, { parapet: 0.8, mat: P });
  K.box(M.concreteDark, -12.8, -1.5, -17.8, 15.0, 25.9, 10.5);
  // lower west wing wrapped in horizontal aluminium sun-louvres over a curtain wall
  const west = rect(-17.2, -8.3, -13.3, 12.3);
  const louv = (R, y0, y1) => { curtain(K, R, 0, R.L, y0, y1, { glass: GL, frame: AL, mw: 1.6, levels: [y0, 8.6, 12.7, 16.8, y1] }); for (let y = y0 + 0.5; y < y1 - 0.2; y += 0.55) K.rbox(R, AL, -0.1, y, 0.25, R.L + 0.1, y + 0.06, 0.85, { detail: true }); for (let s = 0; s <= R.L; s += 3.2) K.rbox(R, AL, s - 0.04, y0, 0.0, s + 0.04, y1, 0.9); };
  for (const { R, i } of runsOf(K, west)) { if (i === 1) continue; louv(R, base, 21.3); plinth(R); }
  flatRoof(K, west, 21.6, { parapet: 0.5, mat: AL });
  K.box(M.concreteDark, -16.7, -1.5, -7.8, -13.3, 21.3, 11.8);
  // south wing: louvred at the west part, punched at the east part (LiDAR ~21.5 / ~25 m)
  const south = rect(-12.6, 11.0, 9.0, 18.1), southE = rect(9.0, 11.0, 15.6, 18.1);
  for (const { R, i } of runsOf(K, south)) { if (i === 2) continue; if (i === 1) continue; louv(R, base, 21.3); plinth(R); }
  flatRoof(K, south, 21.6, { parapet: 0.5, mat: AL });
  for (const { R, i } of runsOf(K, southE)) { if (i === 2 || i === 3) continue; punch(R, lvMain); plinth(R); }
  flatRoof(K, southE, 24.3, { parapet: 0.8, mat: P });
  K.box(M.concreteDark, -12.1, -1.5, 11.0, 15.1, 21.3, 17.6);
  // full-height glazed stair slot at the north-west corner of the body
  { const R = K.run([-17.2, -8.3], [-13.3, -8.3]); curtain(K, R, 0, R.L, base, 25.0, { glass: GL, frame: plain(M, 0x4a5058, { rough: 0.5, metal: 0.5 }), mw: 1.3, levels: [base, 8.6, 12.7, 16.8, 20.9, 25.0] });
    const R2 = K.run([-13.3, -9.0], [-13.3, -18.3]); punch(R2, lvBar); plinth(R2); }
  // set-back penthouse + observing deck rail on the north bar
  penthouse(K, -2.0, -5.5, 8.5, 0.5, 25.0, 28.2, { mat: plain(M, 0x9ea3a6, { rough: 0.45, metal: 0.6 }), cap: AL, louvre: true });
  // entrances: west lobby at the base of the stair slot, south door
  entrance(K, K.run([-17.2, 12.3], [-12.6, 12.3]), 2.3, Math.max(0, K.g(-15, 13)), { w: 3.2, h: 3.0, rec: 0.2, glass: GL, frame: AL, canopy: 1.8, canopyMat: AL });
  entrance(K, K.run([9.0, 18.1], [15.6, 18.1]), 3.3, Math.max(0, K.g(12, 19)), { w: 3.6, h: 3.0, rec: 0.2, glass: GL, frame: AL, canopy: 1.8, canopyMat: AL });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 30));
  const object3d = K.finish(); object3d.name = 'campbell-hall';
  return { object3d, colliders, walkables };
}
