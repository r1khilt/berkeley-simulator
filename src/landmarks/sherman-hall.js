// Sherman Hall, 2250 Prospect Street: a Berkeley Student Cooperative house above the Bancroft Steps, near the stadium. A tall
// Tudor-revival hall: cream stucco with dark half-timbering in steep gable ends, a steep dark roof with cross gables, leaded
// multi-pane casements in groups, a brick ground storey and an arched entry from the Bancroft Steps. Massing from the 2021 LiDAR
// (eaves ~12.7 m, ridge ~16.3 m above datum). (Few published photos exist; the treatment is a plausible reconstruction.)
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
  const ST = coopMat('stucco', '#e8e0cc'), TB = coopMat('paint', '#3e2e22'), RF = coopMat('roof', '#4a4a48'), BR = M.brick;
  const cas = { w: 0.6, h: 1.5, sill: 0.85, pattern: [3, 2, 3], gap: 0.08, mull: 0, tran: 0.7, muntins: 2, rev: 0.14, casing: 0.1, frame: TB };
  const floors = [0.9, 3.9, 6.9, 9.9, 12.7];
  const gab = (rise, axis, ov = 0.6) => ({ type: 'gable', rise, axis, overhang: ov, overhangGable: 0.5, mat: RF, fascia: TB });
  const H = K.block({ u0: -4.6, u1: 6.6, v0: -6.14, v1: 6.14, floors: [0.9, 3.9, 6.9, 9.9, 13.3], wall: ST, wallMats: [BR, BR], trim: TB, win: cas, bay: 3.4, roof: gab(3.7, 'u'), belts: [3.9], beltMat: TB,
    faces: { S: { doors: [{ s: 5.6, w: 1.4, h: 2.6, door: coopMat('paint', '#5a3a26'), frame: TB }] } } });
  const Wg = K.block({ u0: -10.6, u1: -4.6, v0: -6.14, v1: 6.14, floors: [0.9, 3.9, 6.9, 9.9, 13.3], wall: ST, wallMats: [BR, BR], trim: TB, win: cas, bay: 3.0, roof: gab(4.2, 'v'), belts: [3.9], beltMat: TB });
  const Eg = K.block({ u0: 6.6, u1: 12.54, v0: -6.14, v1: 6.14, floors: [0.9, 3.9, 6.9, 9.9, 13.3], wall: ST, wallMats: [BR, BR], trim: TB, win: cas, bay: 3.0, roof: gab(4.0, 'v'), belts: [3.9], beltMat: TB });
  K.block({ u0: -12.54, u1: -10.6, v0: -6.14, v1: 6.14, floors: [0.9, 3.9, 6.9, 9.8], wall: ST, wallMats: [BR, BR], trim: TB, win: { ...cas, pattern: [2] }, bay: 3.0, roof: { type: 'flat', parapet: 0.4, coping: TB, parapetMat: ST } });
  K.buildBlocks();
  // half-timbering in the wing gable ends facing the Bancroft Steps (south) and north
  const timber = (R, s0, s1, y0, y1, step = 0.9) => { for (let s = s0; s <= s1 + 0.01; s += step) K.rbox(R, TB, s - 0.07, y0, 0, s + 0.07, y1, 0.05, { detail: true }); K.rbox(R, TB, s0 - 0.1, y0, 0, s1 + 0.1, y0 + 0.16, 0.05); };
  for (const b of [Wg, Eg]) for (const f of ['S', 'N']) { const R = b['run' + f]; timber(R, 0.8, R.L - 0.8, 13.35, 14.9, 0.9); timber(R, 2.0, R.L - 2.0, 14.9, 16.2, 0.9); }
  // arched brick entry surround from the Bancroft Steps
  { const R = H.runS; const sc = 5.6; K.rbox(R, BR, sc - 1.3, 0.5, 0, sc - 0.75, 3.7, 0.25); K.rbox(R, BR, sc + 0.75, 0.5, 0, sc + 1.3, 3.7, 0.25); K.rbox(R, BR, sc - 1.3, 3.5, 0, sc + 1.3, 3.9, 0.3); }
  K.chimney(-1.0, -3.5, 1.0, 0.9, 18.2, BR); K.chimney(11.5, 2.5, 1.0, 0.9, 17.6, BR);
  return K.done('sherman-hall');
}
