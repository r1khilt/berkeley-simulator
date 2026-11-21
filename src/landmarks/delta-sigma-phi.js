// Delta Sigma Phi (ΔΣΦ), Hilgard chapter (est. 1899), 2311 Piedmont Avenue, between Durant Avenue and Thorsen House.
// A mid-century modern chapter house: a long two-storey volume in dark reddish-brown wood siding with white-framed ribbon
// windows and a thin white fascia sits back on a one-storey red-brick podium that fronts Piedmont, with a recessed central
// opening under a white lintel band and a railed deck on the podium roof; the rear wings step up the hill around a court.
// Plan from OSM; heights from the LiDAR-derived model (podium ~3.5 m, main block ~11.6 m); facade from an archival photo.
import { rseHouse } from './lib/rse-finish.js';
import { hmat } from './lib/greek-kit.js';
import { railing } from './lib/b12-greek.js';

export const info = {
  id: 'delta-sigma-phi',
  name: 'Delta Sigma Phi',
  subtitle: 'ΔΣΦ · 2311 Piedmont Avenue',
  blurb: 'Chapter house of the Hilgard chapter of Delta Sigma Phi on Piedmont Avenue: a mid-century wood-clad block set back on a red-brick podium facing the street.',
  replaces: ['w/473598522'],
};

export async function build(ctx) {
  const wood = ['wood', '#5e3a2a'], brick = ['brick', '#9a6450'], white = ['paint', '#ecebe6'];
  const F = 3.8;
  const r = rseHouse(ctx, {
    ang: -8.6, floor: F, storeyH: 3.75, ov: 0.3, belt: false, frieze: false,
    wall: wood, trim: white, frame: white, roof: ['paint', '#5a5a58'], base: brick, door: ['paint', '#2a2a2a'],
    win: { w: 2.5, h: 1.45, bay: 3.4, sill: 1.0, mull: 2, tran: 0, casing: 0 },
    blocks: [
      { u0: -19.5, u1: -8.5, v0: -13.9, v1: 13.0, eave: 3.5, floor: -0.6, storeys: 1, wallM: hmat(ctx, 'brick', '#9a6450'), win: { W: { none: true }, N: { none: true }, S: { none: true } }, roof: { type: 'flat', parapet: 0.25, parapetMat: white, capMat: white, deck: ['paint', '#6b6e6a'] } },
      { u0: -8.5, u1: 8.6, v0: -12.6, v1: 14.4, eave: 10.6, storeys: 2, win: { W: { st: [{ none: true }, { nb: 5, w: 1.2, h: 0.85, mull: 0, sill: 1.2 }] } }, roof: { type: 'flat', parapet: 0.1, parapetMat: white, capMat: white, ov: 1.1, eaveMat: ['paint', '#d8d2c4'] } },
      { u0: 8.6, u1: 20.3, v0: -14.5, v1: -3.2, eave: 10.6, storeys: 2, roof: { type: 'flat', parapet: 0.1, parapetMat: white, capMat: white, ov: 1.1, eaveMat: ['paint', '#d8d2c4'] } },
      { u0: 8.6, u1: 20.6, v0: 3.1, v1: 15.1, eave: 10.6, storeys: 2, roof: { type: 'flat', parapet: 0.1, parapetMat: white, capMat: white, ov: 1.1, eaveMat: ['paint', '#d8d2c4'] } },
    ],
    doors: [{ block: 1, face: 'W', s: 13.5, w: 1.1, h: 2.3, noStoop: true }, { block: 0, face: 'W', s: 13.45, w: 7.0, h: 2.4, y: -0.55, mat: ['paint', '#1c1b1a'], noStoop: true }, { block: 1, face: 'N', s: 13.5, w: 1.1, h: 2.2 }],
    extra: (api) => {
      const { K, M, blocks, faceRun, mat, walkables } = api; const b0 = blocks[0];
      // brick podium: white lintel band over the central opening, coping, railed roof deck
      { const R = faceRun(b0, 'W'); K.rbox(R, mat(['paint', '#e6dfcc']), 13.45 - 3.9, 1.85, 0, 13.45 + 3.9, 2.65, 0.3); K.rbox(R, mat(white), -0.1, b0.eave - 0.12, 0, R.L + 0.1, b0.eave + 0.05, 0.12); }
      walkables.push(K.walkPoly([[b0.u0 + 0.3, b0.v0 + 0.3], [b0.u1, b0.v0 + 0.3], [b0.u1, b0.v1 - 0.3], [b0.u0 + 0.3, b0.v1 - 0.3]], b0.eave + 0.05));
      railing(api, [[b0.u0 + 0.25, b0.v0 + 0.25], [b0.u0 + 0.25, b0.v1 - 0.25]], b0.eave + 0.3, { h: 0.95, mat: ['metal', '#d8d8d4'], step: 0.14 });
      railing(api, [[b0.u0 + 0.25, b0.v1 - 0.25], [b0.u1, b0.v1 - 0.25]], b0.eave + 0.3, { h: 0.95, mat: ['metal', '#d8d8d4'], step: 0.14 });
      // stair from the Piedmont sidewalk up to the podium deck along its north side
      const gS = K.g(b0.u0 - 0.5, b0.v0 - 1.0); const n = Math.max(3, Math.round((b0.eave + 0.05 - gS) / 0.175));
      walkables.push(K.stairs(M.concrete, b0.u0, b0.v0 - 1.7, b0.u0 + n * 0.28, b0.v0 - 0.1, gS, b0.eave + 0.05, '+u', n));
      railing(api, [[b0.u0, b0.v0 - 1.75], [b0.u0 + n * 0.28, b0.v0 - 1.75]], gS + 0.9, { h: 0.9, mat: ['metal', '#d8d8d4'], step: 0.5 });
      // white door surround on the deck, centred on the upper volume
      const b1 = blocks[1]; const R = faceRun(b1, 'W'); K.rbox(R, mat(white), 13.5 - 0.8, F - 0.05, 0, 13.5 + 0.8, F + 2.6, 0.3); K.rbox(R, api.glass, 13.5 - 0.55, F, 0.25, 13.5 + 0.55, F + 2.35, 0.31);
      K.rbox(R, api.M.lampGlow, 13.5 + 0.95, F + 1.7, 0.02, 13.5 + 1.07, F + 1.95, 0.12, { detail: true });
      // vertical board battens on the wood volume
      for (const bi of [1, 2, 3]) { const b = blocks[bi]; for (const f of ['W', 'N', 'S', 'E']) { const RR = faceRun(b, f); for (let s = 0.4; s < RR.L - 0.2; s += 0.8) K.rbox(RR, mat(['wood', '#4f3123']), s - 0.03, Math.max(F, K.g(...RR.at(s, 0.3)) + 0.1), 0, s + 0.03, b.eave - 0.05, 0.03, { detail: true }); } }
    },
  }, { number: '2311', walk: false, shrub: '#53703f', cartSide: 'S', sconces: false, plaque: false, plants: false });
  r.object3d.name = 'delta-sigma-phi';
  return r;
}
