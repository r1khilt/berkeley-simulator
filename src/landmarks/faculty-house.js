// Clark Kerr Campus Faculty House at Derby and South streets (Spanish Colonial Revival cottage of the former California
// School for the Deaf and Blind): two low storeys of white stucco under a red clay-tile gable roof, dark casements,
// a stucco chimney and an arched front door. LiDAR: eaves ≈5.6 m, ridge ≈8 m.
// [r4-sweep-outer] ckWing reads packet.lidarTop: this comment makes manifest.mjs keep the LiDAR grid in the slim packet.
import * as THREE from 'three';
import { Kit, pal, porch } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';

export const info = {
  id: 'faculty-house',
  name: 'Faculty House',
  subtitle: 'Clark Kerr Campus',
  blurb: 'A small white-stucco, red-tile house on the edge of the Clark Kerr Campus, the former California School for the Deaf and Blind.',
  replaces: ['w/128467248'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-3.6));
  const A = ckWing(K, ctx, { u0: -7.4, u1: 7.4, v0: -3.87, v1: 3.87, axis: 'u', eave: 5.6, ridge: 8.1, storeys: 2, floorH: 2.8, win: { w: 1.1, h: 1.35 },
    faces: { S: { nb: 4, doors: [1], arch: true }, N: { nb: 4, doors: [2] }, E: { nb: 1 }, W: { nb: 1 } }, chim: [[-5.4, 0.0]] });
  const colliders = [K.colPoly([[-7.4, -3.87], [7.4, -3.87], [7.4, 3.87], [-7.4, 3.87]], -2, 9)];
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
