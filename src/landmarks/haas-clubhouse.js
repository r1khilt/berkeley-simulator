// Haas Clubhouse at the Strawberry Canyon Recreational Area pool. A two-storey, Japanese-influenced clubhouse on an L plan:
// khaki stucco walls with dark brown timber posts, beams and trim, a large hip-and-gable (irimoya) roof of grey-brown
// shingles with board-sided gablets, a lower pent roof wrapping the base of the upper floor, banks of large-paned upper
// windows, and a timber deck on posts along the pool side with timber stairs at both ends.
// Massing follows the 2021 LiDAR (frame -24.5°): eaves ~6.5 m, ridge ~9.5 m.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'haas-clubhouse',
  name: 'Haas Clubhouse',
  subtitle: 'Strawberry Canyon Recreational Area',
  blurb: 'The clubhouse of the Strawberry Canyon Recreational Area, beside the outdoor pool in the wooded canyon above campus, with its sun deck looking over the water.',
  replaces: ['w/69020842'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-24.5)); const M = ctx.M; const X = mats(M);
  const ST = new THREE.MeshStandardMaterial({ color: 0xcfc8a0, roughness: 0.92, map: M.stucco.map });
  const TR = new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.8, map: M.wood.map });
  const ROOF = new THREE.MeshStandardMaterial({ color: 0x8a8079, roughness: 0.95, map: M.shingle.map, normalMap: M.shingle.normalMap });
  const FR = new THREE.MeshStandardMaterial({ color: 0x3e2c20, roughness: 0.6 });
  const colliders = [], walkables = [];
  const F1 = 0.3, F2 = 3.4, EAVE = 6.6;
  function wing(u0, u1, v0, v1, axis, faces) {
    const defs = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
    const gm = K.gMin(u0, v0, u1, v1);
    for (const f of ['S', 'E', 'N', 'W']) {
      const fo = faces[f]; if (fo === false) continue; const R = K.run(defs[f][0], defs[f][1]); const L = R.L;
      const up = []; const lo = [];
      const nb = Math.max(1, Math.round(L / 3.2)); const bw = L / nb;
      for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); const glazed = fo?.glazed ? fo.glazed(i, nb) : (i % 3 === 1);
        if (glazed) up.push({ s0: c - bw / 2 + 0.2, s1: c + bw / 2 - 0.2, y0: F2 + 0.5, y1: EAVE - 0.35, mull: 2, tran: [F2 + 2.0], frame: FR, sill: false });
        if (i % 2 === 0) lo.push(fo?.doors && i % 4 === 0 ? { s0: c - 0.55, s1: c + 0.55, y0: F1, y1: F1 + 2.3, kind: 'door', doorTop: F1 + 2.2, door: TR, frame: FR, sill: false } : { s0: c - 0.6, s1: c + 0.6, y0: F1 + 1.2, y1: F1 + 2.3, mull: 1, frame: FR, sill: false }); }
      openWall(K, R, ST, 0, L, gm - 1.0, F2, lo, { depth: 0.3, rev: 0.15, frame: FR, sill: false });
      openWall(K, R, ST, 0, L, F2, EAVE, up, { depth: 0.3, rev: 0.12, frame: FR, sill: false });
      for (let i = 0; i <= nb; i++) { const s = Math.min(L - 0.12, Math.max(0.12, bw * i)); K.rbox(R, TR, s - 0.12, gm - 0.5, 0, s + 0.12, EAVE, 0.12); }
      K.rbox(R, TR, -0.1, F2 - 0.2, 0, L + 0.1, F2 + 0.1, 0.14); K.rbox(R, TR, -0.1, EAVE - 0.3, 0, L + 0.1, EAVE, 0.12);
      // lower pent roof wrapping the base of the upper floor
      const g = new THREE.BoxGeometry(L + 3.0, 0.14, 1.6); g.rotateX(0.27); g.translate(L / 2, F2 + 0.75, 0.75); K.addRun(R, ROOF, g);
    }
    K.box(M.concreteDark, u0 + 0.3, gm - 1.0, v0 + 0.3, u1 - 0.3, EAVE, v1 - 0.3);
    // irimoya: hipped lower roof clipped flat, gable on top with board-sided gablets
    const ov = 1.1, slope = 0.55, yT = EAVE + 2.0;
    K.hip(ROOF, u0 - ov, v0 - ov, u1 + ov, v1 + ov, EAVE - ov * slope, slope, { yTop: yT });
    const ins = (yT - (EAVE - ov * slope)) / slope; const a0 = u0 - ov + ins, a1 = u1 + ov - ins, b0 = v0 - ov + ins, b1 = v1 + ov - ins;
    const rise = 1.4;
    if (axis === 'u') { K.gable(ROOF, a0 + 0.6, b0, a1 - 0.6, b1, yT, rise, 'u', { overhang: 0.6, thick: 0.15 }); for (const uu of [a0 + 0.2, a1 - 0.2]) { const bm = (b0 + b1) / 2; const tri = new THREE.Shape(); tri.moveTo(b0 + 0.1, yT); tri.lineTo(b1 - 0.1, yT); tri.lineTo(bm, yT + rise - 0.05); tri.lineTo(b0 + 0.1, yT); const g = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }); g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, uu - 0.06, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1)); K.add(TR, g); } }
    else { K.gable(ROOF, a0, b0 + 0.6, a1, b1 - 0.6, yT, rise, 'v', { overhang: 0.6, thick: 0.15 }); for (const vv of [b0 + 0.2, b1 - 0.2]) { const am = (a0 + a1) / 2; const tri = new THREE.Shape(); tri.moveTo(a0 + 0.1, yT); tri.lineTo(a1 - 0.1, yT); tri.lineTo(am, yT + rise - 0.05); tri.lineTo(a0 + 0.1, yT); const g = new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, vv - 0.06); K.add(TR, g); } }
    for (const [x0, z0, x1, z1] of [[u0 - ov, v0 - ov, u1 + ov, v0 - ov + 0.12], [u0 - ov, v1 + ov - 0.12, u1 + ov, v1 + ov]]) K.box(FR, x0, EAVE - ov * slope - 0.25, z0, x1, EAVE - ov * slope, z1);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 1, EAVE + 3));
  }
  wing(-19.8, 26.5, -9.35, 3.7, 'u', { W: { glazed: (i, n) => i === n - 1 }, S: { doors: true, glazed: (i, n) => i === 2 || i >= n - 2 }, N: { glazed: (i) => i % 4 === 1 }, E: { glazed: () => false } });
  wing(-19.8, -4.8, 3.7, 16.0, 'v', { N: false, W: { glazed: (i, n) => i >= n - 2 || i === 1, doors: true }, S: { glazed: (i, n) => i >= n - 2 }, E: { glazed: () => false } });
  // pool-side timber deck at the upper floor on posts, with railing and stairs at both ends
  {
    const d0 = -23.0, d1 = -19.8, v0 = -9.35, v1 = 19.0;
    K.box(M.woodDark, d0, F2 - 0.25, v0, d1, F2, v1);
    for (let v = v0 + 0.3; v <= v1; v += 3.0) { const g = K.g(d0 + 0.3, v); K.box(TR, d0 + 0.15, g - 0.4, v - 0.12, d0 + 0.39, F2 - 0.25, v + 0.12); }
    K.box(TR, d0, F2 + 0.95, v0, d0 + 0.1, F2 + 1.05, v1); for (let v = v0; v <= v1; v += 1.2) K.box(TR, d0, F2, v - 0.04, d0 + 0.08, F2 + 1.0, v + 0.04, { detail: true });
    K.box(TR, d0, F2 + 0.95, v1 - 0.1, d1, F2 + 1.05, v1);
    walkables.push(K.walkPoly([[d0, v0], [d1, v0], [d1, v1], [d0, v1]], F2));
    const gS = K.g(d0 - 1, v1 + 3); const n = Math.max(3, Math.round((F2 - gS) / 0.18));
    walkables.push(K.stairs(M.woodDark, d0, v1, d0 + 1.4, v1 + n * 0.28, gS, F2, '-v', n));
    const gN = K.g(d0 - 1, v0 - 3); const n2 = Math.max(3, Math.round((F2 - gN) / 0.18));
    walkables.push(K.stairs(M.woodDark, d0, v0 - n2 * 0.28, d0 + 1.4, v0, gN, F2, '+v', n2));
    colliders.push(K.colPoly([[d0 - 0.05, v0], [d0 + 0.1, v0], [d0 + 0.1, v1], [d0 - 0.05, v1]], F2, F2 + 1.05));
  }
  lamp(K, -26, K.g(-26, 0), 0, 3.6);
  const object3d = K.finish();
  object3d.name = 'haas-clubhouse';
  return { object3d, colliders, walkables };
}
