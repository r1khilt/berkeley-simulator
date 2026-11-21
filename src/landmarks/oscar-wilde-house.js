// Oscar Wilde House, 2410 Warring Street: the Berkeley Student Cooperative's LGBTQ+ theme house. A three-storey early
// 20th-century shingled house: grey-green painted shingles with white trim, a street-facing front gable with a low pitch over the
// Warring Street front, a three-sided bay window, a covered entry porch with steps, and a flat-roofed rear range.
// Massing from the 2021 LiDAR (front ridge ~12.7 m, rear roof ~11 m above datum).
// (Few published photos exist; the façade treatment is a plausible reconstruction of the period style.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'oscar-wilde-house',
  name: 'Oscar Wilde House',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Oscar Wilde House on Warring Street is the Berkeley Student Cooperative\'s LGBTQ+ theme house.',
  replaces: ['w/185774245'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.1); const M = ctx.M;
  const SH = coopMat('cedar', '#7a8670'), WH = coopMat('paint', '#f1eee6'), RF = coopMat('roof', '#4b4a48'), DR = coopMat('paint', '#7a2f3a');
  const win = { w: 0.85, h: 1.55, sill: 0.85, pattern: [2, 1, 2], gap: 0.1, mull: 0, tran: 0.55, muntins: 1, rev: 0.14, casing: 0.12, frame: WH };
  const floors = [1.2, 4.2, 7.2, 10.2];
  const F = K.block({ u0: -8.16, u1: 6.87, v0: -11.83, v1: -5.47, floors: [1.2, 4.2, 7.2, 10.6], wall: SH, trim: WH, win, bay: 3.0, belts: [4.2, 7.2], beltMat: WH, corners: true,
    roof: { type: 'gable', rise: 2.0, axis: 'u', overhang: 0.7, overhangGable: 0.7, mat: RF, fascia: WH } });
  const B = K.block({ u0: -6.36, u1: 6.87, v0: -5.47, v1: 12.45, floors: [1.0, 4.0, 7.0, 10.4], wall: SH, trim: WH, win, bay: 3.2, belts: [4.0, 7.0], beltMat: WH, corners: true,
    roof: { type: 'flat', parapet: 0, overhang: 0.6, eaveMat: WH, eaveH: 0.3 },
    faces: { W: { doors: [{ s: 3.2, w: 1.1, h: 2.3, door: DR, frame: WH, steps: false }] } } });
  K.buildBlocks();
  // three-sided bay window rising two storeys on the Warring Street gable front (west)
  K.bay(F, 'W', 1.6, 4.8, 0.8, 4.3, 9.9, { win: { ...win, pair: 2 }, wall: SH, roofMat: RF });
  // covered entry porch with steps on the west side of the rear range
  K.porch(B, 'W', 1.2, 6.2, 2.0, 1.0, { postH: 2.5, posts: 3, roof: 'flat', steps: 3.2, stepW: 1.5, postMat: WH });
  // rainbow flag on a short pole by the porch
  { const R = B.runW; K.rbox(R, M.iron, 6.3, 1.0, 1.9, 6.35, 4.6, 1.95, { detail: true }); const cols = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787']; cols.forEach((c, i) => K.rbox(R, coopMat('paint', c, { rough: 0.9 }), 6.35, 4.5 - (i + 1) * 0.15, 1.92, 7.4, 4.5 - i * 0.15, 1.94, { detail: true })); }
  K.chimney(4.0, -8.5, 0.8, 0.7, 13.6, M.brick);
  return K.done('oscar-wilde-house');
}
