// Anderson Hall, 1811–1815 Arch Street — Pacific School of Religion student housing on Holy Hill (renovated as shared
// dorm suites). A mid-century flat-roofed residence block stepping down the hillside: five floors on the low west side,
// buff stucco walls with a concrete base, regular bays of bronze-framed windows, a thin projecting roof slab, a recessed
// central entry court and a stair/elevator penthouse. Massing from the 2021 LiDAR (roof ≈15.6 m above the low west side).
import * as THREE from 'three';
import { Kit, pal, house, roof } from './lib/b08a-kit.js';

export const info = {
  id: 'anderson-hall',
  name: 'Anderson Hall',
  subtitle: 'Pacific School of Religion · 1811 Arch St',
  blurb: 'Student residence of the Pacific School of Religion on Holy Hill, north of the UC Berkeley campus.',
  replaces: ['w/190391829'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5.0)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stuccoWhite.clone(); ST.color = new THREE.Color(0xeee3cc);
  const colliders = [];
  const u0 = -16.15, u1 = 17.84, v0 = -10.2, v1 = 10.5, TOP = 15.5;
  const A = house(K, { u0, u1, v0, v1, g0: 0.4, y0: -1.5, eave: TOP, storeys: 5, mat: ST, frame: P.frameBronze, sillMat: P.concreteBuff, depth: 0.3,
    faces: { N: { bay: 3.4, ww: 1.6, wh: 1.4, mull: 1 }, S: { bay: 3.4, ww: 1.6, wh: 1.4, mull: 1, doors: [5] }, W: { bay: 3.4, ww: 1.6, wh: 1.4, mull: 1, doors: [3] }, E: { bay: 3.4, ww: 1.6, wh: 1.4, mull: 1, doors: [2] } },
    plinth: { h: 1.2, mat: P.concreteBuff, out: 0.05 },
    roof: { type: 'flat', ovFlat: 0.6, slab: P.trimCream } });
  // vertical stair-glazing strips + floor bands for mid-century relief
  for (const f of ['N', 'S']) { const R = A.runs[f]; for (const y of A.floors.slice(1)) K.rbox(R, P.trimCream, 0, y - 0.12, 0, R.L, y + 0.08, 0.08); }
  // stair / elevator penthouse
  K.box(ST, -14.2, TOP - 0.3, -2.6, -10.0, TOP + 2.6, 0.4); K.box(P.trimCream, -14.5, TOP + 2.6, -2.9, -9.7, TOP + 2.8, 0.7);
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, TOP + 3));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables: [] };
}
