// Delta Upsilon (ΔΥ), 2425 Warring Street. Symmetrical Italian Renaissance Revival villa: cream stucco, a low hipped red-tile roof
// with deep bracketed eaves (LiDAR eaves ~12 m, ridge ~15 m), paired windows on two main floors, an arcaded loggia across the
// top floor, three round-arched entrance openings up a broad flight of steps and a small iron balcony above them.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'delta-upsilon-fraternity',
  name: "Delta Upsilon",
  subtitle: "ΔΥ · 2425 Warring Street",
  blurb: "Delta Upsilon chapter house on Warring Street, a cream stucco Italian Renaissance villa with a red tile roof and an arcaded top-floor loggia.",
  replaces: ['w/340370957'],
};

export async function build(ctx) {
  const r = greekHouse(ctx, {
    ang: -8.793, front: { block: 0, face: 'W', above: 1.0 }, storeyH: 3.4, ov: 1.0,
    wall: ['stucco', '#e6dcc6'], trim: ['paint', '#7a5a3a'], frame: ['paint', '#f2f0ea'], roof: ['tile', '#c0603f'], base: ['stucco', '#cfc3aa'], door: ['wood', '#5a3e2a'],
    win: { w: 0.7, h: 1.7, bay: 2.9, sill: 0.8, tran: 0.7, casing: 0, pair: true, mull: 1, st: { 2: { arch: true, pair: false, w: 1.5, h: 1.9, sill: 0.5, bay: 2.3 } } }, belt: false, frieze: false,
    blocks: [{ u0: -7.18, u1: 7.18, v0: -16.25, v1: 16.25, eave: 12.2, roof: { type: 'hip', ridge: 15.2 }, win: { W: { nb: 11, skip: [], st: { 0: { skip: [4, 5, 6] }, 2: { arch: true, pair: false, w: 1.6, h: 1.9, sill: 0.4 } } } } }],
    doors: [{ block: 0, face: 'W', s: 13.4, w: 1.6, h: 2.5, arch: true }, { block: 0, face: 'W', s: 16.25, w: 1.6, h: 2.5, arch: true }, { block: 0, face: 'W', s: 19.1, w: 1.6, h: 2.5, arch: true }],
    extra: ({ K, faceRun, blocks, mat, walkables }) => { // broad entrance stair with cheek walls + iron balcony + eave brackets
      const b = blocks[0]; const R = faceRun(b, 'W'); const st = mat(['stucco', '#d9cfb8']); const ir = mat(['metal', '#2a2a2a']);
      const g = K.g(...R.at(R.L / 2, 6)); const n = Math.max(2, Math.round((b.f0 - g) / 0.17)); const run = n * 0.32;
      const A = R.at(12.2, 0), Bp = R.at(20.3, run); const uu = [A[0], Bp[0]].sort((x, y) => x - y), vv = [A[1], Bp[1]].sort((x, y) => x - y);
      walkables.push(K.stairs(mat(['stone', '#d8d2c4']), uu[0], vv[0], uu[1], vv[1], g, b.f0, '+u', n));
      for (const s of [11.8, 20.7]) K.rbox(R, st, s - 0.4, g - 0.5, 0, s + 0.4, b.f0 + 0.9, run);
      K.rbox(R, mat(['stucco', '#e6dcc6']), 14.6, b.f0 + 3.3, 0, 17.9, b.f0 + 3.45, 0.9); K.rbox(R, ir, 14.6, b.f0 + 4.3, 0.8, 17.9, b.f0 + 4.36, 0.9);
      for (let s = 14.7; s < 17.9; s += 0.18) K.rbox(R, ir, s - 0.012, b.f0 + 3.45, 0.84, s + 0.012, b.f0 + 4.3, 0.86, { detail: true });
      for (const f of ['W', 'E', 'N', 'S']) { const RR = faceRun(b, f); for (let s = 0.6; s < RR.L - 0.3; s += 1.2) K.rbox(RR, mat(['wood', '#7a5a3a']), s - 0.08, b.eave - 0.3, 0, s + 0.08, b.eave - 0.02, 0.9, { detail: true }); }
    },
  });
  r.object3d.name = 'delta-upsilon-fraternity';
  return r;
}
