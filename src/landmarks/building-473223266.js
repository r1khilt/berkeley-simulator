// Alpha Sigma Phi (ΑΣΦ), 2498 Piedmont Avenue at Dwight Way. Three-storey stucco chapter house with a low hipped tile roof
// (LiDAR eaves ~10 m, ridge ~12 m) and a lower two-storey section on the north; columned entry porch on Piedmont.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-473223266',
  name: "Alpha Sigma Phi",
  subtitle: "ΑΣΦ · 2498 Piedmont Avenue",
  blurb: "Alpha Sigma Phi chapter house at Piedmont Avenue and Dwight Way, a three-storey stucco house with a low tile roof.",
  replaces: ['w/473223266'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.689, front: { block: 0, face: 'E', above: 0.8 }, storeyH: 3.1, ov: 0.7,
    wall: ['stucco', '#e4d9c2'], trim: ['paint', '#5b4636'], frame: ['paint', '#f2efe6'], roof: ['tile', '#c8805e'], base: ['stucco', '#c9bea6'],
    win: { w: 0.95, h: 1.6, bay: 2.8, sill: 0.85, tran: 0.6, casing: 0.08 },
    blocks: [
      { u0: -6.62, u1: 7.08, v0: -9.0, v1: 12.27, eave: 10.1, roof: { type: 'hip', ridge: 12.0 } },
      { u0: -6.62, u1: 7.08, v0: -12.84, v1: -9.0, eave: 7.6, roof: { type: 'hip', ridge: 9.4 } },
    ],
    doors: [{ block: 0, face: 'E', s: 10.6, w: 1.4, h: 2.4, fan: true }],
    porches: [{ block: 0, face: 'E', s0: 8.4, s1: 12.8, depth: 2.2, cols: 2, colD: 0.36, colMat: ['paint', '#f2efe6'], roofMat: ['tile', '#c8805e'], fascia: ['paint', '#f2efe6'], letters: { text: 'ΑΣΦ', mat: ['paint', '#8b1a1e'], h: 0.34 } }],
  }, { number: '2498' });
  r.object3d.name = 'building-473223266';
  return r;
}
