// Rochdale Village Building E: part of the Berkeley Student Cooperative's Rochdale Village garden apartments (1960s Bay Region modern):
// stained board-and-batten wood siding with a few pale stucco stair/end blocks, flat roofs with thin deep fascias, aluminium
// sliders, and cantilevered walkway-balconies with wood railings. Block heights from the 2021 LiDAR.
import * as THREE from 'three';
import { shingleMat } from './lib/rsw-site.js';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';
import { doorBays, coopFinish } from './lib/rsw-coop.js';

export const info = {
  id: 'rochdale-village-building-e',
  name: 'Rochdale Village Building E',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'One of the wood-sided garden-apartment buildings of the Berkeley Student Cooperative’s Rochdale Village, set around a landscaped courtyard south of Haste Street.',
  replaces: ['w/183688472'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.5); const M = ctx.M;
  const style = {
    wall: shingleMat(ctx.M, 0x9a8672), trim: coopMat('paint', '#3a302a'), fascia: coopMat('paint', '#3a2e26'),
    rail: coopMat('metal', '#2e2e2e'), roofMat: coopMat('roof', '#5a5a58'), fh: 2.9, overhang: 0.75, bay: 3.4,
    win: { glass: ctx.M.windowNight, w: 1.0, h: 1.25, sill: 0.9, pattern: [2, 1, 4, 1, 2, 3], gap: 0.05, mull: 1, rev: 0.12, casing: 0.07, frame: coopMat('metal', '#4a4a48') },
  };
  const ALT = shingleMat(ctx.M, 0xa89a88); // refine-south-west: photos show weathered shingle throughout (no stucco); alt blocks get a silvered tone
  const rects = [
    { u0: -1.98, u1: 3.12, v0: -20.49, v1: -11.49, top: 14.1 },
    { u0: -1.98, u1: 3.12, v0: -11.49, v1: -4.49, top: 14.6, roof: 'gable', rise: 1.9, axis: 'v' },
    { u0: -1.98, u1: 3.12, v0: -4.49, v1: 4.51, top: 10.8 },
    { u0: -1.98, u1: 3.12, v0: 4.51, v1: 9.51, top: 14.0 },
    { u0: -1.98, u1: 3.12, v0: 9.51, v1: 16.07, top: 8.8 },
    { u0: -7.58, u1: -1.98, v0: -17.99, v1: -10.99, top: 11.9 },
    { u0: -7.58, u1: -1.98, v0: -10.99, v1: 14.01, top: 10.8, roof: 'gable', rise: 2.1, axis: 'v', walk: 'W' },
    { u0: 3.12, u1: 4.72, v0: -17.99, v1: 10.01, top: 13.9 },
    { u0: 3.12, u1: 4.72, v0: 10.01, v1: 16.01, top: 10.0 },
    { u0: 4.72, u1: 11.43, v0: 7.05, v1: 16.05, top: 10.3 },
  ];
  // refine-south-west: shingle siding per BSC photos, entry doors with porch lights on the walkways, foundation planting, bikes/bins
  const blocks = gardenApartments(K, doorBays(rects.map((r) => (r.alt ? { ...r, mat: ALT } : r))), style);
  coopFinish(K, blocks, style, { door: coopMat('paint', '#5a4636') });
  return K.done('rochdale-village-building-e');
}
