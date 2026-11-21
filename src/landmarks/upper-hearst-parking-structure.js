// Upper Hearst Parking Structure (UC Berkeley, Hearst Ave near Gayley Rd). A banded concrete garage whose decks wrap
// the big rounded south-east corner in continuous light-grey spandrel bands over set-back round columns, with tennis
// courts on the roof behind a tall fence (OSM sport=tennis; the aerial shows a green court surface with court lines,
// and the court outlines are in OSM). Massing from the 2021 LiDAR: roof ~12.0 m above the low (south) side.
import * as THREE from 'three';
import { GarageKit, matColor, plainMat } from './lib/b06p-garage.js';

export const info = {
  id: 'upper-hearst-parking-structure',
  name: 'Upper Hearst Parking Structure',
  subtitle: 'Parking structure · tennis courts on the roof',
  blurb: 'A UC Berkeley parking structure of about 400 spaces on Hearst Avenue, with tennis courts on its roof deck.',
  replaces: ['w/118550142'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, -9.3, 2701); const M = ctx.M, G = K.G;
  const conc = plainMat(0xa9a59c, { roughness: 0.93 }), stain = plainMat(0x7d7a73), hedge = plainMat(0x3f5a2e, { roughness: 1 }), fenceMat = G.chain;
  const TOP = 12.0, LEV = [0.8, 3.6, 6.4, 9.2, TOP];
  let P = K.simplify(K.framePoly(ctx.footprints[0].outer), 2.0);
  { // replace the faceted south-east corner by a true circular arc
    const near = (q) => P.reduce((bi, p, i) => (Math.hypot(p[0] - q[0], p[1] - q[1]) < Math.hypot(P[bi][0] - q[0], P[bi][1] - q[1]) ? i : bi), 0); const i0 = near([9.9, 21.0]), i1 = near([29.9, 0.5]);
    if (i0 >= 0 && i1 >= 0 && i0 !== i1) P = K.smoothArc(P, Math.min(i0, i1), Math.max(i0, i1), 3); }
  const runs = K.bandFacade(P, LEV, { mat: conc, profile: (y) => [[0, y - 0.75], [0.32, y - 0.72], [0.45, y - 0.6], [0.5, y - 0.4], [0.5, y + 0.9], [0.46, y + 1.02], [0.33, y + 1.08], [0, y + 1.1]], colSet: 2.6, colR: 0.27, bay: 8.0, colSeg: 12 });
  K.plinth(P, LEV[0] + 0.1, conc);
  for (let k = 1; k < LEV.length; k++) K.loop(stain, P, [[0.03, LEV[k] - 0.72], [0.03, LEV[k] - 0.6]]);
  // low shrub hedge along the exposed street sides
  for (let i = 0; i < P.length; i++) { const R = K.run(P[i], P[(i + 1) % P.length]); if (R.n[1] < -0.5) continue; for (let s0 = 0; s0 < R.L - 0.3; s0 += 3) { const s1 = Math.min(R.L + 0.3, s0 + 3.4); const g = K.gSamples(R, s0, s1, 1.2, 2); const gy = Math.min(...g); if (Math.max(...g) - gy > 1.2) continue; K.rbox(R, hedge, s0 - 0.2, gy - 0.6, 0.45, s1, gy + 0.85, 1.6); } }
  K.decks(P, LEV, { core: 11, runs, skipTop: true, cars: 0.3, depth: 11, colRow: 8, inset: 0.0 });
  K.prism(G.deck, P, TOP - 0.3, TOP - 0.05);
  // court surface over the whole deck + three courts (OSM court outlines: ~14.3 m spacing, long axis north-south)
  const courtG = matColor(G.courtG, 0x2f6e5c), courtIn = matColor(G.courtG, 0x3b7f68);
  K.prism(courtG, P, TOP - 0.05, TOP);
  K.tennis(-4.65, -0.6, TOP, { n: 3, axis: 'v', wide: 14.3, run: 35.5, surf: courtIn, outer: courtG, fence: 0 });
  // elevator/stair housing on the roof (aerial: dark box ~10 x 5 m east of the courts) and a north-east stair tower
  K.tower(17.5, -3.2, 26.5, 2.6, TOP - 0.3, TOP + 3.4, { mat: conc, glass: ['W'], door: { face: 'W', s: 2.2, y: TOP } });
  K.tower(22.8, -19.3, 28.9, -13.4, K.g(26, -21) - 1.5, TOP + 3.0, { mat: conc, glass: ['N'], door: { face: 'N', s: 3, y: K.g(26, -21) } });
  // tall court fence on the roof edge (curved-top posts with netting)
  // tall netting on slim posts whose tops curve inward (no windscreen), following the curve
  const ring = P.map(([u, v]) => [u, v]);
  K.fence([...ring, ring[0]], TOP + 1.07, 3.3, { mat: fenceMat, pitch: 4.0, postR: 0.045, top: true });

  for (const [u, v] of [[-26.5, -19], [8, 19.6], [8, -18.6]]) K.lightPole(u, TOP, v, 8.0, 0, { heads: 1 });
  // blue P sign at the Hearst Avenue entrance
  const R = K.run([-16, 21], [9.9, 21]); K.sign(R, 4, LEV[1] + 0.25, 0.47, 'UPPER HEARST', { w: 4.4, h: 1.1, sub: 'Parking structure' });
  K.walkables.push(K.walkPoly(P, TOP));
  K.colliders.push(K.colPoly([[17.5, -3.2], [26.5, -3.2], [26.5, 2.6], [17.5, 2.6]], TOP - 0.5, TOP + 3.8));
  K.perimeterColliders(P, -3, TOP + 1.0, K.autoGaps(P, TOP, 0.6));
  { const [x, z] = K.xz(26, -21.5); const [tx, tz] = K.xz(21, -10); K.interactions.push({ id: 'uh-roof', pos: [x, K.g(26, -21.5) + 1, z], radius: 3, label: 'Take the stairs to the roof courts', teleport: [tx, TOP + 0.1, tz] }); }
  const object3d = K.done('upper-hearst-parking-structure');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
