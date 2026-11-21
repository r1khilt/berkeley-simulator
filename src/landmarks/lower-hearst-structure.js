// Lower Hearst Structure (UC Berkeley, 2400/2451 Hearst Ave). A four-level cast-in-place parking structure cut into
// the slope below Scenic Avenue: three open levels face Hearst Avenue, while the uphill (north) side meets the roof
// deck at grade. Its look is the heavy, stacked, bull-nosed concrete deck edges cantilevered ~3 m past set-back round
// columns, in pale weathered concrete, with blue "P" blade signs and roof-top parking around a ramp well.
// Massing from the 2021 LiDAR: roof deck ~9.3 m above the low (south-east) corner.
import * as THREE from 'three';
import { GarageKit, plainMat, inPoly } from './lib/b06p-garage.js';

export const info = {
  id: 'lower-hearst-structure',
  name: 'Lower Hearst Structure',
  subtitle: 'Parking structure · 694 spaces',
  blurb: 'A four-level UC Berkeley parking structure on Hearst Avenue on the north side of campus, with public pay parking on Level 2.',
  replaces: ['w/28997603'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, -9.5, 2451); const M = ctx.M, G = K.G;
  const conc = plainMat(0xc3c3be, { roughness: 0.92 }), stain = plainMat(0x8e8b84, { roughness: 0.95 });
  const TOP = 9.3, LEV = [1.2, 3.9, 6.6, TOP];
  const P = K.simplify(K.framePoly(ctx.footprints[0].outer));
  // bull-nosed cantilevered deck edge: curved underside sweeping back into the slab, ~1.45 m tall, 0.8 m proud
  const prof = (y) => [[0.84, y - 0.12], [0.86, y + 0.84], [0.82, y + 0.95], [0.66, y + 1.02], [0, y + 1.04]];
  const under = (y) => [[0, y - 0.78], [0.34, y - 0.74], [0.58, y - 0.62], [0.74, y - 0.44], [0.82, y - 0.26], [0.84, y - 0.12]];
  const runs = K.bandFacade(P, LEV, { mat: conc, profile: prof, colSet: 3.0, colR: 0.4, bay: 9.0, colMat: stain, colSeg: 14 });
  for (let k = 1; k < LEV.length; k++) K.smoothLoop(stain, P, under(LEV[k]));
  // dark weathering line under each nose
  
  K.plinth(P, LEV[0] + 0.12, conc);
  for (let i = 0; i < P.length; i++) { const R = K.run(P[i], P[(i + 1) % P.length]); if (R.L < 2) continue;
    let segs = [[0, R.L]]; if (R.n[1] > 0.9 && Math.abs(R.a[1] - 18.55) < 0.6) { const g0 = -17.6 - R.a[0], g1 = -8.4 - R.a[0]; segs = [[0, Math.max(0, g0)], [Math.min(R.L, g1), R.L]].filter(([a, b]) => b - a > 0.2); }
    const yb = Math.min(...K.gSamples(R, 0, R.L, 0.8, Math.ceil(R.L / 4))) - 1.0;
    for (const [a, b] of segs) K.rbox(R, conc, a, yb, -0.05, b, LEV[0] + 1.05, 0.28); }
  K.decks(P, LEV, { corePolys: [[[-46.5, 6.5], [46.5, 6.5], [46.5, -6.0], [-46.5, -6.0]]], runs, skipTop: true, cars: 0.55, depth: 12, colRow: 11, inset: 0.0, beams: 11.5 });
  // roof slab with the ramp well (aerial: ~24 x 9 m opening), ramp down to level 3
  const wu0 = -24.5, wu1 = -1.5, wv0 = -6.5, wv1 = 2.0;
  const hole = [[wu0, wv1], [wu1, wv1], [wu1, wv0], [wu0, wv0]];
  K.prism(G.roofDeck, P, TOP - 0.3, TOP, undefined, [hole.slice().reverse()]);
  { const len = wu1 - wu0, rise = TOP - LEV[2]; const g = new THREE.BoxGeometry(Math.hypot(len, rise), 0.3, wv1 - wv0); g.rotateZ(Math.atan2(rise, len)); g.translate((wu0 + wu1) / 2, (TOP + LEV[2]) / 2 - 0.15, (wv0 + wv1) / 2); K.add(G.deck, g); }
  for (const [a, b, c, d] of [[wu0 - 0.3, wv0 - 0.3, wu1 + 0.3, wv0], [wu0 - 0.3, wv1, wu1 + 0.3, wv1 + 0.3], [wu0 - 0.3, wv0, wu0, wv1]]) K.box(conc, a, TOP, b, c, TOP + 0.9, d);
  // roof parking: stalls perpendicular to the long axis; cars mostly on the east half (aerial)
  K.roofParking(P, TOP, { rows: 'u', margin: 1.3, occ: 0.22, poles: 46, keep: (u, v) => !(u > wu0 - 2 && u < wu1 + 2 && v > wv0 - 2 && v < wv1 + 2) && !(u > 50 && v < -10) });
  K.roofParking(P, TOP + 0.0001, { rows: 'u', margin: 1.3, occ: 0.0, poles: 1e9, lineMat: M.whitePaint, keep: () => false });
  { const more = K.cars.length; for (let i = 0; i < 30; i++) { const u = 8 + K.R() * 44, v = -14 + Math.floor(K.R() * 4) * 9.5 + (K.R() < 0.5 ? 0 : 0); if (inPoly(u, v, P)) K.car(u, TOP, v, Math.PI / 2 + (K.R() < 0.5 ? 0 : Math.PI)); } }
  // stair + elevator cores: plain concrete shafts with a narrow vertical slot
  for (const [a, b, c, d, gy] of [[51.5, -18.0, 58.3, -11.0, K.g(55, -12) - 2], [-47.6, 12.2, -42.6, 18.3, K.g(-45, 19) - 1]]) {
    K.box(conc, a, gy, b, c, TOP + 3.0, d); K.box(conc, a - 0.25, TOP + 3.0, b - 0.25, c + 0.25, TOP + 3.3, d + 0.25);
    K.box(M.windowNight, (a + c) / 2 - 0.4, gy + 1, d - 0.05, (a + c) / 2 + 0.4, TOP + 2.4, d + 0.03);
    K.box(M.darkBronze || M.iron, a - 0.03, TOP, (b + d) / 2 - 0.8, a + 0.02, TOP + 2.2, (b + d) / 2 + 0.8);
  }
  // blue P blade signs where cars enter (Hearst Ave, south side; Scenic Ave, east end)
  const RS = K.run([-17.5, 18.6], [-8.5, 18.6]);
  K.sign(RS, -0.2, LEV[1] - 1.55, 0.45, 'LOWER HEARST', { w: 1.5, h: 1.4, sub: 'PARKING', blade: true });
  { const p = RS.at(-0.2, 0.45); K.box(M.iron, p[0] - 0.03, LEV[1] - 0.85, p[1] - 0.03, p[0] + 0.03, LEV[1] - 0.78, p[1] + 0.03); }
  K.sign(RS, 4.5, LEV[1] + 0.38, 0.88, 'PARKING', { w: 2.6, h: 0.95, sub: 'Enter here' });
  { const p = RS.at(0.6, 0.9); K.box(M.iron, p[0] - 0.03, LEV[1] - 0.7, p[1] - 0.03, p[0] + 0.03, LEV[1] - 0.62, p[1] + 0.03); }
  K.sign(RS, 4.5, LEV[1] - 1.05, 0.05, 'CLEARANCE 7 FT', { w: 4.0, h: 0.45, P: false });
  const RE = K.run([58.6, 2], [58.6, -12]); K.sign(RE, 7, LEV[1] + 0.2, 0.9, 'LEVEL 2 PUBLIC', { w: 4.0, h: 0.8 });
  { const p = RS.at(4.5, -4.2); K.box(M.whitePaint, p[0] - 0.9, LEV[0], p[1] - 0.7, p[0] + 0.9, LEV[0] + 2.3, p[1] + 0.7); K.box(M.windowNight, p[0] - 0.92, LEV[0] + 1.1, p[1] - 0.5, p[0] + 0.92, LEV[0] + 2.0, p[1] + 0.5); }
  // walkable roof (ramp in the well)
  const len = wu1 - wu0;
  K.walkables.push(K.walkFn(Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1])), (u, v) => {
    if (!inPoly(u, v, P)) return null;
    if (u > wu0 && u < wu1 && v > wv0 && v < wv1) return LEV[2] + (TOP - LEV[2]) * (u - wu0) / len;
    return TOP; }));
  K.perimeterColliders(P, -3, TOP + 0.98, K.autoGaps(P, TOP, 0.6));
  { const [x, z] = K.xz(59.5, -14.5); const [tx, tz] = K.xz(46, -12); K.interactions.push({ id: 'lh-roof', pos: [x, K.g(59.5, -14.5) + 1, z], radius: 3, label: 'Take the stairs to the roof deck', teleport: [tx, TOP + 0.1, tz] }); }
  const object3d = K.done('lower-hearst-structure');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
