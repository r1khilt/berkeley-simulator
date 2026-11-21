// Sigma Phi Society — the William R. Thorsen House, 2307 Piedmont Avenue at Bancroft Way (Greene & Greene, 1909;
// National Register). Dark-stained redwood-shingle Arts & Crafts house on a clinker-brick base behind clinker garden
// walls: low-pitched gables with very deep eaves on exposed rafter tails and outriggers, bands of wood casements,
// a front-gabled cross-wing toward Piedmont and a hooded entry. Massing from the 2021 LiDAR: main roof ridge
// ~13 m (N-S), Piedmont range ~10 m.
import * as THREE from 'three';
import { greekHouse } from './lib/greek-kit.js';
import { nightGlow } from '../materials.js';
import { rafters, gardenWall, hedge, hood } from './lib/b12-greek.js';

export const info = {
  id: 'sigma-phi-thorsen-house',
  name: 'Thorsen House (Sigma Phi)',
  subtitle: 'ΣΦ · 2307 Piedmont Avenue · Greene & Greene, 1909',
  blurb: 'The William R. Thorsen House, designed by Charles and Henry Greene in 1909 and home of the Sigma Phi Society since 1942; a National Historic Landmark-quality Arts & Crafts house of shingle, redwood and clinker brick.',
  replaces: ['w/473598479'],
};

export async function build(ctx) {
  const stain = ['paint', '#3a2a1e'], roof = ['roof', '#7d8a78'], clinker = ['brick', '#9c7262'];
  const glass = nightGlow(new THREE.MeshStandardMaterial({ color: 0x5c6f80, roughness: 0.08, metalness: 0.45, envMapIntensity: 1.8, emissive: 0xffc77a, emissiveIntensity: 1.6 }), 1.0);
  const r = greekHouse(ctx, {
    ang: -7.292, floor: 1.9, storeyH: 3.1, ov: 1.3,
    glass, wall: ['shingle', '#4a3426'], trim: stain, frame: ['paint', '#3a2a1f'], roof, base: clinker, door: ['wood', '#8c4e2c'],
    win: { w: 1.05, h: 1.4, bay: 3.7, sill: 0.85, tran: 0.74, casing: 0.15, pair: true, mull: 1, muntins: 2 }, belt: true, frieze: false,
    blocks: [
      // main block toward Bancroft: low gable, ridge N-S (LiDAR ~13.2 m), eaves E/W ~9 m
      { u0: -6.4, u1: 14.4, v0: -9.09, v1: 2.8, eave: 10.6, roof: { type: 'gable', axis: 'v', ridge: 12.8, ov: 1.5, brackets: true, gableWin: { w: 2.6, h: 1.1 } } },
      // range along Piedmont (ridge N-S ~10.2 m)
      { u0: -9.68, u1: -0.4, v0: -1.39, v1: 14.66, eave: 8.6, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 9.95, ov: 1.4, brackets: true } },
      // front-gabled cross-wing at the Bancroft corner, gable facing Piedmont
      { u0: -9.68, u1: -1.2, v0: -9.09, v1: -1.39, eave: 9.4, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 10.45, ov: 1.5, brackets: true, noGableWin: ['E'], gableWin: { w: 2.4, h: 1.0 } } },
      { u0: -11.18, u1: -9.68, v0: -9.09, v1: -1.39, eave: 1.9 + 3.0, storeys: 1, win: { W: { none: true } }, roof: { type: 'flat', parapet: 0, ov: 1.2, eaveMat: stain } },
    ],
    doors: [{ block: 1, face: 'W', s: 2.4, w: 1.1, h: 2.2 }],
    bays: [{ block: 3, face: 'W', s: 3.85, w: 4.6, d: 0.9, canted: true, storeys: 1, roof: 'flat', tran: true }, { block: 0, face: 'N', s: 11.0, w: 3.2, d: 0.5, storeys: 1, y0: 4.0, y1: 6.9, roof: 'flat' }],
    chimneys: [{ u: 3.4, v: -5.6, w: 1.2, d: 0.85, top: 15.4, mat: clinker }, { u: -7.0, v: -5.24, w: 1.2, d: 0.85, top: 12.2, mat: clinker }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api;
      for (const [bi, f] of [[0, ['E', 'W']], [1, ['E', 'W']], [2, ['N', 'S']], [3, ['N', 'S']]]) rafters(api, bi, { faces: f, w: 0.1, h: 0.2, spacing: 0.55 });
      hood(api, 1, 'W', 0.6, 4.2, 1.9, 4.6, { rise: 0.3, roofMat: roof });
      // stacked outrigger beams over the hood (three tiers)
      { const R1 = faceRun(blocks[1], 'W'); for (let t = 0; t < 3; t++) for (const s of [1.0 + t * 0.15, 3.8 - t * 0.15]) { const a = R1.at(s, 0), c = R1.at(s, 1.9 - t * 0.3); api.beam(mat(stain), [a[0], 4.0 - t * 0.28, a[1]], [c[0], 4.0 - t * 0.28, c[1]], 0.16, 0.22); } }
      // sleeping-porch balcony under the cross-wing gable (slatted rail)
      const R = faceRun(blocks[3], 'W'); const yb = 1.9 + 3.05;
      K.rbox(R, mat(stain), 1.2, yb - 0.25, 0, 6.5, yb, 1.0);
      for (let k = 0; k <= 24; k++) { const s = 1.3 + 5.1 * k / 24; K.rbox(R, mat(stain), s - 0.03, yb, 0.85, s + 0.03, yb + 0.95, 0.92, { detail: true }); }
      K.rbox(R, mat(stain), 1.2, yb + 0.95, 0.8, 6.5, yb + 1.05, 1.0);
      // clinker-brick garden walls on Piedmont and Bancroft, hedge behind
      gardenWall(api, [[-15.2, 16.0], [-15.2, -12.6], [12.0, -12.6]], { h: 1.4, t: 0.5, mat: clinker, cap: ['brick', '#8c6656'] });
      gardenWall(api, [[-12.9, 15.0], [-12.9, 4.6]], { h: 1.0, t: 0.45, mat: clinker, cap: ['brick', '#8c6656'] });
      gardenWall(api, [[-12.9, 1.0], [-12.9, -10.6], [6.0, -10.6]], { h: 1.0, t: 0.45, mat: clinker, cap: ['brick', '#8c6656'] });
      for (const [u0, v0, u1, v1] of [[-12.7, -1.39, -9.68, 14.66], [-12.7, -10.4, -11.18, -1.39], [-11.18, -10.4, 6.0, -9.09]]) { const g = K.gMin(u0, v0, u1, v1, 4); K.box(api.M.turf, u0, g - 0.5, v0, u1, 1.62, v1); }
      hedge(api, [[-14.2, 15.0], [-14.2, 5.0]], { h: 1.2, t: 0.9 }); hedge(api, [[-14.2, -2.0], [-14.2, -11.5]], { h: 1.0, t: 0.9, color: '#4d6b33' });
    },
  });
  r.object3d.name = 'sigma-phi-thorsen-house';
  return r;
}
