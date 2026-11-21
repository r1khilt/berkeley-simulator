// Genetics and Plant Biology Building (1990). A two-storey cream stucco laboratory with regular windows and low red-tile
// hip roofs, a long central block with lower wings to the east and west. LiDAR: eaves ~9.5 m, ridges ~13-15 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'genetics-and-plant-biology', name: 'Genetics and Plant Biology', subtitle: '1990 · Plant & microbial biology',
  blurb: 'A low stucco and red-tile laboratory building at the north-west corner of campus, used for plant and microbial biology research.',
  replaces: ['w/24024685', 'way/24024685'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4)); const M = ctx.M;
  const ST = tint(M.stucco, 0xeae1cc), BASE = tint(M.concrete, 0xc8bda8), FR = solid(0x34403c, 0.5, 0.3);
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.0, bay: 3.3, cornice: { P: 0.3, H: 0.35 }, soffit: tint(M.woodDark, 0x8a6f52), beltAt: [1.0],
    win: { w: 1.6, h: 2.0, sill: 0.9, mull: 1, tran: 0.66 } };
  const colliders = genParts(K, [
    { poly: rect(-16.0, -15.8, 15.5, 12.6), levels: [1.0, 5.6, 10.2], top: 10.9, roof: 'hip', slope: 0.46, ov: 0.7 },
    { poly: rect(15.4, -0.9, 24.4, 12.6), levels: [1.0, 5.6, 10.0], top: 10.4, roof: 'hip', slope: 0.36, ov: 0.6 },
    { poly: rect(-25.0, 0.2, -15.6, 12.6), levels: [1.0, 5.6, 10.0], top: 10.4, roof: 'hip', slope: 0.34, ov: 0.6 },
  ], D);
  const object3d = K.finish(); object3d.name = 'genetics-and-plant-biology';
  return { object3d, colliders, walkables: [] };
}
