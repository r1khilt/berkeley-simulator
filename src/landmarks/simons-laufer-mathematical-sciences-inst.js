// Simons Laufer Mathematical Sciences Institute (SLMath, formerly MSRI), high in the Berkeley hills above campus on Gauss Way.
// Stepped red-brick volumes with low brick parapets, grey-blue glazed ribbons and a glazed entry block, terraced into the slope
// above a curving forecourt. Massing from LiDAR: west block ~18.5 m, central block ~15 m, east wing ~10 m above the low corner.
import * as THREE from 'three';
import { Kit, grid, curtain, runsOf, rect, flatRoof, entrance, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'simons-laufer-mathematical-sciences-inst',
  name: 'Simons Laufer Mathematical Sciences Institute',
  subtitle: 'SLMath (formerly MSRI) · 1985',
  blurb: 'Founded in 1982 as the Mathematical Sciences Research Institute, this independent institute hosts mathematicians from around the world for semester-long research programs, in a hillside building above the campus.',
  replaces: ['w/70661576'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-20)); const M = ctx.M;
  const B = tint(M, 'brick', 0xd88a6a), GL = glassTint(M, 0x5e7488), FR = plain(M, 0x8a8f94, { rough: 0.45, metal: 0.6 });
  const colliders = [], walkables = [];
  const brickBlock = (poly, top, o = {}) => {
    for (const { R } of runsOf(K, poly)) {
      if (R.L < 1.5) continue;
      grid(K, R, 0, R.L, o.lv || [-2.5, top - 7.6, top - 3.8, top - 0.6], { mat: B, bay: o.bay ?? 2.6, pier: o.pier ?? 1.2, sill: 1.0, head: 0.8, rec: 0.3, mull: 1, glass: GL, frame: FR, endPier: 1.0, topBand: 0.6 });
      // glazed ribbon band under the parapet
      curtain(K, R, 0.8, R.L - 0.8, top - 0.6 - 1.4, top - 0.6, { glass: GL, frame: FR, mw: 1.2, rec: 0.05 });
    }
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    K.box(M.concreteDark, Math.min(...xs) + 0.6, -2.5, Math.min(...ys) + 0.6, Math.max(...xs) - 0.6, top - 0.2, Math.max(...ys) - 0.6);
    flatRoof(K, poly, top, { parapet: 0.6, mat: B });
  };
  brickBlock([[-5.7, -27.1], [-5.7, 22.2], [-18.5, 21.8], [-18.8, 6.2], [-21.8, 5.9], [-21.8, -15.9], [-19.4, -17.0], [-19.1, -27.4]], 18.6);
  brickBlock([[-5.7, -10.5], [9.8, -8.9], [19.4, -8.9], [19.4, 16.5], [0.4, 17.4], [0.2, 21.6], [-5.7, 22.2]], 15.2, { bay: 3.0 });
  // east wing with the glazed entry front (storefront curtain wall) and ribbon of square panes above
  const E = [[14.3, -11.8], [28.0, -14.8], [28.7, 2.5], [22.6, 7.5], [19.7, 10.7], [19.4, -8.9]];
  for (const { R } of runsOf(K, E)) { if (R.L < 1.5) continue; curtain(K, R, 0, R.L, -2.5, 5.2, { glass: GL, frame: FR, mw: 1.6, levels: [-2.5, 2.6, 5.2] }); grid(K, R, 0, R.L, [5.2, 9.6], { mat: B, bay: 1.5, pier: 0.45, sill: 0.8, head: 0.6, rec: 0.25, mull: 0, glass: GL, frame: FR }); }
  K.prism(M.concreteDark, E.slice().reverse().map(([u, v]) => [u, v]), -2.5, 9.4);
  flatRoof(K, E, 9.8, { parapet: 0.5, mat: B });
  // large square multi-pane window on the west block's south face
  { const R = K.run([-18.5, 21.8], [-5.7, 22.2], 0.02); K.rbox(R, FR, 3.2, 6.0, 0, 9.6, 12.4, 0.1); K.rbox(R, GL, 3.4, 6.2, 0.1, 9.4, 12.2, 0.12); for (let k = 1; k < 3; k++) { K.rbox(R, FR, 3.2 + k * 2.13 - 0.05, 6.0, 0.12, 3.2 + k * 2.13 + 0.05, 12.4, 0.16, { detail: true }); K.rbox(R, FR, 3.2, 6.0 + k * 2.13 - 0.05, 0.12, 9.6, 6.0 + k * 2.13 + 0.05, 0.16, { detail: true }); } }
  entrance(K, K.run([22.6, 7.5], [28.7, 2.5]), 3.5, Math.max(0, K.g(25, 6)), { w: 3.2, h: 3.0, rec: 0.1, glass: GL, frame: FR, canopy: 2.0, canopyMat: B });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 20));
  const object3d = K.finish(); object3d.name = 'simons-laufer-mathematical-sciences-inst';
  return { object3d, colliders, walkables };
}
