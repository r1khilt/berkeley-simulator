// Phi Kappa Tau (ΦΚΤ), Nu chapter, 2335 Piedmont Avenue — the chapter's house since 1923.
// No usable exterior photo was found, so the facade is a period-typical reading for a 1920s Piedmont chapter house that
// fits the LiDAR-derived massing (eaves ~10.4 m, a low 18-degree hipped roof): a three-storey cream stucco Mediterranean
// house under red tile, round-arched ground-floor windows, a columned entrance porch on Piedmont carrying an iron-railed
// balcony, and a lower rear wing up the slope. Plan from OSM.
import { rseHouse } from './lib/rse-finish.js';
import { rafters, railing } from './lib/b12-greek.js';

export const info = {
  id: 'phi-kappa-tau',
  name: 'Phi Kappa Tau',
  subtitle: 'ΦΚΤ · 2335 Piedmont Avenue',
  blurb: 'Home of the Nu chapter of Phi Kappa Tau, at 2335 Piedmont Avenue since 1923.',
  replaces: ['w/473598416'],
};

export async function build(ctx) {
  const stucco = ['stucco', '#e4d9c6'], trim = ['paint', '#efe8da'], tile = ['tile', '#b65f3f'], dark = ['paint', '#3a342e'];
  const r = rseHouse(ctx, {
    ang: -8.6, front: { block: 0, face: 'W', above: 1.0 }, storeyH: 3.15, ov: 0.65, belt: false, frieze: false,
    wall: stucco, trim, frame: dark, roof: tile, base: ['stucco', '#c9bca6'], door: ['wood', '#4b2f1d'],
    win: { w: 1.0, h: 1.6, bay: 2.75, sill: 0.85, arch0: true, h0: 2.0, muntins: 2, casing: 0, tran: 0, st: [{ sill: 0.55 }] },
    blocks: [
      { u0: -12.4, u1: 0.2, v0: -7.15, v1: 7.45, eave: 10.35, storeys: 3, roof: { type: 'hip', ridge: 12.5 } },
      { u0: 0.2, u1: 13.6, v0: -5.95, v1: 5.75, eave: 10.0, storeys: 3, roof: { type: 'hip', ridge: 11.9 } },
      { u0: 13.6, u1: 14.5, v0: -3.6, v1: 0.4, eave: 4.5, storeys: 1, roof: { type: 'flat', parapet: 0.3 } },
    ],
    doors: [{ block: 0, face: 'W', s: 7.3, w: 1.4, h: 2.45, arch: true }],
    porches: [{ block: 0, face: 'W', s0: 5.0, s1: 9.6, depth: 2.3, cols: 2, colD: 0.36, colMat: trim, fascia: stucco, roofMat: tile, balcony: true, stepW: 2.0, letters: { text: 'ΦΚΤ', mat: ['metal', '#2f2b26'], h: 0.34 } }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api; const b = blocks[0];
      rafters(api, 0, { spacing: 0.75, mat: ['wood', '#5a3c26'] }); rafters(api, 1, { faces: ['N', 'S', 'E'], spacing: 0.75, mat: ['wood', '#5a3c26'] });
      // wrought-iron balconettes on the upper windows facing Piedmont
      const R = faceRun(b, 'W'); const H = 3.15;
      for (const s of [1.9, 12.7]) for (const k of [1, 2]) { const y = b.f0 + k * H + 0.5; railing(api, [R.at(s - 0.75, 0.32), R.at(s + 0.75, 0.32)], y, { h: 0.7, mat: ['metal', '#1c1c1c'], step: 0.11 }); K.rbox(R, mat(trim), s - 0.85, y - 0.08, 0, s + 0.85, y, 0.36); }
    },
  }, { number: '2335', shrub: '#4d6a3b' });
  r.object3d.name = 'phi-kappa-tau';
  return r;
}
