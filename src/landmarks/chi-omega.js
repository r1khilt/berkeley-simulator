// Chi Omega (ΧΩ), 2421 Piedmont Avenue. Large symmetrical red-brick Georgian Revival sorority house with a low hipped roof
// (LiDAR eaves ~10.8 m, ridge ~12.8 m), white 6-over-6 sashes with brick lintels, and a centred entrance between two Tuscan
// columns under a white swan-neck pediment, with gold ΧΩ letters above it.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'chi-omega',
  name: "Chi Omega",
  subtitle: "ΧΩ · 2421 Piedmont Avenue",
  blurb: "Chi Omega (Mu chapter) house on Piedmont Avenue, a large red-brick Georgian Revival house with a columned entrance under a swan-neck pediment.",
  replaces: ['w/473598592'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -7.123, front: { block: 0, face: 'W', above: 0.8 }, storeyH: 3.2, ov: 0.5,
    wall: ['brick', '#a24e3c'], trim: ['paint', '#f5f5f0'], roof: ['roof', '#3a3a3a'], base: ['brick', '#7f3a2b'], door: ['paint', '#f5f5f0'],
    win: { w: 0.95, h: 1.75, bay: 2.7, sill: 0.8, tran: 0.5, casing: 0.06, muntins: 2, sillMat: ['stone', '#e0dacb'] },
    blocks: [
      { u0: -18.62, u1: 16.23, v0: -9.05, v1: 6.78, eave: 10.7, roof: { type: 'hip', ridge: 12.9 }, win: { W: { nb: 6 } } },
      { u0: 3.72, u1: 16.23, v0: 6.78, v1: 12.09, eave: 10.4, roof: { type: 'hip', ridge: 11.8 } },
    ],
    doors: [{ block: 0, face: 'W', s: 7.92, w: 1.5, h: 2.5, fan: true }],
    porches: [{ block: 0, face: 'W', s0: 6.2, s1: 9.64, depth: 1.6, cols: 2, colD: 0.42, top: 4.6, colMat: ['paint', '#f8f8f4'], roofType: 'gable', rise: 1.1, roofMat: ['roof', '#3a3a3a'], pedWall: ['paint', '#f5f5f0'], rail: false }],
    letters: [{ block: 0, face: 'W', s: 7.92, y: 6.3, h: 0.55, text: 'ΧΩ', mat: ['metal', '#c9a74a'] }],
    chimneys: [{ u: -10, v: -8.7, w: 1.1, d: 0.7, top: 13.8, mat: ['brick', '#7f3a2b'] }, { u: 8, v: -8.7, w: 1.1, d: 0.7, top: 13.8, mat: ['brick', '#7f3a2b'] }],
  }, { number: '2421' });
  r.object3d.name = 'chi-omega';
  return r;
}
