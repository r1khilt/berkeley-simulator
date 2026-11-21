// Tau Kappa Epsilon (ΤΚΕ), 2725 Channing Way. Three-storey stucco chapter house with a side-gabled roof parallel to Channing
// (LiDAR eaves ~11 m, ridge ~13 m), a lower flat-roofed rear wing and a two-storey front section with the entrance.
// refine-south-east: facade from the chapter's photo: greige stucco Arts & Crafts house, chocolate-brown trim, deep eaves
// on rafter tails, grouped casements, a round-arched recessed entry at the left and big raised letters on the upper wall.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js';
import { rafters } from './lib/b12-greek.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)

export const info = {
  id: 'building-473598545',
  name: "Tau Kappa Epsilon",
  subtitle: "ΤΚΕ · 2725 Channing Way",
  blurb: "Tau Kappa Epsilon chapter house on Channing Way, a three-storey stucco house with a side-gabled roof.",
  replaces: ['w/473598545'],
};

export async function build(ctx) {
  const r = rseHouse(ctx, {
    ang: -9.364, front: { block: 0, face: 'S', above: 0.8 }, storeyH: 3.2, ov: 0.6,
    wall: ['stucco', '#b8ac95'], trim: ['paint', '#4a3528'], frame: ['paint', '#3e2e24'], roof: ['roof', '#4e4a44'], base: ['stucco', '#a89c86'], ov: 0.95,
    win: { w: 0.7, h: 1.5, bay: 3.4, sill: 0.85, tran: 0.7, casing: 0.1, pair: true, mull: 1, muntins: 2 },
    blocks: [
      { u0: -9.09, u1: 10.41, v0: -5.94, v1: 7.28, eave: 10.6, roof: { type: 'gable', axis: 'u', ridge: 13.2, gableWin: { w: 1.6, h: 1.0 } } },
      { u0: -9.09, u1: -2.9, v0: -13.89, v1: -5.94, eave: 10.6, roof: { type: 'flat', parapet: 0.4 } },
      { u0: -5.02, u1: 6.42, v0: 7.28, v1: 10.64, eave: 7.0, roof: { type: 'flat', parapet: 0.0 }, storeys: 2 },
    ],
    doors: [{ block: 2, face: 'S', s: 1.9, w: 1.3, h: 2.3, arch: true }],
    letters: [{ block: 0, face: 'S', s: 6.5, y: 8.0, h: 0.9, text: 'ΤΚΕ', mat: ['paint', '#efe9dc'], dep: 0.1 }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api; const b = blocks[2]; const R = faceRun(b, 'S');
      rafters(api, 0, { faces: ['N', 'S'], spacing: 0.6, mat: ['paint', '#4a3528'] });
      // thick stucco surround of the round-arched recessed entry + hanging lantern
      for (const s of [1.9 - 0.65 - 0.45, 1.9 + 0.65]) K.rbox(R, mat(['stucco', '#b8ac95']), s, b.f0 - 0.1, 0, s + 0.45, b.f0 + 2.3, 0.3);
      const a = new THREE.TorusGeometry(0.88, 0.24, 6, 16, Math.PI); a.translate(1.9, b.f0 + 2.3, 0.16); K.addRun(R, mat(['stucco', '#b8ac95']), a);
      K.rbox(R, api.M.lampGlow, 1.8, b.f0 + 2.15, 0.12, 2.0, b.f0 + 2.45, 0.32, { detail: true });
      // dark-brown lattice panel beside the bay and the red-brick capped stucco front wall
      for (let k = 0; k < 9; k++) { K.rbox(R, mat(['paint', '#4a3528']), 3.6 + k * 0.18, b.f0 + 0.2, 0.05, 3.64 + k * 0.18, b.f0 + 2.4, 0.08, { detail: true }); K.rbox(R, mat(['paint', '#4a3528']), 3.6, b.f0 + 0.3 + k * 0.24, 0.08, 5.1, b.f0 + 0.34 + k * 0.24, 0.11, { detail: true }); }
    },
  }, { number: '2725' });
  r.object3d.name = 'building-473598545';
  return r;
}
