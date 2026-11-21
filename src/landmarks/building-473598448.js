// Phi Delta Theta (ΦΔΘ), 2726 Channing Way. Three-storey cream stucco Mediterranean villa on a raised basement with a low
// hipped red-tile roof and broad eaves; on Channing a two-storey loggia of slender Tuscan columns carries a balustraded
// balcony, with round-arched windows at the main floor.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598448',
  name: 'Phi Delta Theta',
  subtitle: 'ΦΔΘ · 2726 Channing Way',
  blurb: 'Phi Delta Theta house on Channing Way, a cream stucco Mediterranean villa with a red tile roof and a columned loggia.',
  replaces: ['w/473598448'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.519, front: { block: 0, face: 'N', above: 1.3 }, storeyH: 3.4, ov: 0.8,
    wall: ['stucco', '#e8e0cc'], trim: ['paint', '#e2d8c2'], frame: ['paint', '#3a3a3a'], roof: ['tile', '#c87a5a'], base: ['stucco', '#cfc6b0'], door: ['paint', '#4a3426'],
    win: { w: 0.85, h: 1.8, bay: 2.6, sill: 0.8, tran: 0.72, casing: 0, arch0: false, sillMat: ['paint', '#d8cdb5'] }, frieze: false, belt: false,
    blocks: [
      { u0: -3.04, u1: 5.25, v0: -15.23, v1: 8.25, eave: 12.2, roof: { type: 'hip', ridge: 14.2 }, winAll: { arch0: true } },
      { u0: -5.58, u1: 0.46, v0: 8.25, v1: 16.25, eave: 12.2, roof: { type: 'hip', ridge: 13.4 } },
      { u0: -5.58, u1: -3.04, v0: -0.15, v1: 8.25, eave: 11.8, roof: { type: 'hip', ridge: 12.8 } },
    ],
    doors: [{ block: 0, face: 'N', s: 4.15, w: 1.5, h: 2.5, arch: true }],
    porches: [{ block: 0, face: 'N', s0: 0.6, s1: 7.7, depth: 2.4, cols: 4, colD: 0.36, top: 8.4, colMat: ['paint', '#f2f2f2'], balcony: true, rail: false, roofMat: ['stucco', '#e8e0cc'], fascia: ['paint', '#f2f2f2'], letters: { text: 'ΦΔΘ', mat: ['paint', '#1f3a68'], h: 0.34 } }],
  });
  r.object3d.name = 'building-473598448';
  return r;
}
