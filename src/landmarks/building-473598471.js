// Pi Lambda Phi (ΠΛΦ), 2727 Channing Way. Three-storey Berkeley brown-shingle house with a hipped roof (LiDAR eaves ~9 m,
// ridge ~12.8 m), white-trimmed windows, a shingled front porch on Channing and a gabled dormer. Style from the street
// context; no verified photo of this house was available.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-473598471',
  name: "Pi Lambda Phi",
  subtitle: "ΠΛΦ · 2727 Channing Way",
  blurb: "Pi Lambda Phi chapter house on Channing Way, a three-storey brown-shingle house with a hipped roof and a front porch.",
  replaces: ['w/473598471'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.964, front: { block: 0, face: 'S', above: 1.0 }, storeyH: 2.9, ov: 0.7,
    wall: ['shingle', '#8a6a4c'], trim: ['paint', '#efeae0'], roof: ['roof', '#4d4a46'], base: ['brick', '#8a4a3a'],
    win: { w: 0.85, h: 1.5, bay: 2.5, sill: 0.8, tran: 0.62, casing: 0.11, pair: true },
    blocks: [
      { u0: -6.32, u1: 6.28, v0: -13.16, v1: 12.73, eave: 9.0, roof: { type: 'hip', ridge: 12.8 } },
      { u0: -8.34, u1: -6.32, v0: -5.73, v1: 0.27, eave: 4.6, storeys: 1, roof: { type: 'flat', parapet: 0.25 } },
    ],
    doors: [{ block: 0, face: 'S', s: 6.3, w: 1.2, h: 2.3, fan: true }],
    porches: [{ block: 0, face: 'S', s0: 1.5, s1: 11.1, depth: 2.4, cols: 3, colStyle: 'pier', colD: 0.38, pedMat: ['shingle', '#8a6a4c'], colMat: ['paint', '#efeae0'], roofMat: ['roof', '#4d4a46'], fascia: ['paint', '#efeae0'], letters: { text: 'ΠΛΦ', mat: ['paint', '#1f3f73'], h: 0.34 } }],
    dormers: [{ block: 0, side: 'S', s: 6.3, w: 2.6, h: 1.4, inset: 1.0 }],
    chimneys: [{ u: -6.0, v: 2.0, w: 0.9, d: 0.7, top: 13.4 }],
  }, { number: '2727' });
  r.object3d.name = 'building-473598471';
  return r;
}
