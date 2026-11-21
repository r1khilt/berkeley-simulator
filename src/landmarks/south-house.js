// South House, 2601 Parker Street — part of the Berkeley Student Cooperative's Hillegass-Parker House.
// A two-storey brown-shingle house with an attic under a long composition-shingle gable, white-trimmed double-hung
// windows, a front porch facing Hillegass Avenue and a lower rear wing at the east end.
// Massing from the 2021 LiDAR (eaves ≈7–8 m, ridge ≈10.8 m; rear wing ≈7.5 m).
import * as THREE from 'three';
import { Kit, pal, house, roof, porch, chimney, woodShingle } from './lib/b08a-kit.js';

export const info = {
  id: 'south-house',
  name: 'South House',
  subtitle: 'Hillegass-Parker House · Berkeley Student Cooperative',
  blurb: 'South House on Parker Street is part of Hillegass-Parker House, a Berkeley Student Cooperative house.',
  replaces: ['w/185773040'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.4)); const M = ctx.M; const P = pal(ctx);
  const SH = woodShingle(0x86624a), TR = P.trimWhite, RF = P.roofComp; const colliders = [];
  const g0 = Math.max(K.g(-10.6, 0), K.g(-10.6, 3)) + 0.8;
  const H = house(K, { u0: -10.06, u1: 7.8, v0: -4.94, v1: 5.36, g0, y0: -2, eave: g0 + 5.9, storeys: 2, mat: SH, frame: TR, sillMat: TR, trim: TR, trimW: 0.09,
    faces: { W: { nb: 2, doors: [0], ww: 0.95, wh: 1.55, tran: 0.55 }, N: { nb: 6, ww: 0.85, wh: 1.5, tran: 0.55 }, S: { nb: 6, ww: 0.85, wh: 1.5, tran: 0.55, doors: [4] }, E: { nb: 2, ww: 0.85, wh: 1.4, up: [0, 1] } },
    plinth: { h: g0, mat: P.concreteBuff, out: 0.04 },
    roof: { type: 'gable', axis: 'u', rise: 3.9, ov: 0.55, rake: 0.45, mat: RF, fascia: TR, soffit: TR } });
  // attic window in the west gable
  { const R = H.runs.W; K.box(SH, -10.06, g0 + 5.9, -1.8, -9.86, g0 + 8.2, 2.2); K.fill(K.run([-10.07, 1.2], [-10.07, -0.8]), { s0: 0.3, s1: 1.7, y0: g0 + 6.6, y1: g0 + 7.8 }, { rev: -0.02, frame: TR, mull: 1, tran: [] }); }
  // rear (east) wing, lower, hipped
  house(K, { u0: 7.8, u1: 11.31, v0: -4.94, v1: 1.27, g0, y0: -2, eave: g0 + 5.3, storeys: 2, mat: SH, frame: TR, sillMat: TR, trim: TR, core: true,
    faces: { W: false, N: { nb: 1, ww: 0.85, wh: 1.4 }, E: { nb: 2, ww: 0.85, wh: 1.4 }, S: { nb: 1, doors: [0] } }, plinth: { h: g0, mat: P.concreteBuff, out: 0.04 },
    roof: { type: 'hip', slope: 0.45, ov: 0.45, mat: RF, fascia: TR, soffit: TR } });
  // front porch on the Hillegass side
  { const R = H.runs.W; const s = R.L - 2.6; const g = K.g(-11.5, 2.5);
    porch(K, R, { s, w: 3.4, d: 2.0, y0: g0, y1: g0 + 2.6, postMat: TR, roofMat: RF, beamMat: TR, gable: true, rise: 0.8, post: 0.2, floor: P.woodStain });
    const n = Math.max(1, Math.round((g0 - g) / 0.17)); for (let k = 0; k < n; k++) K.rbox(R, P.concreteBuff, s - 0.8, g - 0.5, 2.0 + (n - k - 1) * 0.3, s + 0.8, g + (g0 - g) * (k + 1) / n, 2.0 + (n - k) * 0.3); }
  chimney(K, M.brick, 2.0, 5.36 - 0.35, 0.8, 0.6, g0 + 3, g0 + 10.6, P.concreteBuff);
  colliders.push(K.colPoly([[-10.06, -4.94], [11.31, -4.94], [11.31, 1.27], [7.8, 1.27], [7.8, 5.36], [-10.06, 5.36]], -2, 12));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
