// Alpha Delta Phi (ΑΔΦ), California chapter (est. 1908), 2422 Prospect Street. An asymmetric early-1900s Berkeley house:
// a broad side-gabled main roof that sweeps down to the first-floor line toward Prospect, carrying a shed dormer, a recessed
// balcony dormer and a small gabled attic dormer, beside a narrow two-storey front-gabled cross-wing on the left. Pale
// grey-beige stucco, very dark green trim, rakes and a strong fascia band at the first-floor ceiling, exposed rafter tails,
// green ΑΔΦ letters on the cross-wing, and a shallow entry porch under the main eave on white columns set on dark green
// pedestals, reached by a couple of wide steps. Plan from OSM; heights from the LiDAR-derived model; facade from photos.
import { rseHouse } from './lib/rse-finish.js';
import { rafters, railing } from './lib/b12-greek.js';

export const info = {
  id: 'alpha-delta-phi',
  name: 'Alpha Delta Phi',
  subtitle: 'ΑΔΦ · 2422 Prospect Street',
  blurb: 'Chapter house of the California chapter of Alpha Delta Phi, founded at Berkeley in 1908: an asymmetric stucco house on Prospect Street with a steep dormered roof and a front-gabled wing carrying the letters.',
  replaces: ['w/473598429'],
};

export async function build(ctx) {
  const green = ['paint', '#1f4a33'], stucco = ['stucco', '#c9c6bc'], white = ['paint', '#f1f0ea'];
  const H = 3.2;
  const r = rseHouse(ctx, {
    ang: -8.6, front: { block: 0, face: 'E', above: 0.5 }, storeyH: H, ov: 0.7, belt: true, belts: true, frieze: true,
    wall: stucco, trim: green, frame: green, roof: ['roof', '#6b5243'], base: ['stucco', '#9d998e'], door: ['paint', '#1e6b3a'],
    win: { w: 1.0, h: 1.6, bay: 3.2, sill: 0.8, tran: 0.62, muntins: 2, casing: 0.1 },
    blocks: [
      { u0: -8.7, u1: 6.9, v0: -9.0, v1: 1.9, eave: 6.3, storeys: 1, win: { E: { nb: 3, skip: [0] } }, roof: { type: 'gable', axis: 'v', ridge: 13.8, ov: 0.75, gableWin: { w: 1.5, h: 1.2, dy: 3.4 } } },
      { u0: -8.7, u1: 7.9, v0: 1.9, v1: 7.9, eave: 9.2, storeys: 2, win: { E: { nb: 1, st: [{ w: 1.2, h: 1.8 }, { w: 2.0, h: 1.4, mull: 2 }] } }, roof: { type: 'gable', axis: 'u', ridge: 12.1, ov: 0.6, noGableWin: ['E'] } },
    ],
    doors: [{ block: 0, face: 'E', s: 1.35, w: 1.0, h: 2.2 }],
    porches: [{ block: 0, face: 'E', s0: 0.05, s1: 2.75, depth: 1.7, cols: 2, colD: 0.3, colStyle: 'pier', colMat: white, pedMat: green, fascia: green, rail: false, stepS: 1.35, stepW: 2.4 }],
    dormers: [
      { block: 0, side: 'E', s: 3.0, w: 2.3, h: 1.5, inset: 1.6, type: 'shed', nwin: 2, winW: 1.8, mat: stucco },
      { block: 0, side: 'E', s: 7.4, w: 2.4, h: 1.6, inset: 1.6, type: 'shed', nwin: 1, winW: 1.6, mat: stucco },
      { block: 0, side: 'E', s: 5.3, w: 1.6, h: 1.2, inset: 4.4, winW: 0.8, mat: stucco },
    ],
    chimneys: [{ u: -6.0, v: -9.0, w: 1.2, d: 0.7, top: 14.3, mat: ['brick', '#8c5442'] }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, glass } = api; const b0 = blocks[0], b1 = blocks[1];
      rafters(api, 0, { faces: ['E', 'W'], spacing: 0.7, mat: green }); rafters(api, 1, { faces: ['N', 'S'], spacing: 0.7, mat: green });
      // green letters on the cross-wing, just above the first-floor fascia band
      const R1 = faceRun(b1, 'E'); api.letters(R1, mat(['paint', '#3fa66a']), 'ΑΔΦ', 3.0, b1.f0 + H + 0.25, 0.62, { dep: 0.06 });
      // flared gable feet: small curved brackets under the cross-wing rakes
      for (const s of [0.25, R1.L - 0.25]) { const p0 = R1.at(s, 0), p1 = R1.at(s, 0.55); api.beam(mat(green), [p0[0], b1.eave - 0.8, p0[1]], [p1[0], b1.eave - 0.15, p1[1]], 0.1, 0.12); }
      // recessed balcony dormer: black railing in front of the second (single-window) dormer
      { const s = 7.4; const yb = b0.eave + (b0.ridgeY - b0.eave) * Math.min(1, 1.6 / 7.8); const u = b0.u1 - 1.6 + 0.35; railing(api, [[u, b0.v0 + s - 1.1], [u, b0.v0 + s + 1.1]], yb + 0.05, { h: 0.95, mat: ['metal', '#151515'], step: 0.11 }); }
      // side-gable windows on the main block (second floor + attic) and dark board fence + hedge along the street
      const fx = b0.u1 + 10.2; for (let v = -9.4; v < -2.2; v += 0.16) api.pbox('#3f3326', fx - 0.04, K.g(fx, v) - 0.1, v, fx + 0.04, K.g(fx, v) + 1.7, v + 0.14);
      for (let v = -1.2; v < 8.4; v += 0.85) { const gy = K.g(fx, v); api.pbox('#3d5a2b', fx - 0.35, gy - 0.1, v, fx + 0.35, gy + 0.72, v + 0.8); }
    },
  }, { number: '2422', gutter: '#1f4a33', shrub: '#4f6a3a' });
  r.object3d.name = 'alpha-delta-phi';
  return r;
}
