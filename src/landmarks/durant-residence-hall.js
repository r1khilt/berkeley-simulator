// Durant Residence Hall, 2731 Durant Avenue — a Berkeley brown-shingle (First Bay Tradition) house now used as student
// housing. Weathered red-brown cedar shingles, a big street-facing gable with white bargeboards, deep eaves on exposed
// rafter tails, white casement windows, a lower front-gabled wing on the west with the entrance recessed under a timber
// pergola, and a slatted cedar fence. Massing from the 2021 LiDAR (eaves ≈7–8 m, ridge ≈10.8 m).
import * as THREE from 'three';
import { Kit, pal, house, roof, woodShingle, facade } from './lib/b08a-kit.js';

export const info = {
  id: 'durant-residence-hall',
  name: 'Durant Residence Hall',
  subtitle: '2731 Durant Avenue',
  blurb: 'A Berkeley brown-shingle house on Durant Avenue, now used as student housing.',
  replaces: ['w/473598421'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-8.0)); const M = ctx.M; const P = pal(ctx);
  const SH = woodShingle(0x7a6450), TR = P.trimWhite, RF = P.roofComp; const colliders = [];
  const g0 = Math.max(K.g(0, 9.6), K.g(-3, 9.6)) + 0.45;
  const A = house(K, { u0: -6.12, u1: 6.12, v0: -9.2, v1: 7.2, g0, y0: -2.5, eave: g0 + 6.6, storeys: 2, mat: SH, frame: TR, sillMat: TR, trim: TR, trimW: 0.08,
    faces: { S: { nb: 3, ww: 0.9, wh: 1.45, mull: 0, tran: 0.5, skip: [0], up: [0, 1, 2] }, E: { nb: 5, ww: 0.9, wh: 1.4, mull: 0, tran: 0.5 }, W: { nb: 5, ww: 0.9, wh: 1.4, mull: 0, tran: 0.5, wide: [2] }, N: { nb: 3, doors: [1], mull: 0, tran: 0.5 } },
    roof: { type: 'gable', axis: 'v', rise: 4.0, ov: 0.8, rake: 0.7, mat: RF, fascia: TR, soffit: P.woodBeam, rafters: P.woodBeam, rafterStep: 0.6 } });
  // attic window + knee braces in the street gable
  { const R = A.runs.S; const y = g0 + 7.2;
    K.addRun(R, SH, (() => { const sh = new THREE.Shape(); sh.moveTo(0.05, g0 + 6.6); sh.lineTo(R.L - 0.05, g0 + 6.6); sh.lineTo(R.L / 2, g0 + 10.55); sh.lineTo(0.05, g0 + 6.6);
      const h = new THREE.Path(); h.moveTo(R.L / 2 - 0.35, y); h.lineTo(R.L / 2 + 0.35, y); h.lineTo(R.L / 2 + 0.35, y + 0.9); h.lineTo(R.L / 2 - 0.35, y + 0.9); h.lineTo(R.L / 2 - 0.35, y); sh.holes.push(h);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); g.translate(0, 0, -0.2); return g; })());
    K.fill(R, { s0: R.L / 2 - 0.35, s1: R.L / 2 + 0.35, y0: y, y1: y + 0.9 }, { rev: 0.15, frame: TR, mull: 0, tran: [y + 0.45] });
    for (const s of [0.4, R.L - 0.4]) { const g = new THREE.BoxGeometry(0.12, 1.3, 0.12); g.rotateZ(s < 1 ? -0.7 : 0.7); g.translate(s + (s < 1 ? 0.35 : -0.35), g0 + 6.1, 0.4); K.addRun(R, P.woodBeam, g, { detail: true }); }
  }
  colliders.push(K.colPoly([[-6.12, -9.2], [6.12, -9.2], [6.12, 7.2], [-6.12, 7.2]], -3, 12));
  // lower front-gabled wing (west) with the entrance recessed under a pergola
  const W = house(K, { u0: -6.12, u1: -1.6, v0: 7.2, v1: 9.2, g0, y0: -2.5, eave: g0 + 5.6, storeys: 2, mat: SH, frame: TR, sillMat: TR, trim: TR, trimW: 0.12, core: false,
    faces: { N: false, E: (R) => [{ s0: 0.5, s1: 1.4, y0: g0, y1: g0 + 2.2, kind: 'door', doorTop: g0 + 2.0, sill: false, door: P.woodBeam }], W: { nb: 1, ww: 0.7, mull: 0, tran: 0.5 },
      S: (R) => [{ s0: 1.4, s1: 3.1, y0: g0 + 0.9, y1: g0 + 2.3, mull: 1, tran: 0.5 }, { s0: 0.7, s1: 3.8, y0: g0 + 3.4, y1: g0 + 4.7, mull: 2 }] },
    roof: { type: 'gable', axis: 'v', rise: 1.9, ov: 0.7, rake: 0.6, mat: RF, fascia: TR, soffit: P.woodBeam, rafters: P.woodBeam } });
  K.box(M.concreteDark, -5.7, -2, 7.25, -2.0, g0 + 5.5, 8.7);
  // pergola over the path + slatted cedar fence along Durant Avenue
  { const R = K.run([-6.12, 9.2], [-0.4, 9.2]); const s = 4.15, gg = K.g(-2, 11);
    for (const sx of [-1, 1]) K.rbox(R, P.woodStain, s + sx * 0.9 - 0.08, gg - 0.5, 2.0, s + sx * 0.9 + 0.08, g0 + 2.6, 2.16);
    for (let k = 0; k < 6; k++) K.rbox(R, P.woodStain, s - 1.2, g0 + 2.6, 0.2 + k * 0.38, s + 1.2, g0 + 2.75, 0.28 + k * 0.38, { detail: true });
    for (const sx of [-1, 1]) K.rbox(R, P.woodStain, s + sx * 0.9 - 0.06, g0 + 2.75, 0, s + sx * 0.9 + 0.06, g0 + 2.9, 2.3);
    const fz = 2.6; const f0 = -0.2, f1 = s - 1.1; K.rbox(R, P.woodStain, f0, gg - 0.5, fz, f1, gg + 1.7, fz + 0.06);
    for (let k = 0; k < 11; k++) K.rbox(R, P.woodBeam, f0, gg + 0.15 * k, fz + 0.06, f1, gg + 0.15 * k + 0.02, fz + 0.08, { detail: true });
  }
  colliders.push(K.colPoly([[-6.12, 7.2], [-1.6, 7.2], [-1.6, 9.2], [-6.12, 9.2]], -3, 8));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
