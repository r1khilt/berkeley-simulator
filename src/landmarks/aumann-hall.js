// Aumann Hall. Historic two-storey house with steep gabled shingle roof.
// Massing: outline raster + hip roofs over the main wings, eave and pitch fitted to the 2021 LiDAR (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';
import { paintTint } from './lib/units-kit.js';

export const info = {
  id: 'aumann-hall',
  name: "Aumann Hall",
  subtitle: "Lighthaven \u00b7 2740 Telegraph",
  blurb: "The largest building of Lighthaven, the campus at 2740 Telegraph Avenue (formerly the Rose Garden Inn); named after the game theorist Robert Aumann, it holds common space downstairs and seven bedrooms upstairs.",
  replaces: ['w/1354991449'],
};

const S = {"ang": 81.362, "u0": -10.899, "v0": -10.736, "res": 1.0, "nu": 23, "nv": 22, "lev": [5.0], "grid": ".0000000000000000000....0000000000000000000....0000000000000000000....0000000000000000000....0000000000000000000....0000000000000000000....0000000000000000000....0000000000000000000.....000000000000000000.....000000000000000000.....000000000000000000.....000000000000000000000..000000000000000000000..000000000000000000000.0000000000000000000000.000000000000000000000000000000000000000000000000000000000000000000..00000000000000000......000000000000000........0000000.....00................................", "hips": [[-8.9, 9.1, -10.74, 7.26, 0.544], [-8.9, 6.1, -10.74, 8.26, 0.617], [-8.9, 4.1, -10.74, 9.26, 0.712], [-9.9, 9.1, -10.74, -2.74, 1.1], [-8.9, 10.1, 0.26, 7.26, 0.67], [-8.9, 12.1, 0.26, 6.26, 0.8]]};

export async function build(ctx) {
  const M = ctx.M; const roof = M.shingle;
  const style = { seed: 'aumann-hall', parapet: 0.05, roofMat: roof, ...({ sh: 3.1, win: { w: 0.95, h: 1.55, sill: 0.9, gap: 2.6 }, palette: [Object.assign(M.shingle.clone(), { color: new THREE.Color(0xc89468) })], coping: 0xe9e3d3, frameHex: 0xece6d6, glassHex: 0x3e4a52, baseHex: 0x7d756a, sill: true }),
    extra: (K) => { for (const [u0, u1, v0, v1, sl] of S.hips) K.hip(roof, u0 - 0.6, v0 - 0.6, u1 + 0.6, v1 + 0.6, S.lev[0] - 0.05, sl); } };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'aumann-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
