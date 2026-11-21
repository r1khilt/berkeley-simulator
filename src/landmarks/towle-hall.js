// Towle Hall. 2000s infill residence hall: colour-blocked stucco and panel wings, glazed stair/lounge stacks.
// Massing: 1 m raster of roof levels fitted to the 2021 LiDAR inside the OSM footprint (lib/units-blocks.js).
import * as THREE from 'three';
import { blocks } from './lib/units-blocks.js';

export const info = {
  id: 'towle-hall',
  name: "Towle Hall",
  subtitle: "Residence Halls Unit 2",
  blurb: "A newer residence hall added to Unit 2 in the 2000s; it is Christian Hall's twin, with lower colour-blocked wings and glazed stair and lounge stacks between the 1960s towers.",
  replaces: ['w/109192571'],
};

const S = {"ang": -9.98, "u0": -27.647, "v0": -10.76, "res": 1.0, "nu": 54, "nv": 20, "lev": [16.2, 21.9, 25.0, 26.65, 29.05], "grid": ".................33333.......33333.........................011....0000033333.......33333...01111...000000000.....144....2222233333...222233333...01111...000000000.....4444222222223333322222223333321111111100000000000.....4444222222222333322222222323321111111100000000000.....4444333322222223333333222322221111111100000000000.....4444233322222223333333333332221111111100000000000.....4444233222222333333333323332221111111100000000000022224444333223323333333333333333222211111100000000000022222222232233333333333333333333222221111100000000000033333322222233333333333333333322233321111100000000...04444442222223333333333333333333223331111111100000000004444442222222333333333333333223223331111111110000000004444443222223333333333333333233223331111111110000000004444443223333333333333333333333222221111111110000000014444442223333333222222233333332222221111111110000000014444443222333332222222233333322222221111111110000000034444443322233333322222223333332222221111111110000000033333333300033333322222..33333322222211111000000000000133333333000333330.......33333300000011111000000000000"};

export async function build(ctx) {
  const style = { // refine-south-west: shared window glass + entrance/site details (lib/units-blocks.js opt-in)
    winMat: 'shared', site: { name: 'Towle Hall' }, 
    seed: "towle-hall", sh: 2.95, win: { w: 1.4, h: 1.6, sill: 0.85, gap: 3.0, pair: true },
    palette: [0xc8653c, 0xd9b956, 0x4a4f55, 0xa9adb0, 0xcfd0cc, 0xe0dccf],
    pick: (r) => (r.k === 0 ? 2 : r.len < 6 ? 2 : (r.idx % 3 === 0 ? 1 : 0)), // charcoal base + short bays, burnt-orange / mustard panels
    glazedRun: (r) => r.k > 0 && r.len >= 2.5 && r.len <= 5.2 && r.idx % 2 === 0,
    ground: true, baseHex: 0xa9a49a, coping: 0xc9ccd0, frameHex: 0xdde0e3, glassHex: 0x5d6f78, parapet: 0.5,
  };
  const r = blocks(ctx, S, style);
  r.object3d.name = 'towle-hall';
  return { object3d: r.object3d, colliders: r.colliders, walkables: r.walkables };
}
