// Birge Hall (1964), the physics department's six-storey laboratory block north of the Campanile esplanade.
// White concrete box: tall narrow windows between slim white fins with fine slab lines, a continuous balcony with a white
// railing over the recessed, glazed ground storey, flat roof. Massing from LiDAR: parapet ~25-26 m, mechanical attic to ~27 m.
import * as THREE from 'three';
import { Kit, grid, flatRoof, rect, runsOf, entrance, colFromXZ, glassTint, tint } from './lib/b04-kit.js';

export const info = {
  id: 'birge-hall',
  name: 'Birge Hall',
  subtitle: 'Physics · 1964',
  blurb: 'Named for Raymond T. Birge, who led Berkeley\'s physics department for over two decades, this laboratory block joined LeConte Hall to form the physics complex.',
  replaces: ['w/24024501'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-15.5)); const M = ctx.M;
  const W = tint(M, 'stuccoWhite', 0xf1e9d6), GL = glassTint(M, 0x1e2328);
  const colliders = [], walkables = [];
  const u0 = -18.6, u1 = 18.8, v0 = -13.8, v1 = 15.1;
  const lv = [4.6, 8.7, 12.8, 16.9, 21.0, 25.2];
  // recessed glazed ground storey (2.2 m behind the pier line)
  const gi = 0.9;
  for (const { R } of runsOf(K, rect(u0 + gi, v0 + gi, u1 - gi, v1 - gi))) {
    grid(K, R, 0, R.L, [-1, 4.6], { mat: W, bay: 3.8, pier: 1.0, sill: 1.3, head: 0.7, rec: 0.3, mull: 2, tran: 0.72, frame: M.whitePaint, glass: GL, pierOut: 0.1 });
  }
  // upper storeys: tall narrow windows between white fins, thin slab lines at each floor
  for (const { R } of runsOf(K, rect(u0, v0, u1, v1))) {
    grid(K, R, 0, R.L, lv, { mat: W, bay: 1.9, pier: 0.95, pierOut: 0.16, sill: 0.95, head: 0.7, rec: 0.36, mull: 0, tran: 0.82, frame: M.whitePaint, glass: GL, endPier: 0.6, topBand: 0.8, ledge: { h: 0.22, d: 0.06 } });
    // balcony slab over the ground floor with a light white railing
    K.rbox(R, W, -1.35, 4.35, 0, R.L + 1.35, 4.62, 1.35);
    K.rbox(R, M.whitePaint, -1.35, 5.62, 1.25, R.L + 1.35, 5.68, 1.31, { detail: true });
    for (let s = -1.2; s <= R.L + 1.2; s += 0.13) K.rbox(R, M.whitePaint, s - 0.012, 4.62, 1.27, s + 0.012, 5.62, 1.29, { detail: true });
    // slender piers carrying the upper block
  }
  K.box(M.concreteDark, u0 + gi + 0.3, -1, v0 + gi + 0.3, u1 - gi - 0.3, 4.4, v1 - gi - 0.3);
  K.box(W, u0 + 0.1, 4.3, v0 + 0.1, u1 - 0.1, 4.6, v1 - 0.1); // soffit
  K.box(M.concreteDark, u0 + 0.7, 4.6, v0 + 0.7, u1 - 0.7, 25.0, v1 - 0.7); // core behind the glass
  // roof: flat deck + parapet, set-back mechanical attic
  flatRoof(K, rect(u0, v0, u1, v1), 25.2, { parapet: 1.0, mat: W });
  K.box(tint(M, 'concrete', 0xd0cec8), u0 + 4.5, 25.0, -7.0, u1 - 4.5, 26.6, v1 - 4.5);
  // lower stair/service block along the north side (LiDAR ~11-14 m)
  for (const { R } of runsOf(K, rect(-18.4, -15.1, -8.2, v0))) grid(K, R, 0, R.L, [0, 4.6, 8.7, 12.6], { mat: W, bay: 1.9, pier: 0.95, sill: 0.95, head: 0.7, rec: 0.3, mull: 0, frame: M.whitePaint, glass: GL, ledge: { h: 0.22, d: 0.06 } });
  flatRoof(K, rect(-18.4, -15.1, -8.2, v0), 12.6, { parapet: 0.4, mat: W });
  // entrances (north and south faces, centre) in the recessed ground storey
  for (const R of [K.run([u0 + gi, v1 - gi], [u1 - gi, v1 - gi]), K.run([u1 - gi, v0 + gi], [u0 + gi, v0 + gi])]) {
    entrance(K, R, R.L / 2, Math.max(0, K.g(...R.at(R.L / 2, 2))), { w: 4.2, h: 3.0, rec: 0.2, surround: false, glass: GL, frame: M.whitePaint });
  }
  colliders.push(colFromXZ(K.polyXZ(rect(u0, v0, u1, v1)), -2, 27));
  const object3d = K.finish(); object3d.name = 'birge-hall';
  return { object3d, colliders, walkables };
}
