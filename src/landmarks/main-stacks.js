// Main (Gardner) Stacks (Esherick Homsey Dodge & Davis, 1994). The library's main collection lives in four levels
// underground between Doe and Moffitt; above ground only its landscaped roof shows: lawn and planting beds over the
// stacks, paved walks, low concrete retaining walls with light-well skylights. LiDAR: terrace ~5 m.
import * as THREE from 'three';
import { Kit, tint, solid, rect, orient } from './lib/b02-kit.js';
export const info = {
  id: 'main-stacks', name: 'Main Stacks', subtitle: 'Esherick Homsey Dodge & Davis · 1994',
  blurb: 'The Gardner (Main) Stacks hold most of the library\'s collection in four storeys built underground between Doe and Moffitt libraries; the roof is a landscaped terrace.',
  replaces: ['r/21101300', 'relation/21101300'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const C = tint(M.concrete, 0xcfcac0), CD = tint(M.concrete, 0xaaa59b), TURF = M.turf, SOIL = M.soil;
  const fp = ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z));
  const poly = orient(fp); const Y = 4.9;
  const g0 = Math.min(...poly.map(([u, v]) => K.g(u, v))) - 1.5;
  K.prism(CD, poly, g0, Y - 0.35);
  K.loop(C, poly, [[0.02, g0], [0.02, Y + 0.45], [-0.4, Y + 0.45], [-0.4, Y - 0.3]]); // retaining wall + low parapet
  K.flat(M.paving, poly, Y - 0.02);
  const beds = [rect(-11, -18, 8, -7), rect(-11, -3, 8, 12), rect(-25, 8, -15, 16)];
  for (const b of beds) { K.prism(C, b, Y - 0.1, Y + 0.35); K.flat(TURF, b.map(([u, v]) => [u + (u < 0 ? 0.3 : -0.3), v]), Y + 0.36); }
  // light-well skylights along the east and north edges
  for (let v = -16; v < 14; v += 6) { K.box(C, 12, Y - 0.1, v, 16.5, Y + 0.7, v + 3.6); K.box(M.glassLight, 12.2, Y + 0.7, v + 0.2, 16.3, Y + 1.15, v + 3.4); }
  for (let u = -9; u < 10; u += 6) { K.box(C, u, Y - 0.1, 13.6, u + 3.6, Y + 0.6, 16.4); K.box(M.glassLight, u + 0.2, Y + 0.6, 13.8, u + 3.4, Y + 1.0, 16.2); }
  // benches
  for (const [u, v] of [[-2, -5], [-2, 13.5], [-20, 6]]) K.box(M.wood, u - 1.0, Y, v - 0.25, u + 1.0, Y + 0.45, v + 0.25, { detail: true });
  const walk = { type: 'poly', pts: K.polyXZ(poly), y: Y };
  const colliders = [{ type: 'poly', pts: K.polyXZ(poly), y0: g0, y1: Y - 0.05 }];
  const object3d = K.finish(); object3d.name = 'main-stacks';
  return { object3d, colliders, walkables: [walk] };
}
