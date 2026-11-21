// Hesse Hall (1924; John Galen Howard): the mechanical engineering laboratory building, named for Frederick Godfrey Hesse,
// founder of the College of Mechanics. A tall single-storey high-bay lab hall: cream concrete walls between flat pilasters,
// huge small-paned industrial steel-sash windows, a plain cornice and parapet, and a long glazed roof monitor lighting the
// lab floor. Massing follows the 2021 LiDAR: roof ~9.5 m, monitor ~10.5-11 m above the lowest grade.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, storefront, signText } from './lib/b03-kit.js';
import { planting, bikes, rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'hesse-hall',
  name: 'Hesse Hall',
  subtitle: 'John Galen Howard · 1924',
  blurb: 'Built in 1924 for mechanical engineering and named for Frederick Godfrey Hesse, founder of the College of Mechanics. It housed motor, generator, radio and testing laboratories for the growing college.',
  replaces: ['w/24025438'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.5);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xcfd0c4, roughness: 0.9, map: M.stucco.map, normalMap: M.stucco.normalMap, roughnessMap: M.stucco.roughnessMap }); const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x2e3a3a, roughness: 0.5, metalness: 0.5 });
  const TRIM = new THREE.MeshStandardMaterial({ color: 0xd2c9b2, roughness: 0.85 });
  const colliders = [];
  const u0 = -18.1, u1 = 18.1, v0 = -15.9, v1 = 15.9, ROOF = 9.2;
  const runs = massBlock(K, { poly: rect(u0, v0, u1, v1), levels: [-1.5, 1.0, ROOF], top: ROOF, wall: CON, style: 'punched', depth: 0.45, rev: 0.3, glass: GL, frame: FR,
    win: { w: 3.2, h: 5.0, sill: 2.0, bay: 5.2, mull: 5, muntins: 9 }, pier: { w: 0.8, p: 0.3, mat: CON, top: ROOF + 0.9, ends: true }, roof: B.roofMembrane, parapet: 0.9, pmat: CON, coping: B.precastWarm });
  for (const R of runs) { // projecting cornice over a frieze band, horizontal rustication grooves, smooth plinth, pilaster capitals
    K.rbox(R, TRIM, -0.3, ROOF - 0.15, -0.05, R.L + 0.3, ROOF + 0.12, 0.8); K.rbox(R, TRIM, -0.1, ROOF - 0.6, -0.05, R.L + 0.1, ROOF - 0.15, 0.36);
    for (let y = 1.6; y < ROOF - 0.8; y += 0.45) K.rbox(R, TRIM, 0.0, y, -0.02, R.L, y + 0.03, 0.005, { detail: true });
    const g0 = Math.min(gAt(K, R, 0, 0.6), gAt(K, R, R.L, 0.6), gAt(K, R, R.L / 2, 0.6)); K.rbox(R, TRIM, -0.05, g0 - 0.6, -0.05, R.L + 0.05, Math.max(g0 + 1.2, 0.9), 0.1);
    const nb = Math.max(1, Math.round(R.L / 5.2)); for (let j = 0; j <= nb; j++) { const sj = (R.L / nb) * j; K.rbox(R, TRIM, sj - 0.55, ROOF - 0.9, -0.05, sj + 0.55, ROOF - 0.6, 0.42); } }
  // long glazed roof monitor (clerestory) over the lab floor
  massBlock(K, { poly: rect(-14.5, -2.6, 14.5, 2.6), levels: [ROOF, 11.1], top: 11.1, wall: CON, style: 'ribbon', glass: GL, frame: FR, win: { sill: 0.35, h: 1.7, mw: 0.9, edge: 0.3 }, depth: 0.25, core: true, roof: B.roofMembrane });
  K.prism(B.roofMembrane, rect(-14.9, -3.0, 14.9, 3.0), 11.1, 11.25);
  // entrance with name band on the south (lobby) face
  { const R = runs.find((r) => r.n[1] > 0.9); if (R) { const s = R.L / 2, gy = Math.max(gAt(K, R, s, 1.5), -1);
    { const nb = Math.max(1, Math.round(R.L / 5.2)); for (let i = 0; i < nb; i++) { const c = (R.L / nb) * (i + 0.5); if (Math.abs(c - s) < 2.0) continue; K.rbox(R, CON, c - 1.62, 2.95, -0.46, c + 1.62, 8.05, -0.01); } } // the lobby face is solid rusticated wall
    K.rbox(R, M.concreteDark, s - 1.6, gy + 0.02, -0.02, s + 1.6, gy + 4.5, 0.47);
    const DOOR = new THREE.MeshStandardMaterial({ color: 0x4f6b5a, roughness: 0.55, metalness: 0.3 });
    for (const [a, b] of [[s - 1.55, s - 0.02], [s + 0.02, s + 1.55]]) { K.rbox(R, DOOR, a, gy + 0.02, 0.47, b, gy + 2.6, 0.52); for (const yy of [gy + 0.5, gy + 1.6]) K.rbox(R, DOOR, a + 0.15, yy, 0.52, b - 0.15, yy + 0.8, 0.55, { detail: true }); }
    K.rbox(R, GL, s - 1.55, gy + 2.7, 0.47, s + 1.55, gy + 4.45, 0.49); for (let i = 0; i <= 6; i++) K.rbox(R, FR, s - 1.55 + i * 3.1 / 6 - 0.025, gy + 2.6, 0.49, s - 1.55 + i * 3.1 / 6 + 0.025, gy + 4.45, 0.53, { detail: true });
    for (const yy of [gy + 2.65, gy + 3.55]) K.rbox(R, FR, s - 1.55, yy - 0.03, 0.49, s + 1.55, yy + 0.03, 0.53, { detail: true });
    K.rbox(R, TRIM, s - 2.2, gy - 0.4, 0, s - 1.6, gy + 5.0, 0.55); K.rbox(R, TRIM, s + 1.6, gy - 0.4, 0, s + 2.2, gy + 5.0, 0.55); K.rbox(R, TRIM, s - 2.6, gy + 4.5, 0, s + 2.6, gy + 5.3, 0.6);
    K.rbox(R, M.paving, s - 4, gy - 0.3, 0.55, s + 4, gy + 0.04, 3.5);
    planting(K, R, 0.8, R.L - 0.8, { d0: 0.5, depth: 1.1, h: 0.8, skip: [[s - 4.5, s + 4.5]], seed: 101 });
    signText(K, R, 'HESSE HALL', s, gy + 4.9, 0.36, { color: '#4e4a42', metal: 0.0, rough: 0.9, d: 0.612, spacing: 0.1 }); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'hesse-hall';
  return { object3d, colliders, walkables: [] };
}
