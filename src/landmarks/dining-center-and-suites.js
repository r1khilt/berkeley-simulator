// Clark Kerr Campus Dining Center & Suites: part of the former California School for the Deaf and Blind
// (1920s-30s Spanish Colonial Revival, UC Berkeley's Clark Kerr Campus since 1982). Smooth off-white stucco under
// low red barrel-tile hip roofs with exposed rafter tails; the dining commons is the tall single-storey hall in the
// middle of the long bar, with tall round-arched windows and a deep loggia of square piers and Tuscan columns on
// its patio side; two-storey suites wings with gable ends, big stucco chimney stacks, and a tiled arcade along the
// upper east block. Massing follows the 2021 LiDAR: west wing ridge ~12.3 m, bar ridges ~14.5 / 15.2 / 19.5 m,
// dining-room wing ~8 m.
import * as THREE from 'three';
import { Kit, tint, tintMul, rect, rectRuns, spanishWing, arcade } from './lib/b06a-kit.js';

export const info = {
  id: 'dining-center-and-suites',
  name: 'Clark Kerr Dining Center & Suites',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'The Clark Kerr Campus was built for the California School for the Deaf and Blind and became part of UC Berkeley in 1982; its dining commons occupies a historic 1930s room with outdoor patios.',
  replaces: ['w/114851448'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-4.2);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const WALL = tintMul(M, 'stuccoWhite', 1.1, 1.02, 0.86), FRAME = tint(M, 'blackPaint', '#2b2e2c'), PLINTH = tint(M, 'concrete', '#9a958c');
  const TILE = tintMul(M, 'redTile', 0.86, 0.76, 0.72), TILE2 = tintMul(M, 'redTile', 0.8, 0.7, 0.66), LOUVRE = tint(M, 'whitePaint', '#bdbdb5', { metalness: 0.4, roughness: 0.5 });
  const colliders = [], walkables = [];
  const W = (sp) => { const r = spanishWing(K, { wall: WALL, frame: FRAME, tile: TILE, ov: 0.7, depth: 0.5, ...sp }); colliders.push(K.colPoly(rect(sp.u0, sp.v0, sp.u1, sp.v1), r.yB, sp.eave + 3));
    return r; };
  const up = (y0, y1) => ({ y0, y1, w: 1.0, h: 1.4, sill: 1.0, muntins: 2, mull: 1 });
  const chimney = (u, v, y0, y1) => { K.box(WALL, u - 0.75, y0, v - 0.6, u + 0.75, y1, v + 0.6); K.box(LOUVRE, u - 0.8, y1, v - 0.65, u + 0.8, y1 + 0.55, v + 0.65); for (let k = 0; k < 3; k++) K.box(WALL, u - 0.82, y1 + 0.06 + k * 0.17, v - 0.67, u + 0.82, y1 + 0.1 + k * 0.17, v + 0.67, { detail: true }); K.box(M.iron, u - 0.95, y1 + 0.55, v - 0.8, u + 0.95, y1 + 0.68, v + 0.8); };
  // west suites wing: two storeys, ridge north-south, gable end with vent grille facing the south lawn
  W({ u0: -62.1, v0: -10.8, u1: -49.5, v1: 37.2, eave: 9.2, axis: 'v', rise: 3.1, faces: 'NSW', storeys: [up(0.9, 4.7), up(4.7, 9.0)], pitch: 4.4 });
  { const R = K.run([-62.1, 37.2], [-49.5, 37.2]); K.rbox(R, FRAME, R.L / 2 - 0.35, 10.0, 0.01, R.L / 2 + 0.35, 10.7, 0.06); for (let k = 0; k < 4; k++) K.rbox(R, LOUVRE, R.L / 2 - 0.3, 10.08 + k * 0.16, 0.06, R.L / 2 + 0.3, 10.12 + k * 0.16, 0.1, { detail: true });
    arcade(K, R, 1.0, R.L - 1.0, K.g(-55, 38) + 0.1, K.g(-55, 38) + 3.2, { depth: 2.4, pitch: 2.6, col: WALL, tile: TILE, square: true, r: 0.17 }); }
  // dining room: lower wing with tall round-arched windows facing east
  W({ u0: -49.5, v0: 4.2, u1: -42.8, v1: 37.2, eave: 6.5, roof: 'hip', slope: 0.38, faces: 'ES', storeys: [{ y0: 1.0, y1: 6.4, w: 1.6, h: 3.7, sill: 0.8, arch: true, muntins: 4 }], pitch: 3.6 });
  W({ u0: -42.8, v0: 12.2, u1: -36.3, v1: 28.2, eave: 6.3, roof: 'hip', slope: 0.38, faces: 'NSE', storeys: [{ y0: 1.0, y1: 6.2, w: 1.5, h: 3.5, sill: 0.8, arch: true, muntins: 4 }], pitch: 3.4 });
  // long bar, west section: two storeys of suites, low hip roof
  W({ u0: -49.5, v0: -15.0, u1: 17.4, v1: 4.2, eave: 10.0, axis: 'u', rise: 4.6, faces: 'NSE', storeys: [up(2.5, 6.1), up(6.1, 9.8)], pitch: 3.3 });
  // dining commons: tall single storey with round-arched windows, low hip roof, deep loggia on the patio (south) side
  W({ u0: 17.4, v0: -14.8, u1: 55.5, v1: -0.6, eave: 12.0, roof: 'hip', slope: 0.52, faces: 'NES', storeys: [{ y0: 7.7, y1: 11.8, w: 1.8, h: 2.5, sill: 0.35, muntins: 3, mull: 2 }], pitch: 3.5, tile: TILE2, frame: tint(M, 'blackPaint', '#2b2f2c') });
  { const R = K.run([17.4, -0.6], [55.5, -0.6]); const g = K.gMin(17.4, -0.6, 55.5, 2.6, 6);
    K.prism(M.paving, rect(17.4, -0.6, 55.5, 2.8), g - 0.6, g + 0.45); walkables.push(K.walkPoly(rect(17.4, -0.6, 55.5, 2.8), g + 0.45));
    arcade(K, R, 0.4, R.L - 0.4, g + 0.45, g + 3.75, { depth: 2.9, pitch: 3.5, col: tint(M, 'stuccoWhite', '#f2eee6'), tile: TILE2, ceiling: tint(M, 'woodDark', '#5a4030'), pierEvery: 4, pw: 1.2, r: 0.175 });
    { const cg = new THREE.CylinderGeometry(0.15, 0.175, 3.0, 14); cg.translate(R.L - 0.4, g + 0.45 + 1.5 + 0.2, 2.7); K.addRun(R, tint(M, 'stuccoWhite', '#f1eee6'), cg); K.rbox(R, WALL, R.L - 0.65, g + 0.45, 2.45, R.L - 0.15, g + 0.65, 2.95); K.rbox(R, WALL, R.L - 0.66, g + 3.35, 2.44, R.L - 0.14, g + 3.55, 2.96); }
    K.prism(tint(M, 'concrete', '#c9bba8'), rect(17.4, 2.8, 55.5, 11.0), g - 0.6, g + 0.43); walkables.push(K.walkPoly(rect(17.4, 2.8, 55.5, 11.0), g + 0.43));
    for (let k = 0; k < 3; k++) { const ring = new THREE.RingGeometry(5 + k * 3.5, 5.4 + k * 3.5, 40, 1, Math.PI * 1.05, Math.PI * 0.9); ring.rotateX(-Math.PI / 2); ring.translate(36.5, g + 0.44, 0.0); K.add(tint(M, 'brick', '#b86a56'), ring, { detail: true }); }
    for (const pu of [22.0, 51.0]) { K.box(tint(M, 'concrete', '#d6cfc3'), pu - 2.0, g + 0.43, 6.0, pu + 2.0, g + 0.9, 9.0); K.box(M.turf, pu - 1.8, g + 0.9, 6.2, pu + 1.8, g + 0.92, 8.8); }
    walkables.push(K.stairs(M.concrete, 30.0, 2.8, 42.0, 3.9, g, g + 0.45, '-v', 3)); }
  // upper east suites block (two storeys) with a tiled arcade along its north side
  W({ u0: 55.5, v0: -10.6, u1: 95.7, v1: 1.9, eave: 16.5, axis: 'u', rise: 3.4, ov: 0.3, faces: 'NSEW', storeys: [up(8.3, 12.3), up(12.3, 16.3)], pitch: 2.6 });
  for (const [a, b] of [[[55.5, 1.9], [55.5, -10.6]], [[95.7, -10.6], [95.7, 1.9]]]) { const R = K.run(a, b); K.rbox(R, FRAME, R.L / 2 - 0.3, 17.6, 0.0, R.L / 2 + 0.3, 18.0, 0.05); for (let k = 0; k < 3; k++) K.rbox(R, LOUVRE, R.L / 2 - 0.26, 17.64 + k * 0.12, 0.05, R.L / 2 + 0.26, 17.67 + k * 0.12, 0.08, { detail: true }); }
  { const R = K.run([95.7, -10.6], [55.5, -10.6]); const g = K.gMin(55.5, -14.8, 95.7, -10.6, 6);
    arcade(K, R, 0.4, R.L - 0.4, g + 0.05, g + 3.4, { depth: 4.0, pitch: 3.3, col: WALL, tile: TILE, ceiling: tint(M, 'woodDark', '#6b543f'), square: true, r: 0.2 });
    K.prism(M.paving, rect(55.5, -14.8, 95.7, -10.6), g - 0.6, g + 0.05); walkables.push(K.walkPoly(rect(55.5, -14.8, 95.7, -10.6), g + 0.05)); }
  // big stucco chimney / vent stacks with louvred caps
  chimney(-20.0, -5.4, 11.0, 16.8); chimney(28.0, -7.7, 12.0, 17.6);
  const object3d = K.finish(); object3d.name = 'dining-center-and-suites';
  return { object3d, colliders, walkables };
}
