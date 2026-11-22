// Clark Kerr Campus residence hall (former California School for the Deaf and Blind, Spanish Colonial Revival, 1920s;
// renewed for student housing). Three-storey white stucco wings with red clay-tile gable roofs: a long north–south range
// and an east–west wing at the south end, fronted on the west by a long one-storey colonnaded veranda with a shed tile roof.
// Massing from the 2021 LiDAR: eaves ≈10 m, ridges 11.5–13 m above the low (west) side; the site rises ≈4 m to the east.
// [r4-sweep-outer] ckWing reads packet.lidarTop: this comment makes manifest.mjs keep the LiDAR grid in the slim packet.
import * as THREE from 'three';
import { Kit, pal } from './lib/b08a-kit.js';
import { ckWing, veranda } from './lib/b08a-mission.js';

export const info = {
  id: 'residence-hall-128467227',
  name: 'Clark Kerr Residence Hall',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'One of the white-stucco, red-tile residence halls of the Clark Kerr Campus, the former California School for the Deaf and Blind, now UC Berkeley student housing.',
  replaces: ['w/128467227'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.1));
  const colliders = [], walkables = [];
  const A = ckWing(K, ctx, { u0: -5.5, u1: 8.7, v0: -33.9, v1: -10.1, axis: 'v', faces: { W: { doors: [3] }, N: { nb: 4, doors: [1] } }, chim: [[0.6, -28.5]] });
  const B = ckWing(K, ctx, { u0: -5.5, u1: 3.0, v0: -10.1, v1: 20.5, axis: 'v', ground: A.g0, faces: { N: false, S: false, W: { doors: [2, 7] } } });
  const C = ckWing(K, ctx, { u0: -5.5, u1: 22.3, v0: 20.5, v1: 30.7, axis: 'u', ground: A.g0, faces: { E: { doors: [1] }, N: { skip: [0, 1] } } });
  const ver = veranda(K, ctx, { u0: -10.1, u1: -5.5, v0: -38.8, v1: 30.7, side: 'W', yLow: A.g0 + 3.2, yHigh: A.g0 + 4.3, g: A.g0 + 0.05, step: 3.2 });
  walkables.push(ver.walk);
  for (const [u, v] of ver.cols) colliders.push(K.colCyl(u, v, 0.22, A.g0 - 1, A.g0 + 3));
  colliders.push(K.colPoly([[-5.5, -33.9], [8.7, -33.9], [8.7, -10.1], [3.0, -10.1], [3.0, 20.5], [22.3, 20.5], [22.3, 30.7], [-5.5, 30.7]], -2, 14));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables };
}
