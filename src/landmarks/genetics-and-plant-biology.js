// Genetics and Plant Biology Building (1990). A two-storey cream stucco laboratory with regular windows and low red-tile
// hip roofs, a long central block with lower wings to the east and west. LiDAR: eaves ~9.5 m, ridges ~13-15 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { autoEntries, baseShrubs, lampPost, downspout, bikeRack, faceRun } from './lib/rc-finish.js';
export const info = {
  id: 'genetics-and-plant-biology', name: 'Genetics and Plant Biology', subtitle: '1990 · Plant & microbial biology',
  blurb: 'A low stucco and red-tile laboratory building at the north-west corner of campus, used for plant and microbial biology research.',
  replaces: ['w/24024685', 'way/24024685'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4)); const M = ctx.M;
  // refine-central: smooth off-white precast/stucco with scored joints, lower tile hips, larger teal-framed windows,
  // entrances where the paths arrive, foundation planting, lamps and bike racks.
  const ST = tint(M.stuccoWhite, 0xfcf8ee), BASE = tint(M.concrete, 0xd6cfc0), FR = solid(0x2f5a55, 0.45, 0.3), TILE = tint(M.redTile, 0xf6e2d8);
  const allRuns = [];
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.0, bay: 3.0, cornice: { P: 0.3, H: 0.35 }, soffit: tint(M.whitePaint, 0xf2f0ea), beltAt: [1.0, 5.6], roofMat: TILE,
    win: { w: 1.3, h: 2.2, sill: 0.85, mull: 1, tran: 0.7, muntins: 2 }, extra: (runs) => allRuns.push(...runs) };
  const colliders = genParts(K, [
    { poly: rect(-16.0, -15.8, 15.5, 12.6), levels: [1.0, 5.6, 10.2], top: 10.9, roof: 'hip', slope: 0.36, ov: 0.8 },
    { poly: rect(15.4, -0.9, 24.4, 12.6), levels: [1.0, 5.6, 10.0], top: 10.4, roof: 'hip', slope: 0.32, ov: 0.8 },
    { poly: rect(-25.0, 0.2, -15.6, 12.6), levels: [1.0, 5.6, 10.0], top: 10.4, roof: 'hip', slope: 0.32, ov: 0.8 },
  ], D);
  const walkables = autoEntries(K, ctx, allRuns, { y0: 1.0, max: 3, w: 2.2, h: 2.4, surround: BASE, surroundW: 0.35, canopy: tint(M.concrete, 0xe8e4da), canopyD: 1.4 });
  const S = faceRun(allRuns, 'S'); if (S) { baseShrubs(K, S, 1.5, S.L - 1.5, { skip: [[S.L * 0.3, S.L * 0.7]] }); for (const t of [0.15, 0.85]) { const [u, v] = S.at(S.L * t, 5); lampPost(K, u, v); } const [u, v] = S.at(S.L * 0.4, 3.5); bikeRack(K, u, v, Math.atan2(S.t[1], S.t[0]), 5); for (const t of [0.5, S.L - 0.5]) downspout(K, S, t, 10.7); }
  const object3d = K.finish(); object3d.name = 'genetics-and-plant-biology';
  return { object3d, colliders, walkables };
}
