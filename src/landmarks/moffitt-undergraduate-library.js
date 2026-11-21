// Moffitt Undergraduate Library (Gardner Dailey, 1970; renovated 2016). A big square block of exposed concrete: a heavy
// podium, solid upper walls banded by cantilevered floor-slab edges with narrow deep-set windows, and a top floor set back
// behind a continuous balcony with a concrete balustrade, flat roof. LiDAR: roof ~17.4 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect, flatRoof } from './lib/b02-gen.js';
export const info = {
  id: 'moffitt-undergraduate-library', name: 'Moffitt Undergraduate Library', subtitle: 'Gardner Dailey · 1970',
  blurb: 'The undergraduate library beside Memorial Glade, linked underground to the Main Stacks; its 2016 renovation opened the top floors as a 24-hour study space.',
  replaces: ['w/24025027', 'way/24025027'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const C = tint(M.concrete, 0xbdb9b0), CD = tint(M.concrete, 0x938f87), FR = solid(0x2e3236, 0.4, 0.5);
  const colliders = [];
  const U0 = -30.5, U1 = 30.5, V0 = -23.9, V1 = 23.8; const g0 = Math.min(K.g(U0, V0), K.g(U1, V0), K.g(U0, V1), K.g(U1, V1)) - 1.5;
  // podium: dark recessed glazing behind square columns
  const pod = rect(U0 + 1.2, V0 + 1.2, U1 - 1.2, V1 - 1.2);
  colliders.push(...genParts(K, [{ poly: pod, fl: 0.2, levels: [0.2, 4.2], top: 4.6, mat: CD, baseMat: CD, frame: FR, bay: 2.4, win: { w: 2.2, h: 3.4, sill: 0.2, mull: 1 }, roof: 'none', collide: true }]));
  for (const [a, b] of [[[U0, V1], [U1, V1]], [[U1, V1], [U1, V0]], [[U1, V0], [U0, V0]], [[U0, V0], [U0, V1]]]) { const R = K.run(a, b); for (let s = 3.5; s < R.L - 1; s += 7.6) K.rbox(R, C, s - 0.4, g0, 0.4, s + 0.4, 4.8, 1.2); }
  // solid upper body with slab bands and narrow windows
  colliders.push(...genParts(K, [{ poly: rect(U0, V0, U1, V1), fl: 4.8, levels: [4.8, 8.8, 12.8], top: 13.4, mat: C, baseMat: C, frame: FR, bay: 4.4, depth: 0.6,
    win: { w: 0.9, h: 2.2, sill: 1.0, mull: 0 }, roof: 'none', collide: true,
    extra: (runs) => { for (const R of runs) for (const y of [4.8, 8.8, 12.8]) K.rbox(R, C, -0.6, y - 0.25, 0, R.L + 0.6, y + 0.35, 0.6); } }]));
  K.box(C, U0 - 0.6, 4.4, V0 - 0.6, U1 + 0.6, 4.85, V1 + 0.6);
  // set-back top floor behind a balcony balustrade
  const inset = 2.6; const top = rect(U0 + inset, V0 + inset, U1 - inset, V1 - inset);
  colliders.push(...genParts(K, [{ poly: top, fl: 13.4, levels: [13.4, 16.8], top: 17.1, mat: C, baseMat: C, frame: FR, bay: 3.0, win: { w: 2.6, h: 2.8, sill: 0.15, mull: 1 }, roof: 'flat', parapet: 0.5, collide: true }]));
  K.flat(CD, rect(U0, V0, U1, V1), 13.42, [top]);
  for (const [a, b] of [[[U0, V1], [U1, V1]], [[U1, V1], [U1, V0]], [[U1, V0], [U0, V0]], [[U0, V0], [U0, V1]]]) { const R = K.run(a, b); K.rbox(R, C, -0.3, 13.4, -0.35, R.L + 0.3, 14.5, 0.15); }
  K.box(CD, -8, 17.1, -6, 8, 20.6, 6); K.box(C, -8.2, 20.6, -6.2, 8.2, 20.9, 6.2);
  const object3d = K.finish(); object3d.name = 'moffitt-undergraduate-library';
  return { object3d, colliders, walkables: [] };
}
