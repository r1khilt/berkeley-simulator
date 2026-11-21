// Zeta Beta Tau (ΖΒΤ), 2721 Channing Way. Three-storey Mediterranean / Renaissance-revival chapter house in smooth pale
// grey-white stucco under a shallow hipped roof (LiDAR eaves ~9.6 m, ridge ~11.6 m). On Channing a projecting stucco loggia
// of three round arches on square piers, under a deep cornice with brackets and keystones, carries a terrace: the centre
// arch holds a dark panelled wood door, the side arches tall frosted round-headed windows. White multi-pane sashes in
// plain stucco openings, entry at grade over a red-brick forecourt. Facade from a street photo (refine-south-east).
import * as THREE from 'three';
import { rseHouse } from './lib/rse-finish.js'; // refine-south-east: finished-house pass (gutters, stoops, planting, lights...)
import { railing } from './lib/b12-greek.js';

export const info = {
  id: 'building-473598427',
  name: "Zeta Beta Tau",
  subtitle: "ΖΒΤ · 2721 Channing Way",
  blurb: "Zeta Beta Tau chapter house on Channing Way, a pale stucco house fronted by a three-arched loggia.",
  replaces: ['w/473598427'],
};

export async function build(ctx) {
  const stucco = ['stucco', '#d8d8d2'], trim = ['stucco', '#e4e4de'], white = ['paint', '#f2f2ee'];
  const A = THREE.MathUtils.degToRad(-9.638), ca = Math.cos(A), sa = Math.sin(A); const gUV = (u, v) => ctx.groundAt(u * ca - v * sa, u * sa + v * ca);
  let gm = -Infinity; for (let k = 0; k <= 8; k++) gm = Math.max(gm, gUV(-6.11 + 12.2 * k / 8, 11.97)); const F0 = gm + 0.15;
  const r = rseHouse(ctx, {
    ang: -9.638, floor: F0, storeyH: 3.05, ov: 0.45, belt: false, frieze: false,
    wall: stucco, trim, roof: ['roof', '#8a8d90'], base: ['stucco', '#c9c9c3'], door: ['wood', '#5a3a22'], frame: white,
    win: { w: 1.0, h: 1.85, bay: 2.6, sill: 0.75, tran: 0.6, casing: 0, muntins: 3 },
    blocks: [
      { u0: -6.11, u1: 6.09, v0: -11.0, v1: 10.97, eave: 9.6, roof: { type: 'hip', ridge: 11.4 }, win: { S: { nb: 4, st: [{ none: true }, {}, {}] } } },
      { u0: -4.5, u1: 4.5, v0: 10.97, v1: 13.47, eave: F0 + 4.3, storeys: 1, win: { S: { none: true }, E: { none: true }, W: { none: true } }, roof: { type: 'flat', parapet: 0.9, capMat: trim } },
    ],
    doors: [
      { block: 1, face: 'S', s: 4.5, w: 2.0, h: 2.5, arch: true, mat: ['wood', '#5a3a22'], noStoop: true },
      { block: 1, face: 'S', s: 1.5, w: 2.0, h: 2.5, arch: true, mat: ['paint', '#e6e6e2'], noStoop: true },
      { block: 1, face: 'S', s: 7.5, w: 2.0, h: 2.5, arch: true, mat: ['paint', '#e6e6e2'], noStoop: true },
    ],
    chimneys: [{ u: 0, v: -10.6, w: 1.1, d: 0.7, top: 12.4, mat: stucco }],
    extra: (api) => {
      const { K, M, blocks, faceRun, mat, walkables } = api; const lg = blocks[1]; const R = faceRun(lg, 'S'); const top = lg.eave;
      // deep cornice over the loggia with dark drip line, brackets over piers and arch crowns, keystones
      for (const f of ['S', 'E', 'W']) { const RR = faceRun(lg, f); K.rbox(RR, mat(trim), -0.35, top - 0.6, 0, RR.L + 0.35, top, 0.35); K.rbox(RR, mat(['paint', '#6e7276']), -0.37, top - 0.62, 0.3, RR.L + 0.37, top - 0.54, 0.38); }
      for (const s of [0.4, 1.5, 3.0, 4.5, 6.0, 7.5, 8.6]) K.rbox(R, mat(trim), s - 0.12, top - 1.0, 0, s + 0.12, top - 0.6, 0.3);
      for (const s of [1.5, 4.5, 7.5]) { K.rbox(R, mat(trim), s - 0.1, F0 + 3.15, 0, s + 0.1, F0 + 3.62, 0.08); const a = new THREE.TorusGeometry(1.08, 0.08, 5, 16, Math.PI); a.translate(s, F0 + 2.5, 0.03); K.addRun(R, mat(trim), a); }
      // frosted side arches get dark mullion + transom at the springing
      for (const s of [1.5, 7.5]) { K.rbox(R, M.blackPaint, s - 0.03, F0, -0.17, s + 0.03, F0 + 3.4, -0.14, { detail: true }); K.rbox(R, M.blackPaint, s - 1.0, F0 + 2.48, -0.17, s + 1.0, F0 + 2.54, -0.14, { detail: true }); }
      // gold letters on the west end pier, terrace rail behind the parapet line
      api.letters(R, mat(['metal', '#c9a24a']), 'ΖΒΤ', 0.42, F0 + 1.6, 0.22, { dep: 0.03 });
      // red-brick paved forecourt in front of the arches
      const brk = mat(['brick', '#8e4a3e']); for (let k = 0; k < 4; k++) { const v0 = lg.v1 + k * 1.0; const g = Math.max(K.g(lg.u0, v0 + 0.5), K.g(lg.u1, v0 + 0.5)); K.box(brk, lg.u0 - 0.5, Math.min(K.g(lg.u0, v0 + 0.5), K.g(lg.u1, v0 + 0.5)) - 0.4, v0, lg.u1 + 0.5, g + 0.04, v0 + 1.0); }
      walkables.push(K.walkPoly([[lg.u0, lg.v0], [lg.u1, lg.v0], [lg.u1, lg.v1], [lg.u0, lg.v1]], F0));
    },
  }, { number: '2721', walk: true, plants: true, sconces: false });
  r.object3d.name = 'building-473598427';
  return r;
}
