// Haas School of Business — Student Services Building (Moore Ruble Yudell with Charles Moore, 1995). The long north
// range of the Haas complex steps up the hillside: cream stucco walls on a stone-toned base, ranks of white-trimmed
// windows, copper-clad bays, and steep grey-green standing-seam gable roofs with dormers, ending in a tower at the east.
// Massing from the 2021 LiDAR: west range eaves 14 / ridge 18 m, centre range 18 / 25.5 m, east range 17 / 21.5 m,
// tower 31 m (y=0 = lowest ground; the site rises ~10 m to the east).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'student-services-building',
  name: 'Haas Student Services Building',
  subtitle: 'Haas School of Business · Moore Ruble Yudell · 1995',
  blurb: 'Part of the Haas School of Business complex designed by Charles Moore with Moore Ruble Yudell, arranged around a hillside courtyard at the east edge of campus.',
  replaces: ['w/32224838'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-3.7);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [];
  const stucco = tone(M.stucco, 0xe6dcc6, [221, 209, 184]), base = tone(M.concrete, 0xb8ab94);
  const roof = tinted(M.slate, 0x6f7b74), copper = tinted(M.copper, 0xb9c9b4), trim = M.whitePaint;
  const sections = [ // [u0, v0, u1, v1, eave, ridge]
    [-42.5, -16.0, -21.0, 8.5, 13.0, 16.0], [-21.0, -12.0, 26.3, 9.0, 17.5, 24.8], [26.3, -4.0, 51.3, 11.0, 16.0, 20.5],
  ];
  for (const [u0, v0, u1, v1, eave, ridge] of sections) {
    K.box(M.concreteDark, u0 + 0.4, -1.5, v0 + 0.4, u1 - 0.4, eave - 0.2, v1 - 0.4);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, ridge));
    for (const [a, b, gableEnd] of [[[u0, v1], [u1, v1], false], [[u1, v0], [u0, v0], false], [[u0, v0], [u0, v1], true], [[u1, v1], [u1, v0], true]]) {
      const R = K.run(a, b); const gm = Math.min(g(...a), g(...b)) - 0.6; const L = R.L;
      const floors = []; for (let y = Math.max(g(...a), g(...b)) + 1.0; y < eave - 2.5; y += 3.7) floors.push(y);
      const nb = Math.max(1, Math.round(L / 3.2)); const bw = L / nb; const ops = [];
      for (const fy of floors) for (let i = 0; i < nb; i++) { const c = (i + 0.5) * bw; const gl = g(...R.at(c, 1)); if (fy < gl + 0.8) continue; ops.push({ s0: c - 0.7, s1: c + 0.7, y0: fy + 0.5, y1: fy + 2.5 }); }
      K.wall(R, stucco, 0, L, gm, eave, ops, 0.35);
      for (const o of ops) K.fill(R, o, { rev: 0.25, frame: trim, mull: 1, tran: [o.y0 + 1.4] });
      K.rbox(R, base, -0.05, gm, 0, L + 0.05, Math.max(g(...a), g(...b)) + 0.9, 0.08);
      K.rbox(R, trim, -0.1, eave - 0.35, 0, L + 0.1, eave, 0.25);
      if (!gableEnd) for (let s = bw * 2; s < L - bw; s += bw * 6) { // copper-clad bay windows
        const y0 = floors[1] ?? floors[0]; if (y0 == null) continue; K.rbox(R, copper, s - 1.3, y0, 0, s + 1.3, y0 + 3.3, 0.9); glassBand(K, R, s - 1.0, s + 1.0, y0 + 0.4, y0 + 2.9, { glass: M.windowNight, frame: trim, pitch: 0.67, rec: -0.92, sill: false });
      }
    }
    // steep gable roof (ridge along u) with dormers
    const vm = (v0 + v1) / 2, rise = ridge - eave;
    K.gable(roof, u0, v0, u1, v1, eave, rise, 'u', { overhang: 0.6, wallMat: stucco });
    const slope = rise / ((v1 - v0) / 2);
    for (let u = u0 + 3; u < u1 - 3; u += 7.5) for (const side of [-1, 1]) {
      const vv = vm + side * (v1 - v0) * 0.3; const yb = eave + (1 - Math.abs(vv - vm) / ((v1 - v0) / 2)) * rise;
      K.box(stucco, u - 1.0, yb - 0.6, Math.min(vv, vv + side * 1.2), u + 1.0, yb + 1.5, Math.max(vv, vv + side * 1.2));
      K.gable(roof, u - 1.2, Math.min(vv, vv + side * 1.4), u + 1.2, Math.max(vv, vv + side * 1.4), yb + 1.5, 0.8, 'v', { overhang: 0.1 });
      const R = K.run(...(side > 0 ? [[u - 1.0, vv + 1.2], [u + 1.0, vv + 1.2]] : [[u + 1.0, vv - 1.2], [u - 1.0, vv - 1.2]])); glassBand(K, R, 0.3, 1.7, yb - 0.3, yb + 1.2, { glass: M.windowNight, frame: trim, pitch: 0.7, rec: 0.05 });
      void slope;
    }
  }
  // lower south range along the courtyard (flat roof terrace, LiDAR ~16.5 m)
  { const a0 = -21.0, b0 = 9.0, a1 = 26.3, b1 = 13.5, t = 16.5; K.box(M.concreteDark, a0 + 0.3, -1.5, b0, a1 - 0.3, t - 0.2, b1 - 0.3);
    const R = K.run([a0, b1], [a1, b1]); const gm = Math.min(g(a0, b1), g(a1, b1)) - 0.6; const nb = Math.round(R.L / 3.2), bw = R.L / nb; const ops = [];
    for (let y = Math.max(g(a0, b1), g(a1, b1)) + 1.0; y < t - 2.5; y += 3.7) for (let i = 0; i < nb; i++) { const c = (i + 0.5) * bw; if (y < g(...R.at(c, 1)) + 0.8) continue; ops.push({ s0: c - 0.7, s1: c + 0.7, y0: y + 0.5, y1: y + 2.5 }); }
    K.wall(R, stucco, 0, R.L, gm, t, ops, 0.35); for (const o of ops) K.fill(R, o, { rev: 0.25, frame: trim, mull: 1, tran: [o.y0 + 1.4] });
    K.box(trim, a0, t - 0.2, b0, a1, t + 0.4, b1 + 0.2); colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], -2, t)); }
  // east tower (LiDAR ~31 m)
  { const a0 = 46.8, b0 = 0.6, a1 = 51.3, b1 = 6.0; K.box(stucco, a0, g(49, 3) - 1, b0, a1, 27.0, b1); K.hip(roof, a0 - 0.4, b0 - 0.4, a1 + 0.4, b1 + 0.4, 27.0, 1.6); K.box(trim, a0 - 0.2, 26.6, b0 - 0.2, a1 + 0.2, 27.0, b1 + 0.2);
    for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) { const R = K.run(p, q); glassBand(K, R, R.L / 2 - 0.8, R.L / 2 + 0.8, 22.0, 25.5, { glass: M.windowNight, frame: trim, pitch: 0.8, rec: -0.02 }); } }
  const object3d = K.finish();
  object3d.name = 'student-services-building';
  return { object3d, colliders, walkables: [] };
}
