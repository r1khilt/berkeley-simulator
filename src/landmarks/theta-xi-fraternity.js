// Theta Xi, 2639 Durant Avenue. Front-gabled Arts-and-Crafts house, two storeys plus an attic with side dormers, cream stucco with
// a red-brown roof, deep bracketed eaves and a full-width front porch on Durant. LiDAR: eaves ~6.6 m, ridge ~11.6 m.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'theta-xi-fraternity',
  name: "Theta Xi",
  subtitle: "ΘΞ · 2639 Durant Avenue",
  blurb: "Theta Xi chapter house on Durant Avenue, a front-gabled Arts-and-Crafts house in cream stucco with a columned front porch.",
  replaces: ['w/410353247'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -10.658, front: { block: 0, face: 'S', above: 0.9 }, storeyH: 2.9, ov: 0.7,
    wall: ['stucco', '#e8e0c8'], trim: ['paint', '#6b4a3a'], frame: ['paint', '#f2efe6'], roof: ['roof', '#7a4a3a'], base: ['stucco', '#c9c0a8'],
    win: { w: 0.9, h: 1.5, bay: 2.6, sill: 0.8, tran: 0.65, casing: 0.1, pair: true },
    blocks: [{ u0: -5.32, u1: 5.32, v0: -10.0, v1: 10.0, eave: 6.6, roof: { type: 'gable', axis: 'v', ridge: 11.6, brackets: true, gableWin: { w: 2.4, h: 1.3 } }, win: { S: { nb: 2 } } }],
    doors: [{ block: 0, face: 'S', s: 3.0, w: 1.1, h: 2.3, fan: true }],
    porches: [{ block: 0, face: 'S', s0: 0.2, s1: 10.4, depth: 2.4, cols: 4, colStyle: 'pier', colD: 0.36, colMat: ['paint', '#f2efe6'], pedMat: ['stucco', '#c9c0a8'], roofMat: ['roof', '#7a4a3a'], stepS: 3.0, letters: { text: 'ΘΞ', mat: ['paint', '#f2efe6'], h: 0.34 }, fascia: ['paint', '#6b4a3a'] }],
    dormers: [{ block: 0, side: 'E', s: 12.0, w: 3.2, h: 1.4, inset: 1.0, type: 'shed', nwin: 2 }, { block: 0, side: 'W', s: 12.0, w: 3.2, h: 1.4, inset: 1.0, type: 'shed', nwin: 2 }],
    chimneys: [{ u: 5.0, v: -3.0, w: 0.8, d: 0.7, top: 10.8 }],
  });
  r.object3d.name = 'theta-xi-fraternity';
  return r;
}
