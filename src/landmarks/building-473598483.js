// Chi Phi (ΧΦ), 2722 Durant Avenue. Front-gabled Berkeley brown-shingle house facing Durant (LiDAR eaves ~8.3 m, ridge ~12.4 m)
// with lower flat-roofed side wings, a full-width porch and an attic window in the gable. Style from the street context;
// no verified photo of this house was available.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598483',
  name: "Chi Phi",
  subtitle: "ΧΦ · 2722 Durant Avenue",
  blurb: "Chi Phi chapter house on Durant Avenue, a front-gabled brown-shingle house with a full-width porch.",
  replaces: ['w/473598483'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.596, front: { block: 0, face: 'N', above: 1.0 }, storeyH: 2.9, ov: 0.65,
    wall: ['shingle', '#7c5e44'], trim: ['paint', '#efe9dc'], roof: ['roof', '#4a4744'], base: ['brick', '#8c4b3a'],
    win: { w: 0.85, h: 1.5, bay: 2.6, sill: 0.8, tran: 0.62, casing: 0.11, pair: true },
    blocks: [
      { u0: -5.81, u1: 6.31, v0: -16.64, v1: 15.07, eave: 8.3, roof: { type: 'gable', axis: 'v', ridge: 12.4, brackets: true, gableWin: { w: 2.6, h: 1.4 } } },
      { u0: -8.29, u1: -5.81, v0: 6.71, v1: 15.07, eave: 8.0, roof: { type: 'flat', parapet: 0.3 } },
      { u0: 6.31, u1: 7.16, v0: 6.71, v1: 15.07, eave: 8.0, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'N', s: 4.0, w: 1.2, h: 2.3, fan: true }],
    porches: [{ block: 0, face: 'N', s0: 0.3, s1: 11.8, depth: 2.5, cols: 4, colStyle: 'pier', colD: 0.36, pedMat: ['brick', '#8c4b3a'], colMat: ['paint', '#efe9dc'], roofMat: ['roof', '#4a4744'], stepS: 4.0, balcony: true, fascia: ['paint', '#efe9dc'], letters: { text: 'ΧΦ', mat: ['paint', '#a3262a'], h: 0.34 } }],
  });
  r.object3d.name = 'building-473598483';
  return r;
}
