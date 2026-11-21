// Building 21 — the former Wilkinson Lodge (boys' residence and dining hall, California School for the Blind, 1928;
// Office of the State Architect, Alfred Eichler). Spanish Colonial Revival with PWA Moderne touches, stepped into the
// hillside: a one-storey west wing, a two-storey gabled main block (downhill south face), a flat-roofed parapeted stair
// block, a one-storey link with a Tuscan colonnade, and a long two-storey wing bent ~60° toward the southeast.
// Vacant since 1979 except for storage ("Archives" on the Clark Kerr map); the west half was re-roofed and re-glazed.
// Massing from the 2021 LiDAR (main ridge 8.6 m, stair block parapet 10.3 m, link ridge 7.6 m, wing roof ~10–11 m, abs).
import * as THREE from 'three';
import { CKKit } from './lib/clarkkerr-kit.js';

export const info = {
  id: 'archives',
  name: 'Building 21 (Wilkinson Lodge)',
  subtitle: 'Alfred Eichler · 1928',
  blurb: 'Built in 1928 as the boys\u2019 dormitory and dining hall of the California School for the Blind and later named Wilkinson Lodge, this Spanish Colonial Revival building steps up the hillside. It has stood largely vacant since 1979 and is used for storage.',
  replaces: ['w/128467228'],
};

export async function build(ctx) {
  const K = new CKKit(ctx, -3.7); const C = K.C;
  const cas = (y, w = 0.95, h = 1.3, panes = [3, 4]) => ({ y, h, w, kind: 'casement', panes });

  // ---------- west wing: one storey, gable to the south (toward Eastway Drive), hip to the north ----------
  {
    const w = { u0: -32.7, u1: -24.5, v0: -13.2, v1: 11.2 }; const FL = K.gMin(w.u0, w.v0, w.u1, w.v1) + 0.25; const E = 4.45;
    const y0 = FL - 1.4;
    K.wingGroup([{ ...w, y0, eave: E, slope: 0.33, roof: { type: 'hip', ends: { v1: 'gable' }, ov: 0.3, rake: 0.2 } }], (wg, f, R, s0, s1) => {
      if (f === 'E') { // courtyard side, partly against the main block
        return { ops: K.bays(s0, s1, { bay: 2.8, edge: 0.8, floors: [cas(FL + 0.9, 1.0, 1.35)] }).filter((o) => o.s1 < R.L - 13.5 || o.s0 > R.L - 0.5) };
      }
      if (f === 'S') return { ops: [{ s0: R.L / 2 - 0.9, s1: R.L / 2 + 0.9, y0: FL + 0.02, y1: FL + 2.6, kind: 'door', sill: false, rev: 0.25 }, { s0: 1.0, s1: 2.0, y0: FL + 0.9, y1: FL + 2.2, kind: 'casement', panes: [3, 4] }, { s0: R.L - 2.0, s1: R.L - 1.0, y0: FL + 0.9, y1: FL + 2.2, kind: 'casement', panes: [3, 4] }] };
      return { ops: K.bays(s0, s1, { bay: 2.7, edge: 0.7, floors: [cas(FL + 0.9, 1.0, 1.35)] }) };
    });
    // gable vent cluster
    const RS = K.run([w.u0, w.v1], [w.u1, w.v1]); K.ventCluster(RS, RS.L / 2, E + 0.25, { rows: 3, size: 0.12, gap: 0.1 });
    // half-round stair bay on the west face (facing Eastway Drive)
    K.cyl(C.wall, w.u0 - 0.2, y0, -2.0, 1.6, 1.6, E + 0.6 - y0, 16);
    K.lathe(C.tile, [[1.85, 0], [1.2, 0.5], [0.15, 0.85], [0.001, 0.86]], w.u0 - 0.2, E + 0.55, -2.0, 16);
    K.colRect(w.u0 - 1.9, -3.7, w.u0, -0.3, y0, E + 1);
  }

  // ---------- main block: two storeys downhill (south), gabled east-west ----------
  const M0 = { u0: -24.5, u1: -3.4, v0: -13.0, v1: -0.5 };
  {
    const FLs = K.g(-14, 0.3) + 0.25; // downhill (south) ground floor
    const E = 6.35; const y0 = FLs - 1.4;
    K.wingGroup([{ ...M0, y0, eave: E, slope: 0.34, roof: { type: 'hip', ends: { u0: 'open', u1: 'gable' }, ov: 0.2, rake: 0.15, fascia: 0.15 } }], (wg, f, R, s0, s1) => {
      if (f === 'S') { // downhill façade: irregular ground floor, 7 upper casements + wide ribbon window
        const ops = [];
        const up = FLs + 3.25;
        [1.8, 3.6, 5.4, 7.2].forEach((s) => ops.push({ s0: s - 0.46, s1: s + 0.46, y0: up, y1: up + 1.25, kind: 'casement', panes: [3, 4] }));
        ops.push({ s0: 9.0 - 0.65, s1: 9.0 + 0.65, y0: up, y1: up + 1.3, kind: 'casement', panes: [4, 4] });
        ops.push({ s0: 12.6 - 1.3, s1: 12.6 + 1.3, y0: up - 0.05, y1: up + 1.35, kind: 'casement', panes: [7, 4] });
        ops.push({ s0: 16.4 - 0.46, s1: 16.4 + 0.46, y0: up, y1: up + 1.25, kind: 'casement', panes: [3, 4] });
        // ground floor: narrow pairs, glass-block strip, tall pairs
        for (const s of [1.5, 2.1, 3.3, 3.9]) ops.push({ s0: s - 0.23, s1: s + 0.23, y0: FLs + 0.8, y1: FLs + 2.2, kind: 'casement', panes: [2, 4] });
        ops.push({ s0: 5.3, s1: 5.55, y0: FLs + 1.0, y1: FLs + 2.0, kind: 'glassblock' });
        for (const s of [7.0, 8.2, 11.6, 12.8]) ops.push({ s0: s - 0.45, s1: s + 0.45, y0: FLs + 0.7, y1: FLs + 2.35, kind: 'casement', panes: [3, 5] });
        ops.push({ s0: 15.6, s1: 17.2, y0: FLs + 0.02, y1: FLs + 2.5, kind: 'glassdoor', sill: false, transom: 2.05 });
        return { ops };
      }
      if (f === 'N') { // uphill side: ground nearly at the upper floor
        return { ops: K.bays(s0, s1, { bay: 2.6, edge: 0.9, floors: [cas(FLs + 3.35, 0.95, 1.2)] }) };
      }
      if (f === 'E') return false; // stair block abuts
      return { ops: [] };
    });
    // decorative vent cluster in the east gable (seen above the stair block roofline from the south)
    // pipe-railed concrete stair up the east side of the lawn
  }

  // ---------- flat-roofed stair block (PWA Moderne), parapet with tile coping ----------
  {
    const T = { u0: -3.4, u1: 1.1, v0: -9.6, v1: 4.9 }; const FL = K.g(-1.8, 4.5) + 0.2; const top = 10.0; const y0 = FL - 1.5;
    K.wingGroup([{ ...T, y0, eave: top, roof: { type: 'flat', parapet: 0.35, coping: 'tile' } }], (wg, f, R, s0, s1) => {
      if (f === 'S') return { ops: [{ s0: R.L / 2 - 0.95, s1: R.L / 2 + 0.95, y0: FL + 0.02, y1: FL + 2.6, kind: 'door', sill: false, rev: 0.3 }, { s0: R.L / 2 - 0.2, s1: R.L / 2 + 0.2, y0: FL + 3.3, y1: FL + 6.6, kind: 'casement', panes: [1, 8] }, { s0: R.L / 2 - 1.2, s1: R.L / 2 - 0.85, y0: FL + 3.3, y1: FL + 6.6, kind: 'casement', panes: [1, 8] }, { s0: R.L / 2 + 0.85, s1: R.L / 2 + 1.2, y0: FL + 3.3, y1: FL + 6.6, kind: 'casement', panes: [1, 8] }] };
      if (f === 'N') return { ops: [{ s0: R.L / 2 - 0.5, s1: R.L / 2 + 0.5, y0: FL + 4.2, y1: FL + 5.5, kind: 'casement', panes: [3, 4] }] };
      return { ops: [] };
    });
    // flat concrete canopy over the south door
    const RS = K.run([T.u0, T.v1], [T.u1, T.v1]); K.rbox(RS, C.conc, RS.L / 2 - 1.5, FL + 2.75, 0, RS.L / 2 + 1.5, FL + 2.9, 1.4);
  }

  // ---------- one-storey link with a Tuscan colonnade on its south side ----------
  {
    const L = { u0: 1.1, u1: 13.8, v0: -7.2, v1: 3.2 }; const FL = K.g(7.5, 3.0) + 0.15; const E = FL + 3.15; const y0 = FL - 1.5;
    const vWall = 0.7; // enclosed room behind the colonnade
    // walls (north and set-back south) + ends
    const RN = K.run([L.u1, L.v0], [L.u0, L.v0]); K.facade(RN, 0, RN.L, { y0, y1: E, ops: K.bays(0, RN.L, { bay: 2.6, edge: 0.8, floors: [cas(FL + 1.0, 1.0, 1.0, [3, 3])] }) });
    const RS = K.run([L.u0, vWall], [L.u1, vWall]); K.facade(RS, 0, RS.L, { y0, y1: E, ops: [{ s0: 5.6, s1: 6.6, y0: FL + 0.02, y1: FL + 2.3, kind: 'door', sill: false, transom: 1.9 }, { s0: 2.0, s1: 3.2, y0: FL + 0.9, y1: FL + 2.3, kind: 'casement', panes: [4, 4] }, { s0: 9.0, s1: 10.2, y0: FL + 0.9, y1: FL + 2.3, kind: 'casement', panes: [4, 4] }] });
    const RE = K.run([L.u1, L.v1], [L.u1, L.v0]); K.facade(RE, 0, RE.L, { y0, y1: E, ops: [] });
    K.box(C.concDark, L.u0 + 0.3, y0, L.v0 + 0.3, L.u1 - 0.3, E - 0.02, vWall - 0.3);
    K.roofHip(L.u0, L.v0, L.u1, L.v1, E, 0.33, { ends: { u0: 'open', u1: 'gable' }, ov: 0.4, rake: 0.2 });
    // five Tuscan columns + beam under the roof edge, quarry-tile floor
    const RC = K.run([L.u0, L.v1], [L.u1, L.v1]);
    for (let i = 0; i < 5; i++) {
      const s = 1.4 + i * (RC.L - 2.4) / 4; const [u, v] = RC.at(s, -0.35);
      const h = E - FL - 0.3;
      const lg = new THREE.LatheGeometry([[0.19, 0], [0.19, 0.12], [0.15, 0.2], [0.14, 0.3], [0.12, h - 0.3], [0.14, h - 0.22], [0.16, h - 0.16], [0.2, h - 0.12], [0.2, h], [0.001, h]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
      lg.translate(u, FL, v); K.add(C.wall, lg); K.colliders.push(K.colCyl(...K.toMain(u, v), 0.2, FL - 1, E));
    }
    K.rbox(RC, C.wall, 0.4, E - 0.3, -0.6, RC.L, E + 0.05, -0.1);
    K.rbox(RC, C.trim, 0.4, E - 0.32, -(L.v1 - vWall), RC.L, E - 0.3, -0.6);
    K.box(C.floor, L.u0, FL - 1.0, vWall, L.u1, FL + 0.02, L.v1);
    K.walkRect(L.u0, vWall, L.u1, L.v1, FL + 0.02);
    K.colRect(L.u0, L.v0, L.u1, vWall, y0, E + 2);
  }

  // ---------- long two-storey wing bent ~60° toward the southeast (sub-frame) ----------
  K.sub(60.0, [22.32, -7.09], () => {
    const ou = 22.32, ov = -7.09;
    const G1 = { u0: ou + 0.6, u1: ou + 14.5, v0: ov + 0.3, v1: ov + 10.9 }, G2 = { u0: ou + 14.5, u1: ou + 27.2, v0: ov + 0.3, v1: ov + 10.9 };
    const G = { u0: G1.u0, u1: G2.u1, v0: G1.v0, v1: G1.v1 };
    const FL = K.g(ou + 6, ov + 6.0) + 0.15; const FL2 = K.g(ou + 21, ov + 6.0) + 0.15; const y0 = K.gMin(G.u0, G.v0, G.u1, G.v1) - 1.4;
    const wingFace = (fl, E) => (wg, f, R, s0, s1) => {
      const up = fl + 3.3;
      if (f === 'S' || f === 'N') {
        const n = Math.max(1, Math.round((s1 - s0 - 1.2) / 3.2)); const ops = []; const bw = (s1 - s0 - 1.2) / n;
        for (let i = 0; i < n; i++) {
          const c = s0 + 0.6 + bw * (i + 0.5);
          if (up + 1.45 < E - 0.15) ops.push({ s0: c - 0.55, s1: c + 0.55, y0: up, y1: up + 1.45, kind: 'casement', panes: [3, 4] });
          const gl = K.g(...R.at(c, 0.4)); if (gl < fl + 0.5) for (const dd of [-0.55, 0.55]) ops.push({ s0: c + dd - 0.45, s1: c + dd + 0.45, y0: fl + 0.7, y1: fl + 2.4, kind: f === 'S' ? 'boarded' : 'casement', panes: [3, 4] });
        }
        return { ops };
      }
      if (f === 'E') return { ops: [{ s0: R.L / 2 - 1.6, s1: R.L / 2 - 0.6, y0: up, y1: up + 1.25, kind: 'casement', panes: [3, 4] }, { s0: R.L / 2 + 0.6, s1: R.L / 2 + 1.6, y0: fl + 0.02, y1: fl + 2.5, kind: 'door', sill: false }] };
      return { ops: [] };
    };
    const E = 9.7;
    K.wingGroup([{ ...G, y0, eave: E, slope: 0.25, roof: { type: 'hip', ov: 0.15, rake: 0.12, fascia: 0.14, ends: { u0: 'gable', u1: 'gable' } } }], (wg, f, R, s0, s1) => {
      if (f !== 'S') return wingFace(FL, E)(wg, f, R, s0, s1);
      // downhill (SW) façade from the 2019 photo: 7 upper casements widening toward the SE gable, boarded ground pairs, glass-block slot
      const ops = []; const head = E - 0.4; let s = 2.2;
      for (const w of [1.2, 1.4, 1.4, 1.6, 1.6, 1.8, 3.0]) { ops.push({ s0: s, s1: s + w, y0: head - 1.5, y1: head, kind: 'casement', panes: [Math.max(3, Math.round(w / 0.4)), 4] }); s += w + 1.55; }
      const gy = FL + 0.6;
      for (const c of [2.0, 3.0, 4.0, 8.4, 9.4, 12.8, 13.8]) ops.push({ s0: c - 0.42, s1: c + 0.42, y0: gy, y1: gy + 1.9, kind: 'boarded' });
      ops.push({ s0: 5.6, s1: 5.9, y0: gy + 0.4, y1: gy + 1.4, kind: 'glassblock' });
      for (const c of [19.0, 20.4]) ops.push({ s0: c - 0.5, s1: c + 0.5, y0: gy, y1: gy + 1.9, kind: 'boarded' });
      return { ops: ops.filter((o) => o.s1 < s1 - 0.4 && o.s0 > s0 + 0.3) };
    });
    { const RE = K.run([G.u1, G.v1], [G.u1, G.v0]); K.ventCluster(RE, RE.L / 2, E + 0.55, { rows: 3, size: 0.13, gap: 0.1 }); }
    // SE entry canopy + concrete stair with pipe rail
    const RE = K.run([G.u1, G.v1], [G.u1, G.v0]); const gE = K.g(...RE.at(RE.L / 2, 1.0));
    K.rbox(RE, C.conc, RE.L / 2 - 2.2, gE + 2.7, 0, RE.L / 2 + 0.4, gE + 2.85, 2.0);
    K.rbox(RE, C.wall, RE.L / 2 - 2.4, gE - 1.0, 1.7, RE.L / 2 - 2.0, gE + 2.7, 2.0);
    { const RE2 = K.run([G.u1, G.v1], [G.u1, G.v0]); const p0 = RE2.at(RE2.L / 2 + 1.2, 2.2); const gA = K.g(...p0); const gB = K.g(...RE2.at(RE2.L - 0.3, 2.2));
      const n = Math.max(3, Math.round(Math.abs(gB - gA) / 0.17)); const lo = Math.min(gA, gB), hi = Math.max(gA, gB);
      for (let i = 0; i < n; i++) { const s0 = RE2.L / 2 + 1.2 + (RE2.L / 2 - 1.5) * i / n, s1 = RE2.L / 2 + 1.2 + (RE2.L / 2 - 1.5) * (i + 1) / n; K.rbox(RE2, C.conc, s0, lo - 0.8, 1.2, s1, lo + (hi - lo) * (i + 1) / n, 2.6); }
      K.rbox(RE2, C.iron, RE2.L / 2 + 1.2, hi + 0.9, 2.55, RE2.L - 0.3, hi + 0.95, 2.6, { detail: true }); }
    // chimney / vent stack at the ridge
    K.chimney(G.u0 + 3.5, (G.v0 + G.v1) / 2, E, E + 2.6, { w: 0.6, d: 0.6, cap: 'slab' });
  });
  // chimney between main block and west wing (tall square pier seen from uphill)
  K.chimney(-25.2, -11.5, 4.0, 7.7, { w: 0.8, d: 0.8, cap: 'slab' });

  const object3d = K.finish();
  object3d.name = 'wilkinson-lodge';
  return { object3d, colliders: K.colliders, walkables: K.walkables };
}
