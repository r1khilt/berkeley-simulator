// Zeta Psi (ΖΨ), Iota chapter, 2728 Bancroft Way. Mid-century two-storey chapter house in a U around a rear yard.
// On Bancroft: an orange-red brick ground floor that is mostly solid, with two big glazed door-window bays and a
// recessed entry between brick piers at the east end; above it a terracotta-brown panelled upper storey cantilevers
// ~0.75 m on a cream soffit band, with vertical fins and a row of wide sliders under a flat roof with a thin fascia.
// A long east wing and a lower south-west wing close the yard. LiDAR: roofs ~9-10.5 m.
import { greekHouse } from './lib/greek-kit.js';
import { gardenWall, hedge } from './lib/b12-greek.js';

export const info = {
  id: 'zeta-psi',
  name: 'Zeta Psi',
  subtitle: 'ΖΨ · 2728 Bancroft Way',
  blurb: 'Chapter house of the Iota chapter of Zeta Psi on Bancroft Way, a long two-storey mid-century house with a brick ground floor and a cantilevered panelled upper storey.',
  replaces: ['w/313188874'],
};

export async function build(ctx) {
  const brick = ['brick', '#c46a50'], panel = ['paint', '#94553f'], cream = ['paint', '#d8cfbf'], frameC = ['paint', '#5b4636'];
  const F = 3.1, H = 2.95, YU = F + H, YE = 9.0;
  const r = greekHouse(ctx, {
    ang: -8.904, floor: F, storeyH: H, ov: 0.6, split: H,
    wall: panel, wall0: brick, trim: cream, frame: frameC, roof: ['roof', '#5a4e46'], base: ['brick', '#a85a44'], door: ['paint', '#2e2a28'],
    win: { w: 2.0, h: 1.1, bay: 4.6, sill: 1.2, tran: 0, casing: 0, mull: 1, st: [{ w: 1.0, h: 1.5, sill: 0.9, mull: 1 }] },
    belt: false,
    blocks: [
      { u0: -16.2, u1: 13.04, v0: -21.5, v1: -6.9, eave: YE, storeys: 2,
        win: { N: { nb: 8, st: [{ w: 3.1, h: 2.45, sill: 0.1, mull: 3, tran: 0.84, skip: [0, 1, 2, 3, 6, 7] }, { none: true }] } },
        roof: { type: 'flat', parapet: 0.0, ov: 0.35, eaveMat: cream } },
      { u0: -1.0, u1: 13.04, v0: -6.9, v1: 22.3, eave: YE, storeys: 2, roof: { type: 'flat', parapet: 0.0, ov: 0.6, eaveMat: cream } },
      { u0: -16.1, u1: -1.0, v0: 8.8, v1: 22.2, eave: 6.6, floor: 1.0, storeys: 2, split: 2.8, roof: { type: 'flat', parapet: 0.0, ov: 0.5, eaveMat: cream } },
    ],
    doors: [{ block: 0, face: 'N', s: 2.6, w: 1.7, h: 2.3 }],
    chimneys: [{ u: -12.0, v: -10.0, w: 1.0, d: 0.65, top: 10.4, mat: brick }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, glass } = api; const b = blocks[0]; const R = faceRun(b, 'N'); const L = R.L;
      // cantilevered upper storey: a wall plane 0.75 m out with 6 wide sliders, fins, cream soffit and end caps
      const CO = 1.0; const R2 = K.run([b.u1, b.v0], [b.u0, b.v0], CO); const ops = [];
      for (let k = 0; k < 6; k++) { const c = L * (k + 0.5) / 6; ops.push({ s0: c - 1.15, s1: c + 1.15, y0: YE - 0.35 - 1.15, y1: YE - 0.35 }); }
      K.wall(R2, mat(panel), 0, L, YU, YE, ops, 0.3);
      for (const o of ops) { K.fill(R2, { ...o, sill: false }, { rev: 0.22, mull: 1, frame: mat(frameC), glass }); K.rbox(R2, mat(['paint', '#7e4636']), o.s0, YU + 0.15, 0.0, o.s1, o.y0 - 0.08, 0.03); }
      for (let k = 0; k <= 6; k++) { const s = Math.min(L - 0.08, Math.max(0.08, L * k / 6)); K.rbox(R2, mat(['paint', '#7a4433']), s - 0.08, YU, 0, s + 0.08, YE, 0.15); }
      K.rbox(R, mat(cream), 0, YU - 0.3, 0, L, YU + 0.02, CO + 0.05);
      K.rbox(R, mat(['roof', '#6a6460']), -0.3, YE - 0.06, 0, L + 0.3, YE + 0.06, CO + 0.1); K.rbox(R, mat(cream), -0.3, YE - 0.22, CO + 0.02, L + 0.3, YE + 0.1, CO + 0.12);
      for (const s of [0.0, L - 0.3]) K.rbox(R, mat(panel), s, YU, 0, s + 0.3, YE, CO);
      // recessed entry: brick piers either side of the door, under the cantilever
      for (const s of [1.25, 3.95]) K.rbox(R, mat(brick), s - 0.25, F - 0.6, 0.05, s + 0.25, YU - 0.3, CO - 0.05);
      { const g0 = Math.min(K.g(...R.at(2.6, 1.2)), K.g(...R.at(2.6, 2.6))); const n = Math.max(2, Math.round((F - g0) / 0.17)); for (let k = 0; k < n; k++) { const y = F - (k + 1) * (F - g0) / n; K.rbox(R, mat(['concrete', '#bdb8ae']), 1.5, g0 - 0.3, 0, 3.7, y + (F - g0) / n, 0.25 + k * 0.3 + 0.3); }
        for (const s of [1.35, 3.85]) K.rbox(R, mat(brick), s - 0.12, g0 - 0.3, 0.3, s + 0.12, F + 0.5, 0.3 + n * 0.3); }
      // ΖΨ banner under the second upper window from the east
      { const c = L * 1.5 / 6; K.rbox(R2, mat(['paint', '#f4f2ea']), c - 0.8, YU + 0.25, 0.02, c + 0.8, YU + 1.1, 0.04); api.letters(R2, mat(['paint', '#b8862a']), 'ΖΨ', c, YU + 0.42, 0.5, { dep: 0.03, d0: 0.04 }); }
      // low brick curb with a clipped hedge along Bancroft
      gardenWall(api, [[-16.5, -24.6], [-0.2, -24.6]], { h: 0.35, t: 0.3, mat: brick }); gardenWall(api, [[2.6, -24.6], [13.3, -24.6]], { h: 0.35, t: 0.3, mat: brick });
      hedge(api, [[-16.0, -23.4], [-1.0, -23.4]], { h: 1.2, t: 0.9 }); hedge(api, [[5.0, -23.4], [12.8, -23.4]], { h: 1.2, t: 0.9 });
    },
  });
  r.object3d.name = 'zeta-psi';
  return r;
}
