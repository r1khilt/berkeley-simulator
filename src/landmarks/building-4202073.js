// Sigma Alpha Epsilon (ΣΑΕ), 2722 Bancroft Way. Two-storey Spanish Colonial Revival courtyard house: cream stucco ranges with
// low red-tile gable roofs (LiDAR eaves ~8.5 m, ridges ~10 m) around a central patio with a pier-and-timber arcade, and a
// lower gabled entry pavilion on Bancroft.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-4202073',
  name: "Sigma Alpha Epsilon",
  subtitle: "ΣΑΕ · 2722 Bancroft Way",
  blurb: "Sigma Alpha Epsilon chapter house on Bancroft Way, a Spanish Colonial courtyard house with red tile roofs and a pier arcade.",
  replaces: ['r/4202073'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -8.925, front: { block: 4, face: 'N', above: 0.4 }, storeyH: 3.3, ov: 0.45,
    wall: ['stucco', '#ede4cf'], trim: ['wood', '#4a3426'], frame: ['paint', '#3a2a20'], roof: ['tile', '#c0603f'], base: ['stucco', '#d4c9b0'], door: ['wood', '#4a3426'],
    win: { w: 0.95, h: 1.5, bay: 2.8, sill: 0.9, tran: 0.6, casing: 0 }, belt: false, frieze: false,
    blocks: [
      { u0: -13.23, u1: 12.84, v0: -13.3, v1: -5.4, eave: 8.4, roof: { type: 'gable', axis: 'u', ridge: 10.3, gableWin: false } },
      { u0: -13.23, u1: 13.2, v0: 5.67, v1: 15.4, eave: 8.4, roof: { type: 'gable', axis: 'u', ridge: 10.3, gableWin: false } },
      { u0: -13.23, u1: -5.1, v0: -5.4, v1: 5.67, eave: 8.4, roof: { type: 'gable', axis: 'v', ridge: 10.2, gableWin: false } },
      { u0: 4.95, u1: 12.84, v0: -5.4, v1: 5.67, eave: 8.4, roof: { type: 'gable', axis: 'v', ridge: 10.2, gableWin: false } },
      { u0: -6.06, u1: 1.52, v0: -17.1, v1: -13.3, eave: 5.2, storeys: 1, roof: { type: 'gable', axis: 'v', ridge: 7.0, gableWin: false } },
    ],
    doors: [{ block: 4, face: 'N', s: 3.79, w: 1.6, h: 2.5, arch: true }],
    letters: [{ block: 0, face: 'N', s: 4.4, y: 2.6, h: 0.42, text: 'ΣΑΕ', mat: ['paint', '#2b2b2b'] }],
    extra: ({ K, M, blocks, faceRun, mat, colliders }) => { // patio arcade: square stucco piers carrying a timber beam
      const st = mat(['stucco', '#ede4cf']), wd = mat(['wood', '#4a3426']); const y0 = blocks[0].f0, y1 = y0 + 3.0;
      const sides = [[blocks[0], 'S'], [blocks[1], 'N'], [blocks[2], 'E'], [blocks[3], 'W']];
      for (const [b, f] of sides) { const R = faceRun(b, f); const s0 = f === 'S' || f === 'N' ? (f === 'S' ? -5.1 - b.u0 : b.u1 - 4.95) : 0, s1 = f === 'S' || f === 'N' ? (f === 'S' ? 4.95 - b.u0 : b.u1 + 5.1) : R.L;
        const n = Math.max(2, Math.round((s1 - s0) / 2.4)); for (let k = 0; k <= n; k++) { const s = s0 + (s1 - s0) * k / n; K.rbox(R, st, s - 0.22, y0 - 0.5, 1.4, s + 0.22, y1, 1.84); }
        K.rbox(R, wd, s0 - 0.2, y1, 1.35, s1 + 0.2, y1 + 0.35, 1.9); K.rbox(R, mat(['tile', '#c0603f']), s0 - 0.2, y1 + 0.35, 0, s1 + 0.2, y1 + 0.45, 2.0); }
    },
  });
  r.object3d.name = 'building-4202073';
  return r;
}
