// Barbara and Gerson Bakar Faculty Building, the faculty wing of the Haas School of Business (Moore Ruble Yudell,
// 1995). Part of a hillside "village" of three buildings around a courtyard on Piedmont Avenue: Arts-and-Crafts
// massing in concrete, with a cast-stone base, taupe board-formed concrete middle storeys and a pale cream top
// storey, grey tile hipped roofs on deep bracketed eaves, green multi-pane windows grouped in dark surrounds,
// copper-brown downspouts. Massing follows the 2021 LiDAR: a north-south wing (ridge ~25.8 m) meeting an east-west
// wing (ridge ~25.5 m) with a raised lantern at the crossing, a lower three-storey south-west block, and two lower
// gabled wings stepping up the slope toward Piedmont Avenue.
import * as THREE from 'three';
import { Kit, tint, tintMul, rect, rectRuns, banded, brackets, sign, railing, panelMat, curtain } from './lib/b06a-kit.js';

export const info = {
  id: 'gerson-bakar-faculty-building',
  name: 'Gerson Bakar Faculty Building',
  subtitle: 'Haas School of Business · 1995',
  blurb: 'The faculty office wing of the Haas School of Business complex, designed by Moore Ruble Yudell with hipped roofs and bracketed eaves that echo Berkeley\u2019s Arts-and-Crafts hillside architecture.',
  replaces: ['w/32224854'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-4.8);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const STONE = panelMat('haas-cast6', { base: '#ada595', joint: '#938b7c', cols: 2, rows: 4, vary: 0.02, noise: 0.05, jw: 3, span: 2.4, roughness: 0.9 }), TAUPE = panelMat('haas-taupe4', { base: '#6f665b', joint: '#5f574d', cols: 1, rows: 8, vary: 0.02, noise: 0.03, jw: 2, span: 2.4, roughness: 0.85 }), CREAM = panelMat('haas-cast7', { base: '#b7af9f', joint: '#9d9585', cols: 2, rows: 4, vary: 0.02, noise: 0.05, jw: 3, span: 2.4, roughness: 0.9 });
  const ROOF = tint(M, 'shingle', '#c4c7c2'), GREEN = tint(M, 'whitePaint', '#4e7d76'), CHAR = tint(M, 'whitePaint', '#6f6e6a'), HGL = tint(M, 'glass', '#2f4a4a', { metalness: 0.4, roughness: 0.05 });
  const BRK = tint(M, 'woodDark', '#4a3f36'), TANTRIM = tint(M, 'whitePaint', '#a89880'), CAST = tintMul(M, 'stuccoWhite', 0.78, 0.74, 0.66), PIPE = tint(M, 'bronze', '#4f3e33');
  const colliders = [], walkables = [];
  const roofOv = 1.3;

  // wing = rectangle + storeys; façades drawn on the faces listed, walls from below grade to the eave
  function wing({ u0, v0, u1, v1, eave, slope, faces = 'NSEW', yTop, base = 4.3, top = 3.4, hipU = true, hipV = true, flat = false, axisRoof }) {
    const gmin = K.gMin(u0, v0, u1, v1, 6), gmax = K.gMax(u0, v0, u1, v1, 6);
    const R = rectRuns(K, u0, v0, u1, v1);
    const yB = gmin - 1.2;
    for (const f of faces) {
      const Rk = R[f]; const gl = Math.max(gmin, Math.min(...[0.15, 0.5, 0.85].map((t) => { const p = Rk.at(Rk.L * t, 0.5); return K.g(p[0], p[1]); })));
      const b1 = Math.min(eave - top - 0.5, gl + base);
      const bands = [{ y0: yB, y1: b1, mat: STONE }, { y0: b1, y1: eave - top, mat: CREAM }, { y0: eave - top, y1: eave, mat: TAUPE }];
      const st = []; let y = b1 - 3.6; while (y > gl - 0.2) y -= 3.6;
      // storeys: one in the base, as many 3.6 m storeys in the middle as fit, one in the top band
      const storeys = [{ y0: b1 - 4.2, y1: b1, h: 3.6, sill: 0.3, muntins: 4 }];
      for (let yy = b1; yy + 3.0 <= eave - top + 0.01; yy += Math.max(3.0, (eave - top - b1) / Math.max(1, Math.round((eave - top - b1) / 3.6)))) storeys.push({ y0: yy, y1: Math.min(eave - top, yy + 3.6), h: 1.9, sill: 0.8 });
      storeys.push({ y0: eave - top, y1: eave, h: 1.9, sill: 0.6, muntins: 1 });
      banded(K, Rk, 0, Rk.L, bands, storeys.filter((s) => s.y1 <= eave + 0.01 && s.y0 >= yB), { pitch: 4.5, group: 2, w: 1.15, h: 2.2, gap: 0.14, frame: GREEN, glass: HGL, belt: CAST, beltOut: 0.15, muntins: 3, mull: 1, margin: 0.9, depth: 0.75 });
      // full-height cast-stone piers between window bays
      { const n = Math.max(1, Math.round((Rk.L - 1.8) / 4.5)); const bw = (Rk.L - 1.8) / n; for (let i = 0; i <= n; i++) { const s = 0.9 + i * bw; K.rbox(Rk, STONE, s - 0.45, yB, 0, s + 0.45, eave - top, 0.6); K.rbox(Rk, CAST, s - 0.55, eave - top - 0.3, 0, s + 0.55, eave - top, 0.75); } }
      brackets(K, Rk, BRK, 0, Rk.L, eave, { ov: roofOv, pitch: 1.5 });
      // copper-brown downspouts near the ends
      for (const s of [0.6, Rk.L - 0.6]) K.rbox(Rk, PIPE, s - 0.07, gl, 0.08, s + 0.07, eave - 0.2, 0.22, { detail: true });
    }
    K.box(M.concreteDark, u0 + 0.6, yB, v0 + 0.6, u1 - 0.6, eave - 0.1, v1 - 0.6);
    if (flat) { K.box(TAUPE, u0 - 0.3, eave, v0 - 0.3, u1 + 0.3, eave + 0.35, v1 + 0.3); K.box(CAST, u0 - 0.4, eave + 0.35, v0 - 0.4, u1 + 0.4, eave + 0.5, v1 + 0.4); }
    else if (axisRoof) K.gable(ROOF, u0, v0, u1, v1, eave, axisRoof.rise, axisRoof.axis, { overhang: roofOv, wallMat: CREAM, thick: 0.25 });
    else { K.hip(ROOF, u0 - roofOv, v0 - roofOv, u1 + roofOv, v1 + roofOv, eave - 0.05, slope, { yTop: yTop ?? Infinity, hipU, hipV });
      K.prism(BRK, rect(u0 - roofOv, v0 - roofOv, u1 + roofOv, v1 + roofOv), eave - 0.5, eave - 0.05, {}, [rect(u0, v0, u1, v1)]); K.prism(TANTRIM, rect(u0 - 0.12, v0 - 0.12, u1 + 0.12, v1 + 0.12), eave - 0.85, eave - 0.6, {}, [rect(u0, v0, u1, v1)]); }
    colliders.push(K.colPoly(rect(u0, v0, u1, v1), yB, eave + 6));
    return R;
  }

  // north-south wing (five storeys on the downhill side; runs the full length of the west side)
  wing({ u0: -25.3, v0: -36.0, u1: -4.3, v1: 13.8, eave: 19.3, slope: 0.46, faces: 'NWES' });
  // east-west wing (ridge ~25.5)
  wing({ u0: -4.3, v0: -6.0, u1: 30.6, v1: 14.4, eave: 19.0, slope: 0.46, faces: 'NSE' });
  // lower three-storey strip along the south (flat roof with cast-stone coping, ~11.6 m)
  wing({ u0: -27.6, v0: 13.8, u1: -7.6, v1: 19.1, eave: 11.3, slope: 0.42, faces: 'SWE', top: 3.0, base: 4.6 });
  // gabled bar (ridge north-south) and east wing (ridge east-west) stepping up toward Piedmont Avenue
  wing({ u0: 12.6, v0: 14.4, u1: 24.0, v1: 29.8, eave: 19.4, slope: 0.46, faces: 'SW' });
  wing({ u0: 24.0, v0: 14.5, u1: 49.0, v1: 30.4, eave: 17.2, slope: 0.46, faces: 'NSE', hipU: true });
  // low annexes along the downhill west side: shed-roofed strip (~7.5 m, ~11.5 m to the south) and stepped terraces
  {
    const pieces = [[-30.6, -16.8, -25.3, 2.5, 7.6], [-30.6, 2.5, -25.3, 13.8, 11.4], [-36.0, -35.2, -31.0, -17.0, 4.4], [-31.0, -35.2, -25.3, -16.8, 7.6]];
    for (const [u0, v0, u1, v1, yT] of pieces) {
      const R = rectRuns(K, u0, v0, u1, v1); const yB = K.gMin(u0, v0, u1, v1, 4) - 1.0;
      for (const f of 'NSW') { const Rk = R[f]; if (Rk.L < 2) continue; const ops = []; for (let s = 1.0; s < Rk.L - 1.0; s += 3.2) ops.push({ s0: s, s1: s + 1.6, y0: Math.max(yB + 1.6, yT - 3.1), y1: yT - 0.9, muntins: 2, mull: 1 });
        const okOps = ops.filter((p) => { const q = Rk.at((p.s0 + p.s1) / 2, 0.5); return p.y0 > K.g(q[0], q[1]) + 0.3; });
        K.wall(Rk, yT > 9 ? TAUPE : STONE, 0, Rk.L, yB, yT, okOps, 0.35); for (const p of okOps) K.fill(Rk, { ...p, sill: false }, { rev: 0.25, frame: GREEN, mull: 1 }); }
      K.box(M.concreteDark, u0 + 0.5, yB, v0 + 0.5, u1 - 0.5, yT, v1 - 0.5);
      K.box(CAST, u0 - 0.15, yT, v0 - 0.1, u1, yT + 0.14, v1 + 0.1);
      K.box(M.paving, u0, yT + 0.14, v0, u1, yT + 0.16, v1);
      const Rt = K.run([u0, v0], [u0, v1]); railing(K, Rt, 0, Rt.L, yT + 0.14, { panel: null, post: M.iron, h: 1.0 });
      walkables.push(K.walkPoly(rect(u0, v0, u1, v1), yT + 0.16)); colliders.push(K.colPoly(rect(u0, v0, u1, v1), yB, yT + 1.1));
    }
  }
  // courtyard entrance (south face of the east-west wing): double-height glazed teal doors recessed 1.5 m, stone surround
  {
    const R = K.run([-4.3, 14.4], [30.6, 14.4]); const s0 = 8.5; const p = R.at(s0, 0.6); const gl = K.g(p[0], p[1]);
    K.rbox(R, CAST, s0 - 2.4, gl - 0.3, 0, s0 + 2.4, gl + 5.9, 0.4);
    K.rbox(R, M.concreteDark, s0 - 1.5, gl, -1.5, s0 + 1.5, gl + 5.0, 0.42);
    curtain(K, K.run(R.at(s0 - 1.5, -1.45), R.at(s0 + 1.5, -1.45)), 0, 3.0, gl, gl + 5.0, { pitch: 0.75, recess: 0.0, frame: GREEN, glass: HGL, trans: [gl + 2.4, gl + 3.4, gl + 4.2] });
    K.rbox(R, M.paving, s0 - 1.5, gl - 0.05, -1.5, s0 + 1.5, gl + 0.02, 0.4);
    sign(K, R, 'BARBARA AND GERSON BAKAR FACULTY BUILDING', s0, gl + 6.35, 0.3, { color: '#4a3b30', d: 0.04 });
    K.rbox(R, CAST, s0 - 0.35, gl + 6.7, 0, s0 + 0.35, gl + 7.8, 0.7);
  }

  const object3d = K.finish();
  object3d.name = 'gerson-bakar-faculty-building';
  return { object3d, colliders, walkables };
}
