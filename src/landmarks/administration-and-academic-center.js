// Clark Kerr Campus Administration & Academic Center: single-storey Spanish Colonial Revival wings of the former
// California School for the Deaf and Blind, white stucco under red barrel-tile roofs, with a Tuscan-column arcade
// along the lawn, a small cloister court at the north end and the campus clock tower with its open belfry and
// pyramidal tile roof. Massing follows the 2021 LiDAR: main wing eaves ~5.5 m and ridge ~8.5 m, a raised
// two-storey block (~14 m) and the tower (~19 m).
import * as THREE from 'three';
import { Kit, tint, tintMul, rect, rectRuns, spanishWing, arcade, clockTower } from './lib/b06a-kit.js';

export const info = {
  id: 'administration-and-academic-center',
  name: 'Clark Kerr Administration & Academic Center',
  subtitle: 'Clark Kerr Campus · Spanish Colonial Revival',
  blurb: 'Built for the California School for the Deaf and Blind, these stucco and red-tile buildings now hold the Clark Kerr Campus offices and an academic center with study space for residents.',
  replaces: ['r/1735008'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-4.2);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const WALL = tintMul(M, 'stuccoWhite', 1.12, 1.02, 0.82), FRAME = tint(M, 'blackPaint', '#2a3533'), TILE = tintMul(M, 'redTile', 0.88, 0.8, 0.76), TILE2 = tintMul(M, 'redTile', 0.8, 0.7, 0.66);
  const LOUVRE = tint(M, 'whitePaint', '#bdbdb5', { metalness: 0.4, roughness: 0.5 });
  const colliders = [], walkables = [];
  const GRIME = tint(M, 'stuccoWhite', '#cfc6b3');
  const W = (sp) => { const r = spanishWing(K, { wall: WALL, frame: FRAME, tile: TILE, ov: 0.8, ...sp }); colliders.push(K.colPoly(rect(sp.u0, sp.v0, sp.u1, sp.v1), r.yB, sp.eave + 3));
    for (const f of (sp.faces ?? 'NSEW')) { const Rk = r.R[f]; K.rbox(Rk, GRIME, -0.02, r.yB, -0.05, Rk.L + 0.02, K.gMax(sp.u0, sp.v0, sp.u1, sp.v1, 3) + 0.4, 0.03); } return r; };
  const one = [{ y0: 2.0, y1: 5.4, w: 1.5, h: 2.3, sill: 0.55, muntins: 3 }];
  // main north-south wing (ridge ~8.5 m)
  W({ u0: -6.1, v0: -20.0, u1: 10.4, v1: 36.6, eave: 5.6, roof: 'hip', slope: 0.36, faces: 'EW', storeys: one, pitch: 3.0 });
  // south legs of the U
  W({ u0: -9.2, v0: 31.6, u1: -4.6, v1: 42.6, eave: 5.3, axis: 'v', rise: 1.4, faces: 'SW', storeys: one, pitch: 3.0 });
  W({ u0: 5.3, v0: 36.6, u1: 10.0, v1: 42.6, eave: 5.3, axis: 'v', rise: 1.4, faces: 'SE', storeys: one, pitch: 3.0 });
  // west wing (single storey)
  W({ u0: -34.0, v0: -25.3, u1: -6.1, v1: -20.0, eave: 5.2, roof: 'hip', slope: 0.4, faces: 'NSW', storeys: one, pitch: 3.0 });
  // north cloister: four ranges around a small court with an arcade inside
  W({ u0: -8.2, v0: -39.0, u1: 10.5, v1: -34.5, eave: 6.0, axis: 'u', rise: 1.5, faces: 'NEW', storeys: one, pitch: 3.0 });
  W({ u0: -8.2, v0: -34.5, u1: -3.6, v1: -25.3, eave: 6.0, axis: 'v', rise: 1.5, faces: 'W', storeys: one, pitch: 3.0 });
  W({ u0: 6.1, v0: -34.5, u1: 10.5, v1: -25.3, eave: 6.0, axis: 'v', rise: 1.5, faces: 'E', storeys: one, pitch: 3.0 });
  W({ u0: -8.2, v0: -25.3, u1: 10.5, v1: -20.0, eave: 6.0, axis: 'u', rise: 1.6, faces: 'E', storeys: one, pitch: 3.0 });
  { const gC = K.gMin(-3.6, -34.5, 6.1, -25.3, 4); K.prism(M.paving, rect(-3.6, -34.5, 6.1, -25.3), gC - 0.5, gC + 0.05);
    const Rc = rectRuns(K, -3.6, -34.5, 6.1, -25.3); // inner court faces point INTO the court: use reversed runs
    for (const [a, b] of [[[-3.6, -34.5], [6.1, -34.5]], [[6.1, -25.3], [-3.6, -25.3]]]) { const R = K.run(a, b); arcade(K, R, 0.3, R.L - 0.3, gC + 0.05, gC + 3.3, { depth: 1.8, pitch: 2.4, col: WALL, tile: TILE, r: 0.18 }); }
    walkables.push(K.walkPoly(rect(-3.6, -34.5, 6.1, -25.3), gC + 0.05)); }
  // raised two-storey block (LiDAR ~12-14 m) at the middle of the main wing's west side
  W({ u0: -12.0, v0: -6.6, u1: -1.0, v1: 5.4, eave: 11.0, axis: 'u', rise: 3.2, tile: TILE2, faces: 'NSEW', storeys: [{ y0: 2.0, y1: 5.0, w: 1.2, h: 1.5, sill: 0.9, muntins: 2 }, { y0: 5.0, y1: 8.0, w: 1.2, h: 1.5, sill: 0.9, muntins: 2 }, { y0: 8.0, y1: 10.9, w: 1.2, h: 1.5, sill: 0.8, muntins: 2 }], pitch: 3.6 });
  { const R = K.run([-1.0, 5.4], [-1.0, -6.6]); K.rbox(R, FRAME, R.L / 2 - 0.3, 12.0, 0.0, R.L / 2 + 0.3, 12.6, 0.05); for (let k = 0; k < 3; k++) K.rbox(R, LOUVRE, R.L / 2 - 0.26, 12.07 + k * 0.17, 0.05, R.L / 2 + 0.26, 12.11 + k * 0.17, 0.09, { detail: true }); }
  // arcade along the plaza (east face of the main wing) for ~30 m from the tower: heavy square stucco piers at ~4 m,
  // a round Tuscan column at the open end, 3 m deep porch in shadow
  { const R = K.run([10.4, 16.0], [10.4, -14.4]); const g = K.gMin(10.4, -14.4, 13.4, 16.0, 6); const yb = Math.max(g, 1.9);
    arcade(K, R, 0.4, R.L - 0.4, yb, 5.1, { depth: 3.0, pitch: 3.7, col: WALL, tile: TILE, ceiling: tint(M, 'woodDark', '#5a5048'), r: 0.19, endPiers: 1.2 });
    { const g2 = new THREE.CylinderGeometry(0.15, 0.17, 5.1 - 0.35 - yb, 14); g2.translate(0.4, (yb + 5.1 - 0.35) / 2, 2.8); K.addRun(R, WALL, g2);
      K.rbox(R, WALL, 0.15, yb, 2.55, 0.65, yb + 0.2, 3.05); K.rbox(R, WALL, 0.12, 5.1 - 0.55, 2.52, 0.68, 5.1 - 0.35, 3.08); }
    K.prism(M.paving, rect(10.4, -14.4, 13.4, 16.0), g - 0.6, yb); walkables.push(K.walkPoly(rect(10.4, -14.4, 13.4, 16.0), yb));
    // paved plaza with curved brick bands east of the arcade
    K.prism(M.paving, rect(13.4, -14.4, 30.0, 16.0), g - 0.6, yb - 0.02); walkables.push(K.walkPoly(rect(13.4, -14.4, 30.0, 16.0), yb - 0.02));
    for (let k = 0; k < 4; k++) { const ring = new THREE.RingGeometry(6 + k * 4, 6.4 + k * 4, 40, 1, Math.PI * 0.55, Math.PI * 0.9); ring.rotateX(-Math.PI / 2); ring.translate(13.4, yb, 1.0); K.add(tint(M, 'brick', '#c07a62'), ring, { detail: true }); }
    for (const [pu, pv] of [[20, -9], [24, 6]]) { K.box(M.paving, pu - 2.5, yb, pv - 1.5, pu + 2.5, yb + 0.45, pv + 1.5); K.box(M.turf, pu - 2.3, yb + 0.45, pv - 1.3, pu + 2.3, yb + 0.47, pv + 1.3); } }
  { const R2 = K.run([-6.1, 4.6], [-6.1, 31.6]); const g = K.gMin(-9.5, 4.6, -6.1, 31.6, 6);
    arcade(K, R2, 0.4, R2.L - 0.4, Math.max(g, 1.9), 5.1, { depth: 2.8, pitch: 3.7, col: WALL, tile: TILE, r: 0.19, endPiers: 1.2 }); }
  // stucco chimney with a louvred cap near the south end of the main wing
  K.box(WALL, 1.0, 5.0, 26.0, 2.2, 10.6, 27.2); K.box(LOUVRE, 0.9, 10.6, 25.9, 2.3, 11.1, 27.3); K.box(TILE2, 0.8, 11.1, 25.8, 2.4, 11.25, 27.4);
  // the clock tower (open belfry, pyramidal tile roof)
  clockTower(K, 9.4, -16.9, 4.6, 1.0, 16.6, 24.2, { wall: tintMul(M, 'stuccoWhite', 1.16, 1.12, 1.0), tile: TILE, trim: tint(M, 'blackPaint', '#3e4f4c') });
  colliders.push(K.colPoly(rect(7.3, -19.2, 11.9, -14.6), 0, 22));
  const object3d = K.finish(); object3d.name = 'administration-and-academic-center';
  return { object3d, colliders, walkables };
}
