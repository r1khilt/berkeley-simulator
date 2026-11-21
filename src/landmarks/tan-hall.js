// Tan Hall (1997), the College of Chemistry's research tower: an eight-storey block of warm sand precast panels with a strict
// grid of punched windows, a lighter band over the base, a projecting cornice, a faceted corner tower and rooftop plant.
// Massing from LiDAR: parapet ~29.5 m with plant rising to ~35 m in the middle.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, grid, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, glassTint, plain } from './lib/b04-kit.js';
import { corniceProfile } from './lib/classic-kit.js';

export const info = {
  id: 'tan-hall',
  name: 'Tan Hall',
  subtitle: 'College of Chemistry · 1997',
  blurb: 'An eight-storey research building for the College of Chemistry, named for the Tan family whose gift helped fund it. Its labs and offices complete the chemistry complex next to Latimer and Gilman halls.',
  replaces: ['w/24024503'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-15.9)); const M = ctx.M;
  const S = tint(M, 'stuccoWhite', 0xe2d9c6), St = tint(M, 'stuccoWhite', 0xebe4d4), Sb = tint(M, 'stuccoWhite', 0xcfc5b2), GL = glassTint(M, 0x7f95a4, { rough: 0.06, metal: 0.45 });
  const FR = plain(M, 0xe8e8e4, { rough: 0.5, metal: 0.2 });
  const colliders = [], walkables = [];
  const u0 = -14.7, u1 = 14.4, v0 = -21.4, v1 = 21.1;
  const lv = [5.2, 8.9, 12.6, 16.3, 20.0, 23.7, 27.4];
  for (const { R } of runsOf(K, rect(u0, v0, u1, v1))) {
    grid(K, R, 0, R.L, [-1.5, 5.2], { mat: Sb, bay: 3.6, pier: 0.8, sill: 0.3, head: 0.6, rec: 1.4, mull: 2, glass: tint(M, 'glass', 0x1c2226), frame: FR }); // recessed glazed base behind square piers
    grid(K, R, 0, R.L, lv, { mat: S, bay: 3.6, pier: 2.0, sill: 1.0, head: 0.9, rec: 0.22, mull: 1, tran: 0.5, glass: GL, frame: FR, endPier: 1.6, topBand: 1.0, fin: { w: 0.6, d: 0.1, mat: St, noEnds: true } });
    K.rbox(R, St, -0.1, 5.0, 0, R.L + 0.1, 5.6, 0.18); // band over the base
    K.rbox(R, St, -1.2, 28.85, 0, R.L + 1.2, 29.2, 1.2); // thin deep slab cornice
    for (let s = 0.0; s < R.L; s += 1.5) K.rbox(R, Sb, s - 0.012, 5.6, 0, s + 0.012, 28.4, 0.012, { detail: true }); // precast panel joints
    for (let y = 8.9; y < 28; y += 3.7) K.rbox(R, Sb, 0, y - 0.012, 0, R.L, y + 0.012, 0.012, { detail: true });
  }
  K.box(M.concreteDark, u0 + 1.7, -1.5, v0 + 1.7, u1 - 1.7, 5.3, v1 - 1.7); K.box(M.concreteDark, u0 + 0.6, 5.3, v0 + 0.6, u1 - 0.6, 28.4, v1 - 0.6);
  flatRoof(K, rect(u0, v0, u1, v1), 29.2, { parapet: 0.0, mat: S });
  // faceted corner tower at the south-west corner with a deep cornice cap
  const T = [[u0 - 1.6, v1 - 4.5], [u0 + 1.2, v1 + 1.6], [u0 + 6.0, v1 + 1.6], [u0 + 6.0, v1 - 6.0], [u0 - 1.6, v1 - 6.0]];
  for (const { R, i } of runsOf(K, T)) { if (R.L < 0.5) continue; grid(K, R, 0, R.L, [-1.5, 5.2, ...lv.slice(1), 30.6], { mat: St, bay: 1.9, pier: 0.7, sill: 0.6, head: 0.6, rec: 0.45, mull: 0, glass: GL, frame: FR, endPier: 0.5 }); K.rbox(R, St, -1.3, 30.6, 0, R.L + 1.3, 31.0, 1.3); K.rbox(R, St, -1.3, 31.0, 0.9, R.L + 1.3, 31.35, 1.3); }
  flatRoof(K, T, 31.0, { parapet: 0.0, mat: St });
  // rooftop plant (LiDAR ~33-35 m)
  penthouse(K, -5.0, -12.0, 8.0, 10.0, 29.2, 33.4, { mat: tint(M, 'stuccoWhite', 0xcfc6b4), cap: St, louvre: true });
  penthouse(K, -1.0, -5.0, 7.0, 4.0, 33.4, 35.0, { mat: tint(M, 'stuccoWhite', 0xc4bba9), cap: St });
  entrance(K, K.run([u0, v1], [u1, v1]), 15.0, Math.max(0, K.g(0, v1 + 2)), { w: 4.0, h: 3.2, rec: 1.5, glass: tint(M, 'glass', 0x1c2226), frame: FR, surround: false });
  for (const s of [-3, 3]) { const R = K.run([u0, v1], [u1, v1]); K.rbox(R, Sb, 15 + s * 2.2 - 1.2, Math.max(0, K.g(0, v1 + 2)) - 0.5, 1.2, 15 + s * 2.2 + 1.2, Math.max(0, K.g(0, v1 + 2)) + 0.6, 2.6); } // planter walls
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 35));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'tan-hall';
  return { object3d, colliders, walkables };
}
