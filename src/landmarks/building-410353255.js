// Theta Delta Chi (ΘΔΧ), 2647 Durant Avenue. Ivy-clad Tudor Revival house, two storeys plus attic: a steep front-gabled wing
// with half-timbering and carved bargeboards on the left, a hipped main block with small flat-roofed dormers, a recessed
// round-arched entry and a two-storey canted oriel on the right; white letters under the eave.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-410353255',
  name: 'Theta Delta Chi',
  subtitle: 'ΘΔΧ · 2647 Durant Avenue',
  blurb: 'Chapter house of Theta Delta Chi on Durant Avenue, an ivy-covered Tudor Revival house with a half-timbered front gable.',
  replaces: ['w/410353255'],
};

export async function build(ctx) {
  const brown = ['paint', '#5a3e32'];
  const r = greekHouse(ctx, {
    ang: -9.819, front: { block: 0, face: 'S', above: 0.7 }, storeyH: 3.0, ov: 0.55,
    wall: ['stucco', '#a29e8c'], trim: brown, frame: brown, roof: ['roof', '#3a3b3e'], base: ['brick', '#8d4a3a'], door: ['paint', '#7a5a3a'],
    win: { w: 0.62, h: 1.45, bay: 2.6, sill: 0.85, tran: 0.7, casing: 0.06, pair: true, mull: 1, cols: 0 },
    blocks: [
      { u0: -8.68, u1: 11.23, v0: -8.93, v1: 4.42, eave: 9.0, roof: { type: 'hip', ridge: 13.0 } },
      { u0: -8.68, u1: -1.66, v0: 4.42, v1: 13.79, eave: 8.4, roof: { type: 'gable', axis: 'v', ridge: 12.9, half: { mat: ['paint', '#6b4a3a'] }, gableWin: { w: 2.2, h: 1.1, dy: 0.9 } } },
    ],
    doors: [{ block: 0, face: 'S', s: 9.2, w: 1.3, h: 2.3, arch: true }],
    bays: [{ block: 0, face: 'S', s: 15.8, w: 3.0, d: 0.9, canted: true, storeys: 2, roof: 'hip', roofMat: ['roof', '#3a3b3e'] }],
    letters: [{ block: 0, face: 'S', s: 11.6, y: 7.85, h: 0.75, text: 'ΘΔΧ', mat: ['paint', '#f2f2f2'] }],
    dormers: [{ block: 0, side: 'S', s: 9.0, w: 2.0, h: 1.2, inset: 0.9, type: 'shed', nwin: 2 }, { block: 0, side: 'S', s: 13.6, w: 2.0, h: 1.2, inset: 0.9, type: 'shed', nwin: 2 }, { block: 0, side: 'N', s: 9.9, w: 2.4, h: 1.2, inset: 0.9, type: 'shed', nwin: 2 }],
    chimneys: [{ u: 4.0, v: -7.6, w: 1.0, d: 0.7, top: 14.2, mat: ['brick', '#8d4a3a'] }],
    ivy: [{ block: 1, face: 'S', s0: 0.2, s1: 6.8, y0: -0.5, y1: 7.8 }, { block: 0, face: 'S', s0: 7.2, s1: 8.4, y0: -0.5, y1: 8.6 }, { block: 0, face: 'S', s0: 10.2, s1: 13.8, y0: -0.5, y1: 3.2 }, { block: 1, face: 'E', s0: 0.2, s1: 9.0, y0: -0.5, y1: 6.5 }, { block: 0, face: 'E', s0: 0.5, s1: 12.8, y0: -0.5, y1: 5.5 }],
  });
  r.object3d.name = 'building-410353255';
  return r;
}
