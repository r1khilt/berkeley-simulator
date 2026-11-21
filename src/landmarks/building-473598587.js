// Alpha Gamma Omega (ΑΓΩ), 2713 Haste Street. Small front-gabled beige stucco house facing Haste (LiDAR eaves ~7.3 m,
// ridge ~10.7 m) with wide wood eaves, a recessed entry porch and the letters over it.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598587',
  name: "Alpha Gamma Omega",
  subtitle: "ΑΓΩ · 2713 Haste Street",
  blurb: "Alpha Gamma Omega chapter house on Haste Street, a small front-gabled stucco house.",
  replaces: ['w/473598587'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.725, front: { block: 0, face: 'S', above: 0.8 }, storeyH: 3.0, ov: 0.65,
    wall: ['stucco', '#d9c9a8'], trim: ['wood', '#8a6a4a'], frame: ['paint', '#f2efe6'], roof: ['roof', '#5a524a'], base: ['stucco', '#bba98a'],
    win: { w: 0.95, h: 1.55, bay: 2.6, sill: 0.85, tran: 0.6, casing: 0.08 },
    blocks: [{ u0: -5.36, u1: 5.36, v0: -8.79, v1: 8.79, eave: 7.0, roof: { type: 'gable', axis: 'v', ridge: 10.7, brackets: true, gableWin: { w: 2.0, h: 1.1 } } }],
    doors: [{ block: 0, face: 'S', s: 7.6, w: 1.1, h: 2.3 }],
    porches: [{ block: 0, face: 'S', s0: 5.8, s1: 9.6, depth: 1.8, cols: 2, colStyle: 'square', colD: 0.3, colMat: ['stucco', '#d9c9a8'], roofMat: ['roof', '#5a524a'], fascia: ['wood', '#8a6a4a'], letters: { text: 'ΑΓΩ', mat: ['paint', '#f2efe6'], h: 0.3 } }],
  });
  r.object3d.name = 'building-473598587';
  return r;
}
