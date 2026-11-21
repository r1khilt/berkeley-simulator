// Li Ka Shing Center for Biomedical and Health Sciences (SmithGroup, 2011). A large modern laboratory complex on Oxford
// Street: tall buff-panel and glass blocks with ribbon windows and vertical sun fins, a lower east bar and a low south
// annex; flat roofs with mechanical screens. LiDAR: main blocks ~33 m, east bar ~23 m, south annex ~14 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { entry, autoEntries, faceRun, lampPost, bikeRack, rooftopUnit, hvacMat } from './lib/rc-finish.js';
export const info = {
  id: 'li-ka-shing-center', name: 'Li Ka Shing Center', subtitle: '2011 · Biomedical & health sciences',
  blurb: 'Funded in part by Hong Kong businessman Li Ka-shing, this laboratory building houses biomedical and health-sciences research, including stem-cell and neuroscience labs.',
  replaces: ['w/109187413', 'way/109187413'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5.5)); const M = ctx.M;
  // refine-central: buff precast panels around near-continuous glazing between slim piers, aluminium louvre
  // sunshades over the south/west glazing, a full-height glazed lobby with canopy and name, rooftop plant behind screens.
  const P = tint(M.concrete, 0xf0e2c2), PD = tint(M.concrete, 0xc9bb9c), FR = solid(0x2b3035, 0.35, 0.6), LV = solid(0x9a9c9a, 0.35, 0.75), CAN = solid(0x5e6266, 0.5, 0.5);
  const allRuns = [];
  const lv = (top) => { const a = [0.8, 5.6]; while (a[a.length - 1] + 4.3 < top - 1.2) a.push(a[a.length - 1] + 4.3); return a; };
  const ribbon = (k) => ({ w: 2.75, h: 3.3, sill: 0.45, mull: 1, tran: 0.82 });
  const D = { mat: P, baseMat: PD, frame: FR, fl: 0.8, bay: 3.0, winFn: ribbon, roof: 'flat', parapet: 1.2, coping: PD, depth: 0.3, extra: (runs, p) => allRuns.push(...runs.map((r) => Object.assign(r, { top: p.top }))) };
  const colliders = genParts(K, [
    { poly: rect(-41.8, -12.4, 14.0, 12.0), levels: lv(33), top: 33.0 },
    { poly: rect(-6.4, -48.2, 14.0, -12.4), levels: lv(33), top: 33.0 },
    { poly: rect(14.0, -48.0, 23.2, 16.3), levels: lv(23), top: 23.0, bay: 3.4 },
    { poly: rect(-33.6, 12.0, 23.4, 20.1), levels: lv(28.5), top: 28.5 },
    { poly: [[-2.9, 20.2], [23.5, 20.0], [22.2, 43.0], [16.5, 52.6], [-1.0, 47.4]], levels: lv(14), top: 14.0, bay: 3.6 },
  ], D);
  // rooftop mechanical penthouses clad in louvred screens + exposed units
  for (const [u0, v0, u1, v1, y, h] of [[-30, -8, -10, 8, 33.0, 4.0], [2, -45, 11, -30, 33.0, 4.5]]) {
    K.box(PD, u0 + 0.4, y, v0 + 0.4, u1 - 0.4, y + h - 0.3, v1 - 0.4);
    for (let k = 0; k < 9; k++) { const yy = y + 0.3 + k * (h - 0.6) / 9; K.box(LV, u0, yy, v0, u1, yy + 0.12, v0 + 0.25, { detail: true }); K.box(LV, u0, yy, v1 - 0.25, u1, yy + 0.12, v1, { detail: true }); K.box(LV, u0, yy, v0, u0 + 0.25, yy + 0.12, v1, { detail: true }); K.box(LV, u1 - 0.25, yy, v0, u1, yy + 0.12, v1, { detail: true }); }
    K.box(PD, u0 - 0.1, y + h - 0.3, v0 - 0.1, u1 + 0.1, y + h, v1 + 0.1);
  }
  rooftopUnit(K, 8, 0, 33.0, { w: 3.2, d: 1.8, h: 1.4 }); rooftopUnit(K, -20, -12 + 24.5, 28.5, { w: 3.0, d: 1.6, h: 1.3 });
  // bronze louvre sunshades over the glazing of the south and west faces (three blades over each window head)
  for (const R of allRuns) {
    const isSW = R.n[1] > 0.85 || R.n[0] < -0.85; if (!isSW || R.L < 8) continue;
    const top = R.top ?? 33;
    for (let y = 5.6; y + 3.5 < top - 1.0; y += 4.3) for (const dy of [0.9, 1.5, 2.1, 2.7, 3.3]) K.rbox(R, LV, 0.2, y + dy, 0.6, R.L - 0.2, y + dy + 0.04, 0.78, { detail: true });
    for (let k = 0; k * 6 < R.L; k++) K.rbox(R, CAN, Math.min(R.L - 0.1, k * 6) - 0.05, 5.6, 0.0, Math.min(R.L - 0.1, k * 6) + 0.05, top - 1.2, 0.8, { detail: true });
    // thin cantilevered roof canopy on outrigger beams
    K.rbox(R, CAN, -1.5, top + 0.9, 0, R.L + 1.5, top + 1.1, 3.5);
    for (let k = 0; k * 3 <= R.L; k++) K.rbox(R, FR, Math.min(R.L, k * 3) - 0.12, top + 0.6, 0, Math.min(R.L, k * 3) + 0.12, top + 0.9, 3.4, { detail: true });
  }
  // full-height glazed lobby with a cantilevered canopy and the building name on the south face of the main block
  const walkables = [];
  { const R = faceRun(allRuns, 'S'); if (R) { const s = R.L * 0.5; const { walk } = entry(K, R, s, Math.max(0.8, K.g(...R.at(s, 2)) + 0.12), { w: 6.0, h: 3.6, transom: 1.6, leaves: 4, surround: PD, surroundW: 0.6, canopy: solid(0x8a7a62, 0.35, 0.7), canopyD: 3.0, signText: 'LI KA SHING CENTER', signOpts: { bg: '#3a352d', fg: '#e8dcc0', h: 0.5 }, lamps: 'modern' }); if (walk) walkables.push(walk); for (const t of [0.15, 0.85]) { const [u, v] = R.at(R.L * t, 6); lampPost(K, u, v, { style: 'modern', mat: M.iron }); } const [u, v] = R.at(R.L * 0.28, 4.5); bikeRack(K, u, v, Math.atan2(R.t[1], R.t[0]), 7); } }
  walkables.push(...autoEntries(K, ctx, allRuns.filter((r) => r !== faceRun(allRuns, 'S')), { y0: 0.8, max: 2, w: 2.4, h: 2.6, surround: PD, surroundW: 0.4, lamps: 'modern' }));
  const object3d = K.finish(); object3d.name = 'li-ka-shing-center';
  return { object3d, colliders, walkables };
}
