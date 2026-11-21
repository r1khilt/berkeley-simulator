// Pi Kappa Alpha (ΠΚΑ), 2324 Piedmont Avenue. Two-and-a-half-storey grey stucco Craftsman house on a raised basement:
// hipped main roof with deep bracketed eaves, a front-gabled wing to the north on Piedmont, a wide shed dormer, and a recessed
// entry porch with square white posts under a flat balcony whose panelled parapet carries the letters. One-storey rear wing.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-247336859',
  name: 'Pi Kappa Alpha',
  subtitle: 'ΠΚΑ · 2324 Piedmont Avenue',
  blurb: 'Chapter house of Pi Kappa Alpha on Piedmont Avenue, a grey stucco Craftsman house with deep eaves and a columned entry porch under the letters.',
  replaces: ['w/247336859'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -9.267, front: { block: 0, face: 'E', above: 1.0 }, storeyH: 3.0, ov: 0.85,
    wall: ['stucco', '#9ca0a3'], trim: ['paint', '#f2f2f0'], roof: ['roof', '#45484d'], base: ['stucco', '#84888c'], door: ['paint', '#8b1a1e'],
    win: { w: 0.95, h: 1.55, bay: 3.4, sill: 0.8, tran: 0.62, casing: 0.12, pair: true },
    blocks: [
      { u0: -6.62, u1: 7.0, v0: -9.57, v1: 9.0, eave: 9.6, roof: { type: 'hip', ridge: 13.0 }, noWin: { E: [[2.6, 9.0]] } },
      { u0: 1.5, u1: 9.17, v0: -9.57, v1: -1.0, eave: 9.6, roof: { type: 'gable', axis: 'u', ridge: 12.8, gableWin: false, brackets: true }, winAll: { pair: false, w: 0.9 }, win: { E: { nb: 1, pair: true, w: 1.0, mull: 1 } } },
      { u0: -10.86, u1: -6.62, v0: 1.05, v1: 8.08, eave: 5.9, storeys: 1, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'E', s: 5.6, w: 1.6, h: 2.3, fan: true }],
    porches: [{ block: 0, face: 'E', s0: 3.0, s1: 7.9, depth: 2.2, cols: 2, colStyle: 'square', colD: 0.32, rail: false, roofMat: ['paint', '#e8e8e6'],
      parapet: { h: 1.0, mat: ['paint', '#e8e8e6'] }, letters: { text: 'ΠΚΑ', mat: ['paint', '#7f8285'], h: 0.5 } }],
    dormers: [{ block: 0, side: 'E', s: 13.6, w: 4.0, h: 1.35, inset: 1.2, type: 'shed', nwin: 3 }],
    chimneys: [{ u: -2.0, v: -9.3, w: 0.9, d: 0.7, top: 14.0 }],
  }, { number: '2324' });
  r.object3d.name = 'building-247336859';
  return r;
}
