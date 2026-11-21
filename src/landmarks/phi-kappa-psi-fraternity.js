// Phi Kappa Psi, 2424 Warring Street. Mid-century flat-roofed chapter house (LiDAR roof ~12.2 m with a stair penthouse ~15 m):
// red-brick ground floor and courtyard wall, cream upper floors with long bronze-framed window bands and a thin fascia.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'phi-kappa-psi-fraternity',
  name: "Phi Kappa Psi",
  subtitle: "ΦΚΨ · 2424 Warring Street",
  blurb: "Phi Kappa Psi (California Gamma) chapter house on Warring Street, a flat-roofed mid-century building with brick walls and long bronze-framed window bands.",
  replaces: ['w/473598517'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.576, front: { block: 0, face: 'E', above: 0.4 }, storeyH: 3.6,
    wall: ['stucco', '#e6ddc8'], wall0: ['brick', '#a65a44'], trim: ['paint', '#6e5a3c'], frame: ['metal', '#8a7a5c'], roof: ['roof', '#6a6a6a'], base: ['brick', '#8e4a38'],
    win: { w: 1.9, h: 1.5, bay: 2.6, sill: 0.9, tran: 0, mull: 2, casing: 0 }, belt: false,
    blocks: [
      { u0: -10.48, u1: 4.02, v0: -11.91, v1: 16.1, eave: 11.7, roof: { type: 'flat', parapet: 0.5, ov: 0.35, parapetMat: ['paint', '#6e5a3c'], capMat: ['paint', '#6e5a3c'] } },
      { u0: 4.02, u1: 13.43, v0: -11.91, v1: 1.05, eave: 11.7, roof: { type: 'flat', parapet: 0.5, ov: 0.35, parapetMat: ['paint', '#6e5a3c'], capMat: ['paint', '#6e5a3c'] } },
      { u0: -6.5, u1: -2.5, v0: -11.0, v1: -5.0, eave: 14.8, noWalls: false, storeys: 1, floor: 12.2, roof: { type: 'flat', parapet: 0.2 }, winAll: { none: true } },
    ],
    doors: [{ block: 0, face: 'E', s: 7.5, w: 2.2, h: 2.4 }],
    porches: [{ block: 0, face: 'E', s0: 5.6, s1: 9.4, depth: 2.2, cols: 2, colStyle: 'square', colD: 0.2, colMat: ['metal', '#5a4a34'], top: 3.4, rail: false, roofMat: ['paint', '#e6ddc8'], fascia: ['paint', '#6e5a3c'], letters: { text: 'ΦΚΨ', mat: ['metal', '#d4b46a'], h: 0.32 } }],
  }, { number: '2424' });
  r.object3d.name = 'phi-kappa-psi-fraternity';
  return r;
}
