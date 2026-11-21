// Rochdale Apartments: part of the Berkeley Student Cooperative's Rochdale Village garden apartments (1960s Bay Region modern):
// stained board-and-batten wood siding with a few pale stucco stair/end blocks, flat roofs with thin deep fascias, aluminium
// sliders, and cantilevered walkway-balconies with wood railings. Block heights from the 2021 LiDAR.
import * as THREE from 'three';
import { shingleMat } from './lib/rsw-site.js';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';
import { doorBays, coopFinish } from './lib/rsw-coop.js';

export const info = {
  id: 'rochdale-apartments',
  name: 'Rochdale Apartments',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Rochdale Apartments on Haste Street are part of the Berkeley Student Cooperative’s Rochdale Village, named after the Rochdale Pioneers who founded the modern co-operative movement in 1844.',
  replaces: ['w/183688276'],
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
    { u0: -35.99, u1: -30.91, v0: -8.49, v1: -5.49, top: 5.1 },
    { u0: -35.99, u1: -30.91, v0: -5.49, v1: 3.50, top: 9.9, roof: 'gable', rise: 1.9, axis: 'v' },
    { u0: 29.83, u1: 35.93, v0: -8.49, v1: 3.50, top: 11.7 },
    { u0: -30.91, u1: -19.41, v0: -7.35, v1: -1.35, top: 13.1, roof: 'gable', rise: 2.2, axis: 'u' },
    { u0: -30.91, u1: -19.41, v0: -1.35, v1: 3.65, top: 13.5 },
    { u0: -30.91, u1: -19.41, v0: 3.65, v1: 7.29, top: 7.5 },
    { u0: 25.79, u1: 29.83, v0: -7.35, v1: 0.65, top: 15.9 },
    { u0: 25.79, u1: 29.83, v0: 0.65, v1: 2.65, top: 16.9, alt: true },
    { u0: 25.79, u1: 29.83, v0: 2.65, v1: 7.29, top: 10.5 },
    { u0: -19.41, u1: -16.41, v0: -5.88, v1: 7.29, top: 12.6 },
    { u0: -16.41, u1: -3.56, v0: -5.88, v1: 7.29, top: 9.9, walk: 'S' },
    { u0: -0.83, u1: 1.17, v0: -5.88, v1: 1.70, top: 11.4 },
    { u0: 1.17, u1: 4.17, v0: -5.88, v1: 1.70, top: 15.0, alt: true },
    { u0: 4.17, u1: 16.17, v0: -5.88, v1: 1.70, top: 12.6 },
    { u0: 16.17, u1: 25.79, v0: -5.88, v1: 1.70, top: 16.0 },
    { u0: -3.56, u1: -0.83, v0: -1.35, v1: 1.65, top: 9.0 },
    { u0: 5.23, u1: 25.79, v0: 1.70, v1: 7.29, top: 13.3 },
  ];
  // refine-south-west: shingle siding per BSC photos, entry doors with porch lights on the walkways, foundation planting, bikes/bins
  const blocks = gardenApartments(K, doorBays(rects.map((r) => (r.alt ? { ...r, mat: ALT } : r))), style);
  coopFinish(K, blocks, style, { door: coopMat('paint', '#5a4636') });
  return K.done('rochdale-apartments');
}
