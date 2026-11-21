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
    if (fv < 0.035 || fu < 0.004) return [92, 78, 64, 0.2, 0.9];
    const t = hash2(row, 3, 17); const base = t < 0.35 ? [138, 115, 94] : t < 0.6 ? [107, 88, 70] : t < 0.85 ? [164, 142, 118] : [150, 128, 104];
    const k = 0.94 + fbm(x * 30, y * 6, 30, 3, 5) * 0.12 + Math.sin((y * 15 + x * 0.4) * Math.PI * 6) * 0.015; return [base[0] * k, base[1] * k, base[2] * k, 0.5 + fv * 0.2, 0.8]; }, { span: 6, rough: 0.8, normal: 3 });
  const ROOFM = panelMat('sdhRoof', { pw: 0.5, ph: 6.0, span: 6.0, base: 0x8e8f8c, joint: 0x666766, jw: 0.03, vary: 0.01, grain: 0.01, stagger: false, rough: 0.45, metal: 0.6 });
  const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x3a3631, roughness: 0.45, metalness: 0.6 }), LV = B.louvre;
  const colliders = [], walkables = [];
  const levels = [0.6, 4.6, 8.6, 12.6, 16.6, 20.6, 24.6, 28.6];
  const EAVE = 28.6, RIDGE = 32.8;
  // ---- main bar: terracotta up to level 6, recessed glass storeys above
  const u0 = -33.8, u1 = 22.0, v0 = -2.0, v1 = 20.0;
  const winS = { w: 1.25, h: 2.0, sill: 0.9, bay: 2.6, mull: 0 };
  const mainRuns = massBlock(K, { poly: rect(u0, v0, u1, v1), levels: levels.slice(0, 6), top: 20.6, wall: TC, style: 'punched', depth: 0.4, rev: 0.28, glass: GL, frame: FR, win: winS, roof: M.concreteDark });
  massBlock(K, { poly: rect(u0 + 0.6, v0 + 0.6, u1 - 0.6, v1 - 0.6), levels: [20.6, 24.6, EAVE], top: EAVE, wall: TC, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.25, tran: 1.2, bay: 2.6, w: 0.95, h: 1.6, sill: 1.1 }, core: true, roof: M.concreteDark,
    edgeOpts: { 1: { style: 'punched' }, 3: { style: 'punched' } }, depth: 0.4, rev: 0.28 });
  // grey louvred strips between window columns
  for (const R of mainRuns) {
    const n = Math.round(R.L / 4.8);
    for (let j = 1; j < n; j++) { const s = (R.L / n) * j; K.rbox(R, LV, s - 0.45, Math.max(0.6, gAt(K, R, s, 1)), -0.05, s + 0.45, 20.4, 0.08); for (let y = 1.5; y < 20.3; y += 0.22) K.rbox(R, M.iron, s - 0.42, y, 0.08, s + 0.42, y + 0.04, 0.11, { detail: true }); }
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
  // ---- A. Richard Newton Bridge to Cory Hall (deck ~17.3 m, glass balustrades, cambered steel underside)
  {
    const bv = 19.3, bu0 = u1 + 0.1, bu1 = 39.1, deck = 17.3, w = 3.2;
    K.box(B.panel, bu0, deck - 0.25, bv - w / 2, bu1, deck, bv + w / 2);
    K.box(M.paving, bu0, deck, bv - w / 2 + 0.1, bu1, deck + 0.03, bv + w / 2 - 0.1);
    for (const side of [-1, 1]) {
      K.box(B.glassLight || M.glassLight, bu0, deck, bv + side * (w / 2 - 0.05) - 0.02, bu1, deck + 1.1, bv + side * (w / 2 - 0.05) + 0.02);
      K.box(B.alum, bu0, deck + 1.1, bv + side * (w / 2 - 0.05) - 0.05, bu1, deck + 1.16, bv + side * (w / 2 - 0.05) + 0.05);
    }
    // cambered girder underside (three segments) and V-struts
    const mid = (bu0 + bu1) / 2;
    K.box(B.steelGrey, bu0, deck - 1.1, bv - 1.2, bu1, deck - 0.25, bv - 0.9); K.box(B.steelGrey, bu0, deck - 1.1, bv + 0.9, bu1, deck - 0.25, bv + 1.2); // box girders
    walkables.push(K.walkPoly(rect(bu0, bv - w / 2, bu1, bv + w / 2), deck + 0.03));
  }
  // ---- colliders
  colliders.push(K.colPoly(rect(u0, v0, u1, 23.74), -2, RIDGE));
  colliders.push(K.colPoly(rect(-33.98, -6.65, -1.0, v0), -2, 9.4));
  for (const [a, b, c, d, top] of nw) colliders.push(K.colPoly(rect(a, b, c, d), -2, top + 0.6));
  const object3d = K.finish(); object3d.name = 'sutardja-dai-hall-citris';
  return { object3d, colliders, walkables };
}
