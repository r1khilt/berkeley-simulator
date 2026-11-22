// Sutardja Dai Hall (2009), headquarters of CITRIS and the Banatao Institute, between Cory and Davis halls.
// Signature look: a long bar clad in rosy-brown striated terracotta rainscreen with narrow punched windows and grey louvred strips,
// two storeys of recessed glass under a thin, deep-overhang, shallow gabled metal roof (a "house" silhouette at the narrow ends),
// a five-storey terracotta podium along the south with the A. Richard Newton bridge to Cory Hall at its top, a lower glazed west
// wing, and a stepped north wing. Massing follows the 2021 LiDAR: eaves ~28.6 m, ridge ~32.8 m, podium 18.3 m, north wing 20-27 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, inset, gAt, storefront, curtain, signText, steps } from './lib/b03-kit.js';
import { bakeMat, panelMat, planting, bikes } from './lib/rn-kit.js';
import { hash2, fbm } from '../lib/noise.js';

export const info = {
  id: 'sutardja-dai-hall-citris',
  name: 'Sutardja Dai Hall',
  subtitle: 'CITRIS headquarters · 2009',
  blurb: 'Home of CITRIS (the Center for Information Technology Research in the Interest of Society) and the Banatao Institute, with the Marvell Nanofabrication Laboratory and the Banatao Auditorium. It is named for Marvell founders Sehat Sutardja and Weili Dai.',
  replaces: ['w/24024350'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.8);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  // refine-north: warm taupe-brown striated rainscreen (0.4 m courses, joints every 3 m), metal standing-seam roof, dark bronze frames
  const TC = bakeMat('sdhClad', (x, y) => { const row = Math.floor(y * 15), col = Math.floor(x * 2 + (row % 2) * 0.5); const fv = y * 15 - row, fu = x * 2 + (row % 2) * 0.5 - col;
    if (fv < 0.02 || fu < 0.003) return [96, 86, 76, 0.25, 0.9];
    const t = hash2(row, 3, 17); const base = t < 0.35 ? [128, 114, 100] : t < 0.6 ? [114, 101, 88] : t < 0.85 ? [140, 126, 110] : [121, 108, 95];
    const k = 0.94 + fbm(x * 30, y * 6, 30, 3, 5) * 0.12 + Math.sin((y * 15 + x * 0.4) * Math.PI * 6) * 0.015; return [base[0] * k, base[1] * k, base[2] * k, 0.5 + fv * 0.2, 0.8]; }, { span: 6, rough: 0.8, normal: 3 });
  const ROOFM = panelMat('sdhRoof', { pw: 0.5, ph: 6.0, span: 6.0, base: 0x8e8f8c, joint: 0x666766, jw: 0.03, vary: 0.01, grain: 0.01, stagger: false, rough: 0.45, metal: 0.6 });
  const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.45, metalness: 0.6 }), LV = B.louvre;
  const colliders = [], walkables = [];
  const levels = [0.6, 4.6, 8.6, 12.6, 16.6, 20.6, 24.6, 28.6];
  const EAVE = 28.6, RIDGE = 32.8;
  // ---- main bar: terracotta up to level 6, recessed glass storeys above
  const u0 = -33.8, u1 = 22.0, v0 = -2.0, v1 = 20.0;
  const winS = { w: 1.25, h: 2.0, sill: 0.9, bay: 2.6, mull: 0 };
  // long faces: glass curtain wall with thin mullions and cladding spandrels; narrow ends: solid cladding (refine-north, per photos)
  const mainRuns = massBlock(K, { poly: rect(u0, v0, u1, v1), levels: levels.slice(0, 6), top: 20.6, wall: TC, style: 'punched', depth: 0.4, rev: 0.28, glass: GL, frame: FR, win: winS, roof: M.concreteDark,
    edgeOpts: { 0: { style: 'curtain', win: { mw: 1.5, spandrel: 1.0 } }, 2: { style: 'curtain', win: { mw: 1.5, spandrel: 1.0 } }, 1: { style: 'blank' }, 3: { style: 'blank' } } });
  // one wide two-storey ribbon window group high on each narrow end
  for (const R of mainRuns) if (R.L < 30) { const c = R.L / 2; K.rbox(R, M.concreteDark, c - 5.2, levels[3] + 0.6, -0.42, c + 5.2, levels[5] - 0.4, -0.38); curtain(K, R, c - 5.0, c + 5.0, levels[3] + 0.8, levels[5] - 0.6, { glass: GL, frame: FR, mw: 1.0, depth: 0.1, rows: [levels[4]] }); }
  massBlock(K, { poly: rect(u0 + 0.6, v0 + 0.6, u1 - 0.6, v1 - 0.6), levels: [20.6, 24.6, EAVE], top: EAVE, wall: TC, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.25, tran: 1.2, bay: 2.6, w: 0.95, h: 1.6, sill: 1.1 }, core: true, roof: M.concreteDark,
    edgeOpts: { 1: { style: 'punched' }, 3: { style: 'punched' } }, depth: 0.4, rev: 0.28 });
  // grey louvred strips between window columns
  for (const R of mainRuns) {
    if (R.L < 30) { const s = R.L - 2.2; K.rbox(R, LV, s - 0.75, Math.max(0.6, gAt(K, R, s, 1)), -0.05, s + 0.75, 20.4, 0.08); for (let y = 1.5; y < 20.3; y += 0.22) K.rbox(R, M.iron, s - 0.72, y, 0.08, s + 0.72, y + 0.04, 0.11, { detail: true }); } // full-height louvre strip near one corner
    K.rbox(R, FR, -0.05, 20.45, -0.05, R.L + 0.05, 20.75, 0.12); // slab edge between cladding and glass
    if (R.L > 40) for (const y of levels.slice(1, 6)) { if (y < gAt(K, R, R.L / 2, 1) + 2) continue; K.rbox(R, FR, 0.3, y - 0.95, 0.0, R.L - 0.3, y - 0.88, 0.65, { detail: true }); for (let x = 1.0; x < R.L - 0.5; x += 3.0) K.rbox(R, FR, x - 0.03, y - 1.0, 0.0, x + 0.03, y - 0.88, 0.65, { detail: true }); }
  }
  // thin, deep-overhang shallow gable roof (ridge along the bar); light soffit
  K.gable(ROOFM, u0 + 0.6, v0 + 0.6, u1 - 0.6, v1 - 0.6, EAVE + 0.1, RIDGE - EAVE - 0.1, 'u', { overhang: 2.0, wallMat: TC, thick: 0.22 });
  { const sl = (RIDGE - EAVE - 0.1) / ((v1 - v0 - 1.2) / 2); const yE = EAVE + 0.1 - 2.0 * sl; // dark fascia along both eaves and the rakes
    K.box(FR, u0 + 0.6 - 2.0, yE - 0.32, v0 + 0.6 - 2.05, u1 - 0.6 + 2.0, yE, v0 + 0.6 - 1.95); K.box(FR, u0 + 0.6 - 2.0, yE - 0.32, v1 - 0.6 + 1.95, u1 - 0.6 + 2.0, yE, v1 - 0.6 + 2.05); }
  // gable ends: terracotta to the apex with a horizontal glazing band under the eave and a grey louvre panel at the apex
  for (const [uu, sgn] of [[u0 + 0.6, -1], [u1 - 0.6, 1]]) {
    const vm = (v0 + v1) / 2;
    K.box(GL, uu + sgn * 0.02 - 0.03, EAVE - 2.6, vm - 3.2, uu + sgn * 0.02 + 0.03, EAVE - 0.3, vm + 3.2);
    K.box(FR, uu + sgn * 0.04 - 0.04, EAVE - 2.7, vm - 3.3, uu + sgn * 0.04 + 0.04, EAVE - 2.6, vm + 3.3, { detail: true });
    K.box(LV, uu + sgn * 0.03 - 0.04, EAVE + 0.3, vm - 0.9, uu + sgn * 0.03 + 0.04, RIDGE - 0.9, vm + 0.9);
  }
  // ---- south podium strip (five storeys of terracotta; the Newton bridge lands on its roof terrace)
  const PODIUM = 18.3;
  massBlock(K, { poly: rect(u0, v1, u1, 23.74), levels: levels.slice(0, 5).concat([PODIUM]), top: PODIUM, wall: TC, style: 'punched', depth: 0.4, rev: 0.28, glass: GL, frame: FR, win: winS, roof: M.paving, parapet: 1.1, pmat: GL, coping: FR, skipEdges: [] });
  walkables.push(K.walkPoly(rect(u0 + 0.5, v1, u1 - 0.5, 23.3), PODIUM));
  // ground-floor colonnade + glass storefront along the south (recessed lobby) with a cantilevered canopy
  {
    const R = K.run([u0, 23.74], [u1, 23.74]);
    for (let s = 6; s < R.L - 6; s += 3.2) { const gy = gAt(K, R, s, 1.5); K.rbox(R, TC, s - 0.6, gy - 0.5, 0.0, s + 0.6, levels[1], 1.2); }
    const gy = gAt(K, R, R.L * 0.7, 2.5);
    K.rbox(R, FR, R.L * 0.55, levels[1] + 0.2, 0, R.L * 0.9, levels[1] + 0.5, 3.2);
    { const p = R.at(R.L * 0.85, 2.9); K.cyl(B.alum, p[0], gy - 0.3, p[1], 0.12, 0.12, levels[1] + 0.5 - gy, 10); }
    signText(K, R, 'SUTARDJA DAI HALL', R.L * 0.72, levels[1] + 0.5, 0.36, { color: '#d9d4c8', metal: 0.5, d: 3.22, weight: '500', font: 'Helvetica, Arial, sans-serif' });
    planting(K, R, 2.0, R.L * 0.5, { d0: 1.4, depth: 1.4, h: 0.8, seed: 21 });
    colliders.push(...bikes(K, R, R.L * 0.33, 4.2, 6, 3));
  }
  // ---- lower glazed west wing (LiDAR 9 m) and the stepped north wing (20 → 24.6 → 27 → 23 m)
  massBlock(K, { poly: rect(-33.98, -6.65, -1.0, v0), levels: [0.6, 4.6, 9.0], top: 9.0, wall: TC, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.6, spandrel: 0.6 }, roof: M.concreteDark, parapet: 0.4, pmat: B.panel });
  const nw = [[-1.0, -17.0, 25.5, -2.0, 20.2], [-1.0, -21.0, 25.0, -17.0, 24.6], [-1.0, -31.0, 24.0, -21.0, 27.0], [8.0, -33.0, 22.0, -31.0, 22.0], [-4.4, -33.0, -1.0, -6.65, 6.5], [-1.0, -33.0, 8.0, -31.0, 8.0]];
  for (const [a, b, c, d, top] of nw) {
    const lv = levels.filter((y) => y < top - 1.5).concat([top]);
    massBlock(K, { poly: rect(a, b, c, d), levels: lv, top, wall: TC, style: 'punched', depth: 0.4, rev: 0.28, glass: GL, frame: FR, win: winS, roof: B.roofMembrane, parapet: 0.6, pmat: TC, coping: B.panel });
  }
  // ---- A. Richard Newton Bridge to Cory Hall
  // [r5-audit-north] rebuilt from C. Sequin's 2009 construction / dedication photos: an open footbridge leaving the south
  // podium roof terrace (18.3 m) and landing at a Cory doorway (~0.65 m higher), on an underslung Warren truss whose bottom
  // chord bellies down to midspan (fish-belly), warm bronze-grey steel; champagne-framed perforated guard panels with a
  // glass screen above and a round stainless handrail. The old version (two teal box girders, 1 m below the terrace) read
  // as a floating slab.
  {
    const bu0 = u1 + 0.05, bu1 = 39.15, bv = 21.75, w = 3.0, hw = w / 2;
    const yA = PODIUM, yB = PODIUM + 0.65, camber = 0.22;
    const deckY = (u) => { const t = (u - bu0) / (bu1 - bu0); return yA + (yB - yA) * t + camber * 4 * t * (1 - t); };
    const STEEL = new THREE.MeshStandardMaterial({ color: 0x6b5f52, roughness: 0.5, metalness: 0.55 });
    const CHAMP = new THREE.MeshStandardMaterial({ color: 0xa8987c, roughness: 0.4, metalness: 0.6 });
    const MESH = new THREE.MeshStandardMaterial({ color: 0x7f7a70, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide });
    const SCREEN = new THREE.MeshStandardMaterial({ color: 0x8fa3ad, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    const bar = (mat, p0, p1, t, opts) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2]; const L = Math.hypot(dx, dy, dz); if (L < 1e-3) return;
      const g = new THREE.BoxGeometry(L, t, t); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx / L, dy / L, dz / L)); g.applyQuaternion(q);
      g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2); K.add(mat, g, opts); };
    const N = 8, L = bu1 - bu0; const us = Array.from({ length: N + 1 }, (_, i) => bu0 + L * i / N);
    // deck: a slab following the camber, paver-grey walking surface
    { const sh = new THREE.Shape(); sh.moveTo(bu0, deckY(bu0) - 0.32); for (const u of us) sh.lineTo(u, deckY(u)); for (const u of [...us].reverse()) sh.lineTo(u, deckY(u) - 0.32); 
      const eg = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); eg.translate(0, 0, bv - hw); K.add(M.paving, eg); }
    // underslung Warren trusses under both deck edges: top chord = deck edge beam, bottom chord bellies to ~1.9 m at midspan
    const depth = (u) => { const t = (u - bu0) / L; return 0.45 + 1.45 * 4 * t * (1 - t); };
    for (const sv of [-1, 1]) {
      const v = bv + sv * (hw - 0.15);
      for (let i = 0; i < N; i++) {
        const ua = us[i], ub = us[i + 1];
        bar(STEEL, [ua, deckY(ua) - 0.42, v], [ub, deckY(ub) - 0.42, v], 0.2);                                      // top chord
        bar(STEEL, [ua, deckY(ua) - 0.32 - depth(ua), v], [ub, deckY(ub) - 0.32 - depth(ub), v], 0.18);             // bottom chord
        const up = i % 2 === 0; const um = (ua + ub) / 2;                                                            // Warren diagonals
        bar(STEEL, [up ? ua : ub, deckY(up ? ua : ub) - 0.42, v], [um, deckY(um) - 0.32 - depth(um), v], 0.12, { detail: true });
        bar(STEEL, [um, deckY(um) - 0.32 - depth(um), v], [up ? ub : ua, deckY(up ? ub : ua) - 0.42, v], 0.12, { detail: true });
      }
    }
    for (let i = 0; i <= N; i++) { const u = us[i], y = deckY(u) - 0.32 - depth(u); bar(STEEL, [u, y, bv - hw + 0.15], [u, y, bv + hw - 0.15], 0.12, { detail: true }); }   // bottom cross members
    // guards: champagne posts every ~1.5 m, perforated panels to 1.07 m, a glass screen above, stainless handrail
    const np = Math.round(L / 1.5);
    for (const sv of [-1, 1]) {
      const v = bv + sv * (hw - 0.04);
      for (let i = 0; i <= np; i++) { const u = bu0 + L * i / np, y = deckY(u); bar(CHAMP, [u, y, v], [u, y + 1.75, v], 0.07, { detail: i % 2 === 1 }); }
      for (let i = 0; i < np; i++) { const ua = bu0 + L * i / np + 0.05, ub = bu0 + L * (i + 1) / np - 0.05, ya = deckY(ua), yb = deckY(ub);
        const pg = new THREE.BufferGeometry(); const P = [ua, ya + 0.08, v, ub, yb + 0.08, v, ub, yb + 1.02, v, ua, ya + 0.08, v, ub, yb + 1.02, v, ua, ya + 1.02, v];
        pg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); pg.computeVertexNormals();
        K.add(MESH, pg);
        const gg = new THREE.BufferGeometry(); const Q = [ua, ya + 1.07, v, ub, yb + 1.07, v, ub, yb + 1.72, v, ua, ya + 1.07, v, ub, yb + 1.72, v, ua, ya + 1.72, v];
        gg.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); gg.computeVertexNormals(); K.add(SCREEN, gg, { detail: true });
      }
      for (let i = 0; i < N; i++) { const ua = us[i], ub = us[i + 1]; bar(B.alum, [ua, deckY(ua) + 1.04, v - sv * 0.08], [ub, deckY(ub) + 1.04, v - sv * 0.08], 0.05, { detail: true }); bar(CHAMP, [ua, deckY(ua) + 1.76, v], [ub, deckY(ub) + 1.76, v], 0.06); }
    }
    // Cory end: glazed door portal in a dark frame where the deck meets the Cory wall
    K.box(FR, bu1 - 0.25, yB - 0.05, bv - hw - 0.2, bu1 + 0.15, yB + 2.85, bv + hw + 0.2);
    K.box(GL, bu1 - 0.3, yB, bv - hw + 0.05, bu1 - 0.24, yB + 2.6, bv + hw - 0.05);
    walkables.push(K.walkFn(bu0, bv - hw, bu1, bv + hw, (u, v) => (u < bu0 - 0.05 || u > bu1 + 0.05 || v < bv - hw - 0.05 || v > bv + hw + 0.05) ? null : deckY(Math.max(bu0, Math.min(bu1, u)))));
  }
  // ---- colliders
  colliders.push(K.colPoly(rect(u0, v0, u1, 23.74), -2, RIDGE));
  colliders.push(K.colPoly(rect(-33.98, -6.65, -1.0, v0), -2, 9.4));
  for (const [a, b, c, d, top] of nw) colliders.push(K.colPoly(rect(a, b, c, d), -2, top + 0.6));
  const object3d = K.finish(); object3d.name = 'sutardja-dai-hall-citris';
  return { object3d, colliders, walkables };
}
