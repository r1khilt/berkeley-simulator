// Pimentel Hall (1964), the College of Chemistry's large round lecture hall, partly sunk into the slope next to Latimer Hall.
// A windowless drum of red brick with a concrete coping, ivy spilling over the rim, a deep plain doorway slot and a flat roof.
// Massing from LiDAR: roof ~6 m above the low side of the site.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, plain, colFromXZ, orient } from './lib/b04-kit.js';

export const info = {
  id: 'pimentel-hall',
  name: 'Pimentel Hall',
  subtitle: 'College of Chemistry lecture hall · 1964',
  blurb: 'The round brick lecture hall of the College of Chemistry, named for chemist George C. Pimentel. Its auditorium uses a rotating stage so one demonstration can be set up while another class is under way.',
  replaces: ['w/24024504'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  const ivy = plain(M, 0x3c5a2c, { rough: 0.95 }), ivyL = plain(M, 0x4f6e36, { rough: 0.95 });
  const colliders = [], walkables = [];
  const poly = orient(ctx.footprints[0].outer.map(([x, z]) => [x, z]));
  const top = 5.7;
  K.prism(M.brick, poly, -2.5, top);
  // concrete coping + flat roof
  K.loop(M.concrete, poly, [[0.12, top - 0.05], [0.12, top + 0.45], [-0.5, top + 0.45], [-0.5, top - 0.05]]);
  K.prism(M.concreteDark, poly.map(([x, z]) => [x * 0.97, z * 0.97]), top - 0.2, top + 0.2);
  // rooftop skylight / plant boxes (LiDAR bump to ~7.5 m)
  K.box(M.concreteDark, -3, top + 0.2, -2.5, 3, 7.3, 2.5); K.box(M.glass, -2.6, 7.3, -2.1, 2.6, 7.45, 2.1);
  // brick soldier course + base band
  K.loop(M.concrete, poly, [[0.04, -2.5], [0.04, 0.2], [0, 0.2], [0, -2.5]]);
  // ivy over the rim (irregular hanging strands), heavier on the south/west faces
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = [t[1], -t[0]]; // outward (poly oriented with the building on the left)
    const R = K.run(a, b);
    const heavy = (a[0] + b[0]) / 2 < 6 || (a[1] + b[1]) / 2 > 2;
    for (let s = 0.2; s < L - 0.2; s += 0.55) {
      const len = (heavy ? 1.2 : 0.4) + rnd() * (heavy ? 2.4 : 1.0);
      K.rbox(R, rnd() < 0.5 ? ivy : ivyL, s - 0.35, top + 0.45 - len, 0.1, s + 0.35, top + 0.55, 0.28 + rnd() * 0.12);
    }
  }
  // the doorway: a deep plain slot facing west (toward the walk from Latimer/Gilman), with a flush dark door
  {
    // find the edge most facing west
    let best = 0, bd = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const d = m[0] + Math.abs(m[1]) * 0.6; if (d < bd) { bd = d; best = i; } }
    const a = poly[best], b = poly[(best + 1) % poly.length]; const R = K.run(a, b); const s = R.L / 2;
    const gy = Math.max(-0.5, K.g(...R.at(s, 1.5)));
    K.rbox(R, M.concrete, s - 1.75, gy - 0.1, 0, s + 1.75, gy + 3.5, 0.32);
    K.rbox(R, M.darkBronze, s - 1.3, gy, 0.32, s + 1.3, gy + 3.0, 0.36);
    K.rbox(R, M.windowNight, s - 1.2, gy + 2.2, 0.36, s + 1.2, gy + 2.9, 0.37);
    K.rbox(R, M.paving, s - 2.5, gy - 0.3, 0.3, s + 2.5, gy + 0.02, 3.0);
  }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, top + 0.5));
  walkables.push({ type: 'poly', pts: poly.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]), y: top + 0.2 });
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'pimentel-hall';
  return { object3d, colliders, walkables };
}
