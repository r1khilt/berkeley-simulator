// Earl F. Cheit Hall, part of the Haas School of Business complex (Moore Ruble Yudell, 1995), the "Bay Region collegiate"
// village around O'Donnell Courtyard. Big grey slate-look hipped roofs with deep bracketed eaves and louvred ventilation
// cupolas on the ridges, over a cast-stone base scored in ashlar courses with pilasters at every bay, a smooth stucco middle
// storey and a top storey of grey-brown horizontal board siding under a cream frieze; dark teal-green gridded windows.
// A canted, three-sided bay tower closes the north end. Massing follows the 2021 LiDAR (frame -4°): eaves ~14 m, ridge ~21.5 m.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, hipRoof, lamp, boardMat } from './lib/b05b-kit.js';

export const info = {
  id: 'earl-f-cheit-hall',
  name: 'Cheit Hall',
  subtitle: 'Haas School of Business · Moore Ruble Yudell, 1995',
  blurb: 'Named for former Haas dean Earl F. Cheit, the hall is one of the hipped-roof buildings of the Haas School of Business complex, grouped around O\'Donnell Courtyard on the hillside at Piedmont Avenue.',
  replaces: ['w/1371942534'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-4)); const M = ctx.M; const X = mats(M);
  const CS = new THREE.MeshStandardMaterial({ color: 0xd0c7b2, roughness: 0.85, map: M.ashlar.map, normalMap: M.ashlar.normalMap });
  const STU = new THREE.MeshStandardMaterial({ color: 0xd6ccb4, roughness: 0.92, map: M.stucco.map });
  const SID = boardMat(0xa29686);
  const CREAM = X.creamPaint;
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x9fa3a4, roughness: 0.8, map: M.concrete.map, normalMap: M.slate.normalMap });
  const TEAL = new THREE.MeshStandardMaterial({ color: 0x2e5a55, roughness: 0.55 });
  const colliders = [];
  const EAVE = 15.0, Y3 = 11.2, Y2 = 7.4;
  // one façade run: stone base with pilasters, stucco third floor, board-sided top floor, cream frieze with brackets
  function face(R, { bay = 3.6 } = {}) {
    const L = R.L; let gs = Infinity; for (let k = 0; k <= 6; k++) { const p = R.at(L * k / 6, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const nb = Math.max(1, Math.round(L / bay)); const bw = L / nb; const cs = Array.from({ length: nb }, (_, i) => bw * (i + 0.5));
    const win = (c, y0, h, w) => ({ s0: c - w / 2, s1: c + w / 2, y0, y1: y0 + h, mull: 1, muntins: 2, frame: TEAL, sillMat: CREAM });
    const sOps = [], tOps = [], bOps = [];
    for (const c of cs) {
      for (const d of [-0.66, 0.66]) tOps.push(win(c + d, Y3 + 0.7, 1.7, 1.05));
      for (const d of [-0.95, 0, 0.95]) sOps.push(win(c + d, Y2 + 0.6, 2.6, 0.82));
      for (let fy = Y2 - 3.5; fy > gs + 0.4; fy -= 3.5) for (const d of [-0.95, 0, 0.95]) bOps.push(win(c + d, Math.max(gs + 0.6, fy + 0.6), 2.1, 0.8));
    }
    openWall(K, R, CS, 0, L, gs - 1.2, Y2, bOps.filter((o) => o.y1 < Y2 - 0.3), { depth: 0.4, rev: 0.28, frame: TEAL, sillMat: CREAM });
    openWall(K, R, STU, 0, L, Y2, Y3, sOps, { depth: 0.4, rev: 0.28, frame: TEAL, sillMat: CREAM });
    openWall(K, R, SID, 0, L, Y3, EAVE - 1.0, tOps, { depth: 0.35, rev: 0.25, frame: TEAL, sillMat: CREAM });
    K.rbox(R, CREAM, -0.05, EAVE - 1.0, -0.35, L + 0.05, EAVE, 0.06);                       // frieze band
    K.rbox(R, CS, -0.05, Y2 - 0.3, 0, L + 0.05, Y2, 0.18);                                   // string course
    K.rbox(R, CS, -0.05, Y3 - 0.15, 0, L + 0.05, Y3 + 0.05, 0.12);
    for (let i = 0; i <= nb; i++) { const s = Math.min(L - 0.35, Math.max(0.35, bw * i)); K.rbox(R, CS, s - 0.35, gs - 1.2, 0, s + 0.35, Y2, 0.22); }
    const nbr = Math.round(L / 1.8); for (let i = 0; i <= nbr; i++) { const s = 0.3 + (L - 0.6) * i / nbr; K.rbox(R, CREAM, s - 0.09, EAVE - 0.9, 0.06, s + 0.09, EAVE - 0.1, 0.95); K.rbox(R, CREAM, s - 0.09, EAVE - 1.6, 0.0, s + 0.09, EAVE - 0.9, 0.3, { detail: true }); }
    return gs;
  }
  function block(u0, u1, v0, v1, eave, slope, faces = { S: 1, E: 1, N: 1, W: 1 }, cupolas = []) {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    for (const f of ['S', 'E', 'N', 'W']) if (faces[f]) face(K.run(defs[f][0], defs[f][1]));
    const gm = K.gMin(u0, v0, u1, v1);
    K.box(M.concreteDark, u0 + 0.45, gm - 1.2, v0 + 0.45, u1 - 0.45, eave, v1 - 0.45);
    const top = hipRoof(K, ROOF, u0, v0, u1, v1, eave + 0.05, slope, 1.0, { soffit: CREAM });
    for (const [u, v] of cupolas) { // louvred ventilation cupola with pyramidal metal cap
      const yb = top - 0.6; K.box(CREAM, u - 1.2, yb, v - 1.2, u + 1.2, yb + 1.7, v + 1.2);
      for (let k = 0; k < 5; k++) for (const [a, b, c, d] of [[u - 1.22, v - 1.0, u + 1.22, v + 1.0]]) K.box(M.iron, a, yb + 0.4 + k * 0.25, b, c, yb + 0.45 + k * 0.25, d, { detail: true });
      K.hip(X.zinc, u - 1.5, v - 1.5, u + 1.5, v + 1.5, yb + 1.7, 0.9);
    }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 1.2, eave + 4));
  }
  block(-8.5, 9.0, -16.7, 7.8, EAVE, 0.62, { S: 0, E: 1, N: 1, W: 1 }, [[0.2, -6]]);
  block(-8.5, 13.6, 7.8, 21.9, EAVE, 0.52, { S: 1, E: 1, N: 1, W: 1 }, [[2.5, 15]]);
  block(-12.6, -8.5, -16.7, -3.2, 12.6, 0.62, { S: 1, E: 0, N: 1, W: 1 });
  // canted three-sided bay tower at the north end
  {
    const P = [[8.0, -16.7], [8.0, -24.2], [5.2, -27.4], [0.9, -27.4], [-2.0, -24.2], [-2.1, -20.1], [0.6, -17.3]];
    for (let i = 0; i < P.length - 1; i++) { const a = P[i + 1], b = P[i]; const R = K.run(a, b); if (R.L < 1) continue;
      let gs = Infinity; for (let k = 0; k <= 3; k++) { const p = R.at(R.L * k / 3, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
      const ops = []; for (let fy = 11.0 - 3.6; fy > gs + 0.3; fy -= 3.6) ops.push({ s0: R.L / 2 - 0.9, s1: R.L / 2 + 0.9, y0: Math.max(gs + 0.6, fy + 0.7), y1: fy + 3.0, mull: 2, muntins: 3, frame: TEAL, sillMat: CREAM });
      openWall(K, R, CS, 0, R.L, gs - 1.2, 11.0, ops, { depth: 0.4, rev: 0.28, frame: TEAL, sillMat: CREAM });
      K.rbox(R, CREAM, -0.05, 10.2, -0.3, R.L + 0.05, 11.0, 0.06); }
    const c = [3.0, -22.5]; K.prism(M.concreteDark, P.map(([u, v]) => [u + (c[0] - u) * 0.08, v + (c[1] - v) * 0.08]), -1, 11.0);
    // pyramidal cap
    const pos = []; const apex = [c[0], 14.6, c[1]]; const O = P.map(([u, v]) => [u + (u - c[0]) * 0.12, 10.9, v + (v - c[1]) * 0.12]); O.push(O[0]);
    for (let i = 0; i < O.length - 1; i++) pos.push(...O[i], ...apex, ...O[i + 1]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); K.add(ROOF, g, { uvMode: 'roof' });
  }
  lamp(K, 16, K.g(16, 2), 2, 3.8);
  const object3d = K.finish();
  object3d.name = 'earl-f-cheit-hall';
  return { object3d, colliders };
}
