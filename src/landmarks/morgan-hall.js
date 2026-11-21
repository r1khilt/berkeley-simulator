// Morgan Hall (1953), home of nutritional sciences on the west side of the agricultural group. Four-storey cream stucco
// wings with regular punched steel windows under red-tile hip roofs (matching Giannini, Hilgard and Mulford), with a low
// flat-roofed wing to the south. Massing from LiDAR: main wing ridge ~21.5 m, north-east wing ~18.5 m, south wing ~9 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { autoEntries, baseShrubs, lampPost, downspout, faceRun } from './lib/rc-finish.js';
export const info = {
  id: 'morgan-hall', name: 'Morgan Hall', subtitle: '1953 · Nutritional Sciences',
  blurb: 'Morgan Hall houses the Department of Nutritional Sciences and Toxicology; its stucco walls and red tile roofs echo the older agricultural buildings around it.',
  replaces: ['w/24024680', 'way/24024680'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  // refine-central: smooth warm stucco, string courses, lower muted tile hips, paired multi-light steel sash, real entries.
  const ST = tint(M.stuccoWhite, 0xf3e2d8), BASE = tint(M.concrete, 0xc9b2a6), FR = solid(0x3e4a44, 0.45, 0.4), TILE = tint(M.redTile, 0xf2ddd2);
  const allRuns = [];
  const win = { w: 1.5, h: 2.2, sill: 0.85, mull: 1, tran: 0.66, muntins: 2 };
  const D = { mat: ST, baseMat: BASE, frame: FR, win, bay: 3.4, fl: 1.2, cornice: { P: 0.32, H: 0.4 }, soffit: tint(M.stuccoWhite, 0xe8d6cc), roofMat: TILE, extra: (runs) => allRuns.push(...runs) };
  const colliders = genParts(K, [
    { poly: rect(-12.8, -29.7, 6.0, 31.0), levels: [1.2, 5.3, 9.4, 13.5, 17.6], top: 18.0, roof: 'hip', slope: 0.3, ov: 0.75, beltAt: [1.2, 5.3, 9.4, 13.5] },
    { poly: rect(6.0, -29.5, 20.0, -12.8), levels: [1.2, 4.9, 8.6, 12.3, 15.4], top: 15.6, roof: 'hip', slope: 0.3, ov: 0.75, beltAt: [1.2, 4.9, 8.6, 12.3] },
    { poly: [[6.0, 14.7], [10.5, 14.7], [10.4, 36.2], [-3.7, 36.2], [-3.7, 31.0], [6.0, 31.0]], levels: [1.2, 4.9, 8.6], top: 8.8, roof: 'flat', parapet: 0.5, cornice: false, win: { w: 2.2, h: 1.9, sill: 0.9, mull: 2 } },
  ], D);
  const walkables = autoEntries(K, ctx, allRuns, { y0: 1.2, max: 3, w: 2.4, h: 2.4, surround: BASE, surroundW: 0.35 });
  for (const side of ['S', 'W', 'E']) { const R = faceRun(allRuns, side); if (!R) continue; baseShrubs(K, R, 1.5, R.L - 1.5, { skip: [[R.L * 0.4, R.L * 0.6]] }); for (const t of [0.5, R.L - 0.5]) downspout(K, R, t, 17.6); }
  { const R = faceRun(allRuns, 'S'); if (R) for (const t of [0.2, 0.8]) { const [u, v] = R.at(R.L * t, 5); lampPost(K, u, v); } }
  const object3d = K.finish(); object3d.name = 'morgan-hall';
  return { object3d, colliders, walkables };
}
