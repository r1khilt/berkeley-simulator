// Anderson Hall, 1811–1815 Arch Street — Pacific School of Religion student housing on Holy Hill (renovated as shared
// dorm suites). A mid-century flat-roofed residence block stepping down the hillside: five floors on the low west side,
// buff stucco walls with a concrete base, regular bays of bronze-framed windows, a thin projecting roof slab, a recessed
// central entry court and a stair/elevator penthouse. Massing from the 2021 LiDAR (roof ≈15.6 m above the low west side).
import * as THREE from 'three';
import { Kit, pal, house, roof } from './lib/b08a-kit.js';
import { finishGround, gradedOps } from './lib/rn-b-ground.js';

export const info = {
  id: 'anderson-hall',
  name: 'Anderson Hall',
  subtitle: 'Pacific School of Religion · 1811 Arch St',
  blurb: 'Student residence of the Pacific School of Religion on Holy Hill, north of the UC Berkeley campus.',
  replaces: ['w/190391829'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5.0)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stucco.clone(); ST.color = new THREE.Color(0xe8e0cf); ST.name = 'anderson:stucco';
  const colliders = [];
  const u0 = -16.15, u1 = 17.84, v0 = -10.2, v1 = 10.5, TOP = 15.5;
  const fh = (TOP - 0.4 - 0.3) / 5; const FLS = [0, 1, 2, 3, 4].map((k) => 0.4 + k * fh); const W = (o) => gradedOps(K, FLS, fh, { bay: 3.4, ww: 1.8, wh: 1.4, mull: 1, ...o });
  const A = house(K, { u0, u1, v0, v1, g0: 0.4, y0: -1.5, eave: TOP, storeys: 5, mat: ST, frame: P.frameBronze, sillMat: P.concreteBuff, depth: 0.3,
    faces: { N: W({}), S: W({ doors: [5] }), W: W({ doors: [3] }), E: W({ doors: [2] }) },
    plinth: { h: 0.9, mat: P.concreteWarm, out: 0.05 },
    roof: { type: 'flat', ovFlat: 0.6, slab: P.trimCream } });
  // ground floor: glazed entries under flat canopies where the paths arrive, foundation planting, bikes (rn-b-ground)
  const G = finishGround(K, ctx, ['S', 'E', 'N', 'W'].map((f) => ({ R: A.runs[f], f, floor: 0.4, skip: [] })).filter((r) => r.R), { door: 'glass', n: 2, entry: { w: 2.2, h: 2.7, surround: P.concreteWarm, canopy: { d: 2.4, t: 0.2, mat: P.trimCream } }, bikes: 4, bench: true, plant: { h: 0.8, depth: 1.2 } });
  colliders.push(...G.colliders);
  // stair / elevator penthouse
  K.box(ST, -14.2, TOP - 0.3, -2.6, -10.0, TOP + 2.6, 0.4); K.box(P.trimCream, -14.5, TOP + 2.6, -2.9, -9.7, TOP + 2.8, 0.7);
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, TOP + 3));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: G.walkables };
}
