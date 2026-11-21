// Kingman Hall, 1730 La Loma Avenue (built as the Theta Xi fraternity house; now a Berkeley Student Cooperative house).
// A tall Arts & Crafts house: cream stucco walls, a steep red-brown roof with its ridge parallel to La Loma, a front-facing cross
// gable at the north end trimmed with thick brick-red bargeboards, small flared dormers, white-trimmed sash windows with window
// boxes, and a vine-covered pergola at the entrance. Massing from the 2021 LiDAR (eaves ~13.6 m, ridge ~18 m above datum); the
// lot climbs ~5 m from the street to the east.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop } from './lib/rn-b-ground.js';

export const info = {
  id: 'kingman-hall',
  name: 'Kingman Hall',
  subtitle: 'Former Theta Xi house',
  blurb: 'Built as the Theta Xi fraternity house and now a Berkeley Student Cooperative house, Kingman Hall is known for its terraced hillside garden amphitheatre and the murals inside.',
  replaces: ['w/68675827'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -7.9); const M = ctx.M;
  const ST = coopMat('stucco', '#efe8d6'), RF = coopMat('roof', '#86493c'), RED = coopMat('paint', '#8e3029'), WH = coopMat('paint', '#f2eee4');
  const win = { w: 1.05, h: 1.7, sill: 0.95, pair: 1, mull: 0, tran: 0.45, muntins: 0, rev: 0.13, casing: 0.11, frame: WH };
  const wins = [{ ...win, pattern: [3, 0, 1, 3], h: 2.0, sill: 0.7, mull: 1, w: 0.8, gap: 0.08 }, { ...win, pattern: [1, 1, 0, 1] }, { ...win, pattern: [1, 0, 1, 1], h: 1.5 }];
  const floors = [1.6, 5.6, 9.6, 13.6];
  const gab = (rise, axis, ov = 0.75) => ({ type: 'gable', rise, axis, overhang: ov, overhangGable: 0.6, mat: RF, fascia: RED });
  const main = K.block({ u0: -7.13, u1: 6.68, v0: -11.93, v1: 10.42, floors, wall: ST, trim: WH, wins, bay: 4.2, roof: gab(4.7, 'v'), belts: [13.25], beltMat: RED,
    faces: { W: { doors: [{ s: 15.5, w: 1.3, h: 2.4, door: coopMat('paint', '#5a3a2a'), frame: WH }] } } });
  const cross = K.block({ u0: -7.13, u1: 1.6, v0: -12.4, v1: -6.0, floors, wall: ST, trim: WH, wins, bay: 2.6, roof: gab(4.2, 'u', 0.8), faces: { W: { cs: [3.2], wins: [{ pair: 3, pattern: null, w: 0.85, gap: 0.08 }, { pair: 2, pattern: null }, { pair: 2, pattern: null, h: 1.4 }] } } });
  K.block({ u0: -7.13, u1: 2.59, v0: -15.38, v1: -12.4, floors: [1.6, 5.6, 9.6, 13.4], wall: ST, trim: WH, wins, bay: 3.0, roof: { type: 'hip', slope: 0.45, overhang: 0.6, mat: RF, fascia: RED, soffitMat: WH } });
  K.block({ u0: -4.44, u1: 6.68, v0: 10.42, v1: 14.75, floors: [2.4, 6.4, 10.4], wall: ST, trim: WH, wins, bay: 3.6, roof: gab(3.2, 'u', 0.6) });
  K.block({ u0: 6.68, u1: 8.32, v0: 2.67, v1: 10.42, floors: [6.2, 9.4, 12.6, 14.2], wall: ST, trim: WH, wins, bay: 2.6, roof: { type: 'flat', parapet: 0.3, coping: RED, parapetMat: ST } });
  K.buildBlocks();
  // small flared gabled dormers on the west slope, south of the cross gable
  for (const s of [9.6, 14.6]) K.dormer(main, 'W', s, 2.6, { h: 1.8, back: 1.1, rise: 1.1, wall: ST, roof: RF, trim: RED, win: { w: 0.62, h: 0.95, sill: 0.3, pair: 2, gap: 0.08, rev: 0.08, casing: 0.06, frame: WH } });
  // shallow entry porch with a flat stucco roof on square piers, vines climbing the piers, steps up from the garden
  { const R = main.runW; const sc = 15.5, VINE = coopMat('paint', '#4f6b3a', { rough: 1 }); const gy = K.gR(R, sc, 3);
    K.rbox(R, ST, sc - 2.3, gy - 0.5, 0, sc + 2.3, 1.6, 2.2); K.walkables.push(K.walkRun(R, sc - 2.3, sc + 2.3, 0, 2.2, () => 1.6));
    for (const s of [sc - 2.1, sc + 1.8]) { K.rbox(R, ST, s, 1.6, 1.75, s + 0.32, 4.2, 2.1); K.rbox(R, VINE, s - 0.05, 1.6, 2.08, s + 0.37, 3.6, 2.2, { detail: true }); }
    K.rbox(R, ST, sc - 2.45, 4.2, -0.02, sc + 2.45, 4.55, 2.3); K.rbox(R, RED, sc - 2.5, 4.55, -0.02, sc + 2.5, 4.65, 2.35);
    const n = Math.max(1, Math.round((1.6 - gy) / 0.17)); for (let k = 0; k < n; k++) { const h = 1.6 - (1.6 - gy) * (k + 1) / n; if (h < gy + 0.02) break; K.rbox(R, M.concrete, sc - 0.9, gy - 0.5, 2.2 + k * 0.3, sc + 0.9, h, 2.5 + k * 0.3); } }
  K.chimney(4.0, 6.5, 1.0, 0.9, 19.9, ST); K.chimney(3.5, -9.0, 1.0, 0.9, 19.4, ST);
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 3, plant: { hedge: true, h: 0.9, depth: 1.0 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('kingman-hall');
}
