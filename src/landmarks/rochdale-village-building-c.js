// Rochdale Village Building C: part of the Berkeley Student Cooperative's Rochdale Village garden apartments (1960s Bay Region modern):
// stained board-and-batten wood siding with a few pale stucco stair/end blocks, flat roofs with thin deep fascias, aluminium
// sliders, and cantilevered walkway-balconies with wood railings. Block heights from the 2021 LiDAR.
import * as THREE from 'three';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';
import { doorBays, coopFinish } from './lib/rsw-coop.js';

export const info = {
  id: 'rochdale-village-building-c',
  name: 'Rochdale Village Building C',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'One of the wood-sided garden-apartment buildings of the Berkeley Student Cooperative’s Rochdale Village, set around a landscaped courtyard south of Haste Street.',
  replaces: ['w/183689093'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.5); const M = ctx.M;
  const style = {
    wall: coopMat('cedar', '#7a6452'), trim: coopMat('paint', '#3a302a'), fascia: coopMat('paint', '#3a2e26'),
    rail: coopMat('metal', '#2e2e2e'), roofMat: coopMat('roof', '#5a5a58'), fh: 2.9, overhang: 0.75, bay: 3.4,
    win: { w: 1.0, h: 1.25, sill: 0.9, pattern: [2, 1, 4, 1, 2, 3], gap: 0.05, mull: 1, rev: 0.12, casing: 0.07, frame: coopMat('metal', '#4a4a48') },
  };
  const ALT = coopMat('cedar', '#8b7a69'); // refine-south-west: photos show weathered shingle throughout (no stucco); alt blocks get a silvered tone
  const rects = [
    { u0: -11.51, u1: 11.51, v0: -6.20, v1: 6.19, top: 13.4, roof: 'gable', rise: 2.2, axis: 'u', walk: 'N' },
  ];
  // refine-south-west: shingle siding per BSC photos, entry doors with porch lights on the walkways, foundation planting, bikes/bins
  const blocks = gardenApartments(K, doorBays(rects.map((r) => (r.alt ? { ...r, mat: ALT } : r))), style);
  coopFinish(K, blocks, style, { door: coopMat('paint', '#5a4636') });
  return K.done('rochdale-village-building-c');
}
