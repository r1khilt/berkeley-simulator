// Eshleman Hall (Moore Ruble Yudell, 2015): the ASUC/student-government building that closes the south side of Lower
// Sproul Plaza on Bancroft Way, replacing the 1965 tower. A five-storey slab of warm sand rainscreen panels with long
// ribbon windows and thin projecting eaves; on the plaza a four-storey glass curtain wall with silver floor bands
// cantilevers over a recessed glazed ground floor; a lower stepped wing to the west. Massing from the 2021 LiDAR:
// main roof 25.3 m (≈20.5 m above Lower Sproul), west wing 21.5 m, south-west block 11 m, rooftop plant to 29 m.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { glassBand, pipeRail, tinted, tone } from './lib/b01-kit.js';

export const info = {
  id: 'eshleman-hall',
  name: 'Eshleman Hall',
  subtitle: 'Moore Ruble Yudell · 2015',
  blurb: 'Rebuilt in 2015 as part of the Lower Sproul redevelopment, Eshleman Hall houses the ASUC student government and hundreds of student organizations on the south side of Lower Sproul Plaza.',
  replaces: ['w/417682513'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9);
  const K = new Kit(ctx, ANG); const M = ctx.M; const g = (u, v) => K.g(u, v);
  const colliders = [], walkables = [];
  // [r5-sproul] photos (MRY 385-UCB_0012/0013/0024a): warm beige ribbed terracotta rainscreen (#CFC1A6), not grey-mauve paint
  const sand = tone(M.concrete, 0xc9bb9f, undefined, { roughness: 0.75 }), sandD = tone(M.concrete, 0xa89a80, undefined, { roughness: 0.8 });
  const orange = tinted(M.whitePaint, 0xd9643a, { roughness: 0.6 }); // [r5-sproul] the signature orange soffits
  const colC = tone(M.concrete, 0xbab7b0); // [r5-sproul] round board-smooth concrete columns
  const silver = tinted(M.iron, 0xd8dee6, { metalness: 0.55, roughness: 0.3 });
  const eave = tinted(M.whitePaint, 0xdcdcd8);
  const cglass = tinted(M.windowNight, 0x7fa3c4, { metalness: 0.45, roughness: 0.05 });
  const sglass = tinted(M.glassLight, 0x7f97a6, { opacity: 0.5 });
  const louvre = tinted(M.iron, 0x5c5f62, { metalness: 0.5, roughness: 0.5 });
  const turq = tinted(M.whitePaint, 0x3fa7b5);
  const U0 = -21.5, U1 = 34.0, V0 = -9.6, V1 = 9.0, TOP = 25.3;
  const GP = g(6, V0 - 2); // Lower Sproul level in front of the hall
  const F1 = GP + 4.8, FL = [F1, F1 + 4.15, F1 + 8.3, F1 + 12.45]; // floor levels above the ground floor
  // ---- core + roof ----
  K.box(M.concreteDark, U0 + 0.4, -1.5, V0 + 3.0, U1 - 0.4, TOP - 0.3, V1 - 0.4);
  K.box(M.concreteDark, U0 + 0.4, F1, V0 + 0.4, U1 - 0.4, TOP - 0.3, V0 + 3.1);
  K.box(eave, U0 - 1.2, TOP - 0.3, V0 - 1.2, U1 + 1.2, TOP, V1 + 1.2);
  colliders.push(K.colPoly([[U0, V0 + 1.5], [U1, V0 + 1.5], [U1, V1], [U0, V1]], -2, TOP));
  // ribbon-window sand façade
  const ribbon = (R, s0, s1, y0, y1, levels) => {
    K.rbox(R, sand, s0, y0, -0.3, s1, y1, 0.0);
    let row = 0; for (let y = y0 + 0.6; y < y1; y += 0.6, row++) { K.rbox(R, sandD, s0, y - 0.012, 0.0, s1, y + 0.012, 0.008, { detail: true }); if (row % 2 === 0) for (let s = s0 + (row % 4) * 0.6 + 1.2; s < s1; s += 2.4) K.rbox(R, sandD, s - 0.01, y - 0.6, 0.0, s + 0.01, y + 0.6, 0.008, { detail: true }); }
    for (const lv of levels) { glassBand(K, R, s0 + 0.6, s1 - 0.6, lv + 1.0, lv + 2.4, { glass: cglass, frame: silver, pitch: 1.5, rec: 0.25 });
      for (let a = s0 + 2.0 + ((lv * 7) % 5); a < s1 - 10; a += 22) for (let s = a; s < a + 9; s += 0.15) K.rbox(R, louvre, s, lv + 1.0, 0.02, s + 0.04, lv + 2.4, 0.18, { detail: true }); }
  };
  // ---- NORTH (Lower Sproul): glass curtain wall over a recessed ground floor (east two-thirds), sand slab (west third) ----
  {
    const R = K.run([U1, V0], [U0, V0]); const L = R.L; const cw = 38.0; // curtain-wall length from the east end
    // recessed ground floor storefronts under the cantilever
    const Rg = K.run([U1, V0 + 2.5], [U0, V0 + 2.5]);
    glassBand(K, Rg, 0.5, L - 0.5, GP - 0.6, F1, { glass: sglass, frame: silver, pitch: 1.5, transoms: [GP + 2.8], doors: [{ s0: 9.0, s1: 10.8, h: 2.4 }, { s0: 24.0, s1: 25.8, h: 2.4 }] });
    K.rbox(Rg, turq, 12.5, GP + 0.3, -0.42, 13.2, GP + 2.6, -0.4, { detail: true }); K.rbox(Rg, tinted(M.whitePaint, 0x2f6fa6), 8.0, GP + 0.4, 0.02, 8.7, GP + 3.2, 0.1);
    K.rbox(Rg, tinted(M.stucco, 0xe4d2b0), 0.5, GP - 0.6, -0.5, L - 0.5, F1, -0.45);
    K.rbox(R, eave, -0.3, F1 - 0.2, -2.5, L + 0.3, F1, 0.3); // slab edge over the recessed storefronts
    K.rbox(R, orange, -0.25, F1 - 0.45, -2.48, L + 0.25, F1 - 0.2, 0.28); // [r5-sproul] orange soffit (photo #E0663A)
    // [r5-sproul] round concrete columns (~0.7 m, ~7.5 m bays) instead of slim silver posts
    for (let s = 4.5; s < L - 2; s += 7.6) { const p = R.at(s, -0.9); K.cyl(colC, p[0], GP - 0.6, p[1], 0.36, 0.36, F1 - 0.45 - GP + 0.6, 18); colliders.push(K.colCyl(p[0], p[1], 0.4, GP - 1, F1)); }
    // curtain wall (4 storeys) with silver floor bands, irregular mullion rhythm
    for (let k = 0; k < 4; k++) {
      const y0 = FL[k], y1 = (FL[k + 1] ?? TOP - 0.3);
      glassBand(K, R, 0, cw, y0 + 0.8, y1 - 0.1, { glass: cglass, frame: tinted(M.darkBronze, 0x2a2e33), pitch: 1.5, rec: 0.1 });
      for (let s = 0; s <= cw + 0.01; s += 6.0) K.rbox(R, silver, s - 0.3, y0, -0.1, s + 0.3, y1, 0.14);
      K.rbox(R, silver, -0.1, y0 - 0.1, -0.1, cw, y0 + 0.8, 0.12);
    }
    ribbon(R, cw, L, F1, TOP - 0.3, FL);
    // [r5-sproul] staggered two-storey glass bay boxes projecting 0.9 m, light frames, orange undersides (photo 0013/0024a)
    for (const [s0, k] of [[3.0, 0], [10.5, 1], [17.5, 0], [24.0, 2], [31.0, 1], [43.0, 1], [50.5, 0]]) {
      if (s0 + 3.2 > L - 0.5) continue; const y0 = FL[k] + 0.4, y1 = (FL[k + 2] ?? TOP - 0.3) - 0.2;
      K.rbox(R, cglass, s0, y0, 0.1, s0 + 3.0, y1, 0.95);
      for (const [a0, a1] of [[s0, s0 + 0.08], [s0 + 2.92, s0 + 3.0]]) K.rbox(R, silver, a0, y0, 0.1, a1, y1, 1.0);
      K.rbox(R, silver, s0, y1 - 0.1, 0.1, s0 + 3.0, y1 + 0.05, 1.0); K.rbox(R, orange, s0, y0 - 0.18, 0.1, s0 + 3.0, y0, 1.0);
      K.rbox(R, silver, s0, (y0 + y1) / 2 - 0.06, 0.9, s0 + 3.0, (y0 + y1) / 2 + 0.06, 1.0, { detail: true });
    }
    colliders.push(K.colPoly([[U0, V0], [U1, V0], [U1, V0 + 1.7], [U0, V0 + 1.7]], F1 - 0.4, TOP));
  }
  // ---- SOUTH (Bancroft), EAST and WEST faces: sand slab with ribbon windows and a stepped upper eave ----
  for (const [a, b] of [[[U0, V1], [U1, V1]], [[U1, V1], [U1, V0]]]) {
    const R = K.run(a, b); const gmin = Math.min(g(...a), g(...b)) - 0.5;
    glassBand(K, R, 0.5, R.L - 0.5, gmin, F1, { glass: cglass, frame: silver, pitch: 1.5, transoms: [g(...a) + 2.8], doors: R.L > 30 ? [{ s0: R.L / 2 - 1, s1: R.L / 2 + 1, h: 2.4 }] : [] });
    ribbon(R, 0, R.L, F1, TOP - 0.3, FL);
    K.rbox(R, eave, -0.4, FL[3] - 0.25, 0.0, R.L + 0.4, FL[3], 1.0); // thin intermediate eave
  }
  // ---- west wing (21.5 m) and stepped south-west block (11 m) ----
  {
    const w0 = -30.5, wv0 = -6.5, wT = 21.5;
    K.box(M.concreteDark, w0 + 0.4, -1.5, wv0 + 0.4, U0 + 0.4, wT - 0.3, V1 - 0.4);
    K.box(eave, w0 - 1.0, wT - 0.3, wv0 - 1.0, U0, wT, V1 + 1.0);
    for (const [a, b] of [[[U0, wv0], [w0, wv0]], [[w0, wv0], [w0, V1]], [[w0, V1], [U0, V1]]]) { const R = K.run(a, b); const gm = Math.min(g(...a), g(...b)) - 0.5; K.rbox(R, sand, 0, gm, -0.3, R.L, F1, 0.0); glassBand(K, R, 0.4, R.L - 0.4, gm + 0.5, F1 - 0.6, { glass: cglass, frame: silver, pitch: 1.5, rec: 0.12 }); ribbon(R, 0, R.L, F1, wT - 0.3, FL.slice(0, 3)); }
    colliders.push(K.colPoly([[w0, wv0], [U0, wv0], [U0, V1], [w0, V1]], -2, wT));
    // glazed bridge at level 2 running west from the curtain wall (over the passage)
    K.box(sglass, w0 - 14.0, F1 + 0.4, wv0 + 0.5, w0, F1 + 3.6, wv0 + 4.0); K.box(silver, w0 - 14.0, F1 - 0.5, wv0 + 0.4, w0, F1 + 0.4, wv0 + 4.1); K.box(eave, w0 - 14.1, F1 + 3.6, wv0 + 0.3, w0, F1 + 3.9, wv0 + 4.2);
    for (const u of [w0 - 13.6, w0 - 7.0]) K.box(silver, u - 0.2, g(u, wv0 + 2.2) - 0.5, wv0 + 2.0, u + 0.2, F1 - 0.5, wv0 + 2.4);
    const s0 = -37.0, sv0 = 2.4, sT = 11.0;
    K.box(sand, s0, -1.5, sv0, w0, sT - 0.3, V1 + 0.2); K.box(eave, s0 - 0.8, sT - 0.3, sv0 - 0.8, w0, sT, V1 + 1.0);
    for (const [a, b] of [[[s0, sv0], [s0, V1 + 0.2]], [[w0, sv0], [s0, sv0]], [[s0, V1 + 0.2], [w0, V1 + 0.2]]]) { const R = K.run(a, b); glassBand(K, R, 0.4, R.L - 0.4, g(...a) + 0.6, sT - 1.2, { glass: cglass, frame: silver, pitch: 1.5, rec: -0.02, transoms: [g(...a) + 3.6] }); }
    pipeRail(K, silver, [[w0 - 0.2, sv0 + 0.2], [s0 + 0.2, sv0 + 0.2], [s0 + 0.2, V1]], sT, { h: 1.1 });
    colliders.push(K.colPoly([[s0, sv0], [w0, sv0], [w0, V1], [s0, V1]], -2, sT));
    walkables.push(K.walkPoly([[s0, sv0], [w0, sv0], [w0, V1], [s0, V1]], sT));
  }
  // ---- rooftop plant (dark louvred boxes) ----
  for (const [a0, b0, a1, b1, y1] of [[10.5, -6.5, 17.0, 1.0, 27.8], [28.0, 1.5, 33.6, 5.2, 29.0]]) {
    K.box(louvre, a0, TOP, b0, a1, y1, b1);
    for (let u = a0 + 0.2; u < a1; u += 0.3) K.box(M.iron, u, TOP + 0.4, b0 - 0.06, u + 0.1, y1 - 0.3, b0, { detail: true });
  }
  const object3d = K.finish();
  object3d.name = 'eshleman-hall';
  return { object3d, colliders, walkables };
}
