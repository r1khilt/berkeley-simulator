// 2455 Prospect Street. Large Berkeley house: brown shingle walls, white trim, steep shingle roof.
// Massing: outline raster + hip roofs over the main wings, eave and pitch fitted to the 2021 LiDAR (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { paintTint } from './lib/units-kit.js';

export const info = {
  id: 'residence-hall-473223257',
  name: "2455 Prospect Street",
  subtitle: "Student housing",
  blurb: "A large house on Prospect Street near Dwight Way, now rented as shared student rooms.",
  replaces: ['w/473223257'],
};

const S = {"ang": 82.114, "u0": -12.33, "v0": -11.195, "res": 1.0, "nu": 25, "nv": 22, "lev": [13.4], "grid": "0000000000.........0000000000000000.........0000000000000000.........0000000000000000.....00000000000000000000.....00000000000000000000.....00000000000000000000.....00000000000000000000.....00000000000000000000...0000000000000000000000...0000000000000000000000...00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000.....00000000000000000000.....00000000000000000000.....00000000000000000000.....00000000000000000000.....00000000000..............00000000000", "hips": [[2.67, 12.67, -8.2, 10.8, 0.48], [-12.33, -3.33, -11.2, 9.8, 0.333], [-12.33, -2.33, -11.2, 4.8, 0.3], [1.67, 12.67, -3.2, 10.8, 0.492], [6.67, 12.67, -11.2, 10.8, 0.985], [-12.33, 12.67, -0.2, 4.8, 0.96]]};

export async function build(ctx) {
  const M = ctx.M; const roof = M.shingle;
  const style = { seed: 'residence-hall-473223257', parapet: 0.05, roofMat: roof, ...({ sh: 3.1, win: { w: 0.95, h: 1.55, sill: 0.9, gap: 2.6 }, palette: [Object.assign(M.shingle.clone(), { color: new THREE.Color(0xc89468) })], coping: 0xe9e3d3, frameHex: 0xece6d6, glassHex: 0x3e4a52, baseHex: 0x7d756a, sill: true }),
    extra: (K) => { for (const [u0, u1, v0, v1, sl] of S.hips) K.hip(roof, u0 - 0.6, v0 - 0.6, u1 + 0.6, v1 + 0.6, S.lev[0] - 0.05, sl); } };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'residence-hall-473223257';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
