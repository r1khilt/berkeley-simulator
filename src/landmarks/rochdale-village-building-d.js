// Rochdale Village Building D: part of the Berkeley Student Cooperative's Rochdale Village garden apartments (1960s Bay Region modern):
// stained board-and-batten wood siding with a few pale stucco stair/end blocks, flat roofs with thin deep fascias, aluminium
// sliders, and cantilevered walkway-balconies with wood railings. Block heights from the 2021 LiDAR.
import * as THREE from 'three';
import { CoopKit, coopMat, gardenApartments } from './lib/coop-kit.js';

export const info = {
  id: 'rochdale-village-building-d',
  name: 'Rochdale Village Building D',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'One of the wood-sided garden-apartment buildings of the Berkeley Student Cooperative’s Rochdale Village, set around a landscaped courtyard south of Haste Street.',
  replaces: ['w/183688471'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.5); const M = ctx.M;
  const style = {
    wall: coopMat('batten', '#7a5a40'), trim: coopMat('paint', '#3a2e26'), fascia: coopMat('paint', '#3a2e26'),
    rail: coopMat('paint', '#8a6a4a', { rough: 0.85 }), roofMat: coopMat('roof', '#5a5a58'), fh: 2.9, overhang: 0.75, bay: 3.4,
    win: { w: 1.0, h: 1.25, sill: 0.9, pattern: [2, 1, 4, 1, 2, 3], gap: 0.05, mull: 1, rev: 0.12, casing: 0.07, frame: coopMat('metal', '#a9aba8') },
  };
  const ALT = coopMat('stucco', '#cbbfa8');
  const rects = [
    { u0: -15.70, u1: -7.22, v0: -5.45, v1: 7.08, top: 10.8, alt: true },
    { u0: -10.71, u1: -7.22, v0: -7.92, v1: -5.45, top: 9.8 },
    { u0: -7.22, u1: 11.07, v0: -7.11, v1: 6.39, top: 13.4, roof: 'shed', rise: 2.4, low: 'S', walk: 'N' },
    { u0: 11.07, u1: 15.84, v0: -5.45, v1: 6.39, top: 12.6 },
  ];
  gardenApartments(K, rects.map((r) => (r.alt ? { ...r, mat: ALT } : r)), style);
  return K.done('rochdale-village-building-d');
}
