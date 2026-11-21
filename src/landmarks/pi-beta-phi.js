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
  const dark = ['paint', '#2f2b28'], wall = ['stucco', '#e6dfcd'], roof = ['roof', '#6a6c6e'], brick = ['brick', '#a4584a']; // refine-south-east: grey composition roof
  const F = 1.7, half = { mat: ['paint', '#3a3430'] };
  const r = rseHouse(ctx, {
    ang: -9.836, floor: F, storeyH: 3.6, ov: 0.35,
    wall, trim: dark, frame: dark, roof, base: brick, door: ['wood', '#5a1e14'],
    win: { w: 1.8, h: 1.45, bay: 3.4, sill: 0.85, tran: 0.72, casing: 0.08, mull: 2, muntins: 2 }, belt: true, frieze: false,
    blocks: [
      { u0: -15.77, u1: -0.6, v0: -9.37, v1: 11.87, eave: 9.3, storeys: 2, noWin: { W: [[-1, 6.6], [12.8, 18.2]] }, roof: { type: 'gable', axis: 'v', ridge: 14.0, noGableWin: ['N'], gableWin: { w: 2.0, h: 1.1 }, half } },
      { u0: -16.3, u1: -7.0, v0: -9.37, v1: -2.6, eave: 9.3, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 14.0, ov: 0.35, noGableWin: ['E'], gableWin: { w: 1.9, h: 1.0 }, half } },
      { u0: -16.1, u1: -9.0, v0: 3.4, v1: 8.2, eave: 8.9, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 12.6, ov: 0.35, noGableWin: ['E'], gableWin: { w: 1.4, h: 0.9 }, half } },
      { u0: -16.0, u1: -9.0, v0: -1.9, v1: 2.7, eave: 9.3, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 12.9, ov: 0.35, noGableWin: ['E'], gableWin: { w: 1.4, h: 0.9 }, half } },
      { u0: -16.0, u1: -9.0, v0: 8.7, v1: 11.87, eave: 8.6, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 11.1, ov: 0.3, noGableWin: ['E'], gableWin: { w: 1.0, h: 0.8 }, half } },
      { u0: -0.6, u1: 16.57, v0: -9.37, v1: -1.0, eave: 11.0, floor: 2.4, storeys: 2, roof: { type: 'gable', axis: 'u', ridge: 14.2, noGableWin: ['W'], half } },
      { u0: 13.9, u1: 20.56, v0: -1.0, v1: 9.11, eave: 8.7, floor: 4.2, storeys: 1, roof: { type: 'gable', axis: 'v', ridge: 11.8, noGableWin: ['N'], half } },
      { u0: 2.27, u1: 13.9, v0: -1.0, v1: 1.9, eave: 6.2, floor: 2.4, storeys: 1, roof: { type: 'flat', parapet: 0.3 } },
      { u0: -3.6, u1: 2.27, v0: -1.0, v1: 7.2, eave: 10.2, floor: 2.4, storeys: 2, roof: { type: 'gable', axis: 'v', ridge: 14.0, noGableWin: ['N'], half } },
    ],
    doors: [{ block: 8, face: 'W', s: 1.6, w: 1.1, h: 2.3 }],
    porches: [{ block: 8, face: 'W', s0: 0.1, s1: 3.1, depth: 1.8, cols: 2, colStyle: 'square', colD: 0.3, colMat: dark, top: F + 2.9, rail: false, fascia: dark, stepS: 1.6, stepW: 1.4 }],
    chimneys: [{ u: -4.0, v: -9.37, w: 1.4, d: 0.8, top: 15.0, mat: brick }],
    extra: (api) => {
      const { K, blocks, faceRun, mat } = api;
      // half-timbering on the upper storey of the two street gables: posts + rails
      for (const bi of [1, 2, 7, 8]) { const b = blocks[bi]; const R = faceRun(b, 'W'); const y0 = F + 3.6, y1 = b.eave;
        K.rbox(R, mat(['paint', '#3a3430']), 0, y0 - 0.1, 0, R.L, y0 + 0.12, 0.05);
        for (let s = 0.1; s <= R.L - 0.05; s += 1.25) K.rbox(R, mat(['paint', '#3a3430']), s - 0.08, y0 + 0.12, 0, s + 0.08, y1 - 0.05, 0.04, { detail: true }); }
      // low concrete retaining wall along Piedmont, a tall clipped hedge behind it and cloud-pruned topiary pines
      gardenWall(api, [[-20.6, -11.0], [-20.6, 17.6]], { h: 0.45, t: 0.35, mat: ['stone', '#b9b5ac'] });
      hedge(api, [[-19.4, -10.5], [-19.4, 7.6]], { h: 1.8, t: 1.8, color: '#33502a' }); hedge(api, [[-19.4, 12.6], [-19.4, 17.2]], { h: 1.8, t: 1.8, color: '#33502a' });
      const fol = mat(['ivy', '#3a5a2c']), trunk = mat(['wood', '#6a5644']);
      for (const v of [-4.6, 0.4, 5.4]) { const u = -17.6; const g = K.g(u, v); K.cyl(trunk, u, g, v, 0.12, 0.09, 3.2, 6);
        for (const [du, dy, dv, rr] of [[0, 3.3, 0, 0.75], [0.7, 2.5, 0.3, 0.5], [-0.6, 2.2, -0.4, 0.45], [0.2, 1.6, -0.6, 0.4]]) { const gg = new api.ctx.THREE.SphereGeometry(rr, 8, 5); gg.scale(1.25, 0.6, 1.25); gg.translate(u + du, g + dy, v + dv); K.add(fol, gg); } }
    },
  }, { number: '2325' });
  r.object3d.name = 'pi-beta-phi';
  return r;
}
