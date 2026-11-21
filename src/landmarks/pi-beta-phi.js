// Pi Beta Phi (ΠΒΦ), California Beta chapter, 2325 Piedmont Avenue. Large Tudor Revival sorority house in cream stucco
// with dark half-timbering, behind a red-brick retaining wall on Piedmont: a steep, tall front gable at the north end,
// a recessed centre with a second-floor loggia and two shed dormers, a smaller half-timbered gable beside a big brick
// chimney, and a flat-roofed porch with a balcony at the south end; long wings run back up the slope.
// LiDAR: main ridge ~14 m parallel to Piedmont, rear wings ~11.5-13.5 m, one-storey link ~6 m.
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { gardenWall, hedge, railing } from './lib/b12-greek.js';

export const info = {
  id: 'pi-beta-phi',
  name: 'Pi Beta Phi',
  subtitle: 'ΠΒΦ · 2325 Piedmont Avenue',
  blurb: 'Chapter house of the California Beta chapter of Pi Beta Phi on Piedmont Avenue, a large half-timbered Tudor Revival house behind a brick garden wall.',
  replaces: ['w/473598491'],
};

export async function build(ctx) {
  const dark = ['paint', '#2f2b28'], wall = ['stucco', '#e6dfcd'], roof = ['slate', '#5d6166'], brick = ['brick', '#a4584a'];
  const F = 1.7, half = { mat: ['paint', '#3a3430'] };
  const r = rseHouse(ctx, {
    ang: -9.836, floor: F, storeyH: 3.6, ov: 0.35,
    wall, trim: dark, frame: dark, roof, base: brick, door: ['wood', '#5a1e14'],
    win: { w: 0.62, h: 1.55, bay: 2.9, sill: 0.8, tran: 0.72, casing: 0.08, pair: true, mull: 1, muntins: 2 }, belt: true, frieze: false,
    blocks: [
      { u0: -15.77, u1: -0.6, v0: -9.37, v1: 11.87, eave: 9.3, storeys: 2, noWin: { W: [[-1, 6.6], [12.8, 18.2]] }, roof: { type: 'gable', axis: 'v', ridge: 14.0, noGableWin: ['N'], gableWin: { w: 2.0, h: 1.1 }, half } },
      { u0: -16.3, u1: -7.0, v0: -9.37, v1: -2.6, eave: 9.3, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 14.0, ov: 0.35, noGableWin: ['E'], gableWin: { w: 1.9, h: 1.0 }, half } },
      { u0: -16.1, u1: -9.0, v0: 3.4, v1: 8.2, eave: 8.9, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 12.5, ov: 0.35, noGableWin: ['E'], gableWin: { w: 1.4, h: 0.9 }, half } },
      { u0: -0.6, u1: 16.57, v0: -9.37, v1: -1.0, eave: 11.0, floor: 2.4, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 14.2, noGableWin: ['W'], half } },
      { u0: 13.9, u1: 20.56, v0: -1.0, v1: 9.11, eave: 8.7, floor: 4.2, storeys: 1, roof: { type: 'gable', axis: 'v', ridge: 11.8, noGableWin: ['N'], half } },
      { u0: 2.27, u1: 13.9, v0: -1.0, v1: 1.9, eave: 6.2, floor: 2.4, storeys: 1, roof: { type: 'flat', parapet: 0.3 } },
      { u0: -3.6, u1: 2.27, v0: -1.0, v1: 7.2, eave: 10.2, floor: 2.4, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 14.0, noGableWin: ['N'], half } },
    ],
    doors: [{ block: 0, face: 'W', s: 19.9, w: 1.1, h: 2.3 }],
    porches: [{ block: 0, face: 'W', s0: 18.2, s1: 21.2, depth: 2.2, cols: 2, colStyle: 'square', colD: 0.35, colMat: dark, top: F + 3.0, balcony: true, rail: false, fascia: dark, stepS: 19.9, stepW: 1.4 }],
    dormers: [{ block: 0, side: 'W', s: 8.3, w: 1.7, h: 1.1, inset: 1.2, type: 'shed', mat: wall }, { block: 0, side: 'W', s: 11.2, w: 1.7, h: 1.1, inset: 1.2, type: 'shed', mat: wall }],
    chimneys: [{ u: -16.15, v: 2.4, w: 1.5, d: 0.8, top: 15.2, mat: brick }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api;
      // half-timbering on the upper storey of the two street gables: posts + rails
      for (const bi of [1, 2]) { const b = blocks[bi]; const R = faceRun(b, 'W'); const y0 = F + 3.6, y1 = b.eave;
        K.rbox(R, mat(['paint', '#3a3430']), 0, y0 - 0.1, 0, R.L, y0 + 0.12, 0.05);
        for (let s = 0.1; s <= R.L - 0.05; s += 0.62) K.rbox(R, mat(['paint', '#3a3430']), s - 0.08, y0 + 0.12, 0, s + 0.08, y1 - 0.05, 0.04, { detail: true }); }
      // second-floor loggia across the recessed centre: dark slab + railing
      { const R = faceRun(blocks[0], 'W'); const y = F + 3.6; K.rbox(R, mat(dark), 6.8, y - 0.25, 0, 12.6, y, 1.1);
        railing(api, [R.at(6.9, 1.05), R.at(12.5, 1.05)], y, { h: 0.95, mat: dark, step: 0.16 }); }
      // red-brick retaining wall on Piedmont, steps gap at the south end, shrubs behind
      gardenWall(api, [[-20.6, -11.0], [-20.6, 17.6]], { h: 1.0, t: 0.4, mat: brick, cap: ['brick', '#8e4a3e'] });
      gardenWall(api, [[-20.6, 19.4], [-20.6, 22.0]], { h: 1.0, t: 0.4, mat: brick, cap: ['brick', '#8e4a3e'] });
      hedge(api, [[-17.0, -8.5], [-17.0, 1.2]], { h: 1.0, t: 0.8 }); hedge(api, [[-17.0, 9.0], [-17.0, 17.0]], { h: 0.9, t: 0.8 });
    },
  }, { number: '2325' });
  r.object3d.name = 'pi-beta-phi';
  return r;
}
