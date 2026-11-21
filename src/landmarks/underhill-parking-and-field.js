// Underhill Parking & Field (UC Berkeley, 2645 Haste St). Precast parking garage, four levels partly or wholly below
// grade, with a lit artificial-turf field (the Cal field hockey home) on the roof. Façades: light-grey precast edge
// beams with recessed olive panels, square columns at ~8.5 m, grey mesh at the lowest open level, a solid panelled
// lobby end at the south-east corner and an open galvanised stair at the north-west corner. The roof is ringed by a
// kickboard, mesh panels and very tall black ball-stop nets, with tall floodlight poles.
// Massing from the 2021 LiDAR: field ~7.45 m above the low (west) corner; the site rises ~7 m to College Avenue, where
// the field is at street level.
import * as THREE from 'three';
import { GarageKit, matColor, plainMat } from './lib/b06p-garage.js';

export const ROOF_FIELD = true; // b11-athletics also has `underhill-sports-field`; keep only one of the two fields

export const info = {
  id: 'underhill-parking-and-field',
  name: 'Underhill Parking & Field',
  subtitle: 'Parking garage with a rooftop field',
  blurb: 'A UC Berkeley parking garage of about 950 spaces, mostly below grade, topped by Underhill Field, a lit artificial-turf field used by Cal field hockey and intramural sports.',
  replaces: ['w/109192577'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, -9.25, 2645); const M = ctx.M, G = K.G;
  const olive = plainMat(0x8f9450, { roughness: 0.85 }), parapet = plainMat(0xb9ad2a, { roughness: 0.8 }), turfMat = plainMat(0x6fae35, { roughness: 0.95 }), roofBlue = plainMat(0x5b7fa6, { roughness: 0.5, metalness: 0.3 }), kick = plainMat(0xa9a93a), beamMat = plainMat(0xb9b5ac, { roughness: 0.92 }), mesh = G.chain, perf = G.perf;
  const TOP = 7.45, LEV = [-1.85, 1.25, 4.35, TOP];
  const u0 = -48.65, u1 = 49.0, v0 = -36.57, v1 = 36.77;
  const P = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]; // S, E, N, W edges (building on the left)
  const runs = [];
  const fac = (a, b, opt = {}) => { const R = K.run(a, b); const f = K.facade(R, { levels: LEV, top: TOP, bay: 9.0, colW: 0.75, colProj: 0.3, slabT: 0.8, guard: 1.3, topGuard: 1.75, capH: 0.6, topPanelInset: 0.15, topPanelMat: parapet, beam: 0.0, wallMat: beamMat, panelMat: olive, panelInset: 0.03, lowMesh: { level: 1, h: 2.1, mat: mesh, fromFloor: true }, noPanelLevels: [1], ...opt }); runs.push({ R, ...f });
    // thin pale coping on every olive band
    for (const o of f.ops) if (o.y0 < o.y1) { const yb = LEV.find((y) => Math.abs(y - o.y0) < 0.01); if (yb !== undefined) K.rbox(R, beamMat, o.s0, yb + 1.3, -0.05, o.s1, yb + 1.38, 0.06); }
    return { R, f }; };
  const S = fac([u0, v1], [u1, v1], { solid: [[0, 6.3]], solidNoCols: true, ent: [] });
  const E = fac([u1, v1], [u1, v0]);
  const N = fac([u1, v0], [u0, v0], { ent: [{ s0: 15.5, s1: 23.5, level: 2 }] });
  const W = fac([u0, v0], [u0, v1], { solid: [[73.34 - 10.2, 73.34]], solidNoCols: true });
  // solid lobby block at the south-west corner: grey base, a grid of large flush olive panels with grey reveals,
  // a glazed elevator lobby with a small flat canopy, a grey service door, and a louvre band at the parapet
  {
    for (const [R, a, b] of [[W.R, W.R.L - 10.0, W.R.L], [S.R, 0, 6.1]]) {
      const gy = Math.max(...K.gSamples(R, a, b, 0.8, 3));
      K.rbox(R, G.precastDark, a, gy - 1, 0.0, b, gy + 0.6, 0.08);
      const nx = Math.max(1, Math.round((b - a) / 3.3)); const pw = (b - a) / nx;
      for (let i = 0; i < nx; i++) for (let y = gy + 0.75; y < TOP + 0.9; y += 2.5) K.rbox(R, olive, a + i * pw + 0.05, y, 0.0, a + (i + 1) * pw - 0.05, Math.min(y + 2.42, TOP + 0.95), 0.12);
      for (let s = a + 0.1; s < b - 0.1; s += 0.3) K.rbox(R, G.steel, s, TOP + 0.98, 0.02, s + 0.16, TOP + 1.6, 0.12, { detail: true });
      K.rbox(R, G.precast, a - 0.05, TOP + 1.6, -0.1, b + 0.05, TOP + 1.75, 0.16);
    }
    const R = W.R, gy = K.g(u0 - 1.5, v1 - 4.5), sc = W.R.L - 4.6;
    K.rbox(R, G.precastDark, sc - 1.9, gy - 0.5, -0.6, sc + 1.9, gy + 3.3, 0.16); K.rbox(R, M.glassLight, sc - 1.5, gy, -0.62, sc + 1.5, gy + 2.8, -0.55);
    for (const s of [sc - 1.5, sc, sc + 1.5]) K.rbox(R, G.steel, s - 0.05, gy, -0.56, s + 0.05, gy + 2.8, -0.5, { detail: true });
    K.rbox(R, G.steel, sc - 1.8, gy + 2.95, 0.1, sc + 1.8, gy + 3.1, 1.15);
    K.rbox(R, G.precastDark, sc + 2.6, gy, 0.08, sc + 3.6, gy + 2.2, 0.16);
  }
  // interior decks
  K.decks(P, LEV, { core: 14, runs, skipTop: true, cars: 0.25, depth: 12, beams: 12 });
  // roof slab under the field
  K.prism(G.slab, [[u0 + 0.36, v1 - 0.36], [u1 - 0.36, v1 - 0.36], [u1 - 0.36, v0 + 0.36], [u0 + 0.36, v0 + 0.36]], TOP - 0.35, TOP - 0.06);

  // NW corner: open galvanised steel stair (the footprint's little bump), up to the field
  { const R = K.run([u0, v0 + 7.1], [u0, v0]); K.steelStair(R, 0.0, 7.1, 0.05, 3.3, K.g(u0 - 1.5, v0 + 3.5) - 0.05, TOP + 1.75, { flight: 1.55 }); }

  if (ROOF_FIELD) {
    const F = K; const FM = K.G;
    const iu0 = u0 + 0.4, iu1 = u1 - 0.4, iv0 = v0 + 0.4, iv1 = v1 - 0.4;
    F.box(turfMat, iu0, TOP - 0.06, iv0, iu1, TOP, iv1);
    const cu = -0.1, cv = 6.4;
    F.fieldMarkings(cu, cv, TOP, { L: 91.4, W: 55, kind: 'hockey', w: 0.12 });
    F.fieldMarkings(cu, cv, TOP + 0.002, { L: 91.4, W: 55, kind: 'soccer', mat: FM.lineY, w: 0.1 });
    for (const s of [-1, 1]) F.goal(cu + s * 45.7, cv, TOP, s < 0 ? 0 : Math.PI, { w: 3.66, h: 2.14, d: 1.2 });
    // kickboard + mesh panels + very tall, nearly invisible ball-stop nets round the roof edge
    const ring = [[iu0, iv1], [iu1, iv1], [iu1, iv0], [iu0, iv0]];
    F.fence(ring, TOP, 3.9, { closed: true, kick: 1.2, kickMat: parapet, pitch: 4.0, postR: 0.05, mat: perf });
    const netRing = [[iu0 - 0.25, iv1 + 0.25], [iu1 + 0.25, iv1 + 0.25], [iu1 + 0.25, iv0 - 0.25], [iu0 - 0.25, iv0 - 0.25]];
    F.fence(netRing, TOP, 14.0, { closed: true, mat: FM.net, pitch: 9, postR: 0.1, base: 0, top: true });
    // floodlights along the long sides
    for (const [uu, vv, f] of [[-27, iv0 + 1.0, Math.PI / 2], [27, iv0 + 1.0, Math.PI / 2], [-27, iv1 - 0.7, -Math.PI / 2], [27, iv1 - 0.7, -Math.PI / 2]]) F.floodPole(uu, TOP, vv, 18, f, { n: 6 });
    // bleachers on the north strip facing the field, team benches
    F.bleachers(F.run([-15.1, -27.2], [15.0, -27.2]), 0, 30.1, TOP, 5, { mat: FM.steel, rise: 0.36 });
    { const a0 = 40.5, a1 = 48.4, b0 = 30.2, b1 = 36.2, H0 = TOP + 3.2, H1 = TOP + 3.9;
      F.box(beamMat, a0, TOP, b0, a1, TOP + 0.5, b1);
      for (const [p, q] of [[[a0, b1], [a1, b1]], [[a1, b1], [a1, b0]], [[a1, b0], [a0, b0]], [[a0, b0], [a0, b1]]]) { const R = F.run(p, q); F.rbox(R, M.glassLight, 0.2, TOP + 0.5, -0.12, R.L - 0.2, H0 - 0.15, -0.05); for (let ss = 0.2; ss <= R.L - 0.19; ss += 1.3) F.rbox(R, FM.steel, ss - 0.04, TOP + 0.5, -0.06, ss + 0.04, H0 - 0.1, 0.0, { detail: true }); }
      F.box(beamMat, a0 - 0.05, TOP, b0 - 0.05, a0 + 1.6, H0, b0 + 1.6);
      const rg = new THREE.BoxGeometry(a1 - a0 + 0.8, 0.12, b1 - b0 + 0.8); rg.rotateX(Math.atan2(H1 - H0, b1 - b0)); rg.translate((a0 + a1) / 2, (H0 + H1) / 2, (b0 + b1) / 2); F.add(roofBlue, rg);
      for (let uu = a0; uu <= a1 + 0.01; uu += 0.4) { const sg = new THREE.BoxGeometry(0.04, 0.06, b1 - b0 + 0.8); sg.rotateX(Math.atan2(H1 - H0, b1 - b0)); sg.translate(uu, (H0 + H1) / 2 + 0.08, (b0 + b1) / 2); F.add(roofBlue, sg, { detail: true }); }
      K.colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], TOP - 0.5, H1)); }
    K.walkables.push(K.walkPoly([[iu0, iv1], [iu1, iv1], [iu1, iv0], [iu0, iv0]], TOP));
  } else {
    K.box(G.deck, u0 + 0.36, TOP - 0.06, v0 + 0.36, u1 - 0.36, TOP, v1 - 0.36);
    K.walkables.push(K.walkPoly([[u0 + 0.4, v1 - 0.4], [u1 - 0.4, v1 - 0.4], [u1 - 0.4, v0 + 0.4], [u0 + 0.4, v0 + 0.4]], TOP));
  }
  // field gates + steps from College Avenue (east side) where the paths arrive
  const gates = [];
  for (const vc of [-2.4, 22.0]) {
    const gy = K.g(u1 + 3.4, vc); const n = Math.max(2, Math.round((TOP - gy) / 0.16));
    if (TOP - gy > 0.15) K.walkables.push(K.stairs(G.precastDark, u1, vc - 1.2, u1 + 3.3, vc + 1.2, gy, TOP, '-u', n));
    gates.push([vc, 1.4]);
  }
  // signs
  K.sign(W.R, W.R.L - 7.9, K.g(u0 - 1.5, v1 - 8) + 3.3, 0.14, 'UNDERHILL PARKING', { w: 3.6, h: 0.9, sub: 'UC Berkeley Parking & Transportation' });
  // colliders: perimeter walls (block walking off the field edge), gaps at the east gates
  const eastLen = v1 - v0; const gapsE = gates.map(([vc, w]) => [v1 - vc - w, v1 - vc + w]);
  K.perimeterColliders(P, -3, TOP + 1.3, { 1: gapsE });
  const object3d = K.done('underhill-parking-and-field');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
