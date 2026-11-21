// Hearst Field Annex: a long, low wood-frame building beside Hearst Gym on Bancroft Way, of the plain "temporary" kind the
// campus put up mid-century: painted horizontal siding, a shallow gable roof running the length of the building, rows of
// double-hung windows and plain doors with small hoods and steps. LiDAR: eaves ~5 m, ridge ~7.2 m.
import * as THREE from 'three';
import { Kit, mats, punched, rect, rectRuns, bays, gAt } from './lib/b03-kit.js';

export const info = {
  id: 'hearst-field-annex',
  name: 'Hearst Field Annex',
  subtitle: 'Bancroft Way',
  blurb: 'A long single-storey wood-frame building next to Hearst Gym, one of the plain "temporary" structures that housed campus programs for decades.',
  replaces: ['w/24025031'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-10.4);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const SID = B.siding, TRIM = M.whitePaint, GL = M.windowNight;
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x6e6a66, roughness: 0.95, map: M.shingle.map, normalMap: M.shingle.normalMap, roughnessMap: M.shingle.roughnessMap });
  const colliders = [], walkables = [];
  const u0 = -9.0, u1 = 9.4, v0 = -38.8, v1 = 38.0, EAVE = 4.9, RIDGE = 7.2;
  const FL = Math.max(0.5, Math.max(K.g(u0, v0), K.g(u1, v1)) + 0.5);
  const runs = rectRuns(K, u0, v0, u1, v1);
  for (const [f, R] of Object.entries(runs)) {
    const long = f === 'E' || f === 'W';
    const nb = Math.max(1, Math.round(R.L / 3.2)); const cs = bays(0, R.L, nb);
    const ops = []; cs.forEach((c, i) => {
      if (long && i % 6 === 3) ops.push({ s0: c - 0.55, s1: c + 0.55, y0: FL + 0.02, y1: FL + 2.2, kind: 'door' });
      else if (!long && i === Math.floor(nb / 2)) ops.push({ s0: c - 0.55, s1: c + 0.55, y0: FL + 0.02, y1: FL + 2.2, kind: 'door' });
      else ops.push({ s0: c - 0.55, s1: c + 0.55, y0: FL + 0.9, y1: FL + 2.4, mull: 0, tran: [FL + 1.65] });
    });
    punched(K, R, SID, 0, R.L, -0.8, EAVE, ops, { depth: 0.2, rev: 0.1, glass: GL, frame: TRIM, terrain: false, door: M.woodDark });
    for (const o of ops) { K.rbox(R, TRIM, o.s0 - 0.08, o.y1, -0.02, o.s1 + 0.08, o.y1 + 0.12, 0.06, { detail: true }); if (o.kind === 'door') { K.rbox(R, TRIM, o.s0 - 0.4, o.y1 + 0.15, 0, o.s1 + 0.4, o.y1 + 0.25, 0.9); const g = gAt(K, R, (o.s0 + o.s1) / 2, 0.8); if (FL - g > 0.15) K.rbox(R, M.concrete, o.s0 - 0.5, g - 0.3, 0, o.s1 + 0.5, FL, 1.0); } }
    K.rbox(R, TRIM, -0.02, 0.0, -0.02, 0.12, EAVE, 0.04); K.rbox(R, TRIM, R.L - 0.12, 0.0, -0.02, R.L + 0.02, EAVE, 0.04);
    K.rbox(R, M.concrete, -0.05, -0.8, -0.05, R.L + 0.05, FL - 0.05, 0.06); // foundation
  }
  K.box(M.concreteDark, u0 + 0.3, -1, v0 + 0.3, u1 - 0.3, EAVE - 0.1, v1 - 0.3);
  K.gable(ROOF, u0, v0, u1, v1, EAVE, RIDGE - EAVE, 'v', { overhang: 0.5, wallMat: SID, thick: 0.18 });
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -1, RIDGE));
  const object3d = K.finish(); object3d.name = 'hearst-field-annex';
  return { object3d, colliders, walkables };
}
