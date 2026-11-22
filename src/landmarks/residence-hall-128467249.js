// Clark Kerr Campus residence hall at the north-west corner of the campus (Spanish Colonial Revival, former California
// School for the Deaf and Blind): a long three-storey north–south range of white stucco under red clay-tile gables, a wing
// angled off its north end toward the playing fields, a colonnaded one-storey veranda along the lower west side and a
// small one-storey annex at the south-west corner. Massing from the 2021 LiDAR (eaves ≈12 m, ridge ≈14.5 m above the
// low south-west corner; the site rises ≈6 m to the north-east).
// [r4-sweep-outer] ckWing reads packet.lidarTop: this comment makes manifest.mjs keep the LiDAR grid in the slim packet.
import * as THREE from 'three';
import { Kit, mergeKits } from './lib/b08a-kit.js';
import { ckWing, veranda } from './lib/b08a-mission.js';

export const info = {
  id: 'residence-hall-128467249',
  name: 'Clark Kerr Residence Hall',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'One of the white-stucco, red-tile residence halls of the Clark Kerr Campus, the former California School for the Deaf and Blind, now UC Berkeley student housing.',
  replaces: ['w/128467249'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-15.5));
  const colliders = [], walkables = [];
  const A = ckWing(K, ctx, { u0: -7.6, u1: 6.75, v0: -28.9, v1: 5.8, axis: 'v', faces: { S: { skip: [0, 1] }, W: { doors: [3, 8] }, E: { doors: [5] }, N: { skip: [2, 3] } }, chim: [[-1, -14]] });
  const B = ckWing(K, ctx, { u0: -7.2, u1: 1.5, v0: 5.8, v1: 21.0, axis: 'v', ground: A.g0, faces: { N: false, S: false, W: { doors: [2] } } });
  const C = ckWing(K, ctx, { u0: -7.2, u1: 7.8, v0: 21.0, v1: 36.3, axis: 'v', ground: A.g0, faces: { N: { skip: [0, 1] }, S: { doors: [2] } }, chim: [[0.3, 30]] });
  ckWing(K, ctx, { u0: -13.5, u1: -7.2, v0: 29.0, v1: 36.5, axis: 'u', roof: 'hip', ground: A.g0, storeys: 1, eave: A.g0 + 3.6, ridge: A.g0 + 5.4, faces: { E: false } });
  const ver = veranda(K, ctx, { u0: -9.9, u1: -7.2, v0: 8.0, v1: 29.0, side: 'W', yLow: A.g0 + 3.3, yHigh: A.g0 + 4.3, g: A.g0 + 0.05 });
  walkables.push(ver.walk); for (const [u, v] of ver.cols) colliders.push(K.colCyl(u, v, 0.25, A.g0 - 1, A.g0 + 3));
  colliders.push(K.colPoly([[-7.6, -28.9], [6.75, -28.9], [6.75, 5.8], [1.5, 5.8], [1.5, 21], [7.8, 21], [7.8, 36.3], [-7.2, 36.3], [-7.2, 5.8], [-7.6, 5.8]], -2, 16));
  // wing angled off the north end (second building frame aligned with it)
  const K2 = new Kit(ctx, THREE.MathUtils.degToRad(-29.5));
  const fp = ctx.footprints[0].outer; const pts = [1, 2, 3, 4].map((i) => K2.uv(fp[i][0], fp[i][1]));
  const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
  const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
  ckWing(K2, ctx, { u0: u0 + 3.5, u1, v0, v1, axis: 'u', ground: A.g0, faces: { W: false, N: { doors: [3] } }, chim: [[u1 - 6, (v0 + v1) / 2]] });
  colliders.push(K2.colPoly([[u0 + 3.5, v0], [u1, v0], [u1, v1], [u0 + 3.5, v1]], -2, 16));
  const object3d = mergeKits([K.finish(), K2.finish()]); object3d.name = info.id;
  return { object3d, colliders, walkables };
}
