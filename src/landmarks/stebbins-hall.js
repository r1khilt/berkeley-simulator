// Stebbins Hall, 2527 Ridge Road: a Berkeley Student Cooperative house on Northside's Ridge Road. A compact four-storey
// flat-roofed block: smooth light stucco, horizontal bands of aluminium windows, a thin projecting roof slab, a glazed entry with
// a canopy facing Ridge Road and an open stair on the side. Massing from the 2021 LiDAR (flat roof ~12.6 m above datum).
// (Few published photos exist; the façade treatment is a plausible reconstruction consistent with the LiDAR massing.)
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'stebbins-hall',
  name: 'Stebbins Hall',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A four-storey Berkeley Student Cooperative house on Ridge Road, one of several co-ops clustered on Northside just above campus.',
  replaces: ['w/184876625'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -10.1); const M = ctx.M;
  const ST = coopMat('stucco', '#e8e4da'), AC = coopMat('stucco', '#8f9a8c'), FR = coopMat('metal', '#9ea3a6'), DK = coopMat('paint', '#3c4146');
  const win = { w: 1.1, h: 1.25, sill: 0.95, pattern: [3, 2, 3, 2], gap: 0.06, mull: 1, tran: 0, rev: 0.16, casing: 0, frame: FR };
  const floors = [0.6, 3.6, 6.6, 9.6, 12.4];
  const N = K.block({ u0: -9.83, u1: 9.69, v0: -12.41, v1: -1.2, floors, wall: ST, wallMats: [M.concreteDark, M.concreteDark], trim: FR, win, bay: 3.3, depth: 0.3,
    roof: { type: 'flat', parapet: 0, overhang: 0.6, eaveMat: DK, eaveH: 0.3 } });
  const S = K.block({ u0: -1.6, u1: 9.69, v0: -1.2, v1: 12.59, floors, wall: ST, wallMats: [M.concreteDark, M.concreteDark], trim: FR, win, bay: 3.3, depth: 0.3,
    roof: { type: 'flat', parapet: 0, overhang: 0.6, eaveMat: DK, eaveH: 0.3 },
    faces: { S: { doors: [{ s: 5.6, w: 2.2, h: 2.6, door: FR, leaf: 2.5, frame: FR, landing: 1.8 }] } } });
  const L = K.block({ u0: -9.83, u1: -1.6, v0: -1.2, v1: 12.59, floors: [0.4, 4.0], wall: ST, wallMats: [M.concreteDark, M.concreteDark], trim: FR, bay: 2.8, depth: 0.3,
    win: { w: 1.6, h: 1.9, sill: 0.6, pattern: [2, 2, 2], gap: 0.08, mull: 1, rev: 0.16, casing: 0, frame: FR },
    roof: { type: 'flat', parapet: 0.9, coping: DK, parapetMat: ST } });
  K.buildBlocks();
  // coloured stucco panels framing the window bands on the Ridge Road (south) front
  { const R = S.runS; for (const [a, z] of [[R.L - 3.6, R.L - 0.4]]) K.rbox(R, AC, a, 3.6, 0, z, 12.35, 0.06); }
  // entry canopy
  { const R = S.runS; K.rbox(R, DK, 3.6, 3.25, 0, 7.6, 3.45, 2.2); for (const s of [3.8, 7.4]) K.rbox(R, M.iron, s - 0.05, 0.4, 2.0, s + 0.05, 3.25, 2.1, { detail: true }); }
  // open stair with landings on the east side
  { const R = N.runE; const FE = M.iron; for (const y of [3.6, 6.6, 9.6]) { K.rbox(R, M.concrete, 2.0, y - 0.18, 0, 6.0, y, 1.4); K._rail(R, 2.0, 6.0, 1.35, y, FE, 1.05); } }
  // roof terrace railing on the one-storey wing
  K._rail(L.runS, 0.3, L.runS.L - 0.3, -0.2, 4.9, M.iron, 0.9);
  // rooftop mechanical penthouse
  K.box(ST, -3, 12.7, -4, 2, 14.6, 1); K.box(DK, -3.2, 14.6, -4.2, 2.2, 14.8, 1.2);
  return K.done('stebbins-hall');
}
