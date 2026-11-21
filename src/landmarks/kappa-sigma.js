// Kappa Sigma (ΚΣ), Beta Xi chapter, 2400 Warring Street at Channing Way. A 1960s Bay Area modernist chapter house:
// a long two-storey box clad in pale grey vertical-groove siding, cantilevered over a shadowy open ground floor of square
// stucco piers and parking; flat roof with a thin white fascia, horizontal ribbon windows on the Channing end, smaller
// paired windows along the sides, a recessed balcony notch and concrete steps up from the sidewalk. The street falls
// west along Channing, so the downhill end shows all three levels. Plan from OSM; heights from the LiDAR-derived model.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { hmat } from './lib/greek-kit.js';

export const info = {
  id: 'kappa-sigma',
  name: 'Kappa Sigma',
  subtitle: 'ΚΣ · 2400 Warring Street',
  blurb: 'Chapter house of the Beta Xi chapter of Kappa Sigma at Warring Street and Channing Way, a mid-century modern box raised over an open, pier-supported ground floor.',
  replaces: ['w/473598585'],
};

export async function build(ctx) {
  const M = ctx.M; const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.6));
  // vertical T1-11 style siding: the shared lap-siding texture turned 90 degrees
  const lap = hmat(ctx, 'clap', '#d0d3d2'); const siding = lap.clone(); siding.map = lap.map.clone(); siding.map.center.set(0.5, 0.5); siding.map.rotation = Math.PI / 2; siding.map.needsUpdate = true;
  if (lap.bumpMap) { siding.bumpMap = lap.bumpMap.clone(); siding.bumpMap.center.set(0.5, 0.5); siding.bumpMap.rotation = Math.PI / 2; siding.bumpMap.needsUpdate = true; }
  const stucco = hmat(ctx, 'stucco', '#c4c6c2'), fascia = siding, soffit = hmat(ctx, 'paint', '#d9d6cc');
  const dark = hmat(ctx, 'paint', '#2a2c2e'), frame = hmat(ctx, 'paint', '#6f7478'), glass = M.windowNight, pier = M.concrete;
  const colliders = [], walkables = [];
  const U0 = -10.7, U1 = 10.7, V0 = -13.8, V1 = 13.8;
  const YB = 2.7, YT = 9.5, ST = 3.05;              // cantilever underside, roof, storey height
  const IN = 2.4;                                    // ground-floor inset on the open (west / north) sides
  // ---- ground level: slab, enclosed core on the uphill (east) side, open carport elsewhere ----
  const gW = K.gMin(U0, V0, U0 + 2, V1, 6); const slabY = Math.max(gW + 0.05, -0.35);
  K.box(M.concrete, U0 + 0.2, slabY - 0.6, V0 + 0.2, U1 - 0.2, slabY, V1 - 0.2);
  walkables.push(K.walkPoly([[U0 + 0.2, V0 + 0.2], [U1 - 0.2, V0 + 0.2], [U1 - 0.2, V1 - 0.2], [U0 + 0.2, V1 - 0.2]], slabY));
  K.box(dark, U0 + IN, slabY, V0 + IN, 4.5, YB, V0 + IN + 0.25); // dark recessed back walls (shadow)
  K.box(dark, U0 + IN, slabY, V0 + IN, U0 + IN + 0.25, YB, V1 - IN);
  K.box(stucco, 4.5, slabY - 0.5, V0 + 2.6, U1, YB, V1 - 0.6); // enclosed core / retaining base on the uphill side, set back under the overhang
  K.box(soffit, U0 + 0.05, YB - 0.12, V0 + 0.05, U1 - 0.05, YB - 0.02, V1 - 0.05); // lit soffit under the cantilever
  colliders.push(K.colPoly([[4.5, V0 + 2.6], [U1, V0 + 2.6], [U1, V1 - 0.6], [4.5, V1 - 0.6]], slabY - 1, YT + 1));
  // square stucco piers carrying the cantilever
  for (const u of [U0 + 0.5, -4.0, 1.5]) for (const v of [V0 + 0.5, V1 - 0.5]) { K.box(pier, u - 0.25, slabY - 0.5, v - 0.25, u + 0.25, YB, v + 0.25); colliders.push(K.colCyl(u, v, 0.36, slabY - 1, YB)); }
  for (const v of [V0 + 0.5, -4.6, 4.6, V1 - 0.5]) { const u = U0 + 0.5; K.box(pier, u - 0.25, slabY - 0.5, v - 0.25, u + 0.25, YB, v + 0.25); colliders.push(K.colCyl(u, v, 0.36, slabY - 1, YB)); }
  // a parked car or two in the carport (simple boxes)
  for (const [u, v, c] of [[-6.5, -8.5, '#7a1f24'], [-6.5, 2.0, '#3b4652']]) { const cm = hmat(ctx, 'metal', c); K.box(cm, u - 2.2, slabY + 0.3, v - 0.9, u + 2.2, slabY + 0.95, v + 0.9, { detail: true }); K.box(cm, u - 1.2, slabY + 0.95, v - 0.8, u + 1.0, slabY + 1.4, v + 0.8, { detail: true }); K.box(glass, u - 1.15, slabY + 0.97, v - 0.82, u + 0.95, slabY + 1.36, v + 0.82, { detail: true }); for (const du of [-1.4, 1.4]) for (const dv of [-0.85, 0.85]) K.box(M.blackPaint, u + du - 0.33, slabY, v + dv - 0.12, u + du + 0.33, slabY + 0.62, v + dv + 0.12, { detail: true }); }
  // ---- the cantilevered upper volume ----
  K.box(fascia, U0, YB - 0.05, V0, U1, YB + 0.35, V1); // floor slab edge / soffit band
  const faces = [ // runs with the building on the left: S (+v) west->east, E north<-south, N east->west, W
    { f: 'S', R: K.run([U0, V1], [U1, V1]) }, { f: 'E', R: K.run([U1, V1], [U1, V0]) },
    { f: 'N', R: K.run([U1, V0], [U0, V0]) }, { f: 'W', R: K.run([U0, V0], [U0, V1]) },
  ];
  for (const { f, R } of faces) {
    const L = R.L; const ops = [];
    const f0 = YB + 0.35; const W = (s0, w, k, sill, h, kind) => ops.push({ s0, s1: s0 + w, y0: f0 + k * ST + sill, y1: f0 + k * ST + sill + h, ribbon: kind || 1 });
    if (f === 'N') { W(1.4, 3.5, 0, 0.9, 1.6, 4); W(8.6, 1.2, 0, 0.7, 1.8); W(13.2, 1.6, 0, 2.15, 0.5, 2); W(3.6, 1.2, 1, 0.8, 1.8); W(9.4, 3.5, 1, 0.9, 1.6, 4); ops.push({ s0: 15.0, s1: 20.0, y0: f0 + ST + 0.05, y1: f0 + 2 * ST - 0.35, notch: true }); }
    else if (f === 'E') { W(2.5, 1.2, 0, 0.7, 1.8); W(9.0, 1.6, 0, 2.15, 0.5, 2); W(15.5, 3.5, 0, 0.9, 1.6, 4); W(22.5, 1.2, 0, 0.7, 1.8); W(5.0, 3.5, 1, 0.9, 1.6, 4); W(13.0, 1.2, 1, 0.7, 1.8); W(19.5, 1.6, 1, 2.15, 0.5, 2); }
    else for (let s = 2.4; s < L - 2.0; s += 4.6) { W(s, 1.2, 0, 0.8, 1.5); W(s + 1.6, 1.2, 1, 0.8, 1.5); }
    K.wall(R, siding, 0, L, YB + 0.35, YT - 0.4, ops, 0.25);
    for (const o of ops) {
      if (o.notch) { // recessed balcony: deep dark reveal + rail
        K.rbox(R, siding, o.s0, o.y0, -1.6, o.s1, o.y0 + 0.02, -0.25); K.rbox(R, glass, o.s0, o.y0, -1.62, o.s1, o.y1, -1.58);
        for (let i = 0; i <= 14; i++) K.rbox(R, frame, o.s0 + (o.s1 - o.s0) * i / 14 - 0.015, o.y0, -0.2, o.s0 + (o.s1 - o.s0) * i / 14 + 0.015, o.y0 + 1.0, -0.17, { detail: true });
        K.rbox(R, frame, o.s0, o.y0 + 0.98, -0.22, o.s1, o.y0 + 1.04, -0.15); continue;
      }
      K.fill(R, o, { rev: 0.16, glass, frame, mull: o.ribbon - 1, tran: [] });
      K.rbox(R, frame, o.s0 - 0.1, o.y0 - 0.1, -0.02, o.s1 + 0.1, o.y0, 0.08); K.rbox(R, frame, o.s0 - 0.1, o.y1, -0.02, o.s1 + 0.1, o.y1 + 0.1, 0.08);
      for (const ss of [o.s0 - 0.1, o.s1]) K.rbox(R, frame, ss, o.y0, -0.02, ss + 0.1, o.y1, 0.08);
    }
    // vertical battens (board-and-batten rhythm) between openings
    for (let s = 0.3; s < L - 0.2; s += 0.3) { if (ops.some((o) => s > o.s0 - 0.05 && s < o.s1 + 0.05)) continue; K.rbox(R, siding, s - 0.025, YB + 0.35, 0, s + 0.025, YT - 0.4, 0.03, { detail: true }); }
    K.rbox(R, fascia, -0.05, YT - 0.4, -0.05, L + 0.05, YT - 0.1, 0.06); // thin fascia in the wall colour
  }
  K.box(M.concreteDark, U0 + 0.2, YB, V0 + 0.2, U1 - 0.2, YT - 0.45, V1 - 0.2); // core
  K.box(hmat(ctx, 'paint', '#55585a'), U0 + 0.25, YT - 0.42, V0 + 0.25, U1 - 0.25, YT - 0.3, V1 - 0.25); // roof membrane
  colliders.push(K.colPoly([[U0, V0], [U1, V0], [U1, V1], [U0, V1]], YB, YT + 0.1));
  // ---- entry door under the overhang on the set-back core, reached through the carport ----
  { const R = K.run([U1, V0 + 2.6], [4.5, V0 + 2.6]); const s = 2.2; // north face of the core, east end
    K.rbox(R, M.woodDark, s - 0.5, slabY, 0.0, s + 0.5, slabY + 2.15, 0.05); K.rbox(R, frame, s - 0.58, slabY, 0.0, s + 0.58, slabY + 2.25, 0.03);
    K.rbox(R, M.lampGlow, s + 0.7, slabY + 1.7, 0.03, s + 0.82, slabY + 1.95, 0.12, { detail: true }); }
  // ---- low grey stucco retaining wall along the Warring sidewalk with a planter bed, dark shrubs and a yucca ----
  { const fol = hmat(ctx, 'paint', '#2f4a2c'), trunk = hmat(ctx, 'wood', '#8a7560');
    const u = U1 + 1.4; for (let v = -9.0; v < 0.5; v += 1.5) { const gy = Math.max(K.g(u, v), K.g(u, v + 1.5)); K.box(stucco, u - 0.15, Math.min(K.g(u, v), K.g(u, v + 1.5)) - 0.5, v, u + 0.15, gy + 1.0, v + 1.5); K.box(M.concreteDark, u - 0.2, gy + 1.0, v - 0.02, u + 0.2, gy + 1.08, v + 1.52); }
    for (let v = -8.6; v < 0.2; v += 1.1) { const gy = K.g(U1 + 0.6, v); K.box(fol, U1 + 0.1, gy - 0.1, v, U1 + 1.2, gy + 1.5 + ((v * 13) % 3 + 3) % 3 * 0.4, v + 1.0); }
    const pu = U1 + 1.8, pv = 7.5, pg = K.g(pu, pv); for (const [du, dv, h] of [[0, 0, 4.6], [0.4, 0.3, 3.8], [-0.3, 0.35, 3.2]]) { K.cyl(trunk, pu + du, pg, pv + dv, 0.13, 0.1, h, 7); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const g = new THREE.ConeGeometry(0.12, 1.1, 4); g.rotateZ(Math.PI / 2 - 0.9); g.rotateY(a); g.translate(pu + du + Math.cos(a) * 0.35, pg + h + 0.1, pv + dv - Math.sin(a) * 0.35); K.add(fol, g); } } }
  const object3d = K.finish(); object3d.name = 'kappa-sigma';
  return { object3d, colliders, walkables };
}
