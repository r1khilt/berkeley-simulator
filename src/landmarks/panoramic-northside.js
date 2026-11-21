// Panoramic Northside, 1752 Shattuck Avenue: a new seven-storey apartment building on North Shattuck at Francisco Street
// (completed after the 2021 LiDAR survey, so massing follows the OSM footprint, its 7 levels and the developer's rendering).
// A tall glazed retail ground floor under a slim canopy; above it the Shattuck front reads as three vertical volumes, a recessed
// charcoal block and two rust-red blocks (the northern one with a taller parapet), split by a glazed slot; tall paired windows in
// strict columns with deep dark reveals; flat roof with parapets.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'panoramic-northside',
  name: 'Panoramic Northside',
  subtitle: '1752 Shattuck Avenue',
  blurb: 'A new seven-storey apartment building on North Shattuck Avenue at Francisco Street.',
  replaces: ['w/1524105376'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -6.3); const M = ctx.M;
  const CH = coopMat('cmu', '#3d3e40'), RU = coopMat('cmu', '#b0532f'), FR = coopMat('metal', '#1e1f21'), SLOT = coopMat('paint', '#d9824a');
  const g0 = K.gMax(-13.29, -16.58, 12.73, 16.59, 6); const GF = g0 + 0.15; const top = GF + 4.8 + 6 * 3.05;
  const floors = [GF, GF + 4.8]; for (let i = 1; i <= 6; i++) floors.push(+(GF + 4.8 + i * 3.05).toFixed(2));
  const shop = { w: 2.7, h: 3.6, sill: 0.25, pair: 1, mull: 1, tran: 0.78, rev: 0.2, casing: 0, frame: FR };
  const res = { w: 1.0, h: 2.05, sill: 0.55, pattern: [2, 2, 3, 2], gap: 0.22, mull: 0, tran: 0.75, rev: 0.28, casing: 0, frame: FR };
  const wins = [shop, res, res, res, res, res, res];
  const flat = (par, mat) => ({ type: 'flat', parapet: par, coping: coopMat('metal', '#2b2c2e'), parapetMat: mat });
  // north (right) rust block, taller parapet
  K.block({ u0: -13.29, u1: 12.73, v0: -16.58, v1: -4.5, floors, wall: RU, wallMats: [M.concreteDark, FR], trim: FR, wins, bay: 3.1, depth: 0.35, roof: flat(1.4, RU),
    faces: { N: { doors: [{ s: 6.0, w: 1.8, h: 2.8, door: FR, leaf: 2.75, frame: FR, steps: false }] } } });
  // centre rust block set slightly forward
  K.block({ u0: -13.29, u1: 12.93, v0: -4.5, v1: 5.4, floors, wall: RU, wallMats: [M.concreteDark, FR], trim: FR, wins, bay: 3.1, depth: 0.35, roof: flat(0.7, RU),
    faces: { E: { doors: [{ s: 5.0, w: 2.0, h: 3.0, door: FR, leaf: 2.9, frame: FR, steps: false }] } } });
  // glazed slot
  K.block({ u0: -12.0, u1: 11.6, v0: 5.4, v1: 6.6, floors: [GF, top - 0.2], wall: FR, trim: FR, bay: 1.2, win: { glass: ctx.M.windowNight, w: 0.85, h: top - GF - 1.2, sill: 0.3, pair: 1, mull: 0, tran: 0, rev: 0.1, casing: 0, frame: FR, glass: SLOT }, roof: flat(0.4, FR), collide: false });
  // south (left) charcoal block, recessed
  K.block({ u0: -13.29, u1: 12.33, v0: 6.6, v1: 16.59, floors, wall: CH, wallMats: [M.concreteDark, FR], trim: FR, wins, bay: 3.1, depth: 0.35, roof: flat(0.7, CH) });
  K.buildBlocks();
  // slim canopy over the shopfronts on Shattuck and Francisco
  for (const [b, f] of [[K.blocks[0], 'N'], [K.blocks[0], 'E'], [K.blocks[1], 'E'], [K.blocks[3], 'E']]) { const R = K.faceRun(b, f); K.rbox(R, coopMat('metal', '#2b2c2e'), 0.2, GF + 4.0, 0, R.L - 0.2, GF + 4.18, 1.4); }
  // rooftop mechanical screen
  K.box(coopMat('metal', '#6f7275'), -6, top + 0.7, -8, 4, top + 2.4, 2);
  return K.done('panoramic-northside');
}
