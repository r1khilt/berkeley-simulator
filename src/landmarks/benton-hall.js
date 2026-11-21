// Benton Hall — Pacific School of Religion residence on the seminary's quad on Holy Hill (Le Conte Avenue / Arch Street),
// now renovated as shared student suites. Modelled in the quad's
// Collegiate Gothic idiom (no photo of this building was available): rough-faced warm sandstone, flat roofs behind coped
// parapets, stone-mullioned windows with drip moulds and pointed-arch doorways, on an L-shaped plan stepping down the
// hillside. Massing from the 2021 LiDAR (roofs ≈13–14 m above the low west side).
import * as THREE from 'three';
import { Kit, pal, house } from './lib/b08a-kit.js';

export const info = {
  id: 'benton-hall',
  name: 'Benton Hall',
  subtitle: 'Pacific School of Religion',
  blurb: 'Student residence of the Pacific School of Religion on Holy Hill, north of the UC Berkeley campus.',
  replaces: ['w/190391825'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-3.8)); const M = ctx.M; const P = pal(ctx);
  const ST = P.sandstone; const LIM = M.granite;
  const colliders = []; const fo = { bay: 3.3, ww: 1.7, wh: 1.7, mull: 2, tran: 0.7 };
  const common = { mat: ST, frame: P.frameDark, sillMat: LIM, lintel: LIM, depth: 0.38, plinth: { h: 1.0, mat: M.graniteDark, out: 0.06 }, roof: { type: 'flat', parapet: { h: 0.9, mat: ST, t: 0.35, coping: LIM, cOut: 0.08 } } };
  const A = house(K, { u0: -8.95, u1: 3.4, v0: -17.15, v1: 11.3, g0: 0.6, y0: -1.5, eave: 13.4, storeys: 4, doorArch: 'gothic', ...common, faces: { N: { ...fo, doors: [1] }, S: false, W: { ...fo, doors: [4] }, E: { ...fo, skip: [] } } });
  const B = house(K, { u0: 3.4, u1: 16.5, v0: 3.6, v1: 11.3, g0: 0.6, y0: -1.5, eave: 14.0, storeys: 4, ...common, faces: { W: false, N: fo, S: fo, E: { ...fo, doors: [1] } } });
  const C = house(K, { u0: -9.75, u1: 6.6, v0: 11.3, v1: 14.3, g0: 0.6, y0: -1.5, eave: 12.0, storeys: 4, ...common, faces: { N: false, S: { ...fo, doors: [2] }, W: { nb: 1, ww: 1.2, wh: 1.3 }, E: { nb: 1, ww: 1.2, wh: 1.3 } } });
  const D = house(K, { u0: -3.56, u1: 2.33, v0: -19.28, v1: -17.15, g0: 0.6, y0: -1.5, eave: 13.0, storeys: 4, ...common, faces: { S: false, N: { nb: 1, ww: 1.0, wh: 2.6, mull: 0, sill: 0.3 }, E: [], W: [] } });
  for (const R of Object.values(A.runs)) K.rbox(R, LIM, -0.05, A.floors[1] - 0.18, 0, R.L + 0.05, A.floors[1], 0.1);   // stone string course
  // crenellated parapets (merlons) and corner buttresses — Collegiate Gothic flat-roof idiom
  for (const [u0, u1, v0, v1, top] of [[-8.95, 3.4, -17.15, 11.3, 13.4], [3.4, 16.5, 3.6, 11.3, 14.0], [-9.75, 6.6, 11.3, 14.3, 12.0], [-3.56, 2.33, -19.28, -17.15, 13.0]]) {
    const y = top + 0.9 + 0.08;
    for (const [a, b] of [[[u0, v1], [u1, v1]], [[u1, v1], [u1, v0]], [[u1, v0], [u0, v0]], [[u0, v0], [u0, v1]]]) {
      const R = K.run(a, b); const n = Math.max(1, Math.floor(R.L / 1.6));
      for (let k = 0; k < n; k++) { const sc = (k + 0.5) * R.L / n; K.rbox(R, ST, sc - 0.42, y, -0.33, sc + 0.42, y + 0.5, 0.02); K.rbox(R, LIM, sc - 0.47, y + 0.5, -0.38, sc + 0.47, y + 0.58, 0.07); }
    }
    for (const [cu, cv, su, sv] of [[u0, v0, -1, -1], [u1, v0, 1, -1], [u1, v1, 1, 1], [u0, v1, -1, 1]]) {
      K.box(ST, Math.min(cu, cu + su * 0.55), -1.0, Math.min(cv, cv + sv * 0.55), Math.max(cu, cu + su * 0.55), top - 1.2, Math.max(cv, cv + sv * 0.55));
      K.box(LIM, Math.min(cu, cu + su * 0.6), top - 1.2, Math.min(cv, cv + sv * 0.6), Math.max(cu, cu + su * 0.6), top - 1.0, Math.max(cv, cv + sv * 0.6));
    }
  }
  colliders.push(K.colPoly([[-8.95, -17.15], [3.4, -17.15], [3.4, 3.6], [16.5, 3.6], [16.5, 11.3], [6.6, 11.3], [6.6, 14.3], [-9.75, 14.3], [-9.75, 11.3], [-8.95, 11.3]], -2, 15));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
