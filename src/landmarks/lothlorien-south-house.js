// Lothlorien South House, 2415 Prospect Street: the second house of Lothlorien, the Berkeley Student Cooperative's vegetarian
// house. A Victorian/Colonial-revival house of three storeys over a raised basement: sage-green painted clapboard with white
// trim and corner boards, a hipped main roof with a front cross gable over a bay window, a turned-post porch and a small rear
// wing, on a site set at an angle to the street grid. Massing from the 2021 LiDAR (roofs ~12.9-13.5 m above datum).
// (Few published photos exist; plausible period reconstruction.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'lothlorien-south-house',
  name: 'Lothlorien (South House)',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'The south house of Lothlorien, a Berkeley Student Cooperative house on Prospect Street named after the elven forest in The Lord of the Rings.',
  replaces: ['w/185769357'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -47.8); const M = ctx.M;
  const CL = coopMat('clap', '#8f9474'), WH = coopMat('paint', '#f0ece2'), RF = coopMat('roof', '#4f4b46');
  const win = { w: 0.85, h: 1.65, sill: 0.8, pattern: [1, 2, 1], gap: 0.12, mull: 0, tran: 0.5, muntins: 0, rev: 0.14, casing: 0.13, frame: WH };
  const A = K.block({ u0: -7.86, u1: 1.47, v0: -8.04, v1: 6.15, floors: [1.3, 4.4, 7.5, 10.6], wall: CL, trim: WH, win, bay: 3.0, corners: true, belts: [4.4, 7.5], beltMat: WH,
    roof: { type: 'hip', slope: 0.5, overhang: 0.55, mat: RF, fascia: WH, soffitMat: WH },
    faces: { W: { doors: [{ s: 7.0, w: 1.0, h: 2.3, door: coopMat('paint', '#7a3b2a'), frame: WH, steps: false }] } } });
  const B = K.block({ u0: 1.47, u1: 6.6, v0: -2.5, v1: 6.15, floors: [1.6, 4.6, 7.6, 11.2], wall: CL, trim: WH, win, bay: 3.0, corners: true, belts: [4.6, 7.6], beltMat: WH,
    roof: { type: 'gable', rise: 2.6, axis: 'v', overhang: 0.5, overhangGable: 0.45, mat: RF, fascia: WH } });
  const B2 = K.block({ u0: 6.6, u1: 9.03, v0: -2.5, v1: 6.15, floors: [1.8, 4.8, 7.6, 8.6], wall: CL, trim: WH, win, bay: 3.0, corners: true, belts: [4.8], beltMat: WH,
    roof: { type: 'hip', slope: 0.4, overhang: 0.45, mat: RF, fascia: WH, soffitMat: WH } });
  K.block({ u0: 9.03, u1: 11.71, v0: 1.35, v1: 3.49, floors: [2.4, 5.4, 7.6], wall: CL, trim: WH, win: { ...win, pattern: [1] }, bay: 2.5, roof: { type: 'flat', parapet: 0.3, coping: WH, parapetMat: CL } });
  K.buildBlocks();
  // turned-post porch across the front of the main block and a bay window under the cross gable
  K.porch(A, 'W', 1.0, 13.2, 2.2, 1.3, { postH: 2.5, posts: 5, roof: 'shed', roofMat: RF, steps: 7.0, stepW: 1.5, postMat: WH });
  K.bay(B2, 'E', 2.4, 6.2, 0.75, 1.9, 7.4, { win: { ...win, pair: 2 }, wall: CL, roofMat: RF });
  // decorative shingles in the cross-gable end (east)
  { const R = B.runS; const SC = coopMat('cedar', '#8f9474'); for (let k = 0; k < 5; k++) { const y = 11.25 + k * 0.45; const w = (2.6 - (y - 11.2)) / 2.6 * (R.L / 2); if (w < 0.3) break; K.rbox(R, SC, R.L / 2 - w, y, 0, R.L / 2 + w, y + 0.45, 0.04, { detail: true }); } }
  K.chimney(-3.0, -1.0, 0.8, 0.7, 15.6, M.brick);
  return K.done('lothlorien-south-house');
}
