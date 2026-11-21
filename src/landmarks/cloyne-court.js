// Cloyne Court (John Galen Howard, 1904): built as the Cloyne Court Hotel, an early Berkeley brown-shingle apartment hotel,
// now the largest house of the Berkeley Student Cooperative. Three wings of dark redwood shingle around a palm-planted courtyard
// that opens south; low hipped roofs with deep eaves and exposed rafter tails; ganged multi-pane casements with dark green trim;
// a long wooden gallery overlooks the courtyard. Massing from the 2021 LiDAR: eaves ~12.4 m, ridges ~15 m above the site datum;
// the ground falls ~3 m toward Le Roy Avenue, exposing a garden level at the west end.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop, shingleMat } from './lib/rn-b-ground.js';

export const info = {
  id: 'cloyne-court',
  name: 'Cloyne Court',
  subtitle: 'John Galen Howard · 1904',
  blurb: 'Built in 1904 as the Cloyne Court Hotel, a brown-shingle apartment hotel designed by John Galen Howard, it is now the largest house of the Berkeley Student Cooperative.',
  replaces: ['w/25017162'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.5); const M = ctx.M;
  const WALL = shingleMat('cloyne', { base: 0x5b4a3d }); // split-redwood shingle (reads as shingle, not brick)
  const TRIM = coopMat('paint', '#2e4a36');
  const ROOF = coopMat('roof', '#6c645b');
  const FASC = coopMat('paint', '#3b2a20');
  const RAIL = coopMat('paint', '#b08a5e', { rough: 0.8 });
  const floors = [-0.2, 3.3, 6.35, 9.4, 12.4];
  const GLW = M.windowNight; // shared window glass (furnished-room shader upgrades apply)
  const wBase = { glass: GLW, w: 0.62, h: 1.0, sill: 1.55, pair: 2, gap: 0.12, tran: 0, muntins: 1, mull: 0, rev: 0.1, casing: 0.09 };
  const w1 = { glass: GLW, w: 0.78, h: 1.65, sill: 0.75, pair: 3, pattern: [3, 3, 1, 3, 2, 3, 1, 2], gap: 0.1, tran: 0.6, muntins: 1, mull: 1, rev: 0.14, casing: 0.1 };
  const w2 = { ...w1, pair: 2, pattern: [3, 2, 1, 3, 2, 3, 1, 2, 3] };
  const wins = [wBase, w1, w2, { ...w2, h: 1.45 }];
  const roof = { type: 'hip', slope: 0.34, overhang: 1.1, mat: ROOF, fascia: FASC, tails: true, tailMat: FASC, soffitMat: FASC, fasciaH: 0.16 };
  const common = { floors, wall: WALL, trim: TRIM, wins, bay: 3.9, corners: false, belts: [3.3, 6.35, 9.4], beltMat: WALL };
  // north wing on Ridge Road
  const N = K.block({ ...common, u0: -35.76, u1: 25.36, v0: -12.54, v1: 0.4, roof,
    faces: { N: { doors: [{ s: 25.36 - 2.0, w: 1.9, h: 2.6, y: 3.3, door: TRIM, leaf: 2.15, landing: 1.6 }] } } });
  // west and east wings framing the courtyard (open to the south)
  const W = K.block({ ...common, u0: -35.76, u1: -24.91, v0: 0.4, v1: 19.86, roof: { ...roof, slope: 0.38 } });
  const E = K.block({ ...common, u0: 13.5, u1: 25.8, v0: 0.3, v1: 19.53, roof: { ...roof, slope: 0.38 },
    faces: { W: { doors: [3.5, 7.5, 13.0].map((s) => ({ s, w: 1.5, h: 2.5, y: 3.3, door: coopMat('paint', '#2f6b5a'), leaf: 2.45, frame: coopMat('paint', '#2f6b5a') })) } } });
  // full-height stair/bay projections into the courtyard from the north wing
  for (const [u0, u1, v1] of [[-19.88, -16.59, 2.14], [-7.1, -2.96, 3.15], [6.22, 9.72, 2.08]]) {
    K.block({ ...common, u0, u1, v0: 0.0, v1, bay: 2.0, wins: [null, { ...w1, pair: 2 }, { ...w1, pair: 2 }, { ...w2, h: 1.45 }],
      faces: { S: { doors: u0 < -10 ? [] : [{ s: (u1 - u0) / 2, w: 1.0, h: 2.4, y: 3.3, door: TRIM }] } },
      roof: { ...roof, slope: 0.45, overhang: 0.7 } });
  }
  // one-storey east annex (kitchen/dining wing) dug into the slope, flat roof
  K.block({ u0: 25.36, u1: 38.5, v0: -6.16, v1: 9.89, floors: [3.3, 7.4], wall: WALL, trim: TRIM, bay: 3.2,
    win: { glass: GLW, w: 0.7, h: 1.4, sill: 1.0, pair: 2, gap: 0.12, tran: 0.65, mull: 1, rev: 0.1 },
    roof: { type: 'hip', slope: 0.25, yTop: 8.4, overhang: 0.8, mat: ROOF, fascia: FASC, soffitMat: FASC, tails: true, tailMat: FASC } });
  // one-storey entry porch block toward Le Roy Avenue
  K.block({ u0: -38.08, u1: -35.6, v0: 6.66, v1: 13.14, floors: [0.4, 3.9], wall: WALL, trim: TRIM, bay: 2.2,
    win: { glass: GLW, w: 0.6, h: 1.3, sill: 0.9, pair: 2, gap: 0.1, mull: 0, tran: 0.6 },
    faces: { W: { doors: [{ s: 3.2, w: 1.0, h: 2.3, door: TRIM }], cs: [1.2, 5.3] } },
    roof: { type: 'hip', slope: 0.4, overhang: 0.6, mat: ROOF, fascia: FASC, soffitMat: FASC } });
  K.buildBlocks();

  // main entrance canopy on Ridge Road (broad, shallow, dark green) + address numerals plate
  {
    const R = N.runN; const s = 25.36 - 2.0;
    const g = new THREE.BoxGeometry(10.5, 0.14, 2.4); g.rotateX(0.1); g.translate(s - 2.5, 3.3 + 2.95, 1.2); K.addRun(R, TRIM, g);
    K.rbox(R, FASC, s - 7.75, 3.3 + 2.68, 2.33, s + 2.75, 3.3 + 2.86, 2.45);
    for (const sx of [-7.4, -4.9, -2.5, 0.0, 2.4]) { const L = Math.hypot(1.7, 1.0), g = new THREE.BoxGeometry(0.12, 0.14, L); g.rotateX(-Math.atan2(1.0, 1.7)); g.translate(s + sx, 3.3 + 2.3, 0.85); K.addRun(R, FASC, g); K.rbox(R, FASC, s + sx - 0.07, 3.3 + 1.7, 0, s + sx + 0.07, 3.3 + 2.9, 0.12); }
    K.rbox(R, coopMat('paint', '#d9cfb4'), s - 2.6, 3.3 + 2.1, 0, s - 1.6, 3.3 + 2.45, 0.03, { detail: true });
  }
  // courtyard gallery: one long timber gallery along the north wing's courtyard face at the second floor, clear-finished railing
  {
    const R = N.runS; const a = 11.6, z = 41.5, dp = 2.0, y = 6.35;
    K.rbox(R, FASC, a, y - 0.25, 0, z, y, dp);
    K._rail(R, a + 0.05, z - 0.05, dp - 0.08, y, RAIL, 1.1);
    for (let s = a + 0.15; s < z; s += 2.5) { K.rbox(R, FASC, s - 0.12, 3.3, dp - 0.3, s + 0.12, y - 0.25, dp - 0.06); K.colliders.push(K._colRun(R, s - 0.13, dp - 0.31, s + 0.13, dp - 0.05, 2, y)); }
    K.walkables.push(K.walkRun(R, a, z, 0, dp, () => y));
  }
  // glazed sleeping-porch bays on the top floor of the courtyard wings (boxy, nearly all glass, own shallow hip)
  {
    const GL = { glass: GLW, w: 0.78, h: 1.75, sill: 0.55, pair: 1, mull: 1, tran: 0.55, rev: 0.08, casing: 0.06, frame: coopMat('paint', '#e6dfcc') };
    for (const [b, f, s0, s1] of [[E, 'W', 3.0, 10.0], [E, 'W', 12.0, 17.5], [W, 'E', 3.0, 9.5], [W, 'E', 11.5, 17.0]]) K.bay(b, f, s0, s1, 0.95, 9.4 + 0.15, 12.1, { win: GL, wall: WALL, roofMat: ROOF });
  }
  // boxed wooden balconies with solid shingled sides on the Ridge Road front, and dark downspouts
  {
    const R = N.runN;
    for (const [s, y] of [[46.5, 6.35], [33.0, 9.4], [12.0, 6.35], [5.0, 9.4]]) {
      K.rbox(R, FASC, s - 0.95, y - 0.2, 0, s + 0.95, y, 0.85);
      K.rbox(R, WALL, s - 0.95, y, 0.75, s + 0.95, y + 1.0, 0.85); for (const sx of [-0.95, 0.85]) K.rbox(R, WALL, s + sx, y, 0, s + sx + 0.1, y + 1.0, 0.85);
      K.rbox(R, FASC, s - 1.0, y + 1.0, -0.02, s + 1.0, y + 1.08, 0.9);
      for (const sx of [-0.7, 0.7]) K.rbox(R, FASC, s + sx - 0.06, y - 0.7, 0, s + sx + 0.06, y - 0.2, 0.6, { detail: true });
    }
    for (const s of [3.0, 19.5, 30.5, 42.0, 58.0]) K.rbox(R, FASC, s - 0.05, 0.0, 0.02, s + 0.05, 12.25, 0.12, { detail: true });
  }
  // brick chimneys
  const CH = coopMat('paint', '#6a4a3c', { rough: 0.9 }); K.chimney(-28.0, -3.0, 0.8, 0.6, 15.6, CH); K.chimney(0.5, -3.2, 0.8, 0.6, 15.6, CH); K.chimney(20.5, 12.5, 0.8, 0.6, 15.4, CH);
  // low dry-laid stone wall along Ridge Road
  {
    const R = N.runN; const stone = coopMat('cmu', '#7e766a');
    for (let s = 0.5; s < R.L - 0.5; s += 6) { const s1 = Math.min(R.L - 0.5, s + 6); const g0 = Math.min(K.gR(R, s, 3.2), K.gR(R, s1, 3.2)); K.rbox(R, stone, s, g0 - 0.5, 2.9, s1, g0 + 0.55, 3.4); }
  }
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 4, plant: { hedge: true, h: 0.85, depth: 1.1 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('cloyne-court');
}
