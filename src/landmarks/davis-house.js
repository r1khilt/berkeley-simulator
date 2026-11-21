// Davis House, 2833 Bancroft Steps: a Julia Morgan house on the hillside Bancroft Steps, now a Berkeley Student Cooperative house.
// Arts & Crafts / Mediterranean mix: a red clinker-brick lower storey under smooth cream stucco upper floors, deep eaves with a
// heavy dark teal fascia on low hipped roofs, multi-light casements and French doors in teal frames, iron balconies carried on
// heavy timber brackets over the recessed brick entry, and half-timber accents on the upper floor. Massing from the 2021 LiDAR
// (main eaves ~12.9 m, ridge ~16 m above datum; a lower west wing); the site climbs ~7 m across the lot.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'davis-house',
  name: 'Davis House',
  subtitle: 'Julia Morgan',
  blurb: 'Designed by Julia Morgan and set on the hillside Bancroft Steps, Davis House is now one of the Berkeley Student Cooperative\'s houses.',
  replaces: ['w/185769363'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.4); const M = ctx.M;
  const ST = coopMat('stucco', '#e9e4d6'), BR = M.brick, TL = coopMat('paint', '#3f6e62'), FAS = coopMat('paint', '#2f4f45'), RF = coopMat('roof', '#5e5850');
  const cas = { w: 0.62, h: 1.6, sill: 0.8, pattern: [2, 3, 2, 1], gap: 0.1, mull: 0, tran: 0.65, muntins: 2, rev: 0.16, casing: 0.1, frame: TL };
  const wins = [{ ...cas, pattern: [2, 1, 2], h: 1.5 }, { ...cas }, { ...cas, pattern: [3, 2, 1, 2] }, { ...cas, h: 1.25 }];
  const floors = [1.0, 4.4, 7.6, 10.4, 12.9];
  const hip = (sl, ov = 1.0) => ({ type: 'hip', slope: sl, overhang: ov, mat: RF, fascia: FAS, soffitMat: FAS, fasciaH: 0.3, tails: true, tailMat: FAS, tailSp: 0.7 });
  const main = K.block({ u0: -9.45, u1: 18.53, v0: -7.64, v1: 6.06, floors, wall: ST, wallMats: [BR, BR], trim: TL, wins, bay: 3.4, roof: hip(0.45), belts: [4.4], beltMat: TL });
  const west = K.block({ u0: -18.13, u1: -9.45, v0: -7.64, v1: 7.24, floors: [1.0, 4.2, 7.2], wall: ST, wallMats: [BR, BR], trim: TL, wins, bay: 3.2, roof: hip(0.32, 0.8) });
  const bay = K.block({ u0: -9.45, u1: 11.24, v0: 6.06, v1: 8.27, floors: [1.0, 4.4, 7.5], wall: ST, wallMats: [BR, BR], trim: TL, wins: [wins[0], { ...cas, pattern: [2, 1, 2, 1, 2], w: 0.7, h: 2.1, sill: 0.15 }], bay: 3.4,
    roof: { type: 'flat', parapet: 0, overhang: 0.25, eaveMat: FAS, eaveH: 0.3 }, faces: { S: { doors: [{ s: 10.3, w: 1.6, h: 2.6, door: coopMat('paint', '#5b3b28'), frame: TL }] } } });
  K.buildBlocks();
  // iron balcony railing on the roof of the entry bay, carried on heavy timber brackets with exposed beam ends
  { const R = bay.runS; K._rail(R, 0.3, R.L - 0.3, 0.12, 7.8, M.iron, 1.0); K.walkables.push(K.walkRun(R, 0.1, R.L - 0.1, -2.2, 0.1, () => 7.8));
    for (let s = 0.6; s < R.L; s += 1.1) K.rbox(R, FAS, s - 0.08, 7.25, 0, s + 0.08, 7.5, 0.45, { detail: true });
    for (const s of [8.4, 12.2]) { const gy = K.gR(R, s, 0.8); K.rbox(R, BR, s - 0.3, gy - 0.5, 0, s + 0.3, 3.1, 0.6); K.rbox(R, coopMat('paint', '#5a4030'), s - 0.15, 3.1, 0, s + 0.15, 4.3, 0.55); }
    K.rbox(R, coopMat('paint', '#5a4030'), 7.9, 4.0, 0.15, 12.7, 4.35, 0.6);
    for (const s of [8.9, 11.7]) K.lathe(M.iron, [[0.02, 0], [0.14, 0.15], [0.16, 0.45], [0.06, 0.6], [0.001, 0.62]], 0, 0, 0, 8, { detail: true }) && null; }
  // second iron balcony on the west wing's south face
  // half-timber accents on the top floor at the east end of the Bancroft Steps front
  { const R = main.runS; const DK = coopMat('paint', '#4a3a2c');
    for (const [s0, s1, y0, y1] of [[R.L - 9.5, R.L - 0.4, 7.65, 12.75], [0.4, 7.0, 10.45, 12.75]]) {
      for (let s = s0; s <= s1 + 0.01; s += 1.3) K.rbox(R, DK, s - 0.08, y0, 0, s + 0.08, y1, 0.06);
      for (const y of [y0 + 0.05, (y0 + y1) / 2, y1 - 0.05]) K.rbox(R, DK, s0 - 0.1, y - 0.08, 0, s1 + 0.1, y + 0.08, 0.06);
      for (let s = s0; s < s1 - 1.2; s += 2.6) { const L = Math.hypot(1.3, (y1 - y0) / 2), g = new THREE.BoxGeometry(L, 0.12, 0.05); g.rotateZ(Math.atan2((y1 - y0) / 2, 1.3)); g.translate(s + 0.65, y0 + (y1 - y0) * 0.25, 0.03); K.addRun(R, DK, g, { detail: true }); } } }
  K.chimney(4.0, -3.0, 0.9, 0.8, 16.9, BR);
  return K.done('davis-house');
}
