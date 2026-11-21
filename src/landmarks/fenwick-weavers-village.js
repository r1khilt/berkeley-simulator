// Fenwick Weavers' Village, 2415 Dwight Way: Berkeley Student Cooperative apartments. Three-storey flat-roofed wings in stained
// board-and-batten with pale stucco stair blocks, wrapped around landscaped courtyards, with open walkway-balconies.
// Heights from the 2021 LiDAR (flat roofs ~10 m above datum).
import * as THREE from 'three';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';
import { doorBays, coopFinish } from './lib/rsw-coop.js';

export const info = {
  id: 'fenwick-weavers-village',
  name: 'Fenwick Weavers\' Village',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Fenwick Weavers’ Village is a Berkeley Student Cooperative apartment complex on Dwight Way, three-storey wings of apartments wrapped around landscaped courtyards next to Rochdale Village.',
  replaces: ['w/183687973'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.1); const M = ctx.M;
  const style = {
    wall: coopMat('cedar', '#5c4636'), trim: coopMat('paint', '#e8e4d8'), fascia: coopMat('paint', '#3a2e26'),
    rail: coopMat('paint', '#5a4a3c', { rough: 0.85 }), roofMat: coopMat('roof', '#5a5a58'), fh: 2.9, overhang: 0.75, bay: 3.4,
    win: { w: 1.0, h: 1.25, sill: 0.9, pattern: [2, 1, 3, 2, 1], gap: 0.06, mull: 1, rev: 0.12, casing: 0.07, frame: coopMat('paint', '#e8e4d8') },
  };
  const ALT = coopMat('cedar', '#6b5644'); // refine-south-west: photos show weathered shingle throughout (no stucco); alt blocks get a silvered tone
  const rects = [
    { u0: -19.60, u1: 2.81, v0: -37.25, v1: -23.44, top: 10.6, walk: 'S' },
    { u0: 2.81, u1: 4.94, v0: -32.71, v1: -23.44, top: 9.6, alt: true },
    { u0: -19.60, u1: -7.78, v0: -23.44, v1: -1.19, top: 10.4, walk: 'E' },
    { u0: -13.53, u1: -7.78, v0: -1.19, v1: 1.45, top: 10.4, alt: true },
    { u0: -6.52, u1: 2.81, v0: -8.03, v1: 9.34, top: 10.4 },
    { u0: -6.52, u1: 2.81, v0: 19.82, v1: 32.55, top: 10.0, walk: 'W' },
    { u0: 2.81, u1: 6.11, v0: 30.75, v1: 32.55, top: 10.0, alt: true },
    { u0: 6.11, u1: 9.03, v0: 29.05, v1: 37.12, top: 10.0, alt: true },
    { u0: 9.03, u1: 22.15, v0: 3.70, v1: 37.12, top: 9.9, walk: 'W' },
  ];
  // refine-south-west: shingle siding per BSC photos, entry doors with porch lights on the walkways, foundation planting, bikes/bins
  const blocks = gardenApartments(K, doorBays(rects.map((r) => (r.alt ? { ...r, mat: ALT } : r))), style);
  coopFinish(K, blocks, style, { door: coopMat('paint', '#2f4a5a') });
  return K.done('fenwick-weavers-village');
}
