// Mulford Hall (1948), built for the School of Forestry. A U-shaped, four-storey stucco building of two end wings and a
// connecting range, with regular punched windows, a granite-coloured base and red-tile hip roofs; the entrance faces the
// forecourt between the wings. Massing from LiDAR: wing ridges ~21.5 m, eaves ~17.4 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'mulford-hall', name: 'Mulford Hall', subtitle: '1948 · Forestry',
  blurb: 'Built for the School of Forestry and named for forestry professor Walter Mulford, the hall is known for its interior panelled in many species of wood.',
  replaces: ['w/24024684', 'way/24024684'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  const ST = tint(M.stucco, 0xe8dfca), BASE = tint(M.concrete, 0xcec5b0), FR = solid(0x3a3a35, 0.5, 0.4);
  const win = { w: 1.6, h: 2.0, sill: 0.9, mull: 1, tran: 0.65 };
  const D = { mat: ST, baseMat: BASE, frame: FR, win, bay: 3.2, fl: 1.4, cornice: { P: 0.3, H: 0.4 }, soffit: tint(M.woodDark, 0x8a6f52), beltAt: [1.4] };
  const lv = [1.4, 5.4, 9.4, 13.4, 17.2];
  const colliders = genParts(K, [
    { poly: rect(-36.2, -18.8, -18.6, 13.6), levels: lv, top: 17.4, roof: 'hip', slope: 0.45, ov: 0.7 },
    { poly: rect(17.1, -19.2, 36.4, 14.0), levels: lv, top: 17.4, roof: 'hip', slope: 0.45, ov: 0.7 },
    { poly: rect(-18.6, -4.2, 17.1, 13.7), levels: lv, top: 17.2, roof: 'hip', slope: 0.36, ov: 0.6,
      extra: (runs) => { // entrance bay on the north (forecourt) face
        const R = runs.find((r) => Math.abs(r.t[0] + 1) < 0.1); if (!R) return; const s = R.L / 2;
        K.rbox(R, BASE, s - 2.2, 1.4, 0, s + 2.2, 5.0, 0.35); K.rbox(R, M.windowNight, s - 1.4, 1.4, 0.3, s + 1.4, 4.2, 0.38); K.rbox(R, BASE, s - 2.6, 5.0, 0, s + 2.6, 5.4, 1.2);
      } },
  ], D);
  const object3d = K.finish(); object3d.name = 'mulford-hall';
  return { object3d, colliders, walkables: [] };
}
