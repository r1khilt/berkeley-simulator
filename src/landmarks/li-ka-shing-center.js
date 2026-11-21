// Li Ka Shing Center for Biomedical and Health Sciences (SmithGroup, 2011). A large modern laboratory complex on Oxford
// Street: tall buff-panel and glass blocks with ribbon windows and vertical sun fins, a lower east bar and a low south
// annex; flat roofs with mechanical screens. LiDAR: main blocks ~33 m, east bar ~23 m, south annex ~14 m.
import * as THREE from 'three';
import { Kit, genParts, tint, solid, rect } from './lib/b02-gen.js';
export const info = {
  id: 'li-ka-shing-center', name: 'Li Ka Shing Center', subtitle: '2011 · Biomedical & health sciences',
  blurb: 'Funded in part by Hong Kong businessman Li Ka-shing, this laboratory building houses biomedical and health-sciences research, including stem-cell and neuroscience labs.',
  replaces: ['w/109187413', 'way/109187413'],
};
export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-5.5)); const M = ctx.M;
  const P = tint(M.concrete, 0xd8cbb2), PD = tint(M.concrete, 0xb5a78f), FR = solid(0x3c4248, 0.35, 0.6);
  const lv = (top) => { const a = [0.8, 5.6]; while (a[a.length - 1] + 4.3 < top - 1.2) a.push(a[a.length - 1] + 4.3); return a; };
  const ribbon = (k) => ({ w: 3.4, h: 2.5, sill: 0.95, mull: 2, tran: 0.25 });
  const D = { mat: P, baseMat: PD, frame: FR, fl: 0.8, bay: 3.9, winFn: ribbon, roof: 'flat', parapet: 1.2, coping: PD };
  const colliders = genParts(K, [
    { poly: rect(-41.8, -12.4, 14.0, 12.0), levels: lv(33), top: 33.0 },
    { poly: rect(-6.4, -48.2, 14.0, -12.4), levels: lv(33), top: 33.0 },
    { poly: rect(14.0, -48.0, 23.2, 16.3), levels: lv(23), top: 23.0, bay: 3.4 },
    { poly: rect(-33.6, 12.0, 23.4, 20.1), levels: lv(28.5), top: 28.5 },
    { poly: [[-2.9, 20.2], [23.5, 20.0], [22.2, 43.0], [16.5, 52.6], [-1.0, 47.4]], levels: lv(14), top: 14.0, bay: 3.6 },
  ], D);
  // vertical sun fins on the west and south faces of the tall blocks + rooftop screens
  for (const [a, b, top] of [[[-41.8, -12.4], [-41.8, 12.0], 33], [[-33.6, 20.1], [23.4, 20.1], 28.5]]) { const R = K.run(a, b); for (let s = 1.0; s < R.L - 0.5; s += 1.95) K.rbox(R, PD, s - 0.08, 5.6, 0, s + 0.08, top - 1.0, 0.75, { detail: true }); }
  K.box(PD, -30, 33.0, -8, -10, 37.0, 8); K.box(PD, 2, 33.0, -45, 11, 37.5, -30);
  const object3d = K.finish(); object3d.name = 'li-ka-shing-center';
  return { object3d, colliders, walkables: [] };
}
