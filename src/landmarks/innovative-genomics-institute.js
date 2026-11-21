// Innovative Genomics Institute building (opened 2012 as the Energy Biosciences Building / Helios), 2151 Berkeley Way.
// A six-storey laboratory block faced in large warm-tan terracotta panels with punched windows that shift from floor to floor,
// a glazed ground floor, an all-glass corner stair "lantern", and a continuous metal screen around the rooftop plant.
// Massing from LiDAR: parapet ~28 m, corner lantern and plant screen to ~32 m.
import * as THREE from 'three';
import { Kit, grid, curtain, runsOf, rect, flatRoof, entrance, colFromXZ, tint, plain, glassTint, orient } from './lib/b04-kit.js';

export const info = {
  id: 'innovative-genomics-institute',
  name: 'Innovative Genomics Institute',
  subtitle: '2151 Berkeley Way · 2012',
  blurb: 'Opened in 2012 as the Energy Biosciences Building, it is now home to the Innovative Genomics Institute founded by Jennifer Doudna to apply CRISPR genome editing.',
  replaces: ['w/202361277'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.8)); const M = ctx.M;
  const T = tint(M, 'concrete', 0xc8b79d), Td = tint(M, 'concrete', 0xb3a286), GL = glassTint(M, 0x3f4b4e), GG = glassTint(M, 0x6e8c86, { metal: 0.35 }), FR = plain(M, 0x3a3f42, { rough: 0.5, metal: 0.6 }), SC = plain(M, 0xb8bcbe, { rough: 0.4, metal: 0.7 });
  const colliders = [], walkables = [];
  const poly = orient([[-39.0, -13.0], [38.2, -13.0], [38.2, -2.4], [41.9, -2.4], [41.9, 5.9], [42.2, 7.6], [-27.3, 18.6], [-27.0, 5.9], [-39.0, 5.9]]);
  const lv = [5.0, 9.6, 14.2, 18.8, 23.4, 27.4];
  for (const { R, i } of runsOf(K, poly)) {
    if (R.L < 1.5) continue;
    curtain(K, R, 0, R.L, -1.5, 5.0, { glass: GL, frame: FR, mw: 2.0, levels: [-1.5, 5.0] });
    // staggered punched windows: each storey shifts the bay grid by half a bay
    for (let k = 0; k < lv.length - 1; k++) grid(K, R, 0, R.L, [lv[k], lv[k + 1]], { mat: k % 2 ? T : Td, bay: 3.0, pier: 1.4, sill: 0.9, head: 0.9, rec: 0.3, mull: 1, glass: GL, frame: FR, endPier: k % 2 ? 0.7 : 2.2, topBand: k === lv.length - 2 ? 0.6 : 0 });
  }
  K.prism(M.concreteDark, poly.slice().reverse().map(([u, v]) => [u * 0.985, v * 0.96]), -1.5, 27.4);
  flatRoof(K, poly, 28.0, { parapet: 0.0, mat: T });
  // continuous metal plant screen set back from the parapet
  const scr = [[-29.0, -11.5], [36.5, -11.5], [36.5, 4.5], [-25.5, 15.0], [-25.5, 4.0], [-29.0, 4.0]];
  for (const { R } of runsOf(K, scr)) { if (R.L < 1) continue; K.rbox(R, SC, 0, 28.0, -0.15, R.L, 31.6, 0.0); for (let y = 28.3; y < 31.4; y += 0.3) K.rbox(R, SC, 0, y, 0.0, R.L, y + 0.08, 0.1, { detail: true }); }
  K.flat(M.concreteDark, scr.slice(), 31.0);
  // all-glass corner stair lantern at the north-west corner
  const L = rect(-39.6, -13.6, -31.0, -5.0);
  for (const { R } of runsOf(K, L)) curtain(K, R, 0, R.L, -1.5, 32.0, { glass: GG, frame: FR, mw: 1.4, levels: [-1.5, 5.0, 9.6, 14.2, 18.8, 23.4, 28.0, 32.0], spandrel: { h: 0.6, mat: FR } });
  K.box(M.concreteDark, -39.0, -1.5, -13.0, -31.6, 31.8, -5.6);
  flatRoof(K, L, 32.0, { parapet: 0.2, mat: FR });
  entrance(K, K.run([42.2, 7.6], [-27.3, 18.6]), 34.0, Math.max(0, K.g(5, 14)), { w: 5.0, h: 3.6, rec: 0.15, surround: false, glass: GL, frame: FR, canopy: 2.4, canopyMat: SC });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 32));
  const object3d = K.finish(); object3d.name = 'innovative-genomics-institute';
  return { object3d, colliders, walkables };
}
