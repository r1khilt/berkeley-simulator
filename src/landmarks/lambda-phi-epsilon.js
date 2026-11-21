// Lambda Phi Epsilon (ΛΦΕ), Delta chapter (est. 1988), 2312 Warring Street — the building OpenStreetMap tags with Λ, where
// the chapter has held rush. A 1958 two-to-three-storey lodge (county records: built 1958, about 9,850 sq ft) on an L plan
// stepping down the hill from Warring: flat roofs, pale stucco with brown vertical-board end walls, aluminium slider windows,
// and motel-style open walkways with steel rails along the court. No usable exterior photo was found, so the facade is a
// period-typical reading that fits the LiDAR-derived massing (south bar ~10.4 m, north wing ~8.1 m). Plan from OSM.
import { rseHouse } from './lib/rse-finish.js';
import { railing } from './lib/b12-greek.js';
import { hmat } from './lib/greek-kit.js';

export const info = {
  id: 'lambda-phi-epsilon',
  name: 'Lambda Phi Epsilon',
  subtitle: 'ΛΦΕ · 2312 Warring Street',
  blurb: 'Lambda Phi Epsilon is Berkeley\'s Asian-interest fraternity (Delta chapter, founded 1988); its rush has been held at this 1958 house at 2312 Warring Street.',
  replaces: ['w/473598447'],
};

export async function build(ctx) {
  const stucco = ['stucco', '#dcd5c5'], trim = ['paint', '#e9e6dd'], metal = ['metal', '#c9ccce'];
  const boards = hmat(ctx, 'wood', '#f2e6d8');
  const r = rseHouse(ctx, {
    ang: -8.6, floor: -0.3, storeyH: 3.3, ov: 0.6, belt: false, frieze: false,
    wall: stucco, trim, frame: metal, roof: ['paint', '#56585a'], base: ['stucco', '#bdb6a6'], door: ['paint', '#8a3b2c'],
    win: { w: 1.9, h: 1.25, bay: 3.6, sill: 1.0, mull: 1, tran: 0, casing: 0 },
    blocks: [
      { u0: -21.9, u1: 18.6, v0: -3.9, v1: 8.5, eave: 10.2, storeys: 3, win: { W: { none: true } }, roof: { type: 'flat', parapet: 0.25, capMat: trim, ov: 0.6 } },
      { u0: -3.5, u1: 16.9, v0: -11.3, v1: -3.9, eave: 8.0, floor: 2.6, storeys: 2, roof: { type: 'flat', parapet: 0.25, capMat: trim, ov: 0.6 } },
    ],
    doors: [{ block: 0, face: 'E', s: 6.2, w: 1.1, h: 2.2, y: 4.3 }],
    letters: [{ block: 0, face: 'E', s: 6.2, y: 7.0, h: 0.75, text: 'ΛΦΕ', mat: ['paint', '#1f3e73'] }],
    extra: (api) => {
      const { K, M, blocks, faceRun, mat, walkables } = api; const b0 = blocks[0], b1 = blocks[1];
      // brown vertical-board wall on the downhill (west) end
      for (const f of ['W']) { const R = faceRun(b0, f); const g0 = Math.min(K.g(...R.at(0.5, 0.3)), K.g(...R.at(R.L - 0.5, 0.3)));
        K.rbox(R, boards, -0.02, Math.max(g0, -0.3), 0.0, R.L + 0.02, b0.eave - 0.05, 0.04);
        for (let s = 0.2; s < R.L; s += 0.4) K.rbox(R, boards, s - 0.02, Math.max(g0, -0.3), 0.04, s + 0.02, b0.eave - 0.05, 0.07, { detail: true }); }
      // motel-style open walkways with steel pipe rails along the court side (north face of the south bar)
      const R = faceRun(b0, 'N'); const H = 3.3;
      for (const k of [1, 2]) { const y = b0.f0 + k * H; const s0 = 22.6, s1 = 40.2; // along the court, west of the north wing
        K.rbox(R, M.concrete, s0, y - 0.22, 0, s1, y, 1.5);
        walkables.push(K.walkPoly([R.at(s0, 0), R.at(s1, 0), R.at(s1, 1.5), R.at(s0, 1.5)], y));
        railing(api, [R.at(s0, 1.45), R.at(s1, 1.45)], y, { h: 1.0, mat: metal, step: 0.12 });
        for (let s = s0 + 0.2; s < s1; s += 3.6) K.rbox(R, mat(metal), s - 0.05, b0.f0 + (k - 1) * H, 1.35, s + 0.05, y - 0.2, 1.45); }
      // open steel stair from the court up to the walkways
      { const n = Math.round((b0.f0 + 2 * H) / 0.18); const u0 = -6.6; const gS = K.g(u0, b0.v0 - 2.5);
        walkables.push(K.stairs(M.concrete, u0 - 0.6, b0.v0 - 1.5 - n * 0.27 * 0.5, u0 + 0.6, b0.v0 - 1.5, gS, b0.f0 + H, '+v', Math.round(n / 2))); }
      // ΛΦΕ letters and a flat canopy over the Warring Street door
      { const RE = faceRun(b0, 'E'); K.rbox(RE, mat(trim), 4.7, 4.3 + 2.45, 0, 7.7, 4.3 + 2.6, 1.3); }
    },
  }, { number: '2312', shrub: '#4f6b3c' });
  r.object3d.name = 'lambda-phi-epsilon';
  return r;
}
