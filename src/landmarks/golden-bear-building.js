// Golden Bear Building, 1995 University Avenue (downtown Berkeley): a UC office block with street-level retail. Cream
// precast grid with horizontal strip windows, a fully glazed central bay, slightly projecting end pavilions, an arcade
// of square piers sheltering shopfronts with green awnings, and a set-back glazed top floor under a thin roof slab.
// Massing from the 2021 LiDAR: main roof 22 m, top floor 26 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'golden-bear-building',
  name: 'Golden Bear Building',
  subtitle: '1995 University Avenue',
  blurb: 'A downtown office building on University Avenue used by UC Berkeley departments, with shops at street level.',
  replaces: ['w/43178796'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-8.6);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [];
  const cream = tone(M.concrete, 0xe2dccf), creamD = tone(M.concrete, 0xcfc8ba);
  const glass = tinted(M.windowNight, 0x4f7a80), frame = tinted(M.iron, 0xa9adae, { metalness: 0.6, roughness: 0.35 });
  const awning = tinted(M.whitePaint, 0x2f5a3a), shop = tinted(M.glassLight, 0x5a7076, { opacity: 0.5 }), warm = tinted(M.stucco, 0xe8d3ad);
  const U0 = -47.8, U1 = 46.6, V0 = -16.9, V1 = 16.8, TOP = 22.0, G = Math.max(g(0, V1 + 2), g(0, V0 - 2), g(U0 - 2, 0), g(U1 + 2, 0)), F1 = G + 4.6;
  K.box(M.concreteDark, U0 + 0.5, -1.5, V0 + 0.5, U1 - 0.5, TOP - 0.3, V1 - 0.5);
  colliders.push(K.colPoly([[U0, V0], [U1, V0], [U1, V1], [U0, V1]], -2, TOP));
  const faces = [[[U0, V1], [U1, V1]], [[U1, V0], [U0, V0]], [[U1, V1], [U1, V0]], [[U0, V0], [U0, V1]]];
  for (const [a, b] of faces) {
    const R = K.run(a, b); const L = R.L; const gm = Math.min(g(...a), g(...b)) - 0.5; const long = L > 50;
    const nb = Math.max(2, Math.round(L / 6.0)); const bay = L / nb; const mid = long ? [L / 2 - 6, L / 2 + 6] : [-1, -1];
    // ground-floor shopfronts behind square piers + green awnings
    glassBand(K, R, 0.3, L - 0.3, gm, F1 - 0.4, { glass: shop, frame, pitch: 1.5, transoms: [G + 3.0], rec: 1.6, doors: [{ s0: L / 2 - 1.2, s1: L / 2 + 1.2, h: 2.5 }] });
    K.rbox(R, warm, 0.3, gm, -2.1, L - 0.3, F1 - 0.4, -2.0);
    K.rbox(R, cream, -0.2, F1 - 0.6, -1.6, L + 0.2, F1 + 0.3, 0.1);
    for (let i = 0; i <= nb; i++) K.rbox(R, cream, i * bay - 0.45, gm, -0.3, i * bay + 0.45, F1, 0.3);
    if (long) for (let i = Math.round(nb * 0.6); i < nb; i++) { const s0 = i * bay + 0.6, s1 = (i + 1) * bay - 0.6; const gg = new THREE.BoxGeometry(s1 - s0, 0.08, 1.4); gg.rotateX(-0.35); gg.translate((s0 + s1) / 2, G + 3.2, 0.65); K.addRun(R, awning, gg); }
    // office floors: cream grid + strip windows; central curtain-wall bay on the long faces
    const floors = [F1 + 0.3, F1 + 4.3, F1 + 8.3, F1 + 12.3];
    for (const fy of floors) {
      K.rbox(R, cream, 0, fy, -0.3, L, fy + 1.2, 0.0);
      for (let i = 0; i < nb; i++) { const s0 = i * bay + 0.45, s1 = (i + 1) * bay - 0.45; if (s1 > mid[0] && s0 < mid[1]) continue; glassBand(K, R, s0, s1, fy + 1.2, fy + 4.0, { glass, frame, pitch: (s1 - s0) / 3.5, rec: 0.22 }); }
    }
    for (let i = 0; i <= nb; i++) { const s = i * bay; if (s > mid[0] && s < mid[1]) continue; K.rbox(R, cream, s - 0.45, F1, -0.3, s + 0.45, TOP, 0.25); }
    if (long) { glassBand(K, R, mid[0], mid[1], F1 + 0.3, TOP - 0.6, { glass, frame, pitch: 1.2, transoms: floors.map((f) => f + 0.15), rec: -0.15 }); for (const s of mid) K.rbox(R, creamD, s - 0.6, F1, -0.3, s + 0.6, TOP + 0.4, 0.55); }
    for (const s of [0, L]) K.rbox(R, creamD, s - 3.0 * Math.sign(s - L / 2 || 1) * 0, F1, -0.3, s, TOP, 0.0);
    K.rbox(R, cream, -0.3, TOP - 0.6, -0.3, L + 0.3, TOP + 0.5, 0.35); // parapet / cornice
  }
  // end pavilions project slightly on the long faces
  for (const u of [U0, U1 - 8.0]) for (const [v, side] of [[V1, 1], [V0, -1]]) K.box(creamD, u, F1, Math.min(v, v + side * 0.5), u + 8.0, TOP + 0.5, Math.max(v, v + side * 0.5));
  // set-back glazed top floor (LiDAR 26 m) under a thin overhanging roof slab
  { const a0 = -24.0, b0 = -12.5, a1 = 30.0, b1 = 4.0; K.box(M.concreteDark, a0 + 0.3, TOP, b0 + 0.3, a1 - 0.3, 25.6, b1 - 0.3);
    for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) { const R = K.run(p, q); glassBand(K, R, 0, R.L, TOP + 0.2, 25.6, { glass, frame, pitch: 1.5, rec: 0.05 }); }
    K.box(frame, a0 - 1.0, 25.6, b0 - 1.0, a1 + 1.0, 26.0, b1 + 1.0); }
  K.box(creamD, U0 + 0.3, TOP - 0.1, V0 + 0.3, U1 - 0.3, TOP, V1 - 0.3);
  const object3d = K.finish();
  object3d.name = 'golden-bear-building';
  return { object3d, colliders, walkables: [] };
}
