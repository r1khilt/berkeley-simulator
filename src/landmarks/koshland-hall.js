// Koshland Hall (1991), a five-storey laboratory building for the College of Natural Resources designed to match the
// agricultural group: cream stucco over a darker base, regular windows, and red-tile hip roofs over a cross-shaped plan.
// Massing from LiDAR: end pavilions ridge ~26 m, central range ~23 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
import { gAt, storefront } from './lib/b03-kit.js';
import { panelMat, pathEntrances, planting, bikes } from './lib/rn-kit.js';
export const info = {
  id: 'koshland-hall', name: 'Koshland Hall', subtitle: '1991 · Plant & microbial biology',
  blurb: 'Named for biochemist Daniel E. Koshland Jr., this laboratory building takes its stucco walls and red tile roofs from the neighbouring agricultural halls.',
  replaces: ['w/24024682', 'way/24024682'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-4.5)); const M = ctx.M;
  const ST = panelMat('koshlandPanel', { pw: 1.5, ph: 0.75, span: 3.0, base: 0xe6e4de, joint: 0xc6c3bb, jw: 0.015, vary: 0.012, grain: 0.01, stagger: false }), BASE = tint(M.concrete, 0xcfccc4), FR = solid(0x2a2a2a, 0.5, 0.3);
  const lv = [1.6, 5.4, 9.2, 13.0, 16.8, 19.6];
  const D = { mat: ST, baseMat: BASE, frame: FR, fl: 1.6, levels: lv, top: 19.8, bay: 3.2, beltAt: [1.6, 5.4], cornice: { P: 0.35, H: 0.45 }, soffit: tint(M.woodDark, 0x8a6f52),
    winFn: (k) => (k === 4 ? { w: 1.3, h: 1.5, sill: 0.6, mull: 1 } : { w: 1.5, h: 2.1, sill: 0.9, mull: 1, tran: 0.68 }) };
  const colliders = genParts(K, [
    { poly: rect(-15.7, -28.4, 15.0, -14.0), roof: 'hip', slope: 0.42, ov: 0.45 },
    { poly: rect(-15.6, 14.0, 14.8, 28.2), roof: 'hip', slope: 0.42, ov: 0.45 },
    { poly: rect(-24.8, -14.0, 24.6, 14.0), top: 19.6, roof: 'hip', slope: 0.26, ov: 0.45 },
  ], D);
  // entrance loggia where the paths arrive on the central block: round columns carrying a slab, storefront + timber doors, sconces,
  // paver plaza with steps; planting and bikes along the base (refine-north)
  { const runs = [K.run([-24.8, 14.0], [24.6, 14.0]), K.run([24.6, 14.0], [24.6, -14.0]), K.run([24.6, -14.0], [-24.8, -14.0]), K.run([-24.8, -14.0], [-24.8, 14.0])];
    const ents = pathEntrances(K, ctx, runs, { maxDist: 6 }); const e = ents[0] || { R: runs[1], s: 14 };
    const R = e.R; const s = Math.min(R.L - 7, Math.max(7, e.s)); const g = Math.max(gAt(K, R, s, 2.5), 0.0); const FLr = Math.max(1.6, g);
    const COL = tint(M.marble, 0xe8e6e0); const DOOR = tint(M.woodDark, 0x9a4a22);
    for (let i = 0; i < 6; i++) { const ss = s - 6.25 + i * 2.5; const p = R.at(ss, 3.2); K.cyl(COL, p[0], FLr - 0.3, p[1], 0.35, 0.35, 4.6, 18); colliders.push(K.colCyl(p[0], p[1], 0.38, FLr - 1, FLr + 4.3)); }
    K.rbox(R, COL, s - 7.4, FLr + 4.3, 0, s + 7.4, FLr + 4.9, 3.75);
    K.rbox(R, M.paving, s - 7.4, Math.min(g, FLr) - 0.6, 0, s + 7.4, FLr, 3.75);
    storefront(K, R, s - 6.6, s + 6.6, FLr + 0.02, FLr + 4.2, { glass: M.windowNight, frame: FR, rev: -0.5, transom: FLr + 2.8, mw: 1.65 });
    for (const ds of [-1.0, 1.0]) K.rbox(R, DOOR, s + ds - 0.95, FLr + 0.02, 0.5, s + ds + 0.95, FLr + 2.75, 0.56);
    for (const ds of [-7.0, 7.0]) { const p = R.at(s + ds, 0.5); K.cyl(M.darkBronze, p[0], FLr + 3.2, p[1], 0.09, 0.09, 0.45, 10, { detail: true }); K.cyl(M.lampGlow, p[0], FLr + 3.25, p[1], 0.07, 0.07, 0.35, 10, { detail: true }); }
    const pav = tint(M.paving, 0xb46a5a); for (let k = -3; k <= 3; k++) K.rbox(R, pav, s + k * 3 - 0.2, g - 0.3, 3.75, s + k * 3 + 0.2, g + 0.04, 11, { detail: true });
    if (FLr - g > 0.25) { const n = Math.max(2, Math.round((FLr - g) / 0.15)); for (let i = 0; i < n; i++) K.rbox(R, BASE, s - 7.4, g - 0.6, 3.75 + i * 0.35, s + 7.4, FLr - (FLr - g) * (i + 1) / n, 3.75 + (i + 1) * 0.35); }
    for (const Rr of runs) planting(K, Rr, 1.0, Rr.L - 1.0, { d0: 0.3, depth: 1.2, h: 0.85, skip: Rr === R ? [[s - 8.5, s + 8.5]] : [], seed: 131 });
    colliders.push(...bikes(K, R, s + 12.5, 3.0, 6, 3)); }
  const object3d = K.finish(); object3d.name = 'koshland-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables: [] };
}
