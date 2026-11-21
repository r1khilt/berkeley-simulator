// Social Sciences Building (Barrows Hall until its 2020 renaming), 1964. An eight-storey modernist slab, ~90 × 25 m,
// aligned with the campus grid (rotated ~9°), its long façades wrapped in a deep light-concrete sunshade "egg-crate"
// (vertical fins every bay, a shelf at every floor) over recessed dark glazing; solid end walls, a glazed recessed ground
// floor behind pilotis, and a set-back rooftop penthouse. Two low one-storey wings reach north toward Dwinelle.
// Massing from the 2021 LiDAR (slab roof ~33 m above grade, penthouse ~36 m).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { concreteMat, glazing, block } from './lib/b06c-kit.js';

export const info = {
  id: 'social-sciences-building',
  name: 'Social Sciences Building',
  subtitle: 'Formerly Barrows Hall · 1964',
  blurb: 'Home to economics, political science, sociology and other social science departments, this eight-storey slab with its deep concrete sunshade grid was known as Barrows Hall until 2020, when the university removed the name of David Prescott Barrows.',
  replaces: ['r/11307389'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-8.9);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const C = concreteMat(0xf0ebdd, 'smooth', { rough: 0.9 });      // light warm-grey precast concrete
  const Ce = concreteMat(0x5d6168, 'precast', { rough: 0.85 });   // charcoal solid end bays / end walls
  const Cd = M.concreteDark, GL = M.windowNight, FR = M.darkBronze;
  const colliders = [], walkables = [], interactions = [];
  const u0 = -44.0, u1 = 46.5, v0 = -8.0, v1 = 17.0;
  const g0 = K.gMin(u0, v0, u1, v1, 8);
  const gRef = K.g((u0 + u1) / 2, (v0 + v1) / 2); const GF = gRef + 4.2, FH = 3.7, NF = 7, yTop = GF + NF * FH, yPar = yTop + 0.9; // roof ~33 m above grade
  const nb = 23, bw = (u1 - u0) / nb;
  // ---------- core + ground floor: recessed glazing behind pilotis ----------
  const inset = 1.2;
  K.box(Cd, u0 + inset + 0.3, g0 - 1.5, v0 + inset + 0.3, u1 - inset - 0.3, GF, v1 - inset - 0.3);
  for (const [a, b] of [[[u1 - inset, v0 + inset], [u0 + inset, v0 + inset]], [[u0 + inset, v1 - inset], [u1 - inset, v1 - inset]]]) {
    const R = K.run(a, b);
    const gl = K.g(...R.at(R.L / 2, 1)) ;
    glazing(K, R, 0, R.L, Math.max(g0, gl - 0.2), GF - 0.3, { pitch: 1.6, transoms: [GF - 1.4], frame: FR, glass: GL });
  }
  for (let i = 0; i <= nb; i++) for (const v of [v0 + 0.5, v1 - 0.5]) { const u = u0 + i * bw; K.box(C, u - 0.35, g0 - 1.5, v - 0.35, u + 0.35, GF, v + 0.35); colliders.push(K.colCyl(u, v, 0.45, g0 - 2, GF)); }
  K.box(C, u0, GF - 0.6, v0, u1, GF, v1); // first-floor slab edge over the arcade
  // ---------- upper floors: light egg-crate sunshade over recessed glazing in the centre, solid charcoal end bays ----------
  const D = 1.0; // sunshade depth in front of the glass line
  const NE = 4, sE = NE * bw; // end bays per side
  const yA = yTop + 3.2;     // attic (red band) top
  K.box(Cd, u0 + D + 0.4, GF, v0 + D + 0.4, u1 - D - 0.4, yA - 0.2, v1 - D - 0.4);
  const RED = concreteMat(0xb0503e, 'smooth', { rough: 0.8 });
  for (const [a, b] of [[[u1, v0 + D], [u0, v0 + D]], [[u0, v1 - D], [u1, v1 - D]]]) {
    const R = K.run(a, b); const c0 = sE, c1 = R.L - sE;
    for (let f = 0; f < NF; f++) {
      const y0 = GF + f * FH;
      K.rbox(R, C, c0, y0, -0.3, c1, y0 + 0.9, 0.0);                           // spandrel
      glazing(K, R, c0, c1, y0 + 0.9, y0 + FH, { d: -0.05, pitch: bw / 2, frame: FR, glass: GL, sill: false });
    }
    // continuous terracotta-red attic band, recessed behind the fin line
    K.rbox(R, RED, c0, yTop, -0.3, c1, yA, 0.0);
    // egg-crate: fins every bay (running up through the attic) + a shelf at every floor
    for (let i = NE; i <= nb - NE; i++) { const s = i * bw; K.rbox(R, C, s - 0.16, GF, 0, s + 0.16, yA, D); }
    for (let f = 0; f <= NF; f++) { const y = GF + f * FH; K.rbox(R, C, c0 - 0.16, y - 0.14, 0, c1 + 0.16, y + 0.14, D); }
    // solid charcoal end bays (flush with the fin line), small punched windows
    for (const [e0, e1] of [[-D, c0], [c1, R.L + D]]) {
      const ops = []; for (let f = 0; f < NF; f++) for (let k = 0; k < 2; k++) { const s = e0 + (e1 - e0) * (k + 0.5) / 2; const y0 = GF + f * FH + 1.0; ops.push({ s0: s - 0.6, s1: s + 0.6, y0, y1: y0 + 1.4 }); }
      const RR = K.run(R.at(e0, D), R.at(e1, D));
      K.wall(RR, Ce, 0, RR.L, GF - 0.6, yA, ops.map((o) => ({ ...o, s0: o.s0 - e0, s1: o.s1 - e0 })), D + 0.3);
      for (const o of ops) K.rbox(RR, GL, o.s0 - e0, o.y0, -0.5, o.s1 - e0, o.y1, -0.45);
    }
  }
  // white roof fascia over the whole slab
  K.box(M.stuccoWhite, u0 - 0.05, yA, v0 - 0.05, u1 + 0.05, yA + 0.6, v1 + 0.05);
  // solid end walls (stair/service cores), slightly darker panels with a vertical slot of small windows
  for (const [a, b] of [[[u0, v0], [u0, v1]], [[u1, v1], [u1, v0]]]) {
    const R = K.run(a, b);
    const ops = []; for (let f = 0; f < NF; f++) { const y0 = GF + f * FH + 1.1; ops.push({ s0: R.L / 2 - 0.6, s1: R.L / 2 + 0.6, y0, y1: y0 + 1.6 }); }
    K.wall(R, Ce, 0, R.L, GF - 0.6, yA, ops, 0.6);
    for (const o of ops) glazing(K, R, o.s0, o.s1, o.y0, o.y1, { d: -0.35, pitch: 1.2, frame: FR, glass: GL });
  }
  // flat roof with a few mechanical units and a stair/elevator box toward the west
  K.box(Cd, u0 + 0.3, yA + 0.2, v0 + 0.3, u1 - 0.3, yA + 0.45, v1 - 0.3);
  for (const [a, b, w, d, h] of [[-26, 4, 6, 4, 3.0], [-4, 2, 3, 3, 2.0], [8, 9, 3, 3, 2.0], [22, 3, 3, 3, 2.0], [34, 8, 3, 3, 2.0]]) K.box(Ce, a - w / 2, yA + 0.45, b - d / 2, a + w / 2, yA + 0.45 + h, b + d / 2);
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], GF - 0.5, yA + 0.6));
  colliders.push(K.colPoly([[u0 + inset, v0 + inset], [u1 - inset, v0 + inset], [u1 - inset, v1 - inset], [u0 + inset, v1 - inset]], g0 - 2, GF));
  // ---------- the two one-storey wings to the north ----------
  for (const [a0, b0, a1, b1] of [[-29.4, -26.3, -10.3, -8.0], [4.2, -26.4, 18.1, -8.0], [-1.8, -26.4, 4.2, -19.5]]) {
    const gm = K.gMin(a0, b0, a1, b1, 4);
    block(K, C, a0, b0, a1, b1, gm - 1.5, gm + 5.4, { ops: (f, R) => (R.L > 5 && f !== 'S' ? [{ s0: 0.8, s1: R.L - 0.8, y0: gm + 0.9, y1: gm + 3.9, pitch: 1.8, tr: [gm + 3.0] }] : []), roofMat: Cd, copingMat: C, depth: 0.45, skip: ['S'] });
    colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], gm - 2, gm + 5.5));
  }
  // entrance canopy on the south side (toward the Campanile walk)
  { const gm = K.g(0, v1 + 2); K.box(C, -6, gm + 3.2, v1 - 0.5, 6, gm + 3.6, v1 + 4.0); for (const u of [-5.6, 5.6]) K.box(C, u - 0.15, gm - 0.5, v1 + 3.5, u + 0.15, gm + 3.2, v1 + 3.8);
    const [ex, ez] = K.xz(0, v1 + 2.5); interactions.push({ id: 'ssb-entrance', pos: [ex, gm + 1, ez], radius: 3, label: 'Social Sciences Building (Barrows Hall)' }); }

  const object3d = K.finish();
  object3d.name = 'social-sciences-building';
  return { object3d, colliders, walkables, interactions };
}
