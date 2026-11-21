// Zeta Beta Tau (ΖΒΤ), 2721 Channing Way. Three-storey red-brick Colonial Revival chapter house with a low hipped roof
// (LiDAR eaves ~9.6 m, ridge ~11.5 m), white 6-over-6 sashes with black shutters and a pedimented portico on Channing.
// Style chosen from the chapter type; no verified photo of this house was available.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598427',
  name: "Zeta Beta Tau",
  subtitle: "ΖΒΤ · 2721 Channing Way",
  blurb: "Zeta Beta Tau chapter house on Channing Way, a three-storey brick Colonial Revival house with a columned portico.",
  replaces: ['w/473598427'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.638, front: { block: 0, face: 'S', above: 0.8 }, storeyH: 2.95, ov: 0.45,
    wall: ['brick', '#a65a44'], trim: ['paint', '#f2f2ee'], roof: ['roof', '#4a4d52'], base: ['brick', '#8b3a2b'], door: ['paint', '#f2f2ee'], shutters: ['paint', '#1c1c1c'],
    win: { w: 0.9, h: 1.55, bay: 2.4, sill: 0.8, tran: 0.5, casing: 0.06, muntins: 2, sillMat: ['stone', '#d8d2c4'] },
    blocks: [{ u0: -6.11, u1: 6.09, v0: -11.0, v1: 10.97, eave: 9.6, roof: { type: 'hip', ridge: 11.6 }, win: { S: { nb: 4 } } }],
    doors: [{ block: 0, face: 'S', s: 6.1, w: 1.5, h: 2.4, fan: true }],
    porches: [{ block: 0, face: 'S', s0: 3.6, s1: 8.6, depth: 2.2, cols: 4, colD: 0.34, top: 6.8, giant: true, colMat: ['paint', '#f2f2ee'], roofMat: ['roof', '#4a4d52'], letters: { text: 'ΖΒΤ', mat: ['paint', '#1c1c1c'], h: 0.42 } }],
    chimneys: [{ u: 0, v: -10.6, w: 1.1, d: 0.7, top: 12.6, mat: ['brick', '#8b3a2b'] }],
  });
  r.object3d.name = 'building-473598427';
  return r;
}
