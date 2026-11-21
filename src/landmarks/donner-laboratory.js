// Donner Laboratory (1941), birthplace of nuclear medicine, built for John Lawrence with a gift from William Donner.
// The original three-storey block is cream stucco under a red-tile hip roof; the four-storey 1950s wing that angles away to
// the north-west is a deep exposed-concrete egg-crate with dark horizontal sun-baffles. Massing from LiDAR: original block
// eaves ~13.5 m / ridge ~17 m, angled wing ~18.5 m.
import * as THREE from 'three';
import { Kit, punchedBlock, grid, runsOf, flatRoof, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'donner-laboratory',
  name: 'Donner Laboratory',
  subtitle: 'Nuclear medicine · 1941',
  blurb: 'Funded by William H. Donner for John H. Lawrence\'s research using radioactive isotopes to diagnose and treat disease, Donner Lab is considered a birthplace of nuclear medicine.',
  replaces: ['w/24026114'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.5)); const M = ctx.M;
  const C = tint(M, 'concrete', 0xd8d3c8), FR = plain(M, 0x3b3d3c, { rough: 0.5, metal: 0.5 }), Cf = tint(M, 'concrete', 0xa29b8e), Ci = tint(M, 'concrete', 0xcdc2aa), Lv = plain(M, 0x5a5c5a, { rough: 0.5, metal: 0.5 });
  const colliders = [], walkables = [];
  // original block (south bar) with red-tile hip roof
  const rows = [{ y0: 0.6, h: 2.6, w: 1.5, mull: 1, tran: 0.7, muntins: 2 }, { y0: 4.9, h: 2.5, w: 1.5, mull: 1, tran: 0.7, muntins: 2 }, { y0: 9.2, h: 2.4, w: 1.5, mull: 1, muntins: 2 }];
  const runs = punchedBlock(K, -20.8, 6.7, 29.3, 21.2, { y0: -2.5, eave: 12.9, mat: C, frame: FR, bay: 3.3, rows, plinth: { h: 0.5, mat: Ci }, cornice: { P: 0.4, H: 0.5, mat: C }, roof: { type: 'hip', slope: 0.42, overhang: 0.7 }, faces: { N: { skip: [0, 1, 2, 3, 4, 5] } } });
  // stripped-classical articulation: channel-rusticated base, shallow pilaster strips between bays, belt course
  for (const R of Object.values(runs)) {
    const nb = Math.max(1, Math.round((R.L - 1.6) / 3.3)); const w = (R.L - 1.6) / nb;
    for (let y = -0.4; y < 3.9; y += 0.55) K.rbox(R, Ci, -0.06, y, 0, R.L + 0.06, y + 0.035, 0.06);
    K.rbox(R, C, -0.1, 3.9, 0, R.L + 0.1, 4.25, 0.14);
    for (let i = 0; i <= nb; i++) { const s0 = 0.8 + w * i; K.rbox(R, C, s0 - 0.45, 4.25, 0, s0 + 0.45, 12.3, 0.07); }
  }
  // angled 1950s wing: deep concrete egg-crate with horizontal sun-baffles
  const wing = [[-6.8, -5.9], [-18.8, -28.0], [-2.6, -36.8], [9.5, -13.1], [11.8, -9.1], [4.4, -4.8], [2.9, -3.9], [2.9, 6.7], [-17.4, 6.7], [-17.4, 1.9], [-7.2, -3.6]];
  for (const { R } of runsOf(K, wing)) {
    if (R.L < 2.5) continue;
    const g = grid(K, R, 0, R.L, [-2.0, 3.8, 7.6, 11.4, 15.2, 18.4], { mat: Cf, bay: 3.4, pier: 0.4, pierOut: 0.75, bandOut: 0.75, sill: 0.9, head: 0.3, rec: 0.3, mull: 1, glass: glassTint(M, 0x2c3236), frame: M.darkBronze, endPier: 0.5, topBand: 0.5 });
    for (const y of [3.0, 6.8, 10.6, 14.4]) K.rbox(R, Lv, 0.3, y, 0.15, R.L - 0.3, y + 0.08, 0.7, { detail: true });
  }
  K.prism(M.concreteDark, wing.slice().reverse().map(([u, v]) => [u, v]), -2.0, 18.3);
  flatRoof(K, wing, 18.4, { parapet: 0.0, mat: Cf });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 19));
  const object3d = K.finish(); object3d.name = 'donner-laboratory';
  return { object3d, colliders, walkables };
}
