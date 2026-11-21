// Hertz Hall (Gardner Dailey, 1958), the music department's concert hall. Bay Region Modern: one tall auditorium box under
// a very wide, low-pitched gable with deep bracketed eaves; the tan, vertically battened south gable wall carries a tall
// white-gridded central window flanked by two slender slit windows, over a dark recessed entrance loggia on square piers.
// Single-storey lobby and practice wings wrap the west side; a low curved seat wall frames the forecourt.
// Massing follows the 2021 LiDAR (frame -9°): eaves ~11 m, ridge ~15 m running north-south, wings 4.5–6 m.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, polysGeo, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'hertz-hall',
  name: 'Hertz Hall',
  subtitle: 'Gardner Dailey · 1958',
  blurb: 'The Department of Music\'s concert hall, named for benefactor Alfred Hertz, seats about 680 and hosts the University Symphony, chamber concerts and Cal Performances events.',
  replaces: ['w/24024671'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-9)); const M = ctx.M; const X = mats(M);
  const W = new THREE.MeshStandardMaterial({ color: 0xcfc2b3, roughness: 0.92, map: M.stucco.map, normalMap: M.stucco.normalMap });
  const BAT = new THREE.MeshStandardMaterial({ color: 0xd2c5b2, roughness: 0.9, map: M.stucco.map });
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x5e4b3c, roughness: 0.6, metalness: 0.3 });
  const SOFF = new THREE.MeshStandardMaterial({ color: 0x8a7560, roughness: 0.85 });
  const MUL = new THREE.MeshStandardMaterial({ color: 0xe3dccd, roughness: 0.5 });
  const GL = new THREE.MeshStandardMaterial({ color: 0x2c3540, roughness: 0.08, metalness: 0.35 });
  const DOOR = new THREE.MeshStandardMaterial({ color: 0x2f2a26, roughness: 0.45, metalness: 0.6 });
  const colliders = [], walkables = [];
  const u0 = -10.6, u1 = 20.2, v0 = -24.0, v1 = 26.6, EAVE = 11.0, RISE = 4.0, um = (u0 + u1) / 2;
  const gm = K.gMin(u0, v0, u1, v1), base = gm - 1.2, gS = K.g(um, v1 + 2);
  const battens = (R, s0, s1, y0, y1, step = 0.6, skip = []) => { for (let s = s0 + step / 2; s < s1; s += step) { if (skip.some(([a, b]) => s > a && s < b)) continue; K.rbox(R, BAT, s - 0.045, y0, 0, s + 0.045, y1, 0.06, { detail: true }); } };
  // ---------- side walls of the hall (east/west) with battens and a few tall windows ----------
  for (const [a, b] of [[[u1, v1], [u1, v0]], [[u0, v0], [u0, v1]]]) {
    const R = K.run(a, b); const ops = [0.2, 0.4, 0.6, 0.8].map((t) => ({ s0: R.L * t - 0.6, s1: R.L * t + 0.6, y0: 5.4, y1: 9.8, mull: 0, tran: [7.6], frame: MUL, noFill: false }));
    openWall(K, R, W, 0, R.L, base, EAVE, ops, { depth: 0.4, rev: 0.2, frame: MUL, sill: false });
    battens(R, 0, R.L, Math.max(gm, 4.6), EAVE, 0.6, ops.map((o) => [o.s0 - 0.05, o.s1 + 0.05]));
  }
  // north gable wall (plain, battened)
  { const R = K.run([u1, v0], [u0, v0]); K.wall(R, W, 0, R.L, base, EAVE, [], 0.4); const t = polysGeo([[[u1, EAVE, v0], [um, EAVE + RISE, v0], [u0, EAVE, v0]]]); K.add(W, t); battens(R, 0, R.L, gm, EAVE, 0.8); }
  // ---------- south gable façade ----------
  {
    const R = K.run([u0, v1], [u1, v1]); const c = R.L / 2;
    const big = { s0: c - 2.75, s1: c + 2.75, y0: 4.6, y1: 14.2 };
    const slits = [c - 4.25, c + 4.25].map((s) => ({ s0: s - 0.6, s1: s + 0.6, y0: 6.2, y1: 13.0 }));
    // wall + gable triangle as one shape with holes (loggia opening at the base handled by a recessed back wall)
    const sh = new THREE.Shape(); sh.moveTo(0, 4.4); sh.lineTo(R.L, 4.4); sh.lineTo(R.L, EAVE); sh.lineTo(c, EAVE + RISE); sh.lineTo(0, EAVE); sh.lineTo(0, 4.4);
    for (const o of [big, ...slits]) { const h = new THREE.Path(); h.moveTo(o.s0, o.y0); h.lineTo(o.s1, o.y0); h.lineTo(o.s1, o.y1); h.lineTo(o.s0, o.y1); h.lineTo(o.s0, o.y0); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }); g.translate(0, 0, -0.45); K.addRun(R, W, g);
    battens(R, 0.3, R.L - 0.3, 4.6, EAVE - 0.1, 0.45, [[big.s0 - 0.1, big.s1 + 0.1], ...slits.map((o) => [o.s0 - 0.1, o.s1 + 0.1])]);
    for (let s = 0.45; s < R.L; s += 0.45) { const ytop = EAVE + RISE * (1 - Math.abs(s - c) / c) - 0.25; if ((s > big.s0 - 0.1 && s < big.s1 + 0.1)) continue; if (ytop > EAVE) K.rbox(R, BAT, s - 0.045, EAVE - 0.1, 0, s + 0.045, ytop, 0.06, { detail: true }); }
    // gridded windows (heavy off-white mullions)
    for (const [o, cols, rows] of [[big, 4, 8], [slits[0], 1, 6], [slits[1], 1, 6]]) {
      K.rbox(R, GL, o.s0, o.y0, -0.3, o.s1, o.y1, -0.27);
      for (let i = 0; i <= cols; i++) { const s = o.s0 + (o.s1 - o.s0) * i / cols; K.rbox(R, MUL, s - 0.06, o.y0, -0.3, s + 0.06, o.y1, -0.12); }
      for (let j = 0; j <= rows; j++) { const y = o.y0 + (o.y1 - o.y0) * j / rows; K.rbox(R, MUL, o.s0, y - 0.06, -0.3, o.s1, y + 0.06, -0.12); }
      if (cols > 1) for (let i = 0; i <= 2; i++) K.rbox(R, M.iron, o.s0, o.y0 + 0.1 + i * 0.45, 0.0, o.s1, o.y0 + 0.14 + i * 0.45, 0.6, { detail: true });
    }
    if (true) { K.rbox(R, M.iron, big.s0 - 0.2, big.y0, 0, big.s0 - 0.15, big.y0 + 1.0, 0.6, { detail: true }); K.rbox(R, M.iron, big.s1 + 0.15, big.y0, 0, big.s1 + 0.2, big.y0 + 1.0, 0.6, { detail: true }); K.rbox(R, W, big.s0 - 0.3, big.y0 - 0.25, 0, big.s1 + 0.3, big.y0, 0.65); }
    // recessed entrance loggia: square piers, bronze glazed doors in three bays
    const LD = 2.0; K.rbox(R, W, -0.1, 4.0, -LD - 0.3, R.L + 0.1, 4.6, 0.05);
    const piers = [c - 7.4, c - 2.75, c + 2.75, c + 7.4];
    for (const s of piers) K.rbox(R, W, s - 0.45, base, -LD, s + 0.45, 4.0, 0.05);
    for (const [a, b] of [[0, c - 7.85], [c + 7.85, R.L]]) { openWall(K, K.run(R.at(a, 0), R.at(b, 0)), W, 0, b - a, base, 4.4, [{ s0: (b - a) / 2 - 0.7, s1: (b - a) / 2 + 0.7, y0: gS + 1.2, y1: gS + 2.6, mull: 1, frame: MUL }], { depth: LD + 0.3, rev: 0.2, frame: MUL }); }
    K.rbox(R, W, 0, base, -LD - 0.4, R.L, 0.0 + gS, -LD);
    const bk = []; for (const [a, b] of [[c - 7.0, c - 3.0], [c - 2.5, c + 2.5], [c + 3.0, c + 7.0]]) bk.push({ s0: a, s1: b, y0: gS + 0.15, y1: 3.9, kind: 'door', doorTop: gS + 2.75, door: DOOR, frame: DOOR, sill: false, mull: 1 });
    const back = K.run(R.at(0, -LD), R.at(R.L, -LD));
    openWall(K, back, W, 0, R.L, base, 4.0, bk, { depth: 0.35, rev: 0.12, frame: DOOR, sill: false });
    K.rbox(R, M.paving, 0, gS - 0.3, -LD, R.L, gS + 0.15, 0);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1 - LD], [u0, v1 - LD]], base, EAVE + RISE));
    for (const s of piers) { const p = R.at(s, -0.4); colliders.push({ type: 'cyl', x: +p[0].toFixed(2), z: +p[1].toFixed(2), r: 0.5, y0: base, y1: 4.6 }); }
  }
  K.box(M.concreteDark, u0 + 0.45, base, v0 + 0.45, u1 - 0.45, EAVE, v1 - 2.4);
  // ---------- wide low gable roof with deep eaves and outrigger brackets ----------
  {
    const ov = 2.2, rake = 2.2;
    K.gable(ROOF, u0, v0 - rake + ov, u1, v1 + rake - ov, EAVE, RISE, 'v', { overhang: ov, thick: 0.35 });
    const s = ov * RISE / ((u1 - u0) / 2);
    for (const uu of [u0 - ov, u1 + ov]) K.box(ROOF, uu - 0.08, EAVE - s - 0.32, v0 - rake, uu + 0.08, EAVE - s + 0.02, v1 + rake);
    // soffit underside plane + outriggers along the rakes
    for (const vv of [v0 - rake, v1 + rake]) {
      for (let k = 0; k <= 11; k++) { const t = k / 11; const uu = u0 - ov + (u1 - u0 + 2 * ov) * t; const yy = EAVE - s + RISE * (1 - Math.abs(uu - um) / ((u1 - u0) / 2 + ov)) * ((u1 - u0) / 2 + ov) / ((u1 - u0) / 2) - 0.45; const d = vv < 0 ? 1 : -1; K.box(SOFF, uu - 0.14, yy - 0.45, Math.min(vv, vv + d * rake), uu + 0.14, yy, Math.max(vv, vv + d * rake)); }
    }
    for (let k = 0; k <= 18; k++) { const vv = v0 + (v1 - v0) * k / 18; for (const [ua, ub] of [[u0 - ov, u0], [u1, u1 + ov]]) K.box(SOFF, ua, EAVE - 0.55, vv - 0.1, ub, EAVE - 0.3, vv + 0.1, { detail: true }); }
  }
  // ---------- single-storey wings on the west ----------
  function low(a0, a1, b0, b1, top, wins = true) {
    const g = K.gMin(a0, b0, a1, b1);
    for (const [a, b] of [[[a0, b1], [a1, b1]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) {
      const R = K.run(a, b); const n = Math.max(1, Math.round(R.L / 4)); const ops = wins ? Array.from({ length: n }, (_, i) => ({ s0: R.L * (i + 0.5) / n - 0.9, s1: R.L * (i + 0.5) / n + 0.9, y0: g + 1.0, y1: g + 2.6, mull: 2, frame: MUL })) : [];
      openWall(K, R, W, 0, R.L, g - 1.0, top, ops, { depth: 0.35, rev: 0.18, frame: MUL });
      K.rbox(R, ROOF, -0.6, top - 0.05, 0, R.L + 0.6, top + 0.3, 0.6);
    }
    K.box(M.concreteDark, a0 + 0.35, g - 1.0, b0 + 0.35, a1 - 0.3, top, b1 - 0.35);
    K.box(ROOF, a0 - 0.6, top, b0 - 0.6, a1, top + 0.3, b1 + 0.6);
    colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], g - 1, top + 0.4));
  }
  low(-25.2, -10.6, -22.2, -6.7, 5.6);
  low(-18.8, -10.6, -6.7, 21.2, 4.6);
  // ---------- forecourt: curved low seat wall, paving, lamps ----------
  {
    const cx = um, cz = v1 + 2.0, Rr = 17.0; const n = 22; const a0 = Math.PI * 0.15, a1 = Math.PI * 0.85;
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n; const u = cx + Math.cos(a) * Rr * 1.05, v = cz + Math.sin(a) * Rr * 0.55; const g = K.g(u, v); K.obox(M.concrete, u, g + 0.2, v, (a1 - a0) * Rr / n + 0.05, 1.0, 0.6, -a + Math.PI / 2); }
    for (const sx of [-1, 1]) lamp(K, cx + sx * 10, K.g(cx + sx * 10, cz + 6), cz + 6, 4.0);
  }
  const object3d = K.finish();
  object3d.name = 'hertz-hall';
  return { object3d, colliders, walkables };
}
