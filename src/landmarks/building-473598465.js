// Kappa Alpha Theta (ΚΑΘ), 2723 Durant Avenue. 1920s Mediterranean Revival sorority house: pale stucco, low red-tile hipped roofs
// (LiDAR ~13-14.5 m), a U-shaped front on Durant with projecting wings, an arched ground-floor loggia under an upper loggia,
// a crest medallion and a brick terrace wall.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-473598465',
  name: "Kappa Alpha Theta",
  subtitle: "ΚΑΘ · 2723 Durant Avenue",
  blurb: "Kappa Alpha Theta (Omega chapter) house on Durant Avenue, a 1920s Mediterranean house whose U-shaped front frames an arched loggia.",
  replaces: ['w/473598465'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.616, front: { block: 0, face: 'S', above: 1.0 }, storeyH: 3.3, ov: 0.6,
    wall: ['stucco', '#e2ddd0'], trim: ['paint', '#d6cfbf'], frame: ['paint', '#3a2e28'], roof: ['tile', '#bf6a4a'], base: ['brick', '#7a4434'], door: ['paint', '#3a2e28'],
    win: { w: 0.7, h: 1.6, bay: 2.7, sill: 0.8, tran: 0.68, casing: 0, pair: true, mull: 1 }, belt: false, frieze: false,
    blocks: [
      { u0: -20.82, u1: 21.8, v0: -6.79, v1: 3.18, eave: 12.4, roof: { type: 'hip', ridge: 14.6 } },
      { u0: -20.82, u1: -4.45, v0: 3.18, v1: 12.3, eave: 11.0, roof: { type: 'hip', ridge: 12.6 } },
      { u0: 11.41, u1: 21.8, v0: 3.18, v1: 7.49, eave: 11.0, roof: { type: 'hip', ridge: 12.8 } },
      { u0: 9.41, u1: 21.8, v0: -11.9, v1: -6.79, eave: 12.0, roof: { type: 'hip', ridge: 13.8 } },
      { u0: -5.95, u1: 9.41, v0: -8.93, v1: -6.79, eave: 12.0, roof: { type: 'hip', ridge: 13.2 } },
    ],
    doors: [{ block: 0, face: 'S', s: 25.4, w: 1.4, h: 2.4, arch: true }],
    porches: [{ block: 0, face: 'S', s0: 22.0, s1: 28.8, depth: 2.6, cols: 3, colD: 0.34, colMat: ['stone', '#e0ddd4'], roofMat: ['tile', '#bf6a4a'], fascia: ['stucco', '#e2ddd0'], balcony: true, letters: { text: 'ΚΑΘ', mat: ['paint', '#2a2a2a'], h: 0.32 } }],
    extra: ({ K, faceRun, blocks, mat }) => { // brick terrace wall along the front court
      const b = blocks[0]; const R = faceRun(b, 'S'); const bm = mat(['brick', '#7a4434']);
      K.rbox(R, bm, 16.4, -0.8, 5.6, 32.2, 1.0, 5.9); K.rbox(R, mat(['stone', '#d9d2c2']), 16.3, 1.0, 5.55, 32.3, 1.12, 5.95);
      const cg = K.ctx.THREE ? null : null;
    },
  }, { number: '2723' });
  r.object3d.name = 'building-473598465';
  return r;
}
