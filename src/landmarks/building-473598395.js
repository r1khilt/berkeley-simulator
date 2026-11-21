// Sigma Chi (ΣΧ), 2345 College Avenue. Two-storey flat-roofed mid-century chapter house (LiDAR roof ~8.1 m everywhere):
// buff brick ground floor, white stucco upper floor with long window bands, a flat entrance canopy and blue letters on College.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-473598395',
  name: "Sigma Chi",
  subtitle: "ΣΧ · 2345 College Avenue",
  blurb: "Sigma Chi chapter house on College Avenue, a two-storey flat-roofed modern building with long bands of windows.",
  replaces: ['w/473598395'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.14, front: { block: 0, face: 'W', above: 0.5 }, storeyH: 3.4,
    wall: ['stucco', '#efede6'], wall0: ['brick', '#c9a27c'], trim: ['paint', '#3a3f45'], frame: ['paint', '#3a3f45'], roof: ['roof', '#6a6a6a'], base: ['brick', '#b48d6a'],
    win: { w: 1.5, h: 1.45, bay: 2.4, sill: 0.95, tran: 0, mull: 1, casing: 0 }, belt: false,
    blocks: [
      { u0: -12.13, u1: 13.59, v0: -7.26, v1: 5.09, eave: 7.6, roof: { type: 'flat', parapet: 0.45, parapetMat: ['paint', '#efede6'], capMat: ['paint', '#3a3f45'] } },
      { u0: -12.13, u1: 1.92, v0: 5.09, v1: 10.7, eave: 7.4, roof: { type: 'flat', parapet: 0.45, parapetMat: ['paint', '#efede6'], capMat: ['paint', '#3a3f45'] } },
      { u0: 9.46, u1: 13.59, v0: -11.86, v1: -7.26, eave: 7.6, roof: { type: 'flat', parapet: 0.45, parapetMat: ['paint', '#efede6'], capMat: ['paint', '#3a3f45'] } },
    ],
    doors: [{ block: 0, face: 'W', s: 6.0, w: 1.8, h: 2.3 }],
    porches: [{ block: 0, face: 'W', s0: 4.2, s1: 7.8, depth: 1.8, cols: 2, colStyle: 'square', colD: 0.14, colMat: ['paint', '#3a3f45'], top: 3.4, rail: false, roofMat: ['paint', '#efede6'], fascia: ['paint', '#efede6'], deckH: true }],
    letters: [{ block: 0, face: 'W', s: 9.4, y: 4.9, h: 0.9, text: 'ΣΧ', mat: ['paint', '#1d3f7a'] }],
  });
  r.object3d.name = 'building-473598395';
  return r;
}
