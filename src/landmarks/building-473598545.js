// Tau Kappa Epsilon (ΤΚΕ), 2725 Channing Way. Three-storey stucco chapter house with a side-gabled roof parallel to Channing
// (LiDAR eaves ~11 m, ridge ~13 m), a lower flat-roofed rear wing and a two-storey front section with the entrance.
// Style from the street context; no verified photo of this house was available.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-473598545',
  name: "Tau Kappa Epsilon",
  subtitle: "ΤΚΕ · 2725 Channing Way",
  blurb: "Tau Kappa Epsilon chapter house on Channing Way, a three-storey stucco house with a side-gabled roof.",
  replaces: ['w/473598545'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -9.364, front: { block: 0, face: 'S', above: 0.8 }, storeyH: 3.2, ov: 0.6,
    wall: ['stucco', '#d8d2c0'], trim: ['paint', '#8a1c22'], frame: ['paint', '#f4f1e8'], roof: ['roof', '#55524e'], base: ['stucco', '#b9b29f'],
    win: { w: 0.95, h: 1.6, bay: 2.8, sill: 0.85, tran: 0.55, casing: 0.08 },
    blocks: [
      { u0: -9.09, u1: 10.41, v0: -5.94, v1: 7.28, eave: 10.6, roof: { type: 'gable', axis: 'u', ridge: 13.2, gableWin: { w: 1.6, h: 1.0 } } },
      { u0: -9.09, u1: -2.9, v0: -13.89, v1: -5.94, eave: 10.6, roof: { type: 'flat', parapet: 0.4 } },
      { u0: -5.02, u1: 6.42, v0: 7.28, v1: 10.64, eave: 7.0, roof: { type: 'flat', parapet: 0.0 }, storeys: 2 },
    ],
    doors: [{ block: 2, face: 'S', s: 5.7, w: 1.5, h: 2.4, fan: true }],
    letters: [{ block: 2, face: 'S', s: 5.7, y: 5.9, h: 0.6, text: 'ΤΚΕ', mat: ['paint', '#8a1c22'] }],
    porches: [{ block: 2, face: 'S', s0: 3.5, s1: 7.9, depth: 1.6, cols: 2, colStyle: 'square', colD: 0.3, roofMat: ['roof', '#55524e'], rail: false }],
  }, { number: '2725' });
  r.object3d.name = 'building-473598545';
  return r;
}
