// Hildebrand Hall (1966), chemistry laboratories and the chemistry library: three white concrete upper storeys of continuous
// ribbon glazing between solid spandrel bands, cantilevered over a dark recessed ground-floor colonnade on a paved plaza,
// with a raised central roof block and a red-orange penthouse. Massing from LiDAR: roof ~19 m, central block ~22 m, plant ~25 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, grid, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'hildebrand-hall',
  name: 'Hildebrand Hall',
  subtitle: 'College of Chemistry · 1966',
  blurb: 'Named for chemist Joel H. Hildebrand, who taught at Berkeley for more than seventy years, the building holds chemistry laboratories and the chemistry library.',
  replaces: ['w/24025035'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.8)); const M = ctx.M;
  const W = tint(M, 'stuccoWhite', 0xefede6), Wd = tint(M, 'stuccoWhite', 0xd9d6ce), GL = glassTint(M, 0x5e7888, { rough: 0.05, metal: 0.5 }), GD = tint(M, 'glass', 0x1a1f22), RD = plain(M, 0xa0472e, { rough: 0.8 });
  const MU = plain(M, 0xc8cccf, { rough: 0.4, metal: 0.5 });
  const colliders = [], walkables = [];
  const u0 = -16.9, u1 = 16.9, v0 = -23.9, v1 = 23.9, gi = 3.4;
  for (const { R } of runsOf(K, rect(u0 + gi, v0 + gi, u1 - gi, v1 - gi))) grid(K, R, 0, R.L, [-1.5, 4.6], { mat: Wd, bay: 3.6, pier: 0.3, sill: 0.4, head: 0.4, rec: 0.1, mull: 2, glass: GD, frame: MU });
  for (const { R } of runsOf(K, rect(u0, v0, u1, v1))) {
    // ribbon windows: thin mullions on a 1.2 m module between deep solid spandrels
    if (R.n[0] < -0.9) { // west face on the plaza: full-height white fins at 2 m centres with deep-set glazing
      grid(K, R, 0, R.L, [4.6, 9.4, 14.2, 18.8], { mat: W, bay: 2.0, pier: 0.4, sill: 0.3, head: 0.3, rec: 0.6, mull: 0, tran: 0.62, glass: GL, frame: MU, endPier: 0.6, topBand: 0.6, fin: { w: 0.4, d: 0.75, mat: W, y0: 4.6, y1: 19.4 } });
    } else grid(K, R, 0, R.L, [4.6, 9.4, 14.2, 18.8], { mat: W, bay: 1.2, pier: 0.08, pierMat: MU, sill: 0.55, head: 0.35, rec: 0.3, mull: 0, tran: 0.62, glass: GL, frame: MU, endPier: 0.5, topBand: 0.6, bandOut: 0.05 });
    K.rbox(R, plain(M, 0x6e6e6e), 0, 18.75, 0.0, R.L, 18.8, 0.07); // dark drip line under the parapet
    const n = Math.round(R.L / 7.2); for (let i = 0; i <= n; i++) { const s = 2.6 + (R.L - 5.2) * i / n; K.rbox(R, Wd, s - 0.42, -1.5, -gi + 0.3, s + 0.42, 4.6, -gi + 1.15); } // thick colonnade piers
  }
  K.box(W, u0, 4.0, v0, u1, 4.6, v1); // deep soffit over the recessed ground floor
  K.box(M.concreteDark, u0 + gi + 0.3, -1.5, v0 + gi + 0.3, u1 - gi - 0.3, 4.3, v1 - gi - 0.3);
  K.box(M.concreteDark, u0 + 0.95, 4.6, v0 + 0.95, u1 - 0.95, 18.8, v1 - 0.95);
  flatRoof(K, rect(u0, v0, u1, v1), 19.3, { parapet: 0.0, mat: W });
  penthouse(K, -8.5, -13.0, 9.5, 13.5, 19.3, 22.2, { mat: W, cap: Wd });
  penthouse(K, -4.5, -5.0, 5.5, 4.0, 22.2, 25.6, { mat: RD, cap: RD });
  // solid white stair tower at the plaza corner, rising above the parapet
  K.box(W, u0 - 0.9, -1.5, v0 - 0.2, u0 + 6.0, 22.3, v0 + 7.5); K.box(Wd, u0 - 1.0, 22.3, v0 - 0.3, u0 + 6.1, 22.6, v0 + 7.6);
  K.box(GL, u0 - 0.95, 5.0, v0 + 3.4, u0 - 0.9, 21.5, v0 + 4.0);
  entrance(K, K.run([u0 + gi, v1 - gi], [u1 - gi, v1 - gi]), 14.5, Math.max(0, K.g(0, v1)), { w: 4.0, h: 3.0, rec: 0.1, surround: false, glass: GL });
  entrance(K, K.run([u0 + gi, v0 + gi], [u0 + gi, v1 - gi]), 21.5, Math.max(0, K.g(u0, 0)), { w: 3.6, h: 3.0, rec: 0.1, surround: false, glass: GL });
  colliders.push(colFromXZ(K.polyXZ(rect(u0, v0, u1, v1)), 4.3, 25)); colliders.push(colFromXZ(K.polyXZ(rect(u0 + gi, v0 + gi, u1 - gi, v1 - gi)), -2, 4.4));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'hildebrand-hall';
  return { object3d, colliders, walkables };
}
