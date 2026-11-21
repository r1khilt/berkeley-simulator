// Haas Pavilion (Harmon Gymnasium, George W. Kelham, 1933; rebuilt and enlarged 1999). Cal basketball's arena keeps the
// cream-concrete Moderne walls of Harmon Gym — tall grid windows, a deep three-bay east portico on square pylons with
// athlete reliefs and HAAS PAVILION across the frieze — under a new low hipped roof that floats on dark steel trusses over
// a green clerestory, cantilevered ~4 m past the old walls. Massing from the 2021 LiDAR: eaves 26 m, ridge 33 m,
// corner wings 12–14 m.
import * as THREE from 'three';
import { Kit, polysGeo } from './lib/classic-kit.js';
import { glassBand, pipeRail, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'haas-pavilion',
  name: 'Haas Pavilion',
  subtitle: 'Harmon Gym 1933 · rebuilt 1999',
  blurb: 'Home of Cal basketball and volleyball, Haas Pavilion was built inside the walls of the 1933 Harmon Gymnasium; the 1999 rebuild added a new upper bowl and roof, roughly doubling its seating to about 11,800.',
  replaces: ['w/24025440'],
};
const FONT = { H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'], V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'], I: ['111', '010', '010', '010', '010', '010', '111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'] };

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const cream = tone(M.concrete, 0xd8d0bc), creamD = tone(M.concrete, 0xbdb4a0);
  const steel = tinted(M.blackPaint, 0x2b2e30);
  const roofM = tinted(M.whitePaint, 0xd9d9d5, { roughness: 0.45, metalness: 0.2 });
  const fascia = tinted(M.whitePaint, 0xe9e9e5);
  const green = tinted(M.windowNight, 0x8fae78, { emissive: new THREE.Color(0x9bdc6a) });
  const frame = tinted(M.darkBronze, 0x4a5560);
  const tileBlue = tinted(M.whitePaint, 0x4f6e9a);
  const doorWood = tinted(M.wood, 0x8a5a2e), letterM = tinted(M.blackPaint, 0x2a2a2a);
  const R0 = [-37.7, -44.5, 39.0, 44.2];                 // roof outline (LiDAR/OSM)
  const W = [-33.7, -40.5, 35.0, 40.2];                  // old Harmon Gym walls (4 m under the roof edge)
  const WT = 22.0, CT = 25.0, EAV = 26.1, RID = 33.0, RU = 4.5, RV = [-36.5, 36.0];
  // ---- old walls with Moderne grid windows ----
  K.box(M.concreteDark, W[0] + 0.5, -1.5, W[1] + 0.5, W[2] - 0.5, WT, W[3] - 0.5);
  colliders.push(K.colPoly([[W[0], W[1]], [W[2], W[1]], [W[2], W[3]], [W[0], W[3]]], -2, CT));
  const sides = [[[W[0], W[3]], [W[2], W[3]]], [[W[2], W[1]], [W[0], W[1]]], [[W[0], W[1]], [W[0], W[3]]], [[W[2], W[3]], [W[2], 13.5]], [[W[2], -14.7], [W[2], W[1]]]];
  for (const [a, b] of sides) {
    const R = K.run(a, b); const gm = Math.min(g(...a), g(...b)) - 0.6; const nb = Math.max(1, Math.round(R.L / 7.2)); const bw = R.L / nb;
    const ops = [];
    for (let i = 0; i < nb; i++) { const c = (i + 0.5) * bw; ops.push({ s0: c - 1.6, s1: c + 1.6, y0: gm + 3.6, y1: gm + 6.6 }, { s0: c - 1.6, s1: c + 1.6, y0: gm + 8.8, y1: gm + 14.8 }); }
    K.wall(R, cream, 0, R.L, gm, WT, ops, 0.4);
    for (const o of ops) { glassBand(K, R, o.s0, o.s1, o.y0, o.y1, { glass: M.windowNight, frame, pitch: 0.8, transoms: Array.from({ length: Math.round((o.y1 - o.y0) / 0.8) - 1 }, (_, k) => o.y0 + (k + 1) * (o.y1 - o.y0) / Math.round((o.y1 - o.y0) / 0.8)), rec: 0.32 }); K.rbox(R, creamD, o.s0 - 0.25, o.y0 - 0.25, -0.05, o.s1 + 0.25, o.y1 + 0.25, 0.04); }
    for (let i = 0; i <= nb; i++) K.rbox(R, cream, i * bw - 0.5, gm, 0, i * bw + 0.5, WT, 0.3); // pilaster strips
    for (let y = gm + 1.4; y < WT; y += 1.4) K.rbox(R, creamD, 0, y - 0.015, 0.0, R.L, y + 0.015, 0.012, { detail: true });
    K.rbox(R, cream, -0.3, WT - 0.8, 0, R.L + 0.3, WT, 0.45); // cornice band
  }
  // ---- east portico (three bays between end towers, square pylons, athlete reliefs, HAAS PAVILION frieze) ----
  {
    const R = K.run([W[2], 13.5], [W[2], -14.7]); const L = R.L; // faces east
    const PG = g(W[2] + 8, 0), PF = PG + 1.5; // plaza; podium
    const t0 = 4.2, t1 = L - 4.2, bay = (t1 - t0) / 3;
    K.rbox(R, cream, 0, PG - 1, 0, L, PF, 7.0); walkables.push(K.walkPoly([[W[2], -14.7], [W[2] + 7, -14.7], [W[2] + 7, 13.5], [W[2], 13.5]], PF));
    for (let i = 0; i < 3; i++) { const c = t0 + (i + 0.5) * bay, w = i === 1 ? 6 : 4; const p0 = R.at(c - w / 2, 7.0), p1 = R.at(c + w / 2, 7.0 + 9 * 0.32); walkables.push(K.stairs(cream, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), PG, PF, '-u', 9)); }
    // end towers
    for (const [s0, s1] of [[0, t0], [t1, L]]) { K.rbox(R, cream, s0, PG - 1, 0, s1, WT + 0.6, 5.0); glassBand(K, R, (s0 + s1) / 2 - 0.75, (s0 + s1) / 2 + 0.75, PF + 6, PF + 10, { glass: M.windowNight, frame, pitch: 0.4, rec: -4.7 }); }
    // recessed screen wall with doors, blue tile spandrels, reliefs, glazing band above
    K.rbox(R, cream, t0, PF, -0.2, t1, PF + 9.0, 0.3);
    for (const c of [t0 + bay * 0.5, t0 + bay * 1.35, t0 + bay * 1.65, t0 + bay * 2.5]) {
      K.rbox(R, M.windowNight, c - 1.2, PF, 0.3, c + 1.2, PF + 6.0, 0.36); K.rbox(R, doorWood, c - 1.15, PF, 0.36, c + 1.15, PF + 2.6, 0.42);
      K.rbox(R, tileBlue, c - 1.2, PF + 2.6, 0.36, c + 1.2, PF + 3.1, 0.4);
    }
    for (const c of [t0 + bay * 0.5, t0 + bay * 1.25, t0 + bay * 1.75, t0 + bay * 2.5]) K.rbox(R, creamD, c - 0.6, PF + 6.4, 0.3, c + 0.6, PF + 8.9, 0.42); // athlete relief panels
    glassBand(K, R, t0, t1, PF + 9.0, PF + 11.0, { glass: M.windowNight, frame: steel, pitch: 0.9, transoms: [PF + 9.67, PF + 10.33], rec: -0.2 });
    K.rbox(R, cream, t0, PF + 11.0, -0.2, t1, WT + 0.6, 5.0); // portico ceiling/frieze block
    // pylons (two freestanding square pylons + end responds)
    for (const s of [t0 + bay, t0 + 2 * bay]) { K.rbox(R, cream, s - 0.7, PF, 3.6, s + 0.7, PF + 14.5, 5.0); colliders.push(K.colCyl(...R.at(s, 4.3), 0.9, PF - 1, PF + 14)); }
    // HAAS PAVILION across the frieze
    { const text = 'HAAS PAVILION', px = 0.135; let w = 0; for (const ch of text) w += ((FONT[ch]?.[0].length ?? 3) + 1.6) * px; let s = L / 2 - w / 2; const yT = PF + 15.2 + 7 * px;
      for (const ch of text) { const gl = FONT[ch]; const cw = gl ? gl[0].length : 3; if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < cw; c++) if (gl[r][c] === '1') K.rbox(R, letterM, s + c * px, yT - (r + 1) * px, 5.0, s + (c + 1) * px, yT - r * px, 5.08, { detail: true }); s += (cw + 1.6) * px; } }
    for (const s of [t0 - 0.5, t1 + 0.5]) { const p = R.at(s, 7.4); K.cyl(M.iron, p[0], PF, p[1], 0.08, 0.06, 3.6, 8, { detail: true }); K.lathe(M.lampGlow, [[0.001, 0], [0.22, 0.12], [0.24, 0.35], [0.001, 0.6]], p[0], PF + 3.6, p[1], 10, { detail: true }); }
    pipeRail(K, M.iron, [[W[2] + 7.0, -14.7], [W[2] + 7.0, 13.5]].map(([u, v]) => [u - 0.15, v]), PF, { h: 1.0 });
  }
  // ---- clerestory (green glass) between the old cornice and the new roof, steel trusses, floating hipped roof ----
  {
    const ring = [[W[0] + 0.6, W[3] - 0.6], [W[2] - 0.6, W[3] - 0.6], [W[2] - 0.6, W[1] + 0.6], [W[0] + 0.6, W[1] + 0.6]];
    for (let i = 0; i < 4; i++) { const R = K.run(ring[i], ring[(i + 1) % 4]); glassBand(K, R, 0, R.L, WT, CT, { glass: green, frame: steel, pitch: 2.0, rec: 0.05 }); }
    K.box(M.concreteDark, W[0] + 0.8, WT, W[1] + 0.8, W[2] - 0.8, CT, W[3] - 0.8);
    // steel soffit deck + Warren trusses in the overhang
    K.box(steel, R0[0], CT, R0[1], R0[2], CT + 0.3, R0[3]);
    for (let v = R0[1] + 3; v < R0[3] - 2; v += 6.0) for (const [u0, u1] of [[R0[0], W[0]], [W[2], R0[2]]]) {
      K.box(steel, u0, CT - 0.25, v - 0.12, u1, CT, v + 0.12, { detail: true });
      const n = 3; for (let k = 0; k < n; k++) { const a = u0 + (u1 - u0) * k / n, b = u0 + (u1 - u0) * (k + 1) / n; const gg = new THREE.BoxGeometry(Math.hypot(b - a, 2.2), 0.14, 0.14); gg.rotateZ((k % 2 ? 1 : -1) * Math.atan2(2.2, b - a)); gg.translate((a + b) / 2, CT - 1.1, v); K.add(steel, gg, { detail: true }); }
    }
    // fascia band
    for (const [a, b] of [[[R0[0], R0[3]], [R0[2], R0[3]]], [[R0[2], R0[3]], [R0[2], R0[1]]], [[R0[2], R0[1]], [R0[0], R0[1]]], [[R0[0], R0[1]], [R0[0], R0[3]]]]) { const R = K.run(a, b); K.rbox(R, fascia, -0.05, CT + 0.3, -0.3, R.L + 0.05, EAV, 0.0); }
    // hipped roof (ridge N–S, east of centre)
    const P = (u, v, y) => [u, y, v];
    const A = P(R0[0], R0[1], EAV), B = P(R0[2], R0[1], EAV), C = P(R0[2], R0[3], EAV), D = P(R0[0], R0[3], EAV), a = P(RU, RV[0], RID), b = P(RU, RV[1], RID);
    const polys = [[A, a, b, D].reverse(), [C, b, a, B].reverse(), [B, a, A].reverse(), [D, b, C].reverse()];
    K.add(roofM, polysGeo(polys), { uvMode: "roof" });
    K.box(M.concreteDark, R0[0] + 0.3, EAV - 0.4, R0[1] + 0.3, R0[2] - 0.3, EAV - 0.05, R0[3] - 0.3);
    // standing-seam ribs (detail) down the long slopes
    for (let v = R0[1] + 2; v < R0[3] - 1; v += 2.5) for (const [u0, u1] of [[R0[0], RU], [RU, R0[2]]]) { const y0 = EAV, y1 = RID - Math.max(0, Math.abs(v) > RV[1] ? (Math.abs(v) - RV[1]) * 7 / 8 : 0); const gg = new THREE.BoxGeometry(Math.hypot(u1 - u0, y1 - y0), 0.06, 0.06); gg.rotateZ((u0 < RU ? 1 : -1) * Math.atan2(y1 - y0, u1 - u0)); gg.translate((u0 + u1) / 2, (y0 + y1) / 2 + 0.04, v); K.add(fascia, gg, { detail: true }); }
  }
  // ---- corner wings (12–14 m) ----
  for (const [a0, b0, a1, b1, h] of [[-30.5, -60.0, -17.5, -40.5, 13.0], [18.5, -51.5, 30.8, -40.5, 12.2], [-30.3, 40.2, -16.8, 59.8, 13.5], [18.2, 40.2, 31.5, 50.8, 12.2]]) {
    K.box(cream, a0, -1.5, b0, a1, h, b1); K.box(creamD, a0 - 0.2, h, b0 - 0.2, a1 + 0.2, h + 0.4, b1 + 0.2);
    const outer = b0 < 0 ? [[a1, b0], [a0, b0]] : [[a0, b1], [a1, b1]]; const R = K.run(...outer);
    for (let s = 2; s < R.L - 2; s += 3.5) glassBand(K, R, s, s + 2.0, g(...outer[0]) + 2.0, h - 2.0, { glass: M.windowNight, frame, pitch: 0.7, rec: -0.02, transoms: [g(...outer[0]) + 5.0, g(...outer[0]) + 8.0] });
    colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], -2, h));
  }
  const object3d = K.finish();
  object3d.name = 'haas-pavilion';
  return { object3d, colliders, walkables };
}
