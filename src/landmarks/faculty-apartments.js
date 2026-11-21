// Clark Kerr Campus faculty apartments (north building), part of the former California School for the Deaf and Blind:
// a narrow two-storey Spanish Colonial Revival range of white stucco under low red clay-tile hipped roofs, stepping up the
// slope toward the hills, with a one-storey wing on its west side. LiDAR: eaves ≈5–6 m, ridges ≈6.6–7.8 m.
import * as THREE from 'three';
import { Kit } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';

export const info = {
  id: 'faculty-apartments',
  name: 'Faculty Apartments',
  subtitle: 'Clark Kerr Campus',
  blurb: 'White-stucco, red-tile apartments on the Clark Kerr Campus, the former California School for the Deaf and Blind, now part of UC Berkeley.',
  replaces: ['w/128467223'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.8));
  const A = ckWing(K, ctx, { u0: -4.0, u1: 4.45, v0: -6.95, v1: 17.4, axis: 'v', roof: 'hip', storeys: 2, floorH: 2.8, eave: 5.1, ridge: 6.7, win: { w: 1.1, h: 1.3 },
    faces: { W: { doors: [3, 6] }, S: { nb: 2, doors: [0] }, N: false } });
  const B = ckWing(K, ctx, { u0: -1.72, u1: 4.45, v0: -19.32, v1: -6.95, axis: 'v', roof: 'hip', storeys: 2, floorH: 2.8, ground: A.g0 + 0.8, eave: 6.6, ridge: 7.9, win: { w: 1.1, h: 1.3 },
    faces: { W: { doors: [1] }, N: { nb: 2 } }, chim: [[1.4, -12]] });
  const C = ckWing(K, ctx, { u0: -7.08, u1: -4.0, v0: -6.95, v1: 1.71, axis: 'v', roof: 'shed', low: 'W', storeys: 1, ground: A.g0, eave: 4.3, ridge: 5.2, faces: { E: false, W: { nb: 2, doors: [0] } } });
  const colliders = [K.colPoly([[-7.08, -6.95], [-1.72, -6.95], [-1.72, -19.32], [4.45, -19.32], [4.45, 17.4], [-4.0, 17.4], [-4.0, 1.71], [-7.08, 1.71]], -2, 9)];
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
