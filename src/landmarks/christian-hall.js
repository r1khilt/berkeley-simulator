// Christian Hall. 2000s infill residence hall: colour-blocked stucco and panel wings, glazed stair/lounge stacks.
// Massing: 1 m raster of roof levels fitted to the 2021 LiDAR inside the OSM footprint (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';

export const info = {
  id: 'christian-hall',
  name: "Christian Hall",
  subtitle: "Residence Halls Unit 1",
  blurb: "A newer residence hall added to Unit 1 in the 2000s, filling the block edge between the 1960s towers with lower, colour-blocked wings, glazed stair and lounge stacks and a ground-floor common area.",
  replaces: ['w/62200983'],
};

const S = {"ang": -9.691, "u0": -27.664, "v0": -10.589, "res": 1.0, "nu": 55, "nv": 21, "lev": [16.3, 19.2, 25.0, 27.14], "grid": ".................03333.......23333...........................333..00000233333...000133333....0111....00.00000.......333..02222233333...222233333....1111...000000000......3333322222223333332222223333321111111110000000000......3333322222233333333222222333221111111110000000000......2333333333333222333333333332221111111110000000000......3333333322222233333333333333221111111110000000000......3333333222222333333333333333221111111110000000000......2333333222333333333333332333322221111110000000000.012222222233222333333333333333333332221111110000000000.033333332222223333333333333333333333321111111100000....033333332222223333333333333333233233321111111100000000..33333332222222222222333332222233223321111111100000000..33333332222222222222233332222333222221111111110000001..333333322332223322222333333333332222211111111100000122.333333322332223322222222333322222222211111111000000222.333333332222233222222222233222222222211111111000001222.333333332223333332222222233333222222211111111000001222.3333333...03333332222...033333222222211110..0000000122.3333333...033333........033333..............................................................................."};

export async function build(ctx) {
  const style = {
    seed: "christian-hall", sh: 2.95, win: { w: 1.4, h: 1.6, sill: 0.85, gap: 3.0, pair: true },
    palette: [0x7d8494, 0xe4dcb2, 0xe2c8c2, 0xa4a9b2, 0xb9bdc4, 0xd9d3c4],
    pick: (r) => (r.k === 0 ? (r.d % 2 ? 2 : 1) : r.len < 9 ? 3 : (r.d === 0 || r.d === 2 ? (r.idx % 3 === 1 ? 1 : 0) : (r.idx % 2 ? 2 : 0))),
    glazedRun: (r) => r.k > 0 && r.len >= 2.5 && r.len <= 5.2 && r.idx % 2 === 0,
    ground: true, baseHex: 0xa9a49a, coping: 0xc9ccd0, frameHex: 0xdde0e3, glassHex: 0x4a6a96, parapet: 0.5,
  };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'christian-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
