// Bowles Hall (George W. Kelham, 1928–29), the first residence hall on the Berkeley campus and California's first
// state-owned dormitory. Collegiate Gothic in board-formed concrete scored to imitate ashlar (warm light grey-beige):
// steep variegated clay-tile roofs with coped parapet gables, grouped stone-mullioned casements under hood moulds, a
// ground-floor arcade of four-centred arches with a two-storey canted oriel above it, tall twin-flued chimney stacks, and a
// battlemented entrance tower with a stair turret at the inside corner of the court, above a lawn that falls toward Gayley Road.
// Massing follows the 2021 LiDAR (frame rotated 23.5°): main range eaves ~21 m / ridge ~27.5 m, the west cross range
// ~16/21.8 m, a projecting gabled pavilion at the east end, and the tower to ~31 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { crossGable, battlement } from './lib/b08c-kit.js';
import { rmats, gothRange, mullGroup, rakeCope } from './lib/reastb-kit.js';

export const info = {
  id: 'bowles-hall',
  name: 'Bowles Hall',
  subtitle: 'George W. Kelham · 1929',
  blurb: 'Dedicated in 1929 with a gift from Mary McNear Bowles in memory of her husband, Regent Phillip E. Bowles, this castle-like Collegiate Gothic hall on the hill above Memorial Stadium was the first residence hall on campus.',
  replaces: ['w/24025052', 'way/24025052'],
};

export async function build(ctx) {
  const M = ctx.M; const B = rmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(23.5));
  const colliders = [], walkables = [];
  const W = B.bowWall, T = B.bowTrim, RT = B.clayTile, SA = B.bowSash; // stone-coloured sash: reads as stone-mullioned lights
  const col = (u0, v0, u1, v1, y1) => colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, y1));
  const common = { mat: W, trim: T, roofMat: RT, sash: SA, fh: 3.05, bay: 3.4, overhang: 0.14, lightW: 0.58, winH: 1.8, topH: 1.5,
    lights: (i, k, f) => (k === 0 ? 3 : (i % 2 === 0 ? 3 : 2)) };

  // ---------- ranges ----------
  const A = { u0: -15.0, u1: 36.5, v0: -12.6, v1: -1.0, eave: 20.6, ridge: 27.6, axis: 'u' };
  const Bw = { u0: -14.2, u1: -3.6, v0: -1.0, v1: 26.5, eave: 16.0, ridge: 21.8, axis: 'v', faces: { N: false } };
  const Bs = { u0: -14.2, u1: -3.7, v0: 26.5, v1: 33.5, eave: 13.8, ridge: 17.8, axis: 'v', faces: { N: false } };
  const Aw = { u0: -36.5, u1: -15.0, v0: -15.3, v1: 1.7, eave: 12.6, ridge: 16.4, axis: 'u', faces: { E: false } };
  const P0 = { u0: 26.2, u1: 38.8, v0: -1.0, v1: 6.0, eave: 19.2, ridge: 24.8, axis: 'v', faces: { N: false, S: false } };
  const P = { u0: 26.2, u1: 38.8, v0: 6.0, v1: 13.1, eave: 15.6, ridge: 20.6, axis: 'v', faces: { N: false } };

  // arcade of four-centred arches on the main range's court face, centred under the middle gable
  const AC = 13.2, AP = 3.65, AW = 3.0, AH = 3.95, LD = 2.8; // centre u, pitch, arch width, height, loggia depth
  const arcS = (i) => AC - A.u0 + (i - 1.5) * AP;
  let base = 0;
  const GW = [[3.8, 6.8], [AC, 6.6], [22.6, 6.8]]; // court-face wall gables (u centre, width)
  const rA = gothRange(K, { ...common, ...A, core: false, corniceGaps: { S: GW.map(([u, w]) => [u - A.u0 - w / 2, u - A.u0 + w / 2]) },
    ops: (f, R, k, ly) => (f === 'S' && k === 0 ? [0, 1, 2, 3].map((i) => ({ s0: arcS(i) - AW / 2, s1: arcS(i) + AW / 2, y0: ly - 0.05, y1: ly + AH, arch: 'gothic', rise: 1.45 })) : null),
    skip: (f, s, k) => f === 'S' && k <= 2 && Math.abs(s - (AC - A.u0)) < 2.2 && k >= 1, // oriel bays
  });
  base = rA.base;
  for (const b of [Bw, Bs, Aw, P0, P]) gothRange(K, { ...common, ...b });
  for (const b of [A, Bw, Bs, Aw, P0, P]) col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5);
  // main-range core, cut back behind the loggia
  {
    const lu0 = AC - 2 * AP + 0.1, lu1 = AC + 2 * AP - 0.1, yc = rA.y0, ye = A.eave - 0.2, ct = base + AH + 0.45;
    K.box(M.concreteDark, A.u0 + 0.6, yc, A.v0 + 0.6, A.u1 - 0.6, ye, A.v1 - LD - 0.1);
    K.box(M.concreteDark, A.u0 + 0.6, yc, A.v1 - LD - 0.1, lu0, ye, A.v1 - 0.6);
    K.box(M.concreteDark, lu1, yc, A.v1 - LD - 0.1, A.u1 - 0.6, ye, A.v1 - 0.6);
    K.box(M.concreteDark, lu0, ct, A.v1 - LD - 0.1, lu1, ye, A.v1 - 0.6);
    // loggia: dark back wall with three entrance doors, paved floor, ceiling
    const RB = K.run([lu0, A.v1 - LD], [lu1, A.v1 - LD]);
    const doors = [-1, 0, 1].map((j) => ({ s0: RB.L / 2 + j * AP - 0.8, s1: RB.L / 2 + j * AP + 0.8, y0: base, y1: base + 2.9, doorTop: base + 2.25, sill: false }));
    K.wall(RB, B.loggia, 0, RB.L, base - 0.2, ct, doors, 0.3);
    for (const o of doors) K.fill(RB, o, { kind: 'door', rev: 0.2, door: M.woodDark, frame: T });
    K.box(M.paving, lu0, base - 0.6, A.v1 - LD, lu1, base - 0.02, A.v1 - 0.3);
    K.box(B.loggia, lu0, ct - 0.45, A.v1 - LD, lu1, ct, A.v1 - 0.4);
    for (let i = 0; i < 4; i++) { // chamfered stone surrounds on the arches (jambs + label)
      const R = rA.runs.S; const s = arcS(i);
      K.rbox(R, T, s - AW / 2 - 0.3, base - 0.05, 0, s - AW / 2, base + AH - 1.45, 0.08);
      K.rbox(R, T, s + AW / 2, base - 0.05, 0, s + AW / 2 + 0.3, base + AH - 1.45, 0.08);
    }
    K.rbox(rA.runs.S, T, arcS(0) - AW / 2 - 0.4, base + AH + 0.12, 0, arcS(3) + AW / 2 + 0.4, base + AH + 0.32, 0.14);
    walkables.push(K.walkPoly([[lu0, A.v1 - LD], [lu1, A.v1 - LD], [lu1, A.v1], [lu0, A.v1]], base - 0.02));
  }

  // ---------- parapet gable copings on the exposed range ends ----------
  rakeCope(K, K.run([A.u0, A.v0], [A.u0, A.v1]), T, A.eave, A.ridge - A.eave, A.v1 - A.v0, { lift: 0.45, wallMat: W });
  rakeCope(K, K.run([A.u1, A.v1], [A.u1, A.v0]), T, A.eave, A.ridge - A.eave, A.v1 - A.v0, { lift: 0.45, wallMat: W });
  rakeCope(K, K.run([Bs.u0, Bs.v1], [Bs.u1, Bs.v1]), T, Bs.eave, Bs.ridge - Bs.eave, Bs.u1 - Bs.u0, { lift: 0.45, wallMat: W });
  rakeCope(K, K.run([P.u0, P.v1], [P.u1, P.v1]), T, P.eave, P.ridge - P.eave, P.u1 - P.u0, { lift: 0.45, wallMat: W });
  rakeCope(K, K.run([P0.u0, P0.v1], [P0.u1, P0.v1]), T, P0.eave, P0.ridge - P0.eave, P0.u1 - P0.u0, { kneel: false, lift: 0.45, wallMat: W });
  rakeCope(K, K.run([Aw.u0, Aw.v0], [Aw.u0, Aw.v1]), T, Aw.eave, Aw.ridge - Aw.eave, Aw.v1 - Aw.v0, { lift: 0.45, wallMat: W });
  // attic lights in the big gable ends facing the court and the lawn
  for (const [a, b, yE, rise] of [[[P.u0, P.v1], [P.u1, P.v1], P.eave, P.ridge - P.eave], [[Bs.u0, Bs.v1], [Bs.u1, Bs.v1], Bs.eave, Bs.ridge - Bs.eave]]) {
    const R = K.run(a, b); const c = R.L / 2; const o = { s0: c - 0.75, s1: c + 0.75, y0: yE + 0.5, y1: yE + Math.min(2.2, rise * 0.5) };
    K.fill(R, o, { rev: -0.04, frame: SA, mull: 1, muntins: 1 });
    K.rbox(R, T, o.s0 - 0.2, o.y1 + 0.05, 0, o.s1 + 0.2, o.y1 + 0.22, 0.12);
  }

  // ---------- coped wall gables breaking the eaves, small gabled dormers between ----------
  {
    const RS = K.run([A.u0, A.v1], [A.u1, A.v1]); // main range, court face
    for (const [u, w] of GW) crossGable(K, RS, u - A.u0, w, A.eave, w * 0.72, 5.5, RT, W, T, { proud: 0.12, frame: SA });
    for (const u of [8.5, 17.9]) crossGable(K, RS, u - A.u0, 2.8, A.eave + 0.1, 2.3, 3.0, RT, W, T, { proud: -0.2, frame: SA });
    const RN = K.run([A.u1, A.v0], [A.u0, A.v0]);
    for (const u of [20.0, 5.0]) crossGable(K, RN, A.u1 - u, 5.6, A.eave, 5.0, 4.5, RT, W, T, { proud: 0.08, frame: SA });
    const RW = K.run([Bw.u0, Bw.v0], [Bw.u0, Bw.v1]);
    for (const v of [5.0, 17.0]) crossGable(K, RW, v - Bw.v0, 5.0, Bw.eave, 4.4, 4.0, RT, W, T, { proud: 0.08, frame: SA });
  }

  // ---------- two-storey canted oriel over the arcade (under the middle gable) ----------
  {
    const v1 = A.v1, c = AC, y0 = base + AH + 0.6, y1 = y0 + 6.1, wb = 2.15, wf = 1.2, p = 1.45;
    const poly = [[c - wb, v1], [c + wb, v1], [c + wf, v1 + p], [c - wf, v1 + p]];
    K.prism(W, poly, y0, y1);
    for (let k = 0; k < 4; k++) { const e = 0.22 * k; K.prism(T, [[c - wb + e * 1.2, v1], [c + wb - e * 1.2, v1], [c + wf - e, v1 + p - e * 1.1], [c - wf + e, v1 + p - e * 1.1]], y0 - 0.25 * (k + 1), y0 - 0.25 * k); }
    K.prism(T, [[c - wb - 0.12, v1], [c + wb + 0.12, v1], [c + wf + 0.1, v1 + p + 0.14], [c - wf - 0.1, v1 + p + 0.14]], y1, y1 + 0.28);
    const faces = [[[c - wb, v1], [c - wf, v1 + p]], [[c - wf, v1 + p], [c + wf, v1 + p]], [[c + wf, v1 + p], [c + wb, v1]]];
    for (const [a, b] of faces) {
      const R = K.run(a, b, 0.0); const L = R.L; const n = L > 2 ? 3 : 1;
      for (const yy of [y0 + 0.55, y0 + 3.6]) {
        const lw = (L - 0.5 - (n - 1) * 0.14) / n;
        for (let i = 0; i < n; i++) { const s0 = 0.25 + i * (lw + 0.14); K.fill(R, { s0, s1: s0 + lw, y0: yy, y1: yy + 2.0, sill: false, muntins: 2, fw: 0.05 }, { rev: -0.03, frame: SA, mull: 0, tran: [yy + 1.45] }); }
        K.rbox(R, T, 0.1, yy - 0.14, 0, L - 0.1, yy + 0.0, 0.08);
      }
      battlement(K, R, T, -0.05, L + 0.05, y1 + 0.28, 0.35, 0.4, 0.4, 0.85, -0.25, 0.08);
    }
  }

  // ---------- battlemented entrance tower + stair turret at the inside corner ----------
  {
    const u0 = -8.5, u1 = -0.3, v0 = -4.1, v1 = 3.3, yTop = 30.6;
    const yG = K.gMin(u0, v0, u1, v1) - 1.2; const g0 = K.g((u0 + u1) / 2, v1 + 0.5) + 0.15;
    K.box(M.concreteDark, u0 + 0.5, yG, v0 + 0.5, u1 - 0.5, yTop - 0.1, v1 - 0.5);
    const faces = [[[u0, v1], [u1, v1]], [[u1, v1], [u1, v0]], [[u1, v0], [u0, v0]], [[u0, v0], [u0, v1]]];
    faces.forEach(([a, b], fi) => {
      const R = K.run(a, b, 0.02); const L = R.L, c = L / 2;
      const ops = [];
      for (let y = g0 + 7.0; y < yTop - 2.6; y += 6.1) ops.push({ s0: c - 1.1, s1: c + 1.1, y0: y, y1: y + 1.8, grp: true });
      if (fi === 0) ops.push({ s0: c - 1.45, s1: c + 1.45, y0: g0, y1: g0 + 4.5, arch: 'gothic', rise: 1.5, doorTop: g0 + 3.0, sill: false });
      if (fi === 1) ops.push({ s0: c - 1.2, s1: c + 1.2, y0: g0, y1: g0 + 3.9, arch: 'gothic', rise: 1.0, doorTop: g0 + 2.75, sill: false });
      K.wall(R, W, 0, L, yG, yTop, ops, 0.5);
      for (const o of ops) { if (o.arch) { K.fill(R, o, { kind: 'door', rev: 0.45, door: M.woodDark, frame: T }); K.rbox(R, T, o.s0 - 0.35, o.y1 + 0.05, 0, o.s1 + 0.35, o.y1 + 0.25, 0.15); } else mullGroup(K, R, o, { n: 3, stone: T, sash: SA, depth: 0.5, panes: 1, tranAt: o.y0 + 1.25 }); }
      K.rbox(R, T, -0.1, yTop - 0.6, 0, L + 0.1, yTop - 0.35, 0.18); // corbel course
      battlement(K, R, T, -0.15, L + 0.15, yTop - 0.35, 0.75, 0.75, 0.8, 1.25, -0.45, 0.12);
      K.rbox(R, T, -0.1, g0 + 6.3, 0, L + 0.1, g0 + 6.5, 0.1);
    });
    K.box(M.concreteDark, u0 + 0.3, yTop - 0.4, v0 + 0.3, u1 - 0.3, yTop - 0.3, v1 - 0.3);
    // stair turret rising on the tower's court-side corner
    const t0 = -3.1, t1 = -0.3, s0 = 0.5, s1 = 3.3, tTop = 32.3;
    K.box(W, t0, yTop - 1.0, s0, t1, tTop, s1);
    for (const [a, b] of [[[t0, s1], [t1, s1]], [[t1, s1], [t1, s0]], [[t1, s0], [t0, s0]], [[t0, s0], [t0, s1]]]) {
      const R = K.run(a, b); const o = { s0: R.L / 2 - 0.25, s1: R.L / 2 + 0.25, y0: yTop + 0.3, y1: yTop + 1.5, sill: false };
      K.fill(R, o, { rev: -0.03, frame: SA, mull: 0, muntins: 2 });
      battlement(K, R, T, -0.1, R.L + 0.1, tTop, 0.55, 0.6, 0.55, 0.9, -0.35, 0.1);
    }
    K.cyl(M.whitePaint, (u0 + t0) / 2, yTop - 0.3, (v0 + v1) / 2, 0.08, 0.05, 7.5, 8, { detail: true });
    col(u0, v0, u1, v1, 34);
    // entrance steps down to the court
    const gl = K.g((u0 + u1) / 2, v1 + 4);
    if (g0 - gl > 0.25) { const n = Math.max(2, Math.round((g0 - gl) / 0.16)); walkables.push(K.stairs(T, u0 + 1.2, v1, u1 - 1.2, v1 + n * 0.32, gl, g0, '-v', n)); }
  }

  // ---------- terrace along the arcade, steps down to the court lawn, lamp standards ----------
  {
    const t0 = Bw.u1 + 0.2, t1 = P.u0 - 0.2, tv0 = A.v1, tv1 = A.v1 + 3.4, yT = base - 0.04;
    K.box(M.paving, t0, yT - 1.4, tv0, t1, yT, tv1);
    K.box(T, t0, yT - 1.4, tv1 - 0.05, t1, yT + 0.02, tv1 + 0.25);
    walkables.push(K.walkPoly([[t0, tv0], [t1, tv0], [t1, tv1 + 0.25], [t0, tv1 + 0.25]], yT));
    const gl = K.g(AC, tv1 + 2.2);
    if (yT - gl > 0.2) { const n = Math.max(2, Math.round((yT - gl) / 0.16)); walkables.push(K.stairs(T, AC - 2.2, tv1 + 0.25, AC + 2.2, tv1 + 0.25 + n * 0.34, gl, yT, '-v', n)); }
    for (const u of [AC - 3.0, AC + 3.0]) {
      K.cyl(M.iron, u, yT, tv1 - 0.1, 0.08, 0.06, 3.3, 8, { detail: true });
      K.box(M.iron, u - 0.2, yT + 3.3, tv1 - 0.3, u + 0.2, yT + 3.85, tv1 + 0.1, { detail: true });
      K.box(M.lampGlow, u - 0.15, yT + 3.36, tv1 - 0.25, u + 0.15, yT + 3.78, tv1 + 0.05, { detail: true });
    }
  }

  // ---------- low west annex and the rear service block (flat roofs behind parapets) ----------
  for (const b of [{ u0: -18.8, u1: -14.2, v0: 26.5, v1: 31.2, eave: 11.2, faces: { E: false } }, { u0: 4.7, u1: 12.8, v0: -23.2, v1: -12.6, eave: 14.6, faces: { S: false } }]) {
    const r = gothRange(K, { ...common, ...b, ridge: 0 });
    K.box(B.bowShade, b.u0 + 0.2, b.eave - 0.3, b.v0 + 0.2, b.u1 - 0.2, b.eave - 0.05, b.v1 - 0.2);
    for (const R of Object.values(r.runs)) K.rbox(R, T, -0.1, b.eave, -0.4, R.L + 0.1, b.eave + 0.75, 0.05);
    col(b.u0, b.v0, b.u1, b.v1, b.eave + 1);
  }

  // ---------- tall chimney stacks with twin flues ----------
  for (const [u, v, y0, y1] of [[-13.2, -7.0, 21.0, 30.4], [27.5, -7.0, 21.0, 30.4], [11.4, -21.8, 14.0, 23.6], [-9.5, 24.0, 17.0, 23.4]]) {
    K.box(W, u - 0.8, y0, v - 0.55, u + 0.8, y1, v + 0.55);
    K.box(T, u - 0.92, y1 - 0.6, v - 0.67, u + 0.92, y1 - 0.4, v + 0.67);
    K.box(T, u - 0.9, y1, v - 0.65, u + 0.9, y1 + 0.18, v + 0.65);
    for (const du of [-0.4, 0.4]) K.cyl(B.bowShade, u + du, y1 + 0.18, v, 0.23, 0.2, 0.9, 8);
  }

  const object3d = K.finish();
  object3d.name = 'bowles-hall';
  return { object3d, colliders, walkables };
}
