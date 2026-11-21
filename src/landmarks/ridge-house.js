// Ridge House, 2420 Ridge Road: a Berkeley Student Cooperative house next to Casa Zimbabwe. A plain cream stucco block of three
// storeys over a raised basement, with low hipped composition roofs, white sliding windows in dark green-grey surrounds, a large
// steel-framed divided-light window high on the Ridge Road front and a black steel fire escape on the west side.
// Massing from the 2021 LiDAR: main hip ridge ~14 m, a lower south range ~11.5 m and a flat-roofed two-storey south-east corner.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';
import { coopRuns, finishGround, stoop } from './lib/rn-b-ground.js';

export const info = {
  id: 'ridge-house',
  name: 'Ridge House',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A cream stucco co-op house on Ridge Road, neighbour of Casa Zimbabwe, run by the Berkeley Student Cooperative.',
  replaces: ['w/60117886'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.5); const M = ctx.M;
  const ST = coopMat('stucco', '#e4ddcf'), TR = coopMat('paint', '#2f3a36'), RF = coopMat('roof', '#5b5550'), WH = M.whitePaint;
  const win = { w: 1.2, h: 1.05, sill: 0.95, pair: 1, mull: 1, tran: 0, rev: 0.14, casing: 0.12, frame: WH, casingMat: TR };
  const wins = [{ ...win, w: 0.8, h: 0.6, sill: 1.7, casing: 0.08 }, win, { ...win, pattern: [1, 2, 1] }, win];
  const roof = (sl) => ({ type: 'hip', slope: sl, overhang: 0.45, mat: RF, fascia: WH, soffitMat: WH, fasciaH: 0.22 });
  const main = K.block({ u0: -9.72, u1: 9.48, v0: -9.69, v1: 4.0, floors: [1.2, 4.3, 7.4, 10.5, 11.0], wall: ST, trim: TR, wins, bay: 3.4, roof: roof(0.36), belts: [4.3, 7.4], beltMat: ST,
    faces: { N: { skipS: [[12.5, 17.5]], doors: [{ s: 4.0, w: 1.0, h: 2.2, y: 4.3 - 0.2, door: TR, hood: 0.7 }] } } });
  K.block({ u0: -9.72, u1: 4.5, v0: 4.0, v1: 9.33, floors: [1.0, 4.0, 7.0, 10.2], wall: ST, trim: TR, wins, bay: 3.4, roof: roof(0.35) });
  const se = K.block({ u0: 4.5, u1: 9.5, v0: 4.0, v1: 9.33, floors: [0.6, 3.8, 7.2], wall: ST, trim: TR, wins, bay: 2.6, roof: { type: 'flat', parapet: 0.4, coping: WH, parapetMat: ST } });
  K.buildBlocks();
  // big steel divided-light window high on the left of the Ridge Road front (6 x 4 grid)
  { const R = main.runN; const s0 = 12.2, s1 = 16.6, y0 = 7.6, y1 = 10.4;
    K.rbox(R, ST, s0 - 0.25, y0 - 0.25, 0, s1 + 0.25, y1 + 0.25, 0.04);
    K.rbox(R, M.windowNight, s0, y0, 0.03, s1, y1, 0.05);
    for (let i = 0; i <= 4; i++) { const s = s0 + (s1 - s0) * i / 4; K.rbox(R, M.blackPaint, s - 0.03, y0, 0.04, s + 0.03, y1, 0.09, { detail: true }); }
    for (let j = 0; j <= 4; j++) { const y = y0 + (y1 - y0) * j / 4; K.rbox(R, M.blackPaint, s0, y - 0.03, 0.04, s1, y + 0.03, 0.09, { detail: true }); } }
  // black steel fire escape on the west side: landings at each floor, ladders between
  { const R = main.runW; const sa = 3.0, sb = 8.0, FE = coopMat('metal', '#3a3f3d');
    for (const y of [4.3, 7.4, 10.4]) { K.rbox(R, FE, sa, y - 0.08, 0, sb, y, 1.1); K._rail(R, sa, sb, 1.05, y, FE, 1.0); }
    for (const [y0, y1, s] of [[4.3, 7.4, sb - 0.8], [7.4, 10.4, sa + 0.8]]) { const L = Math.hypot(y1 - y0, 2.4); const g = new THREE.BoxGeometry(0.7, 0.08, L); g.rotateX(-Math.atan2(y1 - y0, 2.4)); g.rotateY(Math.PI / 2); g.translate(s - (s > 5 ? 1.2 : -1.2), (y0 + y1) / 2, 0.6); K.addRun(R, FE, g, { detail: true }); }
    for (const s of [sa, sb]) K.rbox(R, FE, s - 0.04, 1.0, 1.0, s + 0.04, 11.4, 1.08, { detail: true }); }
  K.chimney(0.0, 1.5, 0.8, 0.8, 15.0, ST);
  // finished grounds: foundation planting along the walls (kept clear of doors and slopes), bike racks by the door (rn-b-ground)
  { const Gd = finishGround(K, ctx, coopRuns(K), { entries: [], ...{ bikes: 3, plant: { h: 0.8, depth: 1.1 } } }); K.colliders.push(...Gd.colliders); K.walkables.push(...Gd.walkables); }
  return K.done('ridge-house');
}
