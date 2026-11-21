// Alpha Chi Sigma (ΑΧΣ), Sigma chapter (the professional chemistry fraternity), 2627 Virginia Street. Spanish Colonial
// Revival hillside house: white troweled stucco, low red barrel-tile hipped roofs with shallow eaves, deep-set
// casements with red-brown frames and a round-arched window, flat-roofed terraces with parapets on the lower wings,
// an arched loggia and a tall tile-capped chimney; three storeys on the downhill west side.
// LiDAR: main roof ~15 m, south range ~14 m, terrace wing ~10.5 m (ground rises ~5 m to the east).
import { greekHouse } from './lib/greek-kit.js';
import { hedge } from './lib/b12-greek.js';

export const info = {
  id: 'alpha-chi-sigma',
  name: 'Alpha Chi Sigma',
  subtitle: 'ΑΧΣ · 2627 Virginia Street',
  blurb: 'House of the Sigma chapter of Alpha Chi Sigma, the professional chemistry fraternity, a white stucco Spanish Revival house with red tile roofs on the hillside north of campus.',
  replaces: ['w/826209163'],
};

export async function build(ctx) {
  const st = ['stucco', '#f1eee6'], tile = ['tile', '#b4583e'], frame = ['paint', '#7a2e22'];
  const F = 4.4;
  const r = greekHouse(ctx, {
    ang: -9.419, floor: F, storeyH: 3.0, ov: 0.3, wallD: 0.38,
    wall: st, trim: st, frame, roof: tile, base: ['stucco', '#e2ddd2'], door: ['wood', '#6b4a33'], shutters: ['wood', '#6b4a33'],
    win: { w: 0.62, h: 1.45, bay: 3.4, sill: 0.9, tran: 0.68, casing: 0, pair: true, mull: 1, muntins: 2 }, belt: false, frieze: false,
    blocks: [
      { u0: -6.0, u1: 7.33, v0: -12.57, v1: 1.48, eave: 12.9, floor: 1.9, storeys: 4, roof: { type: 'hip', ridge: 15.1, ov: 0.35 } },
      { u0: -11.82, u1: -6.0, v0: -5.42, v1: 1.49, eave: 12.2, floor: 0.6, storeys: 4, roof: { type: 'flat', parapet: 0.7 } },
      { u0: -5.51, u1: 7.33, v0: -14.49, v1: -12.57, eave: 9.0, floor: 3.0, storeys: 2, roof: { type: 'flat', parapet: 0.6 } },
      { u0: -2.6, u1: 6.33, v0: 1.48, v1: 9.6, eave: 12.2, floor: 3.2, storeys: 3, win: { S: { none: true } }, roof: { type: 'hip', ridge: 14.2, ov: 0.35 } },
      { u0: -2.61, u1: 5.78, v0: 9.6, v1: 17.72, eave: 10.0, storeys: 2, floor: 4.2, roof: { type: 'flat', parapet: 0.75 } },
    ],
    doors: [{ block: 4, face: 'S', s: 2.0, w: 1.1, h: 2.3, arch: true }, { block: 1, face: 'S', s: 2.9, w: 2.4, h: 2.6, arch: true, y: 1.0 }],
    chimneys: [{ u: -4.2, v: 1.9, w: 1.1, d: 1.0, top: 17.0, mat: st }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api;
      // tile cap on the chimney
      K.box(mat(tile), -4.85, 17.0, 1.25, -3.55, 17.25, 2.55);
      // round-arched feature window on the south range, with a tile hood
      { const R = faceRun(blocks[3], 'S'); const c = 4.4, y = F + 3.3; K.rbox(R, api.glass, c - 0.7, y, -0.3, c + 0.7, y + 1.7, -0.27);
        const a = new api.ctx.THREE.TorusGeometry(0.75, 0.09, 6, 14, Math.PI); a.translate(c, y + 1.7, -0.05); K.addRun(R, mat(frame), a);
        for (const s of [c - 0.78, c + 0.7]) K.rbox(R, mat(frame), s, y, -0.3, s + 0.08, y + 1.7, -0.05); }
      // gooseneck lamp + planters on the terrace parapet
      hedge(api, [[-2.0, 18.6], [5.2, 18.6]], { h: 0.7, t: 0.6, color: '#4a6436' });
    },
  });
  r.object3d.name = 'alpha-chi-sigma';
  return r;
}
