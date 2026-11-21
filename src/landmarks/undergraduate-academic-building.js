// Undergraduate Academic Building (opened August 2026): UC Berkeley's first mass-timber building, on the old
// Dwinelle Annex site west of Dwinelle Hall. L-shaped plan: a five-storey classroom bar along Campanile Way
// (north) and a three-storey wing running south along the Dwinelle footpath, wrapping a landscaped courtyard that
// opens south-west. Off-white panel façades with tall narrow windows and vertical fins, a two-storey colonnade of
// slender white piers in front of timber galleries, and at the west end a framed box lifted on diagonal steel struts.
// The 2021 LiDAR predates construction, so heights come from photos (5 storeys ≈ 4.2 m floor-to-floor).
import * as THREE from 'three';
import { Kit, tint, tintMul, rectRuns, rect, curtain, punched, gridOps, centres, fins, ledges, railing, parapet, deck, strut, sign, panelMat } from './lib/b06a-kit.js';

export const info = {
  id: 'undergraduate-academic-building',
  name: 'Undergraduate Academic Building',
  subtitle: 'Mass timber · 2026',
  blurb: 'Opened for the fall 2026 semester, this five-storey hub of classrooms, a 400-seat auditorium and a rooftop terrace is the first mass-timber building on the Berkeley campus.',
  replaces: ['w/1460053154'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.2);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const PANEL = tintMul(M, 'stuccoWhite', 1.1, 1.04, 0.9), PANEL2 = tintMul(M, 'stuccoWhite', 1.02, 0.97, 0.85);
  const TIMBER = tintMul(M, 'wood', 3.5, 3.6, 3.3), CHAR = tint(M, 'blackPaint', '#3a3f44'), STRUT = tint(M, 'whitePaint', '#b8bcc0', { metalness: 0.35, roughness: 0.4 });
  const MESH = tint(M, 'glassLight', '#9a9d9c', { opacity: 0.5 }), RAILG = M.glassLight, GLASS = M.windowNight;
  const colliders = [], walkables = [];
  // levels
  const FL = 2.6, L = [2.6, 7.1, 11.3, 15.5, 19.7, 23.9], TOP = 24.9, WTOP = 16.5;
  // plan (building frame, u along Campanile Way toward the east, v toward the south)
  const bU0 = -26.9, bU1 = 22.9, bV0 = -19.15, bV1 = -2.67;   // five-storey bar
  const xU0 = -41.3;                                          // west box
  const wU0 = 7.0, wU1 = 23.0, wV1 = 38.16;                  // three-storey wing (south)

  // ---------- plinth (foundation into the slope; the west end meets the lawn at grade) ----------
  K.prism(M.concreteDark, rect(bU0, bV0, bU1, bV1), -1.5, FL - 0.02);
  K.prism(M.concreteDark, rect(wU0, bV1 - 0.1, wU1, wV1), -1.5, FL - 0.02);
  const FASCIA = (R0, s0, s1, yTop, { ov = 0.6, h = 1.0, back = 0.3 } = {}) => K.rbox(R0, PANEL, s0, yTop - h, -back, s1, yTop, ov);
  const winRow = (R0, s0, s1, st, pitch = 3.1) => { const cs = centres(s0, s1, pitch); const cols = []; const bw = (s1 - s0) / cs.length; for (const c of cs) cols.push(c - bw * 0.21, c + bw * 0.21);
    punched(K, R0, PANEL, s0, s1, st[0].y0, st[st.length - 1].y1, gridOps(cols, st, { w: 1.15, h: 2.65, sill: 0.65, head: 0.3, mull: 0 }), { depth: 0.38, frame: CHAR });
    fins(K, R0, PANEL2, cs.map((c) => c - bw / 2).concat([s1]).filter((x) => x > s0 + 0.2 && x < s1 - 0.2), st[0].y0, st[st.length - 1].y1, { w: 0.3, d: 0.22 }); };

  // ---------- five-storey bar ----------
  {
    const R = rectRuns(K, bU0, bV0, bU1, bV1);
    const ups = [{ y0: L[1], y1: L[2] }, { y0: L[2], y1: L[3] }, { y0: L[3], y1: L[4] }, { y0: L[4], y1: L[5] }];
    // NORTH (Campanile Way): glazed ground floor between cream piers, four storeys of punched windows, deep fascia
    {
      const Rn = R.N; const nb = 16; const bw = Rn.L / nb;
      curtain(K, Rn, 0, Rn.L, FL, L[1] - 0.5, { pitch: 1.55, recess: 0.35, frame: CHAR, trans: [FL + 3.1] });
      K.rbox(Rn, PANEL, 0, L[1] - 0.5, -0.3, Rn.L, L[1], 0.05);
      for (let i = 0; i <= nb; i += 2) K.rbox(Rn, PANEL, i * bw - 0.4, FL - 0.1, -0.3, i * bw + 0.4, L[1], 0.3);
      winRow(Rn, 0, Rn.L, ups, bw);
      FASCIA(Rn, -0.6, Rn.L + 0.6, TOP);
    }
    // EAST end
    { const Re = R.E; winRow(Re, 0, Re.L, [{ y0: FL, y1: L[1] }, ...ups], 3.3); FASCIA(Re, -0.6, Re.L, TOP); }
    // SOUTH (courtyard): two-storey colonnade of cream piers before a recessed timber-and-glass base; punched
    // windows above; top floor set back behind a glass-railed roof terrace.
    {
      const sEnd = wU0 - bU0; const Rs = K.run([bU0, bV1], [wU0, bV1]); const rec = 3.5;
      const Rr = K.run([bU0, bV1 - rec], [wU0, bV1 - rec]);
      curtain(K, Rr, 0, sEnd, FL, L[2], { pitch: 1.7, recess: 0.1, frame: TIMBER, trans: [L[1], FL + 3.0], mw: 0.16, md: 0.22 });
      K.box(TIMBER, bU0, L[1] - 0.5, bV1 - rec, wU0, L[1], bV1 - rec + 1.6);
      K.box(CHAR, bU0, L[1] - 0.5, bV1 - rec + 1.6, wU0, L[1] - 0.2, bV1 - rec + 1.68);
      railing(K, Rr, 0, sEnd, L[1], { d: 1.62, panel: MESH, post: CHAR });
      K.box(TIMBER, bU0, L[2] - 0.45, bV1 - rec, wU0, L[2] - 0.05, bV1);
      const nb = Math.round(sEnd / 3.4); const bw = sEnd / nb;
      for (let i = 0; i <= nb; i++) { const s = Math.min(sEnd - 0.4, Math.max(0.4, i * bw)); const p = Rs.at(s, 0);
        K.box(PANEL, p[0] - 0.38, FL, p[1] - 0.75, p[0] + 0.38, L[2], p[1]); colliders.push(K.colPoly(rect(p[0] - 0.38, p[1] - 0.75, p[0] + 0.38, p[1]), FL - 1, L[2]));
        K.box(TIMBER, p[0] - 0.15, L[2] - 0.75, bV1 - rec, p[0] + 0.15, L[2] - 0.4, bV1 - 0.7, { detail: true }); }
      K.rbox(Rs, PANEL, 0, L[2] - 0.7, -0.75, sEnd, L[2], 0.05);
      walkables.push(K.walkPoly(rect(bU0, bV1 - rec, wU0, bV1), FL));
      winRow(Rs, 0, sEnd, ups.slice(1, 3), bw);
      const sb = 3.0; const Rt = K.run([bU0, bV1 - sb], [bU1, bV1 - sb]);
      curtain(K, Rt, 0, Rt.L, L[4], L[5], { pitch: 1.7, recess: 0.1, frame: CHAR, trans: [L[4] + 2.6] });
      FASCIA(Rt, 0, Rt.L, TOP, { ov: 0.8 });
      K.box(M.paving, bU0, L[4] - 0.3, bV1 - sb, bU1, L[4] + 0.02, bV1);
      railing(K, Rs, 0.3, Rs.L - 0.3, L[4], { d: -0.15, panel: RAILG, post: CHAR, h: 1.1 });
      walkables.push(K.walkPoly(rect(bU0, bV1 - sb, bU1, bV1), L[4] + 0.02));
      const Rtw = K.run([wU0, bV1], [bU1, bV1]); railing(K, Rtw, 0.3, Rtw.L - 0.3, L[4], { d: -0.15, panel: RAILG, post: CHAR, h: 1.1 });
      winRow(Rtw, 0, Rtw.L, [{ y0: L[3], y1: L[4] }], 3.2);
    }
    K.box(M.concreteDark, bU0 + 0.5, FL, bV0 + 0.5, bU1 - 0.5, L[4] - 0.3, bV1 - 3.7);
    K.box(M.concreteDark, bU0 + 0.5, L[4], bV0 + 0.5, bU1 - 0.5, L[5], bV1 - 3.3);
    deck(K, tint(M, 'concrete', '#b9b7b1'), rect(bU0, bV0, bU1, bV1 - 3.0), TOP - 0.6, 0.3);
    parapet(K, PANEL, rect(bU0 - 0.05, bV0 - 0.3, bU1 + 0.3, bV1 - 2.7), L[5], TOP, { t: 0.4 });
    K.box(tint(M, 'concrete', '#c9c6bf'), -5, TOP - 0.6, -15.5, 12, TOP + 1.2, -9.5);
    colliders.push(K.colPoly(rect(bU0, bV0, bU1, bV1 - 3.4), -1, TOP));
  }

  // ---------- west box: lifted ~15 m on heavy square columns and a wide inverted-V strut pair ----------
  {
    const u0 = xU0, u1 = bU0, v0 = bV0, v1 = bV1, vm = (v0 + v1) / 2; const yb = 14.3; const TOP = 24.9;
    const BOX = panelMat('uab-box', { base: '#dedad0', joint: '#cbc7bd', cols: 2, rows: 1, vary: 0.02, noise: 0.02, jw: 2, span: 3, roughness: 0.55 });
    const BGL = tint(M, 'glass', '#1c2736', { metalness: 0.5, roughness: 0.04, envMapIntensity: 1.8 }); const FRM = tint(M, 'whitePaint', '#b9bec3', { metalness: 0.45, roughness: 0.35 }), FIN = tint(M, 'whitePaint', '#8e959c', { metalness: 0.3, roughness: 0.45 });
    const R = rectRuns(K, u0, v0, u1, v1);
    // west end face: one large glazed field (left ~60 %, top ~55 %) with three deep sunshade fins; solid right third
    { const Rw = R.W; const g = { s0: 0.9, s1: Rw.L - 2.5, y0: yb + 4.6, y1: TOP - 1.0 };
      K.wall(Rw, BOX, 0, Rw.L, yb + 0.6, TOP, [g], 0.6);
      curtain(K, Rw, g.s0, g.s1, g.y0, g.y1, { pitch: (g.s1 - g.s0) / 12, recess: 0.45, frame: CHAR, glass: BGL, trans: [g.y0 + (g.y1 - g.y0) / 3, g.y0 + 2 * (g.y1 - g.y0) / 3] });
      ledges(K, Rw, FIN, g.s0, g.s1, [g.y0 + (g.y1 - g.y0) / 3 + 0.05, g.y0 + 2 * (g.y1 - g.y0) / 3 + 0.05, g.y1], { d: 0.4, d0: -0.05, t: 0.12 });
      // thick light-grey metal perimeter frame returned around the end face and at its base
      K.rbox(Rw, FRM, -0.6, yb, 0, Rw.L + 0.6, yb + 0.6, 0.6); K.rbox(Rw, FRM, -0.6, yb + 0.6, 0, 0, TOP, 0.6); K.rbox(Rw, FRM, Rw.L, yb + 0.6, 0, Rw.L + 0.6, TOP, 0.6); K.rbox(Rw, FRM, -0.6, TOP - 0.6, 0, Rw.L + 0.6, TOP, 0.6); }
    K.rbox(R.N, BOX, 0, yb, -0.3, R.N.L, TOP, 0.0); K.rbox(R.N, FRM, 0, yb, 0, R.N.L, yb + 0.6, 0.12);
    { const Rk = R.S; K.rbox(Rk, BOX, 0, yb, -0.3, Rk.L, yb + 1.0, 0.0); const cs = centres(0.6, Rk.L - 0.6, 3.2);
      punched(K, Rk, BOX, 0, Rk.L, yb + 1.0, TOP, gridOps(cs, [{ y0: yb + 1.0, y1: yb + 5.0 }, { y0: yb + 5.0, y1: TOP - 0.4 }], { w: 1.2, h: 2.6, sill: 0.7, head: 0.3, mull: 0 }), { depth: 0.35, frame: CHAR, glass: BGL }); }
    K.box(tint(M, 'whitePaint', '#ecebe6'), u0, yb - 0.02, v0, u1, yb + 0.3, v1); // bright soffit
    K.box(M.concreteDark, u0 + 0.7, yb + 0.3, v0 + 0.7, u1, TOP - 0.6, v1 - 0.7);
    deck(K, tint(M, 'concrete', '#b9b7b1'), rect(u0 + 0.3, v0 + 0.3, u1, v1 - 0.3), TOP - 0.58, 0.3);
    // recessed floors under the box (~7 m back): light glass, timber floor edges, beige panels, sign band, pale doors
    const LGL = tint(M, 'glass', '#6d8798', { metalness: 0.3, roughness: 0.06 });
    const r0 = u0 + 9.5, FLw = Math.max(0.3, K.gMax(r0 - 1, v0, r0 + 1, v1, 4) + 0.15); const lv = [FLw, FLw + 4.6, FLw + 9.4, yb];
    const Rl = rectRuns(K, r0, v0 + 3.0, u1, v1 - 3.0);
    for (const Rk of [Rl.W, Rl.N, Rl.S]) curtain(K, Rk, 0, Rk.L, FLw, yb, { pitch: 1.5, recess: 0.0, frame: CHAR, glass: LGL, trans: [FLw + 3.4, lv[1], lv[2]] });
    for (const Rk of [Rl.N, Rl.S]) { K.rbox(Rk, PANEL, Rk.L - 3.0, FLw, 0.0, Rk.L, yb, 0.1); }
    for (const y of [lv[1], lv[2]]) { K.box(TIMBER, r0 - 1.4, y - 0.55, v0 + 1.0, u1, y, v1 - 1.0); const Rb = K.run([r0 - 1.4, v1 - 1.0], [r0 - 1.4, v0 + 1.0]); railing(K, Rb, 0, Rb.L, y, { d: 0, panel: RAILG, post: CHAR }); }
    { const Rk = Rl.W; for (let q = 0.2; q < Rk.L; q += 3.0) K.rbox(Rk, TIMBER, q - 0.2, FLw, 0, q + 0.2, yb, 0.4);
      K.rbox(Rk, PANEL, 0.4, lv[2] + 0.3, 0.02, 3.4, yb - 0.3, 0.1); K.rbox(Rk, PANEL, Rk.L - 3.4, lv[1] + 0.3, 0.02, Rk.L - 0.4, lv[2] - 0.6, 0.1);
      K.rbox(Rk, TIMBER, 0.4, FLw + 3.15, 0.4, Rk.L - 0.4, FLw + 4.0, 0.55); sign(K, Rk, 'UNDERGRADUATE ACADEMIC BUILDING', Rk.L / 2, FLw + 3.57, 0.44, { color: '#1a1714', d: 0.57 });
      for (const sc of [Rk.L / 2 - 2.2, Rk.L / 2 + 2.2]) K.rbox(Rk, tint(M, 'whitePaint', '#9a9a96'), sc - 0.95, FLw, 0.02, sc + 0.95, FLw + 2.45, 0.08); }
    K.box(M.concreteDark, r0 + 0.4, FLw, v0 + 3.4, u1, yb, v1 - 3.4);
    colliders.push(K.colPoly(rect(r0, v0 + 3.0, u1, v1 - 3.0), -1, yb));
    // structure: two heavy square columns set ~3 m back from the cantilevered end, an off-centre inverted V and a
    // crossing diagonal (lopsided K), two columns at the recessed line
    const gy = (u, v) => K.g(u, v) - 0.3; const cu0 = u0 + 0.5, cvs = [v0 + 0.5, v1 - 0.5];
    for (const v of cvs) { K.box(STRUT, cu0 - 0.3, gy(cu0, v), v - 0.3, cu0 + 0.3, yb, v + 0.3); colliders.push(K.colCyl(cu0, v, 0.45, -1, yb)); }
    for (const v of cvs) { K.box(STRUT, r0 - 0.7, gy(r0 - 0.35, v), v - 0.35, r0, yb, v + 0.35); colliders.push(K.colCyl(r0 - 0.35, v, 0.45, -1, yb)); }
    for (const v of cvs) strut(K, STRUT, [cu0 + 0.9, gy(cu0, v) + 0.6, v + (v < vm ? 0.6 : -0.6)], [cu0 + 0.9, yb - 0.05, vm + 1.8 + (v < vm ? -0.4 : 0.4)], 0.28, 4);
    walkables.push(K.walkPoly(rect(u0 - 0.6, v0 + 0.3, r0, v1 - 0.3), FLw - 0.12));
    const n = Math.max(2, Math.round((FL - FLw) / 0.16)); walkables.push(K.stairs(M.concrete, u1, bV1 - 3.4, u1 + 3.0, bV1, FLw, FL, '+u', n));
  }

  // ---------- three-storey wing (south) ----------
  {
    const R = rectRuns(K, wU0, bV1, wU1, wV1);
    // WEST (courtyard): giant-order cream piers (0.6 x 0.9 m, ~3.7 m centres) before a 3.4 m timber gallery;
    // glulam beams from each pier at every floor, CLT soffits, dark slab edges, mesh guardrails
    {
      const rec = 3.4; const Rw = K.run([wU0, bV1], [wU0, wV1]); const Rr = K.run([wU0 + rec, bV1], [wU0 + rec, wV1]);
      curtain(K, Rr, 0, Rr.L, FL, L[3], { pitch: 1.7, recess: 0.0, frame: CHAR, trans: [L[1], L[2], FL + 3.0] });
      for (const y of [L[1], L[2]]) { K.box(TIMBER, wU0 + 0.45, y - 0.3, bV1, wU0 + rec, y, wV1); K.box(CHAR, wU0 + 0.35, y - 0.27, bV1, wU0 + 0.45, y, wV1); railing(K, Rw, 0.5, Rw.L - 3.9, y, { d: -0.45, panel: MESH, post: CHAR }); }
      K.box(TIMBER, wU0, L[3] - 0.4, bV1, wU0 + rec, L[3], wV1);
      const nb = 11, bw = (Rw.L - 0.6) / nb;
      for (let i = 0; i <= nb; i++) { const s = 0.3 + i * bw; const p = Rw.at(s, 0);
        K.box(PANEL, p[0], FL, p[1] - 0.3, p[0] + 0.9, L[3], p[1] + 0.3); colliders.push(K.colPoly(rect(p[0], p[1] - 0.3, p[0] + 0.9, p[1] + 0.3), FL - 1, L[3]));
        for (const y of [L[1], L[2], L[3]]) K.box(TIMBER, p[0] + 0.9, y - 0.95, p[1] - 0.15, wU0 + rec, y - 0.3, p[1] + 0.15, { detail: true }); }
      FASCIA(Rw, -0.4, Rw.L + 0.4, WTOP, { ov: 0.4, h: 0.75, back: rec }); K.rbox(Rw, PANEL, -0.45, WTOP - 0.12, -rec, Rw.L + 0.45, WTOP, 0.5);
      walkables.push(K.walkPoly(rect(wU0, bV1, wU0 + rec, wV1), FL));
    }
    // EAST (footpath side)
    { const Re = K.run([wU1, wV1], [wU1, bV1]); winRow(Re, 0, Re.L, [{ y0: FL, y1: L[1] }, { y0: L[1], y1: L[2] }, { y0: L[2], y1: L[3] }], 3.4); FASCIA(Re, -0.4, Re.L + 0.0, WTOP, { ov: 0.4, h: 0.75 }); K.rbox(Re, PANEL, -0.45, WTOP - 0.12, -0.3, Re.L, WTOP, 0.5); }
    // SOUTH end: open gallery end bay (balcony at level 2), solid panel with lettering, recessed glazed bay with
    // slatted sunshades at each floor head, narrow solid end pier
    {
      const Rs = R.S; const e0 = 3.4, g0 = 7.2, g1 = Rs.L - 1.2;
      K.wall(Rs, PANEL, e0, Rs.L, FL - 0.1, WTOP - 0.75, [{ s0: g0, s1: g1, y0: FL, y1: L[3] - 0.1 }], 0.9);
      curtain(K, Rs, g0, g1, FL, L[3] - 0.1, { pitch: 1.5, recess: 0.6, frame: CHAR, trans: [L[1], L[2]] });
      for (const y of [L[1] - 0.2, L[2] - 0.2, L[3] - 0.25]) { K.rbox(Rs, CHAR, g0, y - 0.12, -0.6, g1, y, 1.1); for (let q = g0 + 0.3; q < g1; q += 0.45) K.rbox(Rs, CHAR, q - 0.03, y - 0.1, 0.0, q + 0.03, y - 0.02, 1.05, { detail: true }); }
      K.rbox(Rs, PANEL, e0 - 0.02, FL - 0.1, 0, g0, WTOP - 0.75, 0.15); K.rbox(Rs, PANEL, g1, FL - 0.1, 0, Rs.L, WTOP - 0.75, 0.15);
      sign(K, Rs, 'UNDERGRADUATE', (e0 + g0) / 2, FL + 2.75, 0.26, { color: '#2a2725', d: 0.17 }); sign(K, Rs, 'ACADEMIC BUILDING', (e0 + g0) / 2, FL + 2.4, 0.26, { color: '#2a2725', d: 0.17 });
      // open end bay: projecting balcony at level 2 with mesh guardrail
      K.rbox(Rs, TIMBER, 0.3, L[1] - 0.3, -0.2, e0, L[1], 1.4); K.rbox(Rs, CHAR, 0.3, L[1] - 0.32, 1.4, e0, L[1], 1.48); railing(K, Rs, 0.4, e0 - 0.1, L[1], { d: 1.4, panel: MESH, post: CHAR });
      FASCIA(Rs, -0.4, Rs.L + 0.4, WTOP, { ov: 0.4, h: 0.75 }); K.rbox(Rs, PANEL, -0.45, WTOP - 0.12, -0.3, Rs.L + 0.45, WTOP, 0.5);
    }
    K.box(M.concreteDark, wU0 + 3.7, FL, bV1, wU1 - 0.5, L[3] - 0.3, wV1 - 1.2);
    deck(K, tint(M, 'concrete', '#b9b7b1'), rect(wU0 + 0.2, bV1, wU1 - 0.2, wV1 - 0.2), WTOP - 0.6, 0.3);
    parapet(K, PANEL, rect(wU0 - 0.1, bV1 + 0.2, wU1 + 0.1, wV1 + 0.1), L[3], WTOP - 0.95, { t: 0.4 });
    colliders.push(K.colPoly(rect(wU0 + 3.6, bV1, wU1, wV1), -1, WTOP));
    // elevated mesh-railed bridge parallel to the colonnade, ~4 m out, on round concrete piers; stair at the corner
    const bu0 = wU0 - 7.0, bu1 = wU0 - 4.2, bv0 = 4.0, bv1 = wV1 - 1.0;
    K.box(M.concrete, bu0, FL - 0.32, bv0, bu1, FL, bv1); K.box(M.concrete, bu1, FL - 0.32, bv1 - 2.8, wU0, FL, bv1);
    for (let v = bv0 + 1; v < bv1; v += 6) { const gg = K.g((bu0 + bu1) / 2, v); K.cyl(M.concrete, (bu0 + bu1) / 2, gg - 0.5, v, 0.45, 0.45, FL - gg + 0.2, 14); }
    { const Rb = K.run([bu0, bv1], [bu0, bv0]); railing(K, Rb, 0, Rb.L, FL, { d: -0.05, panel: MESH, post: CHAR }); const Rb2 = K.run([bu1, bv0], [bu1, bv1 - 2.8]); railing(K, Rb2, 0, Rb2.L, FL, { d: -0.05, panel: MESH, post: CHAR }); }
    walkables.push(K.walkPoly(rect(bu0, bv0, bu1, bv1), FL)); walkables.push(K.walkPoly(rect(bu1, bv1 - 2.8, wU0, bv1), FL));
    const gs = K.gMin(wU0 - 1, wV1, wU0 + 3, wV1 + 4, 4); const n = Math.max(3, Math.round((FL - gs) / 0.155));
    walkables.push(K.stairs(M.concrete, wU0 + 0.3, wV1, wU0 + 3.1, wV1 + 0.3 * n, gs, FL, '-v', n));
  }

  const object3d = K.finish();
  object3d.name = 'undergraduate-academic-building';
  return { object3d, colliders, walkables };
}
