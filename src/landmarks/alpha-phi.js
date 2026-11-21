// Alpha Phi (ΑΦ), 2830 Bancroft Steps. Big hillside house in the Berkeley brown-shingle manner: a long range parallel to the steps
// with a hipped roof (LiDAR eaves ~13.4 m, ridge ~15.4 m) that is four storeys at the downhill west end and two at the top,
// with hipped wings to the south. Style from the street context; no verified photo of this house was available.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'alpha-phi',
  name: "Alpha Phi",
  subtitle: "ΑΦ · 2830 Bancroft Steps",
  blurb: "Alpha Phi (Nu chapter) house on the Bancroft Steps, a big brown-shingle house that climbs the hillside toward the stadium.",
  replaces: ['w/473598462'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -10.59, front: { block: 0, face: 'N', above: 0.6 }, storeyH: 3.0, ov: 0.8,
    wall: ['shingle', '#7e5f44'], trim: ['paint', '#efe9dc'], roof: ['roof', '#4e4a46'], base: ['stucco', '#8f877a'],
    win: { w: 0.85, h: 1.5, bay: 2.6, sill: 0.8, tran: 0.62, casing: 0.11, pair: true },
    blocks: [
      { u0: -17.7, u1: 16.25, v0: -8.37, v1: 1.54, eave: 13.3, floor: 0.6, roof: { type: 'hip', ridge: 15.5 } },
      { u0: 3.5, u1: 16.25, v0: 1.54, v1: 12.71, eave: 13.6, floor: 3.6, roof: { type: 'hip', ridge: 15.3 } },
      { u0: -17.7, u1: -10.19, v0: 1.54, v1: 10.92, eave: 12.6, floor: 0.6, roof: { type: 'hip', ridge: 14.2 } },
      { u0: -17.7, u1: -5.84, v0: -10.44, v1: -8.37, eave: 11.8, floor: 0.6, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'N', s: 9.0, w: 1.3, h: 2.4, fan: true, y: 6.6 }],
    letters: [{ block: 0, face: 'N', s: 13.0, y: 10.4, h: 0.8, text: 'ΑΦ', mat: ['paint', '#efe9dc'] }],
    dormers: [{ block: 0, side: 'N', s: 4.0, w: 2.4, h: 1.3, inset: 0.9 }, { block: 0, side: 'N', s: 22.0, w: 2.4, h: 1.3, inset: 0.9 }],
    chimneys: [{ u: -4.0, v: -3.0, w: 1.0, d: 0.8, top: 16.6 }],
  }, { number: '2830' });
  r.object3d.name = 'alpha-phi';
  return r;
}
