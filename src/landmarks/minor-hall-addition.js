// Minor Hall Addition (optometry clinic and labs), west of Minor Hall: a 1970s-80s concrete frame whose four-storey north
// block has deep recessed window loggias behind horizontal bands of warm timber-clad spandrels, rising over a broad one-storey
// clinic podium with planted roof edges. Massing from LiDAR: north block ~18.5 m, podium ~5.3 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, grid, runsOf, rect, flatRoof, entrance, colFromXZ, tint, plain, glassTint, orient } from './lib/b04-kit.js';

export const info = {
  id: 'minor-hall-addition',
  name: 'Minor Hall Addition',
  subtitle: 'School of Optometry',
  blurb: 'The School of Optometry\'s addition beside Minor Hall, holding clinics, teaching labs and research space.',
  replaces: ['r/14526854'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.2)); const M = ctx.M;
  const C = tint(M, 'concrete', 0xcac8c1), Wd = tint(M, 'wood', 0x9a6a3e), GL = glassTint(M, 0x2b2e2e), green = plain(M, 0x4a6a35, { rough: 0.95 });
  const colliders = [], walkables = [];
  const fp = ctx.footprints[0];
  const outer = orient(fp.outer.map(([x, z]) => K.uv(x, z)));
  const holes = fp.holes.map((h) => orient(h.map(([x, z]) => K.uv(x, z))).slice().reverse());
  // one-storey podium over the whole footprint
  for (const { R } of runsOf(K, outer)) { if (R.L < 1.5) continue; grid(K, R, 0, R.L, [-2.0, 5.0], { mat: C, bay: 3.6, pier: 0.5, sill: 1.6, head: 0.7, rec: 0.3, mull: 1, glass: GL, frame: M.darkBronze, endPier: 0.3 }); }
  for (const h of holes) for (const { R } of runsOf(K, h.slice().reverse())) { if (R.L < 1.5) continue; grid(K, R, 0, R.L, [-0.5, 5.0], { mat: C, bay: 3.6, pier: 0.5, sill: 1.0, head: 0.7, rec: 0.3, mull: 1, glass: GL, frame: M.darkBronze }); }
  K.prism(M.concreteDark, outer.slice().reverse(), 4.7, 5.3, undefined, holes);
  K.loop(C, outer, [[0.05, 5.0], [0.05, 5.6], [-0.35, 5.6], [-0.35, 5.0]]);
  // planted edges on the podium roof
  K.loop(green, outer, [[-0.4, 5.3], [-0.4, 5.75], [-1.3, 5.75], [-1.3, 5.3]], { skipEdges: [] });
  // four-storey north block: concrete frame, deep loggias, timber spandrel bands
  const nb = rect(-27.6, -0.2, 23.6, 18.8);
  for (const { R } of runsOf(K, nb)) {
    grid(K, R, 0, R.L, [5.3, 9.6, 13.9, 18.2], { mat: C, bay: 3.8, pier: 0.6, pierOut: 0.9, sill: 1.0, head: 0.35, rec: 0.6, mull: 2, glass: GL, frame: M.darkBronze, endPier: 0.6, topBand: 0.6 });
    for (const y of [5.3, 9.6, 13.9]) K.rbox(R, Wd, 0.3, y + 0.05, 0.02, R.L - 0.3, y + 1.0, 0.75);
    K.rbox(R, Wd, -0.1, 18.25, 0, R.L + 0.1, 18.75, 0.95);
  }
  K.box(M.concreteDark, -27.0, 5.0, 0.4, 23.0, 18.2, 18.2);
  flatRoof(K, nb, 18.5, { parapet: 0.0, mat: C });
  K.box(C, -8, 18.5, 5, 6, 20.6, 13);
  entrance(K, K.run([20.2, 25.6], [-4.5, 25.3]), 12.0, Math.max(0, K.g(8, 26.5)), { w: 4.0, h: 3.0, rec: 0.2, glass: GL, canopy: 2.2, canopyMat: C });
  colliders.push(colFromXZ(fp.outer, -2, 5.6)); colliders.push(colFromXZ(K.polyXZ(nb), 5, 21));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'minor-hall-addition';
  return { object3d, colliders, walkables };
}
