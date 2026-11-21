// Delta Kappa Epsilon (ΔΚΕ), 2302 Piedmont Avenue at Bancroft Way. Two-and-a-half-storey Arts-and-Crafts house with Tudor
// hints: off-white stucco over a dark-stained base storey, a broad side-gabled roof with a large central front gable facing
// Piedmont (gold letters under its attic windows), lower gabled wings either side, deep bargeboards and two brick chimneys.
import { rseHouse } from './lib/rse-finish.js';
import { rafters } from './lib/b12-greek.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-312181848',
  name: 'Delta Kappa Epsilon',
  subtitle: 'ΔΚΕ · 2302 Piedmont Avenue',
  blurb: 'The DKE house at Piedmont Avenue and Bancroft Way, an Arts-and-Crafts house with a big central gable over Piedmont carrying the letters.',
  replaces: ['w/312181848'],
};

export async function build(ctx) {
  const gold = ['metal', '#c9a66b'];
  const r = rseHouse(ctx, {
    ang: -8.893, front: { block: 0, face: 'E', above: 0.9 }, storeyH: 3.0, ov: 0.7,
    wall: ['stucco', '#e2e3df'], trim: ['paint', '#2c3a30'], roof: ['roof', '#5e625c'], base: ['brick', '#7a3e33'], // refine-south-east: stucco ground floor, muted brick base door: ['paint', '#8a5a3a'], frame: ['paint', '#2c3a30'],
    win: { w: 0.75, h: 1.35, bay: 3.1, sill: 0.85, tran: 0.7, casing: 0.1, pair: true, mull: 1, muntins: 2 },
    blocks: [
      { u0: -9.21, u1: 6.5, v0: -11.77, v1: 11.62, eave: 9.4, roof: { type: 'hip', ridge: 12.2, ov: 0.9 } }, // refine-south-east: hipped ends, lower ridge
      { u0: 0.3, u1: 6.5, v0: -3.6, v1: 3.6, eave: 9.9, noWalls: true, roof: { type: 'gable', axis: 'u', ridge: 12.6, ov: 0.9, noGableWin: ['W'], gableWin: { w: 2.0, h: 1.0, dy: 1.0 } } },
      { u0: 3.75, u1: 10.28, v0: 6.41, v1: 13.97, eave: 6.0, storeys: 1, roof: { type: 'gable', axis: 'u', ridge: 8.8, ov: 0.9, gableWin: { w: 1.4, h: 0.8 } } },
      { u0: 6.5, u1: 10.28, v0: -11.77, v1: -4.27, eave: 6.0, storeys: 1, roof: { type: 'gable', axis: 'u', ridge: 8.8, ov: 0.9, gableWin: { w: 1.4, h: 0.8 } } },
      { u0: -9.21, u1: -3.55, v0: -13.22, v1: -11.77, eave: 9.4, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'E', s: 11.6, w: 1.2, h: 2.3, fan: true }],
    letters: [{ block: 1, face: 'E', s: 3.6, y: 9.7, h: 0.6, text: 'ΔΚΕ', mat: gold }],
    extra: (api) => { rafters(api, 2, { faces: ['N', 'S'], spacing: 0.6, mat: ['paint', '#3a3528'] }); rafters(api, 3, { faces: ['N', 'S'], spacing: 0.6, mat: ['paint', '#3a3528'] }); rafters(api, 0, { spacing: 0.6, mat: ['paint', '#3a3528'] }); },
    porches: [{ block: 2, face: 'E', s0: 0.5, s1: 7.0, depth: 2.6, cols: 3, colStyle: 'square', colD: 0.55, colMat: ['brick', '#7a3e33'], rail: false, roofMat: ['roof', '#56595a'] }, { block: 3, face: 'E', s0: 0.4, s1: 7.1, depth: 2.6, cols: 3, colStyle: 'square', colD: 0.55, colMat: ['brick', '#7a3e33'], rail: false, roofMat: ['roof', '#56595a'] }],
    chimneys: [{ u: -2.5, v: 11.0, w: 1.0, d: 0.7, top: 14.6, mat: ['brick', '#a24a38'] }, { u: -2.5, v: -11.2, w: 1.0, d: 0.7, top: 14.6, mat: ['brick', '#a24a38'] }],
  }, { number: '2302' });
  r.object3d.name = 'building-312181848';
  return r;
}
