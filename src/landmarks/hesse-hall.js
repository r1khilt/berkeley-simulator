// Hesse Hall (1924; John Galen Howard): the mechanical engineering laboratory building, named for Frederick Godfrey Hesse,
// founder of the College of Mechanics. A tall single-storey high-bay lab hall: cream concrete walls between flat pilasters,
// huge small-paned industrial steel-sash windows, a plain cornice and parapet, and a long glazed roof monitor lighting the
// lab floor. Massing follows the 2021 LiDAR: roof ~9.5 m, monitor ~10.5-11 m above the lowest grade.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, storefront, signText } from './lib/b03-kit.js';

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
  const CON = B.offWhite, GL = B.glassBlue, FR = M.darkBronze;
  const colliders = [];
  const u0 = -18.1, u1 = 18.1, v0 = -15.9, v1 = 15.9, ROOF = 9.2;
  const runs = massBlock(K, { poly: rect(u0, v0, u1, v1), levels: [-1.5, 1.0, ROOF], top: ROOF, wall: CON, style: 'punched', depth: 0.45, rev: 0.3, glass: GL, frame: FR,
    win: { w: 3.2, h: 5.0, sill: 2.0, bay: 5.2, mull: 5, muntins: 9 }, pier: { w: 0.8, p: 0.3, mat: CON, top: ROOF + 0.9, ends: true }, roof: B.roofMembrane, parapet: 0.9, pmat: CON, coping: B.precastWarm });
  for (const R of runs) K.rbox(R, B.precastWarm, -0.2, ROOF - 0.45, -0.05, R.L + 0.2, ROOF - 0.1, 0.35); // cornice band
  // long glazed roof monitor (clerestory) over the lab floor
  massBlock(K, { poly: rect(-14.5, -2.6, 14.5, 2.6), levels: [ROOF, 11.1], top: 11.1, wall: CON, style: 'ribbon', glass: GL, frame: FR, win: { sill: 0.35, h: 1.7, mw: 0.9, edge: 0.3 }, depth: 0.25, core: true, roof: B.roofMembrane });
  K.prism(B.roofMembrane, rect(-14.9, -3.0, 14.9, 3.0), 11.1, 11.25);
  // entrance with name band on the south (lobby) face
  { const R = runs.find((r) => r.n[1] > 0.9); if (R) { const s = R.L / 2, gy = Math.max(gAt(K, R, s, 1.5), -1);
    storefront(K, R, s - 1.8, s + 1.8, gy + 0.03, gy + 3.3, { glass: GL, frame: FR, rev: -0.46, transom: gy + 2.6 });
    K.rbox(R, B.precastWarm, s - 2.6, gy + 3.4, 0, s + 2.6, gy + 4.3, 0.5);
    signText(K, R, 'HESSE HALL', s, gy + 3.85, 0.42, { color: '#4e4a42', metal: 0.0, rough: 0.9, d: 0.52, spacing: 0.1 }); } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'hesse-hall';
  return { object3d, colliders, walkables: [] };
}
