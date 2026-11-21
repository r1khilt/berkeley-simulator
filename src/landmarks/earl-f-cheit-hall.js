// Earl F. Cheit Hall, the classroom building of the Haas School of Business (Moore Ruble Yudell, 1995), closing the west
// end of O'Donnell Courtyard in the hillside "village" of Bay Region / Arts-and-Crafts buildings. Big dark slate hipped
// roofs on bracketed eaves with a copper-brown fascia and louvred ventilation cupolas; a lighter cast-stone base with
// pilasters, a sand-beige stucco middle storey and a top storey of grey-taupe horizontal siding; teal-green multi-pane
// steel windows. On the courtyard front a great round arch (three stepped orders, keystone) opens into a vaulted porch,
// with a canted oriel on stepped corbels above it; a canted, pyramid-roofed bay tower closes the north end.
// Massing follows the 2021 LiDAR (frame -4°): eaves ~16.5 m, ridges ~21.5–22 m, west annex ~15 m.
import * as THREE from 'three';
import { Kit, deg, openWall, hipRoof, gableEnd } from './lib/b05b-kit.js';
import { haasMats, archPart, archPortal, discLamp } from './lib/reastc-haas.js';

export const info = {
  id: 'earl-f-cheit-hall',
  name: 'Cheit Hall',
  subtitle: 'Haas School of Business · Moore Ruble Yudell, 1995',
  blurb: 'Named for former Haas dean Earl F. Cheit, the hall is one of the hipped-roof buildings of the Haas School of Business complex, grouped around O\'Donnell Courtyard on the hillside at Piedmont Avenue.',
  replaces: ['w/1371942534'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-4)); const M = ctx.M; const X = haasMats(M);
  const CS = X.stucco, STU = X.stucco, SID = X.stucco, CREAM = X.cast, ROOF = X.roof, TEAL = X.teal;
  const colliders = [], walkables = [];
  const EAVE = 16.5, Y3 = 12.0, Y2 = 7.4;
  // one façade run: cast-stone base with pilasters, stucco middle storey, siding top storey, cast frieze with brackets.
  // arch: {s, w, yTop?} cuts a great arched porch into the run (see reastc-haas archPortal)
  function face(R, { bay = 3.6, eave = EAVE, arch = null, doors = null } = {}) {
    const L = R.L; let gs = Infinity; for (let k = 0; k <= 6; k++) { const p = R.at(L * k / 6, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const nb = Math.max(1, Math.round(L / bay)); const bw = L / nb; const cs = Array.from({ length: nb }, (_, i) => bw * (i + 0.5));
    const win = (c, y0, h, w) => ({ s0: c - w / 2, s1: c + w / 2, y0, y1: y0 + h, mull: 1, muntins: 2, frame: TEAL, sillMat: CREAM });
    const y3 = Math.min(Y3, eave - 3.5), y2 = Math.min(Y2, y3 - 3.2);
    const sOps = [], tOps = [], bOps = [];
    // large multi-light steel windows: one wide window per bay per storey (4 lights across, 3 high)
    for (const c of cs) {
      tOps.push(win(c, y3 + 0.55, Math.min(2.1, eave - 1.0 - y3 - 0.85), Math.min(2.6, bw - 1.0)));
      sOps.push(win(c, y2 + 0.6, Math.min(2.5, y3 - y2 - 1.0), Math.min(2.6, bw - 1.0)));
      for (let fy = y2 - 3.6; fy > gs + 0.2; fy -= 3.6) bOps.push(win(c, Math.max(gs + 0.5, fy + 0.5), Math.min(2.5, y2 - 0.4 - Math.max(gs + 0.5, fy + 0.5)), Math.min(2.6, bw - 1.0)));
    }
    for (const o of [...tOps, ...sOps, ...bOps]) { o.mull = 3; o.muntins = 2; }
    let A = null; const clear = (o) => !A || o.s1 < A.s - A.w / 2 - 1.2 || o.s0 > A.s + A.w / 2 + 1.2;
    const holes = [];
    if (arch) {
      A = { ...arch, yTop: arch.yTop ?? gs + 7.9, g: gs + 0.15 };
      for (const [y0, y1] of [[gs - 1.2, y2], [y2, y3], [y3, eave - 1.0]]) holes.push(y1 > y0 ? archPart(A.s, A.w, A.yTop, y0, y1) : null);
    }
    // glazed double-door entries at plaza level (when the ground storey is tall enough)
    if (doors && y2 - gs > 3.2) for (const ds of doors) { const o = { s0: ds - 1.2, s1: ds + 1.2, y0: gs + 0.12, y1: gs + 2.85, kind: 'door', doorTop: gs + 2.85, door: M.windowNight, frame: TEAL, sill: false }; for (let i = bOps.length - 1; i >= 0; i--) if (bOps[i].s1 > o.s0 - 0.3 && bOps[i].s0 < o.s1 + 0.3 && bOps[i].y0 < o.y1) bOps.splice(i, 1); bOps.push(o); }
    openWall(K, R, CS, 0, L, gs - 1.2, y2, [...bOps.filter((o) => o.y1 < y2 - 0.3 && o.y1 > o.y0 + 0.8 && clear(o)), ...(holes[0] ? [holes[0]] : [])], { depth: 0.45, rev: 0.3, frame: TEAL, sillMat: CREAM });
    openWall(K, R, STU, 0, L, y2, y3, [...sOps.filter(clear), ...(holes[1] ? [holes[1]] : [])], { depth: 0.45, rev: 0.3, frame: TEAL, sillMat: CREAM });
    openWall(K, R, SID, 0, L, y3, eave - 0.3, [...tOps.filter(clear), ...(holes[2] ? [holes[2]] : [])], { depth: 0.45, rev: 0.3, frame: TEAL, sillMat: CREAM });
    for (const [a0, a1] of (A ? [[-0.05, A.s - 5.0], [A.s + 5.0, L + 0.05]] : [[-0.05, L + 0.05]])) K.rbox(R, CREAM, a0, eave - 0.6, 0, a1, eave - 0.3, 0.14); // single plaster cornice band
    if (A) { // front-gabled arch pavilion rising through the eave
      const Rp = K.run(R.at(A.s - 5.0, 0.0), R.at(A.s + 5.0, 0.0));
      K.wall(Rp, STU, 0, 10.0, eave - 0.3, eave + 0.4, [], 0.45);
      gableEnd(K, Rp, STU, eave + 0.4, 3.4, 0.45);
      K.rbox(Rp, CREAM, -0.1, eave + 0.25, 0, 10.1, eave + 0.45, 0.16);
      const pa = R.at(A.s - 5.0, 0.0), pb = R.at(A.s + 5.0, -6.0); const ua = [Math.min(pa[0], pb[0]), Math.max(pa[0], pb[0])], va = [Math.min(pa[1], pb[1]), Math.max(pa[1], pb[1])];
      K.gable(ROOF, ua[0], va[0], ua[1], va[1], eave + 0.4, 3.4, Math.abs(R.n[0]) > 0.5 ? 'u' : 'v', { overhang: 0.6 });
    }
    K.rbox(R, CREAM, -0.05, gs - 1.2, 0, L + 0.05, gs + 0.55, 0.06);                         // low cast plinth
    const segs = A ? [[-0.05, A.s - A.w / 2 - 0.95], [A.s + A.w / 2 + 0.95, L + 0.05]] : [[-0.05, L + 0.05]];
    for (const [a0, a1] of segs) { K.rbox(R, CREAM, a0, y2 - 0.2, 0, a1, y2 + 0.1, 0.1); K.rbox(R, CREAM, a0, y3 - 0.2, 0, a1, y3 + 0.1, 0.1); } // string courses
    if (A) archPortal(K, R, A.s, A.g, A.w, A.yTop, { depth: A.depth ?? 5.0, X, wallD: 0.45, oriel: { w: 6.0, h: 3.6, proj: 1.3, gap: 0.15, maxTop: eave + 1.6 } });
    return gs;
  }
  function block(u0, u1, v0, v1, eave, slope, faces = { S: 1, E: 1, N: 1, W: 1 }, cupolas = [], opts = {}) {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    for (const f of ['S', 'E', 'N', 'W']) if (faces[f]) face(K.run(defs[f][0], defs[f][1]), { eave, arch: opts.arch?.[f] || null, doors: opts.doors?.[f] || null });
    const gm = K.gMin(u0, v0, u1, v1);
    if (opts.porch) { const { vA, vB, uP, yP } = opts.porch; // keep the core out of the arched porch on the east face
      K.box(M.concreteDark, u0 + 0.45, gm - 1.2, v0 + 0.45, uP, eave, v1 - 0.45);
      K.box(M.concreteDark, uP, gm - 1.2, v0 + 0.45, u1 - 0.45, eave, vA);
      K.box(M.concreteDark, uP, gm - 1.2, vB, u1 - 0.45, eave, v1 - 0.45);
      K.box(M.concreteDark, uP, yP, vA, u1 - 0.45, eave, vB);
    } else K.box(M.concreteDark, u0 + 0.45, gm - 1.2, v0 + 0.45, u1 - 0.45, eave, v1 - 0.45);
    const top = hipRoof(K, ROOF, u0, v0, u1, v1, eave + 0.05, slope, 1.0, { soffit: CREAM });
    K.loop(X.fascia, [[u0 - 1.0, v1 + 1.0], [u1 + 1.0, v1 + 1.0], [u1 + 1.0, v0 - 1.0], [u0 - 1.0, v0 - 1.0]], [[0.02, eave + 0.05 - 1.0 * slope - 0.16], [0.02, eave + 0.05 - 1.0 * slope + 0.02]]);
    void cupolas; void top;
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 1.2, eave + 4));
  }
  // north range + courtyard front: the great arched porch sits in the 3 m notch of the footprint (u 6..9, v -3.2..7.8)
  { const gE = K.g(9.6, 2.6); block(-8.5, 9.0, -16.7, 7.8, EAVE, 0.54, { S: 0, E: 1, N: 1, W: 1 }, [], { arch: { E: { s: 5.2, w: 6.8, depth: 5.0 } }, doors: { E: [19.5] }, porch: { vA: 2.6 - 3.8, vB: 2.6 + 3.8, uP: 9.0 - 0.45 - 5.0 - 0.4, yP: gE + 7.9 + 0.6 } }); }
  block(-8.4, 12.0, 7.8, 21.9, EAVE, 0.6, { S: 1, E: 1, N: 1, W: 1 }, [], { doors: { E: [7.0] } });
  block(-12.6, -8.5, -16.7, -3.2, 15.0, 0.62, { S: 1, E: 0, N: 1, W: 1 });
  block(-11.1, -8.4, 14.9, 21.6, 15.0, 0.62, { S: 1, E: 0, N: 1, W: 1 });
  { const vC = -10.5, hw = 3.4, pr = 2.2, ch = 1.6, u1 = 9.0; const top = EAVE + 1.0;
    const P = [[u1, vC + hw], [u1 + pr - ch, vC + hw], [u1 + pr, vC + hw - ch], [u1 + pr, vC - hw + ch], [u1 + pr - ch, vC - hw], [u1, vC - hw]];
    for (let i = 0; i < P.length - 1; i++) { const R = K.run(P[i], P[i + 1]); const L = R.L; let gs = Infinity; for (let k = 0; k <= 2; k++) { const p = R.at(L * k / 2, 0.5); gs = Math.min(gs, K.g(p[0], p[1])); }
      const ops = L > 2.5 ? [{ s0: L / 2 - 1.5, s1: L / 2 - 0.12, y0: gs + 1.0, y1: top - 1.2, muntins: 8, mull: 1, frame: TEAL, sill: false }, { s0: L / 2 + 0.12, s1: L / 2 + 1.5, y0: gs + 1.0, y1: top - 1.2, muntins: 8, mull: 1, frame: TEAL, sill: false }] : [{ s0: 0.2, s1: L - 0.2, y0: gs + 1.0, y1: top - 1.2, muntins: 8, mull: 1, frame: TEAL, sill: false }];
      openWall(K, R, STU, 0, L, gs - 1.2, top, ops, { depth: 0.4, rev: 0.25, frame: TEAL });
      K.rbox(R, CREAM, -0.05, gs - 1.2, 0, L + 0.05, gs + 0.55, 0.06); K.rbox(R, CREAM, -0.05, top - 0.5, 0, L + 0.05, top - 0.2, 0.14); }
    K.prism(M.concreteDark, P.map(([u, v]) => [u - 0.35 + (u - u1) * -0.1, v]), -1, top);
    const gm = Math.min(K.g(u1 + 1, vC - 2), K.g(u1 + 1, vC + 2)); void gm;
    K.hip(ROOF, u1 - 1.0, vC - hw - 0.6, u1 + pr + 0.6, vC + hw + 0.6, top, 0.6);
    colliders.push(K.colPoly(P.concat([[u1 - 0.5, vC - hw], [u1 - 0.5, vC + hw]]).slice(0, 6), -1, top)); }
  // canted three-sided bay tower at the north end
  {
    const P = [[8.0, -16.7], [8.0, -24.2], [5.2, -27.4], [0.9, -27.4], [-2.0, -24.2], [-2.1, -20.1], [0.6, -17.3]];
    const TH = 12.2;
    for (let i = 0; i < P.length - 1; i++) { const a = P[i + 1], b = P[i]; const R = K.run(a, b); if (R.L < 1) continue;
      let gs = Infinity; for (let k = 0; k <= 3; k++) { const p = R.at(R.L * k / 3, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
      const ops = []; for (let fy = TH - 1.0 - 3.6; fy > gs + 0.3; fy -= 3.6) ops.push({ s0: R.L / 2 - 0.9, s1: R.L / 2 + 0.9, y0: Math.max(gs + 0.6, fy + 0.7), y1: fy + 3.0, mull: 2, muntins: 3, frame: TEAL, sillMat: CREAM });
      openWall(K, R, STU, 0, R.L, gs - 1.2, TH, ops, { depth: 0.4, rev: 0.28, frame: TEAL, sillMat: CREAM });
      K.rbox(R, CS, -0.05, gs - 1.2, 0, R.L + 0.05, gs + 1.0, 0.12);
      K.rbox(R, CREAM, -0.05, TH - 0.8, -0.3, R.L + 0.05, TH, 0.08); K.rbox(R, X.fascia, -0.05, TH - 0.85, 0, R.L + 0.05, TH - 0.78, 0.12); }
    const c = [3.0, -22.5]; K.prism(M.concreteDark, P.map(([u, v]) => [u + (c[0] - u) * 0.08, v + (c[1] - v) * 0.08]), -1, TH);
    const pos = []; const apex = [c[0], TH + 2.6, c[1]]; const O = P.map(([u, v]) => [u + (u - c[0]) * 0.12, TH - 0.1, v + (v - c[1]) * 0.12]); O.push(O[0]);
    for (let i = 0; i < O.length - 1; i++) pos.push(...O[i], ...apex, ...O[i + 1]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); K.add(ROOF, g, { uvMode: 'roof' });
  }
  // courtyard paving apron along the east front (granite pavers), and slender disc-head pole lights
  for (const [ua, va, ub, vb] of [[9.0, -16.7, 12.5, 7.8], [12.0, 7.8, 15.0, 21.9]]) { const gy = Math.max(K.g(ua + 0.5, (va + vb) / 2), K.g(ua + 0.5, va + 0.5), K.g(ua + 0.5, vb - 0.5)); K.box(M.paving, ua - 0.05, gy - 0.6, va, ub, gy + 0.03, vb); walkables.push(K.walkPoly([[ua, va], [ub, va], [ub, vb], [ua, vb]], gy + 0.03)); }
  for (const [u, v] of [[15.5, -4.0], [16.0, 9.5]]) discLamp(K, u, K.g(u, v), v, 6.0, X);
  const object3d = K.finish();
  object3d.name = 'earl-f-cheit-hall';
  return { object3d, colliders, walkables };
}
