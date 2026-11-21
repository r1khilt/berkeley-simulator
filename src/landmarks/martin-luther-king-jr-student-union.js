// Martin Luther King Jr. Student Union (ASUC Student Union; DeMars & Reay with Donald Hardison, 1961; renovated 2015 by
// Moore Ruble Yudell). A five-level block between Upper Sproul (east) and Lower Sproul (west): on Upper Sproul a deep
// arcade of slender concrete piers shelters the Cal Student Store behind a cantilevered balcony carrying the building's
// name; a giant order of thin white piers with glass and terracotta infill wraps the upper floors; stainless mesh screens
// face Lower Sproul above a two-storey west wing; a solar canopy overhangs the roof. Massing from the 2021 LiDAR:
// main roof ~21.3 m, penthouse 27.6 m, west wing 13.5 / 9.5 m, Bancroft pavilion 8.5 m (y=0 at Lower Sproul).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, slotBand, pipeRail, tinted, tone, TEXAVG } from './lib/b01-kit.js';
import { mlkInterior, fitFloor, MLK_IN } from './lib/int-mlk.js'; // interiors-cafe: enterable Lower Sproul dining room + Cal Student Store frontage

export const info = {
  id: 'martin-luther-king-jr-student-union',
  name: 'Martin Luther King Jr. Student Union',
  subtitle: 'DeMars & Reay · 1961 · renovated 2015',
  blurb: 'The ASUC Student Union, renamed for Martin Luther King Jr. in 1985, houses the Cal Student Store and student organizations between Upper and Lower Sproul Plaza. It was renovated and reclad in 2015 as part of the Lower Sproul redevelopment.',
  replaces: ['w/24025428'],
};

const FONT = { A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], G: ['01110', '10000', '10000', '10111', '10001', '10001', '01110'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'], J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'], K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'], M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], '.': ['0', '0', '0', '0', '0', '0', '1'] };
function letters(K, R, mat, text, sMid, yTop, px, d0 = 0.0) {
  const w = [...text].reduce((a, ch) => a + ((FONT[ch]?.[0].length ?? 3) + 1) * px, 0); let s = sMid - w / 2;
  for (const ch of text) { const gl = FONT[ch]; const cw = gl ? gl[0].length : 3; if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < cw; c++) if (gl[r][c] === '1') K.rbox(R, mat, s + c * px, yTop - (r + 1) * px, d0, s + (c + 1) * px, yTop - r * px, d0 + 0.04, { detail: true }); s += (cw + 1) * px; }
}

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const pierW = M.whitePaint;
  const conc = tone(M.concrete, 0xd2cfc7);
  const terra = tone(M.concrete, 0xb5523b);
  const buff = tone(M.concrete, 0xd8cbb0);
  const board = tone(M.concrete, 0xa8a294);
  const brick = tinted(M.brick, 0x9a6a5e);
  const frame = tinted(M.darkBronze, 0x2b2b2b);
  const alu = tinted(M.iron, 0xb8bbbc, { metalness: 0.7, roughness: 0.35 });
  const mesh = tinted(M.iron, 0x9c9fa0, { metalness: 0.75, roughness: 0.4, transparent: true, opacity: 0.55 });
  const champ = tinted(M.iron, 0xc9b98f, { metalness: 0.7, roughness: 0.4 });
  const blueGlass = tinted(M.windowNight, 0x2c4672);
  const pv = tinted(M.glass, 0x1d2a3d, { metalness: 0.5, roughness: 0.25 });
  const sGlass = tinted(M.glassLight, 0x55666e, { opacity: 0.5 });
  const warm = tinted(M.stucco, 0xe9d2a8);
  const U0 = -14.2, U1 = 25.3, V0 = -31.0, V1 = 28.8, TOP = 21.3, PF = 4.4; // main block; arcade floor (Upper Sproul podium)
  // ---- core ----
  const FLR = fitFloor(K); const NI = MLK_IN; // interiors-cafe: Cal Student Store niche (u U0..nU, v nV0..nV1, below the ceiling)
  K.box(M.concreteDark, NI.nU, -1.5, V0 + 0.4, U1 - 6.95, 18.7, V1 - 0.4);
  K.box(M.concreteDark, U0 + 0.4, -1.5, V0 + 0.4, NI.nU, 18.7, NI.nV0); K.box(M.concreteDark, U0 + 0.4, -1.5, NI.nV1, NI.nU, 18.7, V1 - 0.4);
  K.box(M.concreteDark, U0 + 0.4, NI.ceil + 0.02, NI.nV0, NI.nU, 18.7, NI.nV1); K.box(M.concreteDark, U0 + 0.4, -1.5, NI.nV0, NI.nU, FLR.at(U0) - 0.05, NI.nV1);
  K.box(M.concreteDark, U1 - 7.0, 9.6, V0 + 0.4, U1 - 0.8, 18.7, V1 - 0.4);
  for (const [a0, b0, a1, b1] of [[U0 + 0.4, V0 + 0.4, U1 - 0.4, 15.0], [U0 + 0.4, 23.5, U1 - 0.4, V1 - 0.4], [U0 + 0.4, 15.0, -10.5, 23.5], [-4.5, 15.0, 15.0, 23.5], [21.5, 15.0, U1 - 0.4, 23.5]]) K.box(M.concreteDark, a0, 18.6, b0, a1, TOP - 0.3, b1);
  { const ring = [[U0, NI.nV1], [U0, V1], [U1, V1], [U1, V0], [U0, V0], [U0, NI.nV0]]; // main block walls, open at the store niche (interiors-cafe)
    for (let i = 0; i < ring.length - 1; i++) colliders.push(K.colPoly([ring[i], ring[i + 1]], -2, TOP + 1));
    colliders.push(K.colPoly([[U0, NI.nV0], [U0, NI.nV1]], NI.ceil, TOP + 1)); }
  // roof slab + parapet
  const wells = [[-10.5, 15.0, -4.5, 23.5], [15.0, 15.0, 21.5, 23.5]]; // recessed roof courts (LiDAR 19 m)
  K.box(conc, U0 - 0.1, TOP - 0.35, V0 - 0.1, U1 + 0.1, TOP, 15.0); K.box(conc, U0 - 0.1, TOP - 0.35, 23.5, U1 + 0.1, TOP, V1 + 0.1);
  K.box(conc, U0 - 0.1, TOP - 0.35, 15.0, -10.5, TOP, 23.5); K.box(conc, -4.5, TOP - 0.35, 15.0, 15.0, TOP, 23.5); K.box(conc, 21.5, TOP - 0.35, 15.0, U1 + 0.1, TOP, 23.5);
  for (const [a0, b0, a1, b1] of wells) {
    K.box(M.paving, a0, 18.7, b0, a1, 19.0, b1);
    for (const [a, b] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) { const R = K.run(b, a); glassBand(K, R, 0, R.L, 19.0, TOP - 0.35, { glass: M.windowNight, frame, pitch: 1.5, rec: 0.0 }); }
  }
  for (const [a, b] of [[[U0, V1], [U1, V1]], [[U1, V1], [U1, V0]], [[U1, V0], [U0, V0]], [[U0, V0], [U0, V1]]]) { const R = K.run(a, b); K.rbox(R, M.whitePaint, -0.1, TOP, -0.3, R.L + 0.1, TOP + 0.5, 0.05); }

  // ---- giant-order façade (thin white piers, glass + terracotta infill, floor bands) ----
  const giant = (R, s0, s1, y0, y1, pitch, { floors = [], pattern = (i, f) => (i + f) % 3 === 1 } = {}) => {
    const n = Math.max(1, Math.round((s1 - s0) / pitch)); const p = (s1 - s0) / n;
    const fl = [y0, ...floors, y1];
    for (let i = 0; i < n; i++) for (let f = 0; f < fl.length - 1; f++) {
      const a = s0 + i * p + 0.17, b = s0 + (i + 1) * p - 0.17, ya = fl[f] + (f ? 0.25 : 0), yb = fl[f + 1] - 0.25;
      if (pattern(i, f)) K.rbox(R, terra, a, ya, -0.25, b, yb, -0.12);
      else glassBand(K, R, a, b, ya, yb, { glass: blueGlass, frame, pitch: 1.5, rec: 0.25, sill: false });
    }
    for (const fy of floors) K.rbox(R, conc, s0, fy - 0.25, -0.25, s1, fy + 0.25, -0.05);
    for (let i = 0; i <= n; i++) { const s = s0 + i * p; K.rbox(R, pierW, s - 0.17, y0, -0.3, s + 0.17, y1, 0.45); }
    K.rbox(R, pierW, s0 - 0.17, y1, -0.3, s1 + 0.17, y1 + 0.55, 0.5);
  };

  // ---- EAST (Upper Sproul): deep arcade at plaza grade, thin balcony slab, tall curtained glass behind fins ----
  {
    const R = K.run([U1, V1], [U1, V0]); const L = R.L; const nb = 10, bay = L / nb;
    const gl = (s) => { const p = R.at(s, 1); return g(p[0], p[1]); };
    const PF2 = Math.max(gl(0), gl(L / 2), gl(L)) + 0.12; const SO = PF2 + 4.6; // arcade floor at plaza grade, soffit
    const smooth = tinted(M.whitePaint, 0xd3d1cb), soff = smooth, drape = tinted(M.whitePaint, 0x6f86b8), dbrick = brick;
    K.rbox(R, M.paving, -0.5, PF2 - 1.2, -6.9, L + 0.5, PF2, 0.6);
    walkables.push(K.walkPoly([[U1 - 6.9, V0], [U1 + 0.6, V0], [U1 + 0.6, V1], [U1 - 6.9, V1]], PF2));
    // storefronts 6.5 m back (Cal Student Store), warm interior, dark brick end bays
    const Rs = K.run([U1 - 6.5, V1], [U1 - 6.5, V0]);
    glassBand(K, Rs, bay, L - bay, PF2, SO, { glass: sGlass, frame, pitch: 1.5, transoms: [PF2 + 2.6], doors: [{ s0: L / 2 - 1.5, s1: L / 2 - 0.02, h: 2.4 }, { s0: L / 2 + 0.02, s1: L / 2 + 1.5, h: 2.4 }] });
    K.rbox(Rs, warm, bay, PF2, -0.45, L - bay, SO, -0.42);
    K.rbox(Rs, dbrick, 0, PF2, -0.3, bay, SO, 0.0); K.rbox(Rs, dbrick, L - bay, PF2, -0.3, L, SO, 0.0);
    K.rbox(R, soff, -0.2, SO, -6.6, L + 0.2, SO + 0.25, 0.0); // arcade ceiling
    for (let i = 0; i <= nb; i++) K.rbox(R, soff, i * bay - 0.15, SO - 0.5, -6.5, i * bay + 0.15, SO, 0.0); // transverse downstand beams
    K.rbox(R, soff, 0, SO - 0.5, -0.6, L, SO, -0.3);
    // slim square piers + globe lamps on the inner faces
    for (let i = 0; i <= nb; i++) {
      const s = i * bay; K.rbox(R, smooth, s - 0.3, PF2 - 0.1, -0.3, s + 0.3, SO + 0.6, 0.3);
      if (i > 0 && i < nb) { const p = R.at(s, -0.5); K.lathe(M.lampGlow, [[0.001, -0.15], [0.13, -0.1], [0.15, 0], [0.13, 0.1], [0.001, 0.15]], p[0], PF2 + 3.0, p[1], 10, { detail: true }); }
      colliders.push(K.colCyl(...R.at(s, 0), 0.4, PF2 - 1, SO));
    }
    // north-end stair beside the brick wall
    { const n = 14, p0 = R.at(L - bay + 0.3, -6.2), p1 = R.at(L - bay + 2.1, -6.2 + n * 0.3); }
    // thin balcony slab (0.32 m fascia) cantilevered 1.5 m and past the end bays, light grey picket railing
    const BY = SO + 0.6, ex = 2.0;
    K.rbox(R, smooth, -ex, BY, -0.4, L + ex, BY + 0.32, 1.5);
    letters(K, R, frame, 'MARTIN LUTHER KING JR. STUDENT UNION', 1.0 + 9.6, BY + 0.29, 0.04, 1.5);
    const rail = alu;
    for (let s = -ex + 0.1; s < L + ex; s += 0.12) K.rbox(R, rail, s, BY + 0.32, 1.38, s + 0.022, BY + 1.42, 1.41, { detail: true });
    K.rbox(R, rail, -ex, BY + 1.4, 1.34, L + ex, BY + 1.44, 1.46, { detail: true });
    walkables.push(K.walkPoly([[U1 - 0.4, V0 - ex], [U1 + 1.5, V0 - ex], [U1 + 1.5, V1 + ex], [U1 - 0.4, V1 + ex]], BY + 0.32));
    // tall curtained glass (no spandrels) with free-standing fins every 3 m
    const G0 = BY + 0.32, G1 = TOP - 0.25;
    K.rbox(R, drape, 0.2, G0, -0.75, L - 0.2, G1, -0.7);
    glassBand(K, R, 0, L, G0, G1, { glass: tinted(M.glassLight, 0x3f5596, { opacity: 0.45 }), frame, pitch: 1.5, rec: 0.3 });
    const nf = nb * 2; for (let i = 0; i <= nf; i++) { const s = i * L / nf; K.rbox(R, smooth, s - 0.2, G0, -0.3, s + 0.2, TOP, 0.8); }
  }
  // ---- SOUTH (Bancroft) giant order + Bancroft pavilion ----
  {
    const R = K.run([U0, V1], [U1, V1]);
    const gs = Math.min(g(U0, V1 + 1), g(U1, V1 + 1));
    giant(R, 0, R.L, 9.3, TOP - 0.1, 3.0, { floors: [13.6, 17.4] });
    glassBand(K, R, 0, R.L, gs - 0.5, 9.0, { glass: blueGlass, frame: alu, pitch: 1.45, transoms: [gs + 3.0] });
    K.rbox(R, conc, -0.2, 9.0, -0.3, R.L + 0.2, 9.3, 0.3);
    // single-storey glass pavilion on Bancroft
    const p0 = -11.5, p1 = 21.0, q1 = 37.5, ph = 8.5;
    K.box(M.concreteDark, p0 + 0.3, -1.5, V1, p1 - 0.3, ph - 0.3, q1 - 0.3);
    for (const [a, b] of [[[p0, q1], [p1, q1]], [[p1, q1], [p1, V1]], [[p0, V1], [p0, q1]]]) {
      const Rp = K.run(a, b); const gp = Math.min(g(...a), g(...b)) - 0.5;
      glassBand(K, Rp, 0, Rp.L, gp, ph - 0.9, { glass: sGlass, frame: alu, pitch: 1.45, transoms: [g(...a) + 2.4], doors: Rp.L > 20 ? [{ s0: Rp.L / 2 - 1.0, s1: Rp.L / 2 + 1.0, h: 2.2 }] : [] });
      K.rbox(Rp, warm, 0.3, gp, -0.45, Rp.L - 0.3, ph - 1.0, -0.42);
      K.rbox(Rp, M.whitePaint, -0.15, ph - 0.9, -0.3, Rp.L + 0.15, ph, 0.25);
    }
    K.box(conc, p0, ph - 0.25, V1, p1, ph - 0.05, q1);
    colliders.push(K.colPoly([[p0, V1], [p1, V1], [p1, q1], [p0, q1]], -2, ph));
  }
  // ---- NORTH (toward the Golden Bear terrace) giant order over a brick base ----
  {
    const R = K.run([U1, V0], [U0, V0]);
    giant(R, 0, R.L, 9.3, TOP - 0.1, 3.0, { floors: [13.6, 17.4], pattern: (i, f) => (i + 2 * f) % 4 === 0 });
    slotBand(K, R, 0, R.L - 12.5, Math.min(g(U0, V0 - 1), g(U1, V0 - 1)) - 0.6, 9.0, { mat: brick, back: frame, slotW: 0.6, slotH: 2.6, pitch: 3.0, row: 3.6 });
    K.rbox(R, conc, -0.2, 9.0, -0.3, R.L + 0.2, 9.3, 0.3);
  }
  // ---- WEST (Lower Sproul): mesh screens on fins above a two-storey wing ----
  {
    const R = K.run([U0, V0], [U0, V1]);
    const fins = Math.round(R.L / 1.5);
    K.rbox(R, buff, 0, 9.3, -0.3, R.L, TOP - 0.1, -0.15);
    for (let i = 0; i <= fins; i++) { const s = i * R.L / fins; K.rbox(R, alu, s - 0.04, 9.6, -0.15, s + 0.04, TOP - 0.2, 0.35, { detail: i % 4 !== 0 }); }
    K.rbox(R, mesh, 0.2, 10.2, 0.18, R.L - 0.2, TOP - 0.6, 0.2);
    for (let k = 0; k < 6; k++) { const s0 = 3 + k * 9.4; glassBand(K, R, s0, s0 + 3.0, 13.6, 17.0, { glass: blueGlass, frame, pitch: 1.5, rec: -0.12 }); }
    // west wing: north part 13.5 m, south part 9.5 m with roof terrace
    const w0 = -25.4, wN = -26.0, wM = -4.0, wS = 22.0;
    // interiors-cafe: the wing's Lower Sproul level is a hollow, furnished dining room (lib/int-mlk.js) behind clear glass;
    // doors: west face at v -12.5 and 5.5, south face at u -19.8. Upper floors stay solid.
    const glassIn = tinted(M.glassLight, 0x8a9ba3, { opacity: 0.28 });
    const doorAt = { [wN + '|w']: [-12.5], [wM + '|w']: [5.5], [wM + '|s']: [-19.8] };
    for (const [v0, v1, h] of [[wN, wM, 13.5], [wM, wS, 9.5]]) {
      K.box(M.concreteDark, w0 + 0.3, NI.ceil + 0.02, v0 + 0.3, U0, h - 0.3, v1 - 0.3);
      K.box(M.concreteDark, w0 + 0.3, -1.5, v0 + 0.3, U0, FLR.at(w0) - 0.06, v1 - 0.3);
      K.box(conc, w0 - 0.1, h - 0.35, v0 - 0.1, U0, h, v1 + 0.1);
      for (const [a, b, side] of [[[w0, v0], [w0, v1], 'w'], [[w0, v1], [U0, v1], 's'], [[U0, v0], [w0, v0], 'n']]) {
        const Rw = K.run(a, b); if (Rw.L < 0.5) continue; const gw = Math.min(g(...a), g(...b)) - 0.5;
        const internal = (side === 's' && v1 === wM) || (side === 'n' && v0 === wM);
        const doors = (doorAt[v0 + '|' + side] || []).map((x) => (side === 'w' ? x - v0 : x - w0));
        if (!internal) {
          if (side === 'n') glassBand(K, Rw, 0, Rw.L, gw, 4.6, { glass: blueGlass, frame: alu, pitch: 1.5, transoms: [2.6] });
          else { let s0 = 0; for (const d of doors) { glassBand(K, Rw, s0, d - 1.3, gw, 4.6, { glass: glassIn, frame: alu, pitch: 1.5, transoms: [2.6] }); glassBand(K, Rw, d - 1.3, d + 1.3, 2.62, 4.6, { glass: glassIn, frame: alu, pitch: 1.3 }); s0 = d + 1.3;
              const fyD = FLR.at(side === 'w' ? w0 : Rw.at(d)[0]); K.rbox(Rw, alu, d - 1.32, fyD - 0.04, -0.2, d + 1.32, fyD, 0.05);
              for (const [p0, q0] of [[d - 2.6, d - 1.3], [d + 1.3, d + 2.6]]) { for (const [x0, x1, y0, y1] of [[p0, p0 + 0.06, fyD, 2.6], [q0 - 0.06, q0, fyD, 2.6], [p0, q0, fyD, fyD + 0.12], [p0, q0, 2.52, 2.6]]) K.rbox(Rw, alu, x0, y0, -0.3, x1, y1, -0.25); K.rbox(Rw, glassIn, p0 + 0.06, fyD + 0.12, -0.29, q0 - 0.06, 2.52, -0.26); } }
            glassBand(K, Rw, s0, Rw.L, gw, 4.6, { glass: glassIn, frame: alu, pitch: 1.5, transoms: [2.6] }); }
          K.rbox(Rw, M.whitePaint, -0.1, 4.6, -0.3, Rw.L + 0.1, 5.8, 0.05);
        }
        if (!internal || h > 10) glassBand(K, Rw, 0, Rw.L, 5.8, h - 0.4, { glass: blueGlass, frame, pitch: 1.5, rec: 0.6, transoms: h > 10 ? [9.4] : [] });
        // colliders: outer walls with door gaps (lintel above), the taller north block's face above the south roof
        if (internal) { if (h > 10) colliders.push(K.colPoly([a, b], NI.ceil + 0.1, h)); continue; }
        let s0 = 0; for (const d of doors) { colliders.push(K.colPoly([Rw.at(s0), Rw.at(d - 1.3)], -2, h), K.colPoly([Rw.at(d - 1.3), Rw.at(d + 1.3)], 2.65, h)); s0 = d + 1.3; }
        colliders.push(K.colPoly([Rw.at(s0), Rw.at(Rw.L)], -2, h));
      }
    }
    pipeRail(K, alu, [[w0 + 0.15, wM], [w0 + 0.15, wS - 0.15], [U0, wS - 0.15]], 9.5);
    walkables.push(K.walkPoly([[w0, wM], [U0, wM], [U0, wS], [w0, wS]], 9.5));
    // board-formed concrete terrace at the wing's north end (LiDAR ~5 m), stair down to Lower Sproul
    const tv0 = -33.4; K.box(board, w0, -1.5, tv0, U0, 4.8, wN); K.box(conc, w0 - 0.1, 4.8, tv0 - 0.1, U0, 5.0, wN);
    pipeRail(K, alu, [[w0 + 0.1, wN], [w0 + 0.1, tv0 + 0.1], [U0, tv0 + 0.1]], 5.0);
    walkables.push(K.walkPoly([[w0, tv0], [U0, tv0], [U0, wN], [w0, wN]], 5.0));
    { const gs = g(w0 - 4, (tv0 + wN) / 2), n = Math.max(3, Math.round((5.0 - gs) / 0.17)); walkables.push(K.stairs(conc, w0 - n * 0.3, tv0 + 1.0, w0, tv0 + 4.0, gs, 5.0, '+u', n)); }
    colliders.push(K.colPoly([[w0, tv0], [U0, tv0], [U0, wN], [w0, wN]], -2, 5.0));
  }
  // ---- roof: penthouse, lantern, solar canopy ----
  {
    const pen = tone(M.concrete, 0xc9cbc9);
    K.box(pen, -5.0, TOP, -2.5, 17.0, 27.6, 8.6);
    for (let u = -4.6; u < 16.8; u += 0.35) K.box(M.iron, u, 22.4, -2.58, u + 0.12, 26.8, -2.48, { detail: true });
    K.box(M.concreteDark, 0.5, TOP, 12.0, 14.5, 23.6, 26.5); K.box(conc, 0.3, 23.6, 11.8, 14.7, 24.0, 26.7);
    for (const [a, b] of [[[0.5, 26.5], [14.5, 26.5]], [[14.5, 26.5], [14.5, 12.0]], [[14.5, 12.0], [0.5, 12.0]], [[0.5, 12.0], [0.5, 26.5]]]) { const R = K.run(a, b); glassBand(K, R, 0, R.L, TOP + 0.2, 23.5, { glass: M.windowNight, frame, pitch: 1.2, rec: 0.05 }); }
    // solar canopy: steel frame + panel rows overhanging the main block by 2 m
    const c0 = U0 - 0.3, c1 = U1 + 0.3, d0 = V0 - 0.3, d1 = V1 + 0.3, cy = 21.75;
    for (let v = d0; v <= d1 + 0.01; v += (d1 - d0) / 12) K.box(alu, c0, cy - 0.35, v - 0.08, c1, cy - 0.15, v + 0.08, { detail: true });
    for (let u = c0; u <= c1 + 0.01; u += (c1 - c0) / 8) K.box(alu, u - 0.1, cy - 0.5, d0, u + 0.1, cy - 0.15, d1, { detail: true });
    const segs = (u) => { let s = [[d0, d1]]; const cut = (a, b) => { const n = []; for (const [p, q] of s) { if (b <= p || a >= q) n.push([p, q]); else { if (a > p) n.push([p, a]); if (b < q) n.push([b, q]); } } s = n; };
      if (u > -5.3 && u < 17.3) cut(-2.7, 8.8); if (u > 0.3 && u < 14.7) cut(11.8, 26.7); for (const [a0, b0, a1, b1] of wells) if (u > a0 - 1.2 && u < a1) cut(b0, b1); return s; };
    for (let u = c0 + 0.2; u < c1 - 1.0; u += 1.35) for (const [p, q] of segs(u)) if (q - p > 0.5) K.box(pv, u, cy - 0.12, p, u + 1.1, cy, q);
    for (const [u, v] of [[c0 + 1, d0 + 1], [c1 - 1, d0 + 1], [c0 + 1, d1 - 1], [c1 - 1, d1 - 1], [(c0 + c1) / 2, d0 + 1], [(c0 + c1) / 2, d1 - 1]]) K.box(alu, u - 0.12, TOP, v - 0.12, u + 0.12, cy - 0.3, v + 0.12);
  }
  const object3d = K.finish();
  object3d.name = 'martin-luther-king-jr-student-union';
  // interiors-cafe: furnished, walkable Lower Sproul dining room / food court + Cal Student Store frontage (distance-gated)
  const IN = mlkInterior(ctx, { ANG, floor: FLR, sGlass, frame, alu });
  object3d.add(IN.object3d); colliders.push(...IN.colliders); walkables.push(...IN.walkables);
  return { object3d, colliders, walkables, update: IN.update, ownsCollision: true };
}
