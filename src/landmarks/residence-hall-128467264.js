// Clark Kerr Campus residence hall (former California School for the Deaf and Blind, Spanish Colonial Revival).
// A three-storey north–south range with a red-tile gable roof, a lower two-storey east–west wing across its north end,
// and a one-storey shed-roofed wing tucked into the angle. White stucco, dark steel casements, tile ridge caps.
// Massing from the 2021 LiDAR (main eaves ≈10 m, ridge ≈12.5 m; north wing ridge ≈9.5 m).
// [r4-sweep-outer] ckWing reads packet.lidarTop: this comment makes manifest.mjs keep the LiDAR grid in the slim packet.
import * as THREE from 'three';
import { Kit } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';

export const info = {
  id: 'residence-hall-128467264',
  name: 'Clark Kerr Residence Hall',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'One of the white-stucco, red-tile residence halls of the Clark Kerr Campus, the former California School for the Deaf and Blind, now UC Berkeley student housing.',
  replaces: ['w/128467264'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.3));
  const A = ckWing(K, ctx, { u0: -1.3, u1: 11.8, v0: -10.75, v1: 29.8, axis: 'v', faces: { N: { blank: true }, W: { doors: [4, 10] }, E: { doors: [6] }, S: { nb: 4, doors: [1] } }, chim: [[5.3, 4.0], [5.3, 20.0]] });
  const B = ckWing(K, ctx, { u0: -20.25, u1: 11.8, v0: -20.4, v1: -10.75, axis: 'u', ground: A.g0, storeys: 2, faces: { S: { skip: [7, 8, 9] }, W: { nb: 2, doors: [0] } }, chim: [[-12, -15.6]] });
  const C = ckWing(K, ctx, { u0: -20.25, u1: -1.3, v0: -10.75, v1: -4.2, roof: 'shed', low: 'S', ground: A.g0, storeys: 1, faces: { N: false, E: false, S: { nb: 5, doors: [2] } } });
  const colliders = [K.colPoly([[-20.25, -20.4], [11.8, -20.4], [11.8, 29.8], [-1.3, 29.8], [-1.3, -4.2], [-20.25, -4.2]], -2, 14)];
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
