// David Blackwell Hall (2018), student housing at Durant Ave and Dana St. Massing from the 2021 LiDAR: an eight-storey
// block (~23 m) wrapped around a courtyard that opens to the east, with a podium terrace inside the north bar and rooftop
// stair/mechanical bulkheads. Façades from photos: white fibre-cement panels with a scattered pattern of window +
// mustard-yellow panel pairs in shallow dark grey box frames, a dark glazed corner bay of stacked projecting frames,
// a glazed ground floor with warm wood-tone piers, and the corner entrance canopy carrying "DAVID BLACKWELL HALL".
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, inset, std } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'david-blackwell-hall',
  name: 'David Blackwell Hall',
  subtitle: 'Residence hall · 2018',
  blurb: 'Named for statistician David Blackwell, the first Black tenured professor at UC Berkeley, this eight-storey residence hall opened in 2018.',
  replaces: ['w/482840642'],
};

function letters(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#e9eae7'; g.font = 'bold 64px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export async function build(ctx) {
  const ANG = -0.15; const K = new Kit(ctx, ANG); const M = ctx.M;
  const white = M.stuccoWhite.clone(); white.color.set(0xf4f5f2); white.name = 'dbhWhite';
  const yellow = std(0xd9a632, 'dbhYellow', { rough: 0.55 });
  const frameD = std(0x5c6166, 'dbhFrame', { rough: 0.45, metal: 0.4 });
  const wood = M.wood.clone(); wood.color.set(0xd29a72); wood.name = 'dbhWood';
  const glass = nightGlow(std(0x3b4a55, 'dbhGlass', { rough: 0.08, metal: 0.45, envMapIntensity: 1.4, emissive: 0xffd39a, emissiveIntensity: 1.0 }), 1.0);
  const colliders = [];
  // ring of three bars around an east-facing courtyard (building frame)
  const OUT = [[-18.8, -33.6], [25.9, -33.6], [25.9, -18.5], [23.9, -18.5], [23.9, 5.4], [11.2, 5.4], [11.2, 9.1], [9.3, 9.1], [9.3, 13.3], [-3.7, 13.3], [-3.7, 32.0], [11.6, 32.0], [11.6, 46.0], [-18.3, 46.0], [-17.3, 10.6], [-18.7, 10.7]];
  const yTop = 25.2, gf = 4.6, ff = 3.0;
  const g0 = Math.min(...OUT.map(([u, v]) => K.g(u, v))) - 1;
  // podium courtyard light-well cut in the north bar: terrace at ~8 m with inner walls
  const LW = [[-2.0, -17.0], [12.0, -17.0], [12.0, 1.0], [-2.0, 1.0]];
  K.prism(M.concreteDark, inset(OUT, 0.8), g0, 8.1);
  K.prism(M.concreteDark, inset(OUT, 0.8), 8.1, yTop - 0.2, undefined, [inset(LW, -0.8)]);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function facade(R, base = true) {
    const gA = Math.min(K.g(...R.at(0.3, 1.5)), K.g(...R.at(R.L - 0.3, 1.5)));
    const y1 = gA + gf;
    // ground floor: glazing between wood-tone piers
    if (base) {
      const nb = Math.max(1, Math.round(R.L / 4.0));
      for (let i = 0; i < nb; i++) { const a = i * R.L / nb, b = (i + 1) * R.L / nb;
        K.rbox(R, wood, a, g0, -0.25, a + 0.9, y1, 0.1); K.rbox(R, glass, a + 0.9, gA + 0.05, -0.35, b, y1 - 0.4, -0.3);
        K.rbox(R, frameD, a + 0.9, y1 - 0.45, -0.35, b, y1 - 0.35, -0.2); }
      K.rbox(R, white, -0.02, y1 - 0.35, -0.3, R.L + 0.02, y1 + 0.1, 0.05);
    }
    // upper floors: white panel wall with scattered window + yellow panel pairs in dark box frames
    const floors = []; for (let y = y1 + 0.1; y + ff <= yTop + 0.05; y += ff) floors.push(y);
    const bw = 2.9; const nb = Math.max(1, Math.floor(R.L / bw)); const off = (R.L - nb * bw) / 2;
    for (const [fi, y] of floors.entries()) {
      const ops = [], pans = [];
      for (let i = 0; i < nb; i++) {
        const shift = ((i * 3 + fi * 5) % 4 - 1.5) * 0.28; const c = off + (i + 0.5) * bw + shift; const flip = ((i + fi) % 3) === 0;
        const ws0 = flip ? c + 0.05 : c - 1.25, ps0 = flip ? c - 1.25 : c + 0.05;
        ops.push({ s0: ws0, s1: ws0 + 1.2, y0: y + 0.45, y1: y + 2.6 }); pans.push(ps0);
      }
      K.wall(R, white, 0, R.L, y, Math.min(y + ff, yTop), ops, 0.3);
      for (const [k, o] of ops.entries()) {
        K.fill(R, o, { mull: 0, rev: 0.22, frame: frameD, glass });
        const p0 = pans[k]; K.rbox(R, yellow, p0, o.y0, -0.05, p0 + 1.2, o.y1, 0.04);
        const s0 = Math.min(o.s0, p0) - 0.12, s1 = Math.max(o.s1, p0 + 1.2) + 0.12;
        K.rbox(R, frameD, s0, o.y0 - 0.14, 0, s1, o.y0 - 0.02, 0.32); K.rbox(R, frameD, s0, o.y1 + 0.02, 0, s1, o.y1 + 0.14, 0.32);
        K.rbox(R, frameD, s0, o.y0 - 0.14, 0, s0 + 0.12, o.y1 + 0.14, 0.32, { detail: true }); K.rbox(R, frameD, s1 - 0.12, o.y0 - 0.14, 0, s1, o.y1 + 0.14, 0.32, { detail: true });
      }
    }
    K.rbox(R, white, -0.05, yTop - 0.1, -0.3, R.L + 0.05, yTop + 0.9, 0.06);
  }
  for (const { R } of polyRuns(K, OUT)) { if (R.L < 2.5) { K.rbox(R, white, 0, g0, -0.3, R.L, yTop + 0.9, 0.0); continue; } facade(R); }
  // light-well walls above the podium terrace (no base storey)
  { const yP = 8.4; K.prism(M.paving, LW, yP - 0.3, yP);
    for (const { R } of polyRuns(K, LW.slice().reverse())) facade(R, false);
  }
  K.prism(M.concreteDark, inset(OUT, 0.1), yTop - 0.3, yTop + 0.1, undefined, [inset(LW, -0.05)]);
  // dark glazed corner bay at Durant & Dana (north-west corner): stacked projecting frames
  { const cu = -18.8, cv = -33.6; const gA = K.g(cu, cv);
    for (const [a, b] of [[[cu + 7.0, cv], [cu, cv]], [[cu, cv], [cu, cv + 7.0]]]) { const R = K.run(a, b, 0.02);
      K.rbox(R, glass, 0, gA + gf + 0.1, 0.0, R.L, yTop - 0.3, 0.05);
      for (let y = gA + gf + 0.1; y < yTop; y += ff) { K.rbox(R, frameD, -0.1, y - 0.12, 0, R.L + 0.1, y + 0.12, 0.55); K.rbox(R, frameD, R.L - 0.15, y, 0, R.L, y + ff, 0.55, { detail: true }); }
      for (let s = R.L / 4; s < R.L - 0.1; s += R.L / 4) K.rbox(R, frameD, s - 0.04, gA + gf, 0.05, s + 0.04, yTop - 0.3, 0.15, { detail: true }); }
    // entrance canopy with the name lettering on top
    const R = K.run([cu + 9.0, cv], [cu, cv]); const lm = new THREE.MeshStandardMaterial({ map: letters('DAVID BLACKWELL HALL'), transparent: true, roughness: 0.5 }); lm.name = 'dbhLetters';
    K.rbox(R, frameD, 0.5, gA + 3.6, 0, 8.5, gA + 4.0, 2.8); const pg = new THREE.PlaneGeometry(7.6, 0.72); pg.translate(4.5, gA + 4.36, 2.6); K.addRun(R, lm, pg, { uvMode: 'keep' });
    K.rbox(R, M.lampGlow, 0.8, gA + 3.55, 0.3, 8.2, gA + 3.6, 2.5, { detail: true }); }
  // rooftop stair / mechanical bulkheads
  K.box(white, -14.0, yTop, 6.5, -3.0, yTop + 3.3, 13.0); K.box(frameD, -14.2, yTop + 3.3, 6.3, -2.8, yTop + 3.6, 13.2);
  K.box(white, -5.0, yTop, -24.0, 2.0, yTop + 2.6, -19.0);
  colliders.push({ type: 'poly', pts: K.polyXZ(OUT), y0: g0, y1: yTop + 1 });
  const object3d = K.finish(); object3d.name = 'david-blackwell-hall';
  return { object3d, colliders };
}
