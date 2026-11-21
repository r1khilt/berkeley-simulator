// Physics North & Physics South (former LeConte Hall). John Galen Howard's 1924 physics building and its 1950 addition.
// The west front (Physics North) is a Beaux-Arts composition 57 m long: a banded-rusticated ground storey with tall doorways,
// a giant order of nine engaged Ionic columns carrying a full entablature over the two upper floors, carved spandrel panels
// between the paired multi-pane windows, and two slightly projecting end pavilions with triple windows and low pediments.
// Low clay-tile hip roofs. Physics South (east) is the plainer 1950 wing under a higher hip roof.
// Massing from LiDAR: front range eaves ~19 m / ridge ~22 m, north range ~19 m, court block ~13.6 m, connector ~20 m,
// east wing eaves ~19.6 m / ridge ~25 m with flat-roofed ends.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, punchedBlock, rect, colFromXZ, tint, plain, cols, punched, glassTint } from './lib/b04-kit.js';
import { ionicColumn, corniceProfile } from './lib/classic-kit.js';

export const info = {
  id: 'physics-north-and-physics-south',
  name: 'Physics North & Physics South',
  subtitle: 'Former LeConte Hall · John Galen Howard, 1924',
  blurb: 'Berkeley\'s physics building, where Ernest Lawrence developed the cyclotron in the early 1930s. Long named LeConte Hall, its two wings were renamed Physics North and Physics South in 2020.',
  replaces: ['w/24024500'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.4)); const M = ctx.M;
  const W = tint(M, 'concrete', 0xd2cfc5);          // cast-stone walls scored as ashlar
  const S = tint(M, 'stuccoWhite', 0xd0cdc2);     // smooth trim: columns, entablature, pilasters
  const RU = tint(M, 'concrete', 0xcfccc2);        // banded rusticated ground storey
  const PL = tint(M, 'concrete', 0xbdbab0);        // plinth
  const ROOF = plain(M, 0x8aa395, { rough: 0.5, metal: 0.35 }); // weathered green-grey metal roof
  const FR = plain(M, 0xdcd8cc, { rough: 0.6 }); const GL = glassTint(M, 0x4e5862, { rough: 0.12, metal: 0.35 });       // muted, weathered clay tile
  const OAK = plain(M, 0xc49a4c, { rough: 0.45 });
  const colliders = [], walkables = [];
  const FL = 1.9;                    // ground-floor level
  const Y_PL = 1.7, Y_SC0 = 6.6, Y_SC1 = 7.1, Y_ENT = 15.9, Y_COR = 18.9;
  const uP = -34.85, uR = -33.95;    // pavilion / podium face, recessed upper wall of the colonnade
  const vN = -47.1, vS = 10.0, vP0 = -40.0, vP1 = 3.0; // west front ends, pavilion junctions
  const det = { detail: true };
  const winRows = (w, n = 1) => [
    { y0: 7.7, h: 2.9, w, mull: n, tran: 0.78, muntins: 2 },
    { y0: 12.0, h: 2.9, w, mull: n, tran: 0.78, muntins: 2 },
  ];
  // sunk spandrel panel with a carved garland (simple swag + boss) between the upper windows
  const spandrel = (R, c, w, d0 = 0) => {
    K.rbox(R, PL, c - w / 2, 10.82, d0 - 0.08, c + w / 2, 11.78, d0 - 0.02);
    K.rbox(R, S, c - w * 0.32, 11.12, d0 - 0.06, c + w * 0.32, 11.3, d0 + 0.04, det);
    K.rbox(R, S, c - 0.14, 11.05, d0 - 0.06, c + 0.14, 11.5, d0 + 0.08, det);
    K.rbox(R, S, c - w / 2 - 0.06, 10.76, d0 - 0.02, c + w / 2 + 0.06, 10.84, d0 + 0.04, det);
  };
  // ground storey: plinth + rusticated wall with openings
  const podium = (R, s0, s1, ops, { plinth = true } = {}) => {
    if (plinth) K.rbox(R, PL, s0 - 0.12, -1.6, -0.5, s1 + 0.12, Y_PL, 0.14);
    K.wall(R, RU, s0, s1, Y_PL, Y_SC0, ops, 0.5);
    K.rustic(R, s0, s1, Y_PL, Y_SC0, ops, 0.54, RU, 0.07, 0.04);
    K.rbox(R, S, s0 - 0.1, Y_SC0, -0.5, s1 + 0.1, Y_SC1, 0.22); // stringcourse / column base course
  };
  const fillAll = (R, ops, o = {}) => { for (const op of ops) K.fill(R, op, { rev: o.rev ?? 0.38, mull: op.mull ?? 1, tran: op.tran ? [op.y0 + (op.y1 - op.y0) * op.tran] : [], frame: FR, glass: GL }); };
  const entab = (R, s0, s1, { ret0 = true, ret1 = true, back = 0.5 } = {}) => {
    K.rbox(R, S, s0, Y_ENT, -back, s1, Y_ENT + 0.35, 0.06);         // architrave lower fascia
    K.rbox(R, S, s0, Y_ENT + 0.35, -back, s1, Y_ENT + 0.72, 0.12);  // upper fascia
    K.rbox(R, S, s0, Y_ENT + 0.72, -back, s1, Y_COR - 1.15, 0.04);  // frieze
    K.mould(R, S, s0, s1, corniceProfile(Y_COR, 0.85, 1.15), { ret0, ret1 });
    // dentils under the corona
    const n = Math.floor((s1 - s0) / 0.36);
    for (let i = 0; i < n; i++) { const s = s0 + 0.18 + i * (s1 - s0 - 0.36) / Math.max(1, n - 1); K.rbox(R, S, s - 0.08, Y_COR - 0.86, 0.1, s + 0.08, Y_COR - 0.68, 0.32, det); }
  };
  // a monumental oak doorway in the rusticated storey (gold oak leaves, glazed transom, stone architrave with bosses, hood)
  const doorway = (R, c, y0, w = 2.3, h = 4.1) => {
    const op = { s0: c - w / 2, s1: c + w / 2, y0, y1: y0 + h };
    K.rbox(R, M.windowNight, op.s0, y0 + 2.95, -0.62, op.s1, op.y1, -0.58);
    for (const k of [1, 2, 3]) K.rbox(R, OAK, op.s0 + w * k / 4 - 0.035, y0 + 2.95, -0.6, op.s0 + w * k / 4 + 0.035, op.y1, -0.52, det);
    K.rbox(R, OAK, op.s0, y0 + 2.8, -0.62, op.s1, y0 + 2.98, -0.48); // transom bar with frieze
    for (const sx of [0, 1]) { // two leaves with three raised panels each
      const a = op.s0 + sx * w / 2, b = a + w / 2;
      K.rbox(R, OAK, a + 0.02, y0, -0.66, b - 0.02, y0 + 2.8, -0.6);
      for (const [p0, p1] of [[0.25, 0.75], [0.95, 2.05], [2.2, 2.62]]) K.rbox(R, OAK, a + 0.16, y0 + p0, -0.6, b - 0.16, y0 + p1, -0.55, det);
    }
    K.rbox(R, M.bronze, c - 0.08, y0 + 1.0, -0.55, c - 0.03, y0 + 1.5, -0.48, det); K.rbox(R, M.bronze, c + 0.03, y0 + 1.0, -0.55, c + 0.08, y0 + 1.5, -0.48, det);
    // fluted oak jamb pilasters
    for (const s of [op.s0 + 0.09, op.s1 - 0.09]) K.rbox(R, OAK, s - 0.09, y0, -0.5, s + 0.09, op.y1, -0.38);
    // stone architrave with bosses
    for (const [a, b] of [[op.s0 - 0.42, op.s0], [op.s1, op.s1 + 0.42]]) {
      K.rbox(R, S, a, y0 - 0.05, -0.05, b, op.y1 + 0.42, 0.12);
    }
    K.rbox(R, S, op.s0 - 0.42, op.y1, -0.05, op.s1 + 0.42, op.y1 + 0.42, 0.12);
    for (let y = y0 + 0.3; y < op.y1 + 0.2; y += 0.48) for (const s of [op.s0 - 0.21, op.s1 + 0.21]) K.rbox(R, S, s - 0.07, y - 0.07, 0.12, s + 0.07, y + 0.07, 0.18, det);
    // hood cornice on consoles
    K.rbox(R, S, op.s0 - 0.7, op.y1 + 0.42, -0.05, op.s1 + 0.7, op.y1 + 0.62, 0.5);
    K.rbox(R, S, op.s0 - 0.6, op.y1 + 0.62, -0.05, op.s1 + 0.6, op.y1 + 0.72, 0.42);
    for (const s of [op.s0 - 0.55, op.s1 + 0.55]) K.rbox(R, S, s - 0.12, op.y1 - 0.2, 0.0, s + 0.12, op.y1 + 0.42, 0.38);
    return op;
  };
  // brick steps with concrete cheeks and black rails, climbing toward the wall to level yHi
  const stoop = (R, c, w, yHi) => {
    const gl = K.g(...R.at(c, 1.5)); if (yHi - gl < 0.12) return;
    const n = Math.max(1, Math.round((yHi - gl) / 0.165)); const run = n * 0.31;
    const p0 = R.at(c - w / 2, 0.14), p1 = R.at(c + w / 2, 0.14 + run);
    const uu = [p0[0], p1[0]].sort((a, b) => a - b), vv = [p0[1], p1[1]].sort((a, b) => a - b);
    const nn = R.n; const dir = Math.abs(nn[0]) > Math.abs(nn[1]) ? (nn[0] > 0 ? '-u' : '+u') : (nn[1] > 0 ? '-v' : '+v');
    walkables.push(K.stairs(M.brick, uu[0], vv[0], uu[1], vv[1], gl, yHi, dir, n));
    for (const s of [c - w / 2 - 0.3, c + w / 2]) {
      K.rbox(R, PL, s, gl - 0.8, 0.14, s + 0.3, yHi + 0.15, 0.14 + run);
      K.rbox(R, M.iron, s + 0.12, yHi + 0.95, 0.14, s + 0.18, yHi + 1.0, 0.14 + run, det);
      for (let d = 0.3; d < run; d += 0.6) K.rbox(R, M.iron, s + 0.13, yHi + 0.15 - (d / run) * (yHi - gl), d, s + 0.17, yHi + 0.98, d + 0.04, det);
    }
  };

  // ================= Physics North: the 1924 west front =================
  {
    // --- central colonnade range (10 bays of 4.3 m) ---
    const RG = K.run([uP, vP0], [uP, vP1]);      // podium face (flush with the pavilions)
    const RW = K.run([uR, vP0], [uR, vP1]);      // recessed upper wall behind the columns
    const L = RG.L, nb = 10, bw = L / nb; const cs = []; for (let i = 0; i < nb; i++) cs.push(bw * (i + 0.5));
    const doorBays = [9];
    const gOps = [];
    for (let i = 0; i < nb; i++) if (!doorBays.includes(i)) for (const dx of [-0.62, 0.62]) gOps.push({ s0: cs[i] + dx - 0.5, s1: cs[i] + dx + 0.5, y0: 2.75, y1: 5.75, mull: 1, muntins: 3 });
    const doors = doorBays.map((i) => ({ s0: cs[i] - 1.15, s1: cs[i] + 1.15, y0: FL, y1: FL + 4.1, sill: false }));
    podium(RG, 0, L, [...gOps, ...doors]);
    fillAll(RG, gOps);
    for (const i of doorBays) { doorway(RG, cs[i], FL); stoop(RG, cs[i], 2.6, FL); }
    // upper wall with paired windows and spandrels
    const uOps = []; for (const c of cs) for (const r of winRows(2.3)) uOps.push({ s0: c - 1.15, s1: c + 1.15, y0: r.y0, y1: r.y0 + r.h, mull: 1, tran: r.tran, muntins: r.muntins });
    K.wall(RW, W, 0, L, Y_SC1, Y_ENT, uOps, 0.45);
    fillAll(RW, uOps, { rev: 0.32 });
    for (const c of cs) spandrel(RW, c, 2.3);
    // giant order: nine engaged Ionic columns + antae at the pavilion junctions
    for (let i = 1; i < nb; i++) {
      const [u, v] = [uP + 0.5, vP0 + bw * i];
      K.box(S, u - 0.62, Y_SC1, v - 0.62, u + 0.62, Y_SC1 + 0.32, v + 0.62); // plinth block
      ionicColumn(K, S, u, Y_SC1 + 0.32, v, 0.92, Y_ENT - Y_SC1 - 0.32, { flutes: 0, seg: 20, rotV: 1 });
      colliders.push(K.colCyl(u, v, 0.5, Y_SC1 - 1, Y_ENT));
    }
    for (const v of [vP0, vP1 - 0.55]) K.box(S, uP, Y_SC1, v, uR + 0.05, Y_ENT, v + 0.55);
    // --- end pavilions ---
    for (const [a, b] of [[vN, vP0], [vP1, vS]]) {
      const R = K.run([uP, a], [uP, b]); const c = R.L / 2;
      const g = [{ s0: c - 1.6, s1: c + 1.6, y0: 2.9, y1: 5.65, mull: 2, muntins: 2 }];
      podium(R, 0, R.L, g); fillAll(R, g);
      const up = winRows(3.2, 2).map((r) => ({ s0: c - 1.6, s1: c + 1.6, y0: r.y0, y1: r.y0 + r.h, mull: 2, tran: r.tran, muntins: r.muntins }));
      K.wall(R, W, 0, R.L, Y_SC1, Y_ENT, up, 0.45); fillAll(R, up, { rev: 0.32 });
      spandrel(R, c, 3.2);
      for (const s of [0.45, R.L - 0.45]) { // corner pilasters with simple capitals
        K.rbox(R, S, s - 0.45, Y_SC1, -0.1, s + 0.45, Y_ENT - 0.45, 0.16);
        K.rbox(R, S, s - 0.55, Y_ENT - 0.45, -0.1, s + 0.55, Y_ENT, 0.24);
      }
      // returns of the pavilion toward the recessed colonnade wall
      const vv = a === vN ? b : a; const sgn = a === vN ? 1 : -1;
      K.box(W, uP, Y_SC1, Math.min(vv, vv + sgn * 0.01), uR + 0.3, Y_ENT, Math.max(vv, vv + sgn * 0.01));
      // pediment: tympanum, raking cornices and a short tile gable back into the hip roof
      const vm = (a + b) / 2, half = (b - a) / 2 + 0.55, rise = 1.75, y0p = Y_COR;
      const tri = new THREE.Shape(); tri.moveTo(a - 0.3, y0p); tri.lineTo(b + 0.3, y0p); tri.lineTo(vm, y0p + rise - 0.25); tri.lineTo(a - 0.3, y0p);
      const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false });
      tg.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, uP + 0.1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1)); K.add(S, tg);
      const rl = Math.hypot(half, rise), ra = Math.atan2(rise, half);
      for (const sg of [-1, 1]) { const gg = new THREE.BoxGeometry(1.05, 0.42, rl + 0.25); gg.rotateX(sg * ra); gg.translate(uP - 0.25, y0p + rise / 2 + 0.02, vm + sg * half / 2); K.add(S, gg); }
      K.gable(ROOF, uP - 0.5, a - 0.55, uP + 7.5, b + 0.55, y0p + 0.18, rise - 0.1, 'u', { overhang: 0.0 });
    }
    // continuous entablature along the whole west front
    entab(K.run([uP, vN], [uP, vS]), 0, vS - vN);
    // fill behind the entablature over the recess
    K.box(W, uP + 0.1, Y_ENT - 0.05, vP0, uR + 0.4, Y_COR - 0.3, vP1);
  }
  // --- north and south end elevations of the front range (rusticated base, pilastered upper floors) ---
  const endElev = (a, b, nb, doorS, doorY) => {
    const R = K.run(a, b); const L = R.L; const cs = cols(0.9, L - 0.9, nb);
    const ops = cs.map((c) => (doorS != null && Math.abs(c - doorS) < 1.5) ? null : { s0: c - 1.05, s1: c + 1.05, y0: 2.9, y1: 5.65, mull: 1, muntins: 2 }).filter(Boolean);
    const dOps = doorS != null ? [{ s0: doorS - 1.15, s1: doorS + 1.15, y0: doorY, y1: doorY + 3.8, sill: false }] : [];
    podium(R, 0, L, [...ops, ...dOps]); fillAll(R, ops);
    if (doorS != null) { doorway(R, doorS, doorY, 2.3, 3.8); stoop(R, doorS, 2.6, doorY); }
    const up = []; for (const c of cs) for (const r of winRows(2.1)) up.push({ s0: c - 1.05, s1: c + 1.05, y0: r.y0, y1: r.y0 + r.h, mull: 1, tran: r.tran, muntins: r.muntins });
    K.wall(R, W, 0, L, Y_SC1, Y_ENT, up, 0.45); fillAll(R, up, { rev: 0.32 });
    for (const c of cs) spandrel(R, c, 2.1);
    const bwid = (L - 1.8) / nb; for (let i = 0; i <= nb; i++) { const s = 0.9 + bwid * i; K.rbox(R, S, s - 0.4, Y_SC1, -0.1, s + 0.4, Y_ENT - 0.45, 0.14); K.rbox(R, S, s - 0.5, Y_ENT - 0.45, -0.1, s + 0.5, Y_ENT, 0.2); }
    entab(R, 0, L);
    return R;
  };
  endElev([-9.4, vN], [uP, vN], 6, 25.6 - 10.2, 2.95);       // north: door where the walk from Campbell arrives (u ≈ -19.6)
  endElev([uP, vS], [-18.7, vS], 4, null);                   // south end of the front range, facing Birge Hall
  // front-range core and the low hip roof (eaves ~19 m, ridge ~22 m)
  K.box(M.concreteDark, uR + 0.55, -1.5, vN + 0.6, -19.6, Y_COR - 0.3, vS - 0.6);
  K.hip(ROOF, uP - 0.45, vN - 0.45, -19.4, vS + 0.45, Y_COR - 0.05, 0.34);
  for (let v = vN + 2; v < vS - 2; v += 1.2) K.box(ROOF, -35.2 + (v % 2.4 ? 0 : 0), Y_COR, v, -34.95, Y_COR + 0.06, v + 0.05, det); // seam ends at the eave
  for (let v = -42; v < 6; v += 6.2) { // small glazed skylights on the west slope
    const g = new THREE.BoxGeometry(1.1, 0.12, 2.2); g.rotateZ(Math.atan(0.34)); g.translate(-30.6, 20.45, v); K.add(M.glass, g, { uvMode: 'keep' });
  }
  // north range behind (to u = -9.4) shares the entablature height; flat roof with parapet + rooftop lantern
  K.box(M.concreteDark, -19.7, -1.5, vN + 0.6, -9.9, Y_COR - 0.3, -34.0);
  K.box(M.concreteDark, -19.7, Y_COR - 0.35, vN + 0.3, -9.6, Y_COR + 0.05, -34.0);
  punchedBlock(K, -19.0, -34.0, -9.4, -13.0, { y0: -2.5, mat: W, frame: M.whitePaint, bay: 3.6, eave: 13.0, rows: [{ y0: 2.9, h: 2.6, w: 1.9, mull: 1, muntins: 2 }, { y0: 7.7, h: 2.6, w: 1.9, mull: 1, muntins: 2 }], faces: { W: false, N: false, S: false }, plinth: { h: Y_PL, mat: PL, out: 0.1 }, belt: [Y_SC0 + 0.2], cornice: { P: 0.5, H: 0.6, mat: S }, roof: { type: 'flat', parapet: 0.6 } });
  {
    const R = K.run([-9.4, -34.0], [-9.4, vN]); // east face of the north range (facing the service court)
    punched(K, R, 0, R.L, -1.5, Y_COR - 1.2, W, cols(0, R.L, 3, 0.8), [{ y0: 2.9, h: 2.6, w: 1.9, mull: 1, muntins: 2 }, { y0: 7.7, h: 2.9, w: 1.9, mull: 1, muntins: 2 }, { y0: 12.0, h: 2.9, w: 1.9, mull: 1, muntins: 2 }], { frame: M.whitePaint });
    K.mould(R, S, 0, R.L, corniceProfile(Y_COR, 0.5, 0.8));
  }
  // rooftop lantern (windowed penthouse) and mechanical box seen above the cornice
  K.box(W, -27.5, Y_COR + 1.2, -26.0, -24.0, Y_COR + 4.4, -20.0); K.box(S, -27.8, Y_COR + 4.4, -26.3, -23.7, Y_COR + 4.7, -19.7);
  for (const v of [-25.2, -23.0, -20.8]) K.box(M.windowNight, -27.56, Y_COR + 2.2, v - 0.5, -27.5, Y_COR + 3.8, v + 0.5);
  K.box(M.concreteDark, -27.0, Y_COR + 0.6, -6.0, -22.0, Y_COR + 3.0, 0.0);
  // connector between the wings (flat roof ~20 m) and its south face toward Birge Hall
  const plainRows = [{ y0: 2.9, h: 2.6, w: 1.9, mull: 1, muntins: 2 }, { y0: 7.7, h: 2.9, w: 1.9, mull: 1, muntins: 2 }, { y0: 12.0, h: 2.9, w: 1.9, mull: 1, muntins: 2 }, { y0: 16.2, h: 1.9, w: 1.9, mull: 1 }];
  const plainSpec = { y0: -2.5, mat: W, frame: M.whitePaint, bay: 3.8, rows: plainRows, plinth: { h: Y_PL, mat: PL, out: 0.1 }, belt: [Y_SC0 + 0.25], cornice: { P: 0.55, H: 0.7, mat: S } };
  punchedBlock(K, -19.0, -13.0, 4.8, 5.4, { ...plainSpec, eave: 19.4, faces: { W: false, E: false, S: false }, roof: { type: 'flat', parapet: 0.5 } });
  punchedBlock(K, -19.0, 5.4, -8.1, 10.0, { ...plainSpec, eave: 19.4, faces: { W: false, N: false }, roof: { type: 'flat', parapet: 0.5 } });
  { const R = K.run([-8.1, 5.4], [4.8, 5.4]); punched(K, R, 0, R.L, -1.5, 19.4, W, cols(0, R.L, 3, 0.8), plainRows, { frame: M.whitePaint }); K.mould(R, S, 0, R.L, corniceProfile(20.1, 0.55, 0.7)); }
  K.box(M.concreteDark, -12, 20.1, -8, -2, 21.4, 0); K.box(M.glass, -11.6, 21.4, -7.6, -2.4, 21.6, -0.4);

  // ================= Physics South: the 1950 east wing =================
  {
    const rows = [{ y0: 2.9, h: 2.5, w: 1.8, mull: 1, muntins: 2 }, { y0: 7.2, h: 2.5, w: 1.8, mull: 1, muntins: 2 }, { y0: 11.0, h: 2.5, w: 1.8, mull: 1, muntins: 2 }, { y0: 14.8, h: 2.4, w: 1.8, mull: 1, muntins: 2 }];
    const spec = { y0: -2.5, mat: W, frame: M.whitePaint, bay: 3.6, rows, plinth: { h: Y_PL + 0.6, mat: PL, out: 0.1 }, belt: [Y_SC0 - 0.3], cornice: { P: 0.6, H: 0.75, mat: S } };
    const runs = punchedBlock(K, 4.8, -13.0, 33.6, 46.1, { ...spec, eave: 19.0, roof: { type: 'flat', parapet: 0.4 } });
    K.hip(ROOF, 4.6, -3.5, 33.8, 38.5, 19.7, 0.37);
    // entrances: south (walk from South Drive), east (two, from Oppenheimer Way), west (court walk)
    const ent = (R, s) => {
      const gy = Math.max(0, K.g(...R.at(s, 1.5)));
      const y0 = Math.max(gy + 0.05, 0.3); const op = doorway(R, s, y0, 2.0, 3.0);
      stoop(R, s, 2.4, y0);
    };
    ent(runs.S, 16.4 - 4.8); ent(runs.E, 46.1 - 31.6); ent(runs.E, 46.1 - 0.1); ent(runs.W, 32.0 + 13.0);
  }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 26));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'physics-north-and-physics-south';
  return { object3d, colliders, walkables };
}
