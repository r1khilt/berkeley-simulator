// Haviland Hall (John Galen Howard, 1924). Cream Beaux-Arts block on a raised basement: two main storeys under a deep
// dentilled cornice, an attic storey of small windows alternating with garland relief panels, low red-tile hip roofs.
// The west front is centred on a small Ionic portico (two fluted columns between responds) carrying an iron balcony,
// reached by a long brick stair. LiDAR: end wings ~15 m, central block eaves ~16.3 m, ridge ~21.5 m.
import * as THREE from 'three';
import { Kit, tint, solid, stoneBlock, hipPoly, rect, dentils, inscription, orient } from './lib/b02-kit.js';
import { ionicColumn, corniceProfile } from './lib/classic-kit.js';

export const info = {
  id: 'haviland-hall',
  name: 'Haviland Hall',
  subtitle: 'John Galen Howard · 1924',
  blurb: 'Built for the School of Education, this cream Beaux-Arts hall with its small Ionic portico and red tile roofs now houses the School of Social Welfare.',
  replaces: ['w/24025038', 'way/24025038'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-17.2)); const M = ctx.M;
  const ST = tint(M.stuccoWhite, 0xece6d6), ORN = tint(M.stucco, 0xd3ccbb), BASE = tint(M.granite, 0xcdc6b6), CU = tint(M.copper, 0x5f8f7e), FR = solid(0x2b2a26, 0.5, 0.3);
  const BRICK = tint(M.brick, 0xb0604c);
  const colliders = [], walkables = [];
  const FL = 2.0;
  const win = (k) => ({ w: 1.5, h: 2.6, sill: 0.8, mull: 1, muntins: 3 });
  const atticWin = { w: 1.0, h: 0.95, sill: 0.9, mull: 1, muntins: 1 };
  // one continuous block: raised basement, two storeys, dentilled cornice, attic with garland panels
  const P = rect(-11.0, -26.6, 11.0, 26.6); const EAVE = 16.0;
  const st = [{ y0: K.g(0, 0) - 1.5, y1: FL, mat: BASE, win: { w: 1.3, h: 0.8, sill: 0.5, mull: 1 } }, { y0: FL, y1: 6.2, mat: ST, win: win(0) }, { y0: 6.2, y1: 10.4, mat: ST, win: win(1) }, { y0: 10.4, y1: 11.3, mat: ST, win: null }, { y0: 11.3, y1: EAVE, mat: ST, win: { w: 1.05, h: 1.0, sill: 1.3, mull: 1, muntins: 1 } }];
  stoneBlock(K, { poly: P, FL, levels: [FL, 6.2, 10.4], eave: EAVE, mat: ST, baseMat: BASE, bay: 3.55, win, cornice: { P: 0.45, H: 0.55 },
    edge: (i, R) => ({ stories: st, skip: R.L > 40 ? [7] : [] }) });
  K.loop(ST, orient(P), corniceProfile(11.35, 0.85, 0.85)); dentils(K, P, ST, 10.55, { pitch: 0.32, size: 0.18, P: 0.22 });
  for (const [a, b] of [[[-11.0, -26.6], [-11.0, 26.6]], [[11.0, 26.6], [11.0, -26.6]], [[11.0, -26.6], [-11.0, -26.6]], [[-11.0, 26.6], [11.0, 26.6]]]) { const R = K.run(a, b); const nb = Math.round(R.L / 3.55); const bw = R.L / nb;
    for (let i = 0; i < nb - 1; i++) { const s = bw * (i + 1); K.rbox(R, ORN, s - 0.85, 12.3, 0, s + 0.85, 14.9, 0.07); const g = new THREE.TorusGeometry(0.62, 0.11, 6, 14, Math.PI); g.rotateZ(Math.PI); g.translate(s, 14.2, 0.1); K.addRun(R, ST, g, { detail: true }); for (const dx of [-0.62, 0.62]) K.rbox(R, ST, s + dx - 0.08, 13.0, 0.07, s + dx + 0.08, 14.2, 0.16, { detail: true }); } }
  K.loop(CU, orient(P), [[0.45, EAVE + 0.02], [0.52, EAVE + 0.02], [0.52, EAVE - 0.25], [0.45, EAVE - 0.25]]);
  K.loop(M.redTile, orient(P), [[0.5, EAVE], [-0.6, EAVE + 0.45], [-0.9, EAVE + 0.45]], { uvMode: 'roof' });
  K.flat(tint(M.concrete, 0xb9b4aa), rect(-10.6, -26.2, 10.6, 26.2), 15.5);
  hipPoly(K, rect(-10.2, -14.3, 10.2, 14.5), 16.0, 0.47, { ov: 0, soffit: false });
  colliders.push(K.colPoly(P, -2, 21));
  // ---- west portico: two fluted Ionic columns between responds, entablature, iron balcony ----
  {
    const uF = -11.0, uP = -13.4, v0 = -3.2, v1 = 3.2, yT = FL + 5.4;
    K.box(BASE, uP - 0.3, K.g(uP, 0) - 1, v0 - 0.3, uF, FL, v1 + 0.3);
    walkables.push(K.walkPoly(rect(uP - 0.3, v0 - 0.3, uF, v1 + 0.3), FL));
    for (const v of [-1.35, 1.35]) { ionicColumn(K, ST, uP + 0.45, FL, v, 0.62, yT - FL, { flutes: 20, rotV: 1 }); colliders.push(K.colCyl(uP + 0.45, v, 0.35, FL - 1, yT)); }
    for (const v of [v0 + 0.35, v1 - 0.35]) K.box(ST, uP + 0.1, FL, v - 0.35, uF, yT, v + 0.35);
    K.box(ST, uP - 0.05, yT, v0 - 0.05, uF, yT + 0.95, v1 + 0.05);
    K.box(ST, uP - 0.25, yT + 0.95, v0 - 0.25, uF, yT + 1.25, v1 + 0.25);
    const RF = K.run([uP - 0.06, v0], [uP - 0.06, v1]);
    inscription(K, RF, 0.6, 5.8, yT + 0.25, yT + 0.75, 0.005, 'HAVILAND HALL', { fg: '#6a6252', cut: true });
    // doorway: arched double doors under a gridded transom
    const R = K.run([uF, v0], [uF, v1]); const o = { s0: 2.2, s1: 4.2, y0: FL, y1: FL + 4.3, arch: true, doorTop: FL + 2.9 };
    K.wall(R, ST, 0.3, 6.1, FL, yT, [o], 0.2); K.fill(R, o, { kind: 'door', door: tint(M.woodDark, 0x6b3a22), rev: 0.15 });
    // balcony railing on the portico roof
    for (const [a, b] of [[[uP - 0.2, v0 - 0.2], [uP - 0.2, v1 + 0.2]]]) { const RB = K.run(a, b); K.rbox(RB, M.iron, 0, yT + 2.1, -0.05, RB.L, yT + 2.17, 0.05); for (let s = 0.15; s < RB.L; s += 0.16) K.rbox(RB, M.iron, s - 0.015, yT + 1.25, -0.015, s + 0.015, yT + 2.1, 0.015, { detail: true }); const g = new THREE.TorusGeometry(0.32, 0.03, 4, 16); g.rotateY(Math.PI / 2); g.translate(uP - 0.2, yT + 1.67, 0); K.add(M.iron, g, { detail: true }); }
    // long brick stair down to the path
    const gL = K.g(-21, 0); const n = Math.max(3, Math.round((FL - gL) / 0.16));
    walkables.push(K.stairs(BRICK, uP - 0.3 - n * 0.36, -2.6, uP - 0.3, 2.6, gL, FL, '+u', n));
    for (const v of [-3.1, 2.6]) K.box(ST, uP - 0.3 - n * 0.36, gL - 1, v, uP - 0.3, FL + 0.55, v + 0.5);
    // pendant lantern
    K.cyl(M.iron, uP + 1.2, yT - 0.9, 0, 0.01, 0.01, 0.9, 4, { detail: true }); K.lathe(M.lampGlow, [[0.05, 0], [0.18, 0.1], [0.2, 0.45], [0.08, 0.6]], uP + 1.2, yT - 1.5, 0, 8, { detail: true });
  }
  const object3d = K.finish(); object3d.name = 'haviland-hall';
  return { object3d, colliders, walkables };
}
