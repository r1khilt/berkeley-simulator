// Howson Gymnasium (D-10, 1955; California School for the Deaf), now the gym of UC Berkeley's Golden Bear Recreation
// Center at 25 Sports Lane and home of Golden Bear Gymnastics. A plain mid-century hall: cream-painted concrete walls
// with shallow fins, high bands of steel clerestory sash, a very low gable roof, and a lower flat-roofed locker wing
// facing the outdoor pool. LiDAR: hall eaves ~11.6 m, ridge ~12.9 m (abs); locker wing roof ~8.6 m.
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'golden-bear-gymnastics',
  name: 'Golden Bear Recreation Center Gym',
  subtitle: 'Howson Gymnasium · 1955',
  blurb: 'Built in 1955 as Howson Gymnasium for the California School for the Deaf, this hall is now part of UC Berkeley\u2019s Golden Bear Recreation Center on the Clark Kerr Campus and is home to the Golden Bear Gymnastics program.',
  replaces: ['w/128467260'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -14.8); const C = K.C;
  const H = { u0: -12.8, u1: 13.8, v0: -22.8, v1: 11.5 }; const FL = K.g(-11, -5) + 0.6; const E = 11.6; const y0 = K.gMin(H.u0, H.v0, H.u1, H.v1) - 1.2;
  const fins = (R, s0, s1, n, yA, yB) => { for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, C.wall, s - 0.22, yA, 0, s + 0.22, yB, 0.25); } };
  // ---------- hall ----------
  K.wingGroup([{ ...H, y0, eave: E, slope: 0.1, roof: { type: 'hip', ends: { v0: 'open', v1: 'open' }, tile: C.membrane, caps: false, ov: 0.0, fascia: 0.01 } }], (w, f, R, s0, s1) => {
    const ops = [];
    if (f === 'W' || f === 'E') { // long sides: clerestory band in 6 bays
      const n = 6; const bw = (R.L - 1.0) / n;
      for (let i = 0; i < n; i++) { const c = 0.5 + bw * (i + 0.5); ops.push({ s0: c - bw / 2 + 0.45, s1: c + bw / 2 - 0.45, y0: 8.2, y1: 10.7, kind: 'industrial', panes: [8, 4], sill: false, rev: 0.22 }); }
      if (f === 'W') { ops.push({ s0: 6.0, s1: 7.8, y0: FL + 0.02, y1: FL + 2.3, kind: 'door', sill: false }); ops.push({ s0: R.L - 9.0, s1: R.L - 7.2, y0: FL + 0.02, y1: FL + 2.3, kind: 'door', sill: false }); }
      return { ops };
    }
    if (f === 'N') { // entrance front toward Sports Lane
      const c = R.L / 2;
      ops.push({ s0: c - 2.6, s1: c + 2.6, y0: FL + 0.02, y1: FL + 2.6, kind: 'glassdoor', sill: false });
      for (const d of [-8.5, -5.2, 5.2, 8.5]) ops.push({ s0: c + d - 1.1, s1: c + d + 1.1, y0: FL + 1.0, y1: FL + 2.4, kind: 'industrial', panes: [4, 3] });
      for (let i = 0; i < 5; i++) { const s = c + (i - 2) * 4.2; ops.push({ s0: s - 1.6, s1: s + 1.6, y0: 8.2, y1: 10.7, kind: 'industrial', panes: [6, 4], sill: false }); }
      return { ops };
    }
    return false; // south face is inside the locker wing / above it
  });
  { // parapet with metal coping around the hall roof (hides the low gable)
    const P = 0.75; const t = 0.3;
    for (const [a, b, c, d] of [[H.u0, H.v0 - 0.02, H.u1, H.v0 + t], [H.u0, H.v1 - t, H.u1, H.v1 + 0.02], [H.u0 - 0.02, H.v0, H.u0 + t, H.v1], [H.u1 - t, H.v0, H.u1 + 0.02, H.v1]]) K.box(C.wall, a, E - 0.1, b, c, E + P, d);
    K.loop(C.conc, [[H.u0, H.v0], [H.u1, H.v0], [H.u1, H.v1], [H.u0, H.v1]], [[0.05, E + P], [0.05, E + P + 0.12], [-t - 0.05, E + P + 0.12], [-t - 0.05, E + P]]);
    // gable infill at the short ends up to the low ridge
    for (const vv of [H.v0, H.v1]) { const R = vv === H.v0 ? K.run([H.u1, vv], [H.u0, vv]) : K.run([H.u0, vv], [H.u1, vv]); K.gableTri(R, 0, R.L, E + P, 12.95, C.wall); }
  }
  { // walls the south end of the hall above the locker wing roof
    const R = K.run([H.u0, H.v1], [H.u1, H.v1]); K.facade(R, 0, R.L, { y0: 8.0, y1: E, ops: [] });
  }
  for (const [a, b] of [[[H.u1, H.v1], [H.u1, H.v0]], [[H.u0, H.v0], [H.u0, H.v1]]]) { const R = K.run(a, b); fins(R, 0.5, R.L - 0.5, 6, y0 + 0.5, E - 0.05); K.rbox(R, C.wall, 0, 7.6, 0, R.L, 7.85, 0.3); }
  { const R = K.run([H.u1, H.v0], [H.u0, H.v0]); K.rbox(R, C.wall, 0, 7.6, 0, R.L, 7.85, 0.3); K.rbox(R, C.conc, R.L / 2 - 4.0, FL + 2.8, 0, R.L / 2 + 4.0, FL + 3.05, 2.6); // entry canopy
    for (const d of [-3.7, 3.7]) { const [u, v] = R.at(R.L / 2 + d, 2.4); K.cyl(C.iron, u, FL, v, 0.08, 0.08, 2.8, 8); }
    // Cal-blue sign band over the entrance
    K.rbox(R, ctx.M.calBlue, R.L / 2 - 4.5, FL + 3.4, 0, R.L / 2 + 4.5, FL + 4.2, 0.06); K.rbox(R, ctx.M.calGold, R.L / 2 - 4.3, FL + 3.75, 0.06, R.L / 2 + 4.3, FL + 3.85, 0.075, { detail: true });
    const g = K.g(...R.at(R.L / 2, 3)); K.box(C.conc, H.u0 + 7, Math.min(g, FL) - 1, H.v0 - 3.0, H.u1 - 7, FL + 0.02, H.v0); K.walkRect(H.u0 + 7, H.v0 - 3.0, H.u1 - 7, H.v0, FL + 0.02);
  }
  // ---------- locker wing (flat roof) facing the pool ----------
  const L = { u0: -12.8, u1: 9.7, v0: 11.5, v1: 24.3 }; const top = 8.6;
  K.box(C.concDark, L.u0 + 0.35, y0 + 0.2, L.v0 + 0.1, L.u1 - 0.35, top - 0.05, L.v1 - 3.3);
  K.wingGroup([{ ...L, y0, eave: top, core: false, collide: false, roof: { type: 'flat', parapet: 0.35 } }], (w, f, R, s0, s1) => {
    if (f === 'N') return false;
    if (f === 'S') { // pool deck front: wide recessed opening, high strip windows
      return { ops: [{ s0: R.L / 2 - 3.2, s1: R.L / 2 + 3.2, y0: FL + 0.02, y1: FL + 3.0, kind: 'open', sill: false }, ...[2.5, 5.0, R.L - 5.0, R.L - 2.5].map((c) => ({ s0: c - 0.9, s1: c + 0.9, y0: FL + 2.2, y1: FL + 3.0, kind: 'industrial', panes: [4, 2] }))] };
    }
    return { ops: K.bays(s0, s1, { bay: 3.2, edge: 1.0, floors: [{ y: FL + 2.2, h: 0.8, w: 1.8, kind: 'industrial', panes: [4, 2] }] }) };
  });
  { // recess behind the pool opening: back wall, clock, soffit
    const R = K.run([L.u0, L.v1], [L.u1, L.v1]); const c = R.L / 2;
    K.rbox(R, C.wall, c - 3.2, FL - 0.2, -3.2, c + 3.2, FL + 3.0, -3.0);
    K.rbox(R, C.trim, c - 3.2, FL + 3.0, -3.2, c + 3.2, FL + 3.1, -0.02);
    K.rbox(R, C.wall, c - 3.4, FL - 0.2, -3.2, c - 3.2, FL + 3.0, 0); K.rbox(R, C.wall, c + 3.2, FL - 0.2, -3.2, c + 3.4, FL + 3.0, 0);
    K.rbox(R, C.floor, c - 3.2, FL - 0.5, -3.2, c + 3.2, FL + 0.02, 0);
    K.rbox(R, C.glass, c - 2.0, FL + 0.02, -3.12, c - 0.4, FL + 2.3, -3.0); K.rbox(R, C.glass, c + 0.4, FL + 0.02, -3.12, c + 2.0, FL + 2.3, -3.0);
    const g = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20); g.rotateX(Math.PI / 2); g.translate(c, FL + 2.6, -2.95); K.addRun(R, C.white, g);
    K.rbox(R, C.iron, c - 0.012, FL + 2.6, -2.9, c + 0.012, FL + 2.8, -2.88, { detail: true }); K.rbox(R, C.iron, c, FL + 2.59, -2.9, c + 0.15, FL + 2.61, -2.88, { detail: true });
  }
  { const R = K.run([L.u0, L.v1 - 0.4], [L.u1, L.v1 - 0.4]); const yb = top + 0.35;
    K.rbox(R, C.white, 0.3, yb + 0.75, -0.025, R.L - 0.3, yb + 0.8, 0.025, { detail: true }); K.rbox(R, C.white, 0.3, yb + 0.35, -0.02, R.L - 0.3, yb + 0.39, 0.02, { detail: true });
    for (let s = 0.3; s <= R.L - 0.3; s += 1.5) K.rbox(R, C.white, s - 0.025, top, -0.025, s + 0.025, yb + 0.8, 0.025, { detail: true }); }
  K.colRect(L.u0, L.v0, L.u1, L.v1, y0, top + 1);
  const object3d = K.finish();
  object3d.name = 'howson-gym';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
