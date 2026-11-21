// Cory Hall (1950; electrical engineering, home of Berkeley EECS). A long cream concrete block on the slope below Hearst Ave:
// full-height projecting piers every ~4.75 m, tall small-paned steel-sash windows, a recessed clerestory band under a heavy
// overhanging roof slab carried on deep box brackets at every pier (the row of "teeth" that identifies it), an interior courtyard,
// rooftop penthouses, and the A. Richard Newton bridge to Sutardja Dai Hall at the south-west corner.
// Massing follows the 2021 LiDAR: flat roof ~31.3 m above the lowest (south-west) grade, ~19 m above Hearst on the north side.
import * as THREE from 'three';
import { Kit, mats, massBlock, inset, bays, gAt, storefront, signText } from './lib/b03-kit.js';

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
  const WALL = B.offWhite, GL = B.glassGrey, FR = M.darkBronze;
  const colliders = [], walkables = [];
  const TOP = 26.5, CLER = 29.5, ROOF = 31.3;
  const levels = [-1.9, 3.1, 8.1, 13.1, 18.1, 22.3, TOP]; // lab-height lower floors, two standard floors, clerestory above
  const BAY = 6.0;
  // main storeys: deep piers between recessed small-paned steel-sash windows
  const runs = massBlock(K, {
    poly, holes, levels, top: TOP, wall: WALL, style: 'punched', depth: 0.55, rev: 0.5, glass: GL, frame: FR,
    win: { w: 3.1, h: 3.9, sill: 0.6, bay: BAY, mull: 2, muntins: 6 },
    winAt: (k) => (k >= 4 ? { h: 2.6, sill: 0.8, muntins: 3 } : null),
    pier: { w: 1.5, p: 0.9, mat: WALL, top: CLER, ends: true, from: 13.1 }, roof: B.roofMembrane, minEdge: 3.0,
  });
  // clerestory band, set 2 m back in the shadow of the overhang
  massBlock(K, { poly: inset(poly, 2.0), holes: holes.map((h) => inset(h, -2.0)), levels: [TOP, CLER], top: CLER, wall: WALL, style: 'curtain', glass: GL, frame: FR,
    win: { mw: 1.5, spandrel: 0.35 }, core: false, roof: M.concreteDark, minEdge: 2.0 });
  K.prism(M.concreteDark, poly, TOP - 0.3, TOP + 0.05, undefined, holes); // floor of the setback
  // massive overhanging roof fascia (2.5 m out) carried on stepped two-block corbels at every pier
  const out = inset(poly, -2.5); const holesOut = holes.map((h) => inset(h, 2.5));
  K.prism(WALL, out, CLER, ROOF, undefined, holesOut);
  K.prism(B.roofMembrane, inset(poly, -2.3), ROOF, ROOF + 0.05, undefined, holes.map((h) => inset(h, 2.3)));
  for (const R of runs) {
    if (R.L < 3.0) continue;
    const nb = Math.max(1, Math.round(R.L / BAY));
    for (let j = 0; j <= nb; j++) {
      const s = (R.L / nb) * j;
      K.rbox(R, WALL, s - 0.7, TOP - 1.4, 0.0, s + 0.7, TOP + 1.0, 1.5);
      K.rbox(R, WALL, s - 0.6, TOP + 1.0, 0.0, s + 0.6, CLER + 0.02, 2.5);
      K.rbox(R, M.concreteDark, s - 0.12, TOP + 1.3, 2.48, s + 0.12, CLER - 0.3, 2.53, { detail: true }); // notch slot
    }
    K.rbox(R, M.copper, -2.5, ROOF - 0.15, 2.5, R.L + 2.5, ROOF + 0.02, 2.58, { detail: true }); // copper edge flashing
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
    }
  }
  // courtyard floor at the Hearst-side grade (LiDAR ~11.3 m)
  if (holes.length) K.prism(M.paving, holes[0], -1, 11.3);
  colliders.push({ type: 'poly', pts: poly.map(([x, z]) => [+x.toFixed(3), +z.toFixed(3)]), y0: -2, y1: ROOF });
  const object3d = K.finish(); object3d.name = 'cory-hall';
  return { object3d, colliders, walkables };
}
