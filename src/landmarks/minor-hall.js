// Minor Hall (1941), home of the Herbert Wertheim School of Optometry: a long four-storey cream stucco block under a red-tile
// hip roof, with a strict grid of identical punched windows and the entrance centred on the north end under a small
// balustraded balcony. Massing from LiDAR: eaves ~17 m, ridge ~22.5 m.
import * as THREE from 'three';
import { Kit, punchedBlock, entrance, colFromXZ, tint } from './lib/b04-kit.js';
import { balustrade } from './lib/classic-kit.js';

export const info = {
  id: 'minor-hall',
  name: 'Minor Hall',
  subtitle: 'School of Optometry · 1941',
  blurb: 'Home of Berkeley\'s Herbert Wertheim School of Optometry and Vision Science. The building is named for Ralph S. Minor, a physicist who helped found optometry instruction at Berkeley.',
  replaces: ['w/24024672'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.3)); const M = ctx.M;
  const C = tint(M, 'stucco', 0xece3cf), Cb = tint(M, 'stucco', 0xd3c9b2);
  const colliders = [], walkables = [];
  const u0 = -9.1, u1 = 9.2, v0 = -31.0, v1 = 31.1, eave = 16.4;
  const rows = [{ y0: 0.9, h: 2.5, w: 1.3, mull: 1, tran: 0.7, muntins: 2 }, { y0: 4.9, h: 2.3, w: 1.3, mull: 1, tran: 0.7, muntins: 2 }, { y0: 8.8, h: 2.3, w: 1.3, mull: 1, tran: 0.7, muntins: 2 }, { y0: 12.6, h: 2.2, w: 1.3, mull: 1, muntins: 2 }];
  const runs = punchedBlock(K, u0, v0, u1, v1, { y0: -2.5, eave, mat: C, frame: M.whitePaint, bay: 3.2, rows, plinth: { h: 0.6, mat: Cb }, cornice: { P: 0.45, H: 0.5, mat: C }, roof: { type: 'hip', slope: 0.58, overhang: 0.6 }, faces: { N: { nb: 3, skip: [1] } } });
  // entrance on the north end with the small balustraded balcony above
  const R = runs.N; const s = R.L / 2; const gy = Math.max(-0.3, K.g(...R.at(s, 2)));
  entrance(K, R, s, Math.max(0, gy) + 0.3, { w: 2.6, h: 3.2, rec: 0.35, surround: C, frame: M.darkBronze });
  K.rbox(R, C, s - 1.7, 4.0, 0, s + 1.7, 4.3, 1.3);
  balustrade(K, R, C, s - 1.6, s + 1.6, 4.3, 0.95, { d: 1.15, pitch: 0.3 });
  K.rbox(R, M.windowNight, s - 0.75, 4.35, -0.3, s + 0.75, 7.0, -0.25);
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 23));
  const object3d = K.finish(); object3d.name = 'minor-hall';
  return { object3d, colliders, walkables };
}
