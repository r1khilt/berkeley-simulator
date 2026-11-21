// Spieker Aquatics Complex (Legends Aquatic Center), UC Berkeley: Cal's outdoor competition pool beside the RSF.
// A 50 m × 25 m tank of turquoise water with blue/yellow racing lane lines, white coping and starting blocks, backstroke
// flags in blue and lime, a broom-finished concrete deck, and ten rows of aluminium bleachers along the east side
// (LiDAR: stands rising from ~1 m to ~8 m; deck ≈ ground level). The duplicate OSM relation r/1734952 is suppressed by
// its own (empty) module so no procedural block is drawn over the water.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { pipeRail, tinted } from './lib/b01-kit.js';

export const info = {
  id: 'spieker-aquatics-complex',
  name: 'Spieker Aquatics Complex',
  subtitle: 'Cal swimming, diving & water polo',
  blurb: 'Home pool of Cal swimming and water polo: an outdoor 50-metre competition pool with spectator stands, next to the Recreational Sports Facility.',
  replaces: ['w/109191199'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  const deck = tinted(M.paving, 0xe8e2d6), coping = tinted(M.whitePaint, 0xe6e4de);
  const water = tinted(M.water, 0x2fa9cf, { roughness: 0.04, metalness: 0.05, transparent: true, opacity: 0.88 });
  const tank = tinted(M.whitePaint, 0x9fd6e6), stripe = tinted(M.whitePaint, 0x1b2a5c);
  const blueF = tinted(M.whitePaint, 0x1f4fb5), yellowF = tinted(M.whitePaint, 0xf2c21a), lime = tinted(M.whitePaint, 0xc8d83a);
  const alu = tinted(M.iron, 0xb8bcc0, { metalness: 0.75, roughness: 0.35 }), fence = tinted(M.blackPaint, 0x2b2b2b);
  const D0 = [-22.7, -31.6, 13.0, 29.7]; // deck area (west of the stands)
  const Y = Math.max(g(-5, 0), g(-20, -25), g(10, 25), g(-20, 25), g(10, -28)) + 0.45; // deck level (raised slab so the water sits above the terrain)
  walkables.push(K.walkPoly([[D0[0], D0[1]], [D0[2], D0[1]], [D0[2], D0[3]], [D0[0], D0[3]]], Y));
  // 50 m pool (long axis north–south)
  const P = [-19.0, -27.0, 6.0, 23.0], WL = Y - 0.15;
  // deck slab around the tank (no slab over the water)
  for (const [a0, b0, a1, b1] of [[D0[0], D0[1], D0[2], P[1] - 0.2], [D0[0], P[3] + 0.2, D0[2], D0[3]], [D0[0], P[1] - 0.2, P[0] - 0.2, P[3] + 0.2], [P[2] + 0.2, P[1] - 0.2, D0[2], P[3] + 0.2]]) K.box(deck, a0, Y - 1.2, b0, a1, Y, b1);
  K.box(tank, P[0], Y - 3.2, P[1], P[2], Y - 2.2, P[3]);
  K.box(tank, P[0], Y - 2.2, P[1], P[2], Y - 2.0, P[3]);
  for (const [a0, b0, a1, b1] of [[P[0] - 0.2, P[1] - 0.2, P[2] + 0.2, P[1]], [P[0] - 0.2, P[3], P[2] + 0.2, P[3] + 0.2], [P[0] - 0.2, P[1], P[0], P[3]], [P[2], P[1], P[2] + 0.2, P[3]]]) K.box(tank, a0, Y - 2.2, b0, a1, Y - 0.02, b1);
  for (let i = 0; i < 10; i++) { const u = P[0] + 2.5 * (i + 0.5); K.box(stripe, u - 0.13, Y - 1.99, P[1] + 2.0, u + 0.13, Y - 1.98, P[3] - 2.0); K.box(stripe, u - 0.5, Y - 1.99, P[1] + 1.7, u + 0.5, Y - 1.98, P[1] + 2.0); K.box(stripe, u - 0.5, Y - 1.99, P[3] - 2.0, u + 0.5, Y - 1.98, P[3] - 1.7); }
  K.box(water, P[0], WL - 0.02, P[1], P[2], WL, P[3]);
  // coping + gutter lip
  for (const [a0, b0, a1, b1] of [[P[0] - 0.5, P[1] - 0.5, P[2] + 0.5, P[1]], [P[0] - 0.5, P[3], P[2] + 0.5, P[3] + 0.5], [P[0] - 0.5, P[1], P[0], P[3]], [P[2], P[1], P[2] + 0.5, P[3]]]) K.box(coping, a0, Y - 0.02, b0, a1, Y + 0.06, b1);
  // lane lines: blue with yellow last 5 m and centre
  for (let i = 1; i < 10; i++) {
    const u = P[0] + 2.5 * i;
    for (let v = P[1] + 0.1; v < P[3] - 0.1; v += 0.5) { const yel = v < P[1] + 5 || v > P[3] - 5 || Math.abs(v - (P[1] + P[3]) / 2) < 1.0; K.box(yel ? yellowF : blueF, u - 0.06, WL - 0.03, v, u + 0.06, WL + 0.07, v + 0.42, { detail: true }); }
  }
  // starting blocks (north end)
  for (let i = 0; i < 10; i++) { const u = P[0] + 2.5 * (i + 0.5); K.box(coping, u - 0.3, Y, P[1] - 1.2, u + 0.3, Y + 0.7, P[1] - 0.6); K.box(M.iron, u - 0.05, Y, P[1] - 1.25, u + 0.05, Y + 0.35, P[1] - 1.15, { detail: true }); }
  // backstroke flags 5 m from each end
  for (const v of [P[1] + 5, P[3] - 5]) {
    for (const u of [P[0] - 1.0, P[2] + 1.0]) K.cyl(M.iron, u, Y, v, 0.04, 0.04, 2.2, 6, { detail: true });
    K.box(M.iron, P[0] - 1.0, Y + 2.1, v - 0.01, P[2] + 1.0, Y + 2.12, v + 0.01, { detail: true });
    for (let u = P[0] - 0.7, k = 0; u < P[2] + 0.8; u += 0.5, k++) { const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0.2, -0.45)]); const tg = new THREE.ShapeGeometry(tri); tg.translate(u - 0.2, Y + 2.1, v); K.add(k % 2 ? lime : blueF, tg, { detail: true }); const tg2 = tg.clone(); tg2.rotateY(Math.PI); tg2.translate(2 * u, 0, 2 * v); K.add(k % 2 ? lime : blueF, tg2, { detail: true }); }
  }
  // aluminium bleachers along the east (10 rows rising east, LiDAR to ~8 m)
  { const s0 = 13.0, s1 = 22.6, b0 = -24.0, b1 = 27.0, n = 10; const run = (s1 - s0) / n;
    for (let i = 0; i < n; i++) { const u0 = s0 + i * run, top = Y + 0.6 + i * 0.74; K.box(alu, u0, top - 0.12, b0, u0 + run, top, b1); K.box(alu, u0 + run * 0.45, top - 0.74 + 0.3, b0, u0 + run * 0.6, top - 0.12, b1, { detail: true }); }
    K.box(tinted(M.iron, 0x7a7e82), s0, g(s0, 0) - 0.5, b0, s1, Y + 0.3, b1); // understructure skirt
    for (let v = b0; v <= b1; v += 3.0) { const gg = new THREE.BoxGeometry(Math.hypot(s1 - s0, 7.4), 0.15, 0.15); gg.rotateZ(Math.atan2(7.4, s1 - s0)); gg.translate((s0 + s1) / 2, Y + 3.9, v); K.add(M.iron, gg, { detail: true }); }
    pipeRail(K, alu, [[s1 - 0.1, b0], [s1 - 0.1, b1]], Y + 0.6 + (n - 1) * 0.74, { h: 1.07 });
    pipeRail(K, alu, [[s0 + 0.1, b0], [s1, b0]], (u) => Y + 0.6 + Math.max(0, (u - s0) / run - 1) * 0.74, { h: 1.0 });
    walkables.push({ type: 'fn', ...(() => { const c = [K.xz(s0, b0), K.xz(s1, b0), K.xz(s1, b1), K.xz(s0, b1)]; const xs = c.map((p) => p[0]), zs = c.map((p) => p[1]); return { bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)] }; })(), heightAt: (x, z) => { const [u, v] = K.uv(x, z); if (u < s0 || u > s1 || v < b0 || v > b1) return null; return Y + 0.6 + Math.min(n - 1, Math.floor((u - s0) / run)) * 0.74; } });
    colliders.push(K.colPoly([[s1 - 0.2, b0], [s1, b0], [s1, b1], [s1 - 0.2, b1]], Y, Y + 9));
  }
  // perimeter fence and light poles
  for (const [a, b] of [[[D0[0], D0[1]], [23.5, D0[1]]], [[D0[0], D0[3]], [23.5, D0[3]]], [[D0[0], D0[1]], [D0[0], D0[3]]]]) {
    const R = K.run(a, b); for (let s = 0; s < R.L; s += 2.5) { const p = R.at(s); K.cyl(fence, p[0], Y, p[1], 0.03, 0.03, 2.4, 6, { detail: true }); }
    K.rbox(R, tinted(M.blackPaint, 0x2b2b2b, { transparent: true, opacity: 0.35 }), 0, Y, -0.01, R.L, Y + 2.4, 0.01);
    colliders.push(K.colPoly([a, b, [b[0] + 0.01, b[1] + 0.01], [a[0] + 0.01, a[1] + 0.01]], Y - 1, Y + 2.4));
  }
  for (const [u, v] of [[D0[0] + 0.5, D0[1] + 0.5], [D0[0] + 0.5, D0[3] - 0.5], [12.5, D0[1] + 0.5], [12.5, D0[3] - 0.5]]) { K.cyl(M.iron, u, Y, v, 0.18, 0.12, 18, 8); K.box(M.iron, u - 0.9, Y + 17.6, v - 0.4, u + 0.9, Y + 18.6, v + 0.4); K.box(M.lampGlow, u - 0.85, Y + 17.55, v - 0.35, u + 0.85, Y + 17.6, v + 0.35, { detail: true }); }
  const object3d = K.finish();
  object3d.name = 'spieker-aquatics-complex';
  return { object3d, colliders, walkables };
}
