// Alpha Delta Chi (ΑΔΧ), Alpha chapter (Christian sorority), 2730 Dwight Way. A late-Victorian Stick-Eastlake house
// painted lavender with pink trim and cobalt-blue brackets: two storeys and an attic under steep cross gables with a
// small belvedere at the ridge, and a later one-storey flat-roofed stucco front addition carrying blue ΑΔΧ letters over
// a big gridded window, reached by steps from the drive. LiDAR: ridges ~13 m, eaves ~9.6 m, addition ~4 m.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { hedge, railing } from './lib/b12-greek.js';

export const info = {
  id: 'alpha-delta-chi',
  name: 'Alpha Delta Chi',
  subtitle: 'ΑΔΧ · 2730 Dwight Way',
  blurb: 'Alpha chapter house of Alpha Delta Chi, the Christian sorority founded at Berkeley in 1925: a lavender Victorian with a flat-roofed front addition carrying the letters.',
  replaces: ['w/473222268'],
};

export async function build(ctx) {
  const lav = ['clap', '#c4b2d6'], pink = ['paint', '#c98fc8'], blue = ['paint', '#3f5bb5'], roof = ['roof', '#6e6a4e'];
  const F = 1.3, half = null;
  const r = rseHouse(ctx, {
    ang: -4.49, floor: F, storeyH: 3.3, ov: 0.6,
    wall: lav, trim: pink, frame: blue, roof, base: ['stucco', '#a89cb4'], door: ['paint', '#2a2a30'],
    win: { w: 0.85, h: 1.85, bay: 2.8, sill: 0.8, tran: 0.5, casing: 0.12 }, belt: true,
    blocks: [
      { u0: -8.75, u1: 7.27, v0: -9.69, v1: 2.4, eave: 8.3, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 13.0, brackets: true, gableWin: { w: 1.0, h: 1.2 } } },
      { u0: -8.75, u1: -3.27, v0: -3.0, v1: 2.4, eave: 8.3, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 12.9, brackets: true, noGableWin: ['N'], gableWin: { w: 0.9, h: 1.2 } } },
      { u0: 2.0, u1: 7.27, v0: -3.0, v1: 2.4, eave: 8.3, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 12.6, brackets: true, noGableWin: ['N'], gableWin: { w: 0.9, h: 1.1 } } },
      { u0: -3.28, u1: 4.44, v0: -11.81, v1: -9.69, eave: 8.3, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 11.8, noGableWin: ['S'] } },
      { u0: -3.27, u1: 7.27, v0: 2.4, v1: 12.8, eave: 4.1, floor: 0.9, storeys: 1, wallM: null, win: { S: { none: true }, E: { nb: 2 }, W: { none: true } }, roof: { type: 'flat', parapet: 0.35, parapetMat: ['stucco', '#d8cce0'], capMat: pink } },
    ],
    doors: [{ block: 4, face: 'S', s: 2.0, w: 1.4, h: 2.4, y: 0.9 }],
    bays: [{ block: 0, face: 'W', s: 4.3, w: 4.4, d: 0.65, canted: true, storeys: 2 }],
    letters: [{ block: 4, face: 'S', s: 6.6, y: 3.15, h: 0.55, text: 'ΑΔΧ', mat: blue }],
    chimneys: [{ u: 5.0, v: -6.0, w: 0.8, d: 0.7, top: 13.8, mat: ['brick', '#8a4a3a'] }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, beam } = api; const add = blocks[4];
      // stucco skin on the addition (lilac) — overlay the S face, then the gridded window under the letters
      { const R = faceRun(add, 'S'); K.rbox(R, mat(['stucco', '#d8cce0']), -0.02, -0.5, 0, R.L + 0.02, add.eave, 0.04);
        const o0 = 4.4, o1 = 8.8, y0 = 0.9 + 0.35, y1 = 0.9 + 2.65; K.rbox(R, api.glass, o0, y0, 0.0, o1, y1, 0.05);
        for (let k = 0; k <= 4; k++) { const s = o0 + (o1 - o0) * k / 4; K.rbox(R, mat(['paint', '#f4f2f6']), s - 0.05, y0, 0.0, s + 0.05, y1, 0.09); }
        for (const y of [y0, y0 + 0.62, y1]) K.rbox(R, mat(['paint', '#f4f2f6']), o0 - 0.05, y - 0.05, 0.0, o1 + 0.05, y + 0.05, 0.09);
        K.rbox(R, mat(pink), 1.1, 0.9, 0.0, 2.9, 0.9 + 2.75, 0.12); // door surround
        for (const s of [0.9, 3.1]) railing(api, [R.at(s, 0.3), R.at(s, 1.9)], 0.15, { h: 0.9, step: 0.5 }); }
      // belvedere (cupola) at the main ridge
      { const b = blocks[0]; const cu = -0.5, cv = (b.v0 + b.v1) / 2; const y0 = 12.2, y1 = 14.2;
        K.box(mat(lav), cu - 1.4, y0, cv - 1.4, cu + 1.4, y1, cv + 1.4);
        for (const [du, dv, w, d] of [[0, -1.42, 2.0, 0.04], [0, 1.42, 2.0, 0.04], [-1.42, 0, 0.04, 2.0], [1.42, 0, 0.04, 2.0]]) K.box(api.glass, cu + du - w / 2, y0 + 0.5, cv + dv - d / 2, cu + du + w / 2, y1 - 0.3, cv + dv + d / 2);
        K.box(mat(pink), cu - 1.6, y1, cv - 1.6, cu + 1.6, y1 + 0.2, cv + 1.6);
        K.hip(mat(roof), cu - 1.7, cv - 1.7, cu + 1.7, cv + 1.7, y1 + 0.2, 0.55, {}); }
      // cobalt brackets under the front gables
      for (const bi of [1, 2]) { const b = blocks[bi]; const R = faceRun(b, 'S'); for (const s of [0.15, R.L - 0.15]) { const a = R.at(s, 0), c = R.at(s, 0.55); beam(mat(blue), [a[0], b.eave - 0.9, a[1]], [c[0], b.eave - 0.05, c[1]], 0.14, 0.14); } }
      hedge(api, [[-8.6, 3.6], [-3.6, 3.6]], { h: 0.8, t: 0.7, color: '#4f6a3a' });
    },
  }, { number: '2730' });
  r.object3d.name = 'alpha-delta-chi';
  return r;
}
