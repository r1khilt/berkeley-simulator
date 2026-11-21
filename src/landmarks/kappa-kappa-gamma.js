// Kappa Kappa Gamma (ΚΚΓ), Pi Deuteron chapter, 2328 Piedmont Avenue. Colonial Revival sorority house in blue-grey
// stucco with crisp white trim: two tall storeys over a raised basement under a hipped roof with a modillioned boxed
// cornice and three pedimented dormers toward Piedmont, a centred Ionic portico carrying an iron-railed balcony, black
// shutters, a lower recessed north wing and a flat-roofed rear addition; formal boxwood garden in front.
// LiDAR: main eaves ~12 m, ridge ~15.8 m; north wing ~13 m; rear addition ~11 m.
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { hedge, railing } from './lib/b12-greek.js';

export const info = {
  id: 'kappa-kappa-gamma',
  name: 'Kappa Kappa Gamma',
  subtitle: 'ΚΚΓ · 2328 Piedmont Avenue',
  blurb: 'Chapter house of the Pi Deuteron chapter of Kappa Kappa Gamma on Piedmont Avenue, a blue-grey Colonial Revival house with a columned portico and dormered hipped roof.',
  replaces: ['w/473598508'],
};

export async function build(ctx) {
  const white = ['paint', '#f4f4f0'], wall = ['stucco', '#a3a8ae'], roof = ['roof', '#686c6e'];
  const F = 4.2;
  const r = rseHouse(ctx, {
    ang: -10.43, floor: F, storeyH: 3.8, ov: 0.75,
    wall, trim: white, frame: white, roof, base: ['stucco', '#60666b'], door: ['paint', '#26282a'],
    win: { w: 1.05, h: 1.9, bay: 3.2, sill: 0.8, tran: 0.55, casing: 0.15, muntins: 2 }, belts: false,
    blocks: [
      { u0: 0.89, u1: 14.86, v0: -6.82, v1: 15.27, eave: 11.8, storeys: 2,
        win: { E: { nb: 5, st: [{ skip: [2], pair: true, w: 0.95 }, { skip: [2] }] } },
        roof: { type: 'hip', ridge: 15.8, ov: 0.95 } },
      { u0: 0.96, u1: 10.33, v0: -11.87, v1: -6.82, eave: 10.4, storeys: 2, win: { E: { pair: true, w: 0.9, nb: 1 } }, roof: { type: 'hip', ridge: 12.9, ov: 0.6 } },
      { u0: -19.3, u1: 0.9, v0: -10.35, v1: 3.9, eave: 11.0, floor: F - 3.8, storeys: 3, roof: { type: 'flat', parapet: 0.35 } },
    ],
    doors: [{ block: 0, face: 'E', s: 11.05, w: 1.3, h: 2.5, arch: true }],
    porches: [{ block: 0, face: 'E', s0: 9.1, s1: 13.0, depth: 1.8, cols: 2, colD: 0.46, top: F + 3.7, rail: false, balcony: false, stepW: 2.4 }],
    dormers: [{ block: 0, side: 'E', s: 5.6, w: 2.3, h: 2.2, inset: 1.0, winW: 1.1, mat: wall }, { block: 0, side: 'E', s: 11.05, w: 2.3, h: 2.2, inset: 1.0, winW: 1.1, mat: wall }, { block: 0, side: 'E', s: 16.5, w: 2.3, h: 2.2, inset: 1.0, winW: 1.1, mat: wall }],
    letters: [{ block: 0, face: 'E', s: 15.6, y: F + 2.75, h: 0.6, text: 'ΚΚΓ', mat: ['paint', '#ffffff'] }],
    chimneys: [{ u: 7.9, v: -3.6, w: 1.4, d: 0.8, top: 17.0, mat: ['stucco', '#737b82'] }, { u: 7.9, v: 12.2, w: 1.4, d: 0.8, top: 17.0, mat: ['stucco', '#737b82'] }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api; const b = blocks[0];
      // modillions under the boxed cornice on the street front and sides
      for (const f of ['E', 'N', 'S']) { const R = faceRun(b, f); for (let s = -0.5; s < R.L + 0.5; s += 0.45) K.rbox(R, mat(white), s - 0.075, b.eave - 0.4, 0, s + 0.075, b.eave - 0.18, 0.75, { detail: true }); K.rbox(R, mat(white), -0.3, b.eave - 0.75, 0, R.L + 0.3, b.eave - 0.2, 0.1); K.rbox(R, mat(white), -0.3, b.eave - 0.82, 0, R.L + 0.3, b.eave - 0.75, 0.16); }
      // portico: black iron balcony railing with end posts on the entablature, arch + fanlight over the door
      { const R = faceRun(b, 'E'); const top = F + 3.7 + 0.08; railing(api, [R.at(9.0, 1.85), R.at(13.1, 1.85)], top, { h: 1.0, mat: ['metal', '#111111'], step: 0.12 }); railing(api, [R.at(9.0, 0.1), R.at(9.0, 1.85)], top, { h: 1.0, mat: ['metal', '#111111'], step: 0.12 }); railing(api, [R.at(13.1, 1.85), R.at(13.1, 0.1)], top, { h: 1.0, mat: ['metal', '#111111'], step: 0.12 });
        for (const s of [9.0, 13.1]) { const q = R.at(s, 1.85); K.box(mat(['metal', '#111111']), q[0] - 0.05, top, q[1] - 0.05, q[0] + 0.05, top + 1.35, q[1] + 0.05); }
        const a = new THREE.TorusGeometry(1.25, 0.12, 6, 18, Math.PI); a.translate(11.05, F + 2.35, 0.08); K.addRun(R, mat(white), a);
        const fl = new THREE.CircleGeometry(1.12, 16, 0, Math.PI); fl.translate(11.05, F + 2.35, 0.02); K.addRun(R, api.glass, fl);
        for (const s of [9.85, 12.25]) K.rbox(R, api.glass, s - 0.18, F + 0.1, -0.02, s + 0.18, F + 2.3, 0.02); }
      // corner pilasters
      for (const s of [0.15, 21.94]) { const R = faceRun(b, 'E'); K.rbox(R, mat(white), s - 0.25, F - 0.3, 0, s + 0.25, b.eave - 0.5, 0.1); }
      // boxwood parterre between the house and Piedmont
      const P = [[16.2, -5.5], [16.2, 9.4], [20.8, 9.4], [20.8, -5.5], [16.2, -5.5]];
      hedge(api, P.slice(0, 2), { h: 0.6, t: 0.5, color: '#3b5a2a' }); hedge(api, P.slice(2, 4), { h: 0.6, t: 0.5, color: '#3b5a2a' });
      hedge(api, [[16.2, -5.5], [20.8, -5.5]], { h: 0.6, t: 0.5, color: '#3b5a2a' }); hedge(api, [[16.2, 3.0], [20.8, 3.0]], { h: 0.5, t: 0.45, color: '#3b5a2a' });
      hedge(api, [[18.5, -5.0], [18.5, 2.5]], { h: 0.45, t: 0.4, color: '#46682f' });
      // iron hand rails on the entry steps
      const R = faceRun(b, 'E'); const a0 = R.at(9.75, 1.7), a1 = R.at(9.75, 4.3), c0 = R.at(12.35, 1.7), c1 = R.at(12.35, 4.3);
      railing(api, [a0, a1], K.g(a1[0], a1[1]) + 0.2, { h: 0.9, step: 0.6 }); railing(api, [c0, c1], K.g(c1[0], c1[1]) + 0.2, { h: 0.9, step: 0.6 });
    },
  }, { number: '2328' });
  r.object3d.name = 'kappa-kappa-gamma';
  return r;
}
