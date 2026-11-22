// Grimes Engineering Center (SOM, 2025): the transformed 1980 Bechtel Engineering Center at the heart of the engineering
// neighbourhood, north-east of Memorial Glade (McLaughlin Hall to the west, Davis Hall abutting the north side, Evans Hall
// to the south-east). Four storeys, 60 ft, read from the plaza as stacked, receding layers:
//  1. the old concrete podium pushed forward (warm greige precast panels, near full-height storefront glazing between piers,
//     a deep precast band with the GRIMES ENGINEERING CENTER letters over the centred entrance) with planters on top;
//  2. a set-back, white-clad, fully glazed storey under a white fascia band;
//  3. the wraparound terrace (white picket rails) and a two-storey glass-and-steel pavilion (floor-to-ceiling glass on slim
//     white mullions, a white floor band, warm wood ceilings), under
//  4. a thin white louvred roof canopy that oversails the glass, most dramatically at the west end.
// Slender white round columns stand outside the glass on a ~8-9 m grid, each with the signature V of two tension rods rising
// from its foot to the canopy beams, a shape-memory-alloy cable sleeve near the top of every rod (18 columns, 36 rods). A white steel stair and a white sign box sit on the west
// (Glade-facing) front and a red-brick stair drops toward the Glade; a low planted strip runs along the flat east side.
// Plan from 2025-26 aerial imagery (canopy ~61 x 34 m, rotated like the old Bechtel outline) plus SOM / Berkeley sources and
// Dave Burk / SOM photos. The packet's 2021 LiDAR shows the old Bechtel and is NOT used for massing.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { grimesMats, strut, pickets, sign } from './lib/grimes-kit.js';

const _A = THREE.MathUtils.degToRad(-15.787), _c = Math.cos(_A), _s = Math.sin(_A);   // building frame (u,v) -> local (x,z)
const _rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [+(u * _c - v * _s).toFixed(2), +(u * _s + v * _c).toFixed(2)]);
export const info = {
  id: 'grimes-engineering-center',
  name: 'Grimes Engineering Center',
  subtitle: 'SOM · 2025',
  blurb: 'SOM transformed the 1980 Bechtel Engineering Center into this student hub by setting a glass-and-steel pavilion on the old concrete base. The V-shaped tension rods around its perimeter carry shape-memory-alloy cables that pull the building back to plumb after an earthquake.',
  replaces: ['w/25079275'],
  // New outline (2025 aerial imagery; landmark-local x,z) replacing the old Bechtel OSM outline for tree hiding and the map,
  // and areas where the 2021 LiDAR trees no longer stand: inside the new base, and the open paving west of it (the two
  // ~26 m trees there are gone in the 2025 imagery), and the re-landscaped strip in front of the west half of the south front
  // (gravel beds and a walk in the 2025 SOM photos where the 2021 LiDAR has three 4-8 m trees).
  footprint: [[-34.9, -7.06], [28.5, -24.96], [39.5, 14.04], [-23.9, 32.04]],
  clear: [_rect(-33.2, -17.8, 35.7, 25.8), _rect(-44.5, -1.0, -33.2, 21.5), _rect(-36.0, 25.8, 6.0, 34.0)],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.787);
  const K = new Kit(ctx, ANG); const M = ctx.M; const G = grimesMats(M);
  const colliders = [], walkables = [];
  // ---- levels (y = 0 is the lowest grade on the old footprint; the plazas around are ~0.0-0.9)
  const P1 = 5.8;    // podium roof = old Bechtel roof (2021 LiDAR top ~6.0 incl. its landscaping) = new level-1 floor
  const TER = 9.9;   // terrace = pavilion lower floor (level 2)
  const F4 = 13.7;   // pavilion upper floor (level 3)
  const RF = 17.5;   // top of pavilion glazing
  const CU = 18.0;   // canopy underside (beams)
  const CT = 18.6;   // canopy top (~61 ft)
  // ---- plan (building frame: u along the long axis ~ESE, v ~SSW-wards, metres)
  const bN = -16.3, bS = 24.0, bW = -29.4, bE = 30.8;   // podium (old Bechtel lower level + south infill)
  const sS = 21.0, sW = -26.4;                          // set-back level-1 faces (south, west); east and north are flush
  const pW = -22.8, pE = 24.3, pN = -6.0, pS = 19.2;    // glass pavilion (south glass ~1.8 m behind the level-1 face, per the SOM south photo)
  const cW = -23.75, cE = 26.1, cN = -7.8, cS = 20.15;  // perimeter column lines (~1-1.8 m outside the glass, ~8.3 m bays)
  const kW = -29.6, kE = 31.4, kN = -10.0, kS = 23.6;   // roof canopy outline
  const gMin = (u0, v0, u1, v1) => K.gMin(u0, v0, u1, v1, 8);
  const quad = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const railCol = (a, b, y0, y1, w = 0.06) => { const nx = b[1] - a[1], nz = a[0] - b[0], L = Math.hypot(nx, nz) || 1; colliders.push(K.colPoly([[a[0] + nx / L * w, a[1] + nz / L * w], [b[0] + nx / L * w, b[1] + nz / L * w], [b[0] - nx / L * w, b[1] - nz / L * w], [a[0] - nx / L * w, a[1] - nz / L * w]], y0, y1)); };
  const bays = (s0, s1, bay, y0, y1, pier = 0.2) => { const n = Math.max(1, Math.round((s1 - s0) / bay)); const bw = (s1 - s0) / n; const ops = []; for (let i = 0; i < n; i++) ops.push({ s0: s0 + bw * i + pier, s1: s0 + bw * (i + 1) - pier, y0, y1, sill: false, fw: 0.07 }); return ops; };
  const glaze = (R, o, frame = G.frame, rev = 0.45) => K.fill(R, o, { rev, glass: G.storeGlass, frame, mull: Math.max(1, Math.round((o.s1 - o.s0) / 1.5) - 1), tran: [o.y1 - 0.7] });

  // =============================== 1. PODIUM ===============================
  K.box(M.concreteDark, bW + 3.7, -1.0, bN + 0.6, bE - 0.6, P1 - 0.3, bS - 1.6);   // interior fill, kept behind the recessed storefronts
  const BAND0 = 3.7;           // underside of the deep precast band over the recessed ground floor
  const PAR = P1 + 0.55;       // band / parapet top (the hedge planters sit on it) (the podium-roof planters sit behind it)
  // Old Bechtel ground floor: square board-formed piers flush with the face, storefront glazing recessed `rec` behind
  // them, and a deep two-row precast band above (panel texture = 3.0 x 1.5 m panels with dark joints).
  const arcade = (a, b, { rec = 1.0, piers, ent = null, top = PAR, corner = 1.5, pw = 0.6, raise = null, bandMat = G.panel, band0 = BAND0, solidTo = 0 }) => {
    const R = K.run(a, b), Ri = K.run(a, b, -rec); const L = R.L;
    const gl = gMin(Math.min(a[0], b[0]) - 0.5, Math.min(a[1], b[1]) - 0.5, Math.max(a[0], b[0]) + 0.5, Math.max(a[1], b[1]) + 0.5);
    const ps = [0, ...piers, L]; const ops = [];
    for (let i = 0; i < ps.length - 1; i++) {
      const s0 = ps[i] + (i === 0 ? corner : pw / 2), s1 = ps[i + 1] - (i === ps.length - 2 ? corner : pw / 2);
      if (s1 - s0 < 0.8 || s1 <= solidTo + 0.5) continue;
      const entry = ent != null && Math.abs((s0 + s1) / 2 - ent) < 1.5;
      ops.push({ s0, s1, y0: entry ? 0.3 : 0.3, y1: band0 - 0.1, sill: false, fw: 0.06, entry });
    }
    K.wall(Ri, G.panel, 0, L, gl - 1.2, band0 + 0.3, ops, 0.3);
    for (const o of ops) {
      if (!o.entry) { K.fill(Ri, o, { rev: 0.18, glass: G.storeGlass, frame: G.frame, mull: Math.max(1, Math.round((o.s1 - o.s0) / 1.5) - 1), tran: [] }); continue; }
      K.rbox(Ri, G.storeGlass, o.s0, o.y0, -0.12, o.s1, o.y1, -0.08);
      for (let i = 0; i <= 4; i++) { const s = o.s0 + (o.s1 - o.s0) * i / 4; K.rbox(Ri, G.frame, s - 0.06, o.y0, -0.1, s + 0.06, o.y1, 0.03); }
      K.rbox(Ri, G.frame, o.s0, o.y0 + 2.45, -0.1, o.s1, o.y0 + 2.57, 0.03);
      K.rbox(R, G.deck, o.s0 - 3, o.y0 - 0.3, -rec, o.s1 + 3, o.y0, 3.0);                  // entry apron under the band
    }
    for (const s of piers) if (s > solidTo + 0.5) K.rbox(R, G.panel, s - pw / 2, gl - 1.2, -pw, s + pw / 2, band0 + 0.05, 0);
    if (solidTo > 0) K.rbox(R, G.panel, 0, gl - 1.2, -rec, solidTo + pw / 2, band0 + 0.05, 0);   // solid old-Bechtel west end
    K.rbox(R, G.panel, 0, gl - 1.2, -rec, corner, band0 + 0.05, 0); K.rbox(R, G.panel, L - corner, gl - 1.2, -rec, L, band0 + 0.05, 0);
    const cut = raise ? raise.s0 : L;
    K.rbox(R, bandMat, -0.02, band0, -rec - 0.05, cut, top, 0.02);                            // deep band (underside = arcade soffit)
    K.rbox(R, G.slab, -0.06, top, -0.45, cut, top + 0.07, 0.06);                              // thin light coping
    if (raise) {   // taller block east of the entrance, band pushed slightly forward
      K.rbox(R, G.panel, raise.s0, band0 - 0.25, -rec - 0.05, L + 0.02, top + raise.h, 0.3);
      K.rbox(R, G.slab, raise.s0 - 0.06, top + raise.h, -0.6, L + 0.06, top + raise.h + 0.07, 0.36);
    }
    return R;
  };
  {
    // south front: recessed storefront between square piers, centred glass entrance under the band
    const R = arcade([bW, bS], [bE, bS], { rec: 1.0, piers: [7.65, 13.8, 19.95, 26.1, 33.1, 41.6, 50.2], ent: 29.6, raise: { s0: 33.4, h: 0.95 }, pw: 0.6 });
    sign(K, R, 'GRIMES ENGINEERING CENTER', 29.6, (BAND0 + PAR) / 2 + 0.05, 0.56, { color: '#2c2f33', metal: 0.2, weight: '600', spacing: 0.14, d: 0.05 });
  }
  { // east face: tall plain concrete wall with a band of storefront at the plaza end (podium + level 2 flush)
    const R = K.run([bE, bS], [bE, bN]); const gl = gMin(bE, bN, bE + 1.5, bS);
    const ops = bays(1.0, 13.0, 6.0, 0.9, 3.6);
    K.wall(R, G.panel, 0, R.L, gl - 1.2, TER - 0.95, ops, 0.45); for (const o of ops) glaze(R, o);
    K.rbox(R, G.metalPanel, -0.15, TER - 0.95, -0.2, R.L + 0.15, TER + 0.18, 0.14);
  }
  const WS = { v0: -16.0, vT: -3.4, vT1: -0.6 };   // west stair stations (north -> south): one straight flight + top landing
  { // west face (toward Memorial Glade): glazing recessed deep under the deck edge, behind square piers
    arcade([bW, bN], [bW, bS], { rec: 3.0, piers: [5.0, 10.5, 16.0, 21.5, 27.0, 32.5], top: P1 + 0.02, pw: 0.6, corner: 1.0, bandMat: G.whitePanel, band0: P1 - 1.2 });
  }
  { const R = K.run([bE, bN], [bW, bN]); K.wall(R, G.panel, 0, R.L, gMin(bW, bN - 1, bE, bN) - 1.2, TER + 0.18, [], 0.45); }
  // podium roof: planters along the south, a deck along the west with a picket guardrail
  K.box(G.panel, bW, P1 - 0.3, sS, bE, P1, bS);
  K.box(G.panel, bW, P1 - 0.3, bN, sW, P1, sS);
  K.box(G.panel, bW + 0.1, P1, bS - 1.15, bE - 0.1, PAR - 0.25, bS - 0.9);                     // planter inner wall
  K.box(G.mulch, bW + 0.25, PAR - 0.3, bS - 1.0, bW + 33.2, PAR - 0.28, bS - 0.15, { detail: true });
  for (let u = bW + 0.9; u < bW + 32.8; u += 1.15) { const ico = new THREE.IcosahedronGeometry(0.42 + ((u * 7.3) % 1) * 0.12, 1); ico.scale(1.15, 0.75, 1); ico.translate(u, PAR + 0.0, bS - 0.58); K.add(G.planting, ico, { detail: true }); }
  K.flat(G.deck, quad(bW, bN + 2.0, sW, sS), P1 + 0.01); K.flat(G.deck, quad(bW, sS, bE, bS - 1.15), P1 + 0.01);
  walkables.push(K.walkPoly([[bW, bN + 2.0], [sW, bN + 2.0], [sW, sS], [bE, sS], [bE, bS], [bW, bS]], P1));
  colliders.push(K.colPoly(quad(bW, bN, bE, bS), -3, P1 - 0.05));
  const podRail = [[[bW + 0.1, bN + 2.0], [bW + 0.1, WS.vT - 0.05]], [[bW + 0.1, WS.vT1 + 0.05], [bW + 0.1, bS - 1.2]]];
  for (const [a, b] of podRail) { pickets(K, G.steel, a, b, P1, 1.07, 0.12); railCol(a, b, P1 - 0.2, P1 + 1.3); }
  railCol([bW + 0.2, bS - 1.15], [bE - 0.2, bS - 1.15], P1 - 0.2, P1 + 1.2);

  // =============================== 2. SET-BACK LEVEL 2 ===============================
  {
    const runs = [{ R: K.run([sW, sS], [bE, sS]), bay: 8.1 }, { R: K.run([sW, bN], [sW, sS]), bay: 8.1, s0: 2.0 }];
    for (const { R, bay, s0 = 0 } of runs) {
      const y0 = P1, yb = TER - 0.42;   // glass runs floor to slab edge; thin (~0.6 m) white slab-edge band above
      K.rbox(R, G.glass, s0, y0, -0.32, R.L, yb, -0.26);
      const n = Math.max(3, Math.round((R.L - s0) / 1.4)); const nb = Math.max(1, Math.round((R.L - s0) / 4.2 / ((R.L - s0) / n)));
      for (let i = 0; i <= n; i++) { const s = s0 + (R.L - s0) * i / n; const big = i % nb === 0; K.rbox(R, G.frame, s - (big ? 0.11 : 0.03), y0, -0.3, s + (big ? 0.11 : 0.03), yb, big ? -0.06 : -0.18, { detail: !big }); }
      K.rbox(R, G.ceiling, s0, yb - 0.02, -3.4, R.L, yb, -0.3);                                      // ceiling read through the glass
      K.rbox(R, G.interiorWall, s0, y0, -3.5, R.L, yb, -3.4);                                         // lit back wall ~3 m in
      K.rbox(R, G.frame, s0, y0, -0.3, R.L, y0 + 0.08, -0.14); K.rbox(R, G.frame, s0, y0 + 2.6, -0.3, R.L, y0 + 2.65, -0.18, { detail: true });
      K.rbox(R, G.metalPanel, -0.15, yb, -0.2, R.L + 0.15, TER + 0.18, 0.16);                  // thin white slab-edge band
    }
        colliders.push(K.colPoly([[sW, bN], [bE, bN], [bE, sS], [sW, sS]], P1 - 0.1, TER - 0.05));
    K.box(M.concreteDark, sW + 3.6, P1, bN + 0.5, bE - 0.5, TER - 0.3, sS - 3.6);
  }

  // =============================== 3. TERRACE + GLASS PAVILION ===============================
  const terPoly = quad(sW, bN, bE, sS);
  const pavPoly = quad(pW, pN, pE, pS);
  K.flat(G.deck, terPoly, TER, [pavPoly]);
  K.box(G.slab, sW, TER - 0.3, bN, bE, TER - 0.02, sS);
  walkables.push(K.walkPoly(terPoly, TER));
  const terRail = [[[sW + 0.12, sS - 0.12], [bE - 0.12, sS - 0.12]], [[bE - 0.12, sS - 0.12], [bE - 0.12, bN + 0.5]], [[sW + 0.12, bN + 0.5], [sW + 0.12, sS - 0.12]]];
  for (const [a, b] of terRail) { pickets(K, G.steel, a, b, TER + 0.18, 1.07, 0.11); railCol(a, b, TER - 0.2, TER + 1.3); }
  for (const [u0, v0, u1, v1] of [[27.6, -2.0, 29.8, 8.0]]) {
    K.box(G.panel, u0, TER, v0, u1, TER + 0.55, v1); K.box(G.planting, u0 + 0.15, TER + 0.55, v0 + 0.15, u1 - 0.15, TER + 0.95, v1 - 0.15, { detail: true });
    colliders.push(K.colPoly(quad(u0, v0, u1, v1), TER, TER + 0.6));
  }
  for (const [u, v] of [[-25.3, -4.5], [-25.3, -1.0], [27.8, -10], [27.8, -6], [-9, -10.5], [-3, -10.5], [9, -10.5], [17, -10.5]]) {
    K.cyl(G.darkFrame, u, TER, v, 0.05, 0.05, 0.72, 6, { detail: true }); K.cyl(G.metalPanel, u, TER + 0.72, v, 0.45, 0.45, 0.04, 12, { detail: true });
  }
  const pRuns = [K.run([pW, pS], [pE, pS]), K.run([pE, pS], [pE, pN]), K.run([pE, pN], [pW, pN]), K.run([pW, pN], [pW, pS])];
  for (const R of pRuns) {
    K.rbox(R, G.glass, 0, TER, -0.06, R.L, RF, -0.03);
    const n = Math.max(2, Math.round(R.L / 1.55)); for (let i = 0; i <= n; i++) { const s = R.L * i / n; K.rbox(R, G.frame, s - 0.03, TER, -0.04, s + 0.03, RF, 0.1, { detail: i % 3 !== 0 }); }
    K.rbox(R, G.frame, 0, TER, -0.04, R.L, TER + 0.08, 0.1, { detail: true });
    K.rbox(R, G.metalPanel, -0.02, F4 - 0.3, -0.1, R.L + 0.02, F4 + 0.22, 0.2);                 // thin white slab-edge band
    K.rbox(R, G.metalPanel, -0.02, RF - 0.05, -0.1, R.L + 0.02, RF + 0.4, 0.2);                  // roof edge band
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
    K.box(G.interiorWall, 14.0, TER, -5.2, 21.5, RF - 0.25, 1.0);
    for (const [u0, v0, u1, v1] of [[-18.0, 10.0, -13.5, 11.2], [-2.0, 13.0, 4.0, 14.2]]) K.box(G.darkFrame, u0, TER, v0, u1, TER + 1.05, v1, { detail: true });
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
      { const cg = new THREE.CylinderGeometry(0.19, 0.19, CU - TER, 16, 1, true); cg.translate(u, TER + (CU - TER) / 2, v); K.add(G.steel, cg, { uvMode: 'keep' }); }
      K.box(G.steel, u - 0.3, TER, v - 0.3, u + 0.3, TER + 0.06, v + 0.3, { detail: true });
      K.box(G.steel, u - 0.24, CU - 0.3, v - 0.24, u + 0.24, CU, v + 0.24, { detail: true });
      colliders.push(K.colCyl(u, v, 0.2, TER - 0.2, CU));
    }
    // SMA tension rods: a V on every column, apex at the column foot on the terrace, the two arms rising in the column
    // plane to the canopy beams about a third of the way toward each neighbouring column (18 columns, 36 rods). Each rod
    // carries a ~1.2 m sleeve of shape-memory-alloy cable near its top.
    const yFoot = TER + 0.35, yTop = CU - 0.05;
    for (let i = 0; i < ring.length; i++) {
      const c = ring[i];
      for (const nb of [ring[(i + ring.length - 1) % ring.length], ring[(i + 1) % ring.length]]) {
        const t = [c[0] + (nb[0] - c[0]) * 0.32, c[1] + (nb[1] - c[1]) * 0.32];
        const p0 = [c[0] + (nb[0] - c[0]) * 0.03, yFoot, c[1] + (nb[1] - c[1]) * 0.03], p1 = [t[0], yTop, t[1]];
        strut(K, G.rod, p0, p1, 0.08, 6);
        const f0 = 0.78, f1 = 0.9; const q = (f) => [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
        strut(K, G.sleeve, q(f0), q(f1), 0.11, 8);
      }
      K.box(G.steel, c[0] - 0.32, TER + 0.06, c[1] - 0.32, c[0] + 0.32, yFoot + 0.12, c[1] + 0.32, { detail: true });   // rod anchor plate
    }
  }

  // =============================== 4. ROOF CANOPY (open louvred lattice) ===============================
  {
    const fasc = (u0, v0, u1, v1) => K.box(G.steel, u0, CT - 0.2, v0, u1, CT + 0.05, v1);   // thin crisp white edge
    fasc(kW, kS - 0.24, kE, kS); fasc(kW, kN, kE, kN + 0.24); fasc(kW, kN, kW + 0.24, kS); fasc(kE - 0.24, kN, kE, kS);
    const beam = (u0, v0, u1, v1, d = CT - CU - 0.05, w = 0.18, mat = G.steel, opts) => { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); K.obox(mat, (u0 + u1) / 2, CT - d / 2, (v0 + v1) / 2, L, d, w, a, opts); };
    // primary grid on the column lines, carried out to the fascia
    // full-depth between the column lines, slimmed to the 0.3 m edge depth over the cantilevers (thin white edge)
    const TH = 0.22;
    for (let k = 0; k <= 6; k++) { const u = cW + (cE - cW) * k / 6; beam(u, cN, u, cS); beam(u, kN, u, cN, TH); beam(u, cS, u, kS, TH); }
    for (let j = 0; j <= 3; j++) { const v = cS + (cN - cS) * j / 3; beam(cW, v, cE, v); beam(kW, v, cW, v, TH); beam(cE, v, kE, v, TH); }
    // (no diagonal corner beams: from the plaza they read as hip lines; the real canopy reads as one flat plane)
    // secondary beams at third points
    for (let k = 0; k < 6; k++) for (const f of [1 / 3, 2 / 3]) { const u = cW + (cE - cW) * (k + f) / 6; beam(u, kN, u, kS, 0.38, 0.1); }
    for (const u of [kW + (cW - kW) / 3, kW + 2 * (cW - kW) / 3, cE + (kE - cE) / 2]) beam(u, kN, u, kS, 0.38, 0.1);
    // louvre blades running perpendicular to the long facades (sky reads through them from the plaza)
    // translucent white soffit veil just under the blades: from the plaza the louvre field reads as one pale, light plane
    { const W = kE - kW - 0.48, D = kS - kN - 0.48; const pg = new THREE.PlaneGeometry(W, D); pg.rotateX(Math.PI / 2); pg.translate((kW + kE) / 2, CT - 0.24, (kN + kS) / 2);
      const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * W / 2.4); K.add(G.slats, pg, { uvMode: 'keep' }); }   // slat lines: 4 slats per 2.4 m
    const n = Math.round((kE - kW) / 0.6);
    for (let i = 1; i < n; i++) { const u = kW + (kE - kW) * i / n; K.box(G.louvre, u - 0.02, CT - 0.22, kN + 0.24, u + 0.02, CT - 0.04, kS - 0.24); }
  }

  // =============================== WEST FRONT: WHITE STAIR + SIGN BOX, BRICK STAIR ===============================
  {
    const u0 = bW - 2.1, u1 = bW - 0.05; const gFoot = Math.max(-0.5, K.g(u0 + 1, WS.v0));
    const flight = (va, vb, ya, yb) => { const n = Math.max(3, Math.round((yb - ya) / 0.165)); const tr = (vb - va) / n;
      for (let i = 0; i < n; i++) { const yy = ya + (yb - ya) * (i + 1) / n; K.box(G.slab, u0, yy - 0.06, va + tr * i, u1, yy, va + tr * (i + 1) + 0.02); K.box(G.steel, u0, yy - 0.22, va + tr * i, u1, yy - 0.06, va + tr * i + 0.04, { detail: true }); }
      const L = Math.hypot(vb - va, yb - ya), a = Math.atan2(yb - ya, vb - va);
      const pl = new THREE.BoxGeometry(u1 - u0, 0.16, L); pl.rotateX(-a); pl.translate((u0 + u1) / 2, (ya + yb) / 2 - 0.34, (va + vb) / 2); K.add(G.metalPanel, pl);   // closed soffit
      const gd = new THREE.BoxGeometry(0.14, 1.7, L); gd.rotateX(-a); gd.translate(u0 - 0.07, (ya + yb) / 2 + 0.25, (va + vb) / 2); K.add(G.metalPanel, gd);    // solid white stringer/guard
      const hr = new THREE.BoxGeometry(0.05, 0.05, L); hr.rotateX(-a); hr.translate(u1 - 0.1, (ya + yb) / 2 + 0.95, (va + vb) / 2); K.add(G.steel, hr, { detail: true }); };
    flight(WS.v0, WS.vT, gFoot, P1);
    K.box(G.slab, u0, P1 - 0.3, WS.vT, u1, P1, WS.vT1); K.box(G.metalPanel, u0 - 0.14, P1 - 0.65, WS.vT, u0, P1 + 1.1, WS.vT1);
    for (const f of [0.45, 0.75]) { const v = WS.v0 + (WS.vT - WS.v0) * f, gg = K.g(u0 + 0.6, v), yy = gFoot + (P1 - gFoot) * f; K.box(G.metalPanel, u0 + 0.75, gg - 0.4, v - 0.15, u0 + 1.05, yy - 0.45, v + 0.15); }   // slim white posts under the flight
    const sp = { gFoot };
    walkables.push(K.walkFn(u0, WS.v0, u1, WS.vT1, (u, v) => {
      if (u < u0 - 0.05 || u > u1 + 0.05 || v < WS.v0 - 0.05 || v > WS.vT1 + 0.05) return null;
      if (v <= WS.vT) return sp.gFoot + (P1 - sp.gFoot) * Math.max(0, (v - WS.v0) / (WS.vT - WS.v0));
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
      walkables.push(K.stairs(G.slab, suBot, sv0, suTop, sv1, yBot, yTop, '+u', ns, { foot: 1.5 }));
      { const rise = (yTop - yBot) / ns, tr = (suTop - suBot) / ns; for (let i = 0; i < ns; i++) { const top = yBot + rise * (i + 1); K.box(G.brick, suBot + tr * i + 0.03, top, sv0 + 0.02, suBot + tr * (i + 1) - 0.01, top + 0.025, sv1 - 0.02); } }   // brick treads, concrete risers
      // sloped board-formed concrete cheek walls (profile in u-y, extruded across v)
      const cheek = (va, vb, ua, ub, ya, yb, mat = G.panel) => { const sh = new THREE.Shape(); const base = Math.min(ya, yb) - 1.4; sh.moveTo(ua, base); sh.lineTo(ua, ya); sh.lineTo(ub, yb); sh.lineTo(ub, base); sh.lineTo(ua, base);
        const eg = new THREE.ExtrudeGeometry(sh, { depth: vb - va, bevelEnabled: false }); eg.translate(0, 0, va); K.add(mat, eg); };
      for (const v of [sv0 - 0.5, sv1]) { cheek(v, v + 0.5, suBot - 0.3, suTop + 0.3, yBot + 0.55, yTop + 0.55); colliders.push(K.colPoly(quad(suBot - 0.3, v, suTop + 0.3, v + 0.5), yBot - 1, yTop + 0.6)); }
      // accessible ramp alongside (south), concrete curb wall + dark steel rail
      const rv0 = sv1 + 0.5, rv1 = sv1 + 2.3, ru0 = suBot - 7.5, ru1 = suTop + 0.3; const yr0 = Math.min(yBot, K.g(ru0 + 0.5, (rv0 + rv1) / 2)), yr1 = yTop;
      cheek(rv0, rv1, ru0, ru1, yr0 + 0.02, yr1 + 0.02, G.slab);
      cheek(rv1, rv1 + 0.3, ru0, ru1, yr0 + 0.4, yr1 + 0.4);
      strut(K, G.darkFrame, [ru0, yr0 + 0.95, rv1 + 0.15], [ru1, yr1 + 0.95, rv1 + 0.15], 0.028, 6, { detail: true });
      for (let i = 0; i <= 8; i++) { const f = i / 8, u = ru0 + (ru1 - ru0) * f, y = yr0 + (yr1 - yr0) * f; K.box(G.darkFrame, u - 0.025, y + 0.4, rv1 + 0.125, u + 0.025, y + 0.95, rv1 + 0.175, { detail: true }); }
      walkables.push(K.walkFn(ru0, rv0, ru1, rv1, (u, v) => (u < ru0 - 0.05 || u > ru1 + 0.05 || v < rv0 - 0.05 || v > rv1 + 0.05) ? null : yr0 + 0.02 + (yr1 - yr0) * (u - ru0) / (ru1 - ru0)));
      colliders.push(K.colPoly(quad(ru0, rv1, ru1, rv1 + 0.3), yr0 - 1, yr1 + 1.1));
      for (const v of [sv0 + 0.4, (sv0 + sv1) / 2, sv1 - 0.4]) strut(K, G.darkFrame, [suBot, yBot + 0.9, v], [suTop, yTop + 0.9, v], 0.025, 5, { detail: true });
    }
  }

  // [r5-audit-north] The old "east sloped walk" (a 3 m wide concrete wedge climbing 5.3 m along the east wall to a blank
  // wall at the NE corner) is gone: the ground along Bechtel Drive is flat (graded terrain 102.0-102.4 m from the SE to
  // the NE corner), so it stood on its own wall like a bridge to nowhere. Photos (SOM / Dave Burk 2025) show the east
  // face meeting the drive's paving directly, with a low planted strip along the wall.
  {
    const u0 = bE + 0.15, u1 = bE + 1.45, v0 = 9.5, v1 = bN + 3.0;   // planted strip along the blank north part of the east wall (the storefront band at the plaza end stays open)
    const g = gMin(u0, v1, u1, v0, 6);
    K.box(G.panel, u0, g - 0.4, v1, u1, g + 0.42, v0);
    K.box(G.mulch, u0 + 0.12, g + 0.38, v1 + 0.12, u1 - 0.12, g + 0.44, v0 - 0.12, { detail: true });
    for (let v = v1 + 0.8; v < v0 - 0.5; v += 1.25) { const r = 0.32 + (((v * 3.1) % 1) + 1) % 1 * 0.16; const ico = new THREE.IcosahedronGeometry(r, 1); ico.scale(1.15, 0.8, 1.05); ico.translate((u0 + u1) / 2, g + 0.44 + r * 0.4, v); K.add(G.planting, ico, { detail: true }); }
    colliders.push(K.colPoly(quad(u0, v1, u1, v0), g - 1, g + 0.5));
  }

  // ============ TERRACED CONCRETE PLANTERS stepping down toward the SW corner ============
  {
    const tiers = [[-35.5, 30.3, -23.5, 33.0, 1.1], [-36.5, 33.1, -27.0, 35.6, 0.8], [-37.5, 35.7, -30.0, 38.0, 0.5]];
    for (const [u0, v0, u1, v1, h] of tiers) {
      const g = K.g((u0 + u1) / 2, (v0 + v1) / 2), top = g + h;
      K.box(G.panel, u0, g - 1.6, v0, u1, top, v1);
      K.box(G.mulch, u0 + 0.22, top - 0.04, v0 + 0.22, u1 - 0.22, top + 0.02, v1 - 0.22, { detail: true });
      for (let u = u0 + 0.75; u < u1 - 0.5; u += 1.05) for (let v = v0 + 0.7; v < v1 - 0.5; v += 1.15) { const r = 0.34 + (((u * 3.7 + v * 1.3) % 1) + 1) % 1 * 0.22; const ico = new THREE.IcosahedronGeometry(r, 1); ico.scale(1.2, 0.75, 1.1); ico.translate(u, top + r * 0.45, v); K.add(G.planting, ico, { detail: true }); }
      colliders.push(K.colPoly(quad(u0, v0, u1, v1), g - 1.6, top + 0.3));
    }
  }

  // =============================== SITE ===============================
  const tree = (u, v, g, h) => { K.cyl(G.darkFrame, u, g, v, 0.07, 0.05, h * 0.55, 6, { detail: true });
    for (const [du, dv, dy, r] of [[0, 0, 0.72, 0.36], [0.6, 0.35, 0.62, 0.26], [-0.5, -0.35, 0.64, 0.26]]) { const ico = new THREE.IcosahedronGeometry(h * r, 1); ico.scale(1, 0.75, 1); ico.translate(u + du, g + h * dy, v + dv); K.add(G.planting, ico, { detail: true }); } };
  for (const [u0, v0, u1, v1, tr] of [[36.0, 18.0, 39.0, 24.0, 1], [6.5, 30.5, 12.5, 32.5, 0]]) {
    const g = gMin(u0, v0, u1, v1); K.box(G.panel, u0, g - 0.5, v0, u1, g + 0.75, v1); K.box(G.mulch, u0 + 0.15, g + 0.75, v0 + 0.15, u1 - 0.15, g + 0.8, v1 - 0.15, { detail: true });
    if (tr) tree((u0 + u1) / 2, (v0 + v1) / 2, g + 0.75, 5.5);
    colliders.push(K.colPoly(quad(u0, v0, u1, v1), g - 1, g + 0.8));
  }
  for (const [u, v] of [[-31.5, -15.0], [-31.5, 6.0], [-4.0, 26.0], [21.0, 26.0], [34.5, 23.5]]) { const g = K.g(u, v); K.cyl(M.blackPaint, u, g, v, 0.07, 0.055, 3.9, 8); K.lathe(M.lampGlow, [[0.06, 0], [0.2, 0.12], [0.22, 0.45], [0.1, 0.62], [0.001, 0.66]], u, g + 3.9, v, 10, { detail: true }); colliders.push(K.colCyl(u, v, 0.12, g - 0.5, g + 4)); }

  const object3d = K.finish(); object3d.name = 'grimes-engineering-center';
  return { object3d, colliders, walkables };
}
