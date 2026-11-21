// University House (Albert Pissis, 1911): the former chancellor's residence, an Italian Renaissance villa of buff
// sandstone ashlar with long-and-short quoins, a deep modillioned cornice and a low red-tile hip roof. The south garden
// front has a semicircular Ionic bow window carrying a balustraded balcony; an arched entrance loggia with a
// balustrade sits on the west side. LiDAR: eaves ~11.5 m, roof ~14.3 m.
import * as THREE from 'three';
import { Kit, corniceProfile, balustrade } from './lib/classic-kit.js';
import { campusLamp, drapeStrip, shrubRow, tint, paleGlass, surround } from './lib/b05a-kit.js';

export const info = {
  id: 'university-house',
  name: 'University House',
  subtitle: 'Albert Pissis · 1911',
  blurb: 'Built as the residence of University of California presidents and later home to Berkeley\'s chancellors, this sandstone Italian Renaissance villa stands in its own garden at the northwest corner of campus.',
  replaces: ['w/24025039'],
};

export async function build(ctx) {
  const M = ctx.M; const K = new Kit(ctx, Math.atan2(-1.9, 12.1));
  const W = tint(K, M.ashlar, 0xe6dabf, 'uhWall'), Q = tint(K, M.ashlar, 0xc9b997, 'uhQuoin'), T = tint(K, M.granite, 0xe9dfc6, 'uhTrim');
  const FR = M.darkBronze, GL = paleGlass();
  const colliders = [], walkables = [];
  const BASE = 0.9, F2 = 5.1, TOP = 9.6, EAVE = 11.5;
  const blocks = [
    { u0: -12.45, u1: 10.1, v0: -5.2, v1: 11.1, faces: ['S', 'E', 'N', 'W'] },
    { u0: -2.2, u1: 10.03, v0: -14.22, v1: -5.2, faces: ['E', 'N', 'W'] },
  ];
  const recess = { s0: 0, s1: 0 }; // south bow recess handled below
  const win = (c, y0, y1, w) => ({ s0: c - w / 2, s1: c + w / 2, y0, y1 });
  function facade(R, opts = {}) {
    const L = R.L; const nb = Math.max(2, Math.round((L - 2.4) / 3.6)); const bw = (L - 2.4) / nb;
    const cs = []; for (let i = 0; i < nb; i++) cs.push(1.2 + bw * (i + 0.5));
    const skipG = opts.skipG || [], skipU = opts.skipU || [];
    const gf = cs.filter((_, i) => !skipG.includes(i)).map((c) => win(c, BASE + 0.9, BASE + 3.3, 1.25));
    const uf = cs.filter((_, i) => !skipU.includes(i)).map((c) => win(c, F2 + 0.75, F2 + 2.95, 1.15));
    K.wall(R, W, 0, L, -1.5, BASE, [], 0.5);
    K.wall(R, W, 0, L, BASE, F2, gf, 0.5); K.wall(R, W, 0, L, F2, TOP, uf, 0.5);
    for (const o of [...gf, ...uf]) {
      K.fill(R, o, { glass: GL, frame: FR, mull: 1, tran: [o.y0 + (o.y1 - o.y0) * 0.5], rev: 0.32, sillMat: T });
      surround(K, R, T, o, 0.17, 0.08);
      K.rbox(R, T, o.s0 - 0.32, o.y1 + 0.17, 0, o.s1 + 0.32, o.y1 + 0.34, 0.24); // cornice hood
      K.rbox(R, T, o.s0 - 0.2, o.y1 + 0.34, 0, o.s1 + 0.2, o.y1 + 0.4, 0.16);
    }
    // plinth course, stringcourse, frieze, modillioned cornice
    K.rbox(R, Q, -0.08, -1.5, 0, L + 0.08, BASE, 0.1);
    K.rbox(R, T, -0.12, BASE - 0.05, 0, L + 0.12, BASE + 0.12, 0.18);
    K.mould(R, T, 0, L, [[0, F2 - 0.1], [0.14, F2 - 0.06], [0.14, F2 + 0.18], [0, F2 + 0.22]]);
    K.rbox(R, T, -0.05, TOP, -0.1, L + 0.05, TOP + 0.95, 0.06);
    const nm = Math.floor(L / 0.75);
    for (let i = 0; i < nm; i++) { const s = (L - nm * 0.75) / 2 + i * 0.75 + 0.27; K.rbox(R, T, s, TOP + 1.05, 0.05, s + 0.2, TOP + 1.35, 0.85, { detail: true }); }
    const nd = Math.floor(L / 0.25);
    for (let i = 0; i < nd; i++) { const s = (L - nd * 0.25) / 2 + i * 0.25 + 0.05; K.rbox(R, T, s, TOP + 0.95, 0.05, s + 0.13, TOP + 1.05, 0.22, { detail: true }); }
    K.mould(R, T, 0, L, [[0, TOP + 0.95], [0.25, TOP + 0.95], [0.25, TOP + 1.05], [0.3, TOP + 1.05], [0.3, TOP + 1.35], [0.95, TOP + 1.35], [0.95, TOP + 1.6], [1.0, TOP + 1.65], [1.0, EAVE], [0, EAVE]]);
    // long-and-short quoins at both ends
    for (const s of [0, L]) for (let y = BASE + 0.15, k = 0; y < TOP - 0.2; y += 0.55, k++) {
      const w = k % 2 ? 0.55 : 0.95; const a = s === 0 ? 0 : L - w, b = s === 0 ? w : L;
      K.rbox(R, Q, a - (s === 0 ? 0.02 : 0), y + 0.03, 0, b + (s === 0 ? 0 : 0.02), y + 0.52, 0.06);
    }
    return cs;
  }
  for (const B of blocks) {
    const defs = { S: [[B.u0, B.v1], [B.u1, B.v1]], E: [[B.u1, B.v1], [B.u1, B.v0]], N: [[B.u1, B.v0], [B.u0, B.v0]], W: [[B.u0, B.v0], [B.u0, B.v1]] };
    for (const f of B.faces) {
      const R = K.run(...defs[f]);
      if (B === blocks[0] && f === 'N') { // only the part not covered by the north wing
        const R2 = K.run([-2.2, B.v0], [B.u0, B.v0]); facade(R2); continue;
      }
      if (B === blocks[0] && f === 'S') { facade(R, { skipG: [3, 4] }); continue; }
      facade(R, f === 'W' && B === blocks[0] ? { skipG: [1] } : {});
    }
    K.box(M.concreteDark, B.u0 + 0.6, -1.5, B.v0 + 0.6, B.u1 - 0.6, EAVE - 0.05, B.v1 - 0.6);
    colliders.push(K.colPoly([[B.u0, B.v0], [B.u1, B.v0], [B.u1, B.v1], [B.u0, B.v1]], -1.5, EAVE + 3));
  }
  // red tile hip roofs (main block + north wing)
  K.hip(M.redTile, -12.45 - 0.9, -5.2 - 0.9, 10.1 + 0.9, 11.1 + 0.9, EAVE - 0.05, 0.36, { yTop: 14.3 });
  K.box(M.redTile, -4.0, 14.25, 1.0, 1.6, 14.32, 5.0);
  K.hip(M.redTile, -2.2 - 0.9, -14.22 - 0.9, 10.03 + 0.9, -4.0, EAVE - 0.05, 0.36);
  // chimneys
  for (const [u, v, h] of [[5.6, -9.5, 19.0], [-8.5, 3.0, 16.6], [6.5, 6.0, 16.2]]) {
    K.box(W, u - 0.55, 10, v - 0.85, u + 0.55, h, v + 0.85);
    K.box(T, u - 0.7, h - 0.45, v - 1.0, u + 0.7, h - 0.25, v + 1.0); K.box(T, u - 0.62, h, v - 0.92, u + 0.62, h + 0.18, v + 0.92);
  }
  // ---------- south garden front: semicircular Ionic bow window with a balustraded balcony ----------
  {
    const cu = 2.2, cv = 11.1, r = 2.5; const yb = 4.4;
    const prof = []; const n = 14;
    for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; prof.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); }
    // bow wall: three tall windows between Ionic pilasters
    for (let i = 0; i < n; i++) {
      const [ua, va] = prof[i + 1], [ub, vb] = prof[i]; const R = K.run([ua, va], [ub, vb]);
      const isWin = [2, 3, 6, 7, 10, 11].includes(i);
      if (isWin) { K.wall(R, W, 0, R.L, -1.5, BASE + 0.9, [], 0.4); K.rbox(R, GL, 0, BASE + 0.9, -0.15, R.L, yb - 0.4, -0.1); K.wall(R, W, 0, R.L, yb - 0.4, yb, [], 0.4); K.rbox(R, FR, R.L - 0.05, BASE + 0.9, -0.12, R.L + 0.03, yb - 0.4, -0.05, { detail: true }); }
      else { K.wall(R, W, 0, R.L, -1.5, yb, [], 0.4); if ([0, 4, 5, 8, 9, 13].includes(i)) { K.rbox(R, T, 0.05, BASE, 0, R.L - 0.05, yb - 0.3, 0.12); } }
    }
    K.cyl(M.concreteDark, cu, -1.5, cv, r - 0.3, r - 0.3, yb + 1.5 - 0.05, 16);
    // entablature + balcony slab + balustrade
    const g = new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.45, 20, 1, false, -Math.PI / 2, Math.PI); g.translate(cu, yb + 0.22, cv); K.add(T, g);
    const g2 = new THREE.CylinderGeometry(r + 0.2, r + 0.2, 0.15, 20, 1, false, -Math.PI / 2, Math.PI); g2.translate(cu, yb + 0.52, cv); K.add(T, g2);
    for (let i = 0; i <= 26; i++) { const a = Math.PI * i / 26; const bu = cu + Math.cos(a) * (r + 0.05), bv = cv + Math.sin(a) * (r + 0.05); K.lathe(T, [[0.07, 0], [0.05, 0.1], [0.1, 0.35], [0.05, 0.6], [0.08, 0.68], [0.001, 0.7]], bu, yb + 0.6, bv, 6, { detail: true }); }
    const rail = new THREE.TorusGeometry(r + 0.05, 0.1, 4, 20, Math.PI); rail.rotateX(-Math.PI / 2); rail.translate(cu, yb + 1.35, cv); K.add(T, rail);
    // garden steps down from the bow
    walkables.push(K.stairs(T, cu - 1.8, cv + r + 0.2, cu + 1.8, cv + r + 1.6, K.g(cu, cv + r + 2), BASE, '-v', Math.max(2, Math.round((BASE - K.g(cu, cv + r + 2)) / 0.16))));
  }
  // ---------- west entrance loggia: three round arches, balustraded parapet ----------
  {
    const u0 = -14.9, u1 = -12.45, v0 = -3.6, v1 = 6.8, top = 6.0;
    const R = K.run([u0, v0], [u0, v1]); const L = R.L; const nA = 3; const aw = (L - 1.2) / nA;
    const ops = []; for (let i = 0; i < nA; i++) { const c = 0.6 + aw * (i + 0.5); ops.push({ s0: c - aw * 0.36, s1: c + aw * 0.36, y0: BASE, y1: BASE + 3.4, arch: true }); }
    K.wall(R, W, 0, L, -1.5, top - 0.9, ops, 0.55);
    for (const o of ops) { const cx = (o.s0 + o.s1) / 2, w = o.s1 - o.s0; K.rbox(R, T, cx - 0.12, o.y1 - 0.15, 0, cx + 0.12, o.y1 + 0.3, 0.12); }
    for (const [a, b] of [[[u1, v0], [u0, v0]], [[u0, v1], [u1, v1]]]) { const R2 = K.run(a, b); K.wall(R2, W, 0, R2.L, -1.5, top - 0.9, [{ s0: 0.5, s1: R2.L - 0.5, y0: BASE, y1: BASE + 3.0, arch: 'seg', rise: 0.4 }], 0.4); }
    K.box(T, u0 - 0.15, top - 0.9, v0 - 0.15, u1, top - 0.6, v1 + 0.15);
    K.box(M.paving, u0 + 0.5, BASE - 0.1, v0 + 0.4, u1, BASE, v1 - 0.4);
    balustrade(K, R, T, 0, L, top - 0.6, 0.95);
    for (const [a, b] of [[[u1, v0], [u0, v0]], [[u0, v1], [u1, v1]]]) { const R2 = K.run(a, b); balustrade(K, R2, T, 0, R2.L, top - 0.6, 0.95); }
    walkables.push(K.walkPoly([[u0 + 0.5, v0 + 0.4], [u1, v0 + 0.4], [u1, v1 - 0.4], [u0 + 0.5, v1 - 0.4]], BASE));
    const gl = K.g(u0 - 1.5, (v0 + v1) / 2); const ns = Math.max(2, Math.round((BASE - gl) / 0.16));
    walkables.push(K.stairs(T, u0 - ns * 0.34, (v0 + v1) / 2 - 1.4, u0, (v0 + v1) / 2 + 1.4, gl, BASE, '+u', ns));
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v0 + 0.5], [u0, v0 + 0.5]], -1, top), K.colPoly([[u0, v1 - 0.5], [u1, v1 - 0.5], [u1, v1], [u0, v1]], -1, top));
  }
  // garden: terrace hedge and lamps
  shrubRow(K, [-12.45, 11.1], [-1.0, 11.1], 0.6, { h: 1.1 }); shrubRow(K, [5.5, 11.1], [10.1, 11.1], 0.6, { h: 1.1 });
  shrubRow(K, [10.1, 11.1], [10.1, -14.2], 0.6, { h: 1.0 });
  campusLamp(K, -16.5, -5.5, { h: 3.6 });
  const object3d = K.finish(); object3d.name = 'university-house';
  return { object3d, colliders, walkables };
}
