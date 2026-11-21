// 2425 Prospect Street. Large Berkeley house: painted walls, white sash windows, steep shingle roof.
// Massing: outline raster + hip roofs over the main wings, eave and pitch fitted to the 2021 LiDAR (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { paintTint } from './lib/units-kit.js';

export const info = {
  id: 'residence-hall-473598588',
  name: "2425 Prospect Street",
  subtitle: "The Prospect \u00b7 student housing",
  blurb: "A large former fraternity-style house on Prospect Street, now a co-living student residence.",
  replaces: ['w/473598588'],
};

const S = {"ang": -8.326, "u0": -20.313, "v0": -14.742, "res": 1.0, "nu": 39, "nv": 28, "lev": [14.1], "grid": "...............................000000.................................000000............................0000000000000..........................0000000000000..........................0000000000000...000000000000...........00000000000000000000000000000..........00000000000000000000000000000..........00000000000000000000000000000....00...000000000000000000000000000000000000...00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000.00000000000000000000000000000000000000.00000000000000000000000000000000000000.000000000000000.........000000000000000000000000000000.........000000000000000000000000000000.........0000000000000.0000000000000000.........0000000000000.0000000000000000..........000000000000.0000000000000000..........000000000000.0000000000000000.........0000000000000.........00000............0000000000000.........00000..........................", "hips": [[-19.31, 18.69, -4.74, 4.26, 0.422], [-19.31, -4.31, -8.74, 11.26, 0.3], [5.69, 17.69, -12.74, 12.26, 0.3], [-20.31, 18.69, -4.74, 2.26, 0.607], [-17.31, -5.31, -9.74, 11.26, 0.3], [5.69, 18.69, -12.74, 6.26, 0.3], [-19.31, 1.69, -5.74, 4.26, 0.46], [4.69, 17.69, -6.74, 8.26, 0.3]]};

export async function build(ctx) {
  const M = ctx.M; const roof = M.shingle;
  const style = { seed: 'residence-hall-473598588', parapet: 0.05, roofMat: roof, ...({ sh: 3.1, win: { w: 0.95, h: 1.55, sill: 0.9, gap: 2.6 }, palette: [Object.assign(M.shingle.clone(), { color: new THREE.Color(0xc89468) })], coping: 0xe9e3d3, frameHex: 0xece6d6, glassHex: 0x3e4a52, baseHex: 0x7d756a, sill: true }),
    extra: (K) => { for (const [u0, u1, v0, v1, sl] of S.hips) K.hip(roof, u0 - 0.6, v0 - 0.6, u1 + 0.6, v1 + 0.6, S.lev[0] - 0.05, sl); } };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'residence-hall-473598588';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
