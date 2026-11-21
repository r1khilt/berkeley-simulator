// 2399 Prospect Street. Large Berkeley house: painted shingle/clapboard walls, steep shingle roof.
// Massing: outline raster + hip roofs over the main wings, eave and pitch fitted to the 2021 LiDAR (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { paintTint } from './lib/units-kit.js';

export const info = {
  id: 'residence-hall-473598529',
  name: "2399 Prospect Street",
  subtitle: "Student housing",
  blurb: "A large early-1900s house on Prospect Street, south-east of campus, divided into shared student housing.",
  replaces: ['w/473598529'],
};

const S = {"ang": -8.764, "u0": -11.2, "v0": -5.126, "res": 1.0, "nu": 23, "nv": 11, "lev": [12.8], "grid": "0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000.0000000000000000000000........................", "hips": [[-11.2, 10.8, -5.13, 4.87, 0.3]]};

export async function build(ctx) {
  const M = ctx.M; const roof = M.shingle;
  const style = { seed: 'residence-hall-473598529', parapet: 0.05, roofMat: roof, ...({ sh: 3.1, win: { w: 0.95, h: 1.55, sill: 0.9, gap: 2.6 }, palette: [Object.assign(M.shingle.clone(), { color: new THREE.Color(0xc89468) })], coping: 0xe9e3d3, frameHex: 0xece6d6, glassHex: 0x3e4a52, baseHex: 0x7d756a, sill: true }),
    extra: (K) => { for (const [u0, u1, v0, v1, sl] of S.hips) K.hip(roof, u0 - 0.6, v0 - 0.6, u1 + 0.6, v1 + 0.6, S.lev[0] - 0.05, sl); } };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'residence-hall-473598529';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
