// Alpha Epsilon Pi (ΑΕΠ), 2430 Piedmont Avenue. Boxy three-storey beige stucco chapter house with a very low hipped roof
// hidden behind deep dark eaves, a bracketed blue-grey belt course over the ground floor and big blue ΑΕΠ letters on the
// Piedmont façade between the second and third floors; entry from a wooden deck.
import { greekHouse } from './lib/greek-kit.js';

export const info = {
  id: 'building-276665411',
  name: 'Alpha Epsilon Pi',
  subtitle: 'ΑΕΠ · 2430 Piedmont Avenue',
  blurb: 'Chapter house of Alpha Epsilon Pi on Piedmont Avenue, a three-storey stucco block with big blue letters facing the street.',
  replaces: ['w/276665411'],
};

export async function build(ctx) {
  const slate = ['paint', '#4a5560'];
  const r = greekHouse(ctx, {
    ang: -8.908, front: { block: 0, face: 'E', above: 0.5 }, storeyH: 3.3, ov: 0.9,
    wall: ['stucco', '#d9cdb4'], trim: slate, frame: ['paint', '#e8e0cc'], roof: ['roof', '#5e6670'], base: ['stucco', '#b8ad96'], door: ['paint', '#5a4a3a'],
    win: { w: 0.85, h: 1.65, bay: 2.5, sill: 0.85, tran: 0.5, casing: 0, sillMat: ['paint', '#e8e0cc'] }, frieze: false,
    blocks: [{ u0: -9.86, u1: 9.86, v0: -5.56, v1: 5.56, eave: 11.3, roof: { type: 'hip', ridge: 12.5 }, win: { E: { nb: 4, pair: true, w: 0.8 } } }],
    doors: [{ block: 0, face: 'E', s: 2.2, w: 1.1, h: 2.3, fan: true }],
    letters: [{ block: 0, face: 'E', s: 6.6, y: 7.55, h: 1.05, text: 'ΑΕΠ', mat: ['paint', '#2f5fb0'] }],
    porches: [{ block: 0, face: 'E', s0: 0.4, s1: 4.4, depth: 2.4, cols: 2, colStyle: 'square', colD: 0.18, colMat: ['paint', '#7a8c9c'], top: 2.4, rail: true, roofMat: ['paint', '#7a8c9c'], fascia: ['paint', '#7a8c9c'], floorMat: ['wood', '#a0784f'] }],
    extra: ({ K, faceRun, blocks, mat }) => { // bracketed belt course over the ground floor on all sides
      const b = blocks[0]; const y = b.f0 + 3.3; const bm = mat(['paint', '#6f8496']);
      for (const f of ['S', 'E', 'N', 'W']) { const R = faceRun(b, f); K.rbox(R, bm, -0.1, y - 0.12, 0, R.L + 0.1, y + 0.14, 0.22); for (let s = 0.8; s < R.L - 0.5; s += 1.6) K.rbox(R, bm, s - 0.06, y - 0.4, 0, s + 0.06, y - 0.12, 0.16, { detail: true }); }
    },
  });
  r.object3d.name = 'building-276665411';
  return r;
}
