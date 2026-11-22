// César E. Chávez Student Center + Golden Bear Café (Vernon DeMars & Donald Hardison, 1960; originally the Golden Bear
// Restaurant of the Student Center complex). A low building between Upper and Lower Sproul Plaza roofed by a field of
// white concrete inverted-pyramid "umbrellas" (7.3 m square, each on one round column), laid in staggered north–south
// strips: the stagger gives the saw-toothed north side along Strawberry Creek. The café pavilion faces Ludwig's Fountain
// on Upper Sproul from a low podium; on Lower Sproul a two-storey block carries a cast-concrete relief frieze under a roof
// terrace. Massing from the 2021 LiDAR: umbrella rims 12.0 m, centres 10.9 m; terrace roof 9.9 m; café podium 7.0 m.
import * as THREE from 'three';
import { Kit, polysGeo } from './lib/classic-kit.js';
import { umbrellaField, buildUmbrellas, clerestory, glassBand, slotBand, pipeRail, parasol, tinted, tone, TEXAVG, outwardRing, pointInPoly } from './lib/b01-kit.js';
import { cafeInterior } from './lib/int-gbc.js'; // interiors-cafe: enterable, furnished dining room + patio furniture

export const info = {
  id: 'golden-bear-cafe',
  name: 'Golden Bear Café',
  subtitle: 'César E. Chávez Student Center · DeMars & Hardison · 1960',
  blurb: 'Built in 1960 as the Golden Bear Restaurant of the new Student Center, this DeMars & Hardison building is roofed by a grid of concrete inverted-pyramid umbrellas. The café faces Upper Sproul Plaza; the César E. Chávez Student Center wing frames the north side of Lower Sproul.',
  replaces: ['w/24025426'],
};

// rectilinear ring offset (inward by d) for an outward-oriented ring
function inset(ring, d) {
  const R = outwardRing(ring), n = R.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = R[(i - 1 + n) % n], c = R[i], q = R[(i + 1) % n];
    const t1 = [c[0] - p[0], c[1] - p[1]], t2 = [q[0] - c[0], q[1] - c[1]]; const l1 = Math.hypot(...t1), l2 = Math.hypot(...t2);
    const i1 = [t1[1] / l1, -t1[0] / l1], i2 = [t2[1] / l2, -t2[0] / l2]; // inward normals (outward = (-ty, tx))
    const dd = 1 + i1[0] * i2[0] + i1[1] * i2[1];
    out.push([c[0] + d * (i1[0] + i2[0]) / dd, c[1] + d * (i1[1] + i2[1]) / dd]);
  }
  return out;
}

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.7);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const colliders = [], walkables = [];
  // ---- local materials ----
  const white = M.whitePaint;                                  // umbrella soffits / fascias (painted white concrete)
  const colWhite = M.whitePaint;                               // columns, planters
  const white2 = tinted(M.whitePaint, 0xdcd8cf);              // folded east/west soffit facets (reads the creases)
  const steel = tinted(M.iron, 0xb0b4b8, { metalness: 0.8, roughness: 0.35 });
  const roofTop = tone(M.concrete, 0xa8674a);                  // rust/terracotta membrane on the umbrella tops
  const precast = tone(M.concrete, 0xbcaa90);                  // tan slotted precast panels
  const frieze = tone(M.concrete, 0xb8b0a2);                   // cast relief frieze
  const dark = tinted(M.blackPaint, 0x23211f);                // slot backing, bronze-black frames
  const frame = tinted(M.darkBronze, 0x4e3e2c);
  const podium = tone(M.concrete, 0xb8b2a6);
  const navy = tinted(M.calBlue, 0x34465c);
  const sglass = tinted(M.glassLight, 0x7f9196, { opacity: 0.3 }); // transparent storefront glass (lighter: the furnished interior shows through — interiors-cafe)
  const interior = tinted(M.stucco, 0xe6c896);                  // warm-lit café interior seen through the glass
  const greenGlass = tinted(M.windowNight, 0x6f8a80);           // light-green clerestory glass
  const YT = 11.8, DEP = 0.92, TH = 0.3, FL = 7.0; // shell rim 11.8 + 0.2 m upturned rim = 12.0 (LiDAR) // umbrella rim, depth, slab; café / upper floor level
  const g = (u, v) => K.g(u, v);

  // ---- umbrella field (strips measured from the LiDAR) ----
  const strips = [ // centres fitted to the LiDAR (the OSM outline sits ~0.8 m west of it)
    { u0: -40.9, u1: -33.3, vN: -22.25, vS: 14.9, n: 5 }, { u0: -33.3, u1: -26.1, vN: -18.6, vS: 18.5, n: 5 },
    { u0: -26.1, u1: -18.9, vN: -14.75, vS: 22.2, n: 5 }, { u0: -18.9, u1: -11.6, vN: -18.25, vS: 11.1, n: 4 },
    { u0: -11.6, u1: -4.25, vN: -14.75, vS: 14.8, n: 4 }, { u0: -4.25, u1: 3.3, vN: -18.2, vS: 11.1, n: 4 },
    { u0: 3.3, u1: 10.6, vN: -14.6, vS: 15.0, n: 4 }, { u0: 10.6, u1: 17.7, vN: -18.2, vS: 11.5, n: 4 },
    { u0: 17.7, u1: 24.8, vN: -7.4, vS: 15.1, n: 3 }, { u0: 24.8, u1: 32.05, vN: -10.9, vS: 11.3, n: 3 },
    { u0: 32.05, u1: 39.7, vN: -7.43, vS: 8.0, n: 2 }, { u0: 39.7, u1: 47.3, vN: -10.75, vS: 12.4, n: 3 },
  ];
  const F = umbrellaField(strips, { yTop: YT, depth: DEP, dip: 0.8, gap: 0.22 });

  // ---- building bodies (wall lines inset from the roof edges) ----
  const outlineW = [[-40.9, -22.25], [-33.3, -22.25], [-33.3, -18.6], [-26.1, -18.6], [-26.1, -14.75], [-18.9, -14.75], [-18.9, -18.25], [-11.6, -18.25],
    [-11.6, -14.75], [-4.25, -14.75], [-4.25, -18.2], [3.3, -18.2], [3.3, -14.6], [10.6, -14.6], [10.6, -18.2], [17.7, -18.2], [17.7, -7.4], [25.4, -7.4],
    [25.4, 12.6], [-11.6, 12.6], [-11.6, 11.1], [-18.9, 11.1], [-18.9, 22.2], [-26.1, 22.2], [-26.1, 18.5], [-33.3, 18.5], [-33.3, 14.9], [-40.9, 14.9]];
  const wallW = outwardRing(inset(outlineW, 1.6));
  const outlineE = [[25.5, -10.9], [32.05, -10.9], [32.05, -7.43], [39.7, -7.43], [39.7, -10.75], [43.6, -10.75], [43.6, 11.75], [39.7, 11.75], [39.7, 14.1], [25.5, 14.1]];
  const wallE = outwardRing(inset(outlineE, 1.6));
  const FB = { u0: -10.0, u1: 23.8, v0: 10.6, v1: 16.0, vF: 18.6, yF: 6.6, yT: 9.9 }; // frieze block (Lower Sproul)

  // cores
  K.prism(M.concreteDark, inset(wallW, 0.3), -1.5, 11.2);
  // interiors-cafe: the café's east body is a floor slab + solid kitchen block (u < UK); the dining room above FL is hollow
  const UK = 32.05; // dining room / kitchen line = the slot between umbrella strips
  K.prism(M.concreteDark, inset(wallE, 0.3), -1.5, FL - 0.02);
  K.prism(M.concreteDark, [[27.4, 12.2], [UK, 12.2], [UK, -5.53], [30.75, -5.53], [30.75, -9.0], [27.4, -9.0]], FL - 0.03, 9.9);
  K.box(M.concreteDark, 27.4, 9.85, -5.5, UK, 11.2, 10.4);
  K.box(M.concreteDark, 27.4, 9.85, -9.0, 30.2, 11.2, -5.4);
  // light-green clerestory band along the stepped south face of the café's upper core
  for (const [a, b] of [[[27.4, 10.4], [32.05, 10.4]], [[32.05, 7.8], [39.7, 7.8]], [[39.7, 7.8], [39.7, 10.15]]]) { // (dining-room bays opened up: interiors-cafe)
    const R = K.run(a, b); glassBand(K, R, 0, R.L, 10.05, 11.2, { glass: greenGlass, frame, pitch: 1.2, rec: 0.05 });
  }
  K.box(white, 27.0, 9.85, 10.4, 42.1, 10.05, 12.65); // flat roof of the café's south wing (LiDAR 9.9 m)
  colliders.push(K.colPoly(wallW, -2, 12));
  for (let i = 0; i < wallE.length; i++) { // interiors-cafe: wall segments, leaving the café's double door (v 1.4..4.2 on the east front) open
    const a = wallE[i], b = wallE[(i + 1) % wallE.length];
    if (a[0] > 41.9 && b[0] > 41.9) { const [hi, lo] = a[1] > b[1] ? [a, b] : [b, a]; colliders.push(K.colPoly([hi, [hi[0], 4.25]], -2, 12), K.colPoly([[lo[0], 1.35], lo], -2, 12), K.colPoly([[lo[0], 1.35], [lo[0], 4.25]], FL + 2.6, 12)); }
    else colliders.push(K.colPoly([a, b], -2, 12));
  }

  // façades per edge
  const faces = (ring, styleOf) => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]; const R = K.run(a, b); if (R.L < 0.3) continue;
      const st = styleOf(a, b, R); if (!st) continue;
      const gmin = Math.min(g(...a), g(...b), g((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) - 0.6;
      for (const band of st) {
        const y0 = band.y0 ?? gmin, y1 = band.y1;
        if (y1 - y0 < 0.2) continue;
        if (band.t === 'slot') slotBand(K, R, 0, R.L, y0, y1, { mat: precast, back: dark, jointMat: dark });
        else if (band.t === 'glass') glassBand(K, R, 0, R.L, y0, y1, { glass: band.see ? sglass : M.windowNight, frame, pitch: band.pitch ?? 1.45, transoms: band.tr || [], doors: band.doors || [] });
        else if (band.t === 'solid') K.rbox(R, band.mat || podium, 0, y0, -0.3, R.L, y1, 0.0);
        if (band.cap) K.rbox(R, white, -0.05, y1 - 0.02, -0.3, R.L + 0.05, y1 + 0.22, 0.12);
      }
    }
  };
  const nrm = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
  faces(wallW, (a, b) => {
    const n = nrm(a, b);
    if (n[1] > 0.5 && a[1] > 10.5 && a[1] < 11.5 && Math.min(a[0], b[0]) > -12.5) return null; // behind the frieze block terrace (handled below)
    if (n[1] > 0.5) return [{ t: 'glass', y1: 6.4, tr: [5.6] }, { t: 'solid', y0: 6.4, y1: 7.4, mat: precast }, { t: 'glass', y0: 7.4, y1: 10.4, tr: [9.6] }];
    return [{ t: 'slot', y1: FL, cap: true }, { t: 'glass', y0: FL + 0.22, y1: 10.4, tr: [FL + 2.5] }];
  });
  const dining = (a, b) => Math.max(a[0], b[0]) > UK + 0.5 && Math.min(a[1], b[1]) < 12.4; // edge of the hollow dining room (interiors-cafe)
  faces(wallE, (a, b) => {
    const n = nrm(a, b); const see = dining(a, b);
    if (n[0] > 0.5 && a[0] > 42) return null; // café front, below
    if (n[1] > 0.5) return [{ t: 'solid', y1: FL, mat: podium }, { t: 'slot', y0: FL, y1: 9.85, cap: true }];
    if (n[0] < -0.5) return [{ t: 'glass', y1: FL - 0.4, tr: [g(...a) + 2.6] }, { t: 'solid', y0: FL - 0.4, y1: FL + 0.2, mat: precast }, { t: 'glass', y0: FL + 0.2, y1: 10.4, tr: [FL + 2.6], see }];
    return [{ t: 'slot', y1: FL, cap: true }, { t: 'glass', y0: FL + 0.22, y1: 10.4, tr: [FL + 2.5], see }];
  });
  // clerestory glazing up to the umbrella soffits
  clerestory(K, F, wallW, 10.4, M.windowNight, frame, { thick: TH, cap: 11.25 });
  clerestory(K, F, wallE, 10.4, M.windowNight, frame, { thick: TH, cap: 11.25, skip: (a, b, n) => (n[0] > 0.5 && a[0] > 41.5) || (dining(a, b) && n[1] < 0.5) || (dining(a, b) && a[0] > 38) });
  clerestory(K, F, wallE, 10.4, sglass, frame, { thick: TH, skip: (a, b, n) => (n[0] > 0.5 && a[0] > 41.5) || !((dining(a, b) && n[1] < 0.5) || (dining(a, b) && a[0] > 38)) }); // dining room: clear clerestory up to the soffits

  // ---- Golden Bear Café front (east, facing Ludwig's Fountain on Upper Sproul) ----
  {
    const uG = wallE.reduce((m, p) => Math.max(m, p[0]), -1e9); // café glass line
    const v0 = -9.15, v1 = 10.15; const R = K.run([uG, v1], [uG, v0]); // east façade S→N
    const doorS = v1 - 2.8; // double door just south of the middle column (v = 0.5)
    // (interiors-cafe) the painted backdrop is gone: the furnished dining room is visible through the glass
    clerestory(K, F, [[uG, v0], [uG + 0.01, v0], [uG + 0.01, v1], [uG, v1]], 10.5, sglass, frame, { thick: TH, inset: 0.15, skip: (a, b, n) => !(n[0] > 0.5) });
    const d0 = doorS - 1.4, d1 = doorS + 1.4; // automatic sliding double door, standing open
    glassBand(K, R, 0, d0, FL, 10.5, { glass: sglass, frame, pitch: 1.3, transoms: [FL + 2.7] });
    glassBand(K, R, d1, R.L, FL, 10.5, { glass: sglass, frame, pitch: 1.3, transoms: [FL + 2.7] });
    glassBand(K, R, d0, d1, FL + 2.62, 10.5, { glass: sglass, frame, pitch: 1.4, transoms: [FL + 2.7] });
    K.rbox(R, frame, d0 - 0.04, FL - 0.03, -0.2, d1 + 0.04, FL + 0.0, 0.05); // threshold
    for (const [a, b] of [[d0 - 1.36, d0 + 0.02], [d1 - 0.02, d1 + 1.36]]) { // leaves slid open behind the fixed panes
      for (const [p0, q0, y0, y1] of [[a, a + 0.07, FL + 0.02, FL + 2.58], [b - 0.07, b, FL + 0.02, FL + 2.58], [a, b, FL + 0.02, FL + 0.16], [a, b, FL + 2.5, FL + 2.58]]) K.rbox(R, frame, p0, y0, -0.32, q0, y1, -0.26);
      K.rbox(R, sglass, a + 0.07, FL + 0.16, -0.30, b - 0.07, FL + 2.5, -0.28);
    }
    K.rbox(R, frame, d0 - 1.4, FL + 2.58, -0.36, d1 + 1.4, FL + 2.72, -0.22); // slider header
    // dark sign band over the entrance with gold "GOLDEN BEAR" lettering
    K.rbox(R, dark, doorS - 1.55, FL + 2.48, -0.1, doorS + 1.55, FL + 2.88, 0.02);
    const FONT = { G: ['01110', '10000', '10000', '10111', '10001', '10001', '01110'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
      D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
      B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'] };
    const text = 'GOLDEN BEAR', px = 0.03, adv = 6 * px; let s = doorS - (text.length * adv) / 2;
    for (const ch of text) { const gl = FONT[ch]; if (gl) for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === '1') K.rbox(R, M.gold, s + c * px, FL + 2.8 - (r + 1) * px, 0.02, s + (c + 1) * px, FL + 2.8 - r * px, 0.045, { detail: true }); s += adv; }
    // podium (low terrace in front of the café) with steps down to the plaza, and the north patio over the creek
    const pu1 = 49.7, pv0 = -18.4, pv1 = 3.8;
    const pts = [[uG - 0.3, pv0], [pu1, pv0], [pu1, pv1], [uG - 0.3, pv1]];
    K.prism(podium, pts, Math.min(g(pu1, pv0), g(uG, pv0)) - 1.2, FL - 0.05);
    K.flat(M.paving, pts, FL - 0.03);
    walkables.push(K.walkPoly(pts, FL - 0.03));
    // steps east (at the café door axis) and south
    const gp = g(pu1 + 1.6, -8.6), ns = Math.max(2, Math.round((FL - 0.03 - gp) / 0.16));
    walkables.push(K.stairs(podium, pu1, -10.2, pu1 + ns * 0.32, -7.0, gp, FL - 0.03, '-u', ns));
    const ge = g(pu1 + 1.6, 1.0), ne = Math.max(2, Math.round((FL - 0.03 - ge) / 0.15));
    walkables.push(K.stairs(podium, pu1, -2.2, pu1 + ne * 0.34, 3.6, ge, FL - 0.03, '-u', ne));
    for (const vv of [-2.0, 3.4]) pipeRail(K, steel, [[pu1 - 0.2, vv], [pu1 + ne * 0.34, vv]], (u) => FL - 0.03 - Math.max(0, (u - pu1)) / 0.34 * ((FL - 0.03 - ge) / ne), { h: 0.9, mid: false });
    const gs = g(46, pv1 + 1.4), ns2 = Math.max(2, Math.round((FL - 0.03 - gs) / 0.16));
    walkables.push(K.stairs(podium, 44.2, pv1, 48.6, pv1 + ns2 * 0.32, gs, FL - 0.03, '-v', ns2));
    pipeRail(K, M.iron, [[38.8, pv0 + 0.15], [pu1 - 0.15, pv0 + 0.15], [pu1 - 0.15, -10.8]], FL - 0.03);
    // the café podium also wraps the north patio (deck between the café and the creek)
    const np = [[38.8, pv0], [uG - 0.3, pv0], [uG - 0.3, -9.15], [38.8, -9.15]];
    K.prism(podium, np, g(39, pv0) - 1.2, FL - 0.05); K.flat(M.paving, np, FL - 0.03); walkables.push(K.walkPoly(np, FL - 0.03));
    pipeRail(K, M.iron, [[38.95, -9.3], [38.95, pv0 + 0.15]], FL - 0.03);
    for (const [u, v] of [[41.4, -11.6], [44.6, -11.9], [47.8, -11.3], [42.8, -14.8], [46.4, -15.2]]) parasol(K, navy, M.iron, u, FL - 0.03, v, { r: 1.25, h: 2.4 });
    // white bowl planters along the podium edge
    for (let v = -6.9; v < -2.4; v += 1.1) K.lathe(colWhite, [[0.18, 0], [0.42, 0.25], [0.55, 0.55], [0.5, 0.58], [0.001, 0.5]], pu1 - 0.6, FL - 0.03, v, 12, { detail: true });
    // medallion: gold walking bear on a blue field, hung under the valley (mid-side) of the middle umbrella
    { const mv = 0.5, mu = 46.95, my = 10.15;
      const disc = (r, d, mat, x) => { const gg = new THREE.CylinderGeometry(r, r, d, 28); gg.rotateZ(Math.PI / 2); gg.translate(x, my, mv); K.add(mat, gg); };
      disc(0.82, 0.06, M.bronze, mu); disc(0.74, 0.08, M.calBlue, mu + 0.01);
      const B = [[-0.55, 0.02], [-0.5, 0.12], [-0.36, 0.2], [-0.1, 0.24], [0.18, 0.22], [0.34, 0.26], [0.4, 0.33], [0.46, 0.31], [0.5, 0.26], [0.62, 0.22], [0.66, 0.16], [0.6, 0.12], [0.48, 0.1],
        [0.42, -0.02], [0.44, -0.34], [0.34, -0.34], [0.3, -0.1], [0.2, -0.12], [0.22, -0.34], [0.12, -0.34], [0.06, -0.12], [-0.16, -0.12], [-0.18, -0.34], [-0.28, -0.34], [-0.3, -0.1], [-0.4, -0.1], [-0.42, -0.34], [-0.52, -0.34], [-0.5, -0.06]];
      const shp = new THREE.Shape(B.map(([x, y]) => new THREE.Vector2(x * 0.95, y * 0.95)));
      const bg = new THREE.ExtrudeGeometry(shp, { depth: 0.05, bevelEnabled: false }); // in (x,y) plane, extrude +z
      bg.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, mu + 0.05, 0, 1, 0, my - 0.02, -1, 0, 0, mv, 0, 0, 0, 1)); K.add(M.gold, bg);
      K.box(dark, mu - 0.02, my + 0.82, mv - 0.02, mu + 0.02, 11.2, mv + 0.02); }
  }

  // ---- frieze block on Lower Sproul: recessed glazed ground floor, cast relief frieze, roof terrace ----
  {
    const { u0, u1, v0, v1, vF, yF, yT } = FB;
    const gS = (u) => g(u, v1 + 1);
    K.box(M.concreteDark, u0 + 0.3, -1.5, v0, u1 - 0.3, yF, v1 - 0.3);
    const Rg = K.run([u0, v1], [u1, v1]); // ground-floor storefront (south)
    K.rbox(Rg, interior, 0.3, gS(0) - 0.5, -0.29, Rg.L - 0.3, yF - 0.1, -0.27); K.rbox(Rg, M.lampGlow, 0.3, yF - 0.3, -0.27, Rg.L - 0.3, yF - 0.22, -0.2, { detail: true });
    const gmin = Math.min(gS(u0), gS(u1), gS((u0 + u1) / 2)) - 0.5;
    glassBand(K, Rg, 0, Rg.L, gmin, yF, { glass: sglass, frame, pitch: 1.45, transoms: [gS(0) + 2.6], doors: [{ s0: 1.2, s1: 2.6, h: 2.3 }, { s0: 16.2, s1: 17.6, h: 2.3 }] });
    for (const [a, b] of [[[u0, v0], [u0, v1]], [[u1, v1], [u1, v0]]]) { const R = K.run(a, b); glassBand(K, R, 0, R.L, Math.min(g(...a), g(...b)) - 0.5, yF, { glass: M.windowNight, frame, pitch: 1.45 }); }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, yT));
    // upper storey projecting to vF: frieze slab + soffit
    K.box(frieze, u0 - 0.2, yF, v0, u1 + 0.2, yT - 0.05, vF);
    K.box(frieze, u0 - 0.3, yF - 0.15, v1, u1 + 0.3, yF, vF + 0.05);
    K.box(white, u0 - 0.3, yT - 0.08, v0, u1 + 0.3, yT + 0.12, vF + 0.12); // coping / terrace slab edge
    K.flat(M.paving, [[u0, v0], [u1, v0], [u1, vF], [u0, vF]], yT + 0.13);
    // relief: abstract cast figures across the frieze face (seeded)
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const RF = K.run([u0 - 0.2, vF], [u1 + 0.2, vF]); const rEnd = 27.0;
    for (let i = 0; i < 70; i++) {
      const s = 0.4 + rnd() * (rEnd - 1.2), w = 0.3 + rnd() * 1.6, y = yF + 0.25 + rnd() * 2.4, h = 0.25 + rnd() * 1.0, d = 0.04 + rnd() * 0.16;
      if (rnd() < 0.35) { const cg = new THREE.CylinderGeometry(w * 0.45, w * 0.45, d, 14); cg.rotateX(Math.PI / 2); cg.translate(s, Math.min(y, yT - 0.3 - w * 0.45), d / 2); K.addRun(RF, frieze, cg); }
      else K.rbox(RF, frieze, s, y, 0, Math.min(rEnd, s + w), Math.min(yT - 0.25, y + h), d);
    }
    // east end of the frieze block: white parapet with a dark slat screen above the terrace
    K.rbox(RF, white, rEnd, yF, 0, RF.L, yT - 0.05, 0.06);
    for (let s = rEnd + 0.1; s < RF.L - 0.1; s += 0.22) K.rbox(RF, dark, s, yT + 0.13, -0.15, s + 0.08, yT + 1.75, -0.05, { detail: true });
    // round columns along the recessed storefront
    for (const u of [-7.9, -0.6, 7.2, 14.05, 21.4]) { K.cyl(colWhite, u, gS(u) - 0.5, (v1 + vF) / 2 + 0.3, 0.23, 0.23, yF - gS(u) + 0.5, 14); colliders.push(K.colCyl(u, (v1 + vF) / 2 + 0.3, 0.3, gS(u) - 1, yF)); }
    // terrace railing + a few parasols
    pipeRail(K, M.iron, [[u0 + 0.15, v0 + 0.5], [u0 + 0.15, vF - 0.15], [u0 + rEnd, vF - 0.15]], yT + 0.13);
    for (const u of [-6, 2, 10]) parasol(K, M.calBlue, M.iron, u, yT + 0.13, 17.0, { r: 1.2, h: 2.2 });
    // wall behind the terrace (between frieze-block roof and the umbrella soffits): glazed
    const Rb = K.run([u0, v0], [u1, v0]); // faces south (outward +v) — glazing seen from the terrace
    glassBand(K, Rb, 0, Rb.L, yT + 0.13, 10.4, { glass: M.windowNight, frame, pitch: 1.45 });
    clerestory(K, F, [[u0, v0 - 0.4], [u1, v0 - 0.4], [u1, v0 - 0.39], [u0, v0 - 0.39]], 10.4, M.windowNight, frame, { thick: TH, inset: 0 });
  }

  // ---- south-east terrace (café terrace over a lower level) between the café and Lower Sproul ----
  {
    const t0 = 27.1, t1 = 45.5, s0 = 12.45, s1 = 21.8;
    const pts = [[t0, s0], [t1, s0], [t1, s1], [t0, s1]];
    K.box(M.concreteDark, t0 + 0.3, -1.5, s0, t1, FL - 0.25, s1 - 0.3);
    const Rw = K.run([t0, s0], [t0, s1]); glassBand(K, Rw, 0, Rw.L, g(t0, s1) - 0.5, FL - 0.3, { glass: M.windowNight, frame, pitch: 1.45, transoms: [g(t0, s1) + 2.6], doors: [{ s0: 3.0, s1: 4.6, h: 2.4 }] });
    const Rs = K.run([t0, s1], [t1, s1]); slotBand(K, Rs, 0, Rs.L, Math.min(g(t0, s1), g(t1, s1)) - 0.6, FL - 0.3, { mat: precast, back: dark, jointMat: dark });
    K.box(white, t0 - 0.15, FL - 0.3, s0, t1, FL - 0.03, s1 + 0.15);
    K.flat(M.paving, pts, FL - 0.02);
    walkables.push(K.walkPoly(pts, FL - 0.02));
    colliders.push(K.colPoly(pts, -2, FL - 0.02));
    pipeRail(K, M.iron, [[t0 + 0.1, s0 + 0.2], [t0 + 0.1, s1 - 0.1], [t1 - 0.4, s1 - 0.1]], FL - 0.02);
    for (const [u, v] of [[30, 17], [34.5, 18.5], [39, 16.5], [42.5, 19]]) parasol(K, navy, M.iron, u, FL - 0.02, v, { r: 1.3, h: 2.4 });
  }

  // ---- umbrellas + columns (columns only where visible: outside the enclosed bodies) ----
  const inBody = (u, v) => pointInPoly(inset(wallW, 0.5), u, v) || pointInPoly(inset(wallE, 0.5), u, v) || (u > FB.u0 + 0.5 && u < FB.u1 - 0.5 && v > FB.v0 && v < FB.v1 - 0.5);
  const colBase = (u, v) => {
    if (u > 42 && v < 4) return FL - 0.03;                                       // café podium
    if (u > 27 && u < 45.5 && v > 12.4) return FL - 0.02;                        // SE terrace
    if (u > FB.u0 && u < FB.u1 && v > FB.v0 && v < FB.vF) return FB.yT + 0.13;  // frieze terrace
    return g(u, v);
  };
  // r4-sweep: soffits in light board-marked concrete (the untextured white paint read as raw blockout from spawn)
  const sofC = tone(M.concrete, 0xe8e4dc), sofC2 = tone(M.concrete, 0xd8d3c9);
  buildUmbrellas(K, F, { top: roofTop, soffit: sofC, soffit2: sofC2, fascia: white, col: colWhite, thick: TH, thickC: 0.4, colR: 0.3, rimUp: 0.2, rimW: 0.15, lamp: M.lampGlow, colBase, skipCol: (q) => inBody(q.cu, q.cv) });

  // rooftop mechanical equipment and a small penthouse (LiDAR 12.9–15.0 m)
  const mech = tinted(M.concrete, 0xd0d0cc);
  for (const [a0, b0, a1, b1, y1] of [[-6, -5.6, 3, -3.0, 12.95], [2, -8.6, 11, -5.2, 13.0], [6.2, -4.2, 10, 0.2, 15.0], [28.1, -3.0, 30.6, 3.0, 13.4]]) {
    K.box(mech, a0, 11.2, b0, a1, y1, b1); K.box(M.iron, a0 + 0.3, y1, b0 + 0.3, a1 - 0.3, y1 + 0.08, b1 - 0.3, { detail: true });
  }
  const object3d = K.finish();
  object3d.name = 'golden-bear-cafe';
  // interiors-cafe: furnished, walkable dining room + patio furniture (distance-gated; see lib/int-gbc.js)
  const IN = cafeInterior(ctx, { ANG, F, FL, uK: UK, TH, frame });
  object3d.add(IN.object3d); colliders.push(...IN.colliders); walkables.push(...IN.walkables);
  return { object3d, colliders, walkables, update: IN.update, ownsCollision: true };
}
