// Latimer Hall (1963), the College of Chemistry's tallest building: an eight-storey white concrete slab whose facades are a deep
// egg-crate of thin vertical fins and solid balcony-height spandrels over dark recessed glass, raised on a recessed, glazed
// ground floor with a colonnade of slim piers. Massing from LiDAR: parapet ~35.5 m, penthouse ~37.5 m, plant to ~40.5 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, grid, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, glassTint , plain } from './lib/b04-kit.js';

export const info = {
  id: 'latimer-hall',
  name: 'Latimer Hall',
  subtitle: 'College of Chemistry · 1963',
  blurb: 'The tallest of the chemistry buildings, with teaching and research laboratories stacked eight storeys high beside the round Pimentel lecture hall.',
  replaces: ['w/24024502'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-15.8)); const M = ctx.M;
  const W = tint(M, 'stuccoWhite', 0xeeece5), Wd = tint(M, 'stuccoWhite', 0xd2cfc7), GL = glassTint(M, 0x2a2f33, { rough: 0.2, metal: 0.2 }), FR = plain(M, 0x3a3e40, { rough: 0.5, metal: 0.5 });
  const colliders = [], walkables = [];
  const u0 = -29.2, u1 = 29.2, v0 = -16.3, v1 = 15.6;
  const lv = [4.5, 8.8, 13.1, 17.4, 21.7, 26.0, 30.3, 34.4];
  // recessed glazed ground floor
  const gi = 3.0;
  for (const { R } of runsOf(K, rect(u0 + gi, v0 + gi, u1 - gi, v1 - gi))) grid(K, R, 0, R.L, [-1.5, 4.5], { mat: Wd, bay: 3.9, pier: 0.3, sill: 0.4, head: 0.4, rec: 0.1, mull: 2, tran: 0.7, glass: tint(M, 'glass', 0x1e2226), frame: FR });
  // egg-crate upper storeys: fins and spandrels ~1.1 m deep in front of the glass
  for (const { R } of runsOf(K, rect(u0, v0, u1, v1))) {
    const long = R.L > 40;
    // deep egg-crate: bold full-height piers, white parapet slabs, glazing set ~1.6 m back behind balconies
    const nb = long ? 10 : 5;
    grid(K, R, 0, R.L, lv, { mat: W, nb, pier: 0.7, pierOut: 0.3, bandOut: 0.0, sill: 1.1, head: 0.2, rec: 1.6, mull: 2, tran: 0.8, glass: GL, frame: FR, endPier: 0.8, topBand: 1.2, pierY0: -1.5 });
    for (let i = 0; i < nb; i++) { const a = 0.8 + (R.L - 1.6) * i / nb, b = 0.8 + (R.L - 1.6) * (i + 1) / nb; for (const y of lv.slice(0, -1)) K.rbox(R, Wd, a, y - 0.05, -1.6, b, y + 0.05, -0.05); for (const y of lv.slice(1, -1)) K.rbox(R, plain(M, 0xf5f5f2), a + 0.35, y + 1.05, -1.0, b - 0.35, y + 1.1, -0.95, { detail: true }); }
  }
  K.box(Wd, u0, 4.1, v0, u1, 4.5, v1); // soffit over the open base
  K.box(M.concreteDark, u0 + gi + 0.3, -1.5, v0 + gi + 0.3, u1 - gi - 0.3, 4.2, v1 - gi - 0.3);
  K.box(M.concreteDark, u0 + 1.9, 4.5, v0 + 1.9, u1 - 1.9, 34.6, v1 - 1.9);
  flatRoof(K, rect(u0, v0, u1, v1), 35.25, { parapet: 0.0, mat: W });
  // penthouse and plant (LiDAR)
  penthouse(K, -24.0, -10.0, 17.0, 9.5, 35.25, 37.5, { mat: tint(M, 'stuccoWhite', 0xcfccc4), cap: W, louvre: true });
  penthouse(K, 19.0, -9.5, 27.0, 4.0, 35.25, 38.6, { mat: Wd, cap: W, louvre: true });
  penthouse(K, 3.5, -6.5, 11.5, 2.5, 37.6, 40.3, { mat: tint(M, 'concrete', 0xc9c4b8), cap: W, louvre: true });
  for (const [u, v] of [[-20, -3], [-12, 4], [22, -6], [24, 3]]) K.cyl(M.iron, u, 35.8, v, 0.4, 0.4, 3.2, 10);
  // entrances on the long faces (centre)
  for (const R of [K.run([u0 + gi, v1 - gi], [u1 - gi, v1 - gi]), K.run([u1 - gi, v0 + gi], [u0 + gi, v0 + gi])]) entrance(K, R, R.L * 0.42, Math.max(0, K.g(...R.at(R.L * 0.42, 2))), { w: 4.0, h: 3.0, rec: 0.15, surround: false, glass: tint(M, 'glass', 0x1e2226), frame: FR });
  colliders.push(colFromXZ(K.polyXZ(rect(u0 - 0.85, v0 - 0.85, u1 + 0.85, v1 + 0.85)), 4.3, 41));
  colliders.push(colFromXZ(K.polyXZ(rect(u0 + gi, v0 + gi, u1 - gi, v1 - gi)), -2, 4.4));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'latimer-hall';
  return { object3d, colliders, walkables };
}
