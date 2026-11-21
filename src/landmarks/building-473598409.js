// Alpha Tau Omega (ΑΤΩ), 2327 Warring Street (OSM tags the lot as 2340 Prospect; the university list, Daily Cal and the chapter
// give 2327 Warring). Red-brick Georgian Revival house, three storeys on Warring with a flat roof behind a white cornice
// (LiDAR ~11.2 m), white multi-pane windows with stone sills and a centred portico of white Tuscan columns.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598409',
  name: "Alpha Tau Omega",
  subtitle: "ΑΤΩ · 2327 Warring Street",
  blurb: "Alpha Tau Omega chapter house on Warring Street, a three-storey red-brick Georgian Revival house with a white columned portico.",
  replaces: ['w/473598409'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.588, front: { block: 0, face: 'W', above: 0.8 }, storeyH: 3.2,
    wall: ['brick', '#8a4334'], trim: ['paint', '#f2f0ea'], roof: ['roof', '#3e4247'], base: ['brick', '#6e3428'], door: ['paint', '#1f2a2a'],
    win: { w: 1.0, h: 1.7, bay: 2.6, sill: 0.8, tran: 0.5, casing: 0.05, muntins: 2, sillMat: ['stone', '#d8d2c4'] }, frieze: false,
    blocks: [
      { u0: -14.37, u1: 4.65, v0: -11.66, v1: 13.12, eave: 10.6, roof: { type: 'flat', parapet: 0.7, parapetMat: ['paint', '#f2f0ea'] } },
      { u0: 4.65, u1: 20.6, v0: -10.49, v1: 1.29, eave: 10.4, roof: { type: 'flat', parapet: 0.5 } },
      { u0: -8.36, u1: 3.59, v0: 13.12, v1: 16.13, eave: 10.6, roof: { type: 'flat', parapet: 0.6, parapetMat: ['paint', '#f2f0ea'] } },
    ],
    doors: [{ block: 0, face: 'W', s: 12.4, w: 1.6, h: 2.5, fan: true }],
    porches: [{ block: 0, face: 'W', s0: 9.4, s1: 15.4, depth: 2.6, cols: 4, colD: 0.42, top: 4.0, colMat: ['paint', '#efede6'], roofMat: ['paint', '#efede6'], fascia: ['paint', '#efede6'], balcony: true, letters: { text: 'ΑΤΩ', mat: ['paint', '#1f3f73'], h: 0.34 } }],
  });
  r.object3d.name = 'building-473598409';
  return r;
}
