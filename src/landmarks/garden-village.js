// Garden Village (Stanley Saitowitz | Natoma Architects, 2016), 2201 Dwight Way: student housing broken into a village
// of narrow four- and five-storey boxes on a grid, separated by slots and courts and tied together by open-air bridges.
// Boxes alternate white panel and weathering-steel cladding, with tall narrow windows staggered floor to floor (some in
// projecting box frames), storefront glazing at grade and planted roof gardens. Grid and heights from the footprint
// and 2021 LiDAR (frame -9°).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { bmats } from './lib/b08c-kit.js';

export const info = {
  id: 'garden-village',
  name: 'Garden Village',
  subtitle: 'Stanley Saitowitz · 2016',
  blurb: 'Student housing at 2201 Dwight Way designed by Stanley Saitowitz, built as a cluster of separate boxes linked by bridges, with gardens on the roofs.',
  replaces: ['r/9334851', 'relation/9334851'],
};

export async function build(ctx) {
  const M = ctx.M; const B = bmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-9));
  const tint = (base, c, r) => { const m = base.clone(); m.color = new THREE.Color(c); if (r != null) m.roughness = r; return m; };
  const WHITE = tint(M.stuccoWhite, 0xf3f4f0, 0.55), CORTEN = tint(M.stuccoWhite, 0x7c4028, 0.75), GREY = WHITE;
  const FRAME = new THREE.MeshStandardMaterial({ color: 0xf0f1ee, roughness: 0.3, metalness: 0.35 });
  const PLANT = tint(M.turf, 0x557a3a, 0.95);
  const colliders = [], walkables = [];
  // [u0, u1, v0, v1, top, cladding]
  const boxes = [
    [-21.8, -12.7, -25.5, -15.4, 14.6, 0], [-11.2, -2.3, -25.5, -14.2, 17.0, 1], [1.9, 10.9, -25.5, -17.6, 17.0, 0], [1.9, 10.9, -15.6, -9.8, 17.0, 2], [12.7, 21.6, -25.6, -15.4, 17.0, 1],
    [-21.8, -12.7, -11.8, -1.8, 14.6, 1], [-11.2, -2.2, -14.1, -7.1, 13.8, 0], [-11.2, -2.2, -3.9, 6.1, 11.2, 2], [1.9, 11.0, -6.5, 3.3, 11.2, 1], [12.8, 21.7, -11.9, -1.8, 17.0, 0],
    [-21.8, -12.7, 1.8, 11.9, 14.6, 0], [-11.1, -2.2, 9.7, 16.8, 14.2, 1], [2.0, 11.0, 7.0, 14.6, 17.0, 0], [12.8, 21.7, 1.7, 11.6, 17.0, 1],
    [-21.7, -12.6, 15.4, 25.4, 15.0, 1], [-11.0, -2.1, 17.6, 25.3, 17.0, 0], [2.1, 12.9, 16.6, 25.3, 17.0, 2], [12.9, 21.8, 15.2, 25.2, 17.0, 0],
  ];
  const clad = [WHITE, CORTEN, GREY];
  const fh = 3.05;
  boxes.forEach(([u0, u1, v0, v1, top, ci], bi) => {
    const mat = clad[ci]; const g = K.gMin(u0, v0, u1, v1); const y0 = g - 1.2;
    K.box(M.concreteDark, u0 + 0.4, y0, v0 + 0.4, u1 - 0.4, top - 0.2, v1 - 0.4);
    const runs = [K.run([u0, v1], [u1, v1]), K.run([u1, v1], [u1, v0]), K.run([u1, v0], [u0, v0]), K.run([u0, v0], [u0, v1])];
    runs.forEach((R, fi) => {
      // ground floor storefront
      const gOps = [{ s0: 0.6, s1: R.L - 0.6, y0: g + 0.15, y1: g + 2.75, sill: false }];
      K.wall(R, mat, 0, R.L, y0, g + 3.2, gOps, 0.3);
      K.fill(R, gOps[0], { frame: FRAME, mull: Math.max(1, Math.round(R.L / 1.5)) - 1, rev: 0.22, glass: M.glass });
      // upper floors: tall narrow windows, staggered floor to floor
      const nF = Math.max(1, Math.floor((top - 0.9 - (g + 3.2)) / fh));
      const ops = [];
      for (let k = 0; k < nF; k++) {
        const yb = g + 3.2 + k * fh + 0.35; const n = Math.max(2, Math.floor(R.L / 2.3));
        for (let i = 0; i < n; i++) { const t = (i + 0.5 + ((k + bi + fi) % 2 ? 0.28 : -0.12)) / n; const s = Math.min(R.L - 0.9, Math.max(0.9, t * R.L)); ops.push({ s0: s - 0.5, s1: s + 0.5, y0: yb, y1: yb + 2.25, sill: false, box: (i + k + bi) % 3 === 0 }); }
      }
      K.wall(R, mat, 0, R.L, g + 3.2, top, ops, 0.3);
      for (const o of ops) {
        K.fill(R, o, { frame: FRAME, mull: 0, rev: 0.22, tran: [o.y0 + 1.7], glass: M.glass });
        if (o.box) { const d = 0.55; K.rbox(R, FRAME, o.s0 - 0.12, o.y0 - 0.12, 0, o.s1 + 0.12, o.y0, d, { detail: false }); K.rbox(R, FRAME, o.s0 - 0.12, o.y1, 0, o.s1 + 0.12, o.y1 + 0.12, d); K.rbox(R, FRAME, o.s0 - 0.12, o.y0, 0, o.s0, o.y1, d); K.rbox(R, FRAME, o.s1, o.y0, 0, o.s1 + 0.12, o.y1, d); }
      }
      // parapet coping
      K.rbox(R, FRAME, -0.05, top, -0.3, R.L + 0.05, top + 0.08, 0.03);
    });
    // roof deck, parapet and garden
    K.box(M.concreteDark, u0 + 0.25, top - 0.25, v0 + 0.25, u1 - 0.25, top - 0.05, v1 - 0.25);
    for (const [a, b] of [[[u0, v0], [u1, v0 + 0.3]], [[u0, v1 - 0.3], [u1, v1]], [[u0, v0], [u0 + 0.3, v1]], [[u1 - 0.3, v0], [u1, v1]]]) K.box(mat, a[0], top - 0.05, a[1], b[0], top + 0.3, b[1]);
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    K.box(M.soil, u0 + 1.2, top - 0.05, v0 + 1.2, u1 - 1.2, top + 0.45, v1 - 1.2);
    for (let k = 0; k < 10; k++) { const pu = cu + ((k * 37 + bi * 13) % 9 - 4) * 0.55, pv = cv + ((k * 23 + bi * 7) % 9 - 4) * 0.55; K.lathe(PLANT, [[0.05, 0], [0.75, 0.25], [0.8, 0.6], [0.45, 1.0 + (k % 3) * 0.3], [0.001, 1.1 + (k % 3) * 0.3]], pu, top + 0.4, pv, 7, { detail: true }); }
    if (bi % 3 === 0) { K.cyl(M.woodDark, cu + 1, top + 0.45, cv - 1, 0.08, 0.08, 1.8, 6, { detail: true }); K.lathe(PLANT, [[0.1, 0], [1.0, 0.4], [1.1, 1.0], [0.6, 1.6], [0.001, 1.8]], cu + 1, top + 2.0, cv - 1, 7, { detail: true }); }
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, top + 1));
  });
  // open-air bridges across the slots between boxes (each upper floor)
  const bridges = [[-11.2, -2.3, -14.2, -11.8, 'v'], [1.9, 10.9, -17.6, -15.6, 'v'], [-2.3, 1.9, -22.0, -20.0, 'u'], [-2.2, 1.9, -1.0, 1.0, 'u'], [-2.2, 2.0, 12.0, 14.0, 'u'], [2.0, 11.0, 14.6, 16.6, 'v'], [-11.0, -2.2, 16.8, 17.6, 'v'], [10.9, 12.8, -5.0, -3.0, 'u'], [-12.7, -11.1, 4.0, 6.0, 'u']];
  for (const [u0, u1, v0, v1, ax] of bridges) {
    const g = K.gMin(u0, v0, u1, v1);
    for (let y = g + 3.2; y < 15.5; y += fh) {
      K.box(M.concrete, u0, y - 0.25, v0, u1, y, v1);
      if (ax === 'u') { for (const vv of [v0, v1]) K.box(M.glassLight, u0, y, vv - 0.03, u1, y + 1.05, vv + 0.03, { detail: true }); }
      else { for (const uu of [u0, u1]) K.box(M.glassLight, uu - 0.03, y, v0, uu + 0.03, y + 1.05, v1, { detail: true }); }
    }
  }
  // brick-paved entry walk in the central court
  { const g = K.gMin(-2.2, -14, 2.0, 16.8); K.box(B.brickPave, -2.2, g - 0.5, -14.0, 1.9, g + 0.04, 16.8); }
  const object3d = K.finish();
  object3d.name = 'garden-village';
  return { object3d, colliders, walkables };
}
