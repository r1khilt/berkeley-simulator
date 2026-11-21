// Morrison Hall (Gardner Dailey, 1958), the Department of Music building, paired with Hertz Hall around the music plaza.
// A long two-storey block of warm salmon-tan face brick under a broad, low-pitched gable with a thin projecting dark fascia;
// largely blank brick planes, a high clerestory grid under each gable, bands of light-framed classroom windows along the
// long sides and dark-framed glazed storefront entrances at grade.
// Massing follows the 2021 LiDAR (frame -8.5°): eaves ~10.5 m, ridge ~14.5 m along the length (62 m × 26.5 m).
import * as THREE from 'three';
import { Kit, deg, mats, openWall, polysGeo, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'morrison-hall',
  name: 'Morrison Hall',
  subtitle: 'Gardner Dailey · 1958',
  blurb: 'Home of the Department of Music, Morrison Hall holds classrooms, practice rooms and offices beside Hertz Hall; it is named for May T. Morrison, whose bequest funded the music buildings.',
  replaces: ['w/24024670'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-8.5)); const M = ctx.M; const X = mats(M);
  const BR = new THREE.MeshStandardMaterial({ color: 0xc8957d, roughness: 0.9, normalMap: M.brick.normalMap });
  BR.normalScale = new THREE.Vector2(0.45, 0.45);
  const FAS = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.6, metalness: 0.2 });
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x6b6259, roughness: 0.85, map: M.concrete.map });
  const LF = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.5 });
  const DF = X.frameDark;
  const colliders = [];
  const u0 = -31.2, u1 = 30.5, v0 = -13.3, v1 = 13.2, EAVE = 10.4, RISE = 4.0;
  const gm = K.gMin(u0, v0, u1, v1), base = gm - 1.2;
  // long façades: upper band of classroom windows, ground floor windows + storefront entrances, brick piers
  for (const [a, b, ents] of [[[u0, v1], [u1, v1], [14, 44]], [[u1, v0], [u0, v0], [20]]]) {
    const R = K.run(a, b); let gs = Infinity; for (let k = 0; k <= 8; k++) { const p = R.at(R.L * k / 8, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const ops = []; const nb = 15; const bw = R.L / nb;
    for (let i = 0; i < nb; i++) {
      const c = bw * (i + 0.5);
      ops.push({ s0: c - bw / 2 + 0.5, s1: c + bw / 2 - 0.5, y0: 6.0, y1: 8.3, mull: 2, frame: LF, sillMat: LF });
      if (ents.some((e) => Math.abs(e - c) < bw / 2)) ops.push({ s0: c - 1.8, s1: c + 1.8, y0: gs + 0.15, y1: gs + 3.0, kind: 'door', doorTop: gs + 2.3, door: M.windowNight, frame: DF, sill: false });
      else if (i % 2 === 0) ops.push({ s0: c - 1.2, s1: c + 1.2, y0: gs + 1.1, y1: gs + 2.7, mull: 2, frame: LF, sillMat: LF });
    }
    openWall(K, R, BR, 0, R.L, base, EAVE, ops, { depth: 0.4, rev: 0.22, frame: LF });
    // concrete floor band + sunshade over the upper windows
    K.rbox(R, M.concrete, -0.05, 5.2, 0, R.L + 0.05, 5.6, 0.12);
    K.rbox(R, M.concrete, 0.3, 8.5, 0, R.L - 0.3, 8.65, 0.7);
    for (const e of ents) { const s = e; K.rbox(R, M.concrete, s - 2.6, gs + 3.1, 0, s + 2.6, gs + 3.3, 1.6); K.rbox(R, M.paving, s - 2.4, gs - 0.3, 0, s + 2.4, gs + 0.15, 1.8); }
  }
  // gable ends: blank brick, clerestory grid high under the gable, a glazed entrance below
  for (const [a, b] of [[[u1, v1], [u1, v0]], [[u0, v0], [u0, v1]]]) {
    const R = K.run(a, b); const c = R.L / 2; let gs = Infinity; for (let k = 0; k <= 4; k++) { const p = R.at(R.L * k / 4, 1); gs = Math.min(gs, ctx.groundAt(p[0], p[1])); }
    const cl = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const s0 = c - 3.3 + i * 1.1; cl.push({ s0, s1: s0 + 0.85, y0: EAVE - 0.6 + j * 1.1, y1: EAVE - 0.6 + j * 1.1 + 0.85 }); }
    const sh = new THREE.Shape(); sh.moveTo(0, base); sh.lineTo(R.L, base); sh.lineTo(R.L, EAVE); sh.lineTo(c, EAVE + RISE); sh.lineTo(0, EAVE); sh.lineTo(0, base);
    const ent = { s0: c + 2.5, s1: c + 6.5, y0: gs + 0.15, y1: gs + 3.9 };
    for (const o of [...cl, ent]) { const h = new THREE.Path(); h.moveTo(o.s0, o.y0); h.lineTo(o.s1, o.y0); h.lineTo(o.s1, o.y1); h.lineTo(o.s0, o.y1); h.lineTo(o.s0, o.y0); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }); g.translate(0, 0, -0.45); K.addRun(R, BR, g);
    for (const o of cl) { K.rbox(R, M.windowNight, o.s0, o.y0, -0.38, o.s1, o.y1, -0.35); K.rbox(R, LF, o.s0, o.y0, -0.36, o.s1, o.y0 + 0.05, -0.3, { detail: true }); }
    K.fill(R, { ...ent, kind: 'door', doorTop: ent.y0 + 2.6, door: M.windowNight, sill: false }, { rev: 0.4, frame: DF, kind: 'door' });
    for (let i = 1; i < 4; i++) K.rbox(R, DF, ent.s0 + i - 0.04, ent.y0, -0.4, ent.s0 + i + 0.04, ent.y1, -0.34);
  }
  K.box(M.concreteDark, u0 + 0.45, base, v0 + 0.45, u1 - 0.45, EAVE, v1 - 0.45);
  // low gable roof with thin projecting dark fascia
  K.gable(ROOF, u0 - 0.1, v0, u1 + 0.1, v1, EAVE, RISE, 'u', { overhang: 1.2, thick: 0.3 });
  const s = 1.2 * RISE / ((v1 - v0) / 2);
  for (const v of [v0 - 1.2, v1 + 1.2]) K.box(FAS, u0 - 1.3, EAVE - s - 0.45, v - 0.07, u1 + 1.3, EAVE - s + 0.03, v + 0.07);
  { const vm = (v0 + v1) / 2, run = (v1 - v0) / 2 + 1.2, hh = RISE + 1.2 * RISE / ((v1 - v0) / 2); const L = Math.hypot(run, hh), ang = Math.atan2(hh, run); const yc = EAVE - 1.2 * RISE / ((v1 - v0) / 2) + hh / 2 - 0.12;
    for (const u of [u0 - 1.3, u1 + 1.3]) for (const side of [-1, 1]) { const g = new THREE.BoxGeometry(0.14, 0.48, L); g.rotateX(side < 0 ? -ang : ang); g.translate(u, yc, vm + side * run / 2); K.add(FAS, g); } }
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], base, EAVE + RISE));
  for (const u of [-6, 18]) lamp(K, u, K.g(u, v1 + 4), v1 + 4, 3.8);
  const object3d = K.finish();
  object3d.name = 'morrison-hall';
  return { object3d, colliders };
}
