// C. V. Starr East Asian Library (Tod Williams Billie Tsien, 2008), on the north edge of Memorial Glade beside Haviland Hall.
// A long pale-stone block dug into the hill under a low rust-brown hip roof: a smooth concrete plinth on the glade side, tall
// staggered stone panels above, and the signature bronze screen across the south front (an "ice-ray" lattice below, stacked
// rectangular cells above) standing ~0.75 m off the glazing. A glazed entrance pavilion with a thin canopy and a second, finer
// gold-bronze screen marks the south-east corner, reached by broad stone steps; a retaining wall makes a planted terrace.
// Massing from the 2021 LiDAR: eaves ~19 m above the glade, hip roof rising to a flat crown at ~24 m; the north side is ~6-9 m uphill.
import * as THREE from 'three';
import { Kit, inset, curtain, gAt, signText } from './lib/b03-kit.js';
import { panelMat, flatTileMat, entry, planting, pathEntrances, rnMats, tube } from './lib/rn-kit.js';

export const info = {
  id: 'c-v-starr-east-asian-library', name: 'C. V. Starr East Asian Library', subtitle: 'Tod Williams Billie Tsien · 2008',
  blurb: 'The first free-standing East Asian library building in the United States, holding Berkeley\'s Chinese, Japanese and Korean collections behind a screen of bronze.',
  replaces: ['w/24024349', 'way/24024349'],
};

// bronze screen: lower "ice-ray" lattice (random straight bars) and upper stacked rectangular cells; white bars on transparent,
// tinted by the material colour. One tile = `bw` metres wide x `H` metres tall.
function screenTex(H, bw, seed, fine = 1) {
  const W = 1024, Hp = 2048; const c = document.createElement('canvas'); c.width = W; c.height = Hp; const g = c.getContext('2d');
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const px = W / bw, py = Hp / H; const lw = 0.085 * px / fine; g.lineCap = 'square';
  const bar = (x0, y0, x1, y1, w = lw) => { const k = 0.78 + rnd() * 0.22; g.strokeStyle = `rgb(${255 * k | 0},${255 * k | 0},${255 * k | 0})`; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  const yRail = Hp * (1 - 0.36);
  // lower tier: jittered points joined to near neighbours (wraps horizontally)
  const cell = 0.55 / fine; const nx = Math.round(bw / cell), ny = Math.round(H * 0.36 / cell); const pts = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) pts.push([(i + 0.15 + rnd() * 0.7) * W / nx, yRail + (j + (j === 0 || j === ny ? 0 : rnd() * 0.8 - 0.4)) * (Hp - yRail) / ny]);
  for (const p of pts) {
    const near = pts.map((q) => { let dx = q[0] - p[0]; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; return [dx, q[1] - p[1]]; }).filter(([dx, dy]) => dx || dy).sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
    for (const [dx, dy] of near.slice(0, 3)) { bar(p[0], p[1], p[0] + dx, p[1] + dy, lw * 1.35); bar(p[0] - W, p[1], p[0] - W + dx, p[1] + dy, lw * 1.35); bar(p[0] + W, p[1], p[0] + W + dx, p[1] + dy, lw * 1.35); }
  }
  // upper tier: rows of random height with vertical bars at random spacing
  let y = yRail;
  while (y > 0) {
    const rh = (0.3 + rnd() * 0.5) * py / fine; const y2 = Math.max(0, y - rh); bar(0, y2, W, y2, lw * 0.9);
    let x = rnd() * 0.3 * px; while (x < W) { bar(x, y, x, y2, lw * 0.85); x += (0.1 + rnd() * 0.22) * px / fine; }
    y = y2;
  }
  bar(0, yRail, W, yRail, lw * 2.2); bar(0, 2, W, 2, lw * 2); bar(0, Hp - 2, W, Hp - 2, lw * 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  return t;
}

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M; const X = rnMats(M);
  const tint = (base, hex, r) => { const m = base.clone(); m.color = new THREE.Color(hex); if (r != null) m.roughness = r; return m; };
  const PANEL = panelMat('ealStone', { pw: 1.32, ph: 3.3, span: 6.6, base: 0xe5e6e3, joint: 0xb3b5b4, vary: 0.022, grain: 0.012 });
  const PLINTH = tint(M.concrete, 0xd8d1c0); const DARK = tint(M.granite, 0x5e5f60, 0.6);
  const ROOF = flatTileMat('ealRoof', { base: 0x8a5442, tw: 0.33, rh: 0.3, vary: 0.08 }); 
  const FR = new THREE.MeshStandardMaterial({ color: 0x34302b, roughness: 0.45, metalness: 0.6 }); const FASCIA = FR; const TERRA = new THREE.MeshStandardMaterial({ color: 0xb4523a, roughness: 0.7 });
  const STEP = tint(M.graniteDark, 0xc4c2bc); const CANOPY = X.alum;
  const colliders = [], walkables = [];
  const u0 = -29.6, u1 = 29.6, v0 = -13.6, v1 = 13.6, EAVE = 19.0, CROWN = 24.0, PL = 5.4;
  const poly = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const RS = K.run([u0, v1], [u1, v1]), RE = K.run([u1, v1], [u1, v0]), RN = K.run([u1, v0], [u0, v0]), RW = K.run([u0, v0], [u0, v1]);
  const gLow = (R) => { let m = Infinity; for (let i = 0; i <= 12; i++) m = Math.min(m, gAt(K, R, R.L * i / 12, 0.6)); return m; };
  const yb = (R) => gLow(R) - 1.5;

  // ---------------- south (glade) front
  const SC0 = 6.0, SC1 = 33.5;           // main screen span along the south run
  const SE0 = 46.6, SE1 = 51.6;          // secondary screen recess above the entrance pavilion
  {
    const R = RS; const b = yb(R);
    // plinth: smooth concrete with five small punched windows (terracotta reveals) in the west part, dark stone band to the east
    const pw = [3.5, 6.0, 8.5, 11.0, 13.5].map((c) => ({ s0: c - 0.45, s1: c + 0.45, y0: gAt(K, R, c, 1) + 1.0, y1: gAt(K, R, c, 1) + 2.6 })).filter((o) => o.y1 < PL - 0.4);
    K.wall(R, PLINTH, 0, R.L, b, PL, pw, 0.5);
    for (const o of pw) { K.rbox(R, TERRA, o.s0, o.y0, -0.45, o.s0 + 0.06, o.y1, 0); K.rbox(R, TERRA, o.s1 - 0.06, o.y0, -0.45, o.s1, o.y1, 0); K.rbox(R, TERRA, o.s0, o.y1 - 0.06, -0.45, o.s1, o.y1, 0); K.rbox(R, TERRA, o.s0, o.y0, -0.45, o.s1, o.y0 + 0.05, 0); K.fill(R, o, { rev: 0.4, frame: FR, mull: 0, glass: M.windowNight }); }
    K.rbox(R, DARK, 36.0, b, -0.02, 46.0, Math.min(PL - 0.6, gAt(K, R, 41, 1) + 3.0), 0.06);
    // upper stone volume with the screen opening, a tall slot, the recess and a narrow slot near the east corner
    const slot = { s0: 38.2, s1: 39.0, y0: 9.0, y1: 13.5 }, slot2 = { s0: 55.6, s1: 56.2, y0: 10.5, y1: 14.0 };
    K.wall(R, PANEL, 0, R.L, PL, EAVE, [{ s0: SC0, s1: SC1, y0: PL + 0.05, y1: EAVE - 0.35 }, slot, slot2, { s0: SE0, s1: SE1, y0: 8.2, y1: 15.2 }], 0.45);
    for (const o of [slot, slot2]) K.fill(R, o, { rev: 0.32, frame: FR, mull: 0, glass: M.windowNight, sill: false });
    K.rbox(R, PLINTH, -0.02, PL - 0.05, -0.3, R.L + 0.02, PL + 0.04, 0.02); // slight shadow joint where stone overhangs the plinth
    // glazing behind the main screen + floor slabs, then the screen 0.75 m out on fins with a catwalk at its base
    curtain(K, R, SC0, SC1, PL + 0.05, EAVE - 0.35, { glass: M.windowNight, frame: FR, mw: 1.72, depth: 0.25, rows: [9.6, 14.2], spandrels: [[9.3, 9.9], [13.9, 14.5]], spandrelMat: DARK });
    const H = EAVE - 0.35 - PL; const tex = screenTex(H, 5.16, 7); const BRZ = new THREE.MeshStandardMaterial({ color: 0x8a6a50, map: tex, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 });
    const sg = new THREE.PlaneGeometry(SC1 - SC0, H); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (SC1 - SC0) / 5.16);
    sg.translate((SC0 + SC1) / 2, PL + H / 2, 0.78); K.addRun(R, BRZ, sg, { uvMode: 'keep' });
    const nb = 16; for (let i = 0; i <= nb; i++) { const s = SC0 + (SC1 - SC0) * i / nb; K.rbox(R, M.bronze, s - 0.035, PL, -0.2, s + 0.035, EAVE - 0.35, 0.86); }
    K.rbox(R, FASCIA, SC0, PL - 0.1, 0, SC1, PL + 0.06, 1.0); K.rbox(R, M.bronze, SC0, EAVE - 0.5, 0, SC1, EAVE - 0.35, 0.86);
    // secondary gold screen in its recess
    const tex2 = screenTex(7.0, 2.5, 19, 1.7); const GOLD = new THREE.MeshStandardMaterial({ color: 0xc09a66, map: tex2, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.75 });
    K.rbox(R, M.concreteDark, SE0, 8.2, -0.46, SE1, 15.2, -0.4); K.rbox(R, M.windowNight, SE0, 8.4, -0.4, SE1, 15.0, -0.38);
    const sg2 = new THREE.PlaneGeometry(SE1 - SE0, 7.0); const uv2 = sg2.attributes.uv; for (let i = 0; i < uv2.count; i++) uv2.setX(i, uv2.getX(i) * 2.0); sg2.translate((SE0 + SE1) / 2, 11.7, -0.1); K.addRun(R, GOLD, sg2, { uvMode: 'keep' });
    signText(K, R, 'C. V. STARR EAST ASIAN LIBRARY', 41.6, 7.2, 0.3, { font: 'Helvetica, Arial, sans-serif', weight: '500', spacing: 0.12, color: '#c9b48e', metal: 0.7, d: 0.03 });
  }
  // ---------------- east, west and north faces: stone panels with tall narrow slots (kept clear of the doors)
  const ents = pathEntrances(K, ctx, [RE, RN, RW]).filter((e) => gAt(K, e.R, e.s, 1.6) < EAVE - 6);
  for (const [R, slots0] of [[RE, [3.0, 7.5, 13.6, 18.4, 24.0]], [RW, [6.5, 20.5]], [RN, [8.0, 15.0, 24.5, 34.0, 43.5, 51.0]]]) {
    const slots = slots0.filter((c) => !ents.some((e) => e.R === R && Math.abs(e.s - c) < 2.4));
    const b = yb(R); const ops = slots.map((c) => { const g = gAt(K, R, c, 0.8); return { s0: c - 0.22, s1: c + 0.22, y0: Math.max(g + 0.9, PL + 0.6), y1: Math.min(EAVE - 1.0, Math.max(g + 0.9, PL + 0.6) + 5.5) }; });
    K.wall(R, PANEL, 0, R.L, Math.max(b, PL - 0.02), EAVE, ops, 0.45);
    if (b < PL) K.wall(R, PLINTH, 0, R.L, b, PL, [], 0.5);
    for (const o of ops) K.fill(R, o, { rev: 0.32, frame: FR, mull: 0, glass: M.windowNight, sill: false });
  }
  // ---------------- roof: thin dark fascia, low rust-brown hip with a flat crown, two low skylights on the south slope
  for (const R of [RS, RE, RN, RW]) K.rbox(R, FASCIA, -0.38, EAVE - 0.26, -0.05, R.L + 0.38, EAVE + 0.02, 0.38);
  K.prism(M.concreteDark, poly, EAVE - 0.4, EAVE + 0.0);
  K.hip(ROOF, u0 - 0.38, v0 - 0.38, u1 + 0.38, v1 + 0.38, EAVE, (CROWN - EAVE) / 13.4, { yTop: CROWN });
  K.box(FASCIA, -16.3, CROWN - 0.05, -0.55, 16.3, CROWN + 0.12, 0.55);
  // opaque core behind all glazing
  K.prism(M.concreteDark, inset(poly, 1.0), yb(RS) + 0.5, EAVE - 0.3);

  // ---------------- south-east entrance pavilion, canopy, steps, pylon
  {
    const R = RS; const sA = 48.6, sB = 58.6; const gT = gAt(K, R, 53.6, 3.0); const FL = Math.max(gT, gAt(K, R, 53.6, 1.0));
    const D = 3.6, HP = 4.2;
    const RF = K.run(R.at(sA, D), R.at(sB, D)); // pavilion front (faces south)
    const RPE = K.run(R.at(sB, D), R.at(sB, 0)), RPW = K.run(R.at(sA, 0), R.at(sA, D));
    for (const Rp of [RF, RPE, RPW]) { curtain(K, Rp, 0.05, Rp.L - 0.05, FL, FL + HP, { glass: M.windowNight, frame: FR, mw: 1.5, depth: 0.06, rows: [FL + 2.5] }); }
    K.prism(M.concreteDark, [R.at(sA, 0), R.at(sB, 0), R.at(sB, D), R.at(sA, D)].map(([u, v]) => [u, v]), FL - 1.0, FL + 0.02);
    // thin cantilevered canopy over the pavilion and steps, guardrail on its roof terrace edge
    K.rbox(R, CANOPY, sA - 0.8, FL + HP, 0, sB + 1.4, FL + HP + 0.24, D + 2.6);
    K.rbox(R, M.lampGlow, sA + 1, FL + HP - 0.01, D + 0.6, sB - 1, FL + HP, D + 0.75, { detail: true });
    for (let s = sA - 0.6; s <= sB + 1.3; s += 1.2) K.rbox(R, M.iron, s - 0.02, FL + HP + 0.24, D + 2.45, s + 0.02, FL + HP + 1.3, D + 2.5, { detail: true });
    K.rbox(R, M.iron, sA - 0.8, FL + HP + 1.25, D + 2.42, sB + 1.4, FL + HP + 1.31, D + 2.52, { detail: true });
    // doors in the pavilion front
    for (const s of [RF.L / 2 - 0.95, RF.L / 2 + 0.95]) { K.rbox(RF, X.steel, s - 0.5, FL + 0.95, 0.02, s + 0.5, FL + 1.0, 0.08, { detail: true }); }
    // entrance terrace in front of the pavilion and broad stone steps down to the glade path (from the packet: they climb north at u≈30.5)
    const terr = [R.at(42.0, 0), R.at(sB + 2.5, 0), R.at(sB + 2.5, D + 3.4), R.at(42.0, D + 3.4)];
    K.prism(STEP, terr, Math.min(FL, gT) - 1.2, FL); walkables.push(K.walkPoly(terr, FL));
    const gPath = Math.min(K.g(31.2, 24.4), K.g(29.0, 24.4), K.g(33.0, 24.4)); const vTop = v1 + D + 3.4;
    if (FL - gPath > 0.3) { const n = Math.max(3, Math.round((FL - gPath) / 0.155)); const len = Math.min(n * 0.36, 8.0); walkables.push(K.stairs(STEP, 26.4, vTop, 34.0, vTop + len, gPath, FL, '-v', n));
      for (const u of [26.55, 33.85]) { const tl = (a, b) => { const g = new THREE.CylinderGeometry(0.022, 0.022, Math.hypot(len, FL - gPath), 8); g.rotateX(-Math.atan2(len, FL - gPath)); g.translate(u, (FL + gPath) / 2 + 0.9, vTop + len / 2); K.add(X.steel, g, { uvMode: 'keep', detail: true }); }; tl(); } }
    // dark granite pylon east of the steps, with low dark granite walls/benches running east
    const PYL = tint(M.granite, 0x8a8b88, 0.7); K.box(PYL, 35.0, gPath - 0.5, 17.9, 36.2, gPath + 10.5, 19.1); colliders.push(K.colPoly([[35, 17.9], [36.2, 17.9], [36.2, 19.1], [35, 19.1]], gPath - 1, gPath + 10.5));
    K.box(DARK, 36.2, gPath - 0.5, 18.2, 42.0, gPath + 0.5, 18.8); K.box(DARK, 36.2, gPath - 0.5, 20.6, 41.0, gPath + 0.45, 21.2);
    colliders.push(K.colPoly([R.at(sA, 0), R.at(sB, 0), R.at(sB, D), R.at(sA, D)], FL - 1, FL + HP + 0.3));
  }
  // ---------------- planted terrace: retaining wall ~5 m out from the plinth with a hedge on top, shrubs on the terrace
  {
    const R = RS; const segs = [[-0.5, 14, 1.2], [14, 28, 1.5], [28, 42.0, 1.8]];
    for (const [a, b, hh] of segs) {
      const g0 = Math.min(gAt(K, R, a, 6.0), gAt(K, R, b, 6.0)); const gi = Math.max(gAt(K, R, a, 4.5), gAt(K, R, b, 4.5), gAt(K, R, (a + b) / 2, 4.5)); const top = Math.max(gi + 0.45, g0 + hh * 0.6);
      K.rbox(R, PLINTH, a, g0 - 1.0, 5.0, b, top, 5.45); K.rbox(R, PLINTH, a - 0.02, top, 4.95, b + 0.02, top + 0.08, 5.5);
      colliders.push(K.colPoly([R.at(a, 5.0), R.at(b, 5.0), R.at(b, 5.45), R.at(a, 5.45)], g0 - 1, top + 0.1));
    }
    for (const [a, b] of [[-2.0, 21.0], [21.0, 40.0]]) { // lower wall ~1 m high along the glade path
      const g0 = Math.min(gAt(K, R, a, 9.2), gAt(K, R, b, 9.2)); const gi = Math.max(gAt(K, R, a, 8.4), gAt(K, R, b, 8.4)); const top = Math.max(gi + 0.3, g0 + 0.9);
      K.rbox(R, PLINTH, a, g0 - 1.0, 8.6, b, top, 9.0); K.rbox(R, PLINTH, a - 0.02, top, 8.55, b + 0.02, top + 0.07, 9.05);
      colliders.push(K.colPoly([R.at(a, 8.6), R.at(b, 8.6), R.at(b, 9.0), R.at(a, 9.0)], g0 - 1, top + 0.1));
    }
    planting(K, R, -1.5, 39.5, { d0: 5.5, d: 0.6, depth: 3.0, h: 0.9, w: 1.3, curb: false, seed: 8, mats: [X.leafB, X.leafC] }); // shrubs on the slope between the two walls
    planting(K, R, 0.2, 41.5, { d: 3.2, depth: 4.6, h: 0.8, w: 1.4, curb: false, seed: 4 });
    planting(K, R, 0.2, 41.5, { d: 0.6, depth: 1.0, h: 0.7, hedge: true, curb: false, seed: 5 });
    // ramp along the outside of the wall, rising west -> east to the entrance terrace, dark metal rail
    const rA = 20.0, rB = 42.0; const gA = gAt(K, R, rA, 6.4); const FLr = gAt(K, R, 53.6, 1.0);
    if (FLr - gA > 0.4) {
      const len = rB - rA; const segN = 11;
      for (let i = 0; i < segN; i++) { const s0 = rA + len * i / segN, s1 = rA + len * (i + 1) / segN; const y = gA + (FLr - gA) * (i + 1) / segN; K.rbox(R, STEP, s0, Math.min(gAt(K, R, s0, 6.4), y) - 0.8, 5.5, s1, y, 7.3); }
      walkables.push({ type: 'fn', ...(() => { const cs = [R.at(rA, 5.5), R.at(rB, 5.5), R.at(rB, 7.3), R.at(rA, 7.3)].map(([u, v]) => K.xz(u, v)); return { bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))] }; })(),
        heightAt: (x, z) => { const [u, v] = K.uv(x, z); const s = u - R.a[0], d = v - R.a[1]; if (s < rA || s > rB || d < 5.5 || d > 7.3) return null; return gA + (FLr - gA) * Math.ceil((s - rA) / len * segN) / segN; } });
      tube(K, R, X.steel, [rA, gA + 0.9, 7.25], [rB, FLr + 0.9, 7.25], 0.022);
      for (let s = rA; s <= rB; s += 2.2) { const y = gA + (FLr - gA) * (s - rA) / len; tube(K, R, X.steel, [s, y, 7.25], [s, y + 0.9, 7.25], 0.02); }
    }
  }
  // ---------------- entrances where the packet's paths meet the east and north walls
  for (const e of ents) {
    const r = entry(K, e.R, e.s, { w: 2.4, h: 3.0, surround: DARK, sw: 0.4, sp: 0.35, frame: FR, stepMat: STEP, landing: 1.2 });
    walkables.push(...r.walkables); colliders.push(...r.colliders);
  }
  colliders.push(K.colPoly(poly, yb(RS) - 1, CROWN));
  const object3d = K.finish(); object3d.name = 'c-v-starr-east-asian-library';
  return { object3d, colliders, walkables };
}
