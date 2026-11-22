// Genevieve McEnerney Hall, 1750 Arch Street — home of CNMAT (Center for New Music and Audio Technologies).
// A Mediterranean / Spanish Colonial Revival villa: smooth white stucco, low red clay-tile hipped roofs, teal-painted
// round-arched French doors in an arcade-like row on the ground floor, small rectangular upper windows, a lower two-storey
// west wing and a one-storey link, behind a red-brick garden wall with stucco-capped gate piers. Massing from the LiDAR
// (main block eaves ≈9 m above its grade, i.e. ≈12 m above the low west datum; ridge ≈13.9 m).
// [r4-sweep-outer] ckWing reads packet.lidarTop: this comment makes manifest.mjs keep the LiDAR grid in the slim packet.
import * as THREE from 'three';
import { Kit, pal, facade } from './lib/b08a-kit.js';
import { ckWing } from './lib/b08a-mission.js';
import { rectRuns, finishGround } from './lib/rn-b-ground.js';

export const info = {
  id: 'mcenerney-hall',
  name: 'McEnerney Hall (CNMAT)',
  subtitle: '1750 Arch Street',
  blurb: "Genevieve McEnerney Hall houses UC Berkeley's Center for New Music and Audio Technologies (CNMAT) in a Mediterranean-style villa on Arch Street.",
  replaces: ['w/826209347'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.9)); const P0 = pal(ctx); const M = ctx.M;
  const P = { ...P0, stuccoWhite: (() => { const m = M.stuccoWhite.clone(); m.color = new THREE.Color(0xfff1dc); return m; })() };
  const teal = P.trimTeal;
  const A = ckWing(K, ctx, { mat: P.stuccoWhite, u0: -1.6, u1: 7.44, v0: -5.39, v1: 6.8, axis: 'v', roof: 'hip', storeys: 3, ground: 3.1, eave: 12.0, ridge: 13.9, frame: P.frameDark, door: teal, win: { w: 0.95, h: 1.35 },
    fascia: P.stuccoWhite, soffit: P.stuccoWhite, ov: 0.4,
    faces: { E: false, S: { nb: 3, french: true, up: [0, 2] }, N: { nb: 3, up: [1] }, W: { nb: 3, up: [0, 2] } }, chim: [[5.6, -3.8]], core: false });
  // east (Arch Street) front: a recessed loggia behind four tall round arches, teal entrance door at the left bay
  {
    const R = K.run([7.44, 6.8], [7.44, -5.39]); const L = R.L; const g0 = 3.1, y0 = -1.0, eave = 12.0;
    const aw = 1.3, pier = 0.38, n = 4, span = n * aw + (n - 1) * pier, sa = L / 2 - span / 2 + 0.4;
    const arches = []; for (let i = 0; i < n; i++) { const s0 = sa + i * (aw + pier); arches.push({ s0, s1: s0 + aw, y0: g0, y1: g0 + 2.75, arch: true }); }
    const ups = []; for (let i = 0; i < 4; i++) { const c = sa + aw / 2 + i * (aw + pier); ups.push({ s0: c - 0.42, s1: c + 0.42, y0: g0 + 4.1, y1: g0 + 5.25, mull: 1, muntins: 2 }); ups.push({ s0: c - 0.42, s1: c + 0.42, y0: g0 + 6.9, y1: g0 + 8.0, mull: 1, muntins: 2 }); }
    K.wall(R, P.stuccoWhite, 0, L, y0, eave, [...arches, ...ups], 0.34);
    for (const o of ups) K.fill(R, o, { rev: 0.24, frame: P.frameDark, mull: o.mull, tran: [] });
    for (const o of ups) K.rbox(R, P.stuccoWhite, o.s0 - 0.08, o.y0 - 0.1, -0.24, o.s1 + 0.08, o.y0, 0.06);
    const D = 1.7, l0 = sa - 0.3, l1 = sa + span + 0.3;
    K.rbox(R, P.stuccoWhite, l0, y0, -D - 0.3, l1, g0 + 3.1, -D);                         // loggia back wall
    K.rbox(R, P.stuccoWhite, l0, g0 + 2.95, -D, l1, g0 + 3.1, -0.34);                    // ceiling
    K.rbox(R, P.tileFloor, l0, y0, -D, l1, g0, -0.3);                                     // quarry-tile floor
    for (const s of [l0, l1]) K.rbox(R, P.stuccoWhite, s - 0.15, y0, -D, s + 0.15, g0 + 3.0, -0.34);
    // teal arched door + dark French doors on the back wall
    const bw = { s0: sa + 0.05, s1: sa + aw - 0.05, y0: g0, y1: g0 + 2.4 };
    K.rbox(R, teal, bw.s0, bw.y0, -D + 0.0, bw.s1, bw.y1, -D + 0.06);
    for (let i = 1; i < n; i++) { const s0 = sa + i * (aw + pier) + 0.08; K.rbox(R, M.windowNight, s0, g0, -D + 0.0, s0 + aw - 0.16, g0 + 2.3, -D + 0.03, { uvMode: 'keep' }); K.rbox(R, P.frameDark, s0 + (aw - 0.16) / 2 - 0.03, g0, -D + 0.03, s0 + (aw - 0.16) / 2 + 0.03, g0 + 2.3, -D + 0.07, { detail: true }); }
    // house core behind the loggia
    K.box(M.concreteDark, -1.6 + 0.42, y0, -5.39 + 0.42, 7.44 - D - 0.35, eave - 0.05, 6.8 - 0.42);
    K.box(M.concreteDark, 7.44 - D - 0.4, g0 + 3.1, -5.39 + 0.42, 7.44 - 0.4, eave - 0.05, 6.8 - 0.42);
    K.box(M.concreteDark, 7.44 - D - 0.4, y0, -5.39 + 0.42, 7.44 - 0.4, g0 + 3.0, sa + span / 2 - span / 2 - 0.5 > -5 ? -5.39 + 0.42 + (L - (l1)) - 0.2 : -4.5);
  }
  const B = ckWing(K, ctx, { mat: P.stuccoWhite, u0: -9.95, u1: -1.6, v0: -5.23, v1: -0.43, axis: 'u', roof: 'hip', storeys: 2, ground: 1.2, eave: 8.3, ridge: 9.7, frame: P.frameDark, door: teal, fascia: P.stuccoWhite, soffit: P.stuccoWhite, ov: 0.4,
    faces: { E: false, S: { nb: 3, french: true, up: [1] }, N: { nb: 3, up: [0, 2] }, W: { nb: 1 } } });
  const C = ckWing(K, ctx, { mat: P.stuccoWhite, u0: -5.56, u1: -1.6, v0: -0.43, v1: 4.4, roof: 'flat', storeys: 1, ground: 2.4, eave: 5.6, frame: P.frameDark, door: teal,
    faces: { E: false, N: false, S: { nb: 2, french: true }, W: { nb: 1 } } });
  // red-brick garden wall with stucco cap and gate piers along the east (Arch Street) side
  const g = (u, v) => K.g(u, v);
  const wallU = 10.8; const BR = M.brick.clone(); BR.color = new THREE.Color(0xe8c4b0);
  const gate = [0.3, 1.9];
  for (const [v0, v1] of [[gate[0] - 0.25 - 4.2, gate[0] - 0.25], [gate[1] + 0.25, gate[1] + 0.25 + 4.2]]) {
    const gm = Math.max(g(wallU, v0), g(wallU, v1), g(wallU, (v0 + v1) / 2));
    K.box(BR, wallU - 0.17, gm - 1.2, v0, wallU + 0.17, gm + 1.1, v1);
    K.box(P.trimCream, wallU - 0.24, gm + 1.1, v0 - 0.03, wallU + 0.24, gm + 1.2, v1 + 0.03);
  }
  for (const v of [gate[0] - 0.25, gate[1] + 0.25, gate[0] - 4.45, gate[1] + 4.45]) { const gm = g(wallU, v); K.box(BR, wallU - 0.25, gm - 1.2, v - 0.25, wallU + 0.25, gm + 1.4, v + 0.25); K.box(P.trimCream, wallU - 0.31, gm + 1.4, v - 0.31, wallU + 0.31, gm + 1.52, v + 0.31); }
  // red brick path from the gate to the loggia
  { const gm = Math.max(g(7.6, 1.1), g(wallU, 1.1)); K.box(BR, 7.44, gm - 0.6, gate[0], wallU + 0.4, Math.min(3.1, gm + 0.04), gate[1]); }
  const colliders = [K.colPoly([[-1.6, -5.39], [7.44, -5.39], [7.44, 6.8], [-1.6, 6.8]], -2, 14), K.colPoly([[-9.95, -5.23], [-1.6, -5.23], [-1.6, 4.4], [-5.56, 4.4], [-5.56, -0.43], [-9.95, -0.43]], -2, 10),
    K.colPoly([[wallU - 0.25, gate[0] - 4.5], [wallU + 0.25, gate[0] - 4.5], [wallU + 0.25, gate[0]], [wallU - 0.25, gate[0]]], -1, 6), K.colPoly([[wallU - 0.25, gate[1]], [wallU + 0.25, gate[1]], [wallU + 0.25, gate[1] + 4.5], [wallU - 0.25, gate[1] + 4.5]], -1, 6)];
  // foundation planting around the villa (clear of the loggia), bike racks inside the garden wall (rn-b-ground)
  const runs = rectRuns(K, [{ u0: -1.6, u1: 7.44, v0: -5.39, v1: 6.8, floor: 3.1 }, { u0: -9.95, u1: -1.6, v0: -5.23, v1: -0.43, floor: 1.2 }, { u0: -5.56, u1: -1.6, v0: -0.43, v1: 4.4, floor: 2.4 }]);
  const east = runs.find((r) => r.f === 'E' && r.b.u1 === 7.44); if (east) east.extraSkip = [[1.6, 10.8]];
  const Gd = finishGround(K, ctx, runs, { entries: [], props: east ? [{ run: east, s: 11.2, d: 1.6, n: 3 }] : [], plant: { h: 0.85, depth: 1.1 } });
  colliders.push(...Gd.colliders);
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: Gd.walkables };
}
