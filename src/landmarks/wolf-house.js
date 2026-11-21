// Wolf House, 2732 Durant Avenue: a Berkeley Student Cooperative house a block from campus. A three-storey cream stucco house
// with bright blue trim: ribbon windows in thick blue frames, a projecting corner bay on the Durant front, deep blue-soffited
// eaves on a low hipped roof, a front landing with a curved iron railing, and stacked white-railed balconies over an exterior
// stair on the west side. Massing from the 2021 LiDAR (eaves ~8.6 m, ridge ~11.5 m above datum).
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'wolf-house',
  name: 'Wolf House',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'A cream-and-blue stucco co-op house on Durant Avenue, a block east of campus, run by the Berkeley Student Cooperative.',
  replaces: ['w/185769362'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -9.4); const M = ctx.M;
  const ST = coopMat('stucco', '#e3c991'), BL = coopMat('paint', '#2f7fc1'), WH = coopMat('paint', '#f2f2ee'), RF = coopMat('roof', '#6c6a66');
  const rib = { w: 0.7, h: 1.4, sill: 0.9, pattern: [3, 2, 4, 2], gap: 0.12, mull: 0, tran: 0.55, muntins: 1, rev: 0.16, casing: 0.15, frame: WH, casingMat: BL };
  const floors = [0.8, 3.45, 6.1, 8.7];
  const H = K.block({ u0: -5.59, u1: 6.61, v0: -11.94, v1: 11.49, floors, wall: ST, trim: BL, win: rib, bay: 3.6, belts: [3.45, 6.1], beltMat: BL,
    roof: { type: 'hip', slope: 0.42, yTop: 11.0, overhang: 0.95, mat: RF, fascia: BL, soffitMat: BL, fasciaH: 0.26 },
    faces: { N: { doors: [{ s: 3.4, w: 1.1, h: 2.2, y: 1.6, door: BL, frame: WH, steps: false }] } } });
  K.block({ u0: -6.98, u1: -5.59, v0: 0.06, v1: 11.49, floors: [0.6, 3.3, 6.0], wall: ST, trim: BL, win: { ...rib, pattern: [1] }, bay: 3.0, roof: { type: 'flat', parapet: 0.3, coping: BL, parapetMat: ST } });
  K.buildBlocks();
  // projecting corner bay at the north-east corner of the Durant front, upper two floors, windows wrapping it
  K.bay(H, 'N', 0.35, 3.0 + 0.35, 0.9, 3.45 + 0.1, 8.05, { win: { ...rib, w: 0.65, pair: 3, gap: 0.08 }, wall: ST, roofMat: BL });
  // front landing with curved iron railing and steps down to the Durant sidewalk
  { const R = H.runN; const sc = 3.4, gy = K.gR(R, sc, 3.0); const top = 1.6;
    K.rbox(R, ST, sc - 1.6, gy - 0.6, 0, sc + 1.6, top, 1.8); K.walkables.push(K.walkRun(R, sc - 1.6, sc + 1.6, 0, 1.8, () => top));
    const n = Math.max(1, Math.round((top - gy) / 0.17)); for (let k = 0; k < n; k++) { const h = top - (top - gy) * (k + 1) / n; if (h < gy + 0.02) break; K.rbox(R, M.concrete, sc - 0.8, gy - 0.6, 1.8 + k * 0.3, sc + 0.8, h, 2.1 + k * 0.3); }
    for (let a = 0; a <= 12; a++) { const t = a / 12 * Math.PI / 2; const s = sc - 1.6 + (1 - Math.cos(t)) * 0.8, d = 1.0 + Math.sin(t) * 0.8; K.rbox(R, M.iron, s - 0.02, top, d - 0.02, s + 0.02, top + 1.0, d + 0.02, { detail: true }); }
    K._rail(R, sc + 0.8, sc + 1.55, 1.75, top, M.iron, 1.0);
    K.rbox(R, WH, sc + 1.0, top + 0.6, 1.72, sc + 1.5, top + 0.82, 1.8, { detail: true }); }
  // stacked white-railed balconies over an exterior stair on the west side
  { const R = H.runW; for (const y of [3.45, 6.1]) { K.rbox(R, ST, 2.0, y - 0.2, 0, 7.0, y, 1.3); K._rail(R, 2.05, 6.95, 1.25, y, WH, 1.0); }
    for (const s of [2.1, 6.9]) K.rbox(R, WH, s - 0.08, 0.0, 1.1, s + 0.08, 6.1, 1.26);
  }
  K.chimney(1.0, 6.0, 0.7, 0.7, 12.3, ST);
  return K.done('wolf-house');
}
