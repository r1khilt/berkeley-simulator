// Morgan Hall (1953), home of nutritional sciences on the west side of the agricultural group. Four-storey cream stucco
// wings with regular punched steel windows under red-tile hip roofs (matching Giannini, Hilgard and Mulford), with a low
// flat-roofed wing to the south. Massing from LiDAR: main wing ridge ~21.5 m, north-east wing ~18.5 m, south wing ~9 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'morgan-hall', name: 'Morgan Hall', subtitle: '1953 · Nutritional Sciences',
  blurb: 'Morgan Hall houses the Department of Nutritional Sciences and Toxicology; its stucco walls and red tile roofs echo the older agricultural buildings around it.',
  replaces: ['w/24024680', 'way/24024680'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  const ST = tint(M.stucco, 0xe9e0cb), BASE = tint(M.concrete, 0xcfc6b2), FR = solid(0x3b3a36, 0.5, 0.4);
  const win = { w: 1.7, h: 1.85, sill: 0.95, mull: 2, tran: 0.62 };
  const D = { mat: ST, baseMat: BASE, frame: FR, win, bay: 3.3, fl: 1.2, cornice: { P: 0.25, H: 0.35 }, soffit: tint(M.woodDark, 0x8a6f52) };
  const colliders = genParts(K, [
    { poly: rect(-12.8, -29.7, 6.0, 31.0), levels: [1.2, 5.3, 9.4, 13.5, 17.6], top: 18.0, roof: 'hip', slope: 0.38, ov: 0.7, beltAt: [1.2] },
    { poly: rect(6.0, -29.5, 20.0, -12.8), levels: [1.2, 4.9, 8.6, 12.3, 15.4], top: 15.6, roof: 'hip', slope: 0.36, ov: 0.7, beltAt: [1.2] },
    { poly: [[6.0, 14.7], [10.5, 14.7], [10.4, 36.2], [-3.7, 36.2], [-3.7, 31.0], [6.0, 31.0]], levels: [1.2, 4.9, 8.6], top: 8.8, roof: 'flat', parapet: 0.5, cornice: false, win: { w: 2.2, h: 1.9, sill: 0.9, mull: 2 } },
  ], D);
  const object3d = K.finish(); object3d.name = 'morgan-hall';
  return { object3d, colliders, walkables: [] };
}
