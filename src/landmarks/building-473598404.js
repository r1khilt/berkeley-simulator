// Delta Gamma (ΔΓ), 2710 Channing Way. Large three-storey stucco sorority house with low hipped tile roofs (LiDAR ~12.3 m on the
// main wing, ~9 m on the lower east wing), a columned entrance porch on Channing and the letters on its frieze.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598404',
  name: "Delta Gamma",
  subtitle: "ΔΓ · 2710 Channing Way",
  blurb: "Delta Gamma chapter house on Channing Way, a large three-storey stucco house with low tile roofs.",
  replaces: ['w/473598404'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.041, front: { block: 0, face: 'N', above: 0.8 }, storeyH: 3.2, ov: 0.6,
    wall: ['stucco', '#efe7d6'], trim: ['paint', '#2f4f6f'], frame: ['paint', '#f6f3ea'], roof: ['tile', '#c47c5a'], base: ['stucco', '#d2c8b2'], shutters: ['paint', '#2f4f6f'],
    win: { w: 0.9, h: 1.6, bay: 2.8, sill: 0.85, tran: 0.5, casing: 0.08 },
    blocks: [
      { u0: -9.5, u1: 3.05, v0: -16.75, v1: 13.62, eave: 11.0, roof: { type: 'hip', ridge: 12.9 } },
      { u0: 3.05, u1: 11.46, v0: -12.5, v1: -1.98, eave: 8.2, roof: { type: 'hip', ridge: 9.8 } },
      { u0: 3.05, u1: 13.59, v0: 6.38, v1: 14.93, eave: 11.0, roof: { type: 'hip', ridge: 12.6 } },
      { u0: -9.5, u1: -3.77, v0: 13.62, v1: 21.14, eave: 11.0, roof: { type: 'hip', ridge: 12.2 } },
    ],
    doors: [{ block: 0, face: 'N', s: 6.3, w: 1.6, h: 2.4, fan: true }],
    porches: [{ block: 0, face: 'N', s0: 3.3, s1: 9.3, depth: 2.4, cols: 4, colD: 0.38, colMat: ['paint', '#f6f3ea'], roofMat: ['paint', '#f6f3ea'], fascia: ['paint', '#f6f3ea'], balcony: true, letters: { text: 'ΔΓ', mat: ['paint', '#2f4f6f'], h: 0.36 } }],
  });
  r.object3d.name = 'building-473598404';
  return r;
}
