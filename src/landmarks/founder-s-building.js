// Founders Building (1993) — a small single-storey pavilion beside the Tang Center (University Health Services) on
// Bancroft Way. Warm buff stucco walls on a concrete base, a low hipped roof with a central skylight lantern, square
// punched windows and a single entrance under a canopy on the west side. Massing from the 2021 LiDAR (eaves ≈3.4 m,
// lantern ≈6 m).
import * as THREE from 'three';
import { Kit, pal, house, roof } from './lib/b08a-kit.js';

export const info = {
  id: 'founder-s-building',
  name: "Founders Building",
  subtitle: 'Tang Center · 1993',
  blurb: 'A small single-storey building completed in 1993 beside the Tang Center, home of University Health Services.',
  replaces: ['w/109192949'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.7)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stucco.clone(); ST.color = new THREE.Color(0xfff2e0);
  const RF = P.roofMetal; const colliders = [];
  const g0 = Math.max(K.g(-5.6, 0), K.g(0, 0)) + 0.1;
  const H = house(K, { u0: -5.05, u1: 5.05, v0: -5.4, v1: 5.4, g0, y0: -2, eave: 3.4, storeys: 1, mat: ST, frame: P.frameBronze, sillMat: P.concreteBuff, depth: 0.3,
    faces: { W: (R) => [{ s0: R.L / 2 - 0.9, s1: R.L / 2 + 0.9, y0: g0, y1: g0 + 2.4, kind: 'door', doorTop: g0 + 2.1, sill: false, door: M.glass }, { s0: 1.0, s1: 2.4, y0: g0 + 0.9, y1: g0 + 2.4, mull: 1 }, { s0: R.L - 2.4, s1: R.L - 1.0, y0: g0 + 0.9, y1: g0 + 2.4, mull: 1 }],
      E: { nb: 3, ww: 1.2, wh: 1.4, mull: 1 }, N: { nb: 3, ww: 1.2, wh: 1.4, mull: 1 }, S: { nb: 3, ww: 1.2, wh: 1.4, mull: 1 } },
    plinth: { h: g0 + 0.45, mat: P.concreteBuff, out: 0.05 }, roof: { type: 'hip', slope: 0.3, ov: 0.55, mat: RF, fascia: P.trimCream, soffit: P.trimCream } });
  // central skylight lantern
  K.box(P.trimCream, -1.3, 4.3, -1.3, 1.3, 4.5, 1.3);
  for (const [a, b] of [[[-1.2, 1.2], [1.2, 1.2]], [[1.2, 1.2], [1.2, -1.2]], [[1.2, -1.2], [-1.2, -1.2]], [[-1.2, -1.2], [-1.2, 1.2]]]) { const R = K.run(a, b); K.rbox(R, M.glass, 0, 4.5, -0.05, R.L, 5.5, 0.0, { uvMode: 'keep' }); }
  roof(K, { type: 'hip', u0: -1.2, u1: 1.2, v0: -1.2, v1: 1.2, y: 5.5, slope: 0.5, ov: 0.25, mat: RF, fascia: P.trimCream });
  // entrance canopy on the west side
  { const R = H.runs.W; K.rbox(R, P.trimCream, R.L / 2 - 1.6, g0 + 2.6, 0, R.L / 2 + 1.6, g0 + 2.8, 1.6); for (const sx of [-1, 1]) K.rbox(R, P.frameBronze, R.L / 2 + sx * 1.45 - 0.06, g0, 1.42, R.L / 2 + sx * 1.45 + 0.06, g0 + 2.6, 1.54); }
  colliders.push(K.colPoly([[-5.05, -5.4], [5.05, -5.4], [5.05, 5.4], [-5.05, 5.4]], -2, 6));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
