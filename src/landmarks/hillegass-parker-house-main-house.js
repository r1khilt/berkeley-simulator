// Hillegass-Parker House (main house), 2545 Hillegass Avenue: a Berkeley Student Cooperative house on the Southside.
// A big two-storey brown-shingle Craftsman house over a raised basement: low hipped roofs with deep eaves and exposed rafter
// tails, white-trimmed sash windows in pairs, a broad front porch on Hillegass Avenue, a side bay and a clinker-brick chimney.
// Massing from the 2021 LiDAR (roofs ~10.4-11.4 m above datum). (Few published photos exist; plausible period reconstruction.)
import * as THREE from 'three';
import { shingleMat } from './lib/rsw-site.js';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'hillegass-parker-house-main-house',
  name: 'Hillegass-Parker House',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Hillegass-Parker House, at the corner of Hillegass Avenue and Parker Street, is one of the Berkeley Student Cooperative\'s Southside houses.',
  replaces: ['w/185773041'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -3.9); const M = ctx.M;
  const SH = shingleMat(ctx.M, 0x4d3f33), WH = coopMat('paint', '#ece7da'), RF = coopMat('roof', '#4e4943'), DK = coopMat('paint', '#3a2b21');
  const win = { glass: ctx.M.windowNight, w: 0.85, h: 1.6, sill: 0.85, pattern: [2, 2, 1, 2], gap: 0.1, mull: 0, tran: 0.55, muntins: 1, rev: 0.14, casing: 0.12, frame: WH };
  const floors = [1.4, 4.9, 8.4, 9.9];
  const hip = (sl) => ({ type: 'hip', slope: sl, overhang: 0.9, mat: RF, fascia: DK, soffitMat: DK, tails: true, tailMat: DK });
  const H = K.block({ u0: -12.44, u1: 3.87, v0: -6.27, v1: 6.31, floors, wall: SH, trim: WH, win, bay: 3.2, belts: [4.9], beltMat: WH, roof: hip(0.22),
    faces: { W: { doors: [{ s: 6.3, w: 1.1, h: 2.3, door: coopMat('paint', '#6b4a30'), frame: WH, steps: false }] } } });
  K.block({ u0: 3.87, u1: 9.33, v0: -3.83, v1: 3.91, floors: [1.4, 4.9, 8.4, 9.8], wall: SH, trim: WH, win, bay: 3.0, roof: hip(0.2) });
  K.block({ u0: 9.33, u1: 13.93, v0: -6.27, v1: 3.91, floors: [1.6, 5.0, 8.4, 9.8], wall: SH, trim: WH, win, bay: 3.0, roof: hip(0.2) });
  K.block({ u0: 3.87, u1: 7.9, v0: 3.91, v1: 6.31, floors: [1.4, 4.9, 8.4, 9.8], wall: SH, trim: WH, win: { glass: ctx.M.windowNight, ...win, pattern: [1] }, bay: 3.0, roof: hip(0.2) });
  K.buildBlocks();
  // broad front porch on Hillegass Avenue (west), with steps
  K.porch(H, 'W', 1.0, 11.6, 2.6, 1.4, { postH: 2.6, posts: 4, roof: 'shed', roofMat: RF, steps: 6.3, stepW: 1.8, postMat: WH });
  K.bay(H, 'N', 3.0, 6.4, 0.8, 1.6, 7.9, { win: { glass: ctx.M.windowNight, ...win, pair: 2 }, wall: SH, roofMat: RF });
  K.chimney(-4.0, 6.6, 1.1, 0.8, 12.6, M.brick);
  return K.done('hillegass-parker-house-main-house');
}
