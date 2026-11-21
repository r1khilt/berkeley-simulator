// Kidd Hall, 2562 Le Conte Avenue: a small Berkeley Student Cooperative house on Northside. A Craftsman brown-shingle house of two
// storeys over a raised basement: low hipped roof with deep eaves and exposed rafter tails, a gabled front dormer, white-trimmed
// multi-pane sash windows in pairs and threes, a full-width front porch with tapered posts on Le Conte Avenue and a clinker-brick
// chimney. Massing from the 2021 LiDAR (eaves ~7.7 m, ridge ~9.7 m above datum).
// (Few published photos exist; the façade treatment is a plausible reconstruction of the Northside Craftsman style.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop, shingleMat } from './lib/rn-b-ground.js';

export const info = {
  id: 'kidd-hall',
  name: 'Kidd Hall',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'One of the Berkeley Student Cooperative\'s smaller houses, on Le Conte Avenue on Northside.',
  replaces: ['w/184879785'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.1); const M = ctx.M;
  const SH = shingleMat('kidd', { base: 0x5e4836 }), WH = coopMat('paint', '#ece6d6'), RF = coopMat('roof', '#4f4a44'), DK = coopMat('paint', '#3b2c22');
  const win = { w: 0.8, h: 1.45, sill: 0.85, pattern: [2, 3, 2], gap: 0.1, mull: 0, tran: 0.55, muntins: 1, rev: 0.14, casing: 0.11, frame: WH };
  const H = K.block({ u0: -6.45, u1: 6.46, v0: -8.27, v1: 8.27, floors: [2.4, 5.2, 8.0], wall: SH, trim: WH, win, bay: 3.2, belts: [5.2], beltMat: WH,
    wins: [win, { ...win, pattern: [2, 1, 2] }],
    roof: { type: 'hip', slope: 0.26, overhang: 0.85, mat: RF, fascia: DK, soffitMat: DK, tails: true, tailMat: DK },
    faces: { N: { doors: [{ s: 4.4, w: 1.0, h: 2.2, y: 2.5, door: coopMat('paint', '#6a4a30'), frame: WH, steps: false }] } } });
  K.buildBlocks();
  // full-width front porch on Le Conte Avenue (north)
  K.porch(H, 'N', 0.4, 12.5, 2.4, 2.5, { postH: 2.5, posts: 4, roof: 'shed', roofMat: RF, steps: 4.4, stepW: 1.6, postMat: WH });
  K.dormer(H, 'N', 8.0, 2.2, { h: 0.9, back: 0.9, rise: 0.5, wall: SH, roof: RF, trim: WH, win: { w: 0.6, h: 0.8, sill: 0.25, pair: 2, gap: 0.08, rev: 0.08, casing: 0.06, frame: WH } });
  K.chimney(6.75, 3.0, 1.0, 0.7, 10.8, M.brick);
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 2, plant: { hedge: true, h: 0.85, depth: 1.0 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('kidd-hall');
}
