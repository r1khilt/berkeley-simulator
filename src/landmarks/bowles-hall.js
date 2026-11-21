// Bowles Hall (George W. Kelham, 1928–29), the first residence hall on the Berkeley campus and California's first
// state-owned dormitory. Collegiate Gothic in board-formed concrete that imitates ashlar: steep flat-clay-tile roofs with
// parapet gables and coped cross-gables, grouped steel casements, tall chimney stacks and a battlemented entrance tower
// with a stair turret at the inside corner of the L-shaped plan, above a terraced lawn that falls toward Gayley Road.
// Massing follows the 2021 LiDAR (frame rotated 23.5°): main range eaves ~21.5 m / ridge ~27.4 m, the cross range
// ~17/21.4 m, a projecting gabled pavilion at the east end, and the tower to ~36.5 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { bmats, stuccoBlock, crossGable, battlement, chimney, steps } from './lib/b08c-kit.js';

export const info = {
  id: 'bowles-hall',
  name: 'Bowles Hall',
  subtitle: 'George W. Kelham · 1929',
  blurb: 'Dedicated in 1929 with a gift from Mary McNear Bowles in memory of her husband, Regent Phillip E. Bowles, this castle-like Collegiate Gothic hall on the hill above Memorial Stadium was the first residence hall on campus.',
  replaces: ['w/24025052', 'way/24025052'],
};

export async function build(ctx) {
  const M = ctx.M; const B = bmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(23.5));
  const colliders = [], walkables = [];
  const W = B.gothWall, T = B.gothTrim, RT = B.tudorTile;
  const col = (u0, v0, u1, v1, y1) => colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, y1));
  const win = { w: 1.55, h: 1.55, mull: 1, muntins: 3 };
  const common = { mat: W, roof: 'gable', roofMat: RT, corniceMat: T, corniceP: 0.22, corniceH: 0.32, frame: B.frameDark, overhang: 0.3, fh: 3.25, depth: 0.42 };

  // ---------- ranges ----------
  const A = { u0: -15.0, u1: 36.5, v0: -12.6, v1: -1.0, eave: 20.6, ridge: 27.6, axis: 'u', bay: 3.4 };
  const Bw = { u0: -14.2, u1: -3.6, v0: -1.0, v1: 26.5, eave: 16.0, ridge: 21.8, axis: 'v', bay: 3.4, faces: { N: false } };
  const Bs = { u0: -14.2, u1: -3.7, v0: 26.5, v1: 33.5, eave: 13.8, ridge: 17.8, axis: 'v', bay: 3.4, faces: { N: false } };
  const Aw = { u0: -36.5, u1: -15.0, v0: -15.3, v1: 1.7, eave: 12.6, ridge: 16.4, axis: 'u', bay: 3.4, faces: { E: false } };
  const P0 = { u0: 26.2, u1: 38.8, v0: -1.0, v1: 6.0, eave: 19.2, ridge: 24.8, axis: 'v', bay: 3.4, faces: { N: false, S: false } };
  const P = { u0: 26.2, u1: 38.8, v0: 6.0, v1: 13.1, eave: 15.6, ridge: 20.6, axis: 'v', bay: 3.4, faces: { N: false }, win: { w: 2.3, h: 2.6, mull: 2, muntins: 4 } };
  for (const b of [A, Bw, Bs, Aw, P0, P]) { stuccoBlock(K, { ...common, win, ...b }); col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5); }
  // low west annex and the rear service block
  stuccoBlock(K, { ...common, u0: -18.8, u1: -14.2, v0: 26.5, v1: 31.2, eave: 11.2, roof: 'flat', parapet: 0.7, faces: { E: false }, win, bay: 3.0 });
  stuccoBlock(K, { ...common, u0: 4.7, u1: 12.8, v0: -23.2, v1: -12.6, eave: 14.6, roof: 'flat', parapet: 0.7, faces: { S: false }, win, bay: 3.0 });
  col(-18.8, 26.5, -14.2, 31.2, 12); col(4.7, -23.2, 12.8, -12.6, 15.5);

  // ---------- parapet gable copings on the exposed range ends ----------
  const rakeCope = (R, yE, rise, w) => {
    const L = Math.hypot(w / 2, rise), a = Math.atan2(rise, w / 2);
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(L + 0.3, 0.3, 0.7); g.rotateZ(sg * -a); g.translate(w / 2 + sg * w / 4, yE + rise / 2 + 0.3, -0.25); K.addRun(R, T, g); }
    K.rbox(R, T, w / 2 - 0.25, yE + rise + 0.1, -0.6, w / 2 + 0.25, yE + rise + 0.75, 0.05);
  };
  rakeCope(K.run([A.u0, A.v1], [A.u0, A.v0]).constructor ? K.run([A.u0, A.v0], [A.u0, A.v1]) : null, A.eave, A.ridge - A.eave, A.v1 - A.v0);
  rakeCope(K.run([A.u1, A.v1], [A.u1, A.v0]), A.eave, A.ridge - A.eave, A.v1 - A.v0);
  rakeCope(K.run([Bs.u0, Bs.v1], [Bs.u1, Bs.v1]), Bs.eave, Bs.ridge - Bs.eave, Bs.u1 - Bs.u0);
  rakeCope(K.run([P.u0, P.v1], [P.u1, P.v1]), P.eave, P.ridge - P.eave, P.u1 - P.u0);
  rakeCope(K.run([P0.u0, P0.v1], [P0.u1, P0.v1]), P0.eave, P0.ridge - P0.eave, P0.u1 - P0.u0);
  rakeCope(K.run([Aw.u0, Aw.v0], [Aw.u0, Aw.v1]), Aw.eave, Aw.ridge - Aw.eave, Aw.v1 - Aw.v0);

  // ---------- coped wall gables breaking the eaves ----------
  {
    const RS = K.run([A.u0, A.v1], [A.u1, A.v1]); // main range, court (south) face
    for (const [u, w, r] of [[4.2, 6.6, 5.8], [13.2, 5.6, 5.0], [21.4, 6.6, 5.8]]) crossGable(K, RS, u - A.u0, w, A.eave, r, 5.0, RT, W, T, { proud: 0.05 });
    const RN = K.run([A.u1, A.v0], [A.u0, A.v0]);
    for (const u of [20.0, 5.0]) crossGable(K, RN, A.u1 - u, 5.6, A.eave, 5.0, 4.5, RT, W, T, { proud: 0.05 });
    const RE = K.run([Bw.u1, Bw.v1], [Bw.u1, Bw.v0]); // cross range, court (east) face
    for (const [v, w, r] of [[7.5, 5.8, 4.8], [18.5, 5.8, 4.8]]) crossGable(K, RE, Bw.v1 - v, w, Bw.eave, r, 4.0, RT, W, T, { proud: 0.05 });
    const RW = K.run([Bw.u0, Bw.v0], [Bw.u0, Bw.v1]);
    for (const v of [5.0, 17.0]) crossGable(K, RW, v - Bw.v0, 5.0, Bw.eave, 4.4, 4.0, RT, W, T, { proud: 0.05 });
  }

  // ---------- battlemented entrance tower + stair turret at the inside corner ----------
  {
    const u0 = -7.4, u1 = -1.0, v0 = -3.2, v1 = 2.2, yTop = 30.4;
    const yG = K.gMin(u0, v0, u1, v1) - 1.2; const g0 = K.g((u0 + u1) / 2, v1);
    K.box(M.concreteDark, u0 + 0.5, yG, v0 + 0.5, u1 - 0.5, yTop - 0.1, v1 - 0.5);
    const faces = [[[u0, v1], [u1, v1]], [[u1, v1], [u1, v0]], [[u1, v0], [u0, v0]], [[u0, v0], [u0, v1]]];
    faces.forEach(([a, b], fi) => {
      const R = K.run(a, b); const L = R.L, c = L / 2;
      const ops = [];
      for (let y = g0 + 7.4; y < yTop - 2.6; y += 3.25) ops.push({ s0: c - 0.95, s1: c - 0.1, y0: y, y1: y + 1.7 }, { s0: c + 0.1, s1: c + 0.95, y0: y, y1: y + 1.7 });
      if (fi === 0) ops.push({ s0: c - 1.3, s1: c + 1.3, y0: g0, y1: g0 + 4.0, arch: 'gothic', rise: 1.1, doorTop: g0 + 2.8, sill: false });
      if (fi === 1) ops.push({ s0: c - 1.2, s1: c + 1.2, y0: g0, y1: g0 + 3.8, arch: 'gothic', rise: 1.0, doorTop: g0 + 2.7, sill: false });
      K.wall(R, W, 0, L, yG, yTop, ops, 0.5);
      for (const o of ops) { if (o.arch) K.fill(R, o, { kind: 'door', rev: 0.45, door: M.woodDark, frame: T }); else { K.fill(R, o, { frame: B.frameDark, mull: 0, muntins: 3, rev: 0.4 }); K.rbox(R, T, o.s0 - 0.12, o.y1 + 0.05, 0, o.s1 + 0.12, o.y1 + 0.2, 0.1); } }
      K.rbox(R, T, -0.1, yTop - 0.6, 0, L + 0.1, yTop - 0.35, 0.18); // corbel course
      battlement(K, R, T, -0.15, L + 0.15, yTop - 0.35, 0.75, 0.75, 0.75, 1.15, -0.45, 0.12);
      if (fi === 0) { const p = R.at(c, 0.3); K.box(T, p[0] - 1.6, g0 + 3.9, p[1] - 0.05, p[0] + 1.6, g0 + 4.1, p[1] + 0.15); }
    });
    K.box(M.concreteDark, u0 + 0.3, yTop - 0.4, v0 + 0.3, u1 - 0.3, yTop - 0.3, v1 - 0.3);
    // flagpole
    // stair turret on the tower's south-west corner
    const t0 = -4.6, t1 = -2.0, s0 = -2.6, s1 = 0.0, tTop = 35.6;
    K.box(W, t0, yTop - 1.0, s0, t1, tTop, s1);
    for (const [a, b] of [[[t0, s1], [t1, s1]], [[t1, s1], [t1, s0]]]) { const R = K.run(a, b); for (let y = yTop + 0.8; y < tTop - 1.5; y += 2.6) { const o = { s0: R.L / 2 - 0.25, s1: R.L / 2 + 0.25, y0: y, y1: y + 1.3, sill: false }; K.rbox(R, M.windowNight, o.s0, o.y0, 0.0, o.s1, o.y1, 0.02); K.rbox(R, T, o.s0 - 0.1, o.y1, 0, o.s1 + 0.1, o.y1 + 0.15, 0.08); } battlement(K, R, T, -0.1, R.L + 0.1, tTop, 0.55, 0.6, 0.55, 0.9, -0.35, 0.1); }
    for (const [a, b] of [[[t0, s0], [t0, s1]], [[t1, s0], [t0, s0]]]) { const R = K.run(a, b); battlement(K, R, T, -0.1, R.L + 0.1, tTop, 0.55, 0.6, 0.55, 0.9, -0.35, 0.1); }
    K.cyl(M.whitePaint, (t0 + t1) / 2, tTop + 0.2, (s0 + s1) / 2, 0.07, 0.045, 6.0, 8, { detail: true });
    col(u0, v0, u1, v1, 37);
    // entrance steps down to the lawn
    const gl = K.g((u0 + u1) / 2, v1 + 5);
    if (g0 - gl > 0.3) walkables.push(steps(K, T, u0 + 0.6, v1, u1 - 0.6, v1 + Math.max(1.5, (g0 - gl) / 0.16 * 0.32), gl, g0, '-v'));
  }

  // ---------- two-storey oriel on the main range court face ----------
  {
    const R = K.run([A.u0, A.v1], [A.u1, A.v1]); const s = 19.5 - A.u0, w = 3.4, p = 1.1;
    const g = K.g(19.5, A.v1); const y0 = g + 4.2, y1 = g + 10.6;
    K.rbox(R, W, s - w / 2, y0, 0, s + w / 2, y1, p);
    for (let k = 0; k < 4; k++) K.rbox(R, T, s - w / 2 + 0.3 + k * 0.25, y0 - 0.9 + k * 0.22, 0, s + w / 2 - 0.3 - k * 0.25, y0 - 0.68 + k * 0.22, p * (0.3 + 0.2 * k)); // corbelling
    for (const yy of [y0 + 0.7, y0 + 3.9]) { K.rbox(R, M.windowNight, s - w / 2 + 0.3, yy, p, s + w / 2 - 0.3, yy + 2.1, p + 0.02); for (let k = 1; k < 4; k++) K.rbox(R, B.frameDark, s - w / 2 + 0.3 + (w - 0.6) * k / 4 - 0.04, yy, p + 0.02, s - w / 2 + 0.3 + (w - 0.6) * k / 4 + 0.04, yy + 2.1, p + 0.06, { detail: true }); K.rbox(R, T, s - w / 2 + 0.2, yy - 0.15, p, s + w / 2 - 0.2, yy, p + 0.1); }
    K.rbox(R, W, s - w / 2 - 0.1, y1, -0.2, s + w / 2 + 0.1, y1 + 0.3, p + 0.1);
    battlement(K, R, T, s - w / 2 - 0.1, s + w / 2 + 0.1, y1 + 0.3, 0.4, 0.45, 0.45, 0.85, p - 0.25, p + 0.1);
  }

  // ---------- tall chimney stacks with twin flues ----------
  for (const [u, v, y0, y1] of [[-13.2, -7.0, 21.0, 30.6], [27.5, -7.0, 21.0, 30.6], [11.4, -21.8, 14.0, 24.0], [-9.5, 24.0, 17.0, 23.4]]) {
    K.box(W, u - 0.8, y0, v - 0.55, u + 0.8, y1, v + 0.55);
    K.box(T, u - 0.92, y1 - 0.6, v - 0.67, u + 0.92, y1 - 0.4, v + 0.67);
    for (const du of [-0.4, 0.4]) K.cyl(T, u + du, y1, v, 0.24, 0.22, 0.9, 8);
  }

  const object3d = K.finish();
  object3d.name = 'bowles-hall';
  return { object3d, colliders, walkables };
}
