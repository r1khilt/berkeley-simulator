// Berkeley Way West (KieranTimberlake, 2018): School of Public Health, Psychology and Graduate School of Education on the
// block between Hearst Ave and Berkeley Way, west of Shattuck. Massing from the 2021 LiDAR: an eight-storey block along
// Berkeley Way (roof ~35 m) that wraps up the west side, a five-storey wing toward Hearst (roof ~23 m), a slightly lower
// east strip, and two mechanical penthouses on the tall roof. Façades from photos: the tall block is a glass curtain wall
// screened by closely spaced light-grey vertical fins between pale slab bands inside a thin grey frame; the north wing is a
// reflective blue-grey curtain wall with dark spandrels split by a white-framed vertical slot; both sit on a recessed
// dark charcoal panel base with tall narrow windows.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, curtain, punched, flatRoof, inset, std } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'berkeley-way-west',
  name: 'Berkeley Way West',
  subtitle: 'KieranTimberlake · 2018',
  blurb: 'Home to the School of Public Health, the Department of Psychology and the Graduate School of Education, Berkeley Way West opened in 2018.',
  replaces: ['w/431329525'],
};

export async function build(ctx) {
  const ANG = -0.1729; // building frame: u along Berkeley Way (ESE), v toward the south
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const glassBlue = nightGlow(std(0x3a4f63, 'bwwGlass', { rough: 0.08, metal: 0.6, envMapIntensity: 1.6, emissive: 0xffd9a0, emissiveIntensity: 0.9 }), 1.0);
  const glassDark = nightGlow(std(0x2a3640, 'bwwGlassDark', { rough: 0.07, metal: 0.6, envMapIntensity: 1.6, emissive: 0xffd9a0, emissiveIntensity: 0.7 }), 1.0);
  const glassSky = nightGlow(std(0x5c6e82, 'bwwGlassSky', { rough: 0.05, metal: 0.55, envMapIntensity: 1.8, emissive: 0xffd9a0, emissiveIntensity: 0.8 }), 1.0);
  const screen = std(0x6a645c, 'bwwScreen', { rough: 0.55, metal: 0.5 });
  const panel = M.concrete.clone(); panel.color.set(0xcfd2d2); panel.name = 'bwwPanel';
  const band = std(0xaeb4b8, 'bwwBand', { rough: 0.5, metal: 0.3 });
  const fin = std(0xd9d2c2, 'bwwFin', { rough: 0.45, metal: 0.25 });
  const frame = std(0xd5d8d7, 'bwwFrame', { rough: 0.5, metal: 0.2 });
  const dark = std(0x2b2f33, 'bwwMullion', { rough: 0.4, metal: 0.6 });
  const base = M.concrete.clone(); base.color.set(0x6a6e74); base.name = 'bwwBase';
  const silver = std(0xa8adb1, 'bwwSilver', { rough: 0.4, metal: 0.6 }); const spand = std(0x4a5560, 'bwwSpandrel', { rough: 0.4, metal: 0.4 });
  const colliders = [];
  const gMin = (poly) => Math.min(...poly.map(([u, v]) => K.g(u, v)));

  // ---------- volumes (building frame) ----------
  const SOUTH = [[-37.4, -13.5], [-12, -13.5], [-12, 2.0], [31.0, 2.0], [30.8, 31.6], [30.7, 33.5], [-19.0, 32.8], [-19.0, 31.5], [-24.3, 31.4], [-24.3, 33.7], [-38.0, 33.5]];
  const NORTH = [[-35.2, -32.3], [33.0, -32.3], [33.0, 2.0], [-12, 2.0], [-12, -13.5], [-35.3, -13.5]];
  const EAST = [[33.0, -31.6], [39.6, -31.6], [39.0, 14.8], [31.0, 14.7], [31.0, 2.0], [33.0, 2.0]];
  const yS = 35.3, yN = 23.0, yE = 19.8;
  const floorsS = [5.6, 9.8, 14.0, 18.2, 22.4, 26.6, 30.8];
  const floorsN = [7.4, 11.3, 15.2, 19.1];

  function volume(poly, yTop, floors, kind) {
    const g0 = gMin(poly) - 1.0;
    K.prism(M.concreteDark, inset(poly, 1.4), g0, yTop - 0.3);
    const a2 = (R, k) => (k ? R.b : R.a);
    for (let { R, a, b } of polyRuns(K, poly)) {
      if (R.L < 1.0) continue;
      const gA = Math.max(K.g(...R.at(0.5, 1)), K.g(...R.at(R.L - 0.5, 1)));
      const isWest = Math.abs(R.n[0] + 1) < 0.2; // outward normal pointing -u
      const baseTop = Math.max(floors[0] - 0.4, gA + (kind === 'south' ? 5.4 : 4.2));
      if (kind === 'south' && !isWest) {
        // tall recessed glass base (lobby / storefront) behind slim columns
        curtain(K, R, 0, R.L, g0, baseTop, [], { glass: glassDark, mull: 1.5, mullMat: dark, band: 0, recess: 1.2, mullD: 0.1 });
        const nc = Math.max(1, Math.round(R.L / 9)); for (let i = 1; i < nc; i++) { const c = R.L * i / nc; K.rbox(R, frame, c - 0.25, g0, -0.75, c + 0.25, baseTop, -0.25); }
        K.rbox(R, frame, -0.02, baseTop - 0.05, -1.25, R.L + 0.02, baseTop + 0.45, 0.05);
      } else {
        const RB = K.run(a2(R, 0), a2(R, 1), -0.8); const R0 = R; R = RB;
        const ops = []; const nb = Math.max(1, Math.round(R.L / 2.4));
        for (let i = 0; i < nb; i++) { const c = (i + 0.5) * R.L / nb; if (kind !== 'east' && i % 4 === 1) ops.push({ s0: c - 0.95, s1: c + 0.95, y0: gA + 0.05, y1: baseTop - 0.6, sill: false }); else if (i % 2 === 0) ops.push({ s0: c - 0.6, s1: c + 0.6, y0: gA + 0.3, y1: Math.min(baseTop - 0.4, gA + 3.8), louvre: true }); }
        K.wall(R, base, 0, R.L, g0, baseTop, ops, 0.3);
        for (const o of ops) { K.fill(R, o, { mull: o.s1 - o.s0 > 1.5 ? 1 : 0, rev: 0.22, frame: dark, glass: glassBlue }); if (o.louvre) for (let y = o.y1 - 0.8; y < o.y1 - 0.05; y += 0.12) K.rbox(R, silver, o.s0, y, -0.2, o.s1, y + 0.05, -0.12, { detail: true }); }
        for (let y = gA + 1.2; y < baseTop; y += 1.2) K.rbox(R, M.concreteDark, 0, y - 0.012, 0, R.L, y + 0.012, 0.006, { detail: true });
        R = R0; K.rbox(R, dark, -0.05, baseTop - 0.05, -0.9, R.L + 0.05, baseTop + 0.45, 0.05);
      }
      const yU = baseTop + 0.45;
      if (kind === 'south' && isWest) {
        // opaque light-grey panelled end wall with narrow slot windows
        punched(K, R, 0, R.L, [{ y0: yU, y1: yTop + 0.9 }], { mat: panel, nb: Math.max(2, Math.round(R.L / 3.0)), ww: 0.6, sill: 1.2, wh: yTop - yU - 2.5, depth: 0.3, mullN: 0, frame: dark, glass: glassDark });
        for (let y = yU + 1.5; y < yTop; y += 1.5) K.rbox(R, M.concreteDark, 0, y - 0.015, 0, R.L, y + 0.015, 0.01, { detail: true });
      } else if (kind === 'south') {
        curtain(K, R, 0, R.L, yU, yTop - 0.2, floors.slice(1), { glass: glassBlue, mull: 0, band: 0.32, bandMat: band, bandD: 0.12, recess: 0.06,
          fins: { pitch: 0.75, depth: 0.3, w: 0.05, mat: fin, skipBands: true, detail: R.L > 40 } });
      } else {
        curtain(K, R, 0, R.L, yU, yTop - 0.2, floors, { glass: glassSky, mull: 1.5, mullMat: silver, band: 0.15, bandMat: spand, bandD: 0.03, recess: 0.06, mullD: 0.07 });
        // level 2: black spandrel band, and dark fins on the west half
        K.rbox(R, dark, 0, yU, -0.06, R.L, yU + 0.8, 0.0);
        if (kind === 'north' && Math.abs(R.n[1] + 1) < 0.2) for (let sx = R.L * 0.45; sx < R.L - 0.3; sx += 0.5) K.rbox(R, dark, sx - 0.03, yU + 0.8, -0.06, sx + 0.03, floors[1] - 0.1, 0.25, { detail: true });
        // irregular bronze-grey fin screen on the upper level
        const yS0 = floors[floors.length - 1] + 0.4, yS1 = yTop - 0.3; let sx = 0.4, k = 0;
        while (sx < R.L - 0.3) { K.rbox(R, screen, sx - 0.04, yS0, 0.05, sx + 0.04, yS1, 0.35 + 0.1 * ((k * 7) % 3), { detail: true }); sx += 0.6 + 0.6 * (((k * 37) % 11) / 10); k++; }
      }
      // slim perimeter frame (corners + thin projecting roof cap)
      K.rbox(R, frame, -0.08, yU, -0.05, 0.22, yTop + 0.9, 0.3);
      K.rbox(R, frame, -0.12, yTop + 0.35, -0.05, R.L + 0.12, yTop + 0.9, 0.3);
    }
    flatRoof(K, poly, yTop, { mat: M.concreteDark, parapet: 0.0 });
    colliders.push({ type: 'poly', pts: K.polyXZ(poly), y0: g0, y1: yTop + 1 });
  }
  volume(SOUTH, yS, floorsS, 'south');
  volume(NORTH, yN, floorsN, 'north');
  volume(EAST, yE, floorsN.slice(0, 3), 'east');

  // white-framed vertical slot (stair) in the north façade, ~57% along from the west end: a closed deep frame
  { const R = K.run([6.7, -32.3], [0.7, -32.3]); const gA = K.g(3.7, -33); const ySill = gA + 4.6, yHead = yN - 0.4;
    K.rbox(R, frame, -1.0, ySill, -1.2, 0, yHead + 1.2, 0.5); K.rbox(R, frame, R.L, ySill, -1.2, R.L + 1.0, yHead + 1.2, 0.5);
    K.rbox(R, frame, -1.0, yHead, -1.2, R.L + 1.0, yHead + 1.2, 0.5); K.rbox(R, frame, -1.0, ySill - 0.35, -1.2, R.L + 1.0, ySill, 0.5);
    K.rbox(R, glassSky, 0, ySill, -1.25, R.L, yHead, -1.2);
    for (let i = 1; i < 4; i++) K.rbox(R, silver, R.L * i / 4 - 0.04, ySill, -1.25, R.L * i / 4 + 0.04, yHead, -1.1);
    for (const f of floorsN) K.rbox(R, silver, 0, f - 0.06, -1.25, R.L, f + 0.06, -1.1); }
  // mechanical penthouses on the tall roof
  const ph = M.concrete.clone(); ph.color.set(0x9a9fa3); ph.name = 'bwwPenthouse';
  for (const P of [[[-24.5, 4.5], [-1.5, 4.5], [-1.5, 24.5], [-24.5, 24.5]], [[5.5, 4.5], [21.5, 4.5], [21.5, 27.5], [5.5, 27.5]]]) {
    K.prism(ph, P, yS, yS + 5.9); K.prism(frame, inset(P, -0.15), yS + 5.9, yS + 6.15);
  }
  // rooftop: pavers + photovoltaic arrays on the north wing
  { const pv = std(0x1f2a3a, 'bwwPV', { rough: 0.3, metal: 0.4 }); for (let u = -30; u < 26; u += 4.2) K.obox(pv, u + 1.8, yN + 0.55, -18, 3.6, 0.08, 20, 0, { detail: true }); }
  // entry canopy + steps in the notch on Berkeley Way (u -24.3..-19, v 31.4..33.7)
  { const g = K.g(-21.6, 35.5); K.box(dark, -25.5, g + 3.6, 30.5, -17.8, g + 3.9, 36.0); for (const u of [-25.2, -18.1]) K.box(dark, u - 0.08, g, 35.7, u + 0.08, g + 3.6, 35.9); }

  const object3d = K.finish(); object3d.name = 'berkeley-way-west';
  return { object3d, colliders };
}
