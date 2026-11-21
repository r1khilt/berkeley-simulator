// 2626 Warring Street. Brown-shingle Berkeley house: dark shingle walls, white sash windows, steep shingle roof.
// Massing: outline raster + hip roofs over the main wings, eave and pitch fitted to the 2021 LiDAR (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { paintTint } from './lib/units-kit.js';

export const info = {
  id: 'residence-hall',
  name: "2626 Warring Street",
  subtitle: "Julia Morgan house",
  blurb: "A large brown-shingle house on Warring Street attributed to Julia Morgan, now used as shared student housing near the Clark Kerr Campus.",
  replaces: ['w/473222491'],
};

const S = {"ang": -5.715, "u0": -8.69, "v0": -6.875, "res": 1.0, "nu": 16, "nv": 15, "lev": [8.2], "grid": "...000000000000.000000000000000.000000000000000..00000000000000..00000000000000..00000000000000....000000000000....000000000000....000000000000....000000000000....000000000000.....00000000000......0000000000......0000000000......0000000000.", "hips": [[-3.69, 6.31, -6.88, 8.12, 0.6], [-5.69, 6.31, -6.88, 4.12, 0.545], [-4.69, 6.31, -6.88, 5.12, 0.545], [-7.69, 6.31, -5.88, -0.88, 1.1]]};

export async function build(ctx) {
  const M = ctx.M; const roof = M.shingle;
  const style = { seed: 'residence-hall', parapet: 0.05, roofMat: roof, ...({ sh: 3.1, win: { w: 0.95, h: 1.55, sill: 0.9, gap: 2.6 }, palette: [Object.assign(M.shingle.clone(), { color: new THREE.Color(0xc89468) })], coping: 0xe9e3d3, frameHex: 0xece6d6, glassHex: 0x3e4a52, baseHex: 0x7d756a, sill: true }),
    extra: (K) => { for (const [u0, u1, v0, v1, sl] of S.hips) K.hip(roof, u0 - 0.6, v0 - 0.6, u1 + 0.6, v1 + 0.6, S.lev[0] - 0.05, sl); } };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'residence-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
