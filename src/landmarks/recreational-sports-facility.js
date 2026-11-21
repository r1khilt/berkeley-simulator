// Recreational Sports Facility (RSF, 1984), 2301 Bancroft Way: the campus gym. A big board-formed concrete block with a
// full-height grid of piers and fins — a shadowy colonnade at the base, a band of punched windows, and a tall band of
// pale translucent panels that glows at night — stepping down to lower wings on the north and east. Massing from the
// 2021 LiDAR: main hall 22.2 m, north block 15 m, north strip 10.2 m, east wing 15.5 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, pipeRail, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'recreational-sports-facility',
  name: 'Recreational Sports Facility',
  subtitle: '2301 Bancroft Way · 1984',
  blurb: 'The RSF is the main campus gym, with basketball and volleyball courts, weight rooms and fitness studios, next to the Spieker Aquatics Complex.',
  replaces: ['w/24025442'],
};
const FONT = { R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], I: ['111', '010', '010', '010', '010', '010', '111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'], F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'] };

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [];
  const conc = tone(M.concrete, 0xcfc8bc), concD = tone(M.concrete, 0xa8a196), cream = tone(M.stucco, 0xe8dfd2, [221, 209, 184]);
  const transl = tinted(M.windowNight, 0xc3d4df, { roughness: 0.6, metalness: 0.0, emissive: new THREE.Color(0xdde8f2), emissiveIntensity: 0.9 });
  const frame = tinted(M.darkBronze, 0x2f3337), dglass = tinted(M.windowNight, 0x3e464c), grille = tinted(M.blackPaint, 0x2a2d30), letterM = tinted(M.iron, 0x6e6e6e, { metalness: 0.7 });
  const blocks = [ // [u0, v0, u1, v1, top]
    [-37.0, -4.0, 33.2, 30.8, 22.2], [-41.0, -17.0, 33.0, -4.0, 15.0], [-33.4, -32.0, 22.7, -17.0, 10.2], [33.2, -14.6, 45.2, 10.5, 15.5],
  ];
  const facade = (R, y0, top, { colonnade = true } = {}) => {
    const L = R.L, nb = Math.max(1, Math.round(L / 6.5)), bay = L / nb;
    const yC = y0 + 4.2, yW = yC + 3.6; // colonnade top, window band top
    if (colonnade && top > 14) {
      K.rbox(R, M.concreteDark, 0, y0, -3.2, L, yC, -3.0);
      glassBand(K, R, 0, L, y0, yC, { glass: dglass, frame, pitch: 1.6, rec: 2.6, sill: false });
      K.rbox(R, concD, 0, yC - 0.3, -2.6, L, yC, 0.0);
    } else K.rbox(R, conc, 0, y0, -0.3, L, Math.min(top, yC), 0.0);
    if (top > yC + 1) {
      K.rbox(R, conc, 0, yC, -0.3, L, Math.min(top, yW), 0.0);
      for (let i = 0; i < nb; i++) if (top > yC + 2.5) glassBand(K, R, (i + 0.5) * bay - 1.0, (i + 0.5) * bay + 1.0, yC + 1.0, yC + 2.5, { glass: dglass, frame, pitch: 1.0, rec: -0.1 });
    }
    if (top > yW + 2) { K.rbox(R, conc, 0, yW, -0.6, L, top - 0.9, -0.5); for (let i = 0; i < nb; i++) K.rbox(R, transl, i * bay + 0.35, yW + 0.2, -0.5, (i + 1) * bay - 0.35, top - 1.1, -0.42); }
    K.rbox(R, conc, -0.2, top - 0.9, -0.3, L + 0.2, top, 0.1);
    for (let i = 0; i <= nb; i++) { const s = i * bay; K.rbox(R, conc, s - 0.4, y0, -0.3, s + 0.4, top - 0.9, 0.5); }
    return { nb, bay };
  };
  for (const [u0, v0, u1, v1, top] of blocks) {
    K.box(M.concreteDark, u0 + 0.5, -1.5, v0 + 0.5, u1 - 0.5, top - 0.4, v1 - 0.5);
    K.box(concD, u0 + 0.2, top - 0.4, v0 + 0.2, u1 - 0.2, top - 0.2, v1 - 0.2);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, top));
  }
  // façades: only on faces exposed to the outside
  const exposed = [
    [[-37.0, 30.8], [33.2, 30.8], 22.2, true], [[33.2, 30.8], [33.2, 10.5], 22.2, true], [[-37.0, -4.0], [-37.0, 30.8], 22.2, true],
    [[33.2, -4.0], [-37.0, -4.0], 22.2, false], [[45.2, 10.5], [45.2, -14.6], 15.5, true], [[33.2, 10.5], [45.2, 10.5], 15.5, true], [[45.2, -14.6], [33.2, -14.6], 15.5, true],
    [[-41.0, -17.0], [-41.0, -4.0], 15.0, true], [[33.0, -17.0], [22.7, -17.0], 15.0, false], [[-33.4, -17.0], [-41.0, -17.0], 15.0, false],
    [[22.7, -32.0], [-33.4, -32.0], 10.2, false], [[-33.4, -32.0], [-33.4, -17.0], 10.2, false], [[22.7, -17.0], [22.7, -32.0], 10.2, false],
  ];
  let entrance = null;
  for (const [a, b, top, col] of exposed) {
    const R = K.run(a, b); const y0 = Math.min(g(...a), g(...b), g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) - 0.5;
    if (b[1] > 30 && a[1] > 30) entrance = { R, y0 };
    facade(R, y0, top, { colonnade: col });
  }
  // Bancroft entrance portal (cream), lettering, monumental stair
  if (entrance) {
    const { R } = entrance; const s0 = R.L * 0.42, s1 = s0 + 13.0; const gp = g(...R.at((s0 + s1) / 2, 2));
    K.rbox(R, cream, s0 - 1.2, gp - 0.5, -0.2, s0, gp + 7.6, 0.9); K.rbox(R, cream, s1, gp - 0.5, -0.2, s1 + 1.2, gp + 7.6, 0.9); K.rbox(R, cream, s0 - 1.2, gp + 6.2, -0.2, s1 + 1.2, gp + 7.6, 0.9);
    K.rbox(R, cream, s0, gp + 5.6, -3.0, s1, gp + 6.2, 0.9); // portal soffit
    K.rbox(R, M.concreteDark, s0, gp, -3.0, s1, gp + 5.6, -2.8);
    glassBand(K, R, s0 + 0.2, s1 - 0.2, gp, gp + 5.6, { glass: tinted(M.glassLight, 0x4a5560, { opacity: 0.5 }), frame, pitch: 1.3, transoms: [gp + 2.6], rec: 2.4, doors: [0, 1, 2, 3, 4].map((k) => ({ s0: s0 + 1.5 + k * 2.1, s1: s0 + 3.3 + k * 2.1, h: 2.4 })) });
    const text = 'RECREATIONAL SPORTS FACILITY', px = 0.06; let w = 0; for (const ch of text) w += ((FONT[ch]?.[0].length ?? 3) + 1) * px; let s = (s0 + s1) / 2 - w / 2; const yT = gp + 7.3;
    for (const ch of text) { const gl = FONT[ch]; const cw = gl ? gl[0].length : 3; if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < cw; c++) if (gl[r][c] === '1') K.rbox(R, letterM, s + c * px, yT - (r + 1) * px, 0.9, s + (c + 1) * px, yT - r * px, 0.95, { detail: true }); s += (cw + 1) * px; }
    K.rbox(R, grille, s1 + 2.0, gp, 0.0, s1 + 6.0, gp + 3.5, 0.08);
    // exterior stair rising along the façade to the second level
    const n = 24; for (let i = 0; i < n; i++) K.rbox(R, conc, s0 - 3.0 - (i + 1) * 0.32, gp - 0.5, 0.5, s0 - 3.0 - i * 0.32, gp + (i + 1) * 0.17, 2.6);
    pipeRail(K, tinted(M.iron, 0x8a8f92, { metalness: 0.6 }), [R.at(s0 - 3.0, 2.55), R.at(s0 - 3.0 - n * 0.32, 2.55)], (u, v) => gp + 4.1 - Math.hypot(u - R.at(s0 - 3.0, 2.55)[0], v - R.at(s0 - 3.0, 2.55)[1]) * 0.53, { h: 1.0 });
  }
  // rooftop units on the main hall (LiDAR 23–24 m)
  for (const [a0, b0, a1, b1] of [[-26, 7, -18, 16], [20, 7, 26, 16], [0, 18, 6, 22]]) K.box(tinted(M.concrete, 0x8e9194), a0, 22.2, b0, a1, 23.8, b1);
  const object3d = K.finish();
  object3d.name = 'recreational-sports-facility';
  return { object3d, colliders, walkables: [] };
}
