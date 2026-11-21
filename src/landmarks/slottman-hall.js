// Slottman Hall. 2000s infill residence hall: colour-blocked stucco and panel wings, glazed stair/lounge stacks.
// Massing: 1 m raster of roof levels fitted to the 2021 LiDAR inside the OSM footprint (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';

export const info = {
  id: 'slottman-hall',
  name: "Slottman Hall",
  subtitle: "Residence Halls Unit 1",
  blurb: "A newer residence hall added to Unit 1 in the 2000s along Durant Avenue, with stepped colour-blocked wings and glazed stair and lounge stacks.",
  replaces: ['w/62200987'],
};

const S = {"ang": -9.794, "u0": -26.823, "v0": -12.527, "res": 1.0, "nu": 54, "nv": 24, "lev": [16.4, 22.0, 25.0, 27.1], "grid": "00000000..............................................00000000..............................................00000000..............................................00000000...............033333........33333............0000000001111....222222233333...2222233333...02222....000000000111111112222222333333222222233333220222223333000000000111111112222222333333222222223332223322223333000000001111111112222233333333333333333322223322223333000000001111111112222333333333333333333333333332223333000000000111111112333333333333333333333222233332223333000000001111111112333333333333333333222222223332223333.00000001111111112222233333333333333322222223332222330.00000000001111112222233333333333333322222233332222220.00000000001111112222233322223333333333222233223333333.00000000001111111122233322223333333333222222223333333.00000000000111111112233222222333333222222222223333333000000000001111111112233322222333332222332222223333333000000000001111111112233333322333332223333222223333333000000000000111111112222233322222222223333222223333333.00000000000111222222222333332222222233333322333333333...0000000000..2222...00333332222200033333300333333333...............2222...003333........033333300333333333...............2211....03333.........33333000233333322......................................................"};

export async function build(ctx) {
  const style = { // refine-south-west: shared window glass + entrance/site details (lib/units-blocks.js opt-in)
    winMat: 'shared', site: { name: 'Slottman Hall' }, 
    seed: "slottman-hall", sh: 2.95, win: { w: 1.4, h: 1.6, sill: 0.85, gap: 3.0, pair: true },
    palette: [0xa9aeb3, 0x8f969e, 0x6f7f92, 0xc4c8cc, 0xb9bdc4, 0xd0d3d6],
    pick: (r) => (r.k === 0 ? (r.d % 2 ? 2 : 1) : r.len < 9 ? 3 : (r.d === 0 || r.d === 2 ? (r.idx % 3 === 1 ? 1 : 0) : (r.idx % 2 ? 2 : 0))),
    glazedRun: (r) => r.k > 0 && r.len >= 2.5 && r.len <= 5.2 && r.idx % 2 === 0,
    ground: true, baseHex: 0xa9a49a, coping: 0xc9ccd0, frameHex: 0xdde0e3, glassHex: 0x6f8fb0, parapet: 0.5,
  };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'slottman-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
