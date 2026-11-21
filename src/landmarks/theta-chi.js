// Theta Chi (ΘΧ), 2499 Piedmont Avenue at Dwight Way. White stucco Mediterranean / Prairie chapter house: two storeys
// over a raised basement under low hipped roofs with deep, dark flat soffits; banded dark-framed casements, a pent roof
// over a big ground-floor window group, a centred entrance between square pilasters with red ΘΧ letters above, and
// red-brick steps climbing the lawn from the street. LiDAR: eaves ~8 m, ridges ~9.6-10.8 m.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { gardenWall, hedge } from './lib/b12-greek.js';

export const info = {
  id: 'theta-chi',
  name: 'Theta Chi',
  subtitle: 'ΘΧ · 2499 Piedmont Avenue',
  blurb: 'Chapter house of Theta Chi at Piedmont Avenue and Dwight Way, a white stucco Mediterranean house with low hipped roofs and red letters over the door.',
  replaces: ['w/473223262'],
};

export async function build(ctx) {
  const dark = ['paint', '#2b2b2b'], white = ['stucco', '#f2f1ec'], roof = ['roof', '#3a2e2a'], red = ['paint', '#b22234'], brick = ['brick', '#a24a38'];
  const F = 1.8;
  const r = rseHouse(ctx, {
    ang: -8.126, floor: F, storeyH: 3.15, ov: 0.95,
    wall: white, trim: ['paint', '#3a2e2a'], frame: dark, roof, base: ['stucco', '#dcdad2'], door: ['paint', '#2a2422'],
    win: { w: 0.62, h: 1.45, bay: 3.2, sill: 0.85, tran: 0.7, casing: 0, pair: true, mull: 2, muntins: 2 }, belt: false,
    blocks: [
      { u0: -14.98, u1: 9.56, v0: -11.21, v1: -3.8, eave: 8.0, roof: { type: 'hip', ridge: 9.9 } },
      { u0: -7.3, u1: 9.9, v0: -3.8, v1: 9.8, eave: 8.3, win: { W: { nb: 3, st: [{ skip: [1] }, { pair: false, w: 0.55, mull: 0, nb: 3 }] } }, roof: { type: 'hip', ridge: 10.8 } },
      { u0: 2.5, u1: 9.9, v0: 9.8, v1: 16.6, eave: 7.9, roof: { type: 'hip', ridge: 9.6 } },
    ],
    doors: [{ block: 1, face: 'W', s: 6.8, w: 1.2, h: 2.4 }],
    porches: [{ block: 1, face: 'W', s0: 5.6, s1: 8.0, depth: 0.9, cols: 2, colStyle: 'square', colD: 0.38, colMat: ['stucco', '#f6f5f0'], top: F + 2.9, rail: false, fascia: ['stucco', '#f6f5f0'], roofMat: roof, stepMat: brick, stepW: 3.2, cheek: brick }],
    letters: [{ block: 1, face: 'W', s: 6.8, y: F + 3.05, h: 0.6, text: 'ΘΧ', mat: red }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api;
      // pent roof over the ground-floor window group of the north wing (street end)
      { const R = faceRun(blocks[0], 'W'); K.rbox(R, mat(roof), 0.6, F + 2.6, 0, R.L - 0.6, F + 2.75, 0.75); K.rbox(R, mat(['paint', '#3a2e2a']), 0.6, F + 2.45, 0.55, R.L - 0.6, F + 2.62, 0.75); }
      // corner pilaster strips
      for (const [bi, f] of [[0, 'W'], [1, 'W'], [2, 'S']]) { const R = faceRun(blocks[bi], f); for (const s of [0.12, R.L - 0.12]) K.rbox(R, mat(['stucco', '#f6f5f0']), s - 0.22, F - 0.4, 0, s + 0.22, blocks[bi].eave - 0.1, 0.08); }
      // red-brick path up the lawn, low white-capped brick wall at the street
      { const R = faceRun(blocks[1], 'W'); const a = R.at(5.2, 3.8), c = R.at(8.4, 8.6); const uu = [a[0], c[0]].sort((x, y) => x - y), vv = [a[1], c[1]].sort((x, y) => x - y);
        for (let k = 0; k < 6; k++) { const u0 = uu[0] + (uu[1] - uu[0]) * k / 6, u1 = uu[0] + (uu[1] - uu[0]) * (k + 1) / 6; const g = Math.max(K.g(u0, vv[0]), K.g(u1, vv[1])); K.box(mat(brick), u0, g - 0.4, vv[0], u1, g + 0.04, vv[1]); } }
      gardenWall(api, [[-17.6, -12.0], [-17.6, 1.6]], { h: 0.6, t: 0.35, mat: brick, cap: ['stucco', '#f2f1ec'] });
      gardenWall(api, [[-17.6, 4.4], [-17.6, 11.0]], { h: 0.6, t: 0.35, mat: brick, cap: ['stucco', '#f2f1ec'] });
      hedge(api, [[-8.6, -2.6], [-8.6, 1.6]], { h: 0.9, t: 0.8 }); hedge(api, [[-8.6, 4.2], [-8.6, 8.8]], { h: 0.9, t: 0.8 });
    },
  }, { number: '2499' });
  r.object3d.name = 'theta-chi';
  return r;
}
