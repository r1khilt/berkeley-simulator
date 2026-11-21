// Rochdale Village Building B: part of the Berkeley Student Cooperative's Rochdale Village garden apartments (1960s Bay Region modern):
// stained board-and-batten wood siding with a few pale stucco stair/end blocks, flat roofs with thin deep fascias, aluminium
// sliders, and cantilevered walkway-balconies with wood railings. Block heights from the 2021 LiDAR.
import * as THREE from 'three';
import { shingleMat } from './lib/rsw-site.js';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';
import { doorBays, coopFinish } from './lib/rsw-coop.js';

export const info = {
  id: 'rochdale-village-building-b',
  name: 'Rochdale Village Building B',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'One of the wood-sided garden-apartment buildings of the Berkeley Student Cooperative’s Rochdale Village, set around a landscaped courtyard south of Haste Street.',
  replaces: ['w/183690577'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.5); const M = ctx.M;
  const style = {
    wall: shingleMat(ctx.M, 0x6f6050), trim: coopMat('paint', '#3a302a'), fascia: coopMat('paint', '#3a2e26'),
    rail: coopMat('metal', '#2e2e2e'), roofMat: coopMat('roof', '#5a5a58'), fh: 2.9, overhang: 0.75, bay: 3.4,
    win: { glass: ctx.M.windowNight, w: 1.0, h: 1.25, sill: 0.9, pattern: [2, 1, 4, 1, 2, 3], gap: 0.05, mull: 1, rev: 0.12, casing: 0.07, frame: coopMat('metal', '#4a4a48') },
  };
  const ALT = shingleMat(ctx.M, 0x857868); // refine-south-west: photos show weathered shingle throughout (no stucco); alt blocks get a silvered tone
  const rects = [
    { u0: -3.18, u1: 1.63, v0: -20.78, v1: -10.78, top: 14.7 },
    { u0: -3.18, u1: 1.63, v0: -10.78, v1: 2.22, top: 11.5 },
    { u0: -3.18, u1: 1.63, v0: 2.22, v1: 4.22, top: 12.8 },
    { u0: -3.18, u1: 1.63, v0: 4.22, v1: 6.22, top: 15.1, alt: true },
    { u0: -3.18, u1: 1.63, v0: 6.22, v1: 9.22, top: 13.9 },
    { u0: -3.18, u1: 1.63, v0: 9.22, v1: 15.83, top: 10.5 },
    { u0: 1.63, u1: 6.94, v0: -18.00, v1: 3.00, top: 15.1, walk: 'W' },
    { u0: 1.63, u1: 6.94, v0: 3.00, v1: 9.00, top: 15.0, roof: 'gable', rise: 2.0, axis: 'v' },
    { u0: 1.63, u1: 6.94, v0: 9.00, v1: 15.83, top: 9.4 },
    { u0: -11.12, u1: -4.53, v0: 6.98, v1: 15.83, top: 10.7 },
  ];
  // refine-south-west: shingle siding per BSC photos, entry doors with porch lights on the walkways, foundation planting, bikes/bins
  const blocks = gardenApartments(K, doorBays(rects.map((r) => (r.alt ? { ...r, mat: ALT } : r))), style);
  coopFinish(K, blocks, style, { door: coopMat('paint', '#5a4636') });
  return K.done('rochdale-village-building-b');
}
