// Connie & Kevin Chou Hall (Haas School of Business North Academic Building, opened 2017). A pale limestone-clad, six-storey
// block on a boomerang plan: the long west façade toward Piedmont Avenue is a flush stone wall cut by tall vertical slot
// windows; the gently kinked courtyard (south) façade is a grid of slim stone piers filled with horizontal aluminium
// sunshade louvers over an arcaded glazed ground floor; the top floor is a set-back glass pavilion with a wraparound
// terrace under a thin floating roof slab.
// Massing follows the 2021 LiDAR: main roof ~28 m, terrace (5th-floor roof) ~23.3 m; the site falls ~5 m to the west.
import * as THREE from 'three';
import { Kit, mats, openWall, curtain, outward, insetPoly, simplify, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'chou-hall-north-academic-building',
  name: 'Chou Hall',
  subtitle: 'Haas School of Business · 2017',
  blurb: 'Connie & Kevin Chou Hall, the Haas School of Business\'s North Academic Building, opened in 2017 with classrooms, study space and a rooftop terrace; it was designed as a zero-waste, LEED Platinum building.',
  replaces: ['w/431329214'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M; const X = mats(M);
  const ST = X.limestone, BASE = new THREE.MeshStandardMaterial({ color: 0xa9a398, roughness: 0.85, map: M.granite.map });
  const LOU = new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.4, metalness: 0.6 });
  const GL = new THREE.MeshStandardMaterial({ color: 0x4c6578, roughness: 0.06, metalness: 0.3, envMapIntensity: 1.2 });
  const AL = X.alu, DK = X.frameDark;
  const colliders = [], walkables = [];
  const poly = outward(simplify(ctx.footprints[0].outer.map(([x, z]) => [x, z]), 1.0, 0.05));
  let gMin = Infinity; for (const [x, z] of poly) gMin = Math.min(gMin, ctx.groundAt(x, z)); const base = gMin - 1.2;
  const T5 = 23.3, TOP = 28.0, F1 = 5.0, FH = 4.1;
  // façades per edge
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); const L = R.L; if (L < 0.8) continue;
    let gs = Infinity; for (let k = 0; k <= 4; k++) { const p = R.at(L * k / 4, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const g0 = Math.max(gs, T5 - F1 - 4 * FH - 0.0); // ground floor level for this face (stepping site)
    const n = R.n; const style = (n[0] < -0.5 && -n[0] > n[1] * 0.9) ? 'west' : n[1] > 0.55 ? 'court' : 'punch';
    const yB = g0 + F1; // top of the glazed/stone base
    // ground floor: glazed storefront (recessed arcade on the courtyard), dark stone elsewhere with punched windows
    if (style === 'court') {
      K.rbox(R, GL, 0.2, g0, -2.2, L - 0.2, yB - 0.4, -2.15); for (let s = 0.2; s <= L - 0.2; s += 1.5) K.rbox(R, AL, s - 0.04, g0, -2.15, s + 0.04, yB - 0.4, -2.05, { detail: true });
      K.rbox(R, M.paving, 0, g0 - 0.3, -2.2, L, g0 + 0.02, 0);
      const np = Math.max(1, Math.round(L / 3.1)); for (let k = 0; k <= np; k++) { const s = Math.min(L - 0.3, Math.max(0.3, L * k / np)); K.rbox(R, ST, s - 0.3, base, -2.2, s + 0.3, yB, 0.1); }
      K.rbox(R, ST, 0, yB - 0.5, -2.2, L, yB, 0.1);
    } else {
      const ops = []; const nw = Math.max(1, Math.round(L / 3.4)); for (let k = 0; k < nw; k++) { const c = L * (k + 0.5) / nw; ops.push({ s0: c - 0.6, s1: c + 0.6, y0: g0 + 1.0, y1: g0 + 3.6, mull: 0, frame: DK, sill: false }); }
      openWall(K, R, BASE, 0, L, base, yB, ops, { depth: 0.45, rev: 0.25, frame: DK, sill: false });
    }
    // floors 2–5 (up to the terrace level)
    if (style === 'court') {
      const np = Math.max(1, Math.round(L / 3.1)); const bw = L / np;
      K.wall(R, ST, 0, L, yB, T5 + 1.1, [{ s0: 0.3, s1: L - 0.3, y0: yB + 0.6, y1: T5 - 0.4 }], 0.4);
      for (let k = 0; k <= np; k++) { const s = Math.min(L - 0.3, Math.max(0.3, bw * k)); K.rbox(R, ST, s - 0.3, yB, -0.4, s + 0.3, T5 + 1.1, 0.25); }
      for (let f = 0; f < 4; f++) { const fy = yB + f * FH; K.rbox(R, ST, 0.3, fy, -0.35, L - 0.3, fy + 0.6, 0.12);
        K.rbox(R, GL, 0.3, fy + 0.6, -0.32, L - 0.3, fy + FH, -0.3);
        for (let y = fy + 1.9; y < fy + FH - 0.1; y += 0.22) K.rbox(R, LOU, 0.3, y - 0.025, -0.28, L - 0.3, y + 0.025, -0.03, { detail: y > fy + 2.4 }); }
    } else if (style === 'west') {
      const ns = Math.max(1, Math.round(L / 4.0)); const ops = [];
      for (let k = 0; k < ns; k++) { const c = L * (k + 0.5) / ns + (k % 2 ? -0.7 : 0.7); ops.push({ s0: c - 0.45, s1: c + 0.45, y0: yB + 0.8, y1: T5 - 0.6, noFill: true }); }
      openWall(K, R, ST, 0, L, yB, T5 + 1.1, ops, { depth: 0.4 });
      for (const o of ops) { K.rbox(R, GL, o.s0, o.y0, -0.32, o.s1, o.y1, -0.3); for (let f = 1; f < 4; f++) K.rbox(R, ST, o.s0, yB + f * FH - 0.4, -0.3, o.s1, yB + f * FH + 0.4, -0.05); for (const s of [o.s0 - 0.3, o.s1]) K.rbox(R, ST, s, o.y0 - 0.3, 0, s + 0.3, o.y1 + 0.3, 0.25); }
    } else {
      const nw = Math.max(1, Math.round(L / 3.2)); const ops = [];
      for (let f = 0; f < 4; f++) for (let k = 0; k < nw; k++) { const c = L * (k + 0.5) / nw; ops.push({ s0: c - 0.7, s1: c + 0.7, y0: yB + f * FH + 0.9, y1: yB + f * FH + 3.2, mull: 0, frame: DK, sill: false }); }
      openWall(K, R, ST, 0, L, yB, T5 + 1.1, ops, { depth: 0.4, rev: 0.25, frame: DK, sill: false });
    }
    K.rbox(R, ST, -0.05, T5 + 0.95, -0.42, L + 0.05, T5 + 1.1, 0.08);
    // glass guardrail at the terrace edge
    K.rbox(R, M.glassLight, 0, T5 + 1.1, -0.3, L, T5 + 2.2, -0.26, { detail: true });
  }
  // core + terrace slab
  const inner = insetPoly(poly, 0.45);
  K.prism(M.concreteDark, inner, base, T5 + 0.9);
  K.prism(M.paving, inner, T5 + 0.9, T5 + 1.0);
  // set-back glass pavilion on top + thin floating roof slab + mechanical screen
  const pav = insetPoly(poly, 3.2);
  K.prism(M.concreteDark, insetPoly(poly, 3.5), T5 + 1.0, TOP - 0.6);
  for (let i = 0; i < pav.length; i++) {
    const a = pav[i], b = pav[(i + 1) % pav.length]; const R = K.run(a, b); if (R.L < 1) continue;
    curtain(K, R, 0, R.L, T5 + 1.0, TOP - 0.6, { mw: 1.5, rows: [T5 + 4.0], glass: GL, frame: AL, rev: 0.05 });
  }
  const roofP = insetPoly(poly, 2.6); const FAS = new THREE.MeshStandardMaterial({ color: 0x7e8184, roughness: 0.5, metalness: 0.4 });
  K.prism(M.concrete, roofP, TOP - 0.6, TOP);
  K.loop(FAS, roofP, [[0.0, TOP - 1.1], [0.04, TOP - 1.1], [0.04, TOP + 0.05], [0.0, TOP + 0.05]]);
  K.loop(M.iron, insetPoly(roofP, 0.3), [[0, TOP + 1.05], [0.03, TOP + 1.05], [0.03, TOP + 1.1], [0, TOP + 1.1]], { detail: true });
  const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const SCR = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, roughness: 0.6, metalness: 0.3 }); K.box(SCR, c[0] + 2, TOP, c[1] - 4, c[0] + 14, TOP + 1.5, c[1] + 4);
  walkables.push({ type: 'poly', pts: inner.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), y: T5 + 1.0 });
  colliders.push({ type: 'poly', pts: poly.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), y0: base, y1: T5 + 0.9 });
  for (const [x, z] of [[8, 22], [20, 20]]) lamp(K, x, ctx.groundAt(x, z), z, 4.0);
  const object3d = K.finish();
  object3d.name = 'chou-hall-north-academic-building';
  return { object3d, colliders, walkables };
}
