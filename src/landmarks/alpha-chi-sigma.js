// Alpha Chi Sigma (ΑΧΣ), Sigma chapter (the professional chemistry fraternity), 2627 Virginia Street. Spanish Colonial
// Revival hillside house: white troweled stucco, low red barrel-tile hipped roofs with shallow eaves, deep-set
// casements with red-brown frames and a round-arched window, flat-roofed terraces with parapets on the lower wings,
// an arched loggia and a tall tile-capped chimney; three storeys on the downhill west side.
// LiDAR: main roof ~15 m, south range ~14 m, terrace wing ~10.5 m (ground rises ~5 m to the east).
import { greekHouse } from './lib/greek-kit.js';
import { hedge } from './lib/b12-greek.js';
import { rectRuns, finishGround, stoop } from './lib/rn-b-ground.js';

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
    wall: st, trim: st, frame, roof: tile, base: ['stucco', '#e2ddd2'], door: ['wood', '#6b4a33'],
    win: { w: 0.66, h: 1.5, bay: 3.4, sill: 0.9, tran: 0.68, casing: 0.1, pair: true, mull: 1, muntins: 2 }, belt: false, frieze: false,
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
      const { K, blocks, faceRun, mat, colliders, walkables } = api;
      // tile cap on the chimney
      K.box(mat(tile), -4.85, 17.0, 1.25, -3.55, 17.25, 2.55);
      // round-arched feature window on the south range, with a tile hood
      { const R = faceRun(blocks[3], 'S'); const c = 4.4, y = F + 3.3; K.rbox(R, api.glass, c - 0.7, y, -0.3, c + 0.7, y + 1.7, -0.27);
        const a = new api.ctx.THREE.TorusGeometry(0.75, 0.09, 6, 14, Math.PI); a.translate(c, y + 1.7, -0.05); K.addRun(R, mat(frame), a);
        for (const s of [c - 0.78, c + 0.7]) K.rbox(R, mat(frame), s, y, -0.3, s + 0.08, y + 1.7, -0.05); }
      // gooseneck lamp + planters on the terrace parapet
      // street entry on the south front: gabled tile porch on dark timber posts, steps, letters on the porch fascia,
      // foundation planting around the house and a bike rack by the walk (rn-b-ground)
      const runs = rectRuns(K, blocks.map((b) => ({ u0: b.u0, u1: b.u1, v0: b.v0, v1: b.v1, floor: b.floor })));
      const T = api.ctx.THREE; const PM = mat(['wood', '#4a3426']);
      const front = runs.find((r) => r.f === 'S' && Math.abs(r.b.v1 - 17.72) < 0.01);
      if (front) front.extraSkip = [[0, 4.2]];
      const G = finishGround(K, ctx, runs, { entries: [], props: [{ run: front, s: 6.2, d: 2.0, n: 3 }], plant: { h: 0.8, depth: 1.2 } });
      colliders.push(...G.colliders); walkables.push(...G.walkables);
      { const R = faceRun(blocks[4], 'S'); const SC = 2.0; const s0 = SC - 1.25, s1 = SC + 1.25, y = 4.2 + 2.75, d = 1.9;
        walkables.push(...stoop(K, R, SC, 2.7, 4.2, { depth: d, mat: mat(['stucco', '#d9d2c4']), cheek: mat(st) }).walkables);
        for (const ss of [s0 + 0.15, s1 - 0.15]) K.rbox(R, PM, ss - 0.11, 4.2, d - 0.22, ss + 0.11, y, d);
        K.rbox(R, PM, s0, y, 0, s1, y + 0.28, d + 0.05);
        const g = new T.BufferGeometry(); const yy = y + 0.28, rr = 0.85; // tile gable roof over the porch (ridge out from the wall)
        const P = [[s0 - 0.25, yy, 0], [s0 - 0.25, yy, d + 0.35], [SC, yy + rr, d + 0.35], [SC, yy + rr, 0], [s1 + 0.25, yy, 0], [s1 + 0.25, yy, d + 0.35]];
        const tri = [0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4]; const pos = []; for (const i of tri) pos.push(...P[i]); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        K.addRun(R, mat(tile), g, { uvMode: 'box' }); K.rbox(R, PM, s0 - 0.25, yy - 0.04, 0, s1 + 0.25, yy + 0.02, d + 0.35); // tile slopes + boarded soffit
        for (const ss of [s0 + 0.15, s1 - 0.15]) K.rbox(R, PM, ss - 0.1, y - 0.55, d - 0.75, ss + 0.1, y, d - 0.2); // knee braces
        const gt = new T.BufferGeometry(); gt.setAttribute('position', new T.Float32BufferAttribute([s0, yy, d + 0.05, s1, yy, d + 0.05, SC, yy + rr * 0.92, d + 0.05], 3)); gt.computeVertexNormals(); K.addRun(R, mat(st), gt);
        api.letters(R, mat(['paint', '#1f3a6b']), 'ΑΧΣ', SC, yy + 0.08, 0.3, { d0: d + 0.06 }); }
    },
  });
  r.object3d.name = 'alpha-chi-sigma';
  return r;
}
