// North Gate Hall (1906; John Galen Howard): built as the architecture school's wooden "Ark", now the Graduate School of
// Journalism, at Hearst and Euclid. Arts & Crafts brown shingle: dark-stained redwood shingle walls, low hipped roofs with very
// deep eaves and exposed rafter tails, banks of small-paned wood windows with oxblood trim, brick chimneys with flat caps, and
// wings wrapped around a planted courtyard that opens to campus. Massing follows the 2021 LiDAR (eaves ~7-9 m, ridges ~9.5-12 m,
// the taller east block ~14.5 m above the low west grade).
import * as THREE from 'three';
import { Kit, mats, punched, rect, rectRuns, bays, gAt, gMinRun, signText } from './lib/b03-kit.js';
import { pathEntrances, entry, planting, bikes } from './lib/rn-kit.js';

export const info = {
  id: 'north-gate-hall',
  name: 'North Gate Hall',
  subtitle: 'John Galen Howard · 1906',
  blurb: 'Built in 1906 as the temporary home of the architecture department, which affectionately called it "the Ark", this brown-shingle Arts & Crafts building now houses the Graduate School of Journalism.',
  replaces: ['w/24025048'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.1);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const SH = B.shingle.clone(); SH.color.setRGB(1.62, 1.6, 1.58); // weathered redwood shingle (the base texture reads almost black)
  const TRIM = new THREE.MeshStandardMaterial({ color: 0x2f3a2a, roughness: 0.75 }); // dark bottle-green trim
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x80705f, roughness: 0.95, map: M.shingle.map, normalMap: M.shingle.normalMap, roughnessMap: M.shingle.roughnessMap });
  const BRICK = M.brick;
  const GL = M.windowNight.clone(); GL.color.set(0x4a4a40); GL.onBeforeCompile = M.windowNight.onBeforeCompile; GL.customProgramCacheKey = M.windowNight.customProgramCacheKey;
  const CRF = new THREE.MeshStandardMaterial({ color: 0xc8b88a, roughness: 0.7 }); // cream window frames
  const colliders = [], walkables = [];
  // wings: [u0, v0, u1, v1, eave, roof pitch (rise/run), ridge axis]
  const wings = [
    [-26.8, -16.3, -6.0, -5.8, 8.5, 0.62, 'u'],   // main range on Hearst, broken into three volumes
    [-6.0, -16.8, 10.0, -5.8, 9.1, 0.6, 'u'],
    [10.0, -16.3, 21.1, -5.8, 8.7, 0.62, 'u'],
    [21.1, -16.3, 31.0, 6.1, 11.6, 0.62, 'v'],    // taller east block (higher grade)
    [7.8, -5.8, 21.1, 11.5, 7.8, 0.55, 'v'],      // east courtyard wing
    [-26.8, -5.8, -13.7, 14.7, 6.3, 0.45, 'v'],   // west wing (steps down)
    [-26.1, 14.6, 3.3, 23.7, 7.0, 0.62, 'u'],     // south-west wing
  ];
  const winOpts = { glass: GL, frame: CRF, depth: 0.22, rev: 0.12, sill: TRIM };
  for (const [u0, v0, u1, v1, eave, slope, axis] of wings) {
    const runs = rectRuns(K, u0, v0, u1, v1);
    for (const R of Object.values(runs)) {
      const gLo = gMinRun(K, R, 0, R.L, 0.6) - 1.2;
      const nb = Math.max(1, Math.round(R.L / 5.2)); const cs = bays(0, R.L, nb);
      // storeys: lower (studio) floor and upper floor; groups of small-paned windows
      const fl1 = Math.max(0.3, gMinRun(K, R, 0, R.L, 0.6) + 0.6), fl2 = fl1 + 3.9;
      const ops1 = cs.map((c) => ({ s0: c - 2.1, s1: c + 2.1, y0: fl1 + 0.9, y1: fl1 + 3.0, mull: 5, muntins: 3 }));
      const ops2 = cs.map((c, i) => ({ s0: c - 2.1, s1: c + 2.1, y0: fl2 + 0.6, y1: Math.min(eave - 0.35, fl2 + 2.2), mull: 5, muntins: 2 }));
      if (fl2 + 1.5 < eave) {
        punched(K, R, SH, 0, R.L, gLo, fl2, ops1, winOpts);
        punched(K, R, SH, 0, R.L, fl2, eave, ops2.filter((o) => o.y1 - o.y0 > 0.8), winOpts);
        K.rbox(R, TRIM, -0.05, fl2 - 0.12, -0.05, R.L + 0.05, fl2 + 0.08, 0.1); // water-table / band board
      } else punched(K, R, SH, 0, R.L, gLo, eave, ops1, winOpts);
      // corner boards
      K.rbox(R, TRIM, -0.02, gLo + 0.5, -0.02, 0.18, eave, 0.06); K.rbox(R, TRIM, R.L - 0.18, gLo + 0.5, -0.02, R.L + 0.02, eave, 0.06);
      // exposed rafter tails under the deep eave
      for (let s = 0.3; s < R.L; s += 0.9) K.rbox(R, M.woodDark, s - 0.05, eave - 0.18, 0, s + 0.05, eave, 1.15, { detail: true });
    }
    K.box(M.concreteDark, u0 + 0.5, -2, v0 + 0.5, u1 - 0.5, eave - 0.1, v1 - 0.5); // core
    const half = axis === 'u' ? (v1 - v0) / 2 : (u1 - u0) / 2;
    K.gable(ROOF, u0, v0, u1, v1, eave, half * slope, axis, { overhang: 1.1, wallMat: SH, thick: 0.15 });
    // knee braces under the eaves of the long sides
    const RR = axis === 'u' ? [K.run([u0, v1], [u1, v1]), K.run([u1, v0], [u0, v0])] : [K.run([u1, v1], [u1, v0]), K.run([u0, v0], [u0, v1])];
    for (const R of RR) for (let s2 = 1.0; s2 < R.L - 0.5; s2 += 2.6) K.obox(M.woodDark, ...((p) => [p[0], eave - 0.55, p[1]])(R.at(s2, 0.45)), 0.1, 1.1, 0.1, 0, { detail: true });
    colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, eave + 2));
  }
  // brick chimneys with flat overhanging caps along the main ridge
  for (const u of [-17, 1, 15]) {
    const y0 = 9.0 + 5.25 * 0.6 - 1.4, v = -11.0;
    K.box(BRICK, u - 0.5, y0, v - 0.5, u + 0.5, y0 + 2.6, v + 0.5);
    K.box(BRICK, u - 0.62, y0 + 2.3, v - 0.62, u + 0.62, y0 + 2.45, v + 0.62);
    K.box(M.concrete, u - 0.8, y0 + 2.6, v - 0.8, u + 0.8, y0 + 2.75, v + 0.8);
  }
  // cantilevered upper storey band on Hearst: bracketed overhang of the upper floor at the centre-west
  {
    const R = K.run([4, -16.3], [-20, -16.3]);
    const fl2 = Math.max(0.3, gMinRun(K, R, 0, R.L, 0.6) + 0.6) + 3.9;
    K.rbox(R, SH, 0, fl2, 0, R.L, 8.7, 0.6);
    for (let s = 1; s < R.L; s += 2.4) K.rbox(R, M.woodDark, s - 0.1, fl2 - 0.7, 0, s + 0.1, fl2, 0.6);
    const ops = bays(0, R.L, 6).map((c) => ({ s0: c - 1.6, s1: c + 1.6, y0: fl2 + 0.8, y1: fl2 + 2.5 }));
    for (const o of ops) { K.rbox(R, GL, o.s0, o.y0, 0.6, o.s1, o.y1, 0.62); K.rbox(R, TRIM, o.s0 - 0.1, o.y0 - 0.12, 0.6, o.s1 + 0.1, o.y0, 0.7); for (let k = 1; k < 4; k++) K.rbox(R, TRIM, o.s0 + (o.s1 - o.s0) * k / 4 - 0.04, o.y0, 0.62, o.s0 + (o.s1 - o.s0) * k / 4 + 0.04, o.y1, 0.66, { detail: true }); }
  }
  // entrances where the packet's paths arrive (recessed porches with paired glazed wood doors and steps), street-front planting, bikes
  { const per = [K.run([-26.8, -16.3], [-26.8, 23.7]), K.run([-26.1, 23.7], [3.3, 23.7]), K.run([31.0, 6.1], [31.0, -16.3]), K.run([31.0, -16.3], [-26.8, -16.3])];
    const ents = pathEntrances(K, ctx, per, { maxDist: 4.5 }).slice(0, 3); const skip = new Map();
    for (const e of ents) { const r = entry(K, e.R, e.s, { w: 2.0, h: 2.7, surround: TRIM, sw: 0.25, sp: 0.3, frame: TRIM, door: 'wood', doorMat: M.woodDark, landing: 1.3, canopy: { d: 1.6, mat: ROOF, t: 0.18, w: 3.6 } });
      walkables.push(...r.walkables); colliders.push(...r.colliders); skip.set(e.R, [...(skip.get(e.R) || []), [e.s - 2.8, e.s + 2.8]]); }
    for (const R of per) planting(K, R, 1.0, R.L - 1.0, { d0: 0.15, depth: 1.2, h: 0.9, skip: skip.get(R) || [], seed: 141 });
    colliders.push(...bikes(K, per[0], per[0].L * 0.35, 2.4, 4, 2)); }
  const object3d = K.finish(); object3d.name = 'north-gate-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
