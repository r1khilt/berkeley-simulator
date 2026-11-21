// Grimes Engineering Center (SOM, 2025): the transformed 1980 Bechtel Engineering Center at the heart of the engineering
// neighbourhood, north-east of Memorial Glade. The old Brutalist concrete base (half-sunken, precast-panel walls, glazed
// storefronts) carries a wraparound terrace with white picket rails; on it stands a two-storey glass-and-steel pavilion
// (floor-to-ceiling glazing on slim white mullions, a white floor band between storeys) under a thin, flat white roof
// canopy whose louvred perimeter cantilevers 4-7 m past the glass. Slender white round columns stand outside the glass on an
// 8 m grid, linked by the signature zig-zag of thin shape-memory-alloy tension rods (one V per bay, 36 rods in all).
// A clerestory skylight box rises from the canopy over the three-storey Shyh Wang Forum; a white steel stair climbs the
// south face to the terrace and a sloped walk rises along the east side.
// Plan from 2025-26 aerial imagery (canopy ~61 x 37 m, rotated like the old Bechtel outline) and SOM / Berkeley sources:
// 4 storeys, 60 ft, 82,880 gsf. The 2021 LiDAR in the packet shows the old Bechtel and is NOT used for massing.
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
  // ---- levels (y = 0 is the lowest grade on the old footprint; the south plaza is ~0.0-0.9)
  const TER = 6.0;   // terrace on the old base = pavilion level 2 floor
  const F4 = 10.4;   // pavilion upper floor
  const RF = 14.6;   // top of pavilion glazing
  const CU = 15.35;  // canopy underside (beams)
  const CT = 16.0;   // canopy top
  // ---- plan (building frame: u along the long axis ~ESE, v ~SSW-wards, metres)
  const bN = -16.3, bS = 24.0, bW = -29.4, bE = 30.8;   // concrete base (old Bechtel + south infill)
  const pW = -21.6, pE = 24.3, pN = -6.5, pS = 20.0;    // glass pavilion
  const cW = -22.8, cE = 25.5, cN = -7.7, cS = 21.2;    // perimeter column lines (8.05 m bays on the long sides)
  const kW = -29.6, kE = 31.4, kN = -10.5, kS = 26.8;   // roof canopy outline
  const gMin = (u0, v0, u1, v1) => K.gMin(u0, v0, u1, v1, 8);

  // =============================== BASE ===============================
  const basePoly = [[bW, bN], [bE, bN], [bE, bS], [bW, bS]];
  // storefront helper on a run: glazed bays between precast piers
  const storefront = (R, s0, s1, y0, y1, bay = 6.2, opt = {}) => {
    const n = Math.max(1, Math.round((s1 - s0) / bay)); const bw = (s1 - s0) / n; const ops = [];
    for (let i = 0; i < n; i++) ops.push({ s0: s0 + bw * i + (opt.pier ?? 0.45), s1: s0 + bw * (i + 1) - (opt.pier ?? 0.45), y0, y1, sill: false, fw: 0.08 });
    return ops;
  };
  const faces = [];
  { // south face (west -> east), the Memorial Glade side
    const R = K.run([bW, bS], [bE, bS]); const gl = gMin(bW, bS, bE, bS + 1.5);
    const ops = [];
    ops.push(...storefront(R, 2.0, 16.5, 0.35, 3.7, 4.8));                        // behind the exterior stair
    ops.push({ s0: 27.6, s1: 41.0, y0: 0.6, y1: 4.5, sill: false, entry: true });   // main entrance glazing
    ops.push(...storefront(R, 42.5, 59.2, 0.7, 4.3, 5.6));                          // east storefronts
    faces.push({ R, gl, ops });
  }
  { // east face (south -> north)
    const R = K.run([bE, bS], [bE, bN]); const gl = gMin(bE, bN, bE + 1.5, bS);
    faces.push({ R, gl, ops: storefront(R, 1.5, 18.5, 0.9, 3.9, 5.7) });
  }
  { // west face (north -> south)
    const R = K.run([bW, bN], [bW, bS]); const gl = gMin(bW - 1.5, bN, bW, bS);
    faces.push({ R, gl, ops: storefront(R, 14.0, 38.5, 0.5, 3.9, 6.1) });
  }
  for (const f of faces) {
    const { R, gl, ops } = f; const y0 = gl - 1.2;
    K.wall(R, G.panel, 0, R.L, y0, TER - 0.95, ops, 0.45);
    for (const o of ops) {
      if (o.entry) {
        // main entrance: tall storefront with two pairs of glazed doors, white frames
        K.rbox(R, M.windowNight, o.s0, o.y0, -0.42, o.s1, o.y1, -0.38);
        const n = 9; for (let i = 0; i <= n; i++) { const s = o.s0 + (o.s1 - o.s0) * i / n; K.rbox(R, G.frame, s - 0.04, o.y0, -0.4, s + 0.04, o.y1, -0.3, { detail: i > 0 && i < n }); }
        K.rbox(R, G.frame, o.s0, o.y0 + 2.6, -0.4, o.s1, o.y0 + 2.7, -0.3, { detail: true });
        for (const dc of [o.s0 + (o.s1 - o.s0) * 0.3, o.s0 + (o.s1 - o.s0) * 0.7]) { K.rbox(R, G.frame, dc - 1.0, o.y0, -0.39, dc + 1.0, o.y0 + 2.45, -0.36, { detail: true }); K.rbox(R, M.windowNight, dc - 0.92, o.y0 + 0.08, -0.37, dc + 0.92, o.y0 + 2.37, -0.355); }
        K.rbox(R, G.deck, o.s0, o.y0 - 0.25, -0.45, o.s1, o.y0, 1.6);
      } else K.fill(R, o, { rev: 0.4, glass: M.windowNight, frame: G.darkFrame, mull: Math.max(1, Math.round((o.s1 - o.s0) / 1.55) - 1), tran: [o.y1 - 0.9] });
    }
    // white fascia band at the terrace edge (slab edge + parapet base)
    K.rbox(R, G.metalPanel, -0.15, TER - 0.95, -0.2, R.L + 0.15, TER + 0.18, 0.14);
  }
  // north face abuts Davis Hall: plain wall + interior fill so nothing reads hollow
  { const R = K.run([bE, bN], [bW, bN]); K.wall(R, G.panel, 0, R.L, gMin(bW, bN - 1, bE, bN) - 1.2, TER + 0.18, [], 0.45); }
  K.box(M.concreteDark, bW + 0.4, -1.0, bN + 0.4, bE - 0.4, TER - 0.3, bS - 0.4);
  // terrace deck on the old roof (around the pavilion)
  const pavPoly = [[pW, pN], [pE, pN], [pE, pS], [pW, pS]];
  K.flat(G.deck, basePoly, TER, [pavPoly]);
  K.box(G.slab, bW, TER - 0.3, bN, bE, TER - 0.02, bS);
  walkables.push(K.walkPoly(basePoly, TER));
  colliders.push(K.colPoly(basePoly, -3, TER - 0.05));
  // picket guardrails along the open terrace edges (gap where the stair lands)
  const stairTop = [-12.6, -9.0];
  const railSegs = [
    [[bW + 0.12, bS - 0.12], [stairTop[0], bS - 0.12]], [[stairTop[1], bS - 0.12], [bE - 0.12, bS - 0.12]],
    [[bE - 0.12, bS - 0.12], [bE - 0.12, -12.4]],
    [[bW + 0.12, bN + 3.0], [bW + 0.12, bS - 0.12]],
  ];
  for (const [a, b] of railSegs) {
    pickets(K, G.steel, a, b, TER + 0.18, 1.07, 0.13);
    const nx = b[1] - a[1], nz = a[0] - b[0], L = Math.hypot(nx, nz) || 1, w = 0.06;
    colliders.push(K.colPoly([[a[0] + nx / L * w, a[1] + nz / L * w], [b[0] + nx / L * w, b[1] + nz / L * w], [b[0] - nx / L * w, b[1] - nz / L * w], [a[0] - nx / L * w, a[1] - nz / L * w]], TER - 0.2, TER + 1.3));
  }
  // planters on the terrace (low concrete boxes with shrubs)
  for (const [u0, v0, u1, v1] of [[-27.6, -14.6, -23.4, -12.2], [-13.0, -14.6, -3.0, -12.4], [4.0, -14.6, 14.0, -12.4], [20.0, -14.6, 28.6, -12.4], [-28.6, 4.0, -26.2, 12.0], [26.6, 6.0, 29.6, 14.0]]) {
    K.box(G.panel, u0, TER, v0, u1, TER + 0.55, v1); K.box(G.planting, u0 + 0.15, TER + 0.55, v0 + 0.15, u1 - 0.15, TER + 0.95, v1 - 0.15, { detail: true });
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], TER, TER + 0.6));
  }

  // ===================== WHITE BOX + SIGNS (south entry) =====================
  { const R = K.run([-9.0, bS], [-1.6, bS]);
    K.box(G.metalPanel, -9.0, gMin(-9, bS, -1.6, bS + 1.6) - 0.6, bS - 0.2, -1.6, TER + 1.15, bS + 1.5);
    const RF2 = K.run([-9.0, bS + 1.5], [-1.6, bS + 1.5]);
    sign(K, RF2, 'Grimes Engineering Center', RF2.L / 2, 3.2, 0.36, { color: '#3a3c3e', metal: 0.2, weight: '500', spacing: 0.02 });
    colliders.push(K.colPoly([[-9.0, bS - 0.2], [-1.6, bS - 0.2], [-1.6, bS + 1.5], [-9.0, bS + 1.5]], -2, TER + 1.15));
    void R; }
  { const R = faces[0].R; const sMid = (27.6 + 41.0) / 2; sign(K, R, 'GRIMES ENGINEERING CENTER', sMid, 5.05, 0.42, { color: '#d9d7d1', metal: 0.75, weight: '500', spacing: 0.14, d: 0.05 }); }

  // ===================== EXTERIOR STAIR (south face, west part) =====================
  {
    const v0 = bS + 0.05, v1 = bS + 2.25; const gFoot = Math.max(-0.5, K.g(-27.8, bS + 1.2));
    const uA = -27.8, uL0 = -21.0, uL1 = -19.0, uT = stairTop[0];
    const yMid = (gFoot + TER) / 2;
    const flight = (ua, ub, ya, yb) => { const n = Math.max(3, Math.round((yb - ya) / 0.165)); const tr = (ub - ua) / n; for (let i = 0; i < n; i++) { const yy = ya + (yb - ya) * (i + 1) / n; K.box(G.slab, ua + tr * i, yy - 0.06, v0, ua + tr * (i + 1) + 0.02, yy, v1); K.box(G.steel, ua + tr * i, yy - 0.06 - 0.17, v0, ua + tr * (i + 1) + 0.02, yy - 0.06, v0 + 0.25 * 0 + 0.04, { detail: true }); }
      // sloped white steel plate underneath + solid white outer stringer/guard
      const L = Math.hypot(ub - ua, yb - ya), a = Math.atan2(yb - ya, ub - ua);
      const pl = new THREE.BoxGeometry(L, 0.12, v1 - v0); pl.rotateZ(a); pl.translate((ua + ub) / 2, (ya + yb) / 2 - 0.3, (v0 + v1) / 2); K.add(G.steel, pl);
      const gd = new THREE.BoxGeometry(L, 1.45, 0.12); gd.rotateZ(a); gd.translate((ua + ub) / 2, (ya + yb) / 2 + 0.35, v1 + 0.06); K.add(G.metalPanel, gd);
      const hr = new THREE.BoxGeometry(L, 0.05, 0.05); hr.rotateZ(a); hr.translate((ua + ub) / 2, (ya + yb) / 2 + 0.95, v0 + 0.08); K.add(G.steel, hr, { detail: true });
      return n; };
    flight(uA, uL0, gFoot, yMid); flight(uL1, uT, yMid, TER);
    K.box(G.slab, uL0, yMid - 0.25, v0, uL1, yMid, v1); K.box(G.metalPanel, uL0, yMid - 0.5, v1, uL1, yMid + 1.1, v1 + 0.12);
    K.box(G.slab, uT, TER - 0.3, v0, stairTop[1], TER + 0.0, v1); K.box(G.metalPanel, uT, TER - 0.6, v1, stairTop[1], TER + 1.15, v1 + 0.12);
    // slender white posts under the landings
    for (const [u, y] of [[uL0 + 0.3, yMid], [uL1 - 0.3, yMid], [uT + 0.3, TER], [stairTop[1] - 0.3, TER]]) K.cyl(G.steel, u, K.g(u, v1 - 0.3) - 0.3, v1 - 0.3, 0.09, 0.09, y - K.g(u, v1 - 0.3), 8);
    const sp = { uA, uL0, uL1, uT, gFoot, yMid };
    walkables.push(K.walkFn(uA, v0, stairTop[1], v1, (u, v) => {
      if (u < sp.uA - 0.05 || u > stairTop[1] + 0.05 || v < v0 - 0.05 || v > v1 + 0.05) return null;
      if (u <= sp.uL0) return sp.gFoot + (sp.yMid - sp.gFoot) * Math.max(0, (u - sp.uA) / (sp.uL0 - sp.uA));
      if (u <= sp.uL1) return sp.yMid;
      if (u <= sp.uT) return sp.yMid + (TER - sp.yMid) * (u - sp.uL1) / (sp.uT - sp.uL1);
      return TER; }));
    colliders.push(K.colPoly([[uA, v1], [stairTop[1], v1], [stairTop[1], v1 + 0.14], [uA, v1 + 0.14]], -2, TER + 1.2));
  }

  // ===================== EAST SLOPED WALK (plaza -> terrace) =====================
  {
    const u0 = bE + 0.05, u1 = bE + 3.1, vLo = bS - 1.0, vHi = -12.0; const yLo = Math.max(K.g(u1, vLo), 0.3);
    const sh = new THREE.Shape(); const gb = gMin(u0, vHi, u1, vLo) - 1.0;
    sh.moveTo(vLo, gb); sh.lineTo(vLo, yLo); sh.lineTo(vHi, TER); sh.lineTo(vHi, gb); sh.lineTo(vLo, gb);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: u1 - u0, bevelEnabled: false });
    // shape (x=v, y=y), extrude z -> u : map (x,y,z) -> (u = u0 + z, y, v = x)
    eg.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, u0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    K.add(G.panel, eg);
    // outer parapet with white tube rail
    const L = Math.hypot(vLo - vHi, TER - yLo), a = Math.atan2(TER - yLo, vLo - vHi);
    const pw = new THREE.BoxGeometry(0.3, 0.9, L); pw.rotateX(a); pw.translate(u1 + 0.15, (TER + yLo) / 2 + 0.45, (vLo + vHi) / 2); K.add(G.panel, pw);
    const tr = new THREE.BoxGeometry(0.07, 0.07, L); tr.rotateX(a); tr.translate(u1 + 0.15, (TER + yLo) / 2 + 1.1, (vLo + vHi) / 2); K.add(G.steel, tr, { detail: true });
    for (let i = 0; i <= 12; i++) { const t = i / 12; const v = vLo + (vHi - vLo) * t, y = yLo + (TER - yLo) * t; K.box(G.steel, u1 + 0.12, y + 0.9, v - 0.03, u1 + 0.18, y + 1.1, v + 0.03, { detail: true }); }
    walkables.push(K.walkFn(u0, vHi, u1, vLo, (u, v) => (u < u0 - 0.05 || u > u1 + 0.05 || v < vHi - 0.05 || v > vLo + 0.05) ? null : yLo + (TER - yLo) * (vLo - v) / (vLo - vHi)));
    colliders.push(K.colPoly([[u1, vHi], [u1 + 0.3, vHi], [u1 + 0.3, vLo], [u1, vLo]], -2, TER + 1.2));
  }

  // =============================== GLASS PAVILION ===============================
  const pRuns = [K.run([pW, pS], [pE, pS]), K.run([pE, pS], [pE, pN]), K.run([pE, pN], [pW, pN]), K.run([pW, pN], [pW, pS])];
  for (const R of pRuns) {
    K.rbox(R, G.glass, 0, TER, -0.06, R.L, RF, -0.03);
    // mullions every ~1.55 m
    const n = Math.max(2, Math.round(R.L / 1.55)); for (let i = 0; i <= n; i++) { const s = R.L * i / n; K.rbox(R, G.frame, s - 0.035, TER, -0.04, s + 0.035, RF, 0.12, { detail: i % 3 !== 0 }); }
    // transoms (clerestory line) and sills
    for (const y of [TER + 3.05, F4 + 3.05]) K.rbox(R, G.frame, 0, y - 0.03, -0.04, R.L, y + 0.03, 0.1, { detail: true });
    K.rbox(R, G.frame, 0, TER, -0.04, R.L, TER + 0.08, 0.1, { detail: true });
    // white floor band between storeys and roof-edge band
    K.rbox(R, G.metalPanel, -0.02, F4 - 0.55, -0.1, R.L + 0.02, F4 + 0.4, 0.16);
    K.rbox(R, G.metalPanel, -0.02, RF - 0.05, -0.1, R.L + 0.02, RF + 0.55, 0.16);
  }
  colliders.push(K.colPoly(pavPoly, TER - 0.5, CT));
  // interior: upper floor with the forum void, warm wood ceilings, white cores (reads through the glass and glows at night)
  { const ip = [[pW + 0.15, pN + 0.15], [pE - 0.15, pN + 0.15], [pE - 0.15, pS - 0.15], [pW + 0.15, pS - 0.15]];
    const voidH = [[-6.0, -3.0], [10.0, -3.0], [10.0, 11.0], [-6.0, 11.0]];
    K.prism(G.slab, ip, F4 - 0.45, F4 - 0.05, undefined, [voidH]);
    K.flat(G.ceiling, ip, F4 - 0.46, [voidH], true);
    K.flat(G.ceiling, ip, RF - 0.25, [], true);
    K.flat(G.deck, ip, F4 - 0.04, [voidH]);
    for (const [u0, v0, u1, v1] of [[14.0, -5.6, 21.5, 1.0], [-20.4, 8.0, -15.0, 18.6], [-2.0, 13.5, 4.0, 18.8]]) K.box(G.interiorWall, u0, TER, v0, u1, RF - 0.25, v1);
    // feature stair in the forum and glass guards
    for (let i = 0; i < 14; i++) { const t = i / 14; K.box(G.steel, -4.5 + t * 7.0, TER + (F4 - TER) * t - 0.05, 9.2, -4.5 + t * 7.0 + 0.55, TER + (F4 - TER) * t + 0.25, 10.8, { detail: true }); }
    // interior round columns
    for (const u of [cW + 8.05, cW + 16.1, cW + 24.15, cW + 32.2, cW + 40.25]) for (const v of [1.5, 12.5]) if (!(u > -6.5 && u < 10.5 && v > -3.5 && v < 11.5)) K.cyl(G.steel, u, TER, v, 0.2, 0.2, RF - TER, 10, { detail: true });
  }

  // ===================== COLUMNS + SHAPE-MEMORY-ALLOY ROD ZIG-ZAG =====================
  {
    const ring = []; // perimeter column positions in order (clockwise from the south-west corner)
    for (let k = 0; k <= 6; k++) ring.push([cW + (cE - cW) * k / 6, cS]);
    for (let j = 1; j <= 2; j++) ring.push([cE, cS + (cN - cS) * j / 3]);
    for (let k = 6; k >= 0; k--) ring.push([cW + (cE - cW) * k / 6, cN]);
    for (let j = 1; j <= 2; j++) ring.push([cW, cN + (cS - cN) * j / 3]);
    for (const [u, v] of ring) {
      K.cyl(G.steel, u, TER, v, 0.19, 0.19, CU - TER, 14);
      K.box(G.steel, u - 0.32, TER, v - 0.32, u + 0.32, TER + 0.05, v + 0.32, { detail: true });
      K.box(G.steel, u - 0.25, CU - 0.35, v - 0.25, u + 0.25, CU, v + 0.25);
      colliders.push(K.colCyl(u, v, 0.22, TER - 0.2, CU));
    }
    const yTop = CU - 0.3, yLow = F4 - 0.1;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      strut(K, G.steel, [a[0], yTop, a[1]], [m[0], yLow, m[1]], 0.028, 6);
      strut(K, G.steel, [b[0], yTop, b[1]], [m[0], yLow, m[1]], 0.028, 6);
      // node plate + short outrigger back to the floor band at the glass line (the SMA fuse sits here)
      const inward = [(pW + pE) / 2 - m[0], (pN + pS) / 2 - m[1]]; const il = Math.hypot(...inward);
      const ax = Math.abs(a[1] - b[1]) < 0.01 ? [0, Math.sign(inward[1])] : [Math.sign(inward[0]), 0];
      const dist = ax[0] ? Math.abs((ax[0] > 0 ? pW : pE) - m[0]) : Math.abs((ax[1] > 0 ? pN : pS) - m[1]);
      strut(K, G.steel, [m[0], yLow, m[1]], [m[0] + ax[0] * dist, yLow, m[1] + ax[1] * dist], 0.05, 6);
      K.cyl(G.darkFrame, m[0], yLow - 0.25, m[1], 0.07, 0.07, 0.5, 8, { detail: true });
      void il;
    }
  }

  // =============================== ROOF CANOPY ===============================
  {
    // solid roof over the column rectangle + white soffit
    K.box(G.metalPanel, cW, CU + 0.05, cN, cE, CT - 0.05, cS);
    K.box(G.slab, cW + 0.3, CT - 0.05, cN + 0.3, cE - 0.3, CT + 0.02, cS - 0.3);
    // perimeter fascia
    const fasc = (u0, v0, u1, v1) => K.box(G.steel, u0, CU + 0.1, v0, u1, CT + 0.05, v1);
    fasc(kW, kS - 0.28, kE, kS); fasc(kW, kN, kE, kN + 0.28); fasc(kW, kN, kW + 0.28, kS); fasc(kE - 0.28, kN, kE, kS);
    // inner ring beam at the column lines
    const rb = (u0, v0, u1, v1) => K.box(G.steel, u0, CU, v0, u1, CT - 0.05, v1);
    rb(cW, cS - 0.18, cE, cS + 0.18); rb(cW, cN - 0.18, cE, cN + 0.18); rb(cW - 0.18, cN, cW + 0.18, cS); rb(cE - 0.18, cN, cE + 0.18, cS);
    // primary cantilever beams on the column grid + secondary ribs at third points
    const beams = []; const sec = [];
    for (let k = 0; k <= 6; k++) { const u = cW + (cE - cW) * k / 6; beams.push([u, cS, u, kS], [u, cN, u, kN]); if (k < 6) for (const f of [1 / 3, 2 / 3]) { const uu = u + (cE - cW) / 6 * f; sec.push([uu, cS, uu, kS], [uu, cN, uu, kN]); } }
    for (let j = 0; j <= 3; j++) { const v = cS + (cN - cS) * j / 3; beams.push([cE, v, kE, v], [cW, v, kW, v]); if (j < 3) for (const f of [1 / 3, 2 / 3]) { const vv = v + (cN - cS) / 3 * f; sec.push([cE, vv, kE, vv], [cW, vv, kW, vv]); } }
    // corner diagonals
    beams.push([cE, cS, kE, kS], [cW, cS, kW, kS], [cE, cN, kE, kN], [cW, cN, kW, kN]);
    for (const [u0, v0, u1, v1] of beams) { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); K.obox(G.steel, (u0 + u1) / 2, (CU + CT) / 2 - 0.02, (v0 + v1) / 2, L, CT - CU - 0.04, 0.16, a); }
    for (const [u0, v0, u1, v1] of sec) { const L = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(v1 - v0, u1 - u0); K.obox(G.steel, (u0 + u1) / 2, CT - 0.2, (v0 + v1) / 2, L, 0.3, 0.1, a, { detail: true }); }
    // louvre blades running parallel to each edge across the open band
    const blades = (along, a0, a1, c0, c1, horiz) => { const n = Math.max(2, Math.round(Math.abs(c1 - c0) / 0.42)); for (let i = 1; i < n; i++) { const c = c0 + (c1 - c0) * i / n;
      if (horiz) K.box(G.louvre, a0, CT - 0.32, c - 0.035, a1, CT - 0.06, c + 0.035, { detail: along }); else K.box(G.louvre, c - 0.035, CT - 0.32, a0, c + 0.035, CT - 0.06, a1, { detail: along }); } };
    blades(false, kW + 0.28, kE - 0.28, cS + 0.18, kS - 0.28, true);
    blades(false, kW + 0.28, kE - 0.28, kN + 0.28, cN - 0.18, true);
    blades(false, cN + 0.18, cS - 0.18, cE + 0.18, kE - 0.28, false);
    blades(false, cN + 0.18, cS - 0.18, kW + 0.28, cW - 0.18, false);
    // clerestory skylight box over the forum
    const s0 = [-7.0, -6.0, 11.0, 1.0]; const yS = CT, yT = 17.75;
    K.box(G.metalPanel, s0[0] - 0.4, yT - 0.05, s0[1] - 0.4, s0[2] + 0.4, yT + 0.3, s0[3] + 0.4);
    const sr = [K.run([s0[0], s0[3]], [s0[2], s0[3]]), K.run([s0[2], s0[3]], [s0[2], s0[1]]), K.run([s0[2], s0[1]], [s0[0], s0[1]]), K.run([s0[0], s0[1]], [s0[0], s0[3]])];
    for (const R of sr) { K.rbox(R, M.windowNight, 0, yS + 0.2, -0.05, R.L, yT - 0.05, 0); const n = Math.max(2, Math.round(R.L / 1.5)); for (let i = 0; i <= n; i++) { const s = R.L * i / n; K.rbox(R, G.frame, s - 0.05, yS, -0.05, s + 0.05, yT, 0.08); } K.rbox(R, G.steel, 0, yS, -0.05, R.L, yS + 0.25, 0.1); }
  }

  // =============================== SITE: planters on the south plaza ===============================
  for (const [u0, v0, u1, v1] of [[2.0, 29.5, 12.0, 31.5], [16.0, 29.5, 27.0, 31.5], [-8.0, 30.0, -1.0, 32.0]]) {
    const g = gMin(u0, v0, u1, v1); K.box(G.panel, u0, g - 0.5, v0, u1, g + 0.5, v1); K.box(G.planting, u0 + 0.15, g + 0.5, v0 + 0.15, u1 - 0.15, g + 0.8, v1 - 0.15, { detail: true });
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], g - 1, g + 0.55));
  }

  const object3d = K.finish(); object3d.name = 'grimes-engineering-center';
  return { object3d, colliders, walkables };
}
