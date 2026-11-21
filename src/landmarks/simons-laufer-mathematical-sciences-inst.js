// Simons Laufer Mathematical Sciences Institute (SLMath, formerly MSRI), high in the Berkeley hills above campus on Gauss Way.
// Flat-roofed volumes in flat, uniform warm orange-brown brick with a regular grid of small punched, near-square four-pane
// windows in dark bronze frames, thin metal copings, a set-back glazed top storey on the main block, and a glazed entrance
// wing above the drop-off court. Massing from the 2021 LiDAR: main block parapet ~16 m with the raised top storey to ~18.7 m,
// central block ~13.4 m, entrance wing ~13 m above the low corner.
import * as THREE from 'three';
import { Kit, curtain, runsOf, flatRoof, entrance, colFromXZ } from './lib/b04-kit.js';
import { rmats } from './lib/reastb-kit.js';

export const info = {
  id: 'simons-laufer-mathematical-sciences-inst',
  name: 'Simons Laufer Mathematical Sciences Institute',
  subtitle: 'SLMath (formerly MSRI) · 1985',
  blurb: 'Founded in 1982 as the Mathematical Sciences Research Institute, this independent institute hosts mathematicians from around the world for semester-long research programs, in a hillside building above the campus.',
  replaces: ['w/70661576'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-20)); const M = ctx.M; const RM = rmats(M);
  const BR = RM.slBrick, FR = RM.bronze, GL = M.windowNight, CP = RM.coping;
  const colliders = [], walkables = [];
  // brick volume: punched four-pane windows on a regular grid (skipped where the hillside buries them), metal coping
  const brickBlock = (poly, top, sills, { bay = 4.0, par = 0.5, skipRun = () => false } = {}) => {
    for (const { R, i } of runsOf(K, poly)) {
      if (R.L < 1.2) continue;
      const ops = [];
      if (R.L > 2.6 && !skipRun(i, R)) {
        const nb = Math.max(1, Math.round((R.L - 1.2) / bay));
        for (const y of sills) for (let k = 0; k < nb; k++) {
          const c = 0.6 + (R.L - 1.2) * (k + 0.5) / nb; const p = R.at(c, 0.6);
          if (y < ctx.groundAt(...K.xz(p[0], p[1])) + 0.45) continue;
          ops.push({ s0: c - 0.72, s1: c + 0.72, y0: y, y1: y + 1.45, sill: false });
        }
      }
      K.wall(R, BR, 0, R.L, -2.5, top + par, ops, 0.32);
      for (const o of ops) { K.fill(R, o, { rev: 0.17, mull: 1, muntins: 1, frame: FR, glass: GL }); K.rbox(R, CP, o.s0 - 0.04, o.y0 - 0.08, -0.17, o.s1 + 0.04, o.y0, 0.04, { detail: true }); }
      K.rbox(R, CP, -0.04, top + par, -0.36, R.L + 0.04, top + par + 0.09, 0.05);
    }
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    K.box(M.concreteDark, Math.min(...xs) + 0.6, -2.5, Math.min(...ys) + 0.6, Math.max(...xs) - 0.6, top - 0.3, Math.max(...ys) - 0.6);
    flatRoof(K, poly, top, { parapet: 0, deckMat: M.concreteDark });
  };
  // main (west) block + its set-back top storey with a continuous ribbon of square windows
  const WP = [[-5.7, -27.1], [-5.7, 22.2], [-18.5, 21.8], [-18.8, 6.2], [-21.8, 5.9], [-21.8, -15.9], [-19.4, -17.0], [-19.1, -27.4]];
  brickBlock(WP, 15.7, [1.1, 4.5, 7.9, 11.3]);
  {
    const u0 = -17.4, u1 = -11.6, v0 = -24.5, v1 = 19.5, y0 = 16.0, y1 = 18.7;
    for (const [a, b] of [[[u0, v1], [u1, v1]], [[u1, v1], [u1, v0]], [[u1, v0], [u0, v0]], [[u0, v0], [u0, v1]]]) {
      const R = K.run(a, b); const n = Math.max(1, Math.floor((R.L - 0.6) / 1.75)); const ops = [];
      for (let k = 0; k < n; k++) { const c = 0.3 + (R.L - 0.6) * (k + 0.5) / n; ops.push({ s0: c - 0.72, s1: c + 0.72, y0: y0 + 0.55, y1: y0 + 1.95, sill: false }); }
      K.wall(R, BR, 0, R.L, 15.0, y1 + 0.3, ops, 0.3);
      for (const o of ops) K.fill(R, o, { rev: 0.15, mull: 1, muntins: 1, frame: FR, glass: GL });
      K.rbox(R, CP, -0.04, y1 + 0.3, -0.34, R.L + 0.04, y1 + 0.39, 0.05);
    }
    K.box(M.concreteDark, u0 + 0.4, y1 - 0.1, v0 + 0.4, u1 - 0.4, y1 + 0.05, v1 - 0.4);
    K.cyl(M.whitePaint, u1 - 1.0, y1 + 0.3, v0 + 1.5, 0.05, 0.035, 6.0, 6, { detail: true });
  }
  // central block
  brickBlock([[-5.7, -10.5], [9.8, -8.9], [19.4, -8.9], [19.4, 16.5], [0.4, 17.4], [0.2, 21.6], [-5.7, 22.2]], 13.0, [1.1, 4.5, 7.9], { bay: 4.2 });
  // entrance wing: glazed storefront under the brick upper floor (square windows), corner glass panels
  const E = [[14.3, -11.8], [28.0, -14.8], [28.7, 2.5], [22.6, 7.5], [19.7, 10.7], [19.4, -8.9]];
  for (const { R } of runsOf(K, E)) {
    if (R.L < 1.5) continue;
    curtain(K, R, 0, R.L, -2.5, 5.0, { glass: GL, frame: FR, mw: 1.6, levels: [-2.5, 2.6, 5.0], rec: 0.6 });
    K.rbox(R, CP, 0, 4.9, -0.6, R.L, 5.15, 0.05); // soffit/band where the brick floor oversails the storefront
    const nb = Math.max(1, Math.round((R.L - 1.0) / 2.6)); const ops = [];
    for (let k = 0; k < nb; k++) { const c = 0.5 + (R.L - 1.0) * (k + 0.5) / nb; ops.push({ s0: c - 0.75, s1: c + 0.75, y0: 6.6, y1: 8.1, sill: false }, { s0: c - 0.75, s1: c + 0.75, y0: 9.7, y1: 11.2, sill: false }); }
    K.wall(R, BR, 0, R.L, 5.15, 13.4, ops, 0.32);
    for (const o of ops) K.fill(R, o, { rev: 0.17, mull: 1, muntins: 1, frame: FR, glass: GL });
    K.rbox(R, CP, -0.04, 13.4, -0.36, R.L + 0.04, 13.49, 0.05);
  }
  K.prism(M.concreteDark, E.slice().reverse(), -2.5, 12.8);
  flatRoof(K, E, 12.9, { parapet: 0, deckMat: M.concreteDark });
  // slim round columns under the entrance oversail
  { const R = K.run([22.6, 7.5], [28.7, 2.5]); for (const s of [1.0, R.L / 2, R.L - 1.0]) { const p = R.at(s, 0.2); K.cyl(M.whitePaint, p[0], Math.max(0, K.g(p[0], p[1])) - 0.5, p[1], 0.16, 0.16, 5.5, 10, { detail: true }); } }
  entrance(K, K.run([22.6, 7.5], [28.7, 2.5]), 3.5, Math.max(0, K.g(25, 6)), { w: 3.2, h: 2.6, rec: 0.6, glass: GL, frame: FR, canopy: 0.0, surround: false });
  // curved board-formed concrete sign wall along the drive below the entrance court
  {
    const c = [36.0, 22.0], r = 15.0, a0 = 2.2, a1 = 3.3; const n = 10;
    for (let k = 0; k < n; k++) {
      const t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n;
      const p0 = [c[0] + Math.cos(t0) * r, c[1] + Math.sin(t0) * r], p1 = [c[0] + Math.cos(t1) * r, c[1] + Math.sin(t1) * r];
      const R = K.run(p0, p1); const g = Math.min(K.g(...p0), K.g(...p1));
      K.rbox(R, RM.concreteLight, 0, g - 0.8, -0.35, R.L + 0.02, g + 1.8, 0);
    }
  }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 19));
  const object3d = K.finish(); object3d.name = 'simons-laufer-mathematical-sciences-inst';
  return { object3d, colliders, walkables };
}
