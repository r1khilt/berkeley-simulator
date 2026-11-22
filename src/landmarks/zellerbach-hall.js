// Zellerbach Hall (Vernon DeMars & Donald Hardison, 1968): Cal Performances' 2,000-seat hall on the west side of Lower
// Sproul Plaza. A board-formed concrete lobby frame faces the plaza — four 11 m bays of deep piers, mid-bay fins, tall
// glazed foyer over a recessed colonnade, ZELLERBACH HALL on the fascia, a balcony with a blue rail — wrapped around a
// ribbed red-brick auditorium and a pale concrete fly tower. Massing from the 2021 LiDAR: lobby 15.0 m, auditorium
// 23.5 m, fly tower 31 m (y=0 = lowest ground; Lower Sproul ≈ 3.9 m).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'zellerbach-hall',
  name: 'Zellerbach Hall',
  subtitle: 'DeMars & Hardison · 1968',
  blurb: 'Home of Cal Performances, Zellerbach Hall seats about 2,000 for concerts, dance and theatre. Its concrete-framed glass lobby closes the west side of Lower Sproul Plaza.',
  replaces: ['w/24025430'],
};
const FONT = { Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'] };

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const conc = tone(M.concrete, 0xbdb9b0), fly = tone(M.concrete, 0xc4c1b9);
  const brick = tinted(M.brick, 0xb07060);
  const frame = tinted(M.darkBronze, 0x2a2826);
  const glass = tinted(M.windowNight, 0x3a454c);
  const blue = tinted(M.iron, 0x3d5e8c, { metalness: 0.4, roughness: 0.5 });
  const oak = tinted(M.wood, 0xd6a46a);
  const E = 31.2, N = -21.0, S = 23.3, LB = 15.0;            // lobby east face, north/south faces, lobby roof
  const AU = [-11.8, -17.5, 20.6, 17.5], AT = 23.5;          // auditorium
  const FT = [-28.2, -15.2, -11.8, 16.5], FTT = 31.0;        // fly tower
  const W0 = -30.8;
  const gE = (v) => g(E + 1.5, v);
  const PL = Math.max(gE(N + 2), gE(0), gE(S - 2)); const LF = PL + 0.45; // lobby floor (3 steps above the plaza)
  const SO = PL + 3.7, SB = SO + 0.6, FA = LB - 1.8;          // colonnade soffit, slab band top, fascia bottom (scaled to LiDAR 15.0 m)

  // ---- lobby band (east + north + south) core ----
  K.box(M.concreteDark, AU[2], -1.5, N + 0.4, E - 9.0, LB - 0.3, S - 0.4); K.box(M.concreteDark, E - 9.0, SO, N + 0.4, E - 3.4, LB - 0.3, S - 0.4);
  K.box(M.concreteDark, W0 + 0.4, -1.5, N + 0.4, AU[2], LB - 0.3, AU[1]);
  K.box(M.concreteDark, W0 + 0.4, -1.5, AU[3], AU[2], LB - 0.3, S - 0.4);
  K.box(M.concreteDark, W0 + 0.4, -1.5, AU[1] - 0.2, -5.0, LB - 0.3, FT[1]); K.box(conc, W0, LB - 0.35, AU[1], -5.0, LB, FT[1]);
  K.box(M.concreteDark, W0 + 0.4, -1.5, FT[3], AU[0], LB - 0.3, AU[3] + 0.2); K.box(conc, W0, LB - 0.35, FT[3], AU[0], LB, AU[3]);
  K.box(conc, W0, LB - 0.35, N, E, LB, AU[1] + 0.2); K.box(conc, W0, LB - 0.35, AU[3] - 0.2, E, LB, S); K.box(conc, AU[2] - 0.2, LB - 0.35, N, E, LB, S);
  colliders.push(K.colPoly([[W0, N], [E, N], [E, S], [W0, S]], -2, LB));

  // ---- east (plaza) façade ----
  {
    const R = K.run([E, S], [E, N]); const L = R.L; const nb = 4, bay = L / nb;
    // colonnade floor + steps
    K.rbox(R, conc, 0, PL - 1, -3.2, L, LF, 0.0);
    walkables.push(K.walkPoly([[E - 3.2, N], [E, N], [E, S], [E - 3.2, S]], LF));
    { const p0 = R.at(bay, 0), p1 = R.at(3 * bay, 0.9); walkables.push(K.stairs(conc, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), PL, LF, '-u', 3)); }
    // recessed ground floor: central bays glazed (timber interior), end bays faceted relief walls
    const Rg = K.run([E - 2.8, S], [E - 2.8, N]);
    glassBand(K, Rg, bay, 3 * bay, LF, SO, { glass: tinted(M.glassLight, 0x55606a, { opacity: 0.45 }), frame, pitch: 1.8, transoms: [LF + 2.5], doors: [0.5, 1.5, 2.5].map((k) => ({ s0: bay + k * bay - 0.9, s1: bay + k * bay + 0.9, h: 2.4 })) });
    K.rbox(R, oak, bay, SO - 0.3, -8.9, 3 * bay, SO, -2.9); K.rbox(R, M.lampGlow, bay, SO - 0.35, -8.0, 3 * bay, SO - 0.3, -7.8, { detail: true });
    for (const s of [bay * 1.5, bay * 2.5]) K.rbox(R, oak, s - 1.0, LF, -7.5, s + 1.0, SO - 0.35, -6.5); // open stair cores in the lobby
    for (const [s0, s1] of [[0, bay], [3 * bay, L]]) {
      K.rbox(Rg, conc, s0, LF, -0.3, s1, SO, 0.0);
      let seed = 3 + s0; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 18; i++) { const s = s0 + 0.6 + rnd() * (bay - 2.2), y = LF + 0.4 + rnd() * 2.8, w = 0.6 + rnd() * 1.2; const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(w, 0), new THREE.Vector2(w * (0.2 + rnd() * 0.6), w * (0.5 + rnd() * 0.6))]); const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.06 + rnd() * 0.08, bevelEnabled: false }); tg.translate(s, y, 0); K.addRun(Rg, conc, tg); }
    }
    K.rbox(R, conc, -0.6, SO, -3.0, L + 0.6, SB, 0.3);          // slab band, projecting ledge
    K.rbox(R, conc, -0.6, SB - 0.1, 0.3, L + 0.6, SB, 0.45);
    // upper foyer glass (2 lights per bay, transom at two-thirds), fins, fascia with joints
    for (let i = 0; i < nb * 2; i++) glassBand(K, R, i * bay / 2 + 0.3, (i + 1) * bay / 2 - 0.25, SB, FA, { glass, frame, pitch: 1.25, transoms: [SB + (FA - SB) * 0.66], rec: 0.6 });
    K.rbox(R, oak, 0.4, SB, -1.6, L - 0.4, FA, -1.5);
    K.rbox(R, conc, -0.45, FA, -0.6, L + 0.45, LB + 0.3, 0.0);
    for (let i = 0; i <= nb * 2; i++) { const s = i * bay / 2; if (i % 2) K.rbox(R, conc, s - 0.22, SB, -0.6, s + 0.22, FA, 0.0); K.rbox(R, M.concreteDark, s - 0.02, FA, 0.0, s + 0.02, LB + 0.3, 0.012, { detail: true }); }
    for (let i = 0; i <= nb; i++) { const s = i * bay; K.rbox(R, conc, s - 0.45, PL - 1, -0.9, s + 0.45, LB + 0.3, 0.3); colliders.push(K.colCyl(...R.at(s, -0.3), 0.7, PL - 1, LB)); }
    // ZELLERBACH HALL lettering on the fascia (bay just south of centre)
    { const px = 0.064, text = 'ZELLERBACH HALL'; let s = L / 2 + bay / 2 - (text.length * 6 * px * 1.25) / 2; const yT = LB - 0.35;
      for (const ch of text) { const gl = FONT[ch]; if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === '1') K.rbox(R, frame, s + c * px, yT - (r + 1) * px, 0.0, s + (c + 1) * px, yT - r * px, 0.05, { detail: true }); s += 6 * px * 1.25; } }
    // balcony across the two central-south bays
    const b0 = bay * 0.98, b1 = bay * 3.0 - L / 2 + bay; void b1;
    K.rbox(R, conc, bay, SB - 0.35, 0.3, 2 * bay + bay * 0.98, SB + 1.0, 1.8);
    K.rbox(R, M.concreteDark, bay + 0.15, SB, 0.45, 2 * bay + bay * 0.98 - 0.15, SB + 1.0, 1.65);
    K.rbox(R, blue, bay, SB + 1.45, 1.6, 2 * bay + bay * 0.98, SB + 1.52, 1.78, { detail: true });
    for (let s = bay + 0.1; s < 2 * bay + bay * 0.98; s += 1.8) K.rbox(R, blue, s, SB + 1.0, 1.66, s + 0.05, SB + 1.5, 1.72, { detail: true });
    void b0;
    // flagpoles on the lobby roof behind the fascia
    for (let i = 0; i <= nb; i++) { const p = R.at(i * bay, -1.2); K.cyl(M.iron, p[0], LB, p[1], 0.05, 0.035, 9.5, 6, { detail: true }); }
  }
  // ---- north & south lobby façades: frame continues 2 bays, then board-formed concrete ----
  for (const [a, b] of [[[E, N], [W0, N]], [[W0, S], [E, S]]]) {
    const R = K.run(a, b); const L = R.L; const bay = 11.05; const gmin = Math.min(g(...a), g(...b), g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) - 0.5;
    const fr = a[0] > 0 ? [0, 2 * bay] : [L - 2 * bay, L];
    K.rbox(R, conc, 0, gmin, -0.3, L, LB + 0.3, 0.0);
    for (let k = 0; k < 4; k++) glassBand(K, R, fr[0] + k * bay / 2 + 0.3, fr[0] + (k + 1) * bay / 2 - 0.25, SB, FA, { glass, frame, pitch: 1.25, transoms: [SB + (FA - SB) * 0.66], rec: 0.6 });
    for (let k = 0; k <= 2; k++) K.rbox(R, conc, fr[0] + k * bay - 0.45, gmin, -0.3, fr[0] + k * bay + 0.45, LB + 0.3, 0.6);
    for (let s = 1.2; s < L - 1; s += 1.2) K.rbox(R, M.concreteDark, s - 0.015, gmin + 0.5, 0.0, s + 0.015, LB, 0.01, { detail: true }); // board-form joints
    // r4-sweep: the long side walls read as blank slabs; the lobby fascia band wraps the top (as on the plaza front) and a
    // plain plinth course grounds the base
    K.rbox(R, conc, -0.45, FA, 0.0, L + 0.45, LB + 0.3, 0.45);
    K.rbox(R, M.concreteDark, -0.45, FA - 0.06, 0.0, L + 0.45, FA, 0.4);
    K.rbox(R, conc, 0, gmin, 0.0, L, Math.max(gmin + 0.9, LF - 0.05), 0.18);
  }
  // low covered walkway along the south side (toward the Playhouse)
  { const v0 = S, v1 = S + 2.6, y = g(0, S + 1.3) + 3.2; K.box(conc, W0, y, v0, 8.0, y + 0.35, v1); for (let u = W0 + 2; u < 8; u += 5.5) K.box(conc, u - 0.2, y - 3.5, v1 - 0.6, u + 0.2, y, v1 - 0.2); }
  // ---- west wing (backstage) ----
  { K.box(conc, W0, -1.5, N, FT[0] + 0.2, 12.0, S); K.box(M.concreteDark, FT[0], -1.5, FT[1], FT[0] + 0.5, 9.5, FT[3]); }

  // ---- auditorium: ribbed red brick with a concrete coping ----
  {
    const [a0, b0, a1, b1] = AU;
    K.box(brick, a0, LB - 0.5, b0, a1, AT - 1.0, b1);
    for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]]]) {
      const R = K.run(p, q); for (let s = 0.5; s < R.L; s += 1.0) K.rbox(R, brick, s - 0.16, LB, 0.0, s + 0.16, AT - 1.05, 0.14, { detail: true }); // r4-sweep: ribs 1 m apart, 32 cm wide (0.5 m / 18 cm aliased into streaks)
    }
    K.box(conc, a0 - 0.15, AT - 1.05, b0 - 0.15, a1 + 0.15, AT - 0.85, b1 + 0.15);
    K.hip(conc, a0 - 0.15, b0 - 0.15, a1 + 0.15, b1 + 0.15, AT - 0.85, 0.07);
    K.box(conc, a1 - 1.4, AT, b0 + 1.0, a1 - 0.2, 25.0, b1 - 1.0); // lighting bridge housing at the front (LiDAR 25 m)
  }
  // ---- fly tower: pale board-marked concrete with louvres ----
  {
    const [a0, b0, a1, b1] = FT;
    K.box(fly, a0, LB - 0.5, b0, a1, FTT, b1);
    for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) {
      const R = K.run(p, q); for (let y = LB + 1.2; y < FTT; y += 1.2) K.rbox(R, M.concreteDark, 0, y - 0.015, 0.0, R.L, y + 0.015, 0.01, { detail: true });
      // r4-sweep: louvre bank as a framed recess with stacked blades (was flat dark strips that read as painted on)
      const l0 = R.L / 2 - 3, l1 = R.L / 2 + 3, ly0 = FTT - 3.6, ly1 = FTT - 1.4;
      K.rbox(R, M.concreteDark, l0, ly0, -0.25, l1, ly1, -0.2);
      for (const [a, b, c, d] of [[l0 - 0.25, ly0 - 0.25, l1 + 0.25, ly0], [l0 - 0.25, ly1, l1 + 0.25, ly1 + 0.25], [l0 - 0.25, ly0, l0, ly1], [l1, ly0, l1 + 0.25, ly1]]) K.rbox(R, fly, a, b, -0.25, c, d, 0.12);
      for (let y = ly0 + 0.12; y < ly1 - 0.05; y += 0.2) { K.rbox(R, M.iron, l0, y, -0.2, l1, y + 0.05, 0.02, { detail: true }); K.rbox(R, M.iron, l0, y + 0.05, -0.12, l1, y + 0.09, 0.06, { detail: true }); }
    }
    K.box(conc, a0 - 0.2, FTT - 0.45, b0 - 0.2, a1 + 0.2, FTT + 0.12, b1 + 0.2); // r4-sweep: coping band so the tower top reads finished
    K.box(conc, a0 + 3, FTT, b0 + 4, a0 + 8, FTT + 1.6, b0 + 9);
    colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], LB - 1, FTT));
  }
  const object3d = K.finish();
  object3d.name = 'zellerbach-hall';
  return { object3d, colliders, walkables };
}
