// Benton Hall — Pacific School of Religion residence on Holy Hill (Le Conte Avenue / Arch Street), now renovated as shared
// student suites. A mid-century residence block (no usable photo was available): smooth warm off-white stucco on a concrete
// base, flat roofs with a thin projecting fascia slab, regular bays of bronze-anodised aluminium windows, glazed entries under
// flat canopies, foundation planting. L-shaped plan stepping down the hillside; massing from the 2021 LiDAR (roofs ≈13–14 m
// above the low west side).
import * as THREE from 'three';
import { Kit, pal, house } from './lib/b08a-kit.js';
import { rectRuns, finishGround, gradedOps } from './lib/rn-b-ground.js';

export const info = {
  id: 'benton-hall',
  name: 'Benton Hall',
  subtitle: 'Pacific School of Religion',
  blurb: 'Student residence of the Pacific School of Religion on Holy Hill, north of the UC Berkeley campus.',
  replaces: ['w/190391825'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-3.8)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stucco.clone(); ST.color = new THREE.Color(0xe6ddca); ST.name = 'benton:stucco';
  const FAS = P.trimCream; const BASE = P.concreteWarm;
  const colliders = []; const fo = { bay: 3.3, ww: 1.8, wh: 1.4, mull: 1 };
  const common = { mat: ST, frame: P.frameBronze, sillMat: P.concreteBuff, depth: 0.3, plinth: { h: 0.9, mat: BASE, out: 0.05 }, roof: { type: 'flat', ovFlat: 0.55, slab: FAS } };
  const RECTS = [
    { u0: -8.95, u1: 3.4, v0: -17.15, v1: 11.3, eave: 13.4, faces: { S: false } },
    { u0: 3.4, u1: 16.5, v0: 3.6, v1: 11.3, eave: 14.0, faces: { W: false } },
    { u0: -9.75, u1: 6.6, v0: 11.3, v1: 14.3, eave: 12.0, faces: { N: false } },
    { u0: -3.56, u1: 2.33, v0: -19.28, v1: -17.15, eave: 13.0, faces: { S: false } },
  ];
  const FL = (eave) => { const fh = (eave - 0.6 - 0.3) / 4; return [[0, 1, 2, 3].map((k) => 0.6 + k * fh), fh]; };
  const GO = (r, o) => gradedOps(K, ...FL(r.eave), o);
  house(K, { ...RECTS[0], g0: 0.6, y0: -1.5, storeys: 4, ...common, faces: { N: GO(RECTS[0], { ...fo, doors: [1] }), S: false, W: GO(RECTS[0], { ...fo, doors: [4] }), E: GO(RECTS[0], fo) } });
  house(K, { ...RECTS[1], g0: 0.6, y0: -1.5, storeys: 4, ...common, faces: { W: false, N: GO(RECTS[1], fo), S: GO(RECTS[1], fo), E: GO(RECTS[1], { ...fo, doors: [1] }) } });
  house(K, { ...RECTS[2], g0: 0.6, y0: -1.5, storeys: 4, ...common, faces: { N: false, S: GO(RECTS[2], { ...fo, doors: [2] }), W: GO(RECTS[2], { nb: 1, ww: 1.2, wh: 1.3 }), E: GO(RECTS[2], { nb: 1, ww: 1.2, wh: 1.3 }) } });
  // stair tower: full-height glazed slot
  house(K, { ...RECTS[3], g0: 0.6, y0: -1.5, storeys: 4, ...common, faces: { S: false, N: { nb: 1, ww: 1.0, wh: 2.6, mull: 0, sill: 0.3 }, E: [], W: [] } });
  // ground floor: glazed entries with flat canopies where the paths arrive, planting, bikes (rn-b-ground)
  const G = finishGround(K, ctx, rectRuns(K, RECTS.map((r) => ({ ...r, floor: 0.6 }))), { door: 'glass', n: 2, entry: { w: 2.2, h: 2.7, surround: BASE, canopy: { d: 2.0, t: 0.2, mat: FAS } }, bikes: 4, bench: true, plant: { h: 0.8, depth: 1.2 } });
  colliders.push(...G.colliders);
  colliders.push(K.colPoly([[-8.95, -17.15], [3.4, -17.15], [3.4, 3.6], [16.5, 3.6], [16.5, 11.3], [6.6, 11.3], [6.6, 14.3], [-9.75, 14.3], [-9.75, 11.3], [-8.95, 11.3]], -2, 15));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: G.walkables };
}
