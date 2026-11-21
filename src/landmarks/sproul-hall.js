// Sproul Hall (Arthur Brown Jr., 1941). Neoclassical administration building: steel and concrete with granite facing,
// red tile hip roofs. The west front faces Upper Sproul Plaza: two end wings project toward the plaza, and between them
// a giant Ionic portico with a pediment rises over the broad terraced stairway — the Mario Savio Steps.
// Massing follows the 2021 LiDAR: wings ~13.5 m to the eaves (ridge ~16 m), central block eaves ~18 m with a ridge ~25.5 m,
// a lower two-storey section along the east side.
import * as THREE from 'three';
import { Kit, ionicColumn, classicBlock, corniceProfile, balustrade } from './lib/classic-kit.js';

export const info = {
  id: 'sproul-hall',
  name: 'Sproul Hall',
  subtitle: 'Arthur Brown Jr. · 1941',
  blurb: 'Named for UC president Robert Gordon Sproul, this neoclassical granite-faced building housed the campus administration. In 1964 Mario Savio spoke from its steps during the Free Speech Movement; they are now the Mario Savio Steps.',
  replaces: ['w/24025028', 'way/24025028'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-8.975);
  const K = new Kit(ctx, ANG); const M = ctx.M; const G = M.granite, GD = M.graniteDark, A = M.ashlar;
  const FL = 2.3; // ground-floor / terrace level
  const colliders = [], walkables = [];
  const plinth = { y0: -1.5, y1: FL + 0.3, mat: GD };
  // storeys
  const centralStories = [plinth,
    { y0: FL + 0.3, y1: 6.4, win: { sill: 0.9, h: 2.45, w: 1.5, mull: 1, tran: 0.75 }, mat: G, rustic: 0.55 },
    { y0: 6.4, y1: 10.2, win: { sill: 0.85, h: 2.5, w: 1.5, mull: 1, tran: 0.75 }, mat: A },
    { y0: 10.2, y1: 13.9, win: { sill: 0.85, h: 2.35, w: 1.5, mull: 1 }, mat: A },
    { y0: 13.9, y1: 17.0, win: { sill: 0.7, h: 1.75, w: 1.3, mull: 1 }, mat: A }];
  const wingStories = [plinth,
    { y0: FL + 0.3, y1: 6.4, win: { sill: 0.9, h: 2.45, w: 1.5, mull: 1, tran: 0.75 }, mat: G, rustic: 0.55 },
    { y0: 6.4, y1: 9.9, win: { sill: 0.85, h: 2.4, w: 1.5, mull: 1, tran: 0.75 }, mat: A },
    { y0: 9.9, y1: 12.7, win: { sill: 0.6, h: 1.75, w: 1.4, mull: 1 }, mat: A }];
  const eastStories = [plinth,
    { y0: FL + 0.3, y1: 5.5, win: { sill: 0.9, h: 2.2, w: 1.4, mull: 1 }, mat: A },
    { y0: 5.5, y1: 8.2, win: { sill: 0.6, h: 1.8, w: 1.4, mull: 1 }, mat: A }];
  const belt = (R, y = 6.4) => K.mould(R, G, 0, R.L, [[0, y - 0.15], [0.22, y - 0.1], [0.22, y + 0.12], [0, y + 0.17]]);

  // ---------- wings ----------
  const wW = -21.25, wN0 = -40.75, wN1 = -26.85, wS0 = 28.95, wS1 = 41.85;
  for (const [v0, v1, uE] of [[wN0, wN1, 16.3], [wS0, wS1, 16.8]]) {
    const north = v0 < 0;
    const runs = classicBlock(K, {
      u0: wW, u1: uE, v0, v1, y0: -1.5, eave: 13.55, stories: wingStories, bay: 3.75,
      faces: { [north ? 'S' : 'N']: { nb: 3, noRet1: north, noRet0: !north }, W: { nb: 4 } },
      cornice: { P: 0.6, H: 0.75 }, roof: { type: 'hip', slope: 0.4, overhang: 0.55 },
    });
    for (const R of Object.values(runs)) belt(R);
    // quoin strips at the west corners (plaza side)
    colliders.push(K.colPoly([[wW, v0], [uE, v0], [uE, v1], [wW, v1]], -2, 17));
  }
  // doorways where the north and south footpaths arrive (granite portal proud of the wall, recessed bronze doors)
  for (const [a0, b0, s] of [[[16.3, wN0], [wW, wN0], 16.3 + 3.6], [[wW, wS1], [16.8, wS1], -3.3 - wW]]) {
    const R = K.run(a0, b0); const y0 = FL; const w = 1.9, h = 3.2;
    const gl = (() => { const p = R.at(s, 1.5); return K.g(p[0], p[1]); })();
    K.rbox(R, G, s - w / 2 - 0.45, gl - 0.5, 0, s + w / 2 + 0.45, y0 + h + 0.55, 0.35);
    K.rbox(R, M.bronze, s - w / 2, y0, 0.3, s + w / 2, y0 + h - 0.6, 0.38);
    K.rbox(R, M.windowNight, s - w / 2, y0 + h - 0.55, 0.3, s + w / 2, y0 + h, 0.38);
    K.rbox(R, G, s - w / 2 - 0.6, y0 + h + 0.55, 0, s + w / 2 + 0.6, y0 + h + 0.85, 0.55);
    if (y0 - gl > 0.2) { const n = Math.round((y0 - gl) / 0.16); const p0 = R.at(s - w / 2 - 0.3, 0.35), p1 = R.at(s + w / 2 + 0.3, 0.35 + n * 0.32);
      const uu = [p0[0], p1[0]].sort((x, y) => x - y), vv = [p0[1], p1[1]].sort((x, y) => x - y);
      walkables.push(K.stairs(GD, uu[0], vv[0], uu[1], vv[1], gl, y0, a0[1] < 0 ? '+v' : '-v', n)); }
  }
  // ---------- central block (high hip roof) ----------
  const cW = -12.5, cE = 8.1, hN = -23.0, hS = 24.2, cN = wN1, cS = wS0;
  const pV0 = -6.5, pV1 = 8.6, pU = -15.1; // portico
  {
    // west façade split around the portico
    const RW = K.run([cW, cN], [cW, cS]);
    const sP0 = pV0 - cN, sP1 = pV1 - cN; // portico span along the run
    // bays: 5 each side, 5 behind the portico
    const side = (s0, s1) => { const nb = 5; const bw = (s1 - s0) / nb; const cs = []; for (let i = 0; i < nb; i++) cs.push(s0 + bw * (i + 0.5)); return cs; };
    const cs = [...side(0, sP0), ...side(sP1, RW.L)];
    for (const st of centralStories) {
      const ops = st.win ? cs.map((c) => ({ s0: c - st.win.w / 2, s1: c + st.win.w / 2, y0: st.y0 + st.win.sill, y1: Math.min(st.y1 - 0.25, st.y0 + st.win.sill + st.win.h) })) : [];
      K.wall(RW, st.mat, 0, sP0, st.y0, st.y1, ops.filter((o) => o.s1 < sP0), 0.45);
      K.wall(RW, st.mat, sP1, RW.L, st.y0, st.y1, ops.filter((o) => o.s0 > sP1), 0.45);
      for (const o of ops) K.fill(RW, o, { mull: 1, tran: st.win.tran ? [o.y0 + (o.y1 - o.y0) * st.win.tran] : [], rev: 0.35 });
      if (st.rustic) { K.rustic(RW, 0, sP0, st.y0, st.y1, ops.filter((o) => o.s1 < sP0), st.rustic, G); K.rustic(RW, sP1, RW.L, st.y0, st.y1, ops.filter((o) => o.s0 > sP1), st.rustic, G); }
    }
    belt(RW);
    K.rbox(RW, G, 0, 17.0, -0.4, RW.L, 17.25, 0.03);
    K.mould(RW, G, 0, RW.L, corniceProfile(18.0, 0.6, 0.75), { ret0: false, ret1: false });
    // balustrade along the roof terrace in front of the set-back upper storey
    balustrade(K, RW, G, 0.2, sP0 - 0.2, 18.0, 0.95, { d: -0.35 }); balustrade(K, RW, G, sP1 + 0.2, RW.L - 0.2, 18.0, 0.95, { d: -0.35 });
    // portico back wall: three tall entrance doorways at terrace level, windows above
    const bw = (sP1 - sP0) / 5; const pcs = []; for (let i = 0; i < 5; i++) pcs.push(sP0 + bw * (i + 0.5));
    const doors = [1, 2, 3].map((i) => ({ s0: pcs[i] - 0.95, s1: pcs[i] + 0.95, y0: FL + 0.02, y1: FL + 4.4, doorTop: FL + 3.0, sill: false }));
    const wins = [];
    for (const c of pcs) { wins.push({ s0: c - 0.75, s1: c + 0.75, y0: 7.2, y1: 9.6 }, { s0: c - 0.75, s1: c + 0.75, y0: 11.0, y1: 13.3 }); }
    for (const i of [0, 4]) wins.push({ s0: pcs[i] - 0.75, s1: pcs[i] + 0.75, y0: FL + 1.2, y1: FL + 3.6 });
    K.wall(RW, A, sP0, sP1, -1.5, 15.9, [...doors, ...wins], 0.5);
    for (const o of doors) { K.fill(RW, o, { kind: 'door', rev: 0.4, door: M.bronze }); K.rbox(RW, G, o.s0 - 0.3, o.y1, 0, o.s1 + 0.3, o.y1 + 0.35, 0.12); }
    for (const o of wins) K.fill(RW, o, { mull: 1, rev: 0.4 });
    // upper parts of the body's east, north and south faces (above the east section and the wings)
    for (const [aa, bb, y0] of [[[cE, cS], [cE, cN], 8.4], [[cE, cN], [cW, cN], 13.6], [[cW, cS], [cE, cS], 13.6]]) {
      const R = K.run(aa, bb);
      const st = centralStories.filter((x) => x.y1 > y0 + 1).map((x) => ({ ...x, y0: Math.max(x.y0, y0), rustic: 0, win: x.win && x.y0 >= y0 - 0.01 ? x.win : null }));
      K.bands(R, 0, R.L, Math.max(2, Math.round(R.L / 3.8)), st, { depth: 0.45 });
      K.rbox(R, G, 0, 17.0, -0.4, R.L, 17.25, 0.03);
      K.mould(R, G, 0, R.L, corniceProfile(18.0, 0.6, 0.75));
    }
    // four-storey body: core + flat roof terrace at the main cornice
    K.box(M.concreteDark, cW + 0.65, -1.5, cN + 0.65, cE - 0.65, 17.9, cS - 0.65);
    K.box(M.concreteDark, cW - 0.1, 17.9, cN, cE, 18.02, cS);
    // set-back upper storey with the high red-tile hip roof (LiDAR: eaves ~20.5 m, ridge ~25.8 m)
    classicBlock(K, { u0: -9.6, u1: 7.2, v0: hN, v1: hS, y0: 17.5, eave: 20.3,
      stories: [{ y0: 18.0, y1: 19.75, win: { sill: 0.35, h: 1.1, w: 1.1, mull: 1, noSill: true }, mat: A }], bay: 3.6,
      cornice: { P: 0.45, H: 0.55, frieze: 0.0 }, roof: { type: 'hip', slope: 0.62, overhang: 0.55 } });
    colliders.push(K.colPoly([[cW, cN], [cE, cN], [cE, cS], [cW, cS]], -2, 26));
  }
  // ---------- east section (two storeys, flat roof) ----------
  {
    const runs = classicBlock(K, { u0: cE - 0.3, u1: 18.1, v0: cN, v1: cS, y0: -1.5, eave: 8.6, stories: eastStories, bay: 3.8,
      faces: { W: false, N: false, S: false, E: { nb: 15 } }, cornice: { P: 0.45, H: 0.45, frieze: 0.3 }, roof: { type: 'flat', parapet: 0.0 } });
    colliders.push(K.colPoly([[cE, cN], [18.1, cN], [18.1, cS], [cE, cS]], -2, 9));
  }

  // ---------- portico: six giant Ionic columns, entablature, pediment ----------
  {
    const D = 1.3, colH = 15.9 - FL;
    const vc = [0, 1, 2, 3, 4, 5].map((k) => (pV0 + pV1) / 2 + (k - 2.5) * 2.7);
    for (const v of vc) { ionicColumn(K, G, pU + 0.85, FL, v, D, colH, { flutes: 24, rotV: 1 }); colliders.push(K.colCyl(pU + 0.85, v, D * 0.62, FL - 1, 16)); }
    // pilaster responds on the back wall
    for (const v of [vc[0], vc[5]]) K.box(G, cW - 0.35, FL, v - 0.6, cW, 15.9, v + 0.6);
    // entablature (architrave, frieze, cornice) wrapping the portico front and returns
    K.box(G, pU - 0.05, 15.9, pV0 - 0.05, cW, 16.75, pV1 + 0.05);
    K.box(G, pU + 0.05, 16.75, pV0 + 0.05, cW, 17.35, pV1 - 0.05);
    const RF = K.run([pU + 0.05, pV0 + 0.05], [pU + 0.05, pV1 - 0.05]); // west-facing front (N→S)
    K.mould(RF, G, 0, RF.L, corniceProfile(18.0, 0.45, 0.65));
    for (const [a, b] of [[[cW, pV0 + 0.05], [pU + 0.05, pV0 + 0.05]], [[pU + 0.05, pV1 - 0.05], [cW, pV1 - 0.05]]]) { const R = K.run(a, b); K.mould(R, G, 0, R.L, corniceProfile(18.0, 0.45, 0.65), { ret0: false, ret1: true }); }
    K.box(G, pU + 0.6, 15.4, pV0 + 0.3, cW, 15.9, pV1 - 0.3); // coffered ceiling slab
    for (let i = 1; i < 5; i++) K.box(G, pU + 0.6, 15.15, vc[i] - 0.18, cW, 15.4, vc[i] + 0.18, { detail: true });
    // pediment: tympanum + raking cornices + tile roof running back to the main block
    const apex = 20.3, vm = (pV0 + pV1) / 2, half = (pV1 - pV0) / 2 + 0.75, eaveP = 18.0;
    const tri = new THREE.Shape(); tri.moveTo(pV0 - 0.0, eaveP); tri.lineTo(pV1, eaveP); tri.lineTo(vm, apex - 0.3); tri.lineTo(pV0, eaveP);
    const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.6, bevelEnabled: false }); // tympanum in (v,y), extrude along +z → u
    tg.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, pU + 0.75, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    K.add(A, tg);
    // raking cornice (sloped boxes)
    const rl = Math.hypot(half, apex - eaveP), ra = Math.atan2(apex - eaveP, half);
    for (const sgn of [-1, 1]) {
      const g = new THREE.BoxGeometry(1.0, 0.55, rl + 0.3); g.rotateX(sgn * ra); g.translate(pU + 0.45, (eaveP + apex) / 2 + 0.05, vm + sgn * half / 2);
      K.add(G, g);
    }
    // pediment roof (tile) back to the main wall
    K.gable(M.redTile, pU - 0.1, pV0 - 0.75, cW + 1.5, pV1 + 0.75, eaveP + 0.25, apex - eaveP - 0.1, 'u', { overhang: 0.0 });
  }

  // ---------- terrace and the Mario Savio Steps ----------
  {
    const tU0 = -20.4, sU0 = -27.7, tV0 = -13.6, tV1 = 15.6;
    const gPlaza = Math.min(K.g(sU0 - 0.5, tV0 + 2), K.g(sU0 - 0.5, (tV0 + tV1) / 2), K.g(sU0 - 0.5, tV1 - 2));
    // terrace slab (in front of the portico, between the wings)
    K.box(GD, tU0, -1.5, tV0, cW, FL, tV1);
    K.box(M.paving, tU0, FL, tV0, cW, FL + 0.02, tV1);
    walkables.push(K.walkPoly([[tU0, tV0], [cW, tV0], [cW, tV1], [tU0, tV1]], FL + 0.02));
    // broad stair down to the plaza (west)
    const n = Math.max(3, Math.round((FL + 0.02 - gPlaza) / 0.15));
    walkables.push(K.stairs(GD, sU0, tV0, tU0, tV1, gPlaza, FL + 0.02, '+u', n));
    // granite cheek walls at both ends of the steps and terrace, with low parapets
    for (const [v0, v1] of [[tV0 - 0.7, tV0], [tV1, tV1 + 0.7]]) {
      K.box(GD, sU0, -1.5, v0, cW, FL + 0.95, v1);
      K.box(G, sU0 - 0.05, FL + 0.95, v0 - 0.05, cW, FL + 1.1, v1 + 0.05);
      colliders.push(K.colPoly([[sU0, v0], [cW, v0], [cW, v1], [sU0, v1]], -1.5, FL + 1.1));
    }
    // bronze "Mario Savio Steps" marker disc at the top of the steps
    K.cyl(M.bronze, tU0 + 0.8, FL + 0.02, (tV0 + tV1) / 2 + 3, 0.18, 0.18, 0.012, 20, { detail: true });
    // lamp standards flanking the stair
    for (const v of [tV0 + 0.3, tV1 - 0.3]) { K.cyl(M.iron, tU0 - 0.2, FL + 1.1, v, 0.09, 0.07, 3.2, 8, { detail: true }); K.lathe(M.lampGlow, [[0.05, 0], [0.22, 0.15], [0.24, 0.5], [0.12, 0.7], [0.001, 0.75]], tU0 - 0.2, FL + 4.3, v, 10, { detail: true }); }
  }

  const object3d = K.finish();
  object3d.name = 'sproul-hall';
  return { object3d, colliders, walkables };
}
