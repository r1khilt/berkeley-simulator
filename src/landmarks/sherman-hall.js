// Sherman Hall, 2250 Prospect Street: a Berkeley Student Cooperative house above the Bancroft Steps, near the stadium.
// Shingle-style house: smooth cream stucco, steep grey-green shingle roofs with front cross-gables (pale board-and-batten in the
// apexes, slim white bargeboards), paired white double-hung sash, a dark belt course over the ground floor (per the BSC house
// photo; the Bancroft Steps run right along the south front). Massing from the 2021 LiDAR (eaves ~12.7 m, ridge ~16.3 m above datum).
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'sherman-hall',
  name: 'Sherman Hall',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A Berkeley Student Cooperative house on Prospect Street beside the Bancroft Steps, a few minutes\' walk from Memorial Stadium.',
  replaces: ['w/185769348'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.2); const M = ctx.M;
  // cream stucco, steep grey-green shingle roofs with slim white bargeboards, white double-hung sash, a dark belt course
  // (pent ledge) over the ground floor, and pale grey-green board-and-batten in the gable apexes
  const ST = coopMat('stucco', '#e8e6dc'), TB = coopMat('paint', '#3a3530'), WH = coopMat('paint', '#f2f0ea'), RF = coopMat('roof', '#7e8a86'), BB = coopMat('paint', '#b8c2ba');
  const dh = { w: 0.85, h: 1.6, sill: 0.85, pattern: [2, 1], gap: 0.12, mull: 0, tran: 0.62, muntins: 1, rev: 0.14, casing: 0.1, frame: WH };
  const gab = (rise, axis, ov = 0.45) => ({ type: 'gable', rise, axis, overhang: ov, overhangGable: 0.35, mat: RF, fascia: WH });
  const fl = [0.9, 3.9, 6.9, 9.9, 13.3];
  const H = K.block({ u0: -4.6, u1: 6.6, v0: -6.14, v1: 6.14, floors: fl, wall: ST, trim: WH, win: dh, bay: 3.4, roof: gab(3.7, 'u'), belts: [3.9], beltMat: TB,
    faces: { S: { doors: [{ s: 5.6, w: 1.3, h: 2.5, door: coopMat('paint', '#4a3a2c'), frame: WH }] } } });
  const Wg = K.block({ u0: -10.6, u1: -4.6, v0: -6.14, v1: 6.14, floors: fl, wall: ST, trim: WH, win: { ...dh, pattern: [2] }, bay: 3.0, roof: gab(4.6, 'v'), belts: [3.9], beltMat: TB });
  const Eg = K.block({ u0: 6.6, u1: 12.54, v0: -6.14, v1: 6.14, floors: fl, wall: ST, trim: WH, win: { ...dh, pattern: [2] }, bay: 3.0, roof: gab(4.4, 'v'), belts: [3.9], beltMat: TB });
  K.block({ u0: -12.54, u1: -10.6, v0: -6.14, v1: 6.14, floors: [0.9, 3.9, 6.9, 9.8], wall: ST, trim: WH, win: { ...dh, pattern: [1] }, bay: 3.0, roof: { type: 'flat', parapet: 0.4, coping: WH, parapetMat: ST } });
  K.buildBlocks();
  // board-and-batten infill in the cross-gable apexes facing the street (south) and north
  const batten = (R, s0, s1, y0, y1) => { K.rbox(R, BB, s0, y0, 0, s1, y1, 0.03); for (let s = s0 + 0.2; s < s1 - 0.1; s += 0.4) K.rbox(R, BB, s - 0.03, y0, 0.03, s + 0.03, y1, 0.06, { detail: true }); K.rbox(R, WH, s0 - 0.1, y0 - 0.12, 0, s1 + 0.1, y0 + 0.05, 0.1); };
  for (const b of [Wg, Eg]) for (const f of ['S', 'N']) { const R = b['run' + f]; batten(R, 1.2, R.L - 1.2, 13.45, 14.9); batten(R, 2.1, R.L - 2.1, 14.9, 16.0); }
  // small hood over the paired gable windows (front)
  for (const b of [Wg, Eg]) { const R = b.runS; K.rbox(R, RF, R.L / 2 - 1.3, 12.45, 0, R.L / 2 + 1.3, 12.6, 0.45); }
  // entry: simple white surround and a little shed hood from the Bancroft Steps
  { const R = H.runS; const sc = 5.6; K.rbox(R, WH, sc - 0.85, 0.5, 0, sc - 0.7, 3.5, 0.08); K.rbox(R, WH, sc + 0.7, 0.5, 0, sc + 0.85, 3.5, 0.08); K.rbox(R, RF, sc - 1.1, 3.55, 0, sc + 1.1, 3.7, 0.8); }
  K.chimney(-1.0, -3.5, 1.0, 0.9, 18.2, ST); K.chimney(11.5, 2.5, 1.0, 0.9, 17.6, ST);
  return K.done('sherman-hall');
}
