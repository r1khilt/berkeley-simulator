// International House (George W. Kelham, 1930). Spanish Colonial Revival: cream stucco over concrete, red barrel-tile hip
// roofs, punched dark-sash windows, and a square tower whose arcaded belfry stage, scalloped parapet panels and corner
// piers carry a short drum and a plain stucco dome — the landmark seen above Piedmont Avenue from all over campus.
// Plan (fitted to the 2021 LiDAR, frame rotated -8.8° with the street grid): a 4-storey courtyard block faces Piedmont
// (west) with a one-storey entrance pavilion between two short wings, the lettered frieze and a Monterey-style wooden
// gallery above; behind it a 6–8 storey north–south spine with the domed tower at its north-centre and a taller south
// pavilion; two long wings climb the hill eastward toward Memorial Stadium.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { bmats, stuccoBlock as stuccoBlock0, shedRoof, chimney, letterPanel, steps } from './lib/b08c-kit.js';
import { rmats } from './lib/reastb-kit.js';

export const info = {
  id: 'international-house',
  name: 'International House',
  subtitle: 'George W. Kelham · 1930',
  blurb: 'Built with a gift from John D. Rockefeller Jr., I-House opened in 1930 as a residence where American and international students live together. Its domed tower above Piedmont Avenue is one of the best-known silhouettes on the east side of campus.',
  replaces: ['r/945393', 'relation/945393'],
};

export async function build(ctx) {
  const M = ctx.M; const B = bmats(M); const RM = rmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.8));
  const colliders = [], walkables = [];
  const S = RM.ihStucco; // bright smooth off-white stucco
  const SASH = RM.sash;   // white-painted double-hung sash
  // every stucco block: off-white walls, white sash, deeper eaves
  const stuccoBlock = (K, sp) => stuccoBlock0(K, { mat: S, frame: SASH, overhang: 0.85, ...sp });
  const col = (u0, v0, u1, v1, y1) => colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, y1));
  const win = { w: 1.2, h: 1.55, mull: 1, muntins: 1 };
  const gwin = { w: 1.3, h: 2.0, mull: 1, muntins: 1, tran: 0.72 };

  // ================= west courtyard block (4 storeys toward Piedmont) =================
  const blocks = [
    // u0, u1, v0, v1, eave, ridge, faces
    { u0: -26.0, u1: 5.3, v0: -35.2, v1: -19.2, eave: 12.0, ridge: 14.4, faces: { E: false, W: false } },  // north range
    { u0: -31.0, u1: -26.0, v0: -35.2, v1: -19.2, eave: 7.4, ridge: 9.0, faces: { E: false } },           // its low west end
    { u0: -34.9, u1: -26.6, v0: -13.5, v1: -0.3, eave: 12.6, ridge: 15.0, faces: { E: false }, roof: 'gable', axis: 'u' },          // NW wing (forecourt arm)
    { u0: -34.9, u1: -26.6, v0: -19.2, v1: -13.5, eave: 7.0, ridge: 8.4, faces: { E: false, S: false } },   // low NW corner
    { u0: -26.6, u1: 5.3, v0: -15.0, v1: -2.6, eave: 15.8, ridge: 18.4, faces: { E: false } },            // central range
    { u0: -26.6, u1: -13.1, v0: -2.6, v1: 20.6, eave: 15.8, ridge: 18.4, faces: { N: false, S: false }, gal: true }, // range behind the pavilion
    { u0: -35.2, u1: -26.6, v0: 20.2, v1: 32.9, eave: 12.6, ridge: 15.0, faces: { E: false }, roof: 'gable', axis: 'u' },          // SW wing (forecourt arm)
    { u0: -26.6, u1: 5.3, v0: 20.6, v1: 33.6, eave: 15.8, ridge: 18.4, faces: { E: false } },             // south range
  ];
  for (const b of blocks) {
    stuccoBlock(K, { ...b, win, groundWin: gwin, bay: 4.0 });
    col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5);
  }
  // one-storey link between the north and central ranges
  stuccoBlock(K, { u0: -26.6, u1: -6.0, v0: -19.2, v1: -15.0, eave: 4.9, roof: 'flat', parapet: 0.4, faces: { N: false, S: false, E: false }, win: gwin, bay: 3.2 });
  stuccoBlock(K, { u0: -6.0, u1: 5.3, v0: -19.2, v1: -15.0, eave: 8.6, ridge: 10.6, faces: { N: false, S: false, E: false, W: false }, win, bay: 3.2 });
  // low cloister strips along the north and south sides of the inner courtyard
  for (const [v0, v1, hi] of [[-2.6, 1.3, 'v0'], [17.1, 20.6, 'v1']]) {
    const g = K.gMin(-13.1, v0, 5.3, v1);
    K.box(S, -13.1, g - 1.5, v0, 5.3, 7.4, v1);
    const R = hi === 'v0' ? K.run([5.3, v1], [-13.1, v1]) : K.run([-13.1, v0], [5.3, v0]);
    const ops = []; for (let s = 1.6; s < R.L - 1.5; s += 3.1) ops.push({ s0: s - 0.9, s1: s + 0.9, y0: g + 0.3, y1: g + 3.0, arch: true, sill: false });
    K.wall(R, S, 0, R.L, g - 1.5, 7.4, ops, 0.5);
    for (const o of ops) K.fill(R, o, { frame: B.frameDark, mull: 1, rev: 0.4 });
    shedRoof(K, M.redTile, -13.4, hi === 'v0' ? v0 : v0 - 0.5, 5.3, hi === 'v0' ? v1 + 0.5 : v1, 7.3, 8.6, hi);
  }
  // inner courtyard paving
  { const g = K.gMin(-13.1, 1.3, 5.3, 17.1); K.box(M.paving, -13.1, g - 0.6, 1.3, 5.3, g + 0.05, 17.1); }

  // ================= entrance pavilion, forecourt and steps =================
  {
    const u0 = -31.4, u1 = -27.0, v0 = 1.7, v1 = 17.6; const yF = 1.5;
    K.box(S, u0, -1.0, v0, u1, 6.3, v1); // body (core)
    for (const [a, b] of [[-0.3, 1.7], [17.6, 20.2]]) { stuccoBlock(K, { u0: -34.9, u1: -26.6, v0: a, v1: b, eave: 6.6, roof: 'flat', parapet: 0.5, faces: { E: false, N: a > 0, S: a < 0 }, win: gwin, bay: 3.0 }); col(-34.9, a, -26.6, b, 7.2); }
    const R = K.run([u0, v0], [u0, v1]); // west face, N→S
    const L = R.L, c = L / 2;
    const ops = [
      { s0: 1.3, s1: 4.9, y0: yF + 0.5, y1: 5.0, muntins: 3 },
      { s0: c - 1.7, s1: c + 1.7, y0: yF, y1: 5.0, doorTop: 4.0, sill: false },
      { s0: L - 4.9, s1: L - 1.3, y0: yF + 0.5, y1: 5.0, muntins: 3 },
    ];
    K.wall(R, S, 0, L, -1.0, 6.4, ops, 0.45);
    K.fill(R, ops[0], { frame: SASH, mull: 3, rev: 0.3 });
    K.fill(R, ops[2], { frame: SASH, mull: 3, rev: 0.3 });
    K.fill(R, ops[1], { frame: B.frameDark, mull: 2, rev: 0.35, tran: [4.0] });
    // lettered frieze
    K.rbox(R, S, 0, 5.25, 0, L, 5.3, 0.04);
    letterPanel(K, R, '• INTERNATIONAL • HOUSE •', c, 5.32, 11.5, 0.75, 0.05, { color: '#d9ccb0', shadow: '#7d7262' });
    // projecting glass vestibule
    const vu0 = u0 - 2.0, vv0 = v0 + c - 1.9, vv1 = v0 + c + 1.9;
    K.box(M.glass, vu0 + 0.05, yF, vv0 + 0.05, u0, yF + 2.75, vv1 - 0.05);
    for (const v of [vv0, vv0 + 1.27, vv1 - 1.27, vv1]) K.box(B.frameDark, vu0, yF, v - 0.05, vu0 + 0.1, yF + 2.8, v + 0.05);
    K.box(B.frameDark, vu0 - 0.05, yF + 2.75, vv0 - 0.05, u0, yF + 3.05, vv1 + 0.05);
    K.box(B.frameDark, vu0, yF + 2.1, vv0, vu0 + 0.08, yF + 2.18, vv1);
    // shed tile roof with exposed rafter tails
    shedRoof(K, M.redTile, u0 - 0.7, v0, u1 + 0.1, v1, 6.55, 7.45, 'u1', { rafters: 0.6, rafterMat: M.woodDark, thick: 0.25 });
    // lanterns either side of the vestibule
    for (const v of [vv0 - 0.7, vv1 + 0.7]) { K.box(M.iron, u0 - 0.35, 3.3, v - 0.12, u0 - 0.05, 3.9, v + 0.12, { detail: true }); K.box(M.lampGlow, u0 - 0.33, 3.4, v - 0.1, u0 - 0.07, 3.8, v + 0.1, { detail: true }); }
    // forecourt landing + brick steps down to Piedmont Avenue
    const lu0 = -37.0;
    K.box(M.paving, lu0, -1.0, 2.6, u0, yF, 16.6);
    walkables.push(K.walkPoly([[lu0, 2.6], [u0, 2.6], [u0, 16.6], [lu0, 16.6]], yF));
    const gS = K.g(-43.0, 9.6);
    // two brick flights with a mid landing, iron handrails
    { const yM = (gS + yF) / 2;
      walkables.push(steps(K, M.brick, -43.0, 4.6, -40.6, 14.6, gS, yM, '+u'));
      K.box(M.brick, -40.6, gS - 1.0, 4.6, -39.4, yM, 14.6);
      walkables.push(K.walkPoly([[-40.6, 4.6], [-39.4, 4.6], [-39.4, 14.6], [-40.6, 14.6]], yM));
      walkables.push(steps(K, M.brick, -39.4, 4.6, lu0, 14.6, yM, yF, '+u'));
      for (const v of [7.6, 11.6]) { const g = new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(6.0, yF - gS), 6); g.rotateZ(-Math.atan2(6.0, yF - gS)); g.translate(-40.0, (gS + yF) / 2 + 0.95, v); K.add(M.iron, g, { detail: true });
        for (const u of [-42.6, -40.0, -37.4]) { const yy = gS + (yF - gS) * (u + 43.0) / 6.0; K.box(M.iron, u - 0.025, yy, v - 0.025, u + 0.025, yy + 0.95, v + 0.025, { detail: true }); } } }
    // planter cheek walls
    for (const [a, b] of [[2.0, 4.6], [14.6, 17.2]]) { const gg = K.g(-40, (a + b) / 2); K.box(S, -41.0, gg - 1.0, a, lu0, yF + 0.55, b); colliders.push(K.colPoly([[-41, a], [lu0, a], [lu0, b], [-41, b]], -1, yF + 0.6)); }
    // black lamp posts on the stair flanks
    for (const v of [4.2, 15.0]) { const gg = yF + 0.55; K.cyl(M.iron, -40.0, gg, v, 0.07, 0.06, 2.6, 8, { detail: true }); K.box(M.iron, -40.2, gg + 2.6, v - 0.2, -39.8, gg + 3.15, v + 0.2, { detail: true }); K.box(M.lampGlow, -40.15, gg + 2.65, v - 0.15, -39.85, gg + 3.05, v + 0.15, { detail: true }); }
    col(u0, v0, u1, v1, 8);
    colliders.push(K.colPoly([[vu0, vv0], [u0, vv0], [u0, vv1], [vu0, vv1]], 0, 5));
  }

  // ================= Monterey-style wooden gallery (top storey, behind the pavilion) =================
  {
    const u = -27.0, v0 = 3.4, v1 = 15.4, yG = 12.35, yB = 15.25, P = 1.25;
    const W = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.75 }); // dark-stained timber gallery
    K.box(W, u - P, yG - 0.18, v0, u, yG, v1);                         // floor
    for (let v = v0 + 0.35; v < v1; v += 0.86) K.box(W, u - P - 0.25, yG - 0.42, v - 0.08, u, yG - 0.18, v + 0.08, { detail: true }); // beam ends
    for (const v of [v0 + 0.3, v1 - 0.3]) K.box(W, u - 0.9, yG - 1.0, v - 0.12, u, yG - 0.2, v + 0.12); // end brackets
    const n = 9; for (let i = 0; i < n; i++) { const v = v0 + 0.15 + (v1 - v0 - 0.3) * i / (n - 1); K.box(W, u - P + 0.05, yG, v - 0.09, u - P + 0.23, yB, v + 0.09); K.box(W, u - P - 0.05, yB - 0.32, v - 0.38, u - P + 0.33, yB - 0.12, v + 0.38, { detail: true }); }
    K.box(W, u - P - 0.08, yB, v0, u - P + 0.32, yB + 0.25, v1);         // beam
    K.box(W, u - P + 0.02, yG + 0.92, v0, u - P + 0.26, yG + 1.02, v1); // handrail
    for (let v = v0 + 0.25; v < v1 - 0.1; v += 0.2) K.box(W, u - P + 0.1, yG, v - 0.025, u - P + 0.17, yG + 0.92, v + 0.025, { detail: true });
    shedRoof(K, M.redTile, u - P - 0.6, v0 - 0.4, u, v1 + 0.4, yB + 0.3, yB + 1.0, 'u1', { thick: 0.3, rafters: 0.5, rafterMat: W });
  }

  // ================= north–south spine (6–8 storeys) =================
  const spine = [
    { u0: 5.3, u1: 17.4, v0: -41.1, v1: -33.5, eave: 21.8, ridge: 24.4, faces: { S: false } },
    { u0: 5.3, u1: 17.4, v0: -33.5, v1: -14.5, eave: 24.3, ridge: 27.4, faces: { S: false, N: false } },
    { u0: 5.3, u1: 17.4, v0: -1.5, v1: 20.5, eave: 28.2, ridge: 31.0, faces: { N: false, S: false }, topWin: { w: 1.25, h: 2.3, arch: true, mull: 1 } },
    { u0: 5.3, u1: 17.5, v0: 20.5, v1: 32.7, eave: 31.2, ridge: 34.2, faces: {}, topWin: { w: 0.9, h: 0.9, mull: 0 } },
    { u0: 6.0, u1: 17.5, v0: 32.7, v1: 36.1, eave: 24.6, ridge: 26.2, faces: { N: false } },
    { u0: 8.6, u1: 16.0, v0: -43.8, v1: -41.1, eave: 23.6, ridge: 26.0, faces: { S: false } },
  ];
  for (const b of spine) { stuccoBlock(K, { ...b, win: { w: 1.2, h: 1.75, mull: 0, tran: 0.55 }, bay: 3.5, fh: 3.55 }); col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5); }

  // ================= east wings climbing the hill =================
  const wings = [
    { u0: 17.4, u1: 45.5, v0: -14.1, v1: -2.1, eave: 28.6, ridge: 30.5, faces: { W: false } },
    { u0: 45.5, u1: 50.3, v0: -11.3, v1: -5.9, eave: 26.0, ridge: 27.6, faces: { W: false } },
    { u0: 45.5, u1: 47.5, v0: -14.1, v1: -2.1, eave: 26.0, ridge: 27.6, faces: { W: false, E: false } },
    { u0: 17.5, u1: 29.5, v0: 20.5, v1: 32.5, eave: 28.0, ridge: 30.4, faces: { W: false } },
    { u0: 29.5, u1: 46.0, v0: 20.5, v1: 32.5, eave: 25.6, ridge: 27.7, faces: { W: false } },
    { u0: 46.0, u1: 50.6, v0: 23.7, v1: 29.3, eave: 23.0, ridge: 24.5, faces: { W: false } },
    { u0: 46.0, u1: 47.8, v0: 20.5, v1: 32.5, eave: 23.0, ridge: 24.5, faces: { W: false, E: false } },
  ];
  for (const b of wings) { stuccoBlock(K, { ...b, win, bay: 3.7, fh: 3.4 }); col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5); }

  // ================= the tower =================
  // 12 m square shaft to the main cornice (~33 m, tile caps on its corners), a set-back belfry stage with three tall
  // round-arched openings per face, scalloped espadaña panels on the parapet, and the plain cream dome (top ~44.6 m).
  {
    const u0 = 6.5, u1 = 18.5, v0 = -14.5, v1 = -1.5, cu = 12.5, cv = -8.0;
    const yG = K.gMin(u0, v0, u1, v1) - 1.5;
    const ySh = 33.2, yB1 = 38.7, yPar = 39.5;
    K.box(M.concreteDark, u0 + 0.5, yG, v0 + 0.5, u1 - 0.5, ySh - 0.05, v1 - 0.5);
    const runs4 = (a0, a1, b0, b1) => [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]];
    for (const [a, b] of runs4(u0, u1, v0, v1)) {
      const R = K.run(a, b); const L = R.L, c = L / 2;
      const ops = []; for (let y = 17.6; y < ySh - 2.4; y += 3.1) ops.push({ s0: c - 0.5, s1: c + 0.5, y0: y, y1: y + 1.4 });
      K.wall(R, S, 0, L, yG, ySh, ops, 0.4);
      for (const o of ops) K.fill(R, o, { frame: SASH, mull: 1, muntins: 1, rev: 0.3 });
      K.mould(R, S, 0, L, [[0, ySh - 0.5], [0.15, ySh - 0.42], [0.32, ySh - 0.18], [0.38, ySh], [0, ySh]]);
    }
    K.box(M.concreteDark, u0 + 0.2, ySh - 0.3, v0 + 0.2, u1 - 0.2, ySh + 0.05, v1 - 0.2);
    // tile caps on the shaft corners
    for (const [pu, pv] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) {
      const su = pu < cu ? 1 : -1, sv = pv < cv ? 1 : -1;
      K.box(S, Math.min(pu, pu + su * 1.5), ySh, Math.min(pv, pv + sv * 1.5), Math.max(pu, pu + su * 1.5), ySh + 0.5, Math.max(pv, pv + sv * 1.5));
      K.hip(M.redTile, Math.min(pu, pu + su * 1.5) - 0.15, Math.min(pv, pv + sv * 1.5) - 0.15, Math.max(pu, pu + su * 1.5) + 0.15, Math.max(pv, pv + sv * 1.5) + 0.15, ySh + 0.5, 0.6);
    }
    // belfry stage
    const b0u = 7.6, b1u = 17.4, b0v = -12.9, b1v = -3.1;
    K.box(M.concreteDark, b0u + 1.0, ySh, b0v + 1.0, b1u - 1.0, yB1, b1v - 1.0);
    for (const [a, b] of runs4(b0u, b1u, b0v, b1v)) {
      const R = K.run(a, b); const L = R.L, c = L / 2;
      const bo = [-1, 0, 1].map((sg) => ({ s0: c + sg * 2.45 - 0.66, s1: c + sg * 2.45 + 0.66, y0: ySh + 0.75, y1: ySh + 4.75, arch: true, sill: false }));
      K.wall(R, S, 0, L, ySh, yB1, bo, 1.0);
      for (const o of bo) { K.fill(R, o, { glass: B.voidDark, frame: B.frameDark, mull: 0, rev: 0.95 }); K.rbox(R, S, o.s0 - 0.15, o.y0 - 0.25, -0.2, o.s1 + 0.15, o.y0, 0.12); }
      // pilaster piers at the belfry corners and between the arches
      for (const s of [0.45, L - 0.45]) K.rbox(R, S, s - 0.45, ySh, 0, s + 0.45, yB1, 0.22);
      K.mould(R, S, 0, L, [[0, ySh + 4.0], [0.12, ySh + 4.05], [0.12, ySh + 4.25], [0, ySh + 4.3]]);
      K.mould(R, S, 0, L, [[0, yB1 - 0.45], [0.15, yB1 - 0.38], [0.3, yB1 - 0.15], [0.34, yB1], [0, yB1]]);
      // parapet + scalloped centre panel
      K.rbox(R, S, -0.1, yB1, -0.4, L + 0.1, yPar, 0.0);
      K.rbox(R, S, -0.15, yPar, -0.45, L + 0.15, yPar + 0.1, 0.05);
      const sh = new THREE.Shape(); const w = 2.3, hgt = 1.9;
      sh.moveTo(c - w, yPar); sh.quadraticCurveTo(c - w + 0.1, yPar + 0.75, c - 1.1, yPar + 0.85);
      sh.quadraticCurveTo(c - 0.6, yPar + 0.95, c - 0.55, yPar + 1.35); sh.quadraticCurveTo(c - 0.45, yPar + hgt, c, yPar + hgt);
      sh.quadraticCurveTo(c + 0.45, yPar + hgt, c + 0.55, yPar + 1.35); sh.quadraticCurveTo(c + 0.6, yPar + 0.95, c + 1.1, yPar + 0.85);
      sh.quadraticCurveTo(c + w - 0.1, yPar + 0.75, c + w, yPar); sh.lineTo(c - w, yPar);
      const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 6 }); pg.translate(0, 0, -0.4);
      K.addRun(R, S, pg);
    }
    for (const [pu, pv] of [[b0u, b0v], [b1u, b0v], [b1u, b1v], [b0u, b1v]]) { K.box(S, pu - 0.4, yB1, pv - 0.4, pu + 0.4, yPar + 0.45, pv + 0.4); K.lathe(S, [[0.28, 0], [0.28, 0.12], [0.16, 0.28], [0.24, 0.55], [0.001, 1.0]], pu, yPar + 0.45, pv, 10); }
    // short drum + stilted dome in plain cream stucco
    K.cyl(S, cu, yB1 - 0.2, cv, 4.62, 4.62, 1.2, 36);
    K.cyl(S, cu, yB1 + 1.0, cv, 4.78, 4.85, 0.3, 36);
    const prof = []; const R0 = 4.7, st = 0.92, yD = yB1 + 1.3;
    for (let i = 0; i <= 14; i++) { const t = (i / 14) * Math.PI / 2; prof.push([R0 * Math.cos(t), R0 * st * Math.sin(t)]); }
    K.lathe(S, prof, cu, yD, cv, 36);
    K.lathe(S, [[0.3, 0], [0.3, 0.1], [0.2, 0.22], [0.24, 0.42], [0.001, 0.62]], cu, yD + R0 * st - 0.06, cv, 10);
    col(u0, v0, u1, v1, 45);
  }

  // ================= chimneys =================
  chimney(K, -34.2, 31.4, 12.0, 21.6, 1.1, 0.8);
  chimney(K, 1.4, -34.9, 12.0, 16.6, 1.0, 0.7);
  chimney(K, 40.0, -12.6, 28.0, 31.8, 1.0, 0.7);

  const object3d = K.finish();
  object3d.name = 'international-house';
  return { object3d, colliders, walkables };
}
