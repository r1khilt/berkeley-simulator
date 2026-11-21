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
  // pale warm sand stone panels (clean, minimal joints), darker stone base, white aluminium fins/louvres;
  // glass = the shared M.glass (curtain wall) and M.windowNight (punched windows, storefront)
  const ST = M.stuccoWhite.clone(); ST.color = new THREE.Color(0xe6d6bb); ST.name = 'chou-stone';
  const BASE = M.stuccoWhite.clone(); BASE.color = new THREE.Color(0xc4b7a3); BASE.name = 'chou-base';
  const LOU = new THREE.MeshStandardMaterial({ color: 0xe8eaea, roughness: 0.4, metalness: 0.5 }); LOU.name = 'chou-louvre';
  const GL = M.glass;
  const AL = X.alu, DK = X.frameDark;
  const colliders = [], walkables = [];
  const FAS0 = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.5, metalness: 0.3 });
  const poly = outward(simplify(ctx.footprints[0].outer.map(([x, z]) => [x, z]), 1.0, 0.05));
  let gMin = Infinity; for (const [x, z] of poly) gMin = Math.min(gMin, ctx.groundAt(x, z)); const base = gMin - 1.2;
  const T5 = 23.3, TOP = 28.0, F1 = 5.0, FH = 4.1;
  const styleOf = (a, b) => { const R = K.run(a, b); const L = R.L, n = R.n; return (n[0] < -0.5 && -n[0] > n[1] * 0.9) ? 'west' : (n[1] > 0.55 && L > 15) ? 'court' : n[1] > 0.55 ? 'west' : 'punch'; };
  const styles = poly.map((a, i) => styleOf(a, poly[(i + 1) % poly.length]));
  // inset with a distance per edge (terrace setback only on the courtyard / west fronts; north and east rise sheer to the roof)
  const insetVar = (P, ds) => { const n = P.length; const lines = P.map((a, i) => { const b = P[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; const nn = [-t[1], t[0]]; return { p: [a[0] - nn[0] * ds[i], a[1] - nn[1] * ds[i]], t }; });
    const out = []; for (let i = 0; i < n; i++) { const A = lines[(i - 1 + n) % n], B = lines[i]; const den = A.t[0] * B.t[1] - A.t[1] * B.t[0]; if (Math.abs(den) < 1e-6) { out.push(B.p); continue; } const q = ((B.p[0] - A.p[0]) * B.t[1] - (B.p[1] - A.p[1]) * B.t[0]) / den; out.push([A.p[0] + A.t[0] * q, A.p[1] + A.t[1] * q]); } return out; };
  const setb = styles.map((st) => st === 'punch' ? 0.0 : 3.2);
  let yBc = T5 - 4 * 3.9; // height of the courtyard-front ground storey (set in the façade loop)
  // façades per edge
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); const L = R.L; if (L < 0.8) continue;
    let gs = Infinity; for (let k = 0; k <= 4; k++) { const p = R.at(L * k / 4, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const style = styles[i]; const gMid = ctx.groundAt(...R.at(L / 2, 1.5)); const g0 = style === 'court' ? Math.max(gs, Math.min(gMid, 4.0), T5 - F1 - 4 * FH) : Math.max(gs, T5 - F1 - 4 * FH); // ground floor level for this face (stepping site)
    const yB = style === 'court' ? Math.max(g0 + 4.6, T5 - 4 * 3.9) : g0 + F1; // top of the glazed/stone base
    const FHf = style === 'court' ? (T5 + 0.3 - yB) / 4 : FH; if (style === 'court') yBc = yB;
    // ground floor: glazed storefront (recessed arcade on the courtyard), dark stone elsewhere with punched windows
    const PE = 3.6; // solid stone end piers of the courtyard front
    if (style === 'court') {
      const rec = 2.5;
      { const nb2 = Math.max(2, Math.round((L - 2 * PE) / 1.5)); for (let k = 0; k < nb2; k++) { const a = PE + (L - 2 * PE) * k / nb2, b = PE + (L - 2 * PE) * (k + 1) / nb2; const gy = Math.max(g0, ctx.groundAt(...R.at((a + b) / 2, -rec + 0.3))); K.rbox(R, M.windowNight, a, gy, -rec - 0.05, b, yB - 0.5, -rec); K.rbox(R, BASE, a, base, -rec - 0.3, b, gy + 0.02, -rec + 0.02); } }
      const nm = Math.max(2, Math.round((L - 2 * PE) / 1.5)); for (let k = 0; k <= nm; k++) { const ss = PE + (L - 2 * PE) * k / nm; K.rbox(R, DK, ss - 0.04, g0, -rec, ss + 0.04, yB - 0.5, -rec + 0.1, { detail: k > 0 && k < nm }); }
      K.rbox(R, DK, PE, g0 + 3.0, -rec, L - PE, g0 + 3.08, -rec + 0.1, { detail: true });
      { const c = L / 2; K.rbox(R, DK, c - 1.9, g0, -rec + 0.02, c + 1.9, g0 + 2.6, -rec + 0.12); K.rbox(R, M.windowNight, c - 1.8, g0 + 0.05, -rec + 0.12, c - 0.05, g0 + 2.5, -rec + 0.14); K.rbox(R, M.windowNight, c + 0.05, g0 + 0.05, -rec + 0.12, c + 1.8, g0 + 2.5, -rec + 0.14); }
      K.rbox(R, BASE, PE, yB - 0.5, -rec, L - PE, yB, 0.0);                        // dark soffit band over the recess
      K.rbox(R, LOU, PE - 0.2, g0 + 4.3, 0.0, L - PE + 0.2, g0 + 4.55, 1.2);        // thin canopy slab
      K.rbox(R, M.paving, PE, base, -rec, L - PE, g0 + 0.02, 0.0);
      for (const [a0, a1] of [[0, PE], [L - PE, L]]) {
        const ops = [{ s0: (a0 + a1) / 2 - 0.45, s1: (a0 + a1) / 2 + 0.45, y0: g0 + 0.8, y1: g0 + 3.6, mull: 0, frame: DK, sill: false }];
        openWall(K, R, ST, a0, a1, base, yB, ops, { depth: 0.45, rev: 0.25, frame: DK, sill: false });
      }
    } else {
      const ops = []; const nw = Math.max(1, Math.round(L / 3.4)); for (let k = 0; k < nw; k++) { const c = L * (k + 0.5) / nw; ops.push({ s0: c - 0.6, s1: c + 0.6, y0: g0 + 1.0, y1: g0 + 3.6, mull: 0, frame: DK, sill: false }); }
      openWall(K, R, BASE, 0, L, base, yB, ops, { depth: 0.45, rev: 0.25, frame: DK, sill: false });
    }
    // floors 2–5 (up to the terrace level)
    if (style === 'court') {
      // solid end piers with one narrow slot window per floor
      for (const [a0, a1] of [[0, PE], [L - PE, L]]) {
        const ops = []; for (let f = 0; f < 4; f++) ops.push({ s0: (a0 + a1) / 2 - 0.45, s1: (a0 + a1) / 2 + 0.45, y0: yB + f * FHf + 0.8, y1: yB + f * FHf + 3.2, mull: 0, frame: DK, sill: false });
        openWall(K, R, ST, a0, a1, yB, T5 + 1.1, ops, { depth: 0.5, rev: 0.25, frame: DK, sill: false });
      }
      // central curtain wall recessed 0.6 m: blue-grey glass, slab-edge covers, white fins, louvre bands over the upper 60%
      const c0 = PE, c1 = L - PE; const nf = Math.max(3, Math.round((c1 - c0) / 3.6));
      K.rbox(R, GL, c0, yB - 0.3, -0.65, c1, T5 + 0.9, -0.6);
      K.rbox(R, ST, c0, T5 + 0.3, -0.6, c1, T5 + 1.1, 0.1);                         // head band under the terrace
      for (let f = 0; f < 4; f++) { const fy = yB + f * FHf;
        K.rbox(R, LOU, c0, fy - 0.2, -0.6, c1, fy + 0.25, 0.0);                       // slab-edge cover
        for (let y = fy + 1.55; y < fy + FHf - 0.25; y += 0.26) K.rbox(R, LOU, c0, y - 0.02, -0.55, c1, y + 0.02, -0.25, { detail: y > fy + 2.6 });
        const nmu = Math.round((c1 - c0) / 1.2); for (let k = 1; k < nmu; k++) { const ss = c0 + (c1 - c0) * k / nmu; K.rbox(R, AL, ss - 0.03, fy + 0.25, -0.6, ss + 0.03, fy + FHf - 0.2, -0.52, { detail: true }); }
      }
      for (let k = 0; k <= nf; k++) { const ss = c0 + (c1 - c0) * k / nf; const w = k === nf / 2 ? 0.45 : 0.3; K.rbox(R, LOU, ss - w / 2, yB - 0.3, -0.6, ss + w / 2, T5 + 0.3, 0.15); }
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
    if (style === 'punch') {
      const nw = Math.max(1, Math.round(L / 3.2)); const ops = [];
      for (let k = 0; k < nw; k++) { const c = L * (k + 0.5) / nw; ops.push({ s0: c - 0.7, s1: c + 0.7, y0: T5 + 1.8, y1: TOP - 1.4, mull: 0, frame: DK, sill: false }); }
      openWall(K, R, ST, 0, L, T5 + 1.1, TOP + 0.05, ops, { depth: 0.4, rev: 0.25, frame: DK, sill: false });
      K.rbox(R, FAS0, -0.05, TOP - 0.25, -0.42, L + 0.05, TOP + 0.1, 0.06);
    } else {
      K.rbox(R, ST, -0.05, T5 + 0.95, -0.42, L + 0.05, T5 + 1.1, 0.08);
      K.rbox(R, M.glassLight, 0, T5 + 1.1, -0.3, L, T5 + 2.2, -0.26, { detail: true }); // glass guardrail at the terrace edge
    }
  }
  // core + terrace slab
  const inner = insetPoly(poly, 0.45);
  K.prism(M.concreteDark, insetVar(poly, styles.map((st) => st === 'court' ? 2.7 : 0.45)), base, yBc);
  K.prism(M.concreteDark, insetVar(poly, styles.map((st) => st === 'court' ? 0.8 : 0.45)), yBc, T5 + 0.9);
  K.prism(M.paving, inner, T5 + 0.9, T5 + 1.0);
  // set-back glass pavilion on top + thin floating roof slab + mechanical screen
  const pav = insetVar(poly, setb);
  K.prism(M.concreteDark, insetVar(poly, setb.map((d) => d + 0.4)), T5 + 1.0, TOP - 0.6);
  for (let i = 0; i < pav.length; i++) {
    if (setb[i] < 1) continue;
    const a = pav[i], b = pav[(i + 1) % pav.length]; const R = K.run(a, b); if (R.L < 1) continue;
    curtain(K, R, 0, R.L, T5 + 1.0, TOP - 0.6, { mw: 1.5, rows: [T5 + 4.0], glass: GL, frame: AL, rev: 0.05 });
  }
  const roofP = insetVar(poly, setb.map((d) => d < 1 ? 0.3 : d - 0.6)); const FAS = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.5, metalness: 0.3 });
  K.prism(M.concrete, roofP, TOP - 0.6, TOP);
  K.loop(FAS, roofP, [[0.0, TOP - 0.3], [0.04, TOP - 0.3], [0.04, TOP + 0.05], [0.0, TOP + 0.05]]);
  const c = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  const SCR = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, roughness: 0.6, metalness: 0.3 }); K.box(SCR, c[0] + 2, TOP, c[1] - 8, c[0] + 12, TOP + 1.3, c[1] - 2);
  walkables.push({ type: 'poly', pts: inner.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), y: T5 + 1.0 });
  colliders.push({ type: 'poly', pts: poly.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), y0: base, y1: T5 + 0.9 });
  for (const [x, z] of [[8, 22], [20, 20]]) lamp(K, x, ctx.groundAt(x, z), z, 4.0);
  const object3d = K.finish();
  object3d.name = 'chou-hall-north-academic-building';
  return { object3d, colliders, walkables };
}
