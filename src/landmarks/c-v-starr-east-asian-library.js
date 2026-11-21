// C. V. Starr East Asian Library (Tod Williams Billie Tsien, 2008). A long four-storey block clad in grey granite, its
// south front veiled by a full-height screen of bronze bars in an abstract pattern, with deep-set windows behind; flat roof.
// LiDAR: roof ~20.5 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'c-v-starr-east-asian-library', name: 'C. V. Starr East Asian Library', subtitle: 'Tod Williams Billie Tsien · 2008',
  blurb: 'The first free-standing East Asian library building in the United States, holding Berkeley\'s Chinese, Japanese and Korean collections behind a screen of bronze.',
  replaces: ['w/24024349', 'way/24024349'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const GR = tint(M.granite, 0x9c9a92), GD = tint(M.granite, 0x77756f), BR = solid(0x6b5232, 0.45, 0.85), FR = solid(0x2b2b2b, 0.4, 0.5);
  const colliders = genParts(K, [{ poly: rect(-29.6, -13.6, 29.6, 13.6), fl: 1.2, levels: [1.2, 5.6, 10.0, 14.4, 18.8], top: 20.2, mat: GR, baseMat: GD, frame: FR, bay: 4.2,
    win: { w: 2.6, h: 2.6, sill: 0.8, mull: 1 }, roof: 'flat', parapet: 0.7, coping: GD }]);
  // bronze screen on the south front: vertical bars with an irregular rhythm + horizontal ties
  const R = K.run([-29.6, 13.6], [29.6, 13.6]); let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let s = 0.6; s < R.L - 0.4; s += 0.42 + rnd() * 0.25) K.rbox(R, BR, s, 2.0, 0.55, s + 0.07 + rnd() * 0.08, 18.6, 0.68);
  for (let y = 3.2; y < 18.6; y += 1.1 + rnd() * 0.9) { const s0 = rnd() * R.L * 0.6; K.rbox(R, BR, s0, y, 0.5, Math.min(R.L - 0.4, s0 + 4 + rnd() * 18), y + 0.06, 0.72, { detail: true }); }
  K.rbox(R, BR, 0.4, 18.6, 0.4, R.L - 0.4, 18.85, 0.8); K.rbox(R, BR, 0.4, 1.8, 0.4, R.L - 0.4, 2.0, 0.8);
  const object3d = K.finish(); object3d.name = 'c-v-starr-east-asian-library';
  return { object3d, colliders, walkables: [] };
}
