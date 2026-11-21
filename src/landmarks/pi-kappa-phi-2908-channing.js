// Former Pi Kappa Phi house, 2908 Channing Way at Prospect Street. Late-1950s/60s three-storey stucco dormitory block in
// warm greige with a very low-pitched roof and deep thin-edged eaves, aluminium sliders, a stone-veneer base, dark
// vertical fins with balcony rails on the Prospect wing, and big dark ΠΚΦ letters stacked on the corner end wall.
// LiDAR: main block ~12 m, rear wing ~9 m.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { hedge } from './lib/b12-greek.js';

export const info = {
  id: 'pi-kappa-phi-2908-channing',
  name: 'Former Pi Kappa Phi House',
  subtitle: 'ΠΚΦ · 2908 Channing Way',
  blurb: 'A three-storey mid-century stucco chapter house at Channing Way and Prospect Street, long home to Pi Kappa Phi, with the letters stacked on its corner wall.',
  replaces: ['w/473598579'],
};

export async function build(ctx) {
  const st = ['stucco', '#c9bba8'], fin = ['paint', '#3e3a34'], frame = ['metal', '#d8d8d2'], stone = ['stone', '#b0a494']; // refine-south-east: lighter stone veneer
  const F = 2.6;
  const r = rseHouse(ctx, {
    ang: -8.531, floor: F, storeyH: 2.85, ov: 0.9,
    wall: st, trim: ['paint', '#4a4640'], frame, roof: ['roof', '#4a4640'], base: stone, door: ['metal', '#9a9a94'],
    win: { w: 1.25, h: 1.05, bay: 3.6, sill: 1.0, tran: 0, casing: 0, mull: 1 }, belt: false, frieze: false,
    blocks: [
      { u0: -14.11, u1: 9.76, v0: -11.96, v1: 1.5, eave: 11.3, storeys: 3, win: { E: { nb: 2 } }, roof: { type: 'gable', axis: 'u', ridge: 12.3, ov: 0.95, gableWin: false } },
      { u0: -0.63, u1: 8.94, v0: 1.5, v1: 18.77, eave: 8.6, floor: 2.0, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 9.4, ov: 0.9, gableWin: false } },
    ],
    doors: [{ block: 1, face: 'E', s: 9.0, w: 1.2, h: 2.2, y: 2.0 }],
    extra: (api) => {
      const { K, blocks, faceRun, mat, letters } = api;
      // stacked ΠΚΦ on the end wall facing Prospect (between the two window columns)
      { const R = faceRun(blocks[0], 'E'); const s = R.L / 2; const lm = mat(['paint', '#2f2f2f']);
        letters(R, lm, 'Π', s, F + 6.0, 0.9, { dep: 0.08 }); letters(R, lm, 'Κ', s, F + 4.75, 0.9, { dep: 0.08 }); letters(R, lm, 'Φ', s, F + 3.5, 0.9, { dep: 0.08 }); }
      // dark fins with balcony rails on the Prospect wing
      { const b = blocks[1]; const R = faceRun(b, 'E'); for (let s = 1.0; s < R.L - 0.5; s += 2.4) K.rbox(R, mat(fin), s - 0.09, Math.max(2.0 - 0.05, K.g(...R.at(s, 0.2)) + 0.05), 0, s + 0.09, b.eave - 0.15, 0.32);
        for (const y of [2.0 + 2.85 + 1.0]) K.rbox(R, mat(fin), 0.8, y - 0.04, 0.15, R.L - 0.8, y + 0.04, 0.3);
        { const g0 = Math.min(K.g(...R.at(0.2, 0.3)), K.g(...R.at(R.L - 0.2, 0.3))); K.rbox(R, mat(stone), -0.05, g0 - 0.4, 0, R.L + 0.05, 2.0 + 1.0, 0.06); } }
      hedge(api, [[-13.6, -13.6], [8.8, -13.6]], { h: 1.0, t: 0.8 });
    },
  }, { number: '2908' });
  r.object3d.name = 'pi-kappa-phi-2908-channing';
  return r;
}
