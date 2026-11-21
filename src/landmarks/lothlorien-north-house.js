// Lothlorien North House, 2405 Prospect Street: one of the two houses of Lothlorien, the Berkeley Student Cooperative's
// vegetarian house, set in an overgrown garden on the Southside hill. A large brown-shingle house of three storeys over a
// raised basement with a low hipped roof and deep eaves, white-trimmed sash windows, a deep front porch toward the street and a
// one-storey kitchen annex at the back. Massing from the 2021 LiDAR (roof ~12.4 m above datum, annex ~6.5 m).
// (Few published photos exist; plausible period reconstruction.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'lothlorien-north-house',
  name: 'Lothlorien (North House)',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Lothlorien, named after the elven forest in The Lord of the Rings, is a Berkeley Student Cooperative house made up of two houses sharing a garden on Prospect Street.',
  replaces: ['w/185769367'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -6.8); const M = ctx.M;
  const SH = coopMat('cedar', '#5f4a3a'), WH = coopMat('paint', '#ebe5d6'), RF = coopMat('roof', '#57524b'), DK = coopMat('paint', '#3c2d22');
  const win = { w: 0.82, h: 1.55, sill: 0.85, pattern: [2, 1, 2, 2], gap: 0.1, mull: 0, tran: 0.55, muntins: 1, rev: 0.14, casing: 0.12, frame: WH };
  const H = K.block({ u0: -11.63, u1: 9.73, v0: -6.49, v1: 5.02, floors: [1.2, 4.2, 7.2, 10.5], wall: SH, trim: WH, win, bay: 3.2, belts: [4.2, 7.2], beltMat: SH,
    roof: { type: 'hip', slope: 0.3, overhang: 0.9, mat: RF, fascia: DK, soffitMat: DK, tails: true, tailMat: DK },
    faces: { W: { doors: [{ s: 5.7, w: 1.1, h: 2.3, door: coopMat('paint', '#4f6a3a'), frame: WH, steps: false }] } } });
  K.block({ u0: 4.8, u1: 11.41, v0: 2.97, v1: 8.71, floors: [0.9, 4.3, 6.0], wall: SH, trim: WH, win: { ...win, pattern: [2] }, bay: 3.0,
    roof: { type: 'hip', slope: 0.3, overhang: 0.6, mat: RF, fascia: DK, soffitMat: DK } });
  K.buildBlocks();
  K.porch(H, 'W', 0.6, 10.9, 2.6, 1.2, { postH: 2.6, posts: 4, roof: 'shed', roofMat: RF, steps: 5.7, stepW: 1.6, postMat: WH });
  K.chimney(-3.0, 0.0, 1.0, 0.8, 14.6, M.brick);
  return K.done('lothlorien-north-house');
}
