// Grimes Engineering Center (SOM, 2025): the transformed 1980 Bechtel Engineering Center at the heart of the engineering
// neighbourhood, north-east of Memorial Glade (McLaughlin Hall to the west, Davis Hall abutting the north side, Evans Hall
// to the south-east). Four storeys, 60 ft, read from the plaza as stacked, receding layers:
//  1. the old concrete podium pushed forward (warm greige precast panels, near full-height storefront glazing between piers,
//     a deep precast band with the GRIMES ENGINEERING CENTER letters over the centred entrance) with planters on top;
//  2. a set-back, white-clad, fully glazed storey under a white fascia band;
//  3. the wraparound terrace (white picket rails) and a two-storey glass-and-steel pavilion (floor-to-ceiling glass on slim
//     white mullions, a white floor band, warm wood ceilings), under
//  4. a thin white louvred roof canopy that oversails the glass, most dramatically at the west end.
// Slender white round columns stand outside the glass on a ~8 m grid with the signature zig-zag of thin shape-memory-alloy
// rods hanging from the column heads (18 bays, 36 rods). A white steel stair and a white sign box sit on the west
// (Glade-facing) front, a red-brick stair drops toward the Glade, and a sloped walk climbs the east side.
// Plan from 2025-26 aerial imagery (canopy ~61 x 34 m, rotated like the old Bechtel outline) plus SOM / Berkeley sources and
// Dave Burk / SOM photos. The packet's 2021 LiDAR shows the old Bechtel and is NOT used for massing.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { grimesMats, strut, pickets, sign } from './lib/grimes-kit.js';

export const info = {
  id: 'grimes-engineering-center',
  name: 'Grimes Engineering Center',
  subtitle: 'SOM · 2025',
  blurb: 'SOM transformed the 1980 Bechtel Engineering Center into this student hub by setting a glass-and-steel pavilion on the old concrete base. The zig-zag rods around its perimeter carry shape-memory-alloy cables that pull the building back into shape after an earthquake.',
  replaces: ['w/25079275'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.787);
  const K = new Kit(ctx, ANG); const M = ctx.M; const G = grimesMats(M);
  const colliders = [], walkables = [];
  // ---- levels (y = 0 is the lowest grade on the old footprint; the plazas around are ~0.0-0.9)
  const P1 = 4.6;    // podium roof = level 2 floor
  const TER = 8.4;   // terrace = pavilion lower floor
  const F4 = 12.6;   // pavilion upper floor
  const RF = 16.8;   // top of pavilion glazing
  const CU = 17.55;  // canopy underside (beams)
  const CT = 18.2;   // canopy top
  // ---- plan (building frame: u along the long axis ~ESE, v ~SSW-wards, metres)
  const bN = -16.3, bS = 24.0, bW = -29.4, bE = 30.8;   // podium (old Bechtel lower level + south infill)
  const sS = 20.5, sW = -26.4;                          // set-back level-2 faces (south, west); east and north are flush
  const pW = -19.0, pE = 24.3, pN = -6.0, pS = 17.0;    // glass pavilion
  const cW = -20.2, cE = 25.5, cN = -7.2, cS = 18.2;    // perimeter column lines
  const kW = -29.6, kE = 31.4, kN = -10.0, kS = 23.6;   // roof canopy outline
  const gMin = (u0, v0, u1, v1) => K.gMin(u0, v0, u1, v1, 8);
  const quad = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const railCol = (a, b, y0, y1, w = 0.06) => { const nx = b[1] - a[1], nz = a[0] - b[0], L = Math.hypot(nx, nz) || 1; colliders.push(K.colPoly([[a[0] + nx / L * w, a[1] + nz / L * w], [b[0] + nx / L * w, b[1] + nz / L * w], [b[0] - nx / L * w, b[1] - nz / L * w], [a[0] - nx / L * w, a[1] - nz / L * w]], y0, y1)); };
  const bays = (s0, s1, bay, y0, y1, pier = 0.2) => { const n = Math.max(1, Math.round((s1 - s0) / bay)); const bw = (s1 - s0) / n; const ops = []; for (let i = 0; i < n; i++) ops.push({ s0: s0 + bw * i + pier, s1: s0 + bw * (i + 1) - pier, y0, y1, sill: false, fw: 0.07 }); return ops; };
  const glaze = (R, o, frame = G.frame, rev = 0.45) => K.fill(R, o, { rev, glass: G.storeGlass, frame, mull: Math.max(1, Math.round((o.s1 - o.s0) / 1.5) - 1), tran: [o.y1 - 0.7] });

  // =============================== 1. PODIUM ===============================
  K.box(M.concreteDark, bW + 0.6, -1.0, bN + 0.6, bE - 0.6, P1 - 0.3, bS - 0.6);
  const BAND0 = 3.35;
  {
    // south front: storefront bays + centred entrance under the deep precast band
    const R = K.run([bW, bS], [bE, bS]); const gl = gMin(bW, bS, bE, bS + 1.5);
    const ent = { s0: 26.6, s1: 32.6 };
    const ops = [...bays(1.0, 25.4, 4.85, 0.3, BAND0 - 0.1), { ...ent, y0: 0.55, y1: BAND0 - 0.1, sill: false, entry: true }, ...bays(33.8, 59.4, 5.1, 0.45, BAND0 - 0.1)];
    K.wall(R, G.panel, 0, R.L, gl - 1.2, P1, ops, 0.55);
    for (const o of ops) {
      if (!o.entry) { glaze(R, o); continue; }
      K.rbox(R, G.storeGlass, o.s0, o.y0, -0.62, o.s1, o.y1, -0.58);
      for (let i = 0; i <= 4; i++) { const s = o.s0 + (o.s1 - o.s0) * i / 4; K.rbox(R, G.frame, s - 0.06, o.y0, -0.6, s + 0.06, o.y1, -0.48); }
      K.rbox(R, G.frame, o.s0, o.y0 + 2.5, -0.6, o.s1, o.y0 + 2.62, -0.48);
      K.rbox(R, G.deck, o.s0 - 3, o.y0 - 0.3, -0.6, o.s1 + 3, o.y0, 3.5);                   // entry apron
    }
    K.rbox(R, G.panel, -0.2, BAND0, -0.1, R.L + 0.2, P1, 0.12);                               // deep precast band
    sign(K, R, 'GRIMES ENGINEERING CENTER', (ent.s0 + ent.s1) / 2, (BAND0 + P1) / 2 + 0.02, 0.36, { color: '#a99f8e', metal: 0.5, weight: '500', spacing: 0.16, d: 0.14 });
  }
  { // east face: tall plain concrete wall with a band of storefront at the plaza end (podium + level 2 flush)
    const R = K.run([bE, bS], [bE, bN]); const gl = gMin(bE, bN, bE + 1.5, bS);
    const ops = bays(1.0, 13.0, 6.0, 0.9, 3.6);
    K.wall(R, G.panel, 0, R.L, gl - 1.2, TER - 0.95, ops, 0.45); for (const o of ops) glaze(R, o);
    K.rbox(R, G.metalPanel, -0.15, TER - 0.95, -0.2, R.L + 0.15, TER + 0.18, 0.14);
  }
  const WS = { v0: -13.2, vL0: -9.0, vL1: -7.4, vT: -3.4, vT1: -0.6 };   // west stair stations (north -> south)
  { // west face (toward Memorial Glade): storefront behind the stair, glazed entrance to the south
    const R = K.run([bW, bN], [bW, bS]); const gl = gMin(bW - 1.5, bN, bW, bS);
    const s = (v) => v - bN;
    const ops = [...bays(s(-13.0), s(-1.0), 4.0, 0.4, BAND0 - 0.1), ...bays(s(5.0), s(23.0), 4.5, 0.4, BAND0 - 0.1)];
    K.wall(R, G.panel, 0, R.L, gl - 1.2, P1, ops, 0.55); for (const o of ops) glaze(R, o);
    K.rbox(R, G.panel, -0.2, BAND0, -0.1, R.L + 0.2, P1, 0.12);
  }
  { const R = K.run([bE, bN], [bW, bN]); K.wall(R, G.panel, 0, R.L, gMin(bW, bN - 1, bE, bN) - 1.2, TER + 0.18, [], 0.45); }
  // podium roof: planters along the south, a deck along the west with a picket guardrail
  K.box(G.panel, bW, P1 - 0.3, sS, bE, P1, bS);
  K.box(G.panel, bW, P1 - 0.3, bN, sW, P1, sS);
  K.box(G.panel, bW + 0.1, P1, bS - 1.15, bE - 0.1, P1 + 0.55, bS);                           // planter lip
  K.box(G.mulch, bW + 0.25, P1 + 0.5, bS - 1.0, bE - 0.25, P1 + 0.52, bS - 0.15, { detail: true });
  for (let u = bW + 0.9; u < bE - 0.5; u += 1.15) { const ico = new THREE.IcosahedronGeometry(0.42 + ((u * 7.3) % 1) * 0.12, 1); ico.scale(1.15, 0.75, 1); ico.translate(u, P1 + 0.78, bS - 0.58); K.add(G.planting, ico, { detail: true }); }
  K.flat(G.deck, quad(bW, bN + 2.0, sW, sS), P1 + 0.01); K.flat(G.deck, quad(bW, sS, bE, bS - 1.15), P1 + 0.01);
  walkables.push(K.walkPoly([[bW, bN + 2.0], [sW, bN + 2.0], [sW, sS], [bE, sS], [bE, bS], [bW, bS]], P1));
  colliders.push(K.colPoly(quad(bW, bN, bE, bS), -3, P1 - 0.05));
  const podRail = [[[bW + 0.1, bN + 2.0], [bW + 0.1, WS.vT - 0.05]], [[bW + 0.1, WS.vT1 + 0.05], [bW + 0.1, bS - 1.2]]];
  for (const [a, b] of podRail) { pickets(K, G.steel, a, b, P1, 1.07, 0.12); railCol(a, b, P1 - 0.2, P1 + 1.3); }
  railCol([bW + 0.2, bS - 1.15], [bE - 0.2, bS - 1.15], P1 - 0.2, P1 + 1.2);

  // =============================== 2. SET-BACK LEVEL 2 ===============================
  {
    const runs = [{ R: K.run([sW, sS], [bE, sS]), bay: 4.3 }, { R: K.run([sW, bN], [sW, sS]), bay: 4.3, s0: 2.0 }];
    for (const { R, bay, s0 = 0 } of runs) {
      const y0 = P1, y1 = TER - 0.95;
      const ops = bays(s0 + 0.3, R.L - 0.3, bay, y0 + 0.1, y1 - 0.08, 0.3);
      K.wall(R, G.metalPanel, 0, R.L, y0 - 0.05, y1, ops, 0.4);
      for (const o of ops) K.fill(R, o, { rev: 0.32, glass: G.storeGlass, frame: G.frame, mull: 2, tran: [o.y1 - 0.6] });
      K.rbox(R, G.metalPanel, -0.15, TER - 0.95, -0.2, R.L + 0.15, TER + 0.18, 0.16);           // white fascia band
    }
    sign(K, runs[0].R, 'Grimes Engineering Center', runs[0].R.L - 10.5, TER - 0.42, 0.32, { color: '#5b5e60', metal: 0.3, spacing: 0.04, d: 0.18 });
    colliders.push(K.colPoly([[sW, bN], [bE, bN], [bE, sS], [sW, sS]], P1 - 0.1, TER - 0.05));
    K.box(M.concreteDark, sW + 0.5, P1, bN + 0.5, bE - 0.5, TER - 0.3, sS - 0.5);
  }

  // =============================== 3. TERRACE + GLASS PAVILION ===============================
  const terPoly = quad(sW, bN, bE, sS);
  const pavPoly = quad(pW, pN, pE, pS);
  K.flat(G.deck, terPoly, TER, [pavPoly]);
  K.box(G.slab, sW, TER - 0.3, bN, bE, TER - 0.02, sS);
  walkables.push(K.walkPoly(terPoly, TER));
  const terRail = [[[sW + 0.12, sS - 0.12], [bE - 0.12, sS - 0.12]], [[bE - 0.12, sS - 0.12], [bE - 0.12, bN + 0.5]], [[sW + 0.12, bN + 0.5], [sW + 0.12, sS - 0.12]]];
  for (const [a, b] of terRail) { pickets(K, G.steel, a, b, TER + 0.18, 1.07, 0.11); railCol(a, b, TER - 0.2, TER + 1.3); }
  for (const [u0, v0, u1, v1] of [[-13.0, -14.8, -3.0, -12.8], [4.0, -14.8, 14.0, -12.8], [-25.4, 6.0, -23.0, 14.0], [27.6, -2.0, 29.8, 8.0]]) {
    K.box(G.panel, u0, TER, v0, u1, TER + 0.55, v1); K.box(G.planting, u0 + 0.15, TER + 0.55, v0 + 0.15, u1 - 0.15, TER + 0.95, v1 - 0.15, { detail: true });
    colliders.push(K.colPoly(quad(u0, v0, u1, v1), TER, TER + 0.6));
  }
  for (const [u, v] of [[-23.5, -3], [-23.5, 1.5], [-21.5, -0.8], [27.8, -10], [27.8, -6], [-9, -10.5], [-3, -10.5], [9, -10.5], [17, -10.5], [0, 19.2], [6, 19.2], [12, 19.2]]) {
    K.cyl(G.darkFrame, u, TER, v, 0.05, 0.05, 0.72, 6, { detail: true }); K.cyl(G.metalPanel, u, TER + 0.72, v, 0.45, 0.45, 0.04, 12, { detail: true });
  }
  const pRuns = [K.run([pW, pS], [pE, pS]), K.run([pE, pS], [pE, pN]), K.run([pE, pN], [pW, pN]), K.run([pW, pN], [pW, pS])];
  for (const R of pRuns) {
    K.rbox(R, G.glass, 0, TER, -0.06, R.L, RF, -0.03);
    const n = Math.max(2, Math.round(R.L / 1.55)); for (let i = 0; i <= n; i++) { const s = R.L * i / n; K.rbox(R, G.frame, s - 0.035, TER, -0.04, s + 0.035, RF, 0.12, { detail: i % 3 !== 0 }); }
    for (const y of [TER + 3.05, F4 + 3.05]) K.rbox(R, G.frame, 0, y - 0.03, -0.04, R.L, y + 0.03, 0.1, { detail: true });
    K.rbox(R, G.frame, 0, TER, -0.04, R.L, TER + 0.08, 0.1, { detail: true });
    K.rbox(R, G.metalPanel, -0.02, F4 - 0.55, -0.1, R.L + 0.02, F4 + 0.45, 0.24);                // white floor band
    K.rbox(R, G.metalPanel, -0.02, RF - 0.05, -0.1, R.L + 0.02, RF + 0.55, 0.24);                // roof edge band
  }
  K.box(G.slab, pW - 0.1, RF + 0.1, pN - 0.1, pE + 0.1, RF + 0.5, pS + 0.1);                    // pavilion roof
  colliders.push(K.colPoly(pavPoly, TER - 0.5, CT));
  { // interior read through the glass (glows at night)
    const ip = quad(pW + 0.15, pN + 0.15, pE - 0.15, pS - 0.15);
    const voidH = quad(-6.0, -2.5, 10.0, 9.5);
    K.prism(G.slab, ip, F4 - 0.45, F4 - 0.05, undefined, [voidH]);
    K.flat(G.ceiling, ip, F4 - 0.46, [voidH], true);
    K.flat(G.ceiling, ip, RF - 0.25, [], true);
    K.flat(G.deck, ip, F4 - 0.04, [voidH]);
    for (const [u0, v0, u1, v1] of [[14.0, -5.2, 21.5, 1.0], [-18.0, 8.0, -13.5, 16.0], [-2.0, 12.5, 4.0, 16.4]]) K.box(G.interiorWall, u0, TER, v0, u1, RF - 0.25, v1);
    for (let i = 0; i < 14; i++) { const t = i / 14; K.box(G.steel, -4.5 + t * 7.0, TER + (F4 - TER) * t - 0.05, 8.0, -4.5 + t * 7.0 + 0.55, TER + (F4 - TER) * t + 0.25, 9.4, { detail: true }); }
    for (let u = pW + 3; u < pE - 3; u += 4.5) for (const [v, y] of [[pS - 1.6, TER], [pS - 1.6, F4], [pN + 1.6, F4], [pN + 1.6, TER]]) { K.box(G.metalPanel, u - 1.2, y + 0.72, v - 0.45, u + 1.2, y + 0.76, v + 0.45, { detail: true }); K.box(G.darkFrame, u - 0.05, y, v - 0.05, u + 0.05, y + 0.72, v + 0.05, { detail: true }); }
  }

  // ===================== COLUMNS + SHAPE-MEMORY-ALLOY ROD ZIG-ZAG =====================
  {
    const ring = [];
    for (let k = 0; k <= 6; k++) ring.push([cW + (cE - cW) * k / 6, cS]);
    for (let j = 1; j <= 2; j++) ring.push([cE, cS + (cN - cS) * j / 3]);
    for (let k = 6; k >= 0; k--) ring.push([cW + (cE - cW) * k / 6, cN]);
    for (let j = 1; j <= 2; j++) ring.push([cW, cN + (cS - cN) * j / 3]);
    for (const [u, v] of ring) {
      { const cg = new THREE.CylinderGeometry(0.21, 0.21, CU - TER, 20, 1, true); cg.translate(u, TER + (CU - TER) / 2, v); K.add(G.steel, cg, { uvMode: 'keep' }); }
      K.box(G.steel, u - 0.34, TER, v - 0.34, u + 0.34, TER + 0.06, v + 0.34, { detail: true });
      K.box(G.steel, u - 0.3, CU - 0.4, v - 0.3, u + 0.3, CU, v + 0.3, { detail: true });
      colliders.push(K.colCyl(u, v, 0.25, TER - 0.2, CU));
    }
    // V hangers: from each column head down to mid-bay at the upper floor band (one V per bay, 36 rods in all)
    const yTop = CU - 0.25, yLow = F4 - 0.05;
    const cu = (cW + cE) / 2, cv = (cN + cS) / 2;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const horiz = Math.abs(a[1] - b[1]) < 0.01; const node = horiz ? [m[0], m[1] + (m[1] > cv ? -0.95 : 0.95)] : [m[0] + (m[0] > cu ? -0.95 : 0.95), m[1]];
      strut(K, G.rod, [a[0], yTop, a[1]], [node[0], yLow, node[1]], 0.05, 6);
      strut(K, G.rod, [b[0], yTop, b[1]], [node[0], yLow, node[1]], 0.05, 6);
      K.cyl(G.rod, node[0], yLow, node[1], 0.08, 0.08, 0.7, 8, { detail: true });               // SMA fuse housing at the node
    }
  }

  // =============================== 4. ROOF CANOPY (open louvred lattice) ===============================
  {
    const fasc = (u0, v0, u1, v1) => K.box(G.steel, u0, CU + 0.15, v0, u1, CT + 0.05, v1);
    fasc(kW, kS - 0.24, kE, kS); fasc(kW, kN, kE, kN + 0.24); fasc(kW, kN, kW + 0.24, kS); fasc(kE - 0.24, kN, kE, kS);
    const beam = (u0, v0, u1, v1, d = CT - CU - 0.05, w = 0.18, mat = G.steel, opts) => { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); K.obox(mat, (u0 + u1) / 2, CT - d / 2, (v0 + v1) / 2, L, d, w, a, opts); };
    // primary grid on the column lines, carried out to the fascia
    for (let k = 0; k <= 6; k++) { const u = cW + (cE - cW) * k / 6; beam(u, kN, u, kS); }
    for (let j = 0; j <= 3; j++) { const v = cS + (cN - cS) * j / 3; beam(kW, v, kE, v); }
    beam(cE, cS, kE, kS); beam(cW, cS, kW, kS); beam(cE, cN, kE, kN); beam(cW, cN, kW, kN);
    // secondary beams at third points
    for (let k = 0; k < 6; k++) for (const f of [1 / 3, 2 / 3]) { const u = cW + (cE - cW) * (k + f) / 6; beam(u, kN, u, kS, 0.38, 0.1); }
    for (const u of [kW + (cW - kW) / 3, kW + 2 * (cW - kW) / 3, cE + (kE - cE) / 2]) beam(u, kN, u, kS, 0.38, 0.1);
    // louvre blades running perpendicular to the long facades (sky reads through them from the plaza)
    const n = Math.round((kE - kW) / 0.6);
    for (let i = 1; i < n; i++) { const u = kW + (kE - kW) * i / n; K.box(G.louvre, u - 0.028, CT - 0.3, kN + 0.24, u + 0.028, CT - 0.04, kS - 0.24); }
  }

  // =============================== WEST FRONT: WHITE STAIR + SIGN BOX, BRICK STAIR ===============================
  {
    const u0 = bW - 2.1, u1 = bW - 0.05; const gFoot = Math.max(-0.5, K.g(u0 + 1, WS.v0));
    const yMid = (gFoot + P1) / 2;
    const flight = (va, vb, ya, yb) => { const n = Math.max(3, Math.round((yb - ya) / 0.165)); const tr = (vb - va) / n;
      for (let i = 0; i < n; i++) { const yy = ya + (yb - ya) * (i + 1) / n; K.box(G.slab, u0, yy - 0.06, va + tr * i, u1, yy, va + tr * (i + 1) + 0.02); K.box(G.steel, u0, yy - 0.22, va + tr * i, u1, yy - 0.06, va + tr * i + 0.04, { detail: true }); }
      const L = Math.hypot(vb - va, yb - ya), a = Math.atan2(yb - ya, vb - va);
      const pl = new THREE.BoxGeometry(u1 - u0, 0.16, L); pl.rotateX(-a); pl.translate((u0 + u1) / 2, (ya + yb) / 2 - 0.34, (va + vb) / 2); K.add(G.metalPanel, pl);   // closed soffit
      const gd = new THREE.BoxGeometry(0.14, 1.7, L); gd.rotateX(-a); gd.translate(u0 - 0.07, (ya + yb) / 2 + 0.25, (va + vb) / 2); K.add(G.metalPanel, gd);    // solid white stringer/guard
      const hr = new THREE.BoxGeometry(0.05, 0.05, L); hr.rotateX(-a); hr.translate(u1 - 0.1, (ya + yb) / 2 + 0.95, (va + vb) / 2); K.add(G.steel, hr, { detail: true }); };
    flight(WS.v0, WS.vL0, gFoot, yMid); flight(WS.vL1, WS.vT, yMid, P1);
    K.box(G.slab, u0, yMid - 0.3, WS.vL0, u1, yMid, WS.vL1); K.box(G.metalPanel, u0 - 0.14, yMid - 0.65, WS.vL0, u0, yMid + 1.1, WS.vL1);
    K.box(G.slab, u0, P1 - 0.3, WS.vT, u1, P1, WS.vT1); K.box(G.metalPanel, u0 - 0.14, P1 - 0.65, WS.vT, u0, P1 + 1.1, WS.vT1);
    { const v = (WS.vL0 + WS.vL1) / 2, gg = K.g(u0 + 0.6, v); K.box(G.metalPanel, u0 + 0.2, gg - 0.4, v - 0.25, u0 + 1.0, yMid - 0.3, v + 0.25); }
    const sp = { gFoot, yMid };
    walkables.push(K.walkFn(u0, WS.v0, u1, WS.vT1, (u, v) => {
      if (u < u0 - 0.05 || u > u1 + 0.05 || v < WS.v0 - 0.05 || v > WS.vT1 + 0.05) return null;
      if (v <= WS.vL0) return sp.gFoot + (sp.yMid - sp.gFoot) * Math.max(0, (v - WS.v0) / (WS.vL0 - WS.v0));
      if (v <= WS.vL1) return sp.yMid;
      if (v <= WS.vT) return sp.yMid + (P1 - sp.yMid) * (v - WS.vL1) / (WS.vT - WS.vL1);
      return P1; }));
    railCol([u0 - 0.1, WS.v0], [u0 - 0.1, WS.vT1], -2, P1 + 1.2);
    // low white sign box at the stair head, just below the deck guardrail
    const bx = { v0: WS.vT1 + 0.3, v1: WS.vT1 + 4.8 };
    K.box(G.metalPanel, bW - 1.4, P1 - 1.45, bx.v0, bW + 0.05, P1 + 1.07, bx.v1);
    const RB = K.run([bW - 1.4, bx.v0], [bW - 1.4, bx.v1]);
    sign(K, RB, 'Grimes Engineering Center', RB.L / 2, P1 - 0.1, 0.27, { color: '#3d3f41', metal: 0.2, spacing: 0.03 });
    colliders.push(K.colPoly(quad(bW - 1.4, bx.v0, bW + 0.05, bx.v1), -2, P1 + 1.1));
    // red-brick landscape stair down toward the Glade (south-west), concrete cheek walls, black handrails
    const sv0 = 22.6, sv1 = 29.4, suTop = -36.6, suBot = -45.0; const yTop = K.g(suTop + 0.5, (sv0 + sv1) / 2), yBot = K.g(suBot - 0.5, (sv0 + sv1) / 2);
    if (yTop - yBot > 0.45) {
      const ns = Math.round((yTop - yBot) / 0.15);
      walkables.push(K.stairs(G.brick, suBot, sv0, suTop, sv1, yBot, yTop, '-u', ns, { foot: 1.5 }));
      for (const v of [sv0 - 0.5, sv1]) { K.box(G.panel, suBot - 0.3, yBot - 1.0, v, suTop + 0.3, yTop + 1.0, v + 0.5); colliders.push(K.colPoly(quad(suBot - 0.3, v, suTop + 0.3, v + 0.5), yBot - 1, yTop + 1)); }
      for (const v of [sv0 + 0.4, (sv0 + sv1) / 2, sv1 - 0.4]) strut(K, G.darkFrame, [suBot, yBot + 0.9, v], [suTop, yTop + 0.9, v], 0.025, 5, { detail: true });
    }
  }

  // ===================== EAST SLOPED WALK (plaza -> level-2 entry at the north-east) =====================
  {
    const u0 = bE + 0.05, u1 = bE + 3.1, vLo = bS - 1.0, vHi = -12.0; const yLo = Math.max(K.g(u1, vLo), 0.3), yHi = P1;
    const sh = new THREE.Shape(); const gb = gMin(u0, vHi, u1, vLo) - 1.0;
    sh.moveTo(vLo, gb); sh.lineTo(vLo, yLo); sh.lineTo(vHi, yHi); sh.lineTo(vHi, gb); sh.lineTo(vLo, gb);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: u1 - u0, bevelEnabled: false });
    eg.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, u0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    K.add(G.panel, eg);
    const L = Math.hypot(vLo - vHi, yHi - yLo), a = Math.atan2(yHi - yLo, vLo - vHi);
    const pw = new THREE.BoxGeometry(0.3, 0.9, L); pw.rotateX(a); pw.translate(u1 + 0.15, (yHi + yLo) / 2 + 0.45, (vLo + vHi) / 2); K.add(G.panel, pw);
    const tr = new THREE.BoxGeometry(0.07, 0.07, L); tr.rotateX(a); tr.translate(u1 + 0.15, (yHi + yLo) / 2 + 1.1, (vLo + vHi) / 2); K.add(G.steel, tr, { detail: true });
    walkables.push(K.walkFn(u0, vHi, u1, vLo, (u, v) => (u < u0 - 0.05 || u > u1 + 0.05 || v < vHi - 0.05 || v > vLo + 0.05) ? null : yLo + (yHi - yLo) * (vLo - v) / (vLo - vHi)));
    colliders.push(K.colPoly(quad(u1, vHi, u1 + 0.3, vLo), -2, yHi + 1.2));
  }

  // =============================== SITE ===============================
  const tree = (u, v, g, h) => { K.cyl(G.darkFrame, u, g, v, 0.07, 0.05, h * 0.55, 6, { detail: true });
    for (const [du, dv, dy, r] of [[0, 0, 0.72, 0.36], [0.6, 0.35, 0.62, 0.26], [-0.5, -0.35, 0.64, 0.26]]) { const ico = new THREE.IcosahedronGeometry(h * r, 1); ico.scale(1, 0.75, 1); ico.translate(u + du, g + h * dy, v + dv); K.add(G.planting, ico, { detail: true }); } };
  for (const [u0, v0, u1, v1, tr] of [[36.0, 18.0, 39.0, 24.0, 1], [8.0, 30.5, 15.0, 32.5, 1], [-12.0, 30.5, -5.0, 32.5, 1]]) {
    const g = gMin(u0, v0, u1, v1); K.box(G.panel, u0, g - 0.5, v0, u1, g + 0.75, v1); K.box(G.mulch, u0 + 0.15, g + 0.75, v0 + 0.15, u1 - 0.15, g + 0.8, v1 - 0.15, { detail: true });
    if (tr) tree((u0 + u1) / 2, (v0 + v1) / 2, g + 0.75, 5.5);
    colliders.push(K.colPoly(quad(u0, v0, u1, v1), g - 1, g + 0.8));
  }
  for (const [u, v] of [[-31.5, -15.0], [-31.5, 6.0], [-4.0, 26.0], [21.0, 26.0], [34.5, 23.5]]) { const g = K.g(u, v); K.cyl(M.blackPaint, u, g, v, 0.07, 0.055, 3.9, 8); K.lathe(M.lampGlow, [[0.06, 0], [0.2, 0.12], [0.22, 0.45], [0.1, 0.62], [0.001, 0.66]], u, g + 3.9, v, 10, { detail: true }); colliders.push(K.colCyl(u, v, 0.12, g - 0.5, g + 4)); }

  const object3d = K.finish(); object3d.name = 'grimes-engineering-center';
  return { object3d, colliders, walkables };
}
