// Minor Hall (1941), home of the Herbert Wertheim School of Optometry: a long, austere four-storey block of painted
// concrete in the stripped-classical / WPA-moderne manner. One tall, deeply recessed steel-sash window per bay (sage-green
// frames, three panes wide), a plain plinth and a simple projecting slab cornice under a low hipped roof. The entrances
// sit in recesses on the long west front where the campus paths arrive: the main one framed by horizontally banded
// (rusticated) piers, with paired glazed doors under a multi-lite transom, a concrete landing, low steps and wing walls,
// and bronze letters reading RALPH S. MINOR HALL.
// Massing from the 2021 LiDAR (frame -4.3°): eaves ~16.6 m, low hip rising to ~22.5 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { colFromXZ } from './lib/b04-kit.js';
import { sign } from './lib/b06a-kit.js';

export const info = {
  id: 'minor-hall',
  name: 'Minor Hall',
  subtitle: 'School of Optometry · 1941',
  blurb: 'Home of Berkeley\'s Herbert Wertheim School of Optometry and Vision Science. The building is named for Ralph S. Minor, a physicist who helped found optometry instruction at Berkeley.',
  replaces: ['w/24024672'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.3)); const M = ctx.M;
  const W = M.stuccoWhite.clone(); W.color = new THREE.Color(0xfbf9f2); W.name = 'minor-paint';        // painted concrete, warm off-white
  const WD = M.stuccoWhite.clone(); WD.color = new THREE.Color(0xe6e3da); WD.name = 'minor-plinth';
  const SAGE = new THREE.MeshStandardMaterial({ color: 0x7e8a74, roughness: 0.55, metalness: 0.3, name: 'minor-sash' });
  const DOOR = M.whitePaint;
  const colliders = [], walkables = [];
  const u0 = -9.1, u1 = 9.2, v0 = -31.0, v1 = 31.1, eave = 16.6;
  const gAvg = (K.g(u0, 0) + K.g(u1, 0)) / 2; const gMin = K.gMin(u0, v0, u1, v1, 8); const yB = gMin - 1.2;
  const F0 = Math.max(0.0, gAvg) + 0.45; // ground-floor level (a low plinth above grade)
  const floors = [F0, F0 + 4.1, F0 + 8.0, F0 + 11.9];
  const rows = [{ y0: F0 + 0.7, h: 3.1 }, { y0: floors[1] + 0.75, h: 2.75 }, { y0: floors[2] + 0.75, h: 2.75 }, { y0: floors[3] + 0.7, h: 2.35 }];
  const BAY = 3.6, WW = 1.5;
  // entrances on the west front where the paths arrive (v = -18.5 main, 8.6), and on the east front (v = 23.2)
  const ents = { W: [{ v: -18.5, main: true }, { v: 8.6 }], E: [{ v: 23.2 }] };
  const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  const toS = (f, v) => f === 'W' ? v - v0 : f === 'E' ? v1 - v : 0;
  for (const f of ['S', 'E', 'N', 'W']) {
    const R = K.run(...defs[f]); const L = R.L;
    const nb = Math.max(1, Math.round((L - 1.6) / BAY)); const bw = (L - 1.6) / nb; const cs = Array.from({ length: nb }, (_, i) => 0.8 + bw * (i + 0.5));
    const E = (ents[f] || []).map((e) => ({ ...e, s: toS(f, e.v) }));
    const near = (c) => E.find((e) => Math.abs(c - e.s) < (e.main ? 2.6 : 2.0));
    const ops = [];
    for (const c of cs) for (let r = 0; r < rows.length; r++) { const e = near(c); if (e && r === 0) continue;
      ops.push({ s0: c - WW / 2, s1: c + WW / 2, y0: rows[r].y0, y1: rows[r].y0 + rows[r].h, muntins: r === 0 ? 6 : 5, sillMat: W }); }
    // entrance recesses (cut through the wall; doors set back in a lined reveal)
    for (const e of E) ops.push({ s0: e.s - (e.main ? 1.35 : 1.05), s1: e.s + (e.main ? 1.35 : 1.05), y0: F0, y1: F0 + (e.main ? 3.9 : 3.3), entrance: e, sill: false });
    K.wall(R, W, 0, L, yB, eave, ops, 0.42);
    for (const o of ops) {
      if (o.entrance) continue;
      K.fill(R, o, { rev: 0.3, frame: SAGE, mull: 2, tran: [o.y0 + (o.y1 - o.y0) * 0.36] });
    }
    // plinth, thin pilaster strips between bays, slab cornice
    K.rbox(R, WD, -0.03, yB, 0, L + 0.03, F0 + 0.15, 0.04);
    for (let i = 0; i <= nb; i++) { const s = 0.8 + bw * i; if (E.some((e) => Math.abs(s - e.s) < 2.4)) continue; K.rbox(R, W, s - 0.07, F0 + 0.15, 0, s + 0.07, eave - 0.6, 0.035, { detail: true }); }
    K.rbox(R, W, -0.1, eave - 0.6, 0, L + 0.1, eave - 0.3, 0.12);
    K.rbox(R, W, -0.55, eave - 0.3, 0, L + 0.55, eave + 0.05, 0.55);
    // entrances
    for (const e of E) {
      const hw = e.main ? 1.35 : 1.05, top = F0 + (e.main ? 3.9 : 3.3), dep = e.main ? 1.3 : 0.9;
      // recess lining, soffit, threshold
      for (const sg of [-1, 1]) K.rbox(R, W, sg < 0 ? e.s - hw - 0.1 : e.s + hw, F0 - 0.2, -dep - 0.42, sg < 0 ? e.s - hw : e.s + hw + 0.1, top, -0.4);
      K.rbox(R, W, e.s - hw, top, -dep - 0.42, e.s + hw, top + 0.15, -0.4);
      K.rbox(R, M.paving, e.s - hw, F0 - 0.4, -dep - 0.42, e.s + hw, F0 + 0.02, 0.0);
      const Rd = K.run(R.at(e.s - hw, -dep - 0.42), R.at(e.s + hw, -dep - 0.42));
      const dw = Math.min(1.8, 2 * hw - 0.3), dO = { s0: hw - dw / 2, s1: hw + dw / 2, y0: F0, y1: top - 0.05, doorTop: F0 + 2.25, sill: false };
      K.wall(Rd, W, 0, 2 * hw, F0 - 0.3, top, [dO], 0.15);
      K.fill(Rd, dO, { kind: 'door', rev: 0.08, frame: SAGE, door: DOOR });
      for (const sx of [hw - dw / 4, hw + dw / 4]) K.rbox(Rd, M.windowNight, sx - dw / 4 + 0.12, F0 + 1.15, -0.06, sx + dw / 4 - 0.12, F0 + 2.05, -0.03); // glazed upper halves
      for (let k = 1; k < 4; k++) K.rbox(Rd, SAGE, dO.s0 + dw * k / 4 - 0.02, F0 + 2.25, -0.08, dO.s0 + dw * k / 4 + 0.02, top - 0.05, -0.04, { detail: true });
      K.rbox(R, M.lampGlow, e.s - 0.15, top - 0.45, -dep * 0.5 - 0.6, e.s + 0.15, top - 0.15, -dep * 0.5 - 0.3, { detail: true }); // pendant lantern
      if (e.main) { // horizontally banded piers flanking the recess
        for (const sg of [-1, 1]) { const a = sg < 0 ? e.s - hw - 1.0 : e.s + hw, b = a + 1.0;
          const nC = 8; const ch = (top + 0.6 - F0 + 0.2) / nC; for (let k = 0; k < nC; k++) K.rbox(R, W, a, F0 - 0.2 + k * ch + 0.035, 0, b, F0 - 0.2 + (k + 1) * ch - 0.035, 0.3);
          K.rbox(R, WD, a + 0.04, F0 - 0.2, 0, b - 0.04, top + 0.6, 0.26); }
        const R2 = K.run(R.at(e.s - hw - 1.0, 0.31), R.at(e.s - hw, 0.31));
        sign(K, R2, 'RALPH S. MINOR', 0.5, F0 + 2.75, 0.13, { color: '#4a463f', d: 0.0 });
        sign(K, R2, 'HALL', 0.5, F0 + 2.55, 0.13, { color: '#4a463f', d: 0.0 });
        K.rbox(R2, M.bronze, 0.2, F0 + 1.75, 0.0, 0.8, F0 + 2.1, 0.03, { detail: true });
      }
      // landing, steps down to the walk, low wing walls
      const gl = (() => { const p = R.at(e.s, 3.6); return K.g(p[0], p[1]); })();
      const lw = 2 * hw + (e.main ? 2.6 : 1.0), ld = e.main ? 3.0 : 1.8;
      K.rbox(R, WD, e.s - lw / 2, yB, 0.0, e.s + lw / 2, F0, ld);
      walkables.push(K.walkPoly([R.at(e.s - lw / 2, 0), R.at(e.s + lw / 2, 0), R.at(e.s + lw / 2, ld), R.at(e.s - lw / 2, ld)].map(([u, v]) => [u, v]), F0));
      const nst = Math.max(1, Math.round((F0 - gl) / 0.16));
      if (F0 - gl > 0.1) for (let k = 0; k < nst; k++) K.rbox(R, WD, e.s - lw / 2 + 0.6, yB, ld + k * 0.32, e.s + lw / 2 - 0.6, F0 - (k + 1) * (F0 - gl) / nst, ld + (k + 1) * 0.32);
      if (e.main) for (const sg of [-1, 1]) { const a = sg < 0 ? e.s - lw / 2 : e.s + lw / 2 - 0.65; K.rbox(R, W, a, yB, 0.0, a + 0.65, F0 + 1.05, ld + 0.4); colliders.push(K.colPoly([R.at(a, 0), R.at(a + 0.65, 0), R.at(a + 0.65, ld + 0.4), R.at(a, ld + 0.4)], yB, F0 + 1.05)); }
      if (e.main) for (const x of [e.s - 0.55, e.s + 0.55]) { const p0 = R.at(x, ld + 0.1), p1 = R.at(x, ld + nst * 0.32 + 0.1); K.cyl(M.iron, p0[0], F0, p0[1], 0.025, 0.025, 0.95, 6, { detail: true }); K.cyl(M.iron, p1[0], gl, p1[1], 0.025, 0.025, 0.95, 6, { detail: true }); }
    }
  }
  // core, low hipped tile roof (LiDAR ~22.5 m ridge)
  K.box(M.concreteDark, u0 + 0.6, yB, v0 + 0.6, u1 - 0.6, eave, v1 - 0.6);
  K.hip(M.redTile, u0 - 0.5, v0 - 0.5, u1 + 0.5, v1 + 0.5, eave + 0.05, 0.6);
  K.box(M.concreteDark, u0, eave - 0.1, v0, u1, eave + 0.05, v1);
  colliders.push(colFromXZ(ctx.footprints[0].outer, yB, 23));
  const object3d = K.finish(); object3d.name = 'minor-hall';
  return { object3d, colliders, walkables };
}
