// Oxford Research Unit: ranges of glass research greenhouses (white-painted steel frames, glazed gable roofs with ridge vents) on low
// concrete knee walls, with a service head-house at the west end. Massing from the LiDAR.
import * as THREE from 'three';
import { Kit, tint, solid, rect, greenhouse } from './lib/b02-kit.js';
export const info = {
  id: 'oxford-research-unit', name: 'Oxford Research Unit', subtitle: 'Research greenhouses',
  blurb: 'The Oxford Tract research greenhouses on the west edge of campus, where plant and microbial biology experiments are grown.',
  replaces: ['w/109187426', 'way/109187426'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5)); const M = ctx.M;
  const [u0, v0, u1, v1] = [-35.4, -21.7, 35.5, 21.7]; const nb = 4; const w = (v1 - v0) / nb;
  const GL = tint(M.glassLight, 0xa9c1c9, { opacity: 0.45 }); const C = tint(M.concrete, 0xcfcac0);
  for (let i = 0; i < nb; i++) { const a = v0 + i * w, b = a + w; const y0 = Math.max(K.g(u0, (a + b) / 2), K.g(u1, (a + b) / 2), K.g((u0 + u1) / 2, (a + b) / 2)) + 0.1;
    greenhouse(K, u0 + 6.0, a + 0.15, u1, b - 0.15, y0, 5.6, 2.9, { pitch: 1.5, glassMat: GL, wallMat: C }); }
  const yH = K.g(u0 + 3, (v0 + v1) / 2);
  K.box(C, u0, yH - 1, v0 + 0.2, u0 + 6.0, yH + 5.6 + 0.6, v1 - 0.2); K.box(tint(M.concrete, 0xaaa59b), u0 - 0.2, yH + 5.6 + 0.6, v0, u0 + 6.2, yH + 5.6 + 0.85, v1);
  for (let v = v0 + 2; v < v1 - 1; v += 4) K.box(M.windowNight, u0 - 0.03, yH + 1.2, v, u0 + 0.05, yH + 2.6, v + 1.4);
  const colliders = [K.colPoly(rect(u0, v0, u1, v1), -1, 5.6 + 2.9 + 2)];
  const object3d = K.finish(); object3d.name = 'oxford-research-unit';
  return { object3d, colliders, walkables: [] };
}
