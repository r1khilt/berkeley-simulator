// Hoyt Hall, 2519 Ridge Road: a Berkeley Student Cooperative house on Ridge Road. A long four-storey Mediterranean-revival hall:
// cream stucco walls on a low base, a red clay tile hipped roof with a broad eave, regular bays of multi-pane windows with dark
// green sash, an arched entrance with a small balcony above on Ridge Road. Massing from the 2021 LiDAR (eaves ~12.1 m, ridge
// ~14.3 m above datum). (Few published photos exist; the façade treatment is a plausible reconstruction of the period style.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop } from './lib/rn-b-ground.js';

export const info = {
  id: 'hoyt-hall',
  name: 'Hoyt Hall',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A Berkeley Student Cooperative house on Ridge Road, in the cluster of co-ops on Northside just above campus.',
  replaces: ['w/184877791'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.4); const M = ctx.M;
  const ST = coopMat('stucco', '#ead9b8'), GR = coopMat('paint', '#3b4a3a'), CR = coopMat('paint', '#f0e8d6');
  const win = { glass: M.windowNight, w: 0.95, h: 1.55, sill: 0.85, pair: 2, pattern: [2, 1, 2, 2, 1], gap: 0.14, mull: 1, tran: 0.6, muntins: 1, rev: 0.2, casing: 0.1, frame: GR, casingMat: CR };
  const floors = [0.9, 3.75, 6.6, 9.45, 12.1];
  const roof = { type: 'hip', slope: 0.42, overhang: 0.7, mat: M.redTile, fascia: CR, soffitMat: CR, fasciaH: 0.22 };
  const H = K.block({ u0: -6.86, u1: 6.74, v0: -19.0, v1: 16.32, floors, wall: ST, wallMats: [M.concreteDark, M.concreteDark], trim: GR, win, bay: 3.2, roof,
    faces: { S: { doors: [{ s: 6.8, w: 1.7, h: 2.7, door: coopMat('paint', '#5b3b28'), frame: CR, steps: false }] } } });
  K.block({ u0: 6.74, u1: 7.97, v0: -4.7, v1: 16.32, floors: [0.9, 3.75, 6.6, 9.45, 11.6], wall: ST, trim: GR, win: { ...win, pattern: [1] }, bay: 4.0, roof: { type: 'flat', parapet: 0.4, coping: CR, parapetMat: ST } });
  K.buildBlocks();
  // arched door surround + small iron balcony over the entrance on Ridge Road (south)
  { const R = H.runS; const sc = 6.8; K.rbox(R, CR, sc - 1.2, 0.9, 0, sc - 0.75, 3.9, 0.12); K.rbox(R, CR, sc + 0.75, 0.9, 0, sc + 1.2, 3.9, 0.12); K.rbox(R, CR, sc - 1.25, 3.6, 0, sc + 1.25, 3.95, 0.16);
    // broad entrance stoop with cheek walls and a pair of lanterns (replaces the narrow stair and the token balcony)
    K.walkables.push(...stoop(K, R, sc, 3.2, 0.9, { depth: 1.8, mat: coopMat('stucco', '#d8ccb4'), cheek: ST }).walkables);
    for (const sx of [-1.45, 1.45]) { K.rbox(R, M.darkBronze, sc + sx - 0.1, 2.9, 0.12, sc + sx + 0.1, 3.35, 0.3, { detail: true }); K.rbox(R, M.lampGlow, sc + sx - 0.07, 2.95, 0.3, sc + sx + 0.07, 3.28, 0.34, { detail: true }); } }
  // decorative tile-capped chimneys
  K.chimney(0.0, -10.0, 1.2, 0.8, 16.0, M.brick); K.chimney(0.0, 9.0, 1.2, 0.8, 16.0, M.brick);
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 3, plant: { h: 0.9, depth: 1.2 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('hoyt-hall');
}
