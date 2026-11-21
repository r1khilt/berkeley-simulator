// Old Art Gallery (John Galen Howard, 1904): built as the campus power house, later the University Art Gallery.
// A tall single-storey red-brick hall under a low gable: brick pilaster-piers divide the entrance front into three
// bays, a Lombard band of corbelled round arches runs under the eaves, the centre bay holds a big semicircular-arched
// doorway, and the side bays carry the 1936 WPA mosaic murals. A low flat-roofed brick annex adjoins at the rear.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { tint, paleGlass, mosaicPanel, lombardFrieze, shrubRow, drapeStrip } from './lib/b05a-kit.js';

export const info = {
  id: 'old-art-gallery',
  name: 'Old Art Gallery',
  subtitle: 'John Galen Howard · 1904',
  blurb: 'Built in 1904 as the campus power house and later the University Art Gallery, this brick hall by John Galen Howard is known for the WPA-era mosaic murals set into its façade.',
  replaces: ['w/24025029'],
};

export async function build(ctx) {
  const M = ctx.M; const K = new Kit(ctx, THREE.MathUtils.degToRad(-9.0));
  const BR = tint(K, M.brick, 0xe2b9a8, 'oagBrick'); const GL = paleGlass(); const FR = M.darkBronze;
  const CU = M.copper; const colliders = [], walkables = [];
  const H = { u0: -5.8, u1: 9.5, v0: -7.2, v1: 17.7 }; const FL = K.g(1.8, 17.7) + 0.3; const EAVE = 10.2;
  // ---------- main hall ----------
  // entrance front (south): three bays between brick pilaster-piers
  {
    const R = K.run([H.u0, H.v1], [H.u1, H.v1]); const L = R.L; const pw = 0.9; const bw = (L - 4 * pw) / 3;
    const door = { s0: L / 2 - 1.7, s1: L / 2 + 1.7, y0: FL, y1: FL + 5.0, arch: true };
    K.wall(R, BR, 0, L, -1.5, EAVE, [door], 0.5);
    K.fill(R, { ...door, doorTop: FL + 2.7, sill: false }, { kind: 'door', rev: 0.45, door: M.woodDark, frame: FR, glass: GL });
    for (let i = 0; i < 2; i++) { // double brick voussoir ring
      const g = new THREE.RingGeometry(1.7 + i * 0.32, 2.0 + i * 0.32, 18, 1, 0, Math.PI); g.translate(L / 2, FL + 3.3, 0.04 + i * 0.05); K.addRun(R, BR, g, { uvMode: 'box' });
    }
    for (let i = 0; i < 4; i++) { const s = i * (pw + bw) + pw / 2; K.rbox(R, BR, s - pw / 2, -1.5, 0, s + pw / 2, EAVE - 0.2, 0.22); K.rbox(R, CU, s - 0.07, FL, 0.22, s + 0.07, EAVE - 0.3, 0.32, { detail: true }); }
    // mosaic murals in the side bays (above a plain brick dado), gold-ground mosaic in the upper fields
    for (const [k, sd] of [[0, 1], [2, 2]]) { const a = pw + k * (bw + pw); mosaicPanel(K, R, a + 0.3, a + bw - 0.3, FL + 1.1, FL + 5.2, 0.02, sd); }
    const gold = tint(K, M.gold, 0xc8b36e, 'oagGold'); gold.metalness = 0.4;
    for (const k of [0, 1, 2]) { const a = pw + k * (bw + pw); K.rbox(R, gold, a + 0.25, FL + 5.6, 0, a + bw - 0.25, EAVE - 1.3, 0.025); }
    lombardFrieze(K, R, BR, 0, L, EAVE - 1.1, { w: 0.62, p: 0.18 });
    // metal canopy at the springing line
    K.rbox(R, M.iron, L / 2 - 1.9, FL + 3.25, 0, L / 2 + 1.9, FL + 3.33, 1.2, { detail: true });
    const ns = Math.max(1, Math.round((FL - K.g(1.8, H.v1 + 2)) / 0.16));
    if (ns > 1) walkables.push(K.stairs(M.graniteDark, 0.0, H.v1, 3.6, H.v1 + ns * 0.32, K.g(1.8, H.v1 + 2), FL, '-v', ns));
  }
  // long sides: tall round-arched industrial windows between piers, Lombard frieze
  for (const [a, b] of [[[H.u1, H.v1], [H.u1, H.v0]], [[H.u0, H.v0], [H.u0, H.v1]]]) {
    const R = K.run(a, b); const L = R.L; const n = 5; const bw = L / n;
    const ops = []; for (let i = 0; i < n; i++) { const c = bw * (i + 0.5); ops.push({ s0: c - 1.15, s1: c + 1.15, y0: FL + 1.6, y1: EAVE - 1.6, arch: true }); }
    K.wall(R, BR, 0, L, -1.5, EAVE, ops, 0.45);
    for (const o of ops) { K.fill(R, { ...o, muntins: 5 }, { glass: GL, frame: FR, mull: 2, rev: 0.35, sillMat: BR }); const g = new THREE.RingGeometry(1.15, 1.45, 14, 1, 0, Math.PI); g.translate((o.s0 + o.s1) / 2, o.y1 - 1.15, 0.03); K.addRun(R, BR, g); }
    for (let i = 0; i <= n; i++) K.rbox(R, BR, bw * i - 0.4, -1.5, 0, bw * i + 0.4, EAVE - 0.2, 0.18);
    lombardFrieze(K, R, BR, 0, L, EAVE - 1.1, { w: 0.62, p: 0.18 });
  }
  { const R = K.run([H.u1, H.v0], [H.u0, H.v0]); K.wall(R, BR, 0, R.L, -1.5, EAVE, [], 0.45); lombardFrieze(K, R, BR, 0, R.L, EAVE - 1.1, { w: 0.62, p: 0.18 }); }
  K.box(M.concreteDark, H.u0 + 0.6, -1.5, H.v0 + 0.6, H.u1 - 0.6, EAVE - 0.05, H.v1 - 0.6);
  K.hip(tint(K, M.slate, 0x8f8a80, 'oagRoof'), H.u0 - 0.35, H.v0 - 0.35, H.u1 + 0.35, H.v1 + 0.35, EAVE - 0.03, 0.5);
  colliders.push(K.colPoly([[H.u0, H.v0], [H.u1, H.v0], [H.u1, H.v1], [H.u0, H.v1]], -1.5, 15));
  // ---------- rear annex (flat roof, one storey) ----------
  {
    const poly = [[-5.81, -6.79], [-12.26, -5.69], [-13.83, -14.95], [2.7, -17.7], [3.79, -16.91], [5.4, -7.24]];
    const top = 5.4;
    K.prism(BR, poly, -1.5, top); K.prism(M.concreteDark, poly, top, top + 0.05);
    K.loop(BR, poly, [[0.05, top - 0.3], [0.15, top - 0.2], [0.15, top + 0.15], [0.0, top + 0.2]]);
    for (const [a, b] of [[poly[1], poly[2]], [poly[2], poly[3]]]) { const R = K.run(a, b, 0.01); const n = Math.floor(R.L / 3.2); for (let i = 0; i < n; i++) { const c = R.L * (i + 0.5) / n; K.rbox(R, GL, c - 0.7, 1.4, 0, c + 0.7, 3.8, 0.02); K.rbox(R, BR, c - 0.85, 3.8, 0, c + 0.85, 4.05, 0.08); } }
    colliders.push(K.colPoly(poly, -1.5, top + 0.3));
  }
  shrubRow(K, [H.u0, H.v1], [H.u0, H.v0 + 2], 0.8, { h: 0.9 });
  drapeStrip(K, [[H.u0 - 2, H.v1], [H.u1 + 2, H.v1]], 3.5, M.paving, { closed: false });
  const object3d = K.finish(); object3d.name = 'old-art-gallery';
  return { object3d, colliders, walkables };
}
