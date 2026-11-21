// Stanley Hall (2007), the Stanley Biosciences and Bioengineering Facility (QB3), at the north-east corner of the core campus.
// A nine-storey laboratory tower stepping down through 25 m and 20 m wings to a three-storey west wing, all in white metal
// panels with ribbon windows of blue-green glass, teal spandrels and a big teal-clad rooftop mechanical penthouse.
// Massing from LiDAR: tower ~39 m (plant to ~44 m), middle block ~25 m, wings ~20 m, west wing ~15.5 m.
import * as THREE from 'three';
import { Kit, grid, curtain, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';

export const info = {
  id: 'stanley-hall',
  name: 'Stanley Hall',
  subtitle: 'Biosciences & bioengineering · 2007',
  blurb: 'Rebuilt in 2007 on the site of the original Stanley Hall (named for biochemist Wendell Stanley), it houses bioengineering labs and the Berkeley arm of the California Institute for Quantitative Biosciences (QB3).',
  replaces: ['w/24025051'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.2)); const M = ctx.M;
  const Wp = tint(M, 'stuccoWhite', 0xe8e4da), Tl = plain(M, 0x6f9496, { rough: 0.2, metal: 0.5 });
  const GL = glassTint(M, 0x3e4a4e, { metal: 0.4 }), GR = glassTint(M, 0x6f9496, { rough: 0.06, metal: 0.45 }), FR = plain(M, 0x4a5a5c, { rough: 0.5, metal: 0.6 });
  const PJ = tint(M, 'stuccoWhite', 0xcfcbc1);
  const colliders = [], walkables = [];
  const levels = (top, g = 0) => { const out = [g]; let y = g + 5.0; while (y < top - 2.5) { out.push(y); y += 4.2; } out.push(top); return out; };
  const block = (poly, top, o = {}) => {
    for (const { R, i } of runsOf(K, poly)) {
      const lv = levels(top, -1.5);
      if (o.ribbon) { // continuous green ribbon glazing between white spandrels, sunshade fin at each floor line
        grid(K, R, 0, R.L, lv, { mat: Wp, bay: 1.5, pier: 0.08, pierMat: FR, sill: 0.95, head: 0.25, rec: 0.5, mull: 0, glass: GR, frame: FR, endPier: 0.5, topBand: 0.5 });
        for (const y of lv.slice(1, -1)) K.rbox(R, Wp, 0, y - 0.2, 0, R.L, y - 0.1, 0.6, { detail: true });
      } else grid(K, R, 0, R.L, lv, { mat: Wp, bay: o.bay ?? 2.4, pier: o.pier ?? 1.2, sill: 1.2, head: 1.5, rec: 0.3, mull: 1, glass: GL, frame: FR, endPier: 0.8, topBand: 0.4, ...o.g });
      for (let ss = 1.5; ss < R.L; ss += 1.5) K.rbox(R, PJ, ss - 0.012, -1.5, 0, ss + 0.012, top, 0.012, { detail: true });
    }
    flatRoof(K, poly, top + 0.4, { parapet: 0.7, mat: Wp });
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    if (o.core !== false) K.box(M.concreteDark, Math.min(...xs) + 0.6, -1.5, Math.min(...ys) + 0.6, Math.max(...xs) - 0.6, top, Math.max(...ys) - 0.6);
  };
  // west wing (three storeys)
  block(rect(-35.1, -23.9, -20.0, 32.9), 15.2, { ribbon: true });
  block(rect(-20.0, 6.0, -12.0, 32.9), 15.2, { ribbon: true });
  // 20 m bar and the 25 m block
  block(rect(-20.0, -29.5, -12.0, 6.0), 19.6, { ribbon: true });
  block(rect(-12.0, -31.0, 14.0, 6.0), 24.6, { ribbon: true });
  block(rect(-12.0, 6.0, 5.0, 24.2), 19.6, { ribbon: true });
  // the tower: dense punched grid, teal spandrel bands
  const tower = [[-1.0, 33.0], [26.0, 32.7], [26.0, -31.5], [14.0, -31.5], [14.0, 6.0], [5.0, 6.0], [5.0, 24.2], [-1.0, 24.2]];
  block(tower, 30.4, { core: false });
  // blue-green glass crown: the top floors and plant wrapped in a curtain wall, set back 1 m
  { const crown = [[0.0, 32.0], [25.0, 31.7], [25.0, -30.5], [15.0, -30.5], [15.0, 7.0], [6.0, 7.0], [6.0, 23.2], [0.0, 23.2]];
    for (const { R } of runsOf(K, crown)) curtain(K, R, 0, R.L, 30.4, 39.4, { glass: GR, frame: FR, mw: 1.5, levels: [30.4, 34.6, 39.4] });
    flatRoof(K, crown, 39.6, { parapet: 0.9, mat: Tl }); K.box(Wp, -0.6, 30.0, -31.1, 25.6, 30.5, 32.6); }
  K.box(M.concreteDark, 14.6, -1.5, -30.9, 25.4, 30.2, 32.1); K.box(M.concreteDark, -0.4, -1.5, 6.6, 14.6, 30.2, 32.1);
  K.box(M.concreteDark, 16.0, 30.2, -29.5, 23.8, 39.2, 30.5); K.box(M.concreteDark, 1.2, 30.2, 8.2, 16.0, 39.2, 30.5);
  // full-height glazed stair slot on the north face of the tower
  { const R = K.run([24.0, -31.5], [17.0, -31.5], 0.02); curtain(K, R, 0, R.L, -1.5, 38.6, { glass: GL, frame: FR, mw: 1.4, levels: levels(38.6, -1.5) }); }
  // teal-clad rooftop mechanical penthouse and exhaust stacks
  penthouse(K, 7.5, 6.5, 24.5, 19.5, 39.0, 43.6, { mat: Tl, cap: Wp, louvre: true });
  penthouse(K, 16.0, -27.0, 24.5, -14.0, 39.0, 41.4, { mat: Tl, cap: Wp });
  for (const [u, v] of [[17, -8], [20, -8], [23, -8], [17, 1], [20, 1], [23, 1], [17, -20], [20, -20]]) K.cyl(plain(M, 0xcfcfcf, { rough: 0.5, metal: 0.4 }), u, 39.6, v, 0.4, 0.4, 3.6, 10);
  { const MB = plain(M, 0xcfcfcf, { rough: 0.6, metal: 0.2 }); let k = 0; for (const [u, v, w, d] of [[-30, -18, 3, 2], [-27, 0, 2, 3], [-31, 14, 3, 3], [-26, 26, 2, 2], [-17, -24, 2, 3], [-16, -6, 2, 2], [-6, -26, 3, 2], [4, -20, 2, 3], [-8, 12, 3, 2], [0, 18, 2, 2]]) { k++; const top = u < -20 ? 15.6 : (u < -12 ? 20.0 : (v < 6 ? 25.0 : 20.0)); K.box(MB, u, top, v, u + w, top + 1.0 + (k % 3) * 0.6, v + d); } }
  // east wing with the curved east front
  const east = [[26.0, -23.3], [30.5, -23.3], [32.8, -10.8], [36.8, -0.1], [38.6, 5.7], [39.4, 11.4], [38.3, 19.6], [37.2, 23.2], [31.2, 23.4], [31.0, 30.6], [26.0, 30.9]];
  block(east, 19.6, { core: false, skip: [10], g: { bay: 3.2 } });
  K.prism(M.concreteDark, east.map(([u, v]) => [u + (u > 26 ? -0.6 : 0.2), v]), -1.5, 19.4);
  // north entrance pavilion / canopy (LiDAR ~5 m)
  { const P = rect(-28.0, -35.0, 8.0, -31.0); for (const { R, i } of runsOf(K, P)) { if (i === 0) continue; curtain(K, R, 0, R.L, -1.5, 4.6, { glass: GL, frame: FR, mw: 2.0, levels: [-1.5, 4.6] }); } flatRoof(K, P, 5.0, { parapet: 0.3, mat: Wp }); K.box(Wp, -29.0, 4.7, -36.2, 9.0, 5.1, -31.0); }
  entrance(K, K.run([8.0, -35.0], [-28.0, -35.0]), 18.0, Math.max(0, K.g(-8, -36)), { w: 5.0, h: 3.2, rec: 0.1, surround: false, glass: GL, frame: FR });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 44));
  const object3d = K.finish(); object3d.name = 'stanley-hall';
  return { object3d, colliders, walkables };
}
