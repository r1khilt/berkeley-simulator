// Barker Hall (1964), a seven-storey concrete laboratory block (home of the Helen Wills Neuroscience Institute and
// molecular and cell biology labs): a square plan with a regular grid of deep-set windows between slender concrete fins,
// a solid base storey and a flat roof with mechanical penthouses. LiDAR: roof ~30.5 m, penthouse ~35 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'barker-hall', name: 'Barker Hall', subtitle: '1964 · Life sciences labs',
  blurb: 'A 1960s concrete laboratory tower named for UC regent Warren Barker, now home to molecular and cell biology research and the Helen Wills Neuroscience Institute.',
  replaces: ['w/24024683', 'way/24024683'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  const C = tint(M.concrete, 0xd6d1c6), CD = tint(M.concrete, 0xb9b3a7), FR = solid(0x2a2c2e, 0.4, 0.5);
  const lv = [4.6]; for (let k = 1; k <= 6; k++) lv.push(4.6 + k * 4.1);
  const colliders = genParts(K, [
    { poly: rect(-20.1, -15.15, 20.0, 15.15), fl: 0.6, levels: [0.6, 4.6, ...lv.slice(1)], top: 30.6, mat: C, baseMat: CD, frame: FR, bay: 1.62,
      winFn: (k) => (k === 0 ? { w: 1.2, h: 2.9, sill: 0.2, mull: 0 } : { w: 1.18, h: 2.6, sill: 0.75, mull: 0, tran: 0.3 }), depth: 0.6,
      roof: 'flat', parapet: 0.7, deck: tint(M.concrete, 0xa9a59c),
      extra: (runs) => { for (const R of runs) for (const y of lv) K.rbox(R, C, -0.1, y - 0.18, 0, R.L + 0.1, y + 0.12, 0.25); } },
  ]);
  // penthouses
  K.box(CD, -7, 30.6, -4.5, 5, 35.0, 4.5); K.box(C, -7.2, 35.0, -4.7, 5.2, 35.3, 4.7);
  K.box(CD, -16, 30.6, 7, -3, 33.4, 12); K.box(CD, 6, 30.6, -12, 15, 33.0, -7);
  const object3d = K.finish(); object3d.name = 'barker-hall';
  return { object3d, colliders, walkables: [] };
}
