// Mulford Hall (1948), built for the School of Forestry. A U-shaped, four-storey stucco building of two end wings and a
// connecting range, with regular punched windows, a granite-coloured base and red-tile hip roofs; the entrance faces the
// forecourt between the wings. Massing from LiDAR: wing ridges ~21.5 m, eaves ~17.4 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { entry, autoEntries, baseShrubs, lampPost, downspout, faceRun } from './lib/rc-finish.js';
export const info = {
  id: 'mulford-hall', name: 'Mulford Hall', subtitle: '1948 · Forestry',
  blurb: 'Built for the School of Forestry and named for forestry professor Walter Mulford, the hall is known for its interior panelled in many species of wood.',
  replaces: ['w/24024684', 'way/24024684'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  // refine-central: pale smooth moderne stucco, low muted tile hips, string courses, multi-light steel sash, a proper
  // stone-framed forecourt entrance with lettering, more entries where paths arrive, planting, lamps and downspouts.
  const ST = tint(M.stuccoWhite, 0xfcefe6), BASE = tint(M.concrete, 0xd6c8bd), FR = solid(0x3a3f44, 0.45, 0.4), TILE = tint(M.redTile, 0xf2dcd2);
  const allRuns = []; const walkables = [];
  const win = { w: 1.4, h: 2.15, sill: 0.85, mull: 1, tran: 0.68, muntins: 2 };
  const D = { mat: ST, baseMat: BASE, frame: FR, win, bay: 3.2, fl: 1.4, cornice: { P: 0.35, H: 0.45 }, soffit: tint(M.stuccoWhite, 0xefe4dc), beltAt: [1.4, 5.4, 9.4, 13.4], roofMat: TILE, extra: (runs) => allRuns.push(...runs) };
  const lv = [1.4, 5.4, 9.4, 13.4, 17.2];
  const colliders = genParts(K, [
    { poly: rect(-36.2, -18.8, -18.6, 13.6), levels: lv, top: 17.4, roof: 'hip', slope: 0.28, ov: 0.75 },
    { poly: rect(17.1, -19.2, 36.4, 14.0), levels: lv, top: 17.4, roof: 'hip', slope: 0.28, ov: 0.75 },
    { poly: rect(-18.6, -4.2, 17.1, 13.7), levels: lv, top: 17.2, roof: 'hip', slope: 0.26, ov: 0.75,
      extra: (runs) => { // entrance on the north (forecourt) face: stone surround, bronze-framed doors, incised name
        allRuns.push(...runs);
        const R = runs.find((r) => Math.abs(r.t[0] + 1) < 0.1); if (!R) return; const s = R.L / 2;
        const { walk } = entry(K, R, s, Math.max(1.4, K.g(...R.at(s, 2)) + 0.12), { w: 3.2, h: 2.7, transom: 0.8, surround: BASE, surroundW: 0.6, signText: 'MULFORD HALL', signOpts: { bg: '#d9cdc2', fg: '#5d5046', h: 0.42 } });
        if (walk) walkables.push(walk);
      } },
  ], D);
  walkables.push(...autoEntries(K, ctx, allRuns, { y0: 1.4, max: 2, w: 2.2, h: 2.4, surround: BASE, surroundW: 0.35 }));
  for (const side of ['S', 'E', 'W']) { const R = faceRun(allRuns, side); if (!R) continue; baseShrubs(K, R, 1.5, R.L - 1.5, { skip: [[R.L * 0.42, R.L * 0.58]] }); for (const t of [0.5, R.L - 0.5]) downspout(K, R, t, 17.2); }
  { const R = faceRun(allRuns, 'N'); if (R) for (const t of [0.3, 0.7]) { const [u, v] = R.at(R.L * t, 7); lampPost(K, u, v); } }
  const object3d = K.finish(); object3d.name = 'mulford-hall';
  return { object3d, colliders, walkables };
}
