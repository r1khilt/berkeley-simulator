// Alpha Chi Omega (ΑΧΩ), 2313 Warring Street. Flat-roofed Bay Region modern chapter house clad in weathered cedar shingles,
// stepping up the hill (LiDAR roof ~14.3 m throughout, so four storeys at the downhill west end and two at the top) with
// big warm-brown wood-framed windows and stone planters at the entry.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'alpha-chi-omega',
  name: "Alpha Chi Omega",
  subtitle: "ΑΧΩ · 2313 Warring Street",
  blurb: "Alpha Chi Omega chapter house on Warring Street, a flat-roofed cedar-shingled building stepping up the hillside with big wood-framed windows.",
  replaces: ['w/473598485'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -9.371, front: { block: 0, face: 'W', above: 0.5 }, storeyH: 3.2,
    wall: ['shingle', '#8a6e52'], trim: ['wood', '#7a4e2d'], frame: ['wood', '#7a4e2d'], roof: ['roof', '#5a5a5a'], base: ['stone', '#b89a78'], door: ['wood', '#7a4e2d'],
    win: { w: 2.2, h: 1.7, bay: 3.2, sill: 0.7, tran: 0, mull: 2, casing: 0.1 }, belt: false,
    blocks: [
      { u0: -15.87, u1: 7.42, v0: -12.14, v1: 16.32, eave: 13.9, floor: 1.1, roof: { type: 'flat', parapet: 0.4, ov: 0.5, eaveMat: ['wood', '#6a4a30'] } },
      { u0: 7.42, u1: 23.55, v0: -12.14, v1: -3.88, eave: 13.9, floor: 7.4, roof: { type: 'flat', parapet: 0.4, ov: 0.5, eaveMat: ['wood', '#6a4a30'] } },
      { u0: 7.42, u1: 15.71, v0: -3.88, v1: 0.83, eave: 13.9, floor: 7.4, roof: { type: 'flat', parapet: 0.4, ov: 0.5, eaveMat: ['wood', '#6a4a30'] } },
      { u0: -17.28, u1: -15.87, v0: -9.97, v1: 0.83, eave: 4.3, floor: 1.1, storeys: 1, roof: { type: 'flat', parapet: 0.2 } },
    ],
    doors: [{ block: 0, face: 'W', s: 16.0, w: 1.8, h: 2.4 }],
    letters: [{ block: 0, face: 'W', s: 16.0, y: 4.2, h: 0.7, text: 'ΑΧΩ', mat: ['paint', '#efe6d6'] }],
  });
  r.object3d.name = 'alpha-chi-omega';
  return r;
}
