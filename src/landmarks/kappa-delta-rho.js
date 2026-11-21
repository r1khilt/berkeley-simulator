// Kappa Delta Rho, 2739 Channing Way. Three-storey cream stucco Mediterranean chapter house with a flat roof behind a
// parapet, an entrance pavilion with a scrolled gable and crest, and an arched, columned porch carrying blue ΚΔΡ letters.
// Massing from the 2021 LiDAR: main block roof ~12.5 m, lower rear wing ~9.5 m, two-storey front wing ~6.5 m.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'kappa-delta-rho',
  name: 'Kappa Delta Rho',
  subtitle: 'ΚΔΡ · 2739 Channing Way',
  blurb: 'Chapter house of the Lambda chapter of Kappa Delta Rho on Channing Way, a cream stucco Mediterranean house with an arched, columned entry under the fraternity letters.',
  replaces: ['w/263156772'],
};

export async function build(ctx) {
  const blue = ['paint', '#4e6e93'];
  const r = rseHouse(ctx, {
    ang: -8.788, floor: 0.8, storeyH: 3.55,
    wall: ['stucco', '#e9e2cf'], trim: blue, frame: ['paint', '#f2f2ee'], base: ['stucco', '#d3ccbb'], door: ['paint', '#3e5f86'],
    win: { w: 1.05, h: 1.7, bay: 3.0, sill: 0.95, tran: 0.5, casing: 0 }, belt: false,
    blocks: [
      { u0: -9.27, u1: 12.11, v0: -5.06, v1: 6.02, eave: 11.7, roof: { type: 'flat', parapet: 0.85, parapetMat: ['stucco', '#e9e2cf'] } },
      { u0: -11.79, u1: -2.64, v0: -8.98, v1: -5.06, eave: 9.0, roof: { type: 'flat', parapet: 0.6 } },
      { u0: -9.27, u1: -3.44, v0: 6.02, v1: 10.79, eave: 6.1, storeys: 2, roof: { type: 'flat', parapet: 0.6 } },
      { u0: 6.33, u1: 12.11, v0: -7.39, v1: -5.06, eave: 11.7, roof: { type: 'flat', parapet: 0.85 } },
    ],
    doors: [{ block: 0, face: 'S', s: 8.3, w: 1.35, h: 2.3, arch: true }],
    porches: [{ block: 0, face: 'S', s0: 6.5, s1: 10.1, depth: 2.0, cols: 2, top: 4.15, colD: 0.42, rail: false, colMat: ['stucco', '#e9e2cf'], letters: { text: 'ΚΔΡ', mat: ['paint', '#3d6ca8'], h: 0.42 } }],
    extra: ({ K, M, faceRun, blocks, mat, glass }) => {
      // entrance pavilion: projects 0.7 m, full height, scrolled gable with the crest
      const R = faceRun(blocks[0], 'S'); const s0 = 5.9, s1 = 10.7, top = 12.55; const st = mat(['stucco', '#e9e2cf']), bl = mat(['paint', '#4e6e93']);
      K.rbox(R, st, s0, -1.2, 0, s1, top, 0.7);
      const sh = new THREE.Shape(); const w = s1 - s0; sh.moveTo(s0, top); sh.lineTo(s1, top); sh.quadraticCurveTo(s1 - 0.2, top + 0.9, s1 - w * 0.3, top + 1.0); sh.quadraticCurveTo(s0 + w / 2, top + 1.9, s0 + w * 0.3, top + 1.0); sh.quadraticCurveTo(s0 + 0.2, top + 0.9, s0, top);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, 0.2); K.addRun(R, st, g);
      K.rbox(R, bl, s0 - 0.08, top - 0.12, 0, s1 + 0.08, top + 0.05, 0.82);
      // crest medallion
      const cg = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20); cg.rotateX(Math.PI / 2); cg.translate((s0 + s1) / 2, top + 0.75, 0.7); K.addRun(R, mat(['paint', '#b23a3a']), cg);
      const rg = new THREE.TorusGeometry(0.42, 0.06, 6, 20); rg.translate((s0 + s1) / 2, top + 0.75, 0.74); K.addRun(R, bl, rg);
      // second-floor oriel above the porch
      const o0 = 7.2, o1 = 9.4, y0 = 5.2, y1 = 7.5;
      K.rbox(R, st, o0, y0 - 0.35, 0.7, o1, y0, 1.25); K.rbox(R, glass, o0 + 0.12, y0, 0.72, o1 - 0.12, y1, 1.18);
      for (let k = 0; k <= 4; k++) { const s = o0 + 0.12 + (o1 - o0 - 0.24) * k / 4; K.rbox(R, mat(['paint', '#f2f2ee']), s - 0.04, y0, 1.15, s + 0.04, y1, 1.22); }
      K.rbox(R, mat(['paint', '#f2f2ee']), o0, y0 + (y1 - y0) * 0.66, 1.15, o1, y0 + (y1 - y0) * 0.66 + 0.06, 1.22);
      K.rbox(R, bl, o0 - 0.1, y1, 0.7, o1 + 0.1, y1 + 0.28, 1.35);
      // third-floor window in the pavilion
      K.rbox(R, glass, 7.75, 8.9, 0.69, 8.85, 10.5, 0.72); K.rbox(R, mat(['paint', '#f2f2ee']), 7.65, 8.8, 0.7, 8.95, 8.9, 0.8);
      // archivolt around the door
      const ar = new THREE.TorusGeometry(0.82, 0.09, 6, 16, Math.PI); ar.translate(8.3, 0.8 + 2.3, 0.73); K.addRun(R, bl, ar);
    },
  }, { number: '2739' });
  r.object3d.name = 'kappa-delta-rho';
  return r;
}
