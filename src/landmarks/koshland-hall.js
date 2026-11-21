// Koshland Hall (1991), a five-storey laboratory building for the College of Natural Resources designed to match the
// agricultural group: cream stucco over a darker base, regular windows, and red-tile hip roofs over a cross-shaped plan.
// Massing from LiDAR: end pavilions ridge ~26 m, central range ~23 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'koshland-hall', name: 'Koshland Hall', subtitle: '1991 · Plant & microbial biology',
  blurb: 'Named for biochemist Daniel E. Koshland Jr., this laboratory building takes its stucco walls and red tile roofs from the neighbouring agricultural halls.',
  replaces: ['w/24024682', 'way/24024682'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.5)); const M = ctx.M;
  const ST = tint(M.stucco, 0xeae1cc), BASE = tint(M.concrete, 0xc8bda8), FR = solid(0x34403c, 0.5, 0.3);
  const lv = [1.6, 5.4, 9.2, 13.0, 16.8, 19.6];
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.6, levels: lv, top: 19.8, bay: 3.2, beltAt: [1.6, 5.4], cornice: { P: 0.35, H: 0.45 }, soffit: tint(M.woodDark, 0x8a6f52),
    winFn: (k) => (k === 4 ? { w: 1.3, h: 1.5, sill: 0.6, mull: 1 } : { w: 1.5, h: 2.1, sill: 0.9, mull: 1, tran: 0.68 }) };
  const colliders = genParts(K, [
    { poly: rect(-15.7, -28.4, 15.0, -14.0), roof: 'hip', slope: 0.48, ov: 0.7 },
    { poly: rect(-15.6, 14.0, 14.8, 28.2), roof: 'hip', slope: 0.48, ov: 0.7 },
    { poly: rect(-24.8, -14.0, 24.6, 14.0), top: 19.6, roof: 'hip', slope: 0.3, ov: 0.7 },
  ], D);
  const object3d = K.finish(); object3d.name = 'koshland-hall';
  return { object3d, colliders, walkables: [] };
}
