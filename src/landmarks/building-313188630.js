// Sigma Nu (ΣΝ), 2710 Bancroft Way. Two-storey chapter house with a low hipped roof running along Bancroft (LiDAR eaves ~9.8 m,
// ridge ~11.4 m) and lower rear wings; white-trimmed windows and a columned entry porch on Bancroft. Style from the street
// context; no verified photo of this house was available.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-313188630',
  name: "Sigma Nu",
  subtitle: "ΣΝ · 2710 Bancroft Way",
  blurb: "Sigma Nu chapter house on Bancroft Way, a two-storey house with a hipped roof and a columned porch facing the street.",
  replaces: ['w/313188630'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.017, front: { block: 0, face: 'N', above: 0.9 }, storeyH: 3.4, ov: 0.7,
    wall: ['clap', '#c8c2b0'], trim: ['paint', '#f4f1e8'], roof: ['roof', '#4f4c48'], base: ['brick', '#8a4a3a'], door: ['paint', '#2b3a55'],
    win: { w: 0.95, h: 1.7, bay: 2.8, sill: 0.85, tran: 0.5, casing: 0.12, muntins: 0 },
    blocks: [
      { u0: -14.82, u1: 12.34, v0: -7.58, v1: 0.2, eave: 8.9, roof: { type: 'hip', ridge: 11.4 } },
      { u0: 6.04, u1: 11.49, v0: 0.2, v1: 15.32, eave: 7.6, roof: { type: 'gable', axis: 'v', ridge: 9.8 } },
      { u0: -14.82, u1: -5.14, v0: 0.2, v1: 7.01, eave: 8.9, roof: { type: 'hip', ridge: 11.0 } },
      { u0: 6.04, u1: 12.34, v0: -9.76, v1: -7.58, eave: 4.4, storeys: 1, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'N', s: 13.6, w: 1.5, h: 2.4, fan: true }],
    porches: [{ block: 0, face: 'N', s0: 10.2, s1: 17.0, depth: 2.4, cols: 4, colD: 0.34, colMat: ['paint', '#f4f1e8'], roofMat: ['roof', '#4f4c48'], fascia: ['paint', '#f4f1e8'], balcony: true, letters: { text: 'ΣΝ', mat: ['metal', '#c9a64a'], h: 0.34 } }],
    chimneys: [{ u: -10.0, v: -3.5, w: 1.0, d: 0.7, top: 12.4 }],
  });
  r.object3d.name = 'building-313188630';
  return r;
}
