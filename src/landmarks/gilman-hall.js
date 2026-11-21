// Gilman Hall (John Galen Howard, 1917), the College of Chemistry's Beaux-Arts laboratory where plutonium was first identified
// in 1941 (Room 307). Long buff cast-stone block facing west toward Oppenheimer Way: banded-rusticated raised basement,
// a giant order of Ionic pilasters over two tall floors of paired 6-over-6 sash windows with sunk spandrels, two end pavilions
// with window triplets under low pediments, and a central entrance between two free-standing giant Ionic columns reached by a
// granite stair. Steep red Mission-tile hip roof truncated to a flat deck, with a row of small dormers.
// Massing from LiDAR: eaves ~17 m, deck ~20.5 m, 18.4 x 54 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, colFromXZ, tint, plain, glassTint, cols } from './lib/b04-kit.js';
import { ionicColumn } from './lib/classic-kit.js';
import { howard } from './lib/b04-howard.js';

export const info = {
  id: 'gilman-hall',
  name: 'Gilman Hall',
  subtitle: 'John Galen Howard · 1917',
  blurb: 'Glenn Seaborg\'s team first identified plutonium here in 1941, in Room 307. The chemistry building is a National Historic Landmark.',
  replaces: ['w/24025037'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-15.9)); const M = ctx.M;
  const W = tint(M, 'stuccoWhite', 0xddd2ba), S = tint(M, 'stuccoWhite', 0xe6ddc8), RU = tint(M, 'stuccoWhite', 0xd2c7ae), PL = tint(M, 'stuccoWhite', 0xc6bba3);
  const ROOF = tint(M, 'redTile', 0xc49480), FR = plain(M, 0xe6e1d3, { rough: 0.6 }), GL = glassTint(M, 0x2c3236, { rough: 0.1, metal: 0.35 });
  const OAK = plain(M, 0x8c4f2c, { rough: 0.55 });
  const colliders = [], walkables = [];
  const lv = { pl: 1.2, sc0: 4.9, sc1: 5.3, ent: 15.55, cor: 17.05 };
  const H = howard(K, { W, S, RU, PL, FR, GL, OAK, lv, walkables });
  const det = { detail: true };
  const u0 = -9.2, u1 = 9.2, v0 = -27.05, v1 = 27.1, uR = -8.6;
  const F1 = { y0: 6.0, y1: 9.0 }, F2 = { y0: 10.9, y1: 14.0 }, SP = [9.45, 10.45];
  const pair = (c, w = 1.25, gap = 0.5) => [c - (w + gap) / 2, c + (w + gap) / 2];
  const ops = (cs, w, f, n = 2, m = 3) => cs.map((c) => ({ s0: c - w / 2, s1: c + w / 2, y0: f.y0, y1: f.y1, mull: n, muntins: m }));
  const baseOps = (R, cs, w) => cs.filter((c) => K.g(...R.at(c, 0.5)) < 2.3).map((c) => ({ s0: c - w / 2, s1: c + w / 2, y0: 2.75, y1: 4.15, mull: 1, muntins: 1 }));
  const upper = (R, s0, s1, cs, w) => { const o = [...ops(cs, w, F1), ...ops(cs, w, F2)]; K.wall(R, W, s0, s1, lv.sc1, lv.ent, o, 0.45); H.fill(R, o, 0.3); return o; };

  // ================= west front =================
  const L = v1 - v0, P = 9.0; // pavilion width
  const RG = K.run([u0, v0], [u0, v1]);
  {
    // central range (7 bays), recessed 0.6 m behind the pavilions
    const RC = K.run([uR, v0 + P], [uR, v1 - P]); const Lc = RC.L, nb = 7, bw = Lc / nb;
    const bc = []; for (let i = 0; i < nb; i++) bc.push(bw * (i + 0.5));
    const E = 3; const wc = []; bc.forEach((c, i) => { if (i !== E) wc.push(...pair(c)); });
    const bOps = baseOps(RC, wc, 1.15);
    H.podium(RC, 0, Lc, bOps); H.fill(RC, bOps);
    for (const op of bOps) for (let s = op.s0 + 0.18; s < op.s1; s += 0.2) K.rbox(RC, M.iron, s - 0.015, op.y0, -0.18, s + 0.015, op.y1, -0.15, det); // grilles
    // upper floors; the entry bay gets the doorway at floor 1 and a wide window above
    const o1 = [...ops(wc, 1.25, F1), ...ops(wc, 1.25, F2)];
    const door = { s0: bc[E] - 1.0, s1: bc[E] + 1.0, y0: lv.sc0, y1: lv.sc0 + 4.0, sill: false };
    const wide = { s0: bc[E] - 1.25, s1: bc[E] + 1.25, y0: F2.y0, y1: F2.y1, mull: 3, muntins: 3 };
    K.wall(RC, W, 0, Lc, lv.sc1, lv.ent, [...o1, wide, { ...door, y0: lv.sc1 }], 0.45); H.fill(RC, [...o1, wide], 0.3);
    H.doorway(RC, bc[E], lv.sc0, 2.0, 3.9, { bosses: false });
    for (let i = 0; i < nb; i++) if (i !== E) H.spandrel(RC, bc[i], 3.0, SP[0], SP[1]);
    // carved cartouche panels flanking the entry above floor-1 level
    for (const sx of [-1, 1]) K.rbox(RC, S, bc[E] + sx * 1.6 - 0.35, 9.5, 0, bc[E] + sx * 1.6 + 0.35, 10.5, 0.1, det);
    // giant pilasters at the bay divisions (the two flanking the entry are replaced by free-standing columns)
    for (let i = 0; i <= nb; i++) { if (i === E || i === E + 1) continue; H.pilaster(RC, Math.min(Lc - 0.45, Math.max(0.45, bw * i)), 0.85, lv.sc1, lv.ent); }
    for (const i of [E, E + 1]) {
      const [pu, pv] = RC.at(bw * i, 0.95); // in antis, on the pavilion plane
      K.box(S, pu - 0.62, lv.sc0, pv - 0.62, pu + 0.62, lv.sc1 + 0.25, pv + 0.62);
      ionicColumn(K, S, pu, lv.sc1 + 0.25, pv, 0.9, lv.ent - lv.sc1 - 0.25, { flutes: 20, seg: 20, rotV: 1 });
      colliders.push(K.colCyl(pu, pv, 0.55, -1, lv.ent));
    }
    // landing between the columns and a granite stair down to the walk (where the OSM steps arrive)
    const [la, lb] = [bc[E] - 2.7, bc[E] + 2.7];
    K.rbox(RC, PL, la, -1.5, 0, lb, lv.sc0, 1.75);
    walkables.push(K.walkPoly([RC.at(la, 0), RC.at(lb, 0), RC.at(lb, 1.75), RC.at(la, 1.75)], lv.sc0));
    { // shift the flight to start at the landing edge
      const R2 = K.run(RC.at(0, 1.6), RC.at(Lc, 1.6)); H.stoop(R2, bc[E], 3.0, lv.sc0, { mat: tint(M, 'granite', 0xd8d2c6), cheek: PL });
    }
    H.entab(RC, 0, Lc, { ret0: false, ret1: false });
    K.box(W, uR - 0.55, lv.ent - 0.05, v0 + P, uR + 0.4, lv.cor - 0.3, v1 - P); // fill over the recess behind the entablature
    // pavilions with window triplets and pediments
    for (const [a, b] of [[0, P], [L - P, L]]) {
      const R = K.run(RG.at(a), RG.at(b)); const c = P / 2; const tc = [c - 1.45, c, c + 1.45];
      const bo = baseOps(R, tc, 1.1); H.podium(R, 0, P, bo); H.fill(R, bo);
      upper(R, 0, P, tc, 1.2);
      for (const cc of tc) H.spandrel(R, cc, 1.2, SP[0], SP[1]);
      for (const s of [0.5, P - 0.5]) H.pilaster(R, s, 0.95, lv.sc1, lv.ent, 0.18);
      H.entab(R, 0, P, { ret0: a === 0, ret1: a !== 0 });
      H.pediment(R, 0.1, P - 0.1, lv.cor, 1.85, { roofMat: ROOF, depthBack: 6.0 });
      // pavilion side returns (0.6 m) toward the recessed range
      const vv = a === 0 ? v0 + P : v1 - P; K.box(W, u0, lv.pl, Math.min(vv, vv + 0.01), uR + 0.3, lv.ent, Math.max(vv, vv + 0.01));
    }
  }
  // ================= north, south and exposed east elevations =================
  const endFace = (a, b, nb, { door } = {}) => {
    const R = K.run(a, b); const Lr = R.L; const bw = (Lr - 1.0) / nb; const bc = []; for (let i = 0; i < nb; i++) bc.push(0.5 + bw * (i + 0.5));
    const wc = []; bc.forEach((c) => wc.push(...pair(c, 1.15, 0.45)));
    const bo = baseOps(R, wc, 1.05); H.podium(R, 0, Lr, bo); H.fill(R, bo);
    upper(R, 0, Lr, wc, 1.15);
    for (const c of bc) H.spandrel(R, c, 2.6, SP[0], SP[1]);
    for (let i = 0; i <= nb; i++) H.pilaster(R, Math.min(Lr - 0.45, Math.max(0.45, 0.5 + bw * i)), 0.8, lv.sc1, lv.ent, 0.14);
    H.entab(R, 0, Lr);
    return R;
  };
  endFace([u0, v1], [u1, v1], 3); endFace([u1, v0], [u0, v0], 3); endFace([u1, -9.7], [u1, v0], 3);
  K.box(M.concreteDark, uR + 0.55, -2.0, v0 + 0.6, u1 - 0.6, lv.cor - 0.3, v1 - 0.6);
  // ================= roof: steep tile hips truncated to a flat deck, dormers, penthouse, exhaust stacks =================
  const ov = 0.75;
  K.hip(ROOF, u0 - ov, v0 - ov, u1 + ov, v1 + ov, lv.cor - 0.05, 0.72, { yTop: 20.6 });
  K.box(plain(M, 0xa9a8a2, { rough: 0.95 }), u0 + 3.0, 20.35, v0 + 3.0, u1 - 3.0, 20.6, v1 - 3.0);
  { const C1 = plain(M, 0xbfc2c2, { rough: 0.6, metal: 0.2 }), C2 = plain(M, 0x8e9393, { rough: 0.6, metal: 0.3 }); let k = 0; // rooftop mechanical clutter
    for (let v = v0 + 5; v < v1 - 5; v += 3.1) for (const u of [-3.5, 0.5, 4.0]) { k++; const w = 0.8 + ((k * 37) % 10) / 6, d = 0.8 + ((k * 53) % 10) / 7, h = 0.6 + ((k * 29) % 10) / 8; if ((k * 7) % 5 === 0) continue; K.box((k % 3) ? C1 : C2, u - w / 2 + ((k * 13) % 7) / 7, 20.6, v - d / 2, u + w / 2 + ((k * 13) % 7) / 7, 20.6 + h, v + d / 2); }
    for (const v of [-20, -8, 6, 18]) K.box(C2, -5.5, 21.2, v, 5.5, 21.6, v + 0.6); }
  for (let i = 0; i < 13; i++) { // flat-topped dormers on the west slope
    const v = v0 + 3.0 + i * (L - 6.0) / 12; const ue = u0 - ov + 1.5; const yb = lv.cor - 0.05 + 1.5 * 0.72;
    K.box(S, ue, yb - 0.9, v - 0.8, ue + 1.8, yb + 1.05, v + 0.8);
    K.box(GL, ue - 0.02, yb - 0.15, v - 0.45, ue + 0.05, yb + 0.75, v + 0.45);
    K.box(FR, ue - 0.04, yb + 0.28, v - 0.45, ue + 0.02, yb + 0.33, v + 0.45, det); K.box(FR, ue - 0.04, yb - 0.15, v - 0.03, ue + 0.02, yb + 0.75, v + 0.03, det);
    K.box(plain(M, 0x5a4a3a, { rough: 0.6, metal: 0.3 }), ue - 0.15, yb + 1.05, v - 0.92, ue + 1.9, yb + 1.2, v + 0.92);
  }
  K.box(plain(M, 0x8a8f92, { rough: 0.5, metal: 0.4 }), -2.5, 20.5, -9.0, 1.5, 23.0, -5.0); K.hip(plain(M, 0x8a8f92, { rough: 0.5, metal: 0.4 }), -2.7, -9.2, 1.7, -4.8, 23.0, 0.5);
  for (const [u, v] of [[2.0, -16], [-3.0, 3], [3.5, 12], [-1.0, 20]]) { K.cyl(M.concreteDark, u, 20.5, v, 0.3, 0.3, 1.6, 10); K.cyl(M.iron, u, 22.1, v, 0.36, 0.36, 0.2, 10); }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 22));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'gilman-hall';
  return { object3d, colliders, walkables };
}
