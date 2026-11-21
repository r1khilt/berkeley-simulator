// Donner Laboratory (1941), birthplace of nuclear medicine, built for John Lawrence with a gift from William Donner.
// The original three-storey block is cream stucco under a red-tile hip roof; the four-storey 1950s wing that angles away to
// the north-west is a deep exposed-concrete egg-crate with dark horizontal sun-baffles. Massing from LiDAR: original block
// eaves ~13.5 m / ridge ~17 m, angled wing ~18.5 m.
import * as THREE from 'three';
import { Kit, punchedBlock, grid, runsOf, flatRoof, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';
import { pathEntrances, entry, planting, rnMats, propAt } from './lib/rn-kit.js';
import { gAt } from './lib/b03-kit.js';

export const info = {
  id: 'donner-laboratory',
  name: 'Donner Laboratory',
  subtitle: 'Nuclear medicine · 1941',
  blurb: 'Funded by William H. Donner for John H. Lawrence\'s research using radioactive isotopes to diagnose and treat disease, Donner Lab is considered a birthplace of nuclear medicine.',
  replaces: ['w/24026114'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.5)); const M = ctx.M;
  const C = tint(M, 'stuccoWhite', 0xe8e3d8), FR = plain(M, 0x8f9493, { rough: 0.45, metal: 0.5 }), Cf = tint(M, 'concrete', 0xd2cdc3), Ci = tint(M, 'stuccoWhite', 0xdcd6c9), Lv = plain(M, 0x5a5c5a, { rough: 0.5, metal: 0.5 });
  const colliders = [], walkables = [];
  // original block (south bar) with red-tile hip roof
  const rows = [{ y0: 0.8, h: 2.0, w: 1.45, mull: 3, muntins: 2 }, { y0: 4.9, h: 2.5, w: 1.6, mull: 3, tran: 0.72, muntins: 3 }, { y0: 9.2, h: 2.4, w: 1.6, mull: 3, muntins: 3 }];
  const runs = punchedBlock(K, -20.8, 6.7, 29.3, 21.2, { y0: -2.5, eave: 12.9, mat: C, frame: FR, bay: 3.3, rows, plinth: { h: 0.5, mat: Ci }, cornice: { P: 0.4, H: 0.5, mat: C }, roof: { type: 'hip', slope: 0.38, overhang: 0.7, mat: tint(M, 'redTile', 0xd9c3bb) }, faces: { N: { skip: [0, 1, 2, 3, 4, 5] } } });
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
    const g = grid(K, R, 0, R.L, [-2.0, 3.8, 7.6, 11.4, 15.2, 18.4], { mat: Cf, bay: 3.4, pier: 0.4, pierOut: 0.75, bandOut: 0.75, sill: 0.9, head: 0.3, rec: 0.3, mull: 1, glass: M.windowNight, frame: M.darkBronze, endPier: 0.5, topBand: 0.5 });
    for (const y of [3.0, 6.8, 10.6, 14.4]) K.rbox(R, Lv, 0.3, y, 0.15, R.L - 0.3, y + 0.08, 0.7, { detail: true });
  }
  K.prism(M.concreteDark, wing.slice().reverse().map(([u, v]) => [u, v]), -2.0, 18.3);
  flatRoof(K, wing, 18.4, { parapet: 0.0, mat: Cf });
  // copper ridge ventilator on the original block
  { const uc = 4.25, vc = 13.95, yR = 12.9 + 0.38 * Math.min(29.3 + 20.8, 21.2 - 6.7) / 2; K.box(M.copper, uc - 1.5, yR - 0.4, vc - 1.0, uc + 1.5, yR + 0.8, vc + 1.0); K.box(M.copper, uc - 1.8, yR + 0.8, vc - 1.25, uc + 1.8, yR + 0.95, vc + 1.25); }
  // entrance(s) where the paths arrive on the original block: concrete surround, steps to the plaza, lamp, planting, brick walk
  { const X = rnMats(M); const RR = Object.values(runs); const ents = pathEntrances(K, ctx, RR).slice(0, 2); const skips = new Map();
    for (const e of ents) { const g = gAt(K, e.R, e.s, 1.8); const fl = Math.max(g, -0.2);
      const r = entry(K, e.R, e.s, { w: 2.4, h: 3.2, floor: fl, surround: Ci, sw: 0.45, sp: 0.35, frame: FR, stepMat: tint(M, 'concrete', 0xcfcac0), landing: 1.4, stairW: 5.0, canopy: false });
      walkables.push(...r.walkables); colliders.push(...r.colliders); const p = e.R.at(e.s + 3.6, 2.4); colliders.push(propAt(K, 'campusLamp', p[0], p[1], 0));
      skips.set(e.R, [...(skips.get(e.R) || []), [e.s - 3.4, e.s + 3.4]]); }
    for (const R of [runs.S, runs.W, runs.E].filter(Boolean)) { planting(K, R, 0.8, R.L - 0.8, { d0: 0.15, depth: 1.2, h: 0.9, skip: skips.get(R) || [], seed: 31 });
      const brick = tint(M, 'brick', 0xd9a596); for (let s = -1.5; s < R.L + 1.5; s += 1.5) { const g = Math.max(gAt(K, R, s, 2.4), gAt(K, R, s + 1.5, 2.4)); K.rbox(R, brick, s, g - 0.6, 1.45, s + 1.55, g + 0.04, 3.4, { detail: true }); } } }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 19));
  const object3d = K.finish(); object3d.name = 'donner-laboratory';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
