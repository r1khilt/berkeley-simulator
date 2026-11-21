// O'Brien Breezeway: the narrow two-level link in the engineering complex: an open, columned passage at ground level and
// glass-walled walkways above, joining neighbouring engineering buildings. LiDAR top ~11 m.
import * as THREE from 'three';
import { Kit, mats, rect, curtain, rectRuns } from './lib/b03-kit.js';

export const info = {
  id: 'o-brien-breezeway',
  name: "O'Brien Breezeway",
  subtitle: 'College of Engineering',
  blurb: 'A glazed two-level walkway over an open ground-floor passage, linking buildings of the College of Engineering complex.',
  replaces: ['w/109190447'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-16.3);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = new THREE.MeshStandardMaterial({ color: 0xcdbfb2, roughness: 0.92, map: B.precast.map, normalMap: B.precast.normalMap, roughnessMap: B.precast.roughnessMap }); const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x5e6e66, roughness: 0.5, metalness: 0.4 });
  const colliders = [], walkables = [];
  const u0 = -1.0, u1 = 2.55, v0 = -12.8, v1 = 12.85, TOP = 11.0; // LiDAR: the covered part is ~3.5 m of the 5 m footprint
  const F1 = 4.2, F2 = 7.6;
  // columns along both sides of the open passage
  for (let v = v0 + 0.4; v <= v1 - 0.3; v += 4.2) for (const u of [u0 + 0.25, u1 - 0.25]) { const g = K.g(u, v); K.box(CON, u - 0.22, g - 0.6, v - 0.22, u + 0.22, F1, v + 0.22); colliders.push(K.colCyl(u, v, 0.3, g - 1, F1)); }
  // floor slabs, glazed upper levels, roof
  K.box(CON, u0, F1 - 0.45, v0, u1, F1, v1); K.box(CON, u0, F2 - 0.3, v0, u1, F2, v1); K.box(CON, u0 - 0.3, TOP - 0.45, v0, u1 + 0.3, TOP, v1);
  const runs = rectRuns(K, u0, v0, u1, v1);
  for (const f of ['E', 'W']) { const R = runs[f]; curtain(K, R, 0.05, R.L - 0.05, F1, F2 - 0.3, { glass: GL, frame: FR, mw: 1.6, depth: 0.08, rows: [F1 + 1.05] }); curtain(K, R, 0.05, R.L - 0.05, F2, TOP - 0.45, { glass: GL, frame: FR, mw: 1.6, depth: 0.08, rows: [F2 + 1.05] }); K.rbox(R, CON, -0.05, F2 - 0.3, -0.05, R.L + 0.05, F2, 0.15); }
  K.box(M.paving, u0, -1, v0, u1, Math.max(K.g(0, v0), K.g(0, v1)) + 0.02, v1);
  walkables.push(K.walkPoly(rect(u0, v0, u1, v1), F1)); walkables.push(K.walkPoly(rect(u0, v0, u1, v1), F2));
  const object3d = K.finish(); object3d.name = 'o-brien-breezeway';
  return { object3d, colliders, walkables };
}
