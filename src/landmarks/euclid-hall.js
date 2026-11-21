// Euclid Hall, 1777 Euclid Avenue: a Berkeley Student Cooperative house in a 1920s Northside apartment building. Four storeys of
// red-brown face brick with cream cast-stone trim, a flat roof behind a parapet with a bracketed cornice, tall paired sash
// windows in regular bays, and a bracketed entrance hood carrying a small wrought-iron balconette on the Euclid Avenue front.
// Massing from the 2021 LiDAR (flat roofs ~12.7-12.9 m above datum, a lower rear wing ~9.5 m).
// (Few published photos exist; the façade treatment is a plausible reconstruction of the period style.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop } from './lib/rn-b-ground.js';
import { corniceProfile } from './lib/classic-kit.js';

export const info = {
  id: 'euclid-hall',
  name: 'Euclid Hall',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A Berkeley Student Cooperative house on Euclid Avenue, a short walk from North Gate.',
  replaces: ['w/184877790'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.5); const M = ctx.M;
  const BR = M.brick, CS = coopMat('stucco', '#e6dcc8'), SA = coopMat('paint', '#2e3a2e');
  const win = { w: 0.85, h: 1.65, sill: 0.8, pair: 2, pattern: [2, 2, 1, 2], gap: 0.22, mull: 0, tran: 0.55, muntins: 1, rev: 0.2, casing: 0.1, frame: SA, casingMat: CS };
  const floors = [1.2, 4.1, 7.0, 9.9, 12.5];
  const flat = { type: 'flat', parapet: 0.7, coping: CS, parapetMat: BR };
  const A = K.block({ u0: -15.45, u1: -4.41, v0: -5.02, v1: 3.25, floors, wall: BR, wallMats: [CS, CS], trim: SA, win, bay: 3.2, roof: flat, belts: [4.1], beltMat: CS,
    faces: { W: { doors: [{ s: 3.9, w: 1.5, h: 2.6, door: coopMat('paint', '#4a3020'), frame: CS }] } } });
  const B = K.block({ u0: -4.41, u1: 12.5, v0: -3.64, v1: 2.29, floors: [1.8, 4.6, 7.4, 10.2, 13.0], wall: BR, wallMats: [CS, CS], trim: SA, win, bay: 3.2, roof: flat, belts: [4.6], beltMat: CS });
  K.block({ u0: 12.5, u1: 17.75, v0: -3.64, v1: 2.29, floors: [2.2, 4.8, 6.6], wall: BR, wallMats: [CS, CS], trim: SA, win, bay: 3.0, roof: { ...flat, parapet: 0.5 } });
  K.block({ u0: -3.0, u1: 7.0, v0: -3.4, v1: -0.6, floors: [13.0, 15.4], wall: BR, trim: SA, win: { ...win, pattern: [1, 0] }, bay: 3.4, roof: { ...flat, parapet: 0.3 }, collide: false });
  K.block({ u0: -2.54, u1: 4.7, v0: 3.25, v1: 7.11, floors: [1.8, 4.6, 7.4, 9.2], wall: BR, wallMats: [CS, CS], trim: SA, win, bay: 3.2, roof: { ...flat, parapet: 0.5 } });
  K.buildBlocks();
  // bracketed cornice under the parapet on the street block and along the long south face
  for (const [b, f] of [[A, 'W'], [A, 'S'], [A, 'N'], [B, 'S'], [B, 'N']]) {
    const R = K.faceRun(b, f); const y = b.eave + 0.05; K.mould(R, CS, 0.2, R.L - 0.2, corniceProfile(y, 0.45, 0.45));
    for (let s = 0.6; s < R.L - 0.4; s += 1.2) K.rbox(R, CS, s - 0.07, y - 0.75, 0, s + 0.07, y - 0.42, 0.3, { detail: true });
  }
  // bracketed entrance hood with an iron balconette on the Euclid Avenue front
  { const R = A.runW; const sc = 3.9; K.rbox(R, CS, sc - 1.4, 3.9, 0, sc + 1.4, 4.1, 0.9);
    for (const s of [sc - 1.2, sc + 1.2]) K.rbox(R, CS, s - 0.12, 3.2, 0, s + 0.12, 3.9, 0.7);
    K._rail(R, sc - 1.3, sc + 1.3, 0.8, 4.1, M.iron, 0.9); for (const s of [sc - 1.3, sc + 1.3]) { const S = K.run(R.at(s, 0), R.at(s, 0.85)); K._rail(S, 0.05, 0.8, 0, 4.1, M.iron, 0.9); } }
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 3, plant: { h: 0.8, depth: 1.0 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('euclid-hall');
}
