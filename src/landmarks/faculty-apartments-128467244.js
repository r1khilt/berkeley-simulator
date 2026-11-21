// Clark Kerr Campus faculty apartments (Tanglewood Road building), former California School for the Deaf and Blind:
// a rambling two/three-storey Spanish Colonial Revival group of white stucco wings under red clay-tile roofs — a taller
// west wing with a steep gable, a long low north range, a gabled cross wing and an east range — around a south-facing
// garden court. Massing from the 2021 LiDAR (west wing eaves ≈11 m, ridge ≈13 m; other ranges eaves ≈9 m).
import * as THREE from 'three';
import { Kit } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';

export const info = {
  id: 'faculty-apartments-128467244',
  name: 'Faculty Apartments',
  subtitle: 'Clark Kerr Campus',
  blurb: 'White-stucco, red-tile apartments on the Clark Kerr Campus, the former California School for the Deaf and Blind, now part of UC Berkeley.',
  replaces: ['w/128467244'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.9));
  const W = ckWing(K, ctx, { u0: -32.18, u1: -18.34, v0: -13.29, v1: 14.15, axis: 'v', faces: { E: { skip: [0, 1, 2] , doors: [6] }, S: { doors: [2] }, W: { doors: [4] } }, chim: [[-25.3, -4]] });
  const N = ckWing(K, ctx, { u0: -18.34, u1: 18.11, v0: -13.4, v1: -2.29, axis: 'u', ground: W.g0, faces: { W: false, E: { nb: 3 }, S: { skip: [9, 10], doors: [2, 6] } }, chim: [[-8, -7.8], [8, -7.8]] });
  const X = ckWing(K, ctx, { u0: 10.49, u1: 20.71, v0: -2.29, v1: 15.9, axis: 'v', ground: W.g0, faces: { N: { blank: true }, E: { skip: [] }, W: { doors: [2] } } });
  const E = ckWing(K, ctx, { u0: 20.71, u1: 38.08, v0: 0.68, v1: 14.23, axis: 'u', ground: W.g0 + 0.6, faces: { W: false, N: { doors: [2] } } });
  const colliders = [K.colPoly([[-32.18, -13.29], [18.11, -13.29], [18.11, 0.68], [38.08, 0.68], [38.08, 14.23], [20.71, 15.9], [10.49, 15.9], [10.49, -2.29], [-18.34, -2.29], [-18.34, 14.15], [-32.18, 14.15]], -2, 15)];
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
