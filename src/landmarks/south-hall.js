// South Hall (David Farquharson, 1873): the oldest building on the Berkeley campus and the sole survivor of the original
// university nucleus. Second Empire: red brick over a rusticated stone base, fluted cast-iron corner pilasters, bracketed
// cornice, mansard roof with banks of dormers, oeil-de-boeuf windows, iron cresting and many chimneys. The central block and
// the wings have separate roof forms (LiDAR: wing mansards ~18–19 m, central ~21 m). Entrance porch on the east with segmental
// arches and a balustrade with urn finials; stairs descend to the right and the left.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, corniceProfile, balustrade, urn, arcBand, mansard } from './lib/classic-kit.js';

export const info = {
  id: 'south-hall',
  name: 'South Hall',
  subtitle: 'David Farquharson · 1873',
  blurb: 'Completed in 1873 for the College of Agriculture, South Hall is the oldest building on campus and the only survivor of the original university buildings — a rare West Coast example of the Second Empire style, now home to the School of Information.',
  replaces: ['w/24024509', 'way/24024509'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.055);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const BR = M.brick, ST = M.graniteDark, SL = M.slate;
  // refine-central: the dressings read as warm sandstone-grey in photos, not bright white paint
  const TR = M.whitePaint.clone(); TR.color.set(0xc9bfae); TR.roughness = 0.75;
  // plan (calibrated to LiDAR): east wall, west walls (wings / projecting central block), north & south walls
  const uE = 9.0, uWw = -7.1, uWc = -8.1, vN = -22.55, vS = 23.75, vC0 = -11.95, vC1 = 13.05;
  const BASE = 3.9;            // main floor (top of the rusticated base)
  const CORN = 15.0;           // top of the bracketed cornice
  const colliders = [], walkables = [];
  const stories = (narrow) => [
    { y0: -1.2, y1: 0.6, mat: ST },
    { y0: 0.6, y1: BASE, win: { sill: 0.75, h: 2.0, w: 1.15, arch: 'seg', rise: 0.25, mull: 1 }, mat: ST, rustic: 0.47, rmat: ST },
    { y0: BASE, y1: 8.7, win: { sill: 0.9, h: 3.3, w: 1.2, arch: 'seg', rise: 0.3, mull: 1, tran: 0.72 }, mat: BR },
    { y0: 8.7, y1: 13.35, win: { sill: 0.85, h: 3.0, w: 1.2, arch: 'seg', rise: 0.3, mull: 1, tran: 0.72 }, mat: BR },
  ];
  // hood mouldings over the brick-storey windows + white cast-iron spandrel band between 1st and 2nd floors
  const trims = (R, s0, s1, nb) => {
    const bw = (s1 - s0) / nb;
    for (let i = 0; i < nb; i++) {
      const c = s0 + bw * (i + 0.5);
      for (const [y0, h] of [[BASE + 0.9, 3.3], [8.7 + 0.85, 3.0]]) {
        const top = y0 + h, w = 1.2, rise = 0.3; const Rr = (w * w / 4 + rise * rise) / (2 * rise);
        const a0 = Math.atan2(rise - Rr, w / 2) ;
        arcBand(K, R, TR, c, top - Rr, Rr + 0.02, Rr + 0.2, Math.PI / 2 - (Math.PI / 2 - Math.atan2(Rr - rise, w / 2)) - 0.12, Math.PI / 2 + (Math.PI / 2 - Math.atan2(Rr - rise, w / 2)) + 0.12, 0, 0.12, { detail: true });
        K.rbox(R, TR, c - 0.75, top - rise - 0.05, 0, c - 0.6, top - rise + 0.15, 0.14, { detail: true });
        K.rbox(R, TR, c + 0.6, top - rise - 0.05, 0, c + 0.75, top - rise + 0.15, 0.14, { detail: true });
        K.rbox(R, ST, c - 0.72, y0 - 0.14, 0, c + 0.72, y0, 0.12); // stone sill
        K.rbox(R, TR, c - 0.14, top - 0.12, 0, c + 0.14, top + 0.3, 0.17); // keystone
      }
      K.rbox(R, TR, c - 0.8, BASE - 0.05, 0, c + 0.8, BASE + 0.35, 0.08); // cast-iron spandrel panel
    }
    K.rbox(R, TR, s0, BASE - 0.12, 0, s1, BASE - 0.02, 0.18);         // water table / belt
    K.rbox(R, TR, s0, 8.62, 0, s1, 8.78, 0.1);
  };
  // bracketed cornice
  const cornice = (R, s0, s1, ret0 = true, ret1 = true) => {
    K.rbox(R, BR, s0, 13.35, -0.45, s1, 14.25, 0.0);
    K.rbox(R, TR, s0, 13.35, 0, s1, 13.6, 0.12);                      // architrave band
    K.rbox(R, TR, s0, 13.6, 0, s1, 14.25, 0.05);                       // frieze (cast-iron relief panels)
    K.mould(R, TR, s0, s1, [[0, 14.25], [0.25, 14.3], [0.25, 14.45], [0.8, 14.55], [0.85, 14.8], [0.85, 15.0], [0, 15.0]], { ret0, ret1 });
    for (let s = s0 + 0.35; s < s1 - 0.2; s += 0.7) K.rbox(R, TR, s - 0.09, 13.75, 0, s + 0.09, 14.45, 0.72, { detail: true }); // brackets
  };
  // fluted cast-iron pilaster at a corner / division (white)
  const pil = (R, s, w = 0.55) => {
    K.rbox(R, TR, s - w / 2, BASE, 0, s + w / 2, 13.35, 0.16);
    for (let k = -1; k <= 1; k++) K.rbox(R, M.lampGreen, s + k * w * 0.25 - 0.02, BASE + 0.6, 0.16, s + k * w * 0.25 + 0.02, 12.8, 0.17, { detail: true });
    K.rbox(R, TR, s - w / 2 - 0.06, 12.9, 0, s + w / 2 + 0.06, 13.35, 0.22);
    K.rbox(R, TR, s - w / 2 - 0.06, BASE, 0, s + w / 2 + 0.06, BASE + 0.3, 0.22);
  };
  const face = (a, b, nb, { skip = [], p0 = true, p1 = true, ret0 = true, ret1 = true } = {}) => {
    const R = K.run(a, b);
    K.bands(R, 0, R.L, nb, stories(), { skip, frame: TR, depth: 0.5 });
    trims(R, 0, R.L, nb); cornice(R, 0, R.L, ret0, ret1);
    if (p0) pil(R, 0.3); if (p1) pil(R, R.L - 0.3);
    return R;
  };
  // east façade (S→N): wings 3 bays, central block 7 bays (porch at centre)
  face([uE, vS], [uE, vC1], 3, { ret0: true, ret1: false });
  const REc = face([uE, vC1], [uE, vC0], 7, { skip: [3], ret0: false, ret1: false });
  face([uE, vC0], [uE, vN], 3, { ret0: false, ret1: true });
  // north / south ends (4 bays)
  face([uE, vN], [uWw, vN], 4);
  face([uWw, vS], [uE, vS], 4);
  // west façade (N→S): wings + projecting central block
  face([uWw, vN], [uWw, vC0], 3, { ret1: false });
  K.wall(K.run([uWw, vC0], [uWc, vC0], 0.015), BR, 0, uWw - uWc, -1.2, 13.35, [], 0.4); cornice(K.run([uWw, vC0], [uWc, vC0], 0.015), 0, uWw - uWc, false, false);
  const RWc = face([uWc, vC0], [uWc, vC1], 7, { skip: [3] });
  K.wall(K.run([uWc, vC1], [uWw, vC1], 0.015), BR, 0, uWw - uWc, -1.2, 13.35, [], 0.4); cornice(K.run([uWc, vC1], [uWw, vC1], 0.015), 0, uWw - uWc, false, false);
  face([uWw, vC1], [uWw, vS], 3, { ret0: false });
  // centre bays: doors (east main entrance at the main floor; west door at grade), windows above
  for (const [R, east] of [[REc, true], [RWc, false]]) {
    const bw = R.L / 7, c = bw * 3.5;
    const door = east ? { s0: c - 0.95, s1: c + 0.95, y0: BASE + 0.02, y1: BASE + 3.6, arch: 'seg', rise: 0.35, doorTop: BASE + 2.7, sill: false }
      : { s0: c - 0.8, s1: c + 0.8, y0: K.g(uWc - 1.5, (vC0 + vC1) / 2 + 0.6) + 0.45, y1: BASE - 0.4, arch: 'seg', rise: 0.25, doorTop: BASE - 1.0, sill: false };
    const up = { s0: c - 0.6, s1: c + 0.6, y0: 9.55, y1: 12.55, arch: 'seg', rise: 0.3 };
    const low = east ? { s0: c - 0.75, s1: c + 0.75, y0: 0.9, y1: 3.2, arch: 'seg', rise: 0.2, doorTop: 2.9, sill: false } : null;
    const base = east ? [low] : [door];
    K.wall(R, ST, c - bw / 2, c + bw / 2, -1.2, BASE, base, 0.5); K.rustic(R, c - bw / 2, c + bw / 2, 0.6, BASE, base, 0.47, ST);
    K.wall(R, BR, c - bw / 2, c + bw / 2, BASE, 13.35, east ? [door, up] : [up, { s0: c - 0.6, s1: c + 0.6, y0: BASE + 0.9, y1: BASE + 4.2, arch: 'seg', rise: 0.3 }], 0.5);
    if (east) { K.fill(R, door, { kind: 'door', rev: 0.4, frame: TR }); K.fill(R, low, { kind: 'door', rev: 0.4, frame: TR, door: M.glass }); }
    else { K.fill(R, door, { kind: 'door', rev: 0.4, frame: TR }); K.fill(R, { s0: c - 0.6, s1: c + 0.6, y0: BASE + 0.9, y1: BASE + 4.2, arch: 'seg', rise: 0.3 }, { frame: TR, rev: 0.4 }); }
    K.fill(R, up, { frame: TR, rev: 0.4, tran: [up.y0 + 2.2] });
  }
  // core
  K.box(M.concreteDark, uWw + 0.65, -1.2, vN + 0.65, uE - 0.65, CORN - 0.3, vS - 0.65);
  K.box(M.concreteDark, uWc + 0.65, -1.2, vC0 + 0.65, uWw + 0.7, CORN - 0.3, vC1 - 0.65);
  colliders.push(K.colPoly([[uWw, vN], [uE, vN], [uE, vS], [uWw, vS], [uWw, vC1], [uWc, vC1], [uWc, vC0], [uWw, vC0]], -2, 21));

  // ---------- mansard roofs: wings (~18.3/19 m) and the taller central block (~19.4/21 m) ----------
  const mIn = 0.95;
  const WK = 17.6;
  mansard(K, uWw + 0.05, vN + 0.05, uE - 0.05, vC0 + 0.6, CORN, WK, mIn, 19.0, SL, SL);
  mansard(K, uWw + 0.05, vC1 - 0.6, uE - 0.05, vS - 0.05, CORN, WK, mIn, 19.0, SL, SL);
  mansard(K, uWc + 0.05, vC0 - 1.2, uE - 0.05, vC1 + 1.2, CORN, 19.6, 1.15, 21.1, SL, SL);
  // iron cresting along the mansard curbs
  const crest = (u0, v0, u1, v1, y) => {
    for (const [a, b] of [[[u0, v0], [u1, v0]], [[u1, v0], [u1, v1]], [[u1, v1], [u0, v1]], [[u0, v1], [u0, v0]]]) {
      const R = K.run(a, b); K.rbox(R, M.iron, 0, y + 0.42, -0.03, R.L, y + 0.47, 0.03, { detail: true }); K.rbox(R, M.iron, 0, y, -0.04, R.L, y + 0.06, 0.04, { detail: true });
      for (let s = 0.25; s < R.L; s += 0.5) { K.rbox(R, M.iron, s - 0.015, y, -0.015, s + 0.015, y + 0.6, 0.015, { detail: true }); }
    }
  };
  crest(uWw + mIn, vN + mIn, uE - mIn, vC0 + 0.6 - mIn, WK);
  crest(uWw + mIn, vC1 - 0.6 + mIn, uE - mIn, vS - mIn, WK);
  crest(uWc + 1.2, vC0 - 1.2 + 1.2, uE - 1.2, vC1 + 1.2 - 1.2, 19.6);
  // dormers with segmental hoods on the steep slopes (one per bay); oeil-de-boeuf on the end faces
  const dormer = (R, s, round = false) => {
    const w = round ? 1.0 : 0.95, y0 = CORN + 0.35, y1 = round ? y0 + 1.0 : y0 + 1.75, d = -0.05;
    const o = round ? { s0: s - w / 2, s1: s + w / 2, y0: y0 + 0.1, y1: y0 + 0.1 + w, arch: true } : { s0: s - w / 2, s1: s + w / 2, y0, y1, arch: 'seg', rise: 0.2 };
    const RR = K.run(R.at(0, d), R.at(R.L, d));
    K.wall(RR, TR, s - w / 2 - 0.22, s + w / 2 + 0.22, CORN - 0.1, y1 + 0.25, [o], 0.18);
    K.fill(RR, o, { frame: TR, rev: 0.12, mull: round ? 0 : 1, sill: false });
    K.rbox(RR, SL, s - w / 2 - 0.22, CORN - 0.1, -1.4, s - w / 2 - 0.12, y1 + 0.2, -0.18);
    K.rbox(RR, SL, s + w / 2 + 0.12, CORN - 0.1, -1.4, s + w / 2 + 0.22, y1 + 0.2, -0.18);
    // segmental hood moulding
    const hw = w / 2 + 0.38, rise = 0.32, Rr = (hw * hw + rise * rise) / (2 * rise), ang = Math.asin(hw / Rr);
    arcBand(K, RR, TR, s, y1 + 0.3 - Rr, Rr, Rr + 0.16, Math.PI / 2 - ang, Math.PI / 2 + ang, 0, 0.22);
    K.rbox(RR, SL, s - hw, y1 + 0.2, -1.4, s + hw, y1 + 0.46, -0.05);
  };
  const dormerRow = (a, b, nb, rounds = []) => { const R = K.run(a, b); const bw = R.L / nb; for (let i = 0; i < nb; i++) dormer(R, bw * (i + 0.5), rounds.includes(i)); };
  dormerRow([uE, vS], [uE, vC1 + 1.2], 3); dormerRow([uE, vC1 + 1.2], [uE, vC0 - 1.2], 7, [3]); dormerRow([uE, vC0 - 1.2], [uE, vN], 3);
  dormerRow([uWw, vN], [uWw, vC0 - 1.2], 3); dormerRow([uWc, vC0 - 1.2], [uWc, vC1 + 1.2], 7, [3]); dormerRow([uWw, vC1 + 1.2], [uWw, vS], 3);
  dormerRow([uE, vN], [uWw, vN], 4, [1, 2]); dormerRow([uWw, vS], [uE, vS], 4, [1, 2]);
  // chimneys: exterior chimney breasts on the east façade at the wing/centre divisions, interior stacks and lab flues
  const chim = (u, v, w, d, y0, y1) => { K.box(BR, u - w / 2, y0, v - d / 2, u + w / 2, y1, v + d / 2); K.box(ST, u - w / 2 - 0.12, y1, v - d / 2 - 0.12, u + w / 2 + 0.12, y1 + 0.25, v + d / 2 + 0.12); for (const k of [-1, 1]) K.cyl(M.concreteDark, u + k * w * 0.22, y1 + 0.25, v, 0.12, 0.12, 0.45, 8, { detail: true }); };
  for (const v of [vC0 - 1.6, vC1 + 1.6]) chim(uE - 1.6, v, 1.1, 1.0, 17.0, 19.8);
  // interior stacks located from LiDAR peaks (~22.9 m)
  for (const [u, v] of [[-0.6, -3.6], [3.2, -6.2], [0.0, 5.8], [3.4, 7.0]]) chim(u, v, 1.1, 0.8, 17, 22.6);
  for (const [u, v] of [[-1.5, -17.5], [2.5, 17.8]]) chim(u, v, 0.9, 0.7, 17, 19.2);

  // ---------- east entrance porch ----------
  // [r5-audit-central] Rebuilt from photos (Commons "South Hall UC Berkeley", "South Hall - University of California,
  // Berkeley - DSC04888") + LiDAR: a solid painted-stone stair mass with three recessed panels (not a glazed arcade),
  // a landing at ~2.5 m above the walk (LiDAR +3.0, not the 3.9 m main floor, which made each flight ~6 m long),
  // two short flights parallel to the facade with raking turned-baluster balustrades, newel pedestals with urns, black
  // lanterns outboard, and the two-storey portico on the landing: panelled piers with pilasters carrying a round arch
  // over the arched doorway, an entablature, and a balustraded balcony with corner urns.
  {
    const pu0 = uE, pu1 = 13.6, pv0 = -2.6, pv1 = 3.7, gp = Math.min(K.g(pu1 + 2, 0.5), K.g(pu1 + 2, -5), K.g(pu1 + 2, 6)), top = Math.min(BASE, gp + 2.55);
    const cv = (pv0 + pv1) / 2, sw = 1.9, PNL = TR.clone(); PNL.color.offsetHSL(0, 0, -0.06);
    // solid stair mass under the landing + paving
    K.box(TR, pu0, -1.2, pv0, pu1, top - 0.02, pv1); K.box(TR, pu0 - 0.05, top - 0.25, pv0 - 0.1, pu1 + 0.1, top, pv1 + 0.1); K.box(M.paving, pu0, top, pv0, pu1, top + 0.02, pv1);
    // three recessed panels on the front (east) face + base course
    for (const [a, b] of [[pv0 + 0.35, pv0 + 1.35], [cv - 1.4, cv + 1.4], [pv1 - 1.35, pv1 - 0.35]]) { K.box(PNL, pu1, gp + 0.45, a, pu1 + 0.03, top - 0.55, b); for (const [y0, y1] of [[gp + 0.33, gp + 0.45], [top - 0.55, top - 0.43]]) K.box(TR, pu1, y0, a - 0.12, pu1 + 0.08, y1, b + 0.12); for (const vv of [a - 0.12, b]) K.box(TR, pu1, gp + 0.33, vv, pu1 + 0.08, top - 0.43, vv + 0.12); }
    K.box(TR, pu1 - 0.02, gp - 0.3, pv0 - 0.05, pu1 + 0.14, gp + 0.2, pv1 + 0.05);
    walkables.push(K.walkPoly([[pu0, pv0], [pu1, pv0], [pu1, pv1], [pu0, pv1]], top + 0.02));
    colliders.push(K.colPoly([[pu0, pv0], [pu1, pv0], [pu1, pv1], [pu0, pv1]], -1.2, top - 0.05));
    // landing balustrade along the front edge, corner pedestals with urns
    for (const [u, v] of [[pu1 - 0.3, pv0 + 0.3], [pu1 - 0.3, pv1 - 0.3]]) { K.box(TR, u - 0.3, top, v - 0.3, u + 0.3, top + 1.05, v + 0.3); K.box(TR, u - 0.35, top + 1.05, v - 0.35, u + 0.35, top + 1.13, v + 0.35); urn(K, TR, u, top + 1.13, v, 0.6); }
    balustrade(K, K.run([pu1 - 0.3, pv1 - 0.6], [pu1 - 0.3, pv0 + 0.6]), TR, 0, pv1 - pv0 - 1.2, top, 0.98);
    colliders.push(K.colPoly([[pu1 - 0.55, pv0], [pu1, pv0], [pu1, pv1], [pu1 - 0.55, pv1]], top, top + 1.1));
    // the two short flights descending north and south along the outer edge, with raking balustrades and newels
    const nN = Math.max(1, Math.round((top - K.g(pu1 - sw / 2, pv0 - 4)) / 0.165)), nS = Math.max(1, Math.round((top - K.g(pu1 - sw / 2, pv1 + 4)) / 0.165));
    const gN = top - nN * 0.165, gS = top - nS * 0.165;
    walkables.push(K.stairs(ST, pu1 - sw, pv0 - nN * 0.3, pu1, pv0, gN, top + 0.02, '+v', nN));
    walkables.push(K.stairs(ST, pu1 - sw, pv1, pu1, pv1 + nS * 0.3, gS, top + 0.02, '-v', nS));
    for (const [vFoot, vTop, g, sgn] of [[pv0 - nN * 0.3, pv0, gN, -1], [pv1 + nS * 0.3, pv1, gS, 1]]) {
      const uR = pu1 - 0.13, L = Math.abs(vTop - vFoot), H = top - g; // outer (east) edge rail
      // raking stringer wall under the balusters, sloped coping, turned balusters
      const nb = Math.max(2, Math.floor(L / 0.28));
      for (let i = 0; i < nb; i++) { const t = (i + 0.5) / nb, v = vFoot + (vTop - vFoot) * t, yb = g + H * t + 0.12;
        K.box(TR, uR - 0.13, -1.0, v - L / nb / 2, uR + 0.13, yb, v + L / nb / 2);
        K.lathe(TR, [[0.07, 0], [0.05, 0.06], [0.1, 0.25], [0.11, 0.36], [0.05, 0.55], [0.045, 0.6], [0.07, 0.66]], uR, yb, v, 6, { detail: true }); }
      const cap = new THREE.BoxGeometry(0.3, 0.12, Math.hypot(L, H) + 0.1); cap.rotateX(sgn * Math.atan2(H, L)); cap.translate(uR, g + H / 2 + 0.84, (vFoot + vTop) / 2); K.add(TR, cap);
      colliders.push(K.colPoly([[uR - 0.15, Math.min(vFoot, vTop)], [uR + 0.15, Math.min(vFoot, vTop)], [uR + 0.15, Math.max(vFoot, vTop)], [uR - 0.15, Math.max(vFoot, vTop)]], -1.0, top + 1.0));
      // newel pedestal + urn at the foot, black lantern outboard
      const vn = vFoot + sgn * 0.3; K.box(TR, uR - 0.25, g - 0.3, vn - 0.25, uR + 0.25, g + 1.2, vn + 0.25); K.box(PNL, uR - 0.27, g + 0.25, vn - 0.27, uR + 0.27, g + 0.95, vn + 0.27, { detail: true }); K.box(TR, uR - 0.31, g + 1.2, vn - 0.31, uR + 0.31, g + 1.28, vn + 0.31); urn(K, TR, uR, g + 1.28, vn, 0.75);
      colliders.push(K.colCyl(uR, vn, 0.42, g - 0.3, g + 1.8));
      const lv = vn + sgn * 1.0, lu = uR + 0.2, gl = K.g(lu, lv); const LM = M.blackPaint || M.iron;
      K.cyl(LM, lu, gl, lv, 0.14, 0.11, 0.45, 8, { detail: true }); K.cyl(LM, lu, gl + 0.45, lv, 0.06, 0.05, 2.25, 8, { detail: true });
      K.box(LM, lu - 0.2, gl + 2.7, lv - 0.2, lu + 0.2, gl + 2.75, lv + 0.2, { detail: true }); K.box(M.lampGlow, lu - 0.16, gl + 2.75, lv - 0.16, lu + 0.16, gl + 3.15, lv + 0.16, { detail: true }); K.cyl(LM, lu, gl + 3.15, lv, 0.26, 0.04, 0.25, 4, { detail: true });
    }
    // the portico on the landing: projecting 1.6 m from the brick face, ~4.6 m wide
    { const pf = pu0 + 1.6, w2 = 2.3, yA = top + 3.0, yE = top + 5.0, yD = top + 5.7;
      for (const sv of [-1, 1]) { const v = cv + sv * (w2 - 0.45);
        K.box(TR, pf - 0.9, top, v - 0.45, pf, yE, v + 0.45); // panelled pier
        K.box(PNL, pf, top + 0.4, v - 0.24, pf + 0.06, yA - 0.2, v + 0.24, { detail: true }); // applied pilaster
        K.box(TR, pf - 0.95, yA - 0.2, v - 0.5, pf + 0.08, yA, v + 0.5); }                   // impost
      // round arch between the piers (extruded ring segment), keystone
      const sh = new THREE.Shape(); const r0 = w2 - 0.9, r1 = r0 + 0.38; sh.absarc(0, 0, r1, 0, Math.PI, false); sh.lineTo(-r0, 0); sh.absarc(0, 0, r0, Math.PI, 0, true); sh.lineTo(r1, 0);
      const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.9, bevelEnabled: false, curveSegments: 12 }); ag.rotateY(Math.PI / 2); ag.translate(pf - 0.9, yA, cv); K.add(TR, ag);
      K.box(TR, pf - 0.05, yA + r0 - 0.05, cv - 0.22, pf + 0.1, yA + r1 + 0.12, cv + 0.22);
      { const sp = new THREE.Shape(); sp.moveTo(-r1, 0); sp.lineTo(-r1, yE - yA); sp.lineTo(r1, yE - yA); sp.lineTo(r1, 0); sp.absarc(0, 0, r1, 0, Math.PI, false); // spandrels over the arch
        const sg = new THREE.ExtrudeGeometry(sp, { depth: 0.9, bevelEnabled: false, curveSegments: 12 }); sg.rotateY(Math.PI / 2); sg.translate(pf - 0.9, yA, cv); K.add(TR, sg); }
      K.box(TR, pf - 0.95, yE, cv - w2 - 0.1, pf + 0.12, yE + 0.45, cv + w2 + 0.1);             // entablature
      K.box(TR, pf - 1.0, yE + 0.45, cv - w2 - 0.2, pf + 0.28, yE + 0.6, cv + w2 + 0.2);         // cornice
      K.box(TR, pu0, yE + 0.6, cv - w2, pf + 0.1, yD - 0.05, cv + w2); K.box(M.paving, pu0, yD - 0.05, cv - w2, pf + 0.1, yD, cv + w2); // balcony deck
      balustrade(K, K.run([pf - 0.15, cv + w2 - 0.4], [pf - 0.15, cv - w2 + 0.4]), TR, 0, 2 * w2 - 0.8, yD, 0.9);
      for (const sv of [-1, 1]) { const v = cv + sv * (w2 - 0.2); K.box(TR, pf - 0.45, yD, v - 0.22, pf + 0.05, yD + 1.0, v + 0.22); urn(K, TR, pf - 0.2, yD + 1.0, v, 0.6); }
      // arched doorway set back under the arch: timber doors + fanlight
      const DOOR = new THREE.MeshStandardMaterial({ color: 0x6b3226, roughness: 0.7 }), dw = 1.0;
      K.box(DOOR, pu0 + 0.02, top, cv - dw, pu0 + 0.1, top + 2.55, cv + dw);
      K.box(M.windowNight, pu0 + 0.02, top + 2.55, cv - dw - 0.05, pu0 + 0.09, top + 4.42, cv + dw + 0.05); // tall fanlight filling the arch
      for (const yy of [top + 2.55, top + 3.3]) K.box(TR, pu0 + 0.09, yy - 0.04, cv - dw, pu0 + 0.14, yy + 0.04, cv + dw, { detail: true });
      for (const dv of [-0.5, 0, 0.5]) K.box(TR, pu0 + 0.09, top + 2.55, cv + dv - 0.03, pu0 + 0.14, top + 4.4, cv + dv + 0.03, { detail: true });
      K.box(TR, pu0 + 0.03, top, cv - 0.04, pu0 + 0.12, top + 2.55, cv + 0.04, { detail: true });
      K.box(TR, pu0, top - 0.02, cv - w2, pf - 0.9, yE, cv - dw - 0.05); K.box(TR, pu0, top - 0.02, cv + dw + 0.05, pf - 0.9, yE, cv + w2); // reveal walls
      K.box(TR, pu0, top + 4.45, cv - dw, pf - 0.9, yE, cv + dw); // wall above the arch crown only (the arch now frames the doors + fanlight)
      colliders.push(K.colPoly([[pf - 0.9, cv - w2], [pf, cv - w2], [pf, cv - w2 + 0.9], [pf - 0.9, cv - w2 + 0.9]], top, yE), K.colPoly([[pf - 0.9, cv + w2 - 0.9], [pf, cv + w2 - 0.9], [pf, cv + w2], [pf - 0.9, cv + w2]], top, yE));
    }
    // west door: three steps up from the path
    const gw = K.g(uWc - 2.2, 1.1);
    walkables.push(K.stairs(ST, uWc - 1.4, -0.4, uWc, 2.6, gw, gw + 0.45, '+u', 3));
  }

  siteDress(K, ctx, [[uWw, vS], [uE, vS], [uE, vN], [uWw, vN]], { d: 1.0 });
  const object3d = K.finish();
  object3d.name = 'south-hall';
  return { object3d, colliders, walkables };
}
