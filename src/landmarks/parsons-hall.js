// Parsons Hall, Church Divinity School of the Pacific: a long mid-century seminary dormitory in putty stucco under a
// low roof, with projecting stair/lounge bays along its north side. No reliable photo was available; massing from the
// 2021 LiDAR (frame -9°).
import * as THREE from 'three';
import { hallBuild, chimney } from './lib/b08c-halls.js';
import { rectRuns, finishGround } from './lib/rn-b-ground.js';

export const info = {
  id: 'parsons-hall',
  name: "Parsons Hall",
  subtitle: 'Church Divinity School of the Pacific',
  blurb: "A residence hall of the Church Divinity School of the Pacific, the Episcopal seminary on Holy Hill.",
  replaces: ['w/190395142', 'way/190395142'],
};

export async function build(ctx) {
  const M = ctx.M;
  const blocks = [
    { u0: -35.5, u1: 35.5, v0: -3.0, v1: 3.6, g: 0.1, eave: 12.2, ridge: 13.7, axis: 'u' },
    { u0: -29.0, u1: -22.0, v0: -6.0, v1: -3.0, g: 0.2, eave: 12.2, ridge: 14.2, axis: 'v', roof: 'gable', faces: { S: false } },
    { u0: -16.5, u1: -9.0, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 14.2, axis: 'v', roof: 'gable', faces: { S: false } },
    { u0: -3.0, u1: 3.5, v0: -6.0, v1: -3.0, g: 0.2, eave: 12.2, ridge: 14.2, axis: 'v', roof: 'gable', faces: { S: false } },
    { u0: 10.0, u1: 16.5, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 14.2, axis: 'v', roof: 'gable', faces: { S: false } },
    { u0: 22.5, u1: 29.5, v0: -6.0, v1: -3.0, g: 0.0, eave: 12.2, ridge: 14.2, axis: 'v', roof: 'gable', faces: { S: false } },
  ];
  let G = { colliders: [], walkables: [] };
  // warm stucco, dark bronze trim, a concrete base course; fewer, larger window bays; the five stair/bay projections carry
  // their own front gables (LiDAR shows them rising above the main eave)
  const ST = M.stucco.clone(); ST.color = new THREE.Color(0xdcccad); ST.name = 'parsons:stucco';
  const TR = new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.6, name: 'parsons:trim' });
  for (const b of blocks) Object.assign(b, { mat: ST, corniceMat: TR, frame: TR, overhang: 0.7, bay: b.u1 - b.u0 > 30 ? 3.9 : 3.3, win: { w: 1.7, h: 1.5, mull: 1, tran: 0 } });
  const { object3d, colliders } = hallBuild(ctx, -9, 'midcentury', blocks, (K, st) => {
    G = finishGround(K, ctx, rectRuns(K, blocks.map((b) => ({ ...b, floor: b.g + 0.5 }))), { door: 'glass', n: 2, entry: { w: 2.4, h: 2.8, surround: K.M.concrete, canopy: { d: 2.0, t: 0.2 } }, bikes: 4, bench: true, plant: { h: 0.8, depth: 1.1 } });

  });
  object3d.name = 'parsons-hall';
  return { object3d, colliders: [...colliders, ...G.colliders], walkables: G.walkables };
}
