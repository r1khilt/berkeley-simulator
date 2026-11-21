// McLaughlin Hall (1931; William C. Hays): the classical engineering building on the Hearst Mining Circle side of the College
// of Engineering. Cast-stone ashlar walls, tall two-storey studio windows with steel sash between flat pilaster strips, smaller
// six-light windows above, a granite base, a simple cornice and low hipped red clay tile roofs; the east block rises higher.
// "ENGINEERING" is carved over the entrance. Massing follows the 2021 LiDAR: west block eaves ~22 m (ridge ~25.5), east block ~27-28 m.
import * as THREE from 'three';
import { Kit, classicBlock, corniceProfile, ionicColumn } from './lib/classic-kit.js';
import { mats, gAt, signText, storefront } from './lib/b03-kit.js';
import { planting, bikes } from './lib/rn-kit.js';

export const info = {
  id: 'mclaughlin-hall',
  name: 'McLaughlin Hall',
  subtitle: 'William C. Hays · 1931',
  blurb: 'A simple classical building of the early 1930s by William C. Hays, part of the College of Engineering complex beside the Hearst Mining Circle, with "ENGINEERING" carved high on its walls.',
  replaces: ['w/24025435'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.6);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CS = M.ashlar, GD = M.graniteDark;
  const colliders = [], walkables = [];
  const v0 = -10.3, v1 = 10.3;
  const stW = [
    { y0: -1.5, y1: 1.2, mat: GD },
    { y0: 1.2, y1: 8.6, win: { sill: 0.8, h: 6.2, w: 2.3, mull: 2, tran: 0.45 }, mat: CS },
    { y0: 8.6, y1: 12.8, win: { sill: 0.9, h: 2.4, w: 1.6, mull: 1, muntins: 2 }, mat: CS },
    { y0: 12.8, y1: 17.0, win: { sill: 0.9, h: 2.3, w: 1.6, mull: 1, muntins: 2 }, mat: CS },
    { y0: 17.0, y1: 21.0, win: { sill: 0.8, h: 1.9, w: 1.4, mull: 1 }, mat: CS },
  ];
  // west / main block
  const runsW = classicBlock(K, { u0: -23.7, u1: 12.6, v0, v1, y0: -1.5, eave: 22.0, stories: stW, bay: 5.0, frame: M.darkBronze,
    cornice: { P: 0.55, H: 0.7, frieze: 0.35 }, roof: { type: 'hip', slope: 0.26, overhang: 0.4 }, faces: { E: false } });
  // east entrance pavilion (taller, flat-topped, temple front facing the engineering courtyard)
  const PU0 = 12.6, PU1 = 23.65, PE = 25.6;
  const runsE = classicBlock(K, { u0: PU0, u1: PU1, v0, v1, y0: -1.5, eave: PE, stories: stW.concat([{ y0: 21.0, y1: PE - 0.9, win: { sill: 0.7, h: 1.6, w: 1.4, mull: 1 }, mat: CS }]), bay: 5.0, frame: M.darkBronze,
    cornice: { P: 0.6, H: 0.8, frieze: 0.4 }, roof: { type: 'flat', parapet: 1.4 }, faces: { E: false } });
  {
    const R = K.run([PU1, v1], [PU1, v0]); const L = R.L; const gE = Math.min(gAt(K, R, L / 2, 2), 7.5);
    const base = gE + 1.2; // entrance floor about 1.2 m above the courtyard
    const ops = [
      { s0: L / 2 - 2.0, s1: L / 2 + 2.0, y0: base + 3.9, y1: base + 10.9, mull: 3, muntins: 5 },
      { s0: 3.0, s1: 4.8, y0: base + 0.6, y1: base + 7.6, mull: 1, muntins: 6 }, { s0: L - 4.8, s1: L - 3.0, y0: base + 0.6, y1: base + 7.6, mull: 1, muntins: 6 },
      { s0: 3.2, s1: 4.6, y0: base + 9.4, y1: base + 11.0, mull: 1, muntins: 2 }, { s0: L - 4.6, s1: L - 3.2, y0: base + 9.4, y1: base + 11.0, mull: 1, muntins: 2 },
      { s0: L / 2 - 0.7, s1: L / 2 + 0.7, y0: base + 14.2, y1: base + 15.8, mull: 1, muntins: 2 },
      { s0: L / 2 - 1.6, s1: L / 2 + 1.6, y0: base + 0.02, y1: base + 3.2, kind: 'door', doorTop: base + 2.6 },
    ];
    K.wall(R, CS, 0, L, -1.5, PE, ops, 0.6);
    for (const o of ops) K.fill(R, o, { kind: o.kind || 'win', rev: 0.4, frame: M.darkBronze, glass: M.windowNight, mull: o.mull, door: M.darkBronze });
    // corner pilasters and giant engaged columns flanking the central bay
    for (const s of [1.0, L - 1.0]) K.rbox(R, CS, s - 1.0, -1.5, -0.05, s + 1.0, PE, 0.35);
    for (const s of [L / 2 - 3.1, L / 2 + 3.1]) { const p = R.at(s, 0.45); ionicColumn(K, CS, p[0], base, p[1], 1.0, 10.6, { flutes: 16, rotV: 1 }); }
    // entablature band with ENGINEERING in relief, door lintel, stepped attic with pediment outline and roundel
    K.rbox(R, CS, L / 2 - 4.2, base + 11.2, -0.05, L / 2 + 4.2, base + 12.4, 0.45);
    signText(K, R, 'ENGINEERING', L / 2, base + 11.8, 0.62, { color: '#b9b5aa', metal: 0.0, rough: 0.9, d: 0.47, spacing: 0.22 });
    K.rbox(R, CS, L / 2 - 2.1, base + 3.2, -0.05, L / 2 + 2.1, base + 3.65, 0.3);
    signText(K, R, 'McLAUGHLIN HALL', L / 2, base + 3.42, 0.26, { color: '#6a665e', metal: 0.0, rough: 0.9, d: 0.32, spacing: 0.06 });
    K.rbox(R, CS, 1.5, PE + 1.4, -0.3, L - 1.5, PE + 1.9, 0.2);
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(L / 2 - 1.0, 0.35, 0.3); g.rotateZ(sg * -0.2); g.translate(L / 2 + sg * (L / 4 - 0.3), PE - 0.2, 0.15); K.addRun(R, CS, g); }
    { const g = new THREE.CylinderGeometry(0.75, 0.75, 0.2, 20); g.rotateX(Math.PI / 2); g.translate(L / 2, PE - 1.6, 0.1); K.addRun(R, CS, g); }
    // entrance steps with stone cheek walls
    const p0 = R.at(L / 2 - 2.2, 0), p1 = R.at(L / 2 + 2.2, 2.3);
    const st = K.stairs(M.graniteDark, Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.max(p0[0], p1[0]), Math.max(p0[1], p1[1]), gE, base, '-u', 7);
    for (const s of [L / 2 - 2.6, L / 2 + 2.6]) K.rbox(R, M.granite, s - 0.4, gE - 0.5, 0, s + 0.4, base + 0.9, 2.3);
    walkables.push(st);
  }
  // flat pilaster strips between the bays of the long faces
  const SPAN = new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.6, metalness: 0.3 });
  for (const R of [runsW.S, runsW.N]) { if (!R) continue; const nb = Math.max(1, Math.round(R.L / 5.0));
    for (let j = 0; j <= nb; j++) { const s = (R.L / nb) * j; K.rbox(R, CS, s - 0.6, 1.2, -0.05, s + 0.6, 20.9, 0.4); K.rbox(R, CS, s - 0.75, 20.5, -0.05, s + 0.75, 21.0, 0.5); } // giant pilasters with simple caps
    for (let j = 0; j < nb; j++) { const c = (R.L / nb) * (j + 0.5); // dark spandrels tie each bay's windows into one tall vertical strip
      for (const [y0, y1, w] of [[8.25, 9.5, 2.3], [11.75, 13.7, 1.6], [15.25, 17.8, 1.6]]) K.rbox(R, SPAN, c - w / 2, y0, -0.42, c + w / 2, y1, -0.38); } }
  for (const R of [runsW.S, runsW.N]) if (R) planting(K, R, 1.0, R.L - 1.0, { d0: 0.45, depth: 1.3, h: 0.9, seed: 111 });
  { const R = K.run([PU1, v1], [PU1, v0]); colliders.push(...bikes(K, R, 2.2, 4.2, 4, 2)); }
  // (the old south-face entrance placeholder is replaced by the east pavilion's temple front)
  if (false)
  { const R = runsW.S; const s = R.L * 0.55; const gy = Math.max(gAt(K, R, s, 1.5), -0.5);
    K.rbox(R, M.granite, s - 2.6, gy - 0.4, 0, s + 2.6, gy + 5.2, 0.5);
    storefront(K, R, s - 1.6, s + 1.6, gy + 0.05, gy + 3.6, { glass: M.windowNight, frame: M.darkBronze, rev: -0.45, transom: gy + 2.7 });
    signText(K, R, 'McLAUGHLIN HALL', s, gy + 4.4, 0.38, { color: '#5b574f', metal: 0.0, rough: 0.9, d: 0.52, spacing: 0.08 });
    signText(K, R, 'ENGINEERING', s, 18.6, 0.75, { color: '#6e6a62', metal: 0.0, rough: 0.9, d: 0.2, spacing: 0.25 }); }
  colliders.push(K.colPoly([[-23.7, v0], [23.65, v0], [23.65, v1], [-23.7, v1]], -2, 26));
  const object3d = K.finish(); object3d.name = 'mclaughlin-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
