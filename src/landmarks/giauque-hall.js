// Giauque Hall, a low, nearly windowless red-brick laboratory building of the College of Chemistry tucked between Gilman and
// Hildebrand halls: running-bond brick walls with a brick-on-edge coping, a raised clerestory spine and stepped parapet, and a
// deep plain doorway. Massing from LiDAR: roof ~6.2 m, raised spine ~8.3 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, rect, runsOf, colFromXZ, tint, glassTint, plain } from './lib/b04-kit.js';

export const info = {
  id: 'giauque-hall',
  name: 'Giauque Hall',
  subtitle: 'College of Chemistry',
  blurb: 'Named for William F. Giauque, the Berkeley chemist who won the 1949 Nobel Prize for his work on the behaviour of substances at extremely low temperatures.',
  replaces: ['w/24025036'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.2)); const M = ctx.M;
  const B = tint(M, 'brick', 0xd9a08c), C = tint(M, 'stuccoWhite', 0xc8c2b5), CD = plain(M, 0x2b2b2b, { rough: 0.6 });
  const colliders = [], walkables = [];
  const poly = [[10.5, -18.6], [10.8, 18.6], [-10.8, 18.3], [-10.7, 10.7], [-10.6, -18.5]];
  K.prism(B, poly.slice().reverse(), -2.0, 6.0);
  K.loop(C, poly.slice().reverse(), [[0.08, 6.0], [0.08, 6.18], [-0.32, 6.18], [-0.32, 6.0]]); // thin precast coping
  K.loop(B, poly.slice().reverse(), [[0.04, 5.2], [0.04, 5.45], [0, 5.45], [0, 5.2]], { detail: true }); // soldier course
  K.loop(C, poly.slice().reverse(), [[0.12, -0.6], [0.12, 0.35], [0, 0.35], [0, -0.6]]); // concrete base course
  for (const { R } of runsOf(K, poly.slice().reverse())) for (let t = 3; t < R.L - 1; t += 3.0) K.rbox(R, B, t - 0.012, 0.35, 0, t + 0.012, 5.2, 0.012, { detail: true }); // control joints
  K.prism(M.concreteDark, poly.map(([u, v]) => [u * 0.97, v * 0.98]).reverse(), 5.6, 5.9);
  // raised brick spine with clerestory slot (LiDAR ~8 m)
  K.box(B, -2.2, 5.8, -16.0, 3.2, 8.0, 15.5); K.box(C, -2.35, 8.0, -16.15, 3.35, 8.2, 15.65);
  for (const s of [-1, 1]) { const u = s < 0 ? -2.21 : 3.21; K.box(glassTint(M, 0x2b3236), u - 0.02, 6.6, -14.5, u + 0.02, 7.5, 14.0); }
  // stepped parapet pier at the entry
  K.box(B, 6.0, 5.8, 15.6, 10.6, 7.6, 18.4); K.box(C, 5.9, 7.6, 15.5, 10.7, 7.8, 18.5);
  // deep plain doorway on the south front with a sign plaque
  const R = K.run([-10.8, 18.3], [10.8, 18.6]); const s = 13.5; const gy = Math.max(-0.5, K.g(...R.at(s, 1.5)));
  // deep brick reveal (0.6 m) around a dark door; dark plaque with white lettering band
  for (const sx of [-1, 1]) K.rbox(R, B, s + sx * 0.95 - 0.35, gy - 0.1, 0, s + sx * 0.95 + 0.35, gy + 3.0, 0.6);
  K.rbox(R, B, s - 1.3, gy + 2.5, 0, s + 1.3, gy + 3.2, 0.6);
  K.rbox(R, CD, s - 0.6, gy, -0.02, s + 0.6, gy + 2.4, 0.03);
  K.rbox(R, C, s - 1.3, gy - 0.12, 0, s + 1.3, gy + 0.02, 0.9);
  K.rbox(R, CD, s + 1.6, gy + 2.6, 0, s + 2.6, gy + 2.9, 0.05);
  K.rbox(R, M.whitePaint, s + 1.7, gy + 2.72, 0.05, s + 2.5, gy + 2.78, 0.06, { detail: true });
  // a few small high windows on the long faces
  for (const [a, b] of [[[10.5, -18.6], [10.8, 18.6]], [[-10.6, -18.5], [-10.7, 10.7]].reverse()]) { const R2 = K.run(a, b); for (let t = 4; t < R2.L - 3; t += 6) K.rbox(R2, M.windowNight, t - 0.6, 3.6, -0.02, t + 0.6, 4.6, 0.03); }
  // rooftop: membrane deck, exhaust fans and ducts of the labs
  K.prism(plain(M, 0x8d8b86, { rough: 0.95 }), poly.map(([u, v]) => [u * 0.96, v * 0.97]).reverse(), 5.9, 5.95);
  for (const [u, v] of [[-7, -10], [-7, 0], [6, -12], [6, 2], [-6, 12]]) { K.box(plain(M, 0xbfc2c2, { rough: 0.5, metal: 0.3 }), u - 0.8, 5.95, v - 0.8, u + 0.8, 6.9, v + 0.8); K.cyl(M.iron, u, 6.9, v, 0.35, 0.35, 0.6, 10); }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 8.3));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'giauque-hall';
  return { object3d, colliders, walkables };
}
