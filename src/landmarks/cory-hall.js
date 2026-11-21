// Cory Hall (1950; electrical engineering, home of Berkeley EECS). A long cream concrete block on the slope below Hearst Ave:
// full-height projecting piers every ~4.75 m, tall small-paned steel-sash windows, a recessed clerestory band under a heavy
// overhanging roof slab carried on deep box brackets at every pier (the row of "teeth" that identifies it), an interior courtyard,
// rooftop penthouses, and the A. Richard Newton bridge to Sutardja Dai Hall at the south-west corner.
// Massing follows the 2021 LiDAR: flat roof ~31.3 m above the lowest (south-west) grade, ~19 m above Hearst on the north side.
import * as THREE from 'three';
import { Kit, mats, massBlock, inset, bays, gAt, storefront, signText } from './lib/b03-kit.js';
import { panelMat, pathEntrances, entry, planting, bikes, rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'cory-hall',
  name: 'Cory Hall',
  subtitle: 'Electrical Engineering · 1950',
  blurb: 'Named for Clarence L. Cory, an early dean of engineering at Berkeley, Cory Hall opened around 1950 for electrical engineering and is still a home of Berkeley EECS labs and classrooms.',
  replaces: ['r/18935'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M; const B = mats(ctx);
  const fp = ctx.footprints[0];
  const poly = fp.outer.map(([x, z]) => [x, z]); const holes = (fp.holes || []).map((h) => h.map(([x, z]) => [x, z]));
  const WALL = panelMat('coryPanel', { pw: 1.2, ph: 1.0, span: 6.0, base: 0xdcded8, joint: 0xb6b8b2, vary: 0.015, grain: 0.012, stagger: false }); const TRIM = panelMat('coryTrim', { pw: 2.0, ph: 2.0, span: 2.0, base: 0xebe8dc, joint: 0xcfccc0, vary: 0.01, grain: 0.01, stagger: false });
  const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x1f2723, roughness: 0.5, metalness: 0.5 }); const FROST = new THREE.MeshStandardMaterial({ color: 0xc9cec8, roughness: 0.55, metalness: 0.05 });
  const colliders = [], walkables = [];
  const TOP = 26.5, CLER = 29.5, ROOF = 31.3;
  const levels = [-1.9, 3.1, 8.1, 13.1, 18.1, 22.3, TOP]; // lab-height lower floors, two standard floors, clerestory above
  const BAY = 3.55;
  // main storeys: deep piers between recessed small-paned steel-sash windows
  const runs = massBlock(K, {
    poly, holes, levels, top: TOP, wall: WALL, style: 'punched', depth: 0.55, rev: 0.5, glass: GL, frame: FR,
    win: { w: 1.75, h: 4.4, sill: 0.3, bay: BAY, mull: 2, muntins: 8 },
    winAt: (k) => (k === 5 ? { h: 1.85, sill: 0.9, muntins: 2 } : k === 4 ? { h: 3.5, sill: 0.3, muntins: 6 } : null),
    pier: { w: 0.9, p: 0.15, mat: WALL, top: TOP, ends: true }, roof: B.roofMembrane, minEdge: 3.0,
  });
  // clerestory band, set 2 m back in the shadow of the overhang
  massBlock(K, { poly: inset(poly, 2.0), holes: holes.map((h) => inset(h, -2.0)), levels: [TOP, CLER], top: CLER, wall: WALL, style: 'curtain', glass: GL, frame: FR,
    win: { mw: 1.5, spandrel: 0.35 }, core: false, roof: M.concreteDark, minEdge: 2.0 });
  K.prism(M.concreteDark, poly, TOP - 0.3, TOP + 0.05, undefined, holes); // floor of the setback
  // massive overhanging roof fascia (2.5 m out) carried on stepped two-block corbels at every pier
  const OUT = 1.6; const out = inset(poly, -OUT); const holesOut = holes.map((h) => inset(h, OUT));
  K.prism(TRIM, out, ROOF - 0.85, ROOF, undefined, holesOut); // cornice slab
  K.prism(WALL, inset(poly, 0.0), CLER, ROOF - 0.85, undefined, holes);  // fascia wall above the recessed clerestory
  K.prism(B.roofMembrane, inset(poly, -1.45), ROOF, ROOF + 0.05, undefined, holes.map((h) => inset(h, 1.45)));
  const Xr = rnMats(M);
  for (const R of runs) {
    if (R.L < 3.0) continue;
    const nb = Math.max(1, Math.round(R.L / BAY));
    for (let j = 0; j <= nb; j++) { // corbel blocks with a rectangular through-void at every pier (the row of "teeth")
      const s = (R.L / nb) * j; const y1 = ROOF - 0.85, y0 = y1 - 1.7; // short boxy corbel with a square notch, under the cornice
      K.rbox(R, TRIM, s - 0.5, y0, 0.0, s + 0.5, y0 + 0.45, 1.0); K.rbox(R, TRIM, s - 0.5, y1 - 0.55, 0.0, s + 0.5, y1, 1.2);
      K.rbox(R, TRIM, s - 0.5, y0 + 0.45, 0.0, s - 0.17, y1 - 0.55, 1.0); K.rbox(R, TRIM, s + 0.17, y0 + 0.45, 0.0, s + 0.5, y1 - 0.55, 1.0);
      K.rbox(R, TRIM, s - 0.17, y0 + 0.45, 0.0, s + 0.17, y1 - 0.55, 0.3);
      K.rbox(R, WALL, s - 0.45, TOP - 0.2, 0.0, s + 0.45, y0, 0.15); // pier continues up through the clerestory to the corbel
    }
    for (let x = -1.5; x < R.L + 1.5; x += 2.0) K.rbox(R, Xr.steel, x - 0.025, ROOF, OUT - 0.25, x + 0.025, ROOF + 1.1, OUT - 0.2, { detail: true });
    K.rbox(R, M.copper, -1.6, ROOF + 1.05, OUT - 0.27, R.L + 1.6, ROOF + 1.1, OUT - 0.18, { detail: true }); // roof-edge rail
    K.rbox(R, M.copper, -OUT, ROOF - 0.12, OUT - 0.02, R.L + OUT, ROOF + 0.02, OUT + 0.04, { detail: true }); // copper edge flashing
    // frosted upper third in the tall lab windows (storeys 1-4), as in the photos
    const cs = bays(0, R.L, nb);
    for (let k = 1; k <= 4; k++) { const fl = levels[k]; const y0 = fl + 0.3, y1 = Math.min(levels[k + 1] - 0.25, y0 + (k === 4 ? 3.5 : 4.4)); for (const c of cs) { if (y0 < gAt(K, R, c, 0.6) + 0.25) continue; K.rbox(R, FROST, c - 0.86, y1 - (y1 - y0) / 3, -0.5, c + 0.86, y1, -0.48); } }
  }
  // rooftop penthouses / mechanical (LiDAR 33-36 m)
  const pent = [[20.4, -12.3, 27.9, 2.7, 35.6], [-21.6, 0.7, -14.6, 17.7, 33.8], [-19.6, 19.2, -11.1, 28.2, 35.1], [-15.6, -10.8, -7.1, -3.3, 34.4], [0.9, 10.2, 10.9, 15.7, 33.6], [-21.1, -15.8, -10.1, -9.3, 35.0], [10.9, -6.8, 17.4, 1.7, 34.8], [17.4, 4.7, 21.4, 11.7, 35.6], [-29.6, 19.2, -25.6, 26.2, 34.9], [13.9, 7.7, 17.9, 12.2, 33.7]]; // from LiDAR blobs
  for (const [x0, z0, x1, z1, h] of pent) { K.box(WALL, x0, ROOF, z0, x1, h, z1); K.box(B.alum, x0 - 0.05, h - 0.4, z0 - 0.05, x1 + 0.05, h, z1 + 0.05); }
  // north entrance from Hearst (upper level): glazed doors in a deep portal with a "CORY HALL" plaque
  {
    let best = null; for (const R of runs) { const ang = Math.atan2(R.t[1], R.t[0]); if (R.n[1] < -0.9 && R.L > 15 && (!best || R.L > best.L)) best = R; }
    if (best) {
      const s = best.L * 0.5; const gy = gAt(K, best, s, 2);
      K.rbox(best, WALL, s - 3.4, gy - 0.5, 0, s + 3.4, gy + 4.4, 1.6);
      K.rbox(best, M.concreteDark, s - 2.6, gy + 0.02, 0.6, s + 2.6, gy + 3.6, 1.62);
      storefront(K, best, s - 2.4, s + 2.4, gy + 0.03, gy + 3.4, { glass: GL, frame: FR, rev: -1.61, transom: gy + 2.5 });
      signText(K, best, 'CORY HALL', s, gy + 4.0, 0.5, { spacing: 0.15, color: '#3b3a36', metal: 0.2, d: 1.63 });
      walkables.push(K.walkPoly([best.at(s - 3.4, 0), best.at(s + 3.4, 0), best.at(s + 3.4, 1.6), best.at(s - 3.4, 1.6)], gy + 0.02));
      // central arched parapet over the Hearst front: ~5.6 m arch rising ~4 m above the cornice, medallion (teal ring, copper cross) + keystone
      { const y0 = ROOF, r = 2.8, h = 4.0; const sh = new THREE.Shape(); sh.moveTo(s - r - 0.7, y0); sh.lineTo(s + r + 0.7, y0); sh.lineTo(s + r + 0.7, y0 + h - r); sh.absarc(s, y0 + h - r, r + 0.7, 0, Math.PI, false); sh.lineTo(s - r - 0.7, y0);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, OUT - 0.75); K.addRun(best, TRIM, g);
        for (const sx of [s - r - 0.7, s + r + 0.7]) K.rbox(best, TRIM, sx - 0.45, ROOF - 0.85, OUT - 0.8, sx + 0.45, y0 + h - r + 0.3, OUT - 0.05);
        const cy = y0 + h - r - 0.2; const ring = new THREE.TorusGeometry(0.8, 0.12, 8, 28); ring.translate(s, cy, OUT - 0.1); K.addRun(best, B.tealPaint, ring, { uvMode: 'keep', detail: true });
        K.rbox(best, M.copper, s - 0.6, cy - 0.09, OUT - 0.16, s + 0.6, cy + 0.09, OUT - 0.08, { detail: true }); K.rbox(best, M.copper, s - 0.09, cy - 0.6, OUT - 0.16, s + 0.09, cy + 0.6, OUT - 0.08, { detail: true });
        K.rbox(best, TRIM, s - 0.35, y0 + h + 0.55, OUT - 0.8, s + 0.35, y0 + h + 0.95, OUT - 0.05); }
      // planting along the Hearst front and bike racks beside the entrance
      planting(K, best, 1.0, best.L - 1.0, { d0: 0.0, depth: 1.5, h: 0.9, skip: [[s - 4.2, s + 4.2]], seed: 9 });
      colliders.push(...bikes(K, best, s + 7.0, 2.6, 5, 3));
    }
  }
  // courtyard floor at the Hearst-side grade (LiDAR ~11.3 m)
  if (holes.length) K.prism(M.paving, holes[0], -1, 11.3);
  colliders.push({ type: 'poly', pts: poly.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]), y0: -2, y1: ROOF });
  const object3d = K.finish(); object3d.name = 'cory-hall';
  return { object3d, colliders, walkables };
}
