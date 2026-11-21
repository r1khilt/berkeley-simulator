// Alpha Delta Pi (ΑΔΠ), Omega chapter, 2400 Piedmont Avenue at Channing Way. Tudor Revival sorority house in pale
// grey-beige stucco: a steep front-gabled pavilion on Piedmont with dark half-timbering and angled oriel bays on the
// upper floors, beside a three-storey flat-roofed block (later wing) with paired casements, a long gabled north wing on
// Channing and a tall brick garden wall with piers along the sidewalk. LiDAR: flat block ~14 m, gable ~14.5 m,
// north wing ridge ~12.8 m.
import { greekHouse } from './lib/greek-kit.js';
import { gardenWall, hedge } from './lib/b12-greek.js';

export const info = {
  id: 'alpha-delta-pi',
  name: 'Alpha Delta Pi',
  subtitle: 'ΑΔΠ · 2400 Piedmont Avenue',
  blurb: 'Chapter house of Alpha Delta Pi at Piedmont Avenue and Channing Way, a half-timbered Tudor Revival house with a steep street gable behind a brick garden wall.',
  replaces: ['w/473598455'],
};

export async function build(ctx) {
  const wall = ['stucco', '#cbc5ba'], timber = ['paint', '#4a4740'], trim = ['paint', '#3f4743'], roof = ['roof', '#5a5a5c'], brick = ['brick', '#8a5444'];
  const F = 2.7, half = { mat: timber };
  const r = greekHouse(ctx, {
    ang: -9.405, floor: F, storeyH: 3.55, ov: 0.35,
    wall, trim, frame: trim, roof, base: ['stucco', '#b5afa4'], door: ['wood', '#4a3022'],
    win: { w: 0.85, h: 1.45, bay: 3.0, sill: 0.85, tran: 0.7, casing: 0, pair: true, mull: 1, muntins: 2 }, belt: false,
    blocks: [
      { u0: -8.14, u1: 7.11, v0: -3.11, v1: 13.56, eave: 13.6, storeys: 3, roof: { type: 'flat', parapet: 0.45, capMat: ['stucco', '#b9b3a8'] } },
      { u0: 7.11, u1: 13.3, v0: 5.95, v1: 13.56, eave: 10.8, storeys: 2, win: { E: { none: true } }, roof: { type: 'gable', axis: 'u', ridge: 15.2, ov: 0.4, noGableWin: ['W'], gableWin: { w: 1.0, h: 0.8 }, half } },
      { u0: 7.11, u1: 10.48, v0: -3.1, v1: 3.08, eave: 8.3, storeys: 2, win: { E: { nb: 2, st: [{ w: 1.0, h: 2.2, sill: 0.1, pair: true }, {}] } }, roof: { type: 'flat', parapet: 0.35 } },
      { u0: -8.14, u1: 1.28, v0: -6.0, v1: -3.11, eave: 13.6, storeys: 3, roof: { type: 'flat', parapet: 0.45 } },
      { u0: -8.14, u1: 1.28, v0: -19.72, v1: -6.0, eave: 9.6, floor: 2.0, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 12.8, ov: 0.35, half, gableWin: { w: 1.4, h: 0.9 } } },
    ],
    doors: [{ block: 0, face: 'E', s: 9.1, w: 1.2, h: 2.4, arch: true }],
    bays: [{ block: 1, face: 'E', s: 3.8, w: 4.0, d: 0.6, canted: true, y0: F + 3.55 - 0.4, y1: F + 2 * 3.55 + 3.3, storeys: 2, roof: 'flat' }],
    chimneys: [{ u: 10.0, v: 13.95, w: 1.2, d: 0.7, top: 16.0, mat: brick }, { u: -5.0, v: -12.0, w: 1.0, d: 0.7, top: 14.0, mat: brick }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api; const b = blocks[1]; const R = faceRun(b, 'E');
      // ground-floor window group of the pavilion and half-timber posts/rails on its upper storeys
      { const o0 = 1.6, o1 = 6.0, y0 = F + 0.7, y1 = F + 2.9; K.rbox(R, api.glass, o0, y0, -0.12, o1, y1, -0.08);
        for (let k = 0; k <= 3; k++) { const s = o0 + (o1 - o0) * k / 3; K.rbox(R, mat(trim), s - 0.06, y0, -0.12, s + 0.06, y1, 0.04); }
        K.rbox(R, mat(trim), o0 - 0.1, y1, 0, o1 + 0.1, y1 + 0.15, 0.08); K.rbox(R, mat(trim), o0 - 0.1, y0 - 0.12, 0, o1 + 0.1, y0, 0.1); }
      for (const y of [F + 3.4, F + 6.95, b.eave]) K.rbox(R, mat(timber), 0, y - 0.12, 0, R.L, y + 0.08, 0.06);
      for (const s of [0.12, 1.2, R.L - 1.2, R.L - 0.12]) K.rbox(R, mat(timber), s - 0.1, F + 3.4, 0, s + 0.1, b.eave, 0.05);
      // brick garden wall with piers on Piedmont
      gardenWall(api, [[16.6, -6.0], [16.6, 2.4]], { h: 1.4, t: 0.4, mat: brick, cap: ['brick', '#5e3a30'] });
      gardenWall(api, [[16.6, 6.0], [16.6, 16.0]], { h: 1.4, t: 0.4, mat: brick, cap: ['brick', '#5e3a30'] });
      for (const v of [-6.0, -1.8, 2.4, 6.0, 11.0, 16.0]) { const g = K.g(16.6, v); K.box(mat(brick), 16.3, g - 0.5, v - 0.3, 16.9, g + 1.75, v + 0.3); }
      hedge(api, [[15.4, -5.4], [15.4, 1.8]], { h: 1.7, t: 1.0 }); hedge(api, [[15.4, 6.6], [15.4, 15.4]], { h: 1.7, t: 1.0 });
    },
  });
  r.object3d.name = 'alpha-delta-pi';
  return r;
}
