// Sigma Kappa (ΣΚ), 2409 Warring Street. Three-storey pale pink stucco house mixing Tudor and Mediterranean: steep gables with
// thin white bargeboards (LiDAR ridges ~14.5-15.6 m), divided-light casements, round-arched openings and a one-storey
// flat-roofed front projection whose parapet edges a terrace; dark ΣΚ letters on the gable wall.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'sigma-kappa-sorority',
  name: "Sigma Kappa",
  subtitle: "ΣΚ · 2409 Warring Street",
  blurb: "Sigma Kappa chapter house on Warring Street, a pale pink stucco house with steep gables, arched openings and a terrace.",
  replaces: ['w/337681224'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -8.159, front: { block: 0, face: 'W', above: 0.6 }, storeyH: 3.1, ov: 0.45,
    wall: ['stucco', '#f0d6d9'], trim: ['paint', '#ffffff'], roof: ['roof', '#4a4642'], base: ['stucco', '#d9bfc2'], door: ['wood', '#5a3e2e'],
    win: { w: 0.7, h: 1.5, bay: 2.6, sill: 0.85, tran: 0.66, casing: 0.06, pair: true, mull: 1 },
    blocks: [
      { u0: -12.2, u1: -1.62, v0: -10.55, v1: 3.0, eave: 10.4, roof: { type: 'gable', axis: 'u', ridge: 14.6, gableWin: { w: 2.0, h: 1.2 } } },
      { u0: -12.2, u1: -1.62, v0: 3.0, v1: 17.38, eave: 10.4, roof: { type: 'gable', axis: 'v', ridge: 14.2, gableWin: { w: 1.6, h: 1.0 } } },
      { u0: -14.62, u1: -12.2, v0: -4.0, v1: 17.38, eave: 4.0, storeys: 1, roof: { type: 'flat', parapet: 0.9 }, winAll: { arch: true, w: 1.6, h: 2.0, pair: false } },
      { u0: -1.62, u1: 4.93, v0: -10.55, v1: 1.58, eave: 12.6, roof: { type: 'hip', ridge: 14.0 } },
      { u0: 4.93, u1: 13.21, v0: -25.23, v1: 1.58, eave: 13.4, roof: { type: 'gable', axis: 'v', ridge: 15.6 } },
      { u0: -1.62, u1: 13.21, v0: 8.11, v1: 17.38, eave: 9.2, roof: { type: 'hip', ridge: 10.6 } },
    ],
    doors: [{ block: 2, face: 'W', s: 10.5, w: 1.4, h: 2.3, arch: true }],
    letters: [{ block: 0, face: 'W', s: 4.0, y: 7.4, h: 0.6, text: 'ΣΚ', mat: ['paint', '#2b2b2b'] }],
    dormers: [{ block: 1, side: 'W', s: 9.0, w: 2.2, h: 1.4, inset: 0.8 }],
  }, { number: '2409' });
  r.object3d.name = 'sigma-kappa-sorority';
  return r;
}
