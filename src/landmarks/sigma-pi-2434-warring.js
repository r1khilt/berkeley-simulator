// Former Sigma Pi house, 2434 Warring Street. Stucco Tudor Revival chapter house, three storeys: off-white render with
// charcoal-green half-timbering and belt timbers at each floor, a tall half-timbered street gable over a central bay of
// glazed doors and casements, jettied upper floors on carved brackets, black metal balconies tied by a fire escape,
// and a raised red-painted wooden deck in front. LiDAR: main roof ~12 m (flat behind the street gable), west wing ~6.5 m.
import { greekHouse } from './lib/greek-kit.js';
import { hedge, railing } from './lib/b12-greek.js';

export const info = {
  id: 'sigma-pi-2434-warring',
  name: 'Former Sigma Pi House',
  subtitle: '2434 Warring Street',
  blurb: 'A three-storey stucco Tudor Revival fraternity house on Warring Street, long the Sigma Pi chapter house, with half-timbered gables and a raised front deck.',
  replaces: ['w/473598441'],
};

export async function build(ctx) {
  const st = ['stucco', '#ecebe6'], tim = ['paint', '#2e3838'], roof = ['roof', '#3f4243'], deck = ['wood', '#8a3b2e'];
  const F = 2.9;
  const r = greekHouse(ctx, {
    ang: -7.878, floor: F, storeyH: 2.95, ov: 0.6,
    wall: st, trim: tim, frame: tim, roof, base: ['stucco', '#d9d8d2'], door: ['paint', '#2e3838'],
    win: { w: 0.6, h: 1.45, bay: 3.0, sill: 0.8, tran: 0.7, casing: 0.1, pair: true, mull: 1, muntins: 2 }, belt: true, belts: true, frieze: false,
    blocks: [
      { u0: 3.51, u1: 13.19, v0: -3.54, v1: 3.55, eave: 11.2, storeys: 3, win: { E: { nb: 1, w: 0.75, mull: 2, st: [{ none: true }, {}, {}] } }, roof: { type: 'gable', axis: 'u', ridge: 13.2, ov: 0.7, noGableWin: ['W'], gableWin: { w: 1.2, h: 0.8 }, half: { mat: tim } } },
      { u0: -6.39, u1: 3.51, v0: -5.96, v1: 3.55, eave: 11.6, storeys: 3, floor: F - 0.6, roof: { type: 'flat', parapet: 0.4 } },
      { u0: -4.54, u1: 2.15, v0: 3.55, v1: 7.4, eave: 11.6, storeys: 3, floor: F - 0.6, roof: { type: 'flat', parapet: 0.4 } },
      { u0: -11.76, u1: -6.39, v0: -4.8, v1: 3.54, eave: 6.4, floor: 0.6, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 8.2, half: { mat: tim } } },
    ],
    doors: [{ block: 0, face: 'E', s: 3.55, w: 2.2, h: 2.4 }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, beam } = api; const b = blocks[0]; const R = faceRun(b, 'E'); const L = R.L;
      // half-timber posts framing the central bay and the corners, belt timbers at each floor
      for (const s of [0.1, 1.5, L - 1.5, L - 0.1]) K.rbox(R, mat(tim), s - 0.11, F - 0.2, 0, s + 0.11, b.eave, 0.06);
      for (let k = 1; k <= 3; k++) K.rbox(R, mat(tim), 0, F + k * 2.95 - 0.14, 0, L, F + k * 2.95 + 0.06, 0.08);
      // jetty brackets under the upper floors
      for (let k = 1; k <= 2; k++) for (const s of [0.4, 1.4, L - 1.4, L - 0.4]) { const a = R.at(s, 0), c = R.at(s, 0.45); beam(mat(tim), [a[0], F + k * 2.95 - 0.7, a[1]], [c[0], F + k * 2.95 - 0.1, c[1]], 0.14, 0.14); }
      // black metal balconies at floors 2 and 3, joined by a diagonal fire-escape stair
      for (let k = 1; k <= 2; k++) { const y = F + k * 2.95; K.rbox(R, mat(['metal', '#1c1c1c']), 2.0, y - 0.08, 0, 5.1, y, 1.0); railing(api, [R.at(2.0, 0.98), R.at(5.1, 0.98)], y, { h: 1.0, step: 0.12 }); }
      { const a = R.at(5.0, 0.6), c = R.at(2.1, 0.6); beam(mat(['metal', '#1c1c1c']), [a[0], F + 2.95, a[1]], [c[0], F + 2 * 2.95, c[1]], 0.6, 0.06); }
      // raised red wooden deck in front with a rail
      { const P0 = R.at(-1.0, 0.2), P1 = R.at(L + 1.0, 6.0); const uu = [P0[0], P1[0]].sort((x, y) => x - y), vv = [P0[1], P1[1]].sort((x, y) => x - y); const g = K.gMin(uu[0], vv[0], uu[1], vv[1], 4);
        K.box(mat(deck), uu[0], g - 0.4, vv[0], uu[1], F - 0.05, vv[1]); api.walkables.push(K.walkPoly([[uu[0], vv[0]], [uu[1], vv[0]], [uu[1], vv[1]], [uu[0], vv[1]]], F - 0.05));
        railing(api, [R.at(-1.0, 6.0), R.at(1.5, 6.0)], F - 0.05, { h: 0.9, mat: deck, step: 0.2 }); railing(api, [R.at(5.6, 6.0), R.at(L + 1.0, 6.0)], F - 0.05, { h: 0.9, mat: deck, step: 0.2 }); }
      hedge(api, [[11.0, -6.6], [16.0, -6.6]], { h: 1.2, t: 0.9 });
    },
  });
  r.object3d.name = 'sigma-pi-2434-warring';
  return r;
}
