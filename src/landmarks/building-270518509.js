// Delta Delta Delta (ΔΔΔ), 2300 Warring Street. Large L-shaped sorority house painted pale blue-grey with white pilasters and
// trim: a tall hipped wing on Warring (LiDAR eaves ~15.5 m, ridge ~18.5 m on the slope) and a long lower gabled range running
// downhill (eaves ~12 m, ridge ~14.4 m); white multi-pane windows and a recessed wood entry door.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-270518509',
  name: "Delta Delta Delta",
  subtitle: "ΔΔΔ · 2300 Warring Street",
  blurb: "Tri Delta chapter house at Warring Street and Bancroft Way, a large L-shaped house in pale blue-grey with white trim.",
  replaces: ['w/270518509'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -8.142, front: { block: 1, face: 'E', above: 0.6 }, storeyH: 3.1, ov: 0.6,
    wall: ['clap', '#93a6b8'], trim: ['paint', '#f2f2ee'], roof: ['roof', '#4a4a4a'], base: ['brick', '#9c4a3a'], door: ['wood', '#b5733f'],
    win: { w: 0.9, h: 1.6, bay: 2.6, sill: 0.85, tran: 0.5, casing: 0.12, muntins: 1 },
    blocks: [
      { u0: -22.04, u1: 1.45, v0: -0.64, v1: 11.31, eave: 11.9, floorAdd: -2.6, roof: { type: 'gable', axis: 'u', ridge: 14.5, gableWin: { w: 1.8, h: 1.1 } } },
      { u0: 1.45, u1: 16.34, v0: -16.84, v1: 8.72, eave: 15.4, roof: { type: 'hip', ridge: 18.6 } },
    ],
    doors: [{ block: 1, face: 'E', s: 12.8, w: 1.3, h: 2.4, fan: true }],
    porches: [{ block: 1, face: 'E', s0: 11.0, s1: 14.6, depth: 1.4, cols: 2, colStyle: 'square', colD: 0.3, rail: false, roofMat: ['roof', '#4a4a4a'], fascia: ['paint', '#f2f2ee'], letters: { text: 'ΔΔΔ', mat: ['metal', '#c9a44c'], h: 0.3 } }],
    chimneys: [{ u: 9.0, v: -16.3, w: 1.0, d: 0.7, top: 19.6 }],
  });
  r.object3d.name = 'building-270518509';
  return r;
}
