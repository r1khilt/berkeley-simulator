// Phi Kappa Sigma (ΦΚΣ), 2320 Warring Street. Long stucco chapter house stepping down the hill from Warring: two storeys at the
// street end (LiDAR ~14 m on the slope), three storeys at the downhill west end under a low roof (~10.5 m), and a two-storey
// wing along the south. Style from the street context; no verified photo of this house was available.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598566',
  name: "Phi Kappa Sigma",
  subtitle: "ΦΚΣ · 2320 Warring Street",
  blurb: "Phi Kappa Sigma chapter house on Warring Street, a long stucco house stepping down the hillside under low roofs.",
  replaces: ['w/473598566'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -8.607, front: { block: 1, face: 'E', above: 0.5 }, storeyH: 3.0, ov: 0.6,
    wall: ['stucco', '#d6cbb4'], trim: ['paint', '#3f4a3a'], frame: ['paint', '#f2efe6'], roof: ['roof', '#575450'], base: ['stucco', '#b8ad96'],
    win: { w: 1.0, h: 1.55, bay: 2.7, sill: 0.85, tran: 0.55, casing: 0.08 },
    blocks: [
      { u0: -23.19, u1: 9.5, v0: -9.41, v1: 1.05, eave: 9.9, floor: 0.6, roof: { type: 'hip', ridge: 11.0 } },
      { u0: 9.5, u1: 15.24, v0: -9.41, v1: 1.05, eave: 12.8, roof: { type: 'hip', ridge: 14.4 } },
      { u0: 4.55, u1: 14.05, v0: 1.05, v1: 18.52, eave: 10.0, roof: { type: 'hip', ridge: 11.3 } },
      { u0: -4.05, u1: 4.55, v0: 1.05, v1: 3.69, eave: 7.3, floor: 3.4, storeys: 1, roof: { type: 'flat', parapet: 0.4 } },
    ],
    doors: [{ block: 1, face: 'E', s: 5.2, w: 1.4, h: 2.4, fan: true }],
    porches: [{ block: 1, face: 'E', s0: 3.4, s1: 7.0, depth: 1.6, cols: 2, colStyle: 'square', colD: 0.3, rail: false, roofMat: ['roof', '#575450'], fascia: ['paint', '#3f4a3a'], letters: { text: 'ΦΚΣ', mat: ['paint', '#f2efe6'], h: 0.3 } }],
  });
  r.object3d.name = 'building-473598566';
  return r;
}
