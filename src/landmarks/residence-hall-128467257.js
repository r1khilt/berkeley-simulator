// Clark Kerr Campus one-storey residence pavilion beside the tennis courts (Spanish Colonial Revival): a low white stucco
// block under a shallow red clay-tile hipped roof, deep-set dark casements and a small arched entry. LiDAR: eaves ≈3.3 m, ridge ≈4.6 m.
import * as THREE from 'three';
import { Kit } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';

export const info = {
  id: 'residence-hall-128467257',
  name: 'Clark Kerr Residence Pavilion',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'A low white-stucco, red-tile pavilion among the Clark Kerr Campus residence halls, the former California School for the Deaf and Blind.',
  replaces: ['w/128467257'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-6.3));
  ckWing(K, ctx, { u0: -5.87, u1: 5.87, v0: -8.64, v1: 8.64, axis: 'v', roof: 'hip', eave: 3.3, ridge: 4.7, storeys: 1, ov: 0.6,
    faces: { W: { nb: 5, doors: [2], arch: true }, E: { nb: 5 }, N: { nb: 3 }, S: { nb: 3, doors: [1] } }, chim: [[1.5, 3.5]] });
  const colliders = [K.colPoly([[-5.87, -8.64], [5.87, -8.64], [5.87, 8.64], [-5.87, 8.64]], -2, 6)];
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
