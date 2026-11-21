// Casa Zimbabwe, 2422 Ridge Road: one of the Berkeley Student Cooperative's largest buildings, a stepped cluster of
// flat-roofed stucco blocks around a central spine on the steep slope of Ridge Road. Mustard-yellow and ochre textured stucco over a
// grey board-formed concrete podium, ribbon windows in dark frames under projecting sunshade slabs, a stack of projecting bays, a tall
// timber slat screen and solar arrays on A-frame racks on the roofs. Heights follow the 2021 LiDAR (roofs ~17-20.5 m above datum, a
// penthouse to ~24 m); the ground falls ~10 m from the north-west corner to the south-east.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop } from './lib/rn-b-ground.js';
import { panelMat } from './lib/rn-kit.js';
import { letterPanel } from './lib/b08c-kit.js';

export const info = {
  id: 'casa-zimbabwe',
  name: 'Casa Zimbabwe',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Known to residents as CZ, this stepped stucco-and-concrete complex on Ridge Road is one of the largest houses of the Berkeley Student Cooperative.',
  replaces: ['w/25017156'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.6); const M = ctx.M;
  const YEL = coopMat('stucco', '#d4b04e'), OCH = coopMat('stucco', '#c38d33'); // board-formed concrete podium (horizontal 15 cm boards)
  const CON = panelMat('czBoard', { pw: 2.4, ph: 0.15, span: 2.4, base: 0x9d998f, joint: 0x85817a, jw: 0.006, vary: 0.05, stagger: false, grain: 0.05 });
  const FR = coopMat('paint', '#2b2b2b'); const WOOD = coopMat('paint', '#8f735a', { rough: 0.85 });
  const rib = { w: 0.95, h: 1.3, sill: 0.85, pattern: [5, 1, 0, 2, 6, 0, 1], gap: 0.06, mull: 0, tran: 0, rev: 0.25, casing: 0, frame: FR };
  const flat = (par = 0.5, pm) => ({ type: 'flat', parapet: par, coping: coopMat('paint', '#8c7d5a'), parapetMat: pm });
  const fl = (y0, n, h = 3.2) => { const a = []; for (let i = 0; i <= n; i++) a.push(+(y0 + i * h).toFixed(2)); return a; };
  const NW = K.block({ u0: -19.04, u1: -7.31, v0: -19.55, v1: -13.1, floors: fl(10.6, 3, 3.25), wall: YEL, wallMats: [CON, CON], trim: FR, win: rib, wins: [false, rib, rib], bay: 3.0, depth: 0.35, roof: flat(0.4, YEL) });
  const N = K.block({ u0: -7.31, u1: 8.63, v0: -20.49, v1: -8.76, floors: fl(7.4, 3, 3.2), wall: OCH, wallMats: [CON, CON], trim: FR, win: rib, wins: [false, { ...rib, pattern: [6, 6, 6], h: 2.4, sill: 0.3 }, false], bay: 3.0, depth: 0.35, roof: flat(0.4, OCH),
    faces: { N: { doors: [{ s: 8.63 - 2.0, w: 1.1, h: 2.2, door: coopMat('paint', '#2a2a2a'), leaf: 2.15, frame: FR, steps: false }, { s: 5.5, w: 6.0, h: 3.0, door: coopMat('paint', '#151515'), leaf: 2.95, frame: CON, steps: false, casing: false }] } } });
  const S = K.block({ u0: -7.31, u1: 5.68, v0: -8.76, v1: 5.68, floors: fl(5.3, 3, 3.2) .map((y, i, a) => i === a.length - 1 ? 17.1 : y), wall: YEL, wallMats: [CON, CON], trim: FR, win: rib, bay: 3.0, depth: 0.35, roof: flat(0.4, YEL) });
  const E = K.block({ u0: 5.18, u1: 17.49, v0: -8.75, v1: 20.54, floors: [3.7, 6.9, 10.1, 13.3, 16.5, 19.8], wall: YEL, wallMats: [CON, CON], trim: FR, win: rib, bay: 3.0, depth: 0.35, roof: flat(0.5, YEL) });
  const W = K.block({ u0: -19.85, u1: -3.85, v0: -0.08, v1: 16.48, floors: [7.4, 10.6, 13.8, 17.0, 20.3], wall: YEL, wallMats: [CON, CON], trim: FR, win: rib, bay: 3.0, depth: 0.35, roof: flat(0.5, YEL) });
  const P = K.block({ u0: 9.6, u1: 16.6, v0: -7.0, v1: -0.6, floors: [19.8, 23.2], wall: OCH, trim: FR, win: { ...rib, pattern: [3] }, bay: 3.4, roof: flat(0.3, OCH), collide: false });
  K.buildBlocks();
  // projecting stucco sunshade slabs at the floor lines of the residential blocks
  // (per-floor wrap fins removed: the real towers are plain stucco with stacked bays)
  // stack of three projecting bay boxes on the north face of the east block
  for (const y of [6.9, 10.1, 13.3, 16.5]) K.bay(E, 'N', 3.0, 5.6, 1.2, y + 0.2, y + 2.9, { win: { w: 0.8, h: 1.5, sill: 0.6, mull: 1, muntins: 1, rev: 0.1, frame: FR }, wall: OCH, roofMat: OCH });
  // tall timber slat sunscreen at the north-west corner of the ochre wing, rising past its roofline
  { const R = N.runN; const s0 = N.u1 - N.u0 - 4.6, s1 = s0 + 4.0; const gy = K.gR(R, s0 + 2, 0.6);
    for (let y = gy + 0.3; y < 18.6; y += 0.24) K.rbox(R, WOOD, s0, y, 0.25, s1, y + 0.09, 0.42, { detail: true });
    for (const s of [s0, s1 - 0.12]) K.rbox(R, WOOD, s, gy - 0.5, 0.2, s + 0.12, 18.7, 0.45); }
  // entrance pergola on Ridge Road: posts on concrete piers with a slatted beam grid
  { const R = N.runN; const sc = N.u1 - N.u0 - 2.0; const gy = K.gR(R, sc, 2.5);
    for (const s of [sc - 2.2, sc + 2.2]) for (const d of [1.0, 4.0]) { K.rbox(R, CON, s - 0.2, gy - 0.5, d - 0.2, s + 0.2, gy + 0.5, d + 0.2); K.rbox(R, WOOD, s - 0.1, gy + 0.5, d - 0.1, s + 0.1, gy + 3.0, d + 0.1); K.colliders.push(K._colRun(R, s - 0.2, d - 0.2, s + 0.2, d + 0.2, gy - 1, gy + 3)); }
    for (const d of [1.0, 4.0]) K.rbox(R, WOOD, sc - 2.6, gy + 3.0, d - 0.1, sc + 2.6, gy + 3.3, d + 0.1);
    for (let s = sc - 2.4; s <= sc + 2.4; s += 0.4) K.rbox(R, WOOD, s - 0.04, gy + 3.3, 0.6, s + 0.04, gy + 3.45, 4.4, { detail: true }); }
  // raised letters on the street box
  { const R = N.runN; letterPanel(K, R, 'BERKELEY STUDENT COOPERATIVE', (N.u1 - N.u0) / 2 - 1.0, 17.02, 8.6, 0.46, 0.05, { color: '#ebe5d3', font: 'bold 150px Arial, sans-serif', spacing: 0.12, shadow: '#6e5420' }); }
  // solar arrays on A-frame racks
  K.solar(-17.5, 1.0, -6.0, 9.0, 20.3 + 0.5); K.solar(6.5, 2.0, 16.0, 19.0, 19.8 + 0.5); K.solar(-6.0, -19.0, 7.0, -10.0, 17.0 + 0.4);
  // rooftop exhaust stacks
  K.cyl(coopMat('metal', '#c9c9c4'), 12.5, 23.2, -4.0, 0.3, 0.3, 1.6, 12); K.cyl(coopMat('metal', '#c9c9c4'), -12.0, 20.3, -16.0, 0.25, 0.25, 1.4, 12);
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 4, plant: { h: 0.8, depth: 1.1 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('casa-zimbabwe');
}
