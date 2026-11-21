// Ida Louise Jackson Graduate House, College Avenue at Durant (built 2002; renamed 2004 as the first UC Berkeley
// building named for an African-American woman). A Craftsman/Prairie-idiom residence: warm ochre stucco over a
// tall shopfront base with a maroon band and cream belt course, stacked cream projecting window bays that rise
// through the eaves under their own little flared hip caps, low grey hipped roofs on deep cream bracketed eaves,
// and a chamfered corner tower with a recessed belvedere attic and finial at College and Durant.
// Massing follows the 2021 LiDAR: C-shaped plan, eaves ~14 m, ridges ~16.5-17.5 m, tower ~19 m.
import * as THREE from 'three';
import { Kit, tint, tintMul, rect, rectRuns, brackets, curtain } from './lib/b06a-kit.js';

export const info = {
  id: 'ida-louise-jackson-graduate-house',
  name: 'Ida Louise Jackson Graduate House',
  subtitle: 'Graduate housing · 2002',
  blurb: 'Renamed in 2004 for educator Ida Louise Jackson, an early African-American graduate of Cal, this graduate residence was the first UC Berkeley building named for an African-American woman.',
  replaces: ['w/109193724'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.4);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const OCHRE = tintMul(M, 'stuccoWhite', 0.84, 0.6, 0.26), CREAM = tint(M, 'whitePaint', '#ede4cf', { roughness: 0.85 }), PIER = tintMul(M, 'stuccoWhite', 1.08, 0.98, 0.74);
  const GL = tint(M, 'glass', '#3c4a55', { metalness: 0.5, roughness: 0.04, envMapIntensity: 1.6 });
  const MAROON = tint(M, 'whitePaint', '#6e2a24'), STONE = tintMul(M, 'stuccoWhite', 0.84, 0.79, 0.68), BRONZE = tint(M, 'blackPaint', '#3a3128');
  const ROOF = tint(M, 'shingle', '#5e5f5e'), WHITE = tint(M, 'whitePaint', '#f4f1ea');
  const colliders = [], walkables = [];
  const EAVE = 14.0, OV = 1.0, BASE = 4.6;
  const floors = [BASE, BASE + 3.1, BASE + 6.2, EAVE]; // three residential floors over the tall base
  function face(Rk, street) {
    const gl = Math.min(...[0.15, 0.5, 0.85].map((t) => { const p = Rk.at(Rk.L * t, 0.5); return K.g(p[0], p[1]); })); const yB = gl - 1.2;
    // base storey
    const shop = []; if (street) { const n = Math.max(1, Math.floor((Rk.L - 1.0) / 4.6)); for (let i = 0; i < n; i++) { const c = 0.5 + (Rk.L - 1.0) * (i + 0.5) / n; const hw = (Rk.L - 1.0) / n / 2 - 0.45; shop.push({ s0: c - hw, s1: c + hw, y0: Math.max(gl + 0.45, 0.6), y1: Math.max(gl + 0.45, 0.6) + 3.1, mull: 2, tran: [Math.max(gl + 0.45, 0.6) + 2.5] }); } }
    else { for (let s = 1.8; s < Rk.L - 1.5; s += 3.6) { const p = Rk.at(s + 0.5, 0.5); const g = K.g(p[0], p[1]); if (BASE - 1.0 - g > 1.6) shop.push({ s0: s, s1: s + 1.0, y0: Math.max(g + 0.8, BASE - 2.6), y1: BASE - 0.9, mull: 0 }, { s0: s + 1.2, s1: s + 2.2, y0: Math.max(g + 0.8, BASE - 2.6), y1: BASE - 0.9, mull: 0 }); } }
    K.wall(Rk, OCHRE, 0, Rk.L, yB, BASE, shop, 0.4); K.rbox(Rk, MAROON, -0.03, gl - 0.2, -0.05, Rk.L + 0.03, gl + 0.15, 0.06);
    for (const o of shop) K.fill(Rk, { ...o, sill: false }, { rev: 0.2, frame: street ? BRONZE : WHITE, mull: o.mull, tran: o.tran || [], glass: GL });
    K.rbox(Rk, MAROON, -0.04, BASE + 0.55, -0.05, Rk.L + 0.04, BASE + 0.9, 0.08);
    // residential floors: paired white divided-lite windows
    const ops = []; for (let f = 0; f < 3; f++) for (let s = 1.0; s < Rk.L - 2.8; s += 3.2) { const y0 = floors[f] + (f === 0 ? 1.1 : 0.8); ops.push({ s0: s, s1: s + 1.2, y0, y1: y0 + 1.6, muntins: 1, mull: 1 }, { s0: s + 1.45, s1: s + 2.65, y0, y1: y0 + 1.6, muntins: 1, mull: 1 }); }
    const bayC = []; if (Rk.L > 11) { const nb = Math.max(1, Math.round(Rk.L / 9.5)); for (let k = 0; k < nb; k++) bayC.push(Rk.L * (k + 0.5) / nb); }
    const keep = ops.filter((o) => !bayC.some((c) => o.s1 > c - 1.9 && o.s0 < c + 1.9));
    K.wall(Rk, OCHRE, 0, Rk.L, BASE + 0.4, EAVE, keep, 0.32);
    for (const o of keep) { K.fill(Rk, { ...o, sill: undefined, sillMat: WHITE, fw: 0.09 }, { rev: 0.12, frame: WHITE, mull: 1, glass: GL }); K.rbox(Rk, WHITE, o.s0 - 0.12, o.y1, 0, o.s1 + 0.12, o.y1 + 0.12, 0.05, { detail: true }); }
    // stacked cream projecting bays rising through the eaves with their own flared hip caps
    for (const c of bayC) { const bw = 3.4, d = 0.9, top = EAVE - 0.2;
      const P = [Rk.at(c - bw / 2, 0), Rk.at(c - bw / 2 + d, d), Rk.at(c + bw / 2 - d, d), Rk.at(c + bw / 2, 0)].map(([u, v]) => [u, v]);
      K.prism(CREAM, [P[0], P[1], P[2], P[3]], BASE + 0.9, top);
      const faces = [K.run(P[0], P[1]), K.run(P[1], P[2]), K.run(P[2], P[3])];
      for (const Rf of faces) { const n = Rf.L > 1.6 ? 2 : 1; for (let f = 0; f < 3; f++) { const y0 = floors[f] + 0.7; for (let i = 0; i < n; i++) { const a0 = Rf.L * i / n + 0.12, a1 = Rf.L * (i + 1) / n - 0.12;
        K.rbox(Rf, GL, a0, y0, 0.0, a1, y0 + 1.85, 0.02); K.rbox(Rf, WHITE, a0 - 0.07, y0 - 0.08, 0.0, a1 + 0.07, y0, 0.1); K.rbox(Rf, WHITE, a0 - 0.07, y0 + 1.85, 0.0, a1 + 0.07, y0 + 1.93, 0.08); K.rbox(Rf, WHITE, a0 - 0.07, y0, 0.0, a0, y0 + 1.85, 0.07); K.rbox(Rf, WHITE, a1, y0, 0.0, a1 + 0.07, y0 + 1.85, 0.07); K.rbox(Rf, WHITE, a0, y0 + 1.22, 0.02, a1, y0 + 1.28, 0.06, { detail: true }); K.rbox(Rf, WHITE, (a0 + a1) / 2 - 0.03, y0, 0.02, (a0 + a1) / 2 + 0.03, y0 + 1.85, 0.06, { detail: true }); } } }
      const q0 = Rk.at(c - bw / 2 - 0.35, -0.3), q1 = Rk.at(c + bw / 2 + 0.35, d + 0.45); K.prism(CREAM, rect(Math.min(q0[0], q1[0]), Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), Math.max(q0[1], q1[1])), top - 0.15, top);
      K.hip(ROOF, Math.min(q0[0], q1[0]), Math.min(q0[1], q1[1]), Math.max(q0[0], q1[0]), Math.max(q0[1], q1[1]), top, 0.32); }
    brackets(K, Rk, CREAM, 0, Rk.L, EAVE, { ov: OV, pitch: 0.85, h: 0.32, w: 0.15 });
    return yB;
  }
  function bar(u0, v0, u1, v1, slope, faces, street = '', eave = EAVE) {
    const R = rectRuns(K, u0, v0, u1, v1); let yB = 0;
    for (const f of faces) yB = Math.min(yB, face(R[f], street.includes(f)));
    K.box(M.concreteDark, u0 + 0.6, yB, v0 + 0.6, u1 - 0.6, eave - 0.1, v1 - 0.6);
    K.hip(ROOF, u0 - OV, v0 - OV, u1 + OV, v1 + OV, eave + 0.05, slope);
    K.prism(CREAM, rect(u0 - OV, v0 - OV, u1 + OV, v1 + OV), eave - 0.25, eave + 0.05, {}, [rect(u0, v0, u1, v1)]);
    colliders.push(K.colPoly(rect(u0, v0, u1, v1), yB, eave + 4));
  }
  bar(-21.3, -25.4, 8.0, -8.9, 0.27, 'NEWS', 'NW');
  bar(-21.3, -8.9, -10.0, 6.2, 0.27, 'WE', 'W');
  bar(-21.3, 6.2, 39.1, 17.6, 0.27, 'SEWN', 'W');
  { const R = rectRuns(K, -10.0, -0.05, 4.2, 6.2); for (const f of 'NE') face(R[f], false); K.box(M.concreteDark, -9.4, -1, 0.5, 3.6, 10.4, 5.6); K.hip(ROOF, -10.9, -0.95, 5.1, 7.1, 10.6, 0.3); }
  // chamfered corner tower at College & Durant: a cluster of stacked cream oriel bays, one shallow flared hip, slim mast
  { const u0 = -22.3, v0 = -26.4, u1 = -14.3, v1 = -18.4, top = EAVE + 3.2, ch = 2.2;
    const poly = [[u0 + ch, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0 + ch]];
    K.prism(M.concreteDark, poly.map(([a, b]) => [a + (a < (u0 + u1) / 2 ? 0.5 : -0.3), b + (b < (v0 + v1) / 2 ? 0.5 : -0.3)]), -1, BASE);
    for (const Rk of [K.run([u1, v0], [u0 + ch, v0]), K.run([u0 + ch, v0], [u0, v0 + ch]), K.run([u0, v0 + ch], [u0, v1])]) { const gl0 = Math.max(0.35, (() => { const p = Rk.at(Rk.L / 2, 0.5); return K.g(p[0], p[1]) + 0.2; })());
      K.rbox(Rk, PIER, -0.25, -1, -0.3, 0.25, BASE, 0.05); K.rbox(Rk, PIER, Rk.L - 0.25, -1, -0.3, Rk.L + 0.25, BASE, 0.05);
      curtain(K, Rk, 0.25, Rk.L - 0.25, gl0, BASE - 0.1, { pitch: 1.5, recess: 0.3, frame: BRONZE, glass: GL, trans: [gl0 + 2.9] }); K.rbox(Rk, PIER, 0.25, -1, -0.3, Rk.L - 0.25, gl0, 0.0); }
    K.prism(CREAM, poly, BASE + 0.4, top); K.prism(MAROON, poly.map(([a, b]) => [a + (a < (u0 + u1) / 2 ? -0.1 : 0.1), b + (b < (v0 + v1) / 2 ? -0.1 : 0.1)]), BASE, BASE + 0.4);
    const faces = [K.run([u1, v0], [u0 + ch, v0]), K.run([u0 + ch, v0], [u0, v0 + ch]), K.run([u0, v0 + ch], [u0, v1])];
    for (const Rk of faces) { const c = Rk.L / 2; const bw = Rk.L > 3.5 ? 3.4 : 2.4, d = 0.7, n = Rk.L > 3.5 ? 3 : 2, lw = Rk.L > 3.5 ? 0.95 : 0.9;
      K.rbox(Rk, CREAM, c - bw / 2, BASE + 0.4, 0, c + bw / 2, top - 0.5, d);
      for (let f = 0; f < 4; f++) { const y0 = BASE + 0.9 + f * 3.1; if (y0 + 1.7 > top - 0.6) continue; for (let i = 0; i < n; i++) { const x = c + (i - (n - 1) / 2) * (lw + 0.12);
        K.rbox(Rk, GL, x - lw / 2, y0, d, x + lw / 2, y0 + 1.7, d + 0.02); K.rbox(Rk, WHITE, x - lw / 2 - 0.06, y0 - 0.07, d, x + lw / 2 + 0.06, y0, d + 0.1); K.rbox(Rk, WHITE, x - lw / 2 - 0.06, y0 + 1.7, d, x + lw / 2 + 0.06, y0 + 1.77, d + 0.08); K.rbox(Rk, WHITE, x - lw / 2, y0 + 1.15, d + 0.02, x + lw / 2, y0 + 1.2, d + 0.06, { detail: true }); }
        for (let i = 0; i <= n; i++) { const x = c + (i - n / 2) * (lw + 0.12); K.rbox(Rk, WHITE, x - 0.06, y0, d, x + 0.06, y0 + 1.7, d + 0.07); } } }
    K.box(M.concreteDark, u0 + 0.4, BASE, v0 + 0.4, u1 - 0.4, top, v1 - 0.4);
    K.prism(CREAM, rect(u0 - 0.5, v0 - 0.5, u1 + 0.5, v1 + 0.5), top - 0.3, top);
    // set-back lantern tier with a ribbon of windows, then a broad flared low cap
    const t0 = u0 + 0.8, t1 = u1 - 0.8, w0 = v0 + 0.8, w1 = v1 - 0.8; const Rl = rectRuns(K, t0, w0, t1, w1);
    for (const f of 'NSEW') { const Rk = Rl[f]; K.wall(Rk, CREAM, 0, Rk.L, top, top + 2.3, [{ s0: 0.5, s1: Rk.L - 0.5, y0: top + 0.4, y1: top + 1.9 }], 0.2); K.rbox(Rk, GL, 0.5, top + 0.4, -0.15, Rk.L - 0.5, top + 1.9, -0.12); for (let i = 1; i < 5; i++) K.rbox(Rk, WHITE, 0.5 + (Rk.L - 1) * i / 5 - 0.04, top + 0.4, -0.12, 0.5 + (Rk.L - 1) * i / 5 + 0.04, top + 1.9, -0.04, { detail: true }); }
    K.box(M.concreteDark, t0 + 0.3, top, w0 + 0.3, t1 - 0.3, top + 2.2, w1 - 0.3);
    K.prism(CREAM, rect(t0 - 1.2, w0 - 1.2, t1 + 1.2, w1 + 1.2), top + 2.1, top + 2.35);
    const yT = K.hip(ROOF, t0 - 1.2, w0 - 1.2, t1 + 1.2, w1 + 1.2, top + 2.35, 0.32);
    for (const f of 'NSEW') brackets(K, Rl[f], CREAM, 0, Rl[f].L, top + 2.3, { ov: 1.2, pitch: 0.75, h: 0.3, w: 0.13 });
    K.cyl(M.iron, (u0 + u1) / 2, yT, (v0 + v1) / 2, 0.04, 0.025, 3.0, 6);
    colliders.push(K.colPoly(rect(u0, v0, u1, v1), -1, top + 2)); }
  const object3d = K.finish(); object3d.name = 'ida-louise-jackson-graduate-house';
  return { object3d, colliders, walkables };
}
