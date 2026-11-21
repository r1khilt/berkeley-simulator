// Davis House, 2833 Bancroft Steps: a Julia Morgan house on the hillside Bancroft Steps, now a Berkeley Student Cooperative house.
// Arts & Crafts / Mediterranean mix: a red clinker-brick lower storey under smooth cream stucco upper floors, deep eaves with a
// heavy dark teal fascia on low hipped roofs, multi-light casements and French doors in teal frames, iron balconies carried on
// heavy timber brackets over the recessed brick entry, and half-timber accents on the upper floor. Massing from the 2021 LiDAR
// (main eaves ~12.9 m, ridge ~16 m above datum; a lower west wing); the site climbs ~7 m across the lot.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { rmats } from './lib/reastb-kit.js';

export const info = {
  id: 'davis-house',
  name: 'Davis House',
  subtitle: 'Julia Morgan',
  blurb: 'Designed by Julia Morgan and set on the hillside Bancroft Steps, Davis House is now one of the Berkeley Student Cooperative\'s houses.',
  replaces: ['w/185769363'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.4); const M = ctx.M;
  const ST = coopMat('stucco', '#ede4cc'), BR = rmats(M).davisBrick, TL = coopMat('paint', '#336b58'), FAS = coopMat('paint', '#2f5e52'), RF = coopMat('roof', '#5e5a55'), SOF = coopMat('paint', '#e8e2cc');
  const cas = { w: 0.62, h: 1.9, sill: 0.6, pattern: [3, 2], gap: 0.1, mull: 0, tran: 0.72, muntins: 2, rev: 0.2, casing: 0.14, frame: coopMat('paint', '#efece2') };
  // tall brick ground storey (French doors/windows), then two full stucco storeys of grouped casement ribbons + attic
  const wins = [{ ...cas, pattern: [2], h: 2.3, sill: 0.35, w: 0.7 }, { ...cas }, { ...cas, pattern: [2, 3] }, { ...cas, h: 1.2, pattern: [2] }];
  const floors = [1.0, 4.6, 7.8, 10.6, 12.9];
  const hip = (sl, ov = 1.0) => ({ type: 'hip', slope: sl, overhang: ov, mat: RF, fascia: FAS, soffitMat: SOF, fasciaH: 0.28, tails: true, tailMat: FAS, tailSp: 0.7 });
  const main = K.block({ u0: -9.45, u1: 18.53, v0: -7.64, v1: 6.06, floors, wall: ST, wallMats: [BR], trim: TL, wins, bay: 5.0, roof: hip(0.27, 1.0), belts: [4.6], beltMat: TL });
  const west = K.block({ u0: -18.13, u1: -9.45, v0: -7.64, v1: 7.24, floors: [1.0, 4.6, 7.8], wall: ST, wallMats: [BR], trim: TL, wins, bay: 3.2, roof: hip(0.26, 0.9) });
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
  // half-timber accents on the east half of the Bancroft Steps front: broad dark boards in large rectangular panels
  { const R = main.runS; const DK = coopMat('paint', '#2b3a2f');
    const s0 = R.L - 6.6, s1 = R.L - 0.4, y0 = 7.85, y1 = 12.75;
    for (let s = s0; s <= s1 + 0.01; s += 1.2) K.rbox(R, DK, s - 0.1, y0, 0, s + 0.1, y1, 0.07);
    for (const y of [y0 + 0.1, 10.55, y1 - 0.1]) K.rbox(R, DK, s0 - 0.1, y - 0.1, 0, s1 + 0.1, y + 0.1, 0.07); }
  // green pent skirt between the brick storey and the stucco above (front and the west bay)
  for (const R of [main.runS, west.runS]) { K.rbox(R, FAS, -0.2, 4.55, 0, R.L + 0.2, 4.85, 0.5); for (let x = 0.3; x < R.L; x += 0.6) K.rbox(R, FAS, x - 0.07, 4.25, 0, x + 0.07, 4.55, 0.42, { detail: true }); }
  // full-width wrought-iron balcony on deep brackets across the projecting west bay, French door behind it
  { const R = west.runS; const y = 4.85;
    for (const [a0, a1] of [[R.L / 2 - 1.5, R.L / 2 + 1.5]]) { // one short cantilevered balcony on scroll brackets
      K.rbox(R, FAS, a0, y - 0.16, 0, a1, y, 0.85);
      for (const sb of [a0 + 0.3, (a0 + a1) / 2, a1 - 0.3]) K.rbox(R, FAS, sb - 0.08, y - 0.8, 0, sb + 0.08, y - 0.16, 0.75);
      K._rail(R, a0 + 0.05, a1 - 0.05, 0.8, y, M.iron, 1.0);
      K.walkables.push(K.walkRun(R, a0, a1, 0, 0.85, () => y)); } }
  K.chimney(4.0, -3.0, 0.9, 0.8, 16.9, BR);
  return K.done('davis-house');
}
