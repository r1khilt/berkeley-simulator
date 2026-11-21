// Sigma Alpha Mu (ΣΑΜ), 2714 Durant Avenue. Simple Colonial Revival chapter house: two storeys over a raised basement,
// pale grey-white lap siding, a low hipped roof, white double-hung windows with black shutters upstairs and a small flat
// portico on slim square posts over the centred double door.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598526',
  name: 'Sigma Alpha Mu',
  subtitle: 'ΣΑΜ · 2714 Durant Avenue',
  blurb: 'Chapter house of Sigma Alpha Mu on Durant Avenue, a lap-sided Colonial Revival house with black shutters and a small columned portico.',
  replaces: ['w/473598526'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -8.52, front: { block: 0, face: 'N', above: 1.1 }, storeyH: 3.0, ov: 0.45,
    wall: ['clap', '#d9dcdd'], trim: ['paint', '#f4f4f2'], roof: ['roof', '#7a7c7e'], base: ['stucco', '#a9acad'], door: ['paint', '#f4f4f2'], shutters: ['paint', '#1e2226'],
    win: { w: 0.9, h: 1.55, bay: 2.3, sill: 0.85, tran: 0.5, casing: 0.1, muntins: 0 },
    blocks: [
      { u0: -5.94, u1: 6.62, v0: -10.31, v1: 11.23, eave: 8.3, roof: { type: 'hip', ridge: 10.6 }, win: { N: { nb: 5, skip: [] } } },
    ],
    doors: [{ block: 0, face: 'N', s: 6.28, w: 1.6, h: 2.3, fan: true }],
    porches: [{ block: 0, face: 'N', s0: 4.6, s1: 7.96, depth: 1.6, cols: 2, colStyle: 'square', colD: 0.22, rail: true, roofMat: ['roof', '#7a7c7e'], fascia: ['paint', '#f4f4f2'], letters: { text: 'ΣΑΜ', mat: ['paint', '#1e3a6e'], h: 0.3 } }],
  });
  r.object3d.name = 'building-473598526';
  return r;
}
