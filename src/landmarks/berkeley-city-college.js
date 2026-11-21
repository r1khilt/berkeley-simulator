// Berkeley City College, 2050 Center Street (ELS Architecture, 2006): the Peralta district's seven-storey downtown
// campus. The Center Street front is broken into a honed-stone west block, a deep recessed entrance slot with
// butterfly canopies, a stainless portal and a tall glazed atrium screen, a four-storey terrace bay, and an east
// block whose stone podium carries a three-storey ribbon-glass lantern. An ochre stucco drum rises over the roof.
// Massing follows the 2021 LiDAR: main roof ~25.5 m, upper volumes 29-31 m, the entrance slot ~9.5 m.
import * as THREE from 'three';
import { Kit, tint, tintMul, rect, rectRuns, curtain, punched, gridOps, centres, ledges, sign, railing, parapet, panelMat } from './lib/b06a-kit.js';

export const info = {
  id: 'berkeley-city-college',
  name: 'Berkeley City College',
  subtitle: '2050 Center Street · 2006',
  blurb: 'One of the four Peralta Community Colleges, Berkeley City College (formerly Vista College) moved into this seven-storey building on Center Street in 2006, a block from Downtown Berkeley BART.',
  replaces: ['w/43001974'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.0);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const STONE = panelMat('bcc-trav7', { base: '#e8d9bd', joint: '#cdbd9f', cols: 2, rows: 4, vary: 0.015, noise: 0.03, jw: 1, span: 3, roughness: 0.6 }), STONED = panelMat('bcc-trav7-d', { base: '#ddcdb0', joint: '#c4b496', cols: 2, rows: 4, vary: 0.015, jw: 1, span: 3, roughness: 0.65 });
  const OCHRE = tintMul(M, 'stucco', 0.95, 0.74, 0.43), SILVER = tint(M, 'whitePaint', '#c8ccd0', { metalness: 0.65, roughness: 0.3 });
  const GLASS = tint(M, 'glass', '#8fb5b8', { metalness: 0.45, roughness: 0.03, envMapIntensity: 1.8 }), SPAN = tint(M, 'glass', '#a9c1c3', { metalness: 0.3, roughness: 0.15 });
  const DARK = tint(M, 'blackPaint', '#3c3f42'), WHITE = M.whitePaint;
  const colliders = [], walkables = [];
  const u0 = -33.3, u1 = 32.2, v0 = -20.4, v1 = 21.7, vS = 19.05, uS = 0.7;
  const G = 1.05, F = [G, 6.0, 9.3, 12.6, 15.9, 19.2, 22.5, 25.6], TOP = 25.8;
  const fl = (a, b) => F.slice(a, b + 1).slice(0, -1).map((y, i) => ({ y0: y, y1: F[a + i + 1] }));
  const RNw = (a, b) => K.run([b, v0], [a, v0]); // north-face run between u=a..b (s=0 at the east end)
  const bandsOf = (a, b) => F.slice(a, b).map((y, i) => ({ y: F[a + i + 1] - 0.55, h: 0.55, mat: SPAN })).concat(F.slice(a, b).map((y) => ({ y: y + 1.8, h: 0.05 })));
  const ribbon = (R, s0, s1, a, b, o = {}) => { curtain(K, R, s0, s1, F[a], F[b], { pitch: 1.5, recess: o.recess ?? 0.05, frame: SILVER, glass: GLASS, trans: bandsOf(a, b), mw: 0.05, md: 0.12 }); };
  // ---- foundation / core ----
  K.prism(M.concreteDark, [[u0, vS], [uS, vS], [uS, v1], [u1, v1], [u1, v0], [u0, v0]], -1.5, G);
  K.box(M.concreteDark, u0 + 0.6, G, v0 + 7.6, u1 - 0.6, TOP - 0.4, vS - 0.6);
  K.box(M.concreteDark, uS, G, vS - 1, u1 - 0.6, TOP - 0.4, v1 - 0.6);
  K.box(M.concreteDark, u0 + 0.6, F[1], v0 + 0.6, -16.0, F[4], v0 + 7.7); K.box(M.concreteDark, 0.5, F[1], v0 + 0.6, u1 - 0.6, F[4], v0 + 7.7); K.box(M.concreteDark, u0 + 0.6, F[4], v0 + 2.0, -16.0, TOP - 0.4, v0 + 7.7); K.box(M.concreteDark, 0.5, F[4], v0 + 2.0, u1 - 0.6, TOP - 0.4, v0 + 7.7);
  K.box(M.concreteDark, u0 + 0.6, G, v0 + 2.2, -16.0, F[1], v0 + 7.7); K.box(M.concreteDark, 0.5, G, v0 + 2.2, u1 - 0.6, F[1], v0 + 7.7);
  // ---- Center Street front (west → east: corner glass bay, stone-and-glass west block, entrance slot with curved
  //      ochre trays and butterfly canopy, stone pier stepping down at level 4, long east block) ----
  const VB = v0 + 1.5; const SL0 = -16.0, SL1 = -6.5, PE = 0.5;
  // base storey: recessed 1.5 m, ochre stucco panels over a 1.2 m travertine plinth, glazing in a few bays, steel band
  for (const [a, b] of [[u0 + 3.0, SL0], [PE, u1]]) { const R = K.run([b, VB], [a, VB]);
    K.rbox(R, STONE, 0, G - 1.2, -0.3, R.L, G + 1.2, 0.06);
    const ops = []; for (let q = 1.0; q + 5.0 < R.L; q += 10.0) ops.push({ s0: q, s1: q + 4.2, y0: G + 1.2, y1: F[1] - 0.7, mull: 2, tran: [G + 3.0] });
    punched(K, R, OCHRE, 0, R.L, G + 1.2, F[1], ops, { depth: 0.3, frame: SILVER, glass: GLASS });
    for (let q = 3.0; q < R.L - 1; q += 3.0) K.rbox(R, tintMul(M, 'stucco', 0.66, 0.5, 0.28), q - 0.03, G + 1.2, 0, q + 0.03, F[1] - 0.6, 0.02, { detail: true }); }
  K.rbox(K.run([u1, v0], [u0, v0]), SILVER, 0, F[1] - 0.5, -0.05, u1 - u0, F[1] - 0.05, 0.18);
  K.box(DARK, u0 + 3.0, F[1] - 0.05, v0, SL0, F[1] + 0.05, VB); K.box(DARK, PE, F[1] - 0.05, v0, u1, F[1] + 0.05, VB);
  for (const u of [-26.0, 9.0, 21.0]) { K.cyl(tint(M, 'concrete', '#a8a49c'), u, G, v0 + 0.8, 0.45, 0.45, F[1] - G, 18); colliders.push(K.colCyl(u, v0 + 0.8, 0.5, -1, F[1])); }
  // far-west narrow glass bay, ~1 m proud, from level 2 to level 5
  { const R = RNw(u0, u0 + 3.0); K.rbox(R, STONE, 0, G - 1.2, -0.3, R.L, F[1], 0); curtain(K, R, 0, R.L, F[1], F[5], { pitch: 0.75, recess: -0.9, frame: SILVER, glass: GLASS, trans: F.slice(2, 5) });
    K.box(M.concreteDark, u0, F[1], v0 - 0.8, u0 + 3.0, F[5], v0 + 0.1); K.box(SILVER, u0 - 0.02, F[1] - 0.15, v0 - 1.0, u0 + 3.05, F[1], v0); K.box(SILVER, u0 - 0.02, F[5], v0 - 1.0, u0 + 3.05, F[5] + 0.15, v0); K.rbox(R, STONE, 0, F[5], -0.3, R.L, TOP, 0); }
  // west block: blank travertine podium (levels 2-4), glass band (levels 5-7) set back 0.8 m wrapping the corner
  const lantern = (R, s0, s1) => { curtain(K, R, s0, s1, F[4] + 0.15, TOP, { pitch: 1.5, recess: 1.4, frame: SILVER, glass: GLASS, trans: bandsOf(4, 7), mw: 0.05, md: 0.12 }); K.rbox(R, SILVER, s0 - 0.1, TOP - 0.1, -1.45, s1 + 0.1, TOP + 0.12, -1.0); railing(K, R, s0 + 0.2, s1 - 0.2, TOP + 0.12, { d: -1.6, post: SILVER, h: 1.1 }); K.rbox(R, SILVER, s0, F[4] + 0.0, -1.5, s1, F[4] + 0.15, 0.05); };
  { const R = RNw(u0 + 3.0, SL0); K.rbox(R, STONE, 0, F[1], -0.35, R.L, F[4], 0); K.rbox(R, SILVER, -0.05, F[4], -0.35, R.L, F[4] + 0.15, 0.05); lantern(R, 0, R.L); }
  // entrance slot: recessed lobby, stainless portal, columns, curved ochre trays above, glazed atrium behind
  { const a = SL0, b = SL1, vb = v0 + 3.2;
    const Rb = K.run([b, vb], [a, vb]);
    curtain(K, Rb, 0, Rb.L, G, F[1] + 0.2, { pitch: 1.3, recess: 0.1, frame: SILVER, glass: GLASS, trans: [G + 4.0] });
    K.rbox(Rb, SILVER, 1.6, G, 0.0, Rb.L - 1.6, G + 4.0, 1.0); K.rbox(Rb, GLASS, 1.95, G, 1.0, Rb.L - 1.95, G + 3.65, 1.02);
    K.rbox(Rb, SILVER, Rb.L / 2 - 0.03, G, 1.02, Rb.L / 2 + 0.03, G + 3.65, 1.06, { detail: true }); sign(K, Rb, '2050', Rb.L / 2, G + 3.82, 0.26, { color: '#2e2e2e', d: 1.03 });
    for (const [ua, ub] of [[a, a + 0.4], [b - 0.4, b]]) K.box(STONE, ua, G, v0, ub, TOP, v0 + 5.2);
    for (const u of [a + 1.0, b - 1.0]) { K.cyl(tint(M, 'concrete', '#a8a49c'), u, G, v0 + 1.0, 0.45, 0.45, 6.3 - G, 18); colliders.push(K.colCyl(u, v0 + 1.0, 0.5, -1, 9)); }
    // butterfly canopy: two tilted standing-seam wings with thick stainless fascias, warm light strips, tube beam
    const CAN = tint(M, 'whitePaint', '#a7abad', { metalness: 0.2, roughness: 0.6 });
    for (const sg of [-1, 1]) { const w = sg > 0 ? 8.6 : 6.0, rz = sg > 0 ? 0.6 : 0.52; const g = new THREE.BoxGeometry(w, 0.85, 6.0); g.translate(sg * w / 2, 0, 0); g.rotateZ(sg * rz); g.translate((a + b) / 2, 6.3, v0 - 1.0); K.add(CAN, g);
      const f = new THREE.BoxGeometry(w, 0.88, 0.1); f.translate(sg * w / 2, 0, -3.02); f.rotateZ(sg * rz); f.translate((a + b) / 2, 6.3, v0 - 1.0); K.add(SILVER, f);
      for (let k = 0; k < 5; k++) { const l = new THREE.BoxGeometry(w * 0.85, 0.04, 0.14); l.translate(sg * w / 2, -0.44, -2.4 + k * 1.2); l.rotateZ(sg * rz); l.translate((a + b) / 2, 6.3, v0 - 1.0); K.add(M.lampGlow, l, { detail: true }); }
      for (let k = 0; k < 10; k++) { const sm = new THREE.BoxGeometry(0.04, 0.05, 6.0); sm.translate(sg * (0.4 + k * (w - 0.6) / 10), 0.44, 0); sm.rotateZ(sg * rz); sm.translate((a + b) / 2, 6.3, v0 - 1.0); K.add(SILVER, sm, { detail: true }); } }
    const beam = new THREE.CylinderGeometry(0.32, 0.32, b - a + 2.0, 16); beam.rotateZ(Math.PI / 2); beam.translate((a + b) / 2, 5.7, v0 - 1.2); K.add(SILVER, beam);
    // grey metal sign band with bronze letters across the slot head
    const Rs = K.run([b, v0 - 0.05], [a, v0 - 0.05]); K.rbox(Rs, tint(M, 'whitePaint', '#8c9094', { metalness: 0.5, roughness: 0.4 }), -0.3, 5.0, 0, Rs.L + 0.3, 5.9, 0.25); sign(K, Rs, 'BERKELEY CITY COLLEGE', Rs.L / 2, 5.45, 0.5, { color: '#b49a66', font: 'bold 76px Georgia', d: 0.27 });
    // glazed atrium only at the top of the slot, beside/behind the drum (truss visible through it)
    K.box(GLASS, a + 0.4, TOP + 2.9, v0 + 5.0, b - 0.4, TOP + 3.0, v0 + 12.0);
    walkables.push(K.walkPoly(rect(a, v0, b, vb), G)); }
  // stone pier east of the slot, stepping down at level 4/5 (~15.6 m) with glazing set back behind it
  { const a = SL1, b = PE; const R = RNw(a, b);
    K.rbox(R, STONE, 0, G - 1.2, -0.35, R.L, 15.6, 0); K.rbox(R, SILVER, -0.05, 15.45, -0.3, R.L + 0.05, 15.7, 0.08);
    K.box(STONE, a, G, v0, a + 0.35, 15.6, v0 + 6.9); K.box(M.paving, a, 15.6, v0 + 0.35, b, 15.62, v0 + 6.9); K.box(M.concreteDark, a + 0.35, G, v0 + 0.35, b, 15.6, v0 + 6.9);
    railing(K, R, 0.2, R.L - 0.2, 15.6, { d: -0.25, panel: M.glassLight, post: SILVER });
    const Ru = K.run([b, v0 + 6.9], [a, v0 + 6.9]); ribbon(Ru, 0, Ru.L, 4, 7); K.box(tint(M, 'stuccoWhite', '#e4e0d8'), a, 15.6, v0 + 8.6, b, TOP, v0 + 8.8);
    walkables.push(K.walkPoly(rect(a, v0, b, v0 + 6.9), 15.62)); }
  // long east block: travertine podium with horizontal strip windows (levels 2-4), glass band (levels 5-7)
  { const R = RNw(PE, u1);
    K.rbox(R, STONE, 0, F[1], -0.35, R.L, F[4], 0);
    K.rbox(R, SILVER, -0.05, F[4], -0.35, R.L, F[4] + 0.15, 0.05); lantern(R, 0, R.L); }
  // ochre drum rising over the roof behind the entrance (LiDAR ~31 m): mostly solid stucco, narrow window bands
  { const cu = -12.6, cv = v0 + 5.0 + 6.5, r = 6.5, y0 = F[1] + 0.2, y1 = 30.9;
    { const sp = new THREE.CylinderGeometry(r, r, y1 - y0, 48, 1, true, Math.PI * 0.5, Math.PI); sp.translate(cu, (y0 + y1) / 2, cv); K.add(OCHRE, sp); }
    for (const yb of [F[2] + 0.6, F[4] + 0.6, F[6] + 0.6]) for (const a0 of [Math.PI - 0.62, Math.PI + 0.02]) { const da = 0.6;
      const gl = new THREE.CylinderGeometry(r + 0.04, r + 0.04, 2.4, 12, 1, true, a0, da); gl.translate(cu, yb + 1.2, cv); K.add(GLASS, gl);
      for (let k = 0; k <= 4; k++) { const ang = a0 + da * k / 4; const x = cu + Math.sin(ang) * (r + 0.08), z = cv + Math.cos(ang) * (r + 0.08); K.box(SILVER, x - 0.05, yb, z - 0.05, x + 0.05, yb + 2.4, z + 0.05, { detail: true }); }
      const tr = new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.07, 12, 1, true, a0, da); tr.translate(cu, yb + 1.2, cv); K.add(SILVER, tr, { detail: true });
      const rv = new THREE.CylinderGeometry(r + 0.02, r + 0.02, 2.6, 12, 1, true, a0 - 0.03, da + 0.06); rv.translate(cu, yb + 1.2, cv); }
    const cap = new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.3, 48, 1, false, Math.PI * 0.5, Math.PI); cap.translate(cu, y1 + 0.15, cv); K.add(SILVER, cap);
    const core = new THREE.CylinderGeometry(r - 0.5, r - 0.5, y1 - y0, 48, 1, false, Math.PI * 0.5, Math.PI); core.translate(cu, (y0 + y1) / 2, cv); K.add(M.concreteDark, core); }
  // ---- side and rear façades (party walls against the garage and the YMCA below ~18 m) ----
  { const R = K.run([u1, v1], [u1, v0]); K.rbox(R, STONED, 0, G - 1.5, -0.3, R.L, 18.0, 0); ribbon(R, R.L - 14.0, R.L, 4, 7, { recess: 0.05 }); K.rbox(R, STONE, 0, 18.0, -0.3, R.L - 14.0, TOP, 0); K.rbox(R, STONE, R.L - 14.0, 18.0 - 0.01, -0.3, R.L, F[4], 0); }
  { const R = K.run([u0, v0], [u0, vS]); K.rbox(R, STONED, 0, G - 1.5, -0.3, R.L, 15.0, 0); punched(K, R, STONE, 0, R.L, 15.0, TOP, gridOps(centres(0, R.L, 3.2), fl(4, 7), { w: 1.6, h: 1.7, sill: 0.9, head: 0.3, mull: 1 }), { depth: 0.3, frame: SILVER, glass: GLASS }); }
  for (const [a, b, vv] of [[[u0, vS], [uS, vS]], [[uS, v1], [u1, v1]]].map(([p, q]) => [p, q, p[1]])) { const R = K.run(a, b); K.rbox(R, STONED, 0, G - 1.5, -0.3, R.L, 18.0, 0); punched(K, R, STONE, 0, R.L, 18.0, TOP, gridOps(centres(0, R.L, 3.0), [{ y0: 18.0, y1: 22.5 }, { y0: 22.5, y1: TOP }], { w: 1.6, h: 1.7, sill: 0.9, head: 0.3, mull: 1 }), { depth: 0.3, frame: SILVER, glass: GLASS }); }
  { const R = K.run([uS, vS], [uS, v1]); K.rbox(R, STONED, 0, G - 1.5, -0.3, R.L, TOP, 0); }
  // ---- roof: main deck at ~25.5, parapet coping; upper volumes; ochre drum ----
  K.box(tint(M, 'concrete', '#a9a7a2'), u0 + 0.3, TOP - 0.5, v0 + 6.0, u1 - 0.3, TOP - 0.25, vS - 0.3);
  K.box(tint(M, 'concrete', '#a9a7a2'), uS, TOP - 0.5, vS - 0.5, u1 - 0.3, TOP - 0.25, v1 - 0.3);
  K.box(tint(M, 'concrete', '#a9a7a2'), u0 + 0.3, TOP - 0.5, v0 + 0.3, -15.5, TOP - 0.25, v0 + 6.2); K.box(tint(M, 'concrete', '#a9a7a2'), 0, TOP - 0.5, v0 + 0.3, u1 - 0.3, TOP - 0.25, v0 + 6.2);
  // set-back upper storey behind the parapet (LiDAR ~29-30 m), glazed band, silver coping
  { const R = rectRuns(K, -18.0, -6.4, -3.7, 10.0); for (const f of ['E', 'S', 'W']) { const Rk = R[f]; K.wall(Rk, STONE, 0, Rk.L, TOP - 0.3, 29.4, [{ s0: 0.6, s1: Rk.L - 0.6, y0: 26.4, y1: 28.6 }], 0.3); curtain(K, Rk, 0.6, Rk.L - 0.6, 26.4, 28.6, { pitch: 1.5, recess: 0.2, frame: SILVER, glass: GLASS }); }
    K.box(M.concreteDark, -17.7, TOP - 0.3, -6.4, -4.0, 29.3, 9.7); K.box(SILVER, -18.1, 29.3, -6.4, -3.6, 29.5, 10.1); }
  { const R = rectRuns(K, -3.7, v0 + 6.9, 16.0, 10.0);
    for (const f of ['N', 'E', 'S', 'W']) { const Rk = R[f]; K.wall(Rk, STONE, 0, Rk.L, TOP - 0.3, 29.4, [{ s0: 0.6, s1: Rk.L - 0.6, y0: 26.4, y1: 28.6 }], 0.3); curtain(K, Rk, 0.6, Rk.L - 0.6, 26.4, 28.6, { pitch: 1.5, recess: 0.2, frame: SILVER, glass: GLASS }); }
    K.box(M.concreteDark, -3.4, TOP - 0.3, v0 + 7.2, 15.7, 29.3, 9.7); K.box(SILVER, -3.8, 29.3, v0 + 6.8, 16.1, 29.5, 10.1); }
  K.box(STONED, 24.0, TOP - 0.3, -8.0, 30.5, 28.0, 6.0); K.box(STONED, 22.0, TOP - 0.3, 15.5, 31.2, 28.6, 21.0);
  K.box(STONED, u0 + 3.0, TOP - 0.3, -8.0, -20.0, 29.0, 2.0);
  colliders.push(K.colPoly([[u0, vS], [uS, vS], [uS, v1], [u1, v1], [u1, v0], [0, v0], [0, v0 + 6.9], [-16.0, v0 + 6.9], [-16.0, v0], [u0, v0]], -1.5, TOP));
  colliders.push(K.colPoly(rect(-16.0, v0 + 6.5, -6.5, v0 + 6.9), -1.5, TOP));
  const object3d = K.finish();
  object3d.name = 'berkeley-city-college';
  return { object3d, colliders, walkables };
}
