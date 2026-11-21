// Ellsworth Parking Structure (UC Berkeley, Haste St / Ellsworth St). A low Z-shaped parking structure: an open,
// dark parking level under a thick concrete deck edge on set-back columns, then a continuous band of large flush
// slate-blue panels that screens the nine rooftop tennis courts (blue courts, green surrounds, dark windscreens; four
// on the north-west wing and five on the south-east wing, as mapped in OSM). A square concrete stair shaft with a
// round cantilevered landing reaches the courts. Massing from the 2021 LiDAR: court deck ~4.2-5.0 m (mean 4.6 m).
import * as THREE from 'three';
import { GarageKit, plainMat } from './lib/b06p-garage.js';

export const info = {
  id: 'ellsworth-parking-structure',
  name: 'Ellsworth Parking Structure',
  subtitle: 'Parking structure · rooftop tennis courts',
  blurb: 'A UC Berkeley parking structure south of campus between Haste and Channing, with nine tennis courts on its roof.',
  replaces: ['w/109194852'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, -9.3, 2337); const M = ctx.M, G = K.G;
  const conc = plainMat(0xb8b2a8, { roughness: 0.92 }), slate = plainMat(0x66788a, { roughness: 0.4, metalness: 0.25 }), joint = plainMat(0x262d34);
  const TOP = 4.6, LEV = [0.9, TOP], SCR = 2.6;
  const P = K.simplify(K.framePoly(ctx.footprints[0].outer));
  // open level: thick deck edge (0.9 m) on square-ish columns set back ~1 m
  const runs = K.bandFacade(P, LEV, { mat: conc, profile: (y) => [[0, y - 0.95], [0.2, y - 0.95], [0.25, y - 0.9], [0.25, y], [0, y]], colSet: 1.2, colR: 0.4, bay: 7.5, colMat: conc, colSeg: 12 });
  K.plinth(P, LEV[0] + 0.1, conc);
  // continuous slate-blue panel band screening the courts, with dark joints every ~3.2 m and a concrete coping
  const isLanding = (p, q) => Math.abs(p[0] + 25.2) < 0.3 && Math.abs(q[0] + 25.2) < 0.3;
  for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; const R = K.run(p, q); const segs = isLanding(p, q) ? (() => { const s = Math.abs(33.4 - p[1]); return [[0, s - 1.3], [s + 1.3, R.L]]; })() : [[0, R.L]];
    for (const [a, b] of segs) { K.rbox(R, slate, a, TOP, -0.1, b, TOP + SCR, 0.1); K.rbox(R, conc, a - 0.02, TOP + SCR, -0.12, b + 0.02, TOP + SCR + 0.1, 0.14); } }
  // silver tubular guardrail + mesh windscreen rising from the panel band (to ~3.5 m above the deck)
  // galvanised pipe guardrail above the band: posts every 3 m with three rails
  for (let i = 0; i < P.length; i++) { const R = K.run(P[i], P[(i + 1) % P.length]); const n = Math.max(1, Math.round(R.L / 3)); for (let j = 0; j <= n; j++) { const p = R.at(R.L * j / n, 0); K.cyl(G.steel, p[0], TOP + SCR + 0.1, p[1], 0.04, 0.04, 1.4, 6); } for (const yy of [0.5, 0.95, 1.45]) K.rbox(R, G.steel, 0, TOP + SCR + 0.1 + yy - 0.03, -0.03, R.L, TOP + SCR + 0.1 + yy + 0.03, 0.03, { detail: yy < 1.4 }); }
  for (let i = 0; i < P.length; i++) { const R = K.run(P[i], P[(i + 1) % P.length]); const n = Math.max(1, Math.round(R.L / 3.25)); for (let j = 1; j < n; j++) { const s = R.L * j / n; K.rbox(R, joint, s - 0.025, TOP + 0.02, 0.09, s + 0.025, TOP + SCR, 0.115, { detail: true }); } }
  K.decks(P, LEV, { corePolys: [[[-39.4, -11.4], [3.8, -11.4], [3.8, -31.2], [-39.4, -31.2]], [[-14.2, 26.6], [45.9, 26.6], [45.9, 11.3], [-14.2, 11.3]], [[-14.2, 11.3], [3.8, 11.3], [3.8, -11.4], [-14.2, -11.4]]], runs, skipTop: true, cars: 0.6, depth: 10, colRow: 8, inset: 0.0, beams: 10 });
  K.prism(G.slab, P, TOP - 0.3, TOP - 0.04);
  // courts (OSM outlines): north-west row of 4, south-east row of 5
  const courtB = plainMat(0x3d5aa6, { roughness: 0.85 }), courtG = plainMat(0x6f9a6c, { roughness: 0.85 });
  K.prism(courtG, P, TOP - 0.04, TOP);
  K.tennis(-17.8, -24.25, TOP, { n: 4, axis: 'v', wide: 15.7, run: 35.0, surf: courtB, outer: courtG, fence: 0 });
  K.tennis(17.7, 19.6, TOP, { n: 5, axis: 'v', wide: 15.1, run: 35.0, surf: courtB, outer: courtG, fence: 0 });
  for (const [u, v] of [[-49.2, -6], [-26, -41], [13.6, -6], [-24, 1.6], [55.6, 1.6], [55.6, 36.4], [20, 36.4], [-24, 36.4]]) K.lightPole(u, TOP, v, 9.5, 0, { heads: 1 });
  // round concrete stair tower at the south-west corner: a slim shaft with stair openings, an open landing ring at
  // court level with a thick concrete band and a curved pipe railing
  { const cu = -28.6, cv = 33.4, gy = K.g(cu, cv);
    K.box(conc, cu - 1.6, gy - 1, cv - 1.6, cu + 1.6, TOP - 0.6, cv + 1.6);
    for (let y = gy + 1.0; y < TOP - 1.4; y += 1.6) K.box(G.interior, cu - 0.45, y, cv + 1.58, cu + 0.45, y + 0.9, cv + 1.64);
    K.cyl(conc, cu + 0.3, TOP - 0.6, cv, 3.6, 3.6, 0.6, 36);
    for (let a = 0; a < 6.28; a += 0.12) { if (Math.cos(a) > 0.85) continue; K.cyl(G.steel, cu + 0.3 + Math.cos(a) * 3.5, TOP, cv + Math.sin(a) * 3.5, 0.025, 0.025, 1.4, 4, { detail: true }); }
    { const g = new THREE.TorusGeometry(3.5, 0.05, 5, 44, Math.PI * 1.65); g.rotateX(Math.PI / 2); g.rotateY(-Math.PI * 0.2 - Math.PI); g.translate(cu + 0.3, TOP + 1.4, cv); K.add(G.steel, g, { detail: true, uvMode: 'keep' }); }
    { const R = K.run([cu - 1.0, cv + 1.95], [cu + 1.0, cv + 1.95]); K.rbox(R, M.redTile || M.calGold, 0.6, gy + 1.5, -0.1, 1.4, gy + 2.1, -0.07); }
    K.box(G.interior, cu - 0.8, gy, cv - 1.95, cu + 0.8, gy + 2.2, cv - 1.8);
    const n = Math.round((TOP - gy) / 0.17); K.walkables.push(K.stairs(conc, cu - 3.2, cv - 9.8, cu - 2.0, cv - 2.6, gy, TOP, '+v', n));
    K.walkables.push(K.walkFn(cu - 3.0, cv - 3.4, -25.1, cv + 3.4, (u, v) => (Math.hypot(u - cu - 0.3, v - cv) < 3.6 || (u > cu + 3 && v > cv - 1.2 && v < cv + 1.2)) ? TOP : null)); }
  const RS = K.run([-25.18, 37.62], [56.91, 37.59]); K.sign(RS, 6, 2.2, 0.3, 'ELLSWORTH STRUCTURE', { w: 2.6, h: 0.6 });
  K.walkables.push(K.walkPoly(P, TOP));
  const gaps = K.autoGaps(P, TOP, 0.6);
  P.forEach((p, i) => { const q = P[(i + 1) % P.length]; if (Math.abs(p[0] + 25.2) < 0.3 && Math.abs(q[0] + 25.2) < 0.3) { const s = Math.abs(33.4 - p[1]); (gaps[i] = gaps[i] || []).push([s - 1.2, s + 1.2]); } });
  K.perimeterColliders(P, -3, TOP + SCR + 1.5, gaps);
  { const [x, z] = K.xz(-28.6, 33.4); K.colliders.push({ type: 'cyl', x, z, r: 2.1, y0: -2, y1: TOP - 0.7 }); }
  const object3d = K.done('ellsworth-parking-structure');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
