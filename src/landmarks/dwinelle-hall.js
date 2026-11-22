// Dwinelle Hall (Weihe, Frick & Kruse, 1952; named for John W. Dwinelle). The campus's famously confusing humanities
// building: cream stucco ranges of punched steel windows under red-tile hip roofs, wrapped around a courtyard, with a
// tall central wing (offices) and the long south range facing Dwinelle Plaza. Massing from LiDAR: ranges ~20-24 m,
// central wing east half ~24 m with a lower west half ~16 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { autoEntries, entry, baseShrubs, lampPost, rooftopUnit, downspout, bikeRack, shrubRow, mulchMat } from './lib/rc-finish.js';
import { lantern, bench, tubeRail, band, bandOnGround, creamWall, boardConcrete, brickBand, castIron } from './lib/r5-site.js'; // [r5-audit-central]
export const info = {
  id: 'dwinelle-hall', name: 'Dwinelle Hall', subtitle: '1952 · Humanities',
  blurb: 'Named for John W. Dwinelle, author of the 1868 act that created the University of California, this sprawling building of split levels and odd corridors is legendary for getting students lost.',
  replaces: ['r/18934', 'relation/18934'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.5)); const M = ctx.M;
  // refine-central: smooth off-white stucco (the textured cream stucco tinted again read as tan brick), muted tile, larger
  // multi-light steel sash, real entrances where the footpaths arrive, foundation planting, lamps and rooftop plant.
  const ST = tint(M.stuccoWhite, 0xf8ecd8) /* [r5-audit-central] warmer cream (photos #E6DFCB) */, BASE = tint(M.concrete, 0xd2c8b8), FR = solid(0xe4e1da, 0.5, 0.1), SOF = tint(M.woodDark, 0x9a8064);
  const TILE = tint(M.redTile, 0xfaece4);
  const win = { w: 1.6, h: 2.3, sill: 0.85, mull: 1, muntins: 3 };
  const lv = (top, h = 4.2) => { const a = [1.5]; while (a[a.length - 1] + h < top - 0.4) a.push(a[a.length - 1] + h); a.push(top - 0.3); return a; };
  const P = (poly, top, slope = 0.42, extra = {}) => ({ poly, levels: lv(top), top, roof: 'hip', eave: top + 0.1, slope: slope * 0.8, ov: 0.75, roofMat: TILE, ...extra });
  const allRuns = [];
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.5, bay: 3.4, win, cornice: { P: 0.32, H: 0.4 }, soffit: SOF, beltAt: [1.5], extra: (runs) => allRuns.push(...runs) };
  const colliders = genParts(K, [
    P(rect(-41.1, -61.0, 24.1, -47.6), 21.6, 0.45),
    P(rect(-41.0, -47.6, -27.8, -4.0), 21.6, 0.45),
    P(rect(2.8, -47.6, 16.7, -17.7), 19.8, 0.42),
    P(rect(-41.0, -17.7, 15.5, -4.5), 20.4, 0.42),
    P(rect(15.1, -21.9, 43.4, -2.2), 18.4, 0.36),
    P(rect(-15.6, -4.6, 7.0, 36.0), 14.6, 0.3),
    P(rect(7.0, -4.6, 20.6, 39.9), 22.4, 0.5),
    P([[-27.0, 38.8], [-28.9, 53.9], [37.6, 62.2], [39.2, 47.0], [19.0, 39.9]], 18.0, 0.36),
  ], D);
  // [r5-audit-central] The plaza entrance faces EAST, not south. Photos (Commons PD "Dwinelle hall uc berkeley", Flickr
  // panoramas) and the 2021 LiDAR put the three recessed glazed door bays and the continuous iron balcony on the east face
  // of the tall central wing (u = 20.6), up a two-tier stair from Dwinelle Plaza: a full-width lower flight (4 risers)
  // -> a 12 m landing at +0.65 -> an upper flight (5 risers) -> the door terrace at +1.40. Cream seat walls with timber
  // benches flank the landing, board-formed planters fill the corners, black lanterns stand at the stair heads and the
  // concrete is banded with brick. Before r5 the balcony entrance sat on the south (creek) range and the plaza ran flat
  // into a blank wall. The south range keeps an ordinary entrance where the creek path arrives.
  const R = K.run([-28.9, 53.9], [37.6, 62.2]);
  const walkables = [];
  const site = dwinellePlaza(K, ctx, { BASE, ST, colliders, walkables });
  walkables.push(...autoEntries(K, ctx, allRuns.filter((r) => !site.isEast(r)), { y0: 1.5, max: 4, w: 2.2, h: 2.4, surround: BASE, surroundW: 0.35 }));
  // foundation planting along the creek range, lamp posts and bike racks along its walk
  baseShrubs(K, R, 2, R.L - 2, { skip: [[R.L * 0.5 - 4, R.L * 0.5 + 4]], d: 1.0 });
  for (const t of [0.12, 0.35, 0.65, 0.88]) { const [u, v] = R.at(R.L * t, 6.5); lampPost(K, u, v); }
  { const [u, v] = R.at(R.L * 0.28, 4.2); bikeRack(K, u, v, Math.atan2(R.t[1], R.t[0]), 6); }
  // downspouts at the plaza-range corners
  for (const t of [0.6, R.L - 0.6]) downspout(K, R, t, 17.6);
  const object3d = K.finish(); object3d.name = 'dwinelle-hall';
  return { object3d, colliders, walkables };
}

// [r5-audit-central] Dwinelle Plaza front: terrace, two-tier stair, doors under the balcony, seat walls, planters, lamps.
// Building frame of this module (rotation -16.5 deg). Levels from the LiDAR profile across the stair (rel. plaza 7.9):
// door terrace +1.40 (u 22.9-25), upper flight u 25-27, landing +0.70..+0.60 (u 27-39), lower flight u 39-41, plaza.
function dwinellePlaza(K, ctx, { BASE, ST, colliders, walkables }) {
  const M = K.M;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const plaza = med([42, 44, 46].flatMap((u) => [10, 14, 18, 22, 26].map((v) => K.g(u, v))));
  const uF = 20.6, uT = 25.2, uU = 27.2, uL = 39.2, uB = 41.0; // wall face, terrace edge, upper-flight foot, landing edge, lower-flight foot
  const vT0 = 8, vT1 = 29, vU0 = 9, vU1 = 28, vL0 = 5, vL1 = 31, vB0 = 7, vB1 = 29; // terrace, upper flight, landing, lower flight spans
  const yT = plaza + 1.4, yL = plaza + 0.65;
  const yDeep = Math.min(K.gMin(uF, vL0 - 7, uB + 1, vL1 + 9, 10), plaza) - 0.8;
  const PAVE = tint(M.paving, 0xe2d9c8), STEP = tint(M.concrete, 0xdcd5c8), WALL = creamWall(M), BOARD = boardConcrete(M), BR = brickBand(M);
  // door terrace + landing (solid down to below the terrain: the DTM dips up to 3 m under the real terrace)
  K.box(STEP, uF - 0.3, yDeep, vT0, uT, yT, vT1); K.box(PAVE, uF - 0.3, yT, vT0, uT, yT + 0.02, vT1);
  walkables.push(K.walkPoly([[uF, vT0], [uT, vT0], [uT, vT1], [uF, vT1]], yT + 0.02));
  K.box(STEP, uU, yDeep, vL0, uL, yL, vL1); K.box(PAVE, uU, yL, vL0, uL, yL + 0.02, vL1);
  walkables.push(K.walkPoly([[uU, vL0], [uL, vL0], [uL, vL1], [uU, vL1]], yL + 0.02));
  // flights (steps rise toward the building: '-u')
  walkables.push(K.stairs(STEP, uT, vU0, uU, vU1, yL, yT, '-u', 5, { foot: yL - yDeep }));
  walkables.push(K.stairs(STEP, uL, vB0, uB, vB1, plaza - 0.05, yL, '-u', 4, { foot: plaza - yDeep }));
  // the landing slab between the upper flight and the terrace cheeks, plus cheek blocks either side of the upper flight
  for (const [v0, v1] of [[vT0, vU0], [vU1, vT1]]) { K.box(WALL, uT, yDeep, v0, uU, yT + 0.45, v1); colliders.push(K.colPoly([[uT, v0], [uU, v0], [uU, v1], [uT, v1]], yDeep, yT + 0.45)); }
  // landing ends beside the narrower lower flight
  for (const [v0, v1] of [[vL0, vB0], [vB1, vL1]]) K.box(STEP, uL, yDeep, v0, uB, yL, v1);
  walkables.push(K.walkPoly([[uL, vL0], [uB, vL0], [uB, vB0], [uL, vB0]], yL), K.walkPoly([[uL, vB1], [uB, vB1], [uB, vL1], [uL, vL1]], yL));
  // cream seat walls along both sides of the landing (0.45 m above the landing, ~1.1 m on the plaza side), benches outside
  for (const v of [vL0, vL1]) {
    const v0 = v === vL0 ? v - 0.4 : v, v1 = v0 + 0.4;
    K.box(WALL, uU, yDeep, v0, uB, yL + 0.45, v1); K.box(BASE, uU - 0.05, yL + 0.45, v0 - 0.05, uB + 0.05, yL + 0.52, v1 + 0.05);
    colliders.push(K.colPoly([[uU, v0], [uB, v0], [uB, v1], [uU, v1]], yDeep, yL + 0.52));
    const out = v === vL0 ? v0 - 0.45 : v1 + 0.45;
    for (const u of [30.2, 35.6]) bench(K, u, K.g(u, out), out, { len: 3.2, rot: 0, back: false });
  }
  // board-formed planters filling the corners against the wall (shrubs + mulch at +0.85, walls to +1.0)
  for (const [v0, v1] of [[-2.2, vL0 - 0.4], [vL1 + 0.4, 40.6]]) {
    K.box(BOARD, uF - 0.3, yDeep, v0, uU, plaza + 1.0, v1); K.box(mulchMat(), uF, plaza + 1.0, v0 + 0.3, uU - 0.3, plaza + 1.01, v1 - 0.3);
    colliders.push(K.colPoly([[uF, v0], [uU, v0], [uU, v1], [uF, v1]], yDeep, plaza + 1.0));
    shrubRow(K, uF + 0.9, v0 + 0.9, uU - 0.9, v1 - 0.9, plaza + 1.0, { size: 0.7, h: 1.1 });
  }
  // brick bands: on the landing (axis + diagonals toward the stair) and radiating across the plaza in front
  const vc = (vB0 + vB1) / 2;
  for (const dv of [-13, -6.5, 0, 6.5, 13]) bandOnGround(K, BR, [uB + 0.3, vc + dv * 0.35], [uB + 17, vc + dv], 0.24);
  bandOnGround(K, BR, [uB + 6, vB0 - 3], [uB + 6, vB1 + 3], 0.24);
  // black lanterns at the heads of both flights; steel tube handrails splitting the upper flight
  for (const v of [vU0 - 0.75, vU1 + 0.75]) lantern(K, uU - 0.9, yT + 0.45, v, { h: 3.9 });
  for (const v of [vB0 - 0.9, vB1 + 0.9]) lantern(K, uB - 0.8, yL, v, { h: 4.3 });
  for (const v of [vU0 + (vU1 - vU0) / 3, vU0 + 2 * (vU1 - vU0) / 3]) tubeRail(K, [uT - 0.3, v], yT, [uU + 0.35, v], yL);
  // three recessed door bays + plaques on the east face, continuous iron balcony over them at the next floor
  const E = K.run([uF, 39.9], [uF, -4.6]); const sOf = (v) => 39.9 - v;
  for (const dv of [-4.8, 0, 4.8]) entry(K, E, sOf(vc + dv), yT + 0.02, { w: 2.5, h: 2.75, transom: 0.85, rec: 0.42, surround: BASE, surroundW: 0.45, steps: false, lamps: false, glass: M.windowNight, signText: dv === 0 ? 'DWINELLE HALL' : null, signOpts: { bg: '#e9e1d2', fg: '#4a4036', h: 0.36 } });
  const b0 = sOf(38.4), b1 = sOf(-0.6), yB = yT + 4.75; // the railing runs nearly the whole plaza front
  K.rbox(E, BASE, b0, yB - 0.22, 0, b1, yB, 0.95);
  for (const yy of [yB + 1.0, yB + 0.08]) K.rbox(E, castIron(), b0, yy, 0.86, b1, yy + 0.05, 0.91, { detail: true });
  for (let s = b0; s <= b1 + 1e-3; s += 0.13) K.rbox(E, castIron(), s, yB, 0.875, s + 0.022, yB + 1.0, 0.895, { detail: true });
  for (let s = b0 + 1.2; s < b1 - 0.6; s += 2.4) K.rbox(E, castIron(), s, yB - 0.62, 0.1, s + 0.06, yB - 0.22, 0.75, { detail: true }); // brackets
  const isEast = (r) => Math.abs(r.n[0] - 1) < 0.05 && Math.abs(r.a[0] - uF) < 0.6;
  return { isEast, plaza, yT, yL };
}
