// Andres Castro Arms, 2310 Prospect Street: a Berkeley Student Cooperative house (the co-op's Person of Color Theme House) that
// steps up the steep hillside from Warring Street. A long low wing of cream clapboard with ribbon windows under deep bracketed
// eaves climbs the slope to a taller hipped block at the top; oxblood-red trim, carved reddish-brown eave brackets, an arched
// entry with a radiating fanlight reached by a long straight stair with terraces. Massing from the 2021 LiDAR (west wing roofs
// ~12-13 m, upper block ridge ~18.3 m above datum); the ground rises ~9 m across the site.
import * as THREE from 'three';
import { CoopKit, coopMat } from './lib/coop-kit.js';

export const info = {
  id: 'andres-castro-arms',
  name: 'Andres Castro Arms',
  subtitle: 'Berkeley Student Cooperative',
  blurb: 'Andres Castro Arms, on the hillside at Prospect and Warring streets, is the Berkeley Student Cooperative\'s Person of Color Theme House.',
  replaces: ['w/185769353'],
};

export async function build(ctx) {
  const K = new CoopKit(ctx, -8.9); const M = ctx.M;
  const CL = coopMat('clap', '#e6dabd'), OX = coopMat('paint', '#6e2a1e'), RF = coopMat('roof', '#4a4a4a'), BRK = coopMat('paint', '#7a3e28', { rough: 0.7 });
  const rib = { w: 0.8, h: 1.4, sill: 0.9, pattern: [4, 3, 4], gap: 0.06, mull: 0, tran: 0.6, muntins: 1, rev: 0.14, casing: 0.12, frame: OX, casingMat: coopMat('paint', '#f0e8d6') };
  const hip = (sl, ov = 1.0) => ({ type: 'hip', slope: sl, overhang: ov, mat: RF, fascia: OX, soffitMat: coopMat('paint', '#f0e8d6'), fasciaH: 0.24 });
  const W1 = K.block({ u0: -25.23, u1: -12.5, v0: -9.33, v1: 0.7, floors: [0.6, 3.4, 6.2, 9.0, 11.6], wall: CL, wallMats: [M.concreteDark, M.concreteDark], trim: OX, win: rib, bay: 4.2, corners: true, roof: hip(0.18) });
  const W2 = K.block({ u0: -12.5, u1: 0.34, v0: -9.33, v1: 0.7, floors: [3.2, 5.8, 8.4, 10.9, 12.5], wall: CL, wallMats: [M.concreteDark, M.concreteDark], trim: OX, win: rib, bay: 4.2, corners: true, roof: hip(0.18) });
  const NE = K.block({ u0: 0.34, u1: 15.76, v0: -10.51, v1: 3.0, floors: [5.6, 8.4, 11.2, 14.2], wall: CL, wallMats: [M.concreteDark, M.concreteDark], trim: OX, win: { ...rib, pattern: [2, 3, 2] }, bay: 3.4, corners: true, roof: hip(0.6, 1.1) });
  const SE = K.block({ u0: 2.3, u1: 12.93, v0: 3.0, v1: 14.59, floors: [5.4, 8.2, 11.0, 13.8, 15.8], wall: CL, wallMats: [M.concreteDark, M.concreteDark], trim: OX, win: { ...rib, pattern: [3, 2, 3] }, bay: 3.4, corners: true,
    roof: { type: 'flat', parapet: 0.4, coping: OX, parapetMat: CL } });
  const SW = K.block({ u0: -1.86, u1: 2.3, v0: 0.7, v1: 14.59, floors: [4.2, 7.0, 9.8, 11.8], wall: CL, wallMats: [M.concreteDark, M.concreteDark], trim: OX, win: { ...rib, pattern: [2] }, bay: 3.4, corners: true,
    roof: hip(0.25, 0.7), faces: { W: { doors: [{ s: 7.0, w: 1.3, h: 2.9, door: OX, frame: coopMat('paint', '#f0e8d6'), leaf: 2.2, steps: false }] } } });
  K.buildBlocks();
  // carved eave brackets under the deep eaves of the long west wing (south and north faces)
  for (const b of [W1, W2]) for (const f of ['S', 'N']) { const R = K.faceRun(b, f); for (let s = 0.8; s < R.L - 0.5; s += 1.6) { K.rbox(R, BRK, s - 0.07, b.eave - 0.75, 0, s + 0.07, b.eave - 0.15, 0.35, { detail: true }); K.rbox(R, BRK, s - 0.07, b.eave - 0.32, 0.3, s + 0.07, b.eave - 0.12, 0.85, { detail: true }); } }
  // arched fanlight over the entry
  { const R = SW.runW; const sc = 7.0, y = 4.2 + 2.2; const sh = new THREE.Shape(); sh.absarc(0, 0, 0.65, 0, Math.PI, false); sh.lineTo(-0.65, 0);
    const g = new THREE.ShapeGeometry(sh, 12); g.translate(sc, y, -0.1); K.addRun(R, coopMat('paint', '#d7b25a', { rough: 0.4 }), g, { uvMode: 'keep' });
    for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; const gg = new THREE.BoxGeometry(0.04, 0.62, 0.03); gg.translate(0, 0.31, 0); gg.rotateZ(a - Math.PI / 2); gg.translate(sc, y, -0.08); K.addRun(R, OX, gg, { detail: true }); }
    K.rbox(R, coopMat('paint', '#f0e8d6'), sc - 0.95, 4.2, 0, sc - 0.65, y + 0.2, 0.08); K.rbox(R, coopMat('paint', '#f0e8d6'), sc + 0.65, 4.2, 0, sc + 0.95, y + 0.2, 0.08); }
  // long straight stair with a landing climbing from the lower garden to the arched entry, with terrace retaining walls
  { const R = SW.runW; const sc = 7.0, top = 4.2; const gl = K.gR(R, sc, 7.5); const n = Math.max(2, Math.round((top - gl) / 0.17)); const tr = 0.3;
    K.rbox(R, M.concrete, sc - 1.0, gl - 0.5, 0, sc + 1.0, top, 1.5); K.walkables.push(K.walkRun(R, sc - 1.0, sc + 1.0, 0, 1.5, () => top));
    for (let k = 0; k < n; k++) { const h = top - (top - gl) * (k + 1) / n; if (h < gl + 0.02) break; K.rbox(R, M.concrete, sc - 0.75, gl - 0.6, 1.5 + k * tr, sc + 0.75, h, 1.5 + (k + 1) * tr); }
    K.walkables.push(K.walkRun(R, sc - 0.75, sc + 0.75, 1.5, 1.5 + n * tr, (ss, dd) => Math.max(gl, top - (top - gl) * (Math.floor((dd - 1.5) / tr) + 1) / n)));
    for (const s of [sc - 0.85, sc + 0.85]) K._rail(K.run(R.at(s, 1.5), R.at(s, 1.5 + n * tr)), 0, n * tr, 0, 0, M.iron, 0.0001) || null;
    for (const [s0, s1] of [[0.5, sc - 1.2], [sc + 1.2, R.L - 0.5]]) { const g0 = K.gR(R, (s0 + s1) / 2, 3.5); K.rbox(R, M.concreteDark, s0, g0 - 0.6, 3.2, s1, g0 + 0.9, 3.5); } }
  K.chimney(8.0, -4.0, 1.0, 0.8, 19.6, M.brick);
  return K.done('andres-castro-arms');
}
