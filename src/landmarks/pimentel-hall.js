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

function leafTexture() { // dark ivy greens with lighter leaf clusters; 2 m tile
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#2f4a25'; g.fillRect(0, 0, 128, 128); let sd = 11; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 420; i++) { const x = r() * 128, y = r() * 128, rr = 2 + r() * 4.5; const l = r(); g.fillStyle = l < 0.33 ? '#3d5c2e' : l < 0.66 ? '#4f6e36' : '#22381c';
    for (const [dx, dy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  // (r4-sweep: ivy slabs replaced by the leafy mantle below)
  const colliders = [], walkables = [];
  const poly = orient(ctx.footprints[0].outer.map(([x, z]) => [x, z]));
  const top = 5.7;
  // r4-sweep: drum, base band and plinth run down below the lowest ground under the footprint (it floated where the slope falls)
  const bx = poly.map((q) => q[0]), bz = poly.map((q) => q[1]);
  const yB = Math.min(-2.5, K.gMin(Math.min(...bx) - 1, Math.min(...bz) - 1, Math.max(...bx) + 1, Math.max(...bz) + 1) - 0.8);
  // r4-sweep: cylindrical UVs on the brick drum (box projection flips axis every 45 deg around a round wall, squashing and
  // seaming the brick courses into smears): u = arc length around the drum centre, v = height; metres / 2 like boxUV
  { const g = K.prism(M.brick, poly, yB, top); const p = g.attributes.position, uv = g.attributes.uv, n = g.attributes.normal;
    let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x; cz += z; } cx /= poly.length; cz /= poly.length;
    let r = 0; for (const [x, z] of poly) r += Math.hypot(x - cx, z - cz); r /= poly.length;
    for (let i = 0; i < p.count; i += 3) {
      if (Math.abs(n.getY(i)) > 0.5) continue; // caps keep their planar UVs
      const a = [0, 1, 2].map((k) => Math.atan2(p.getZ(i + k) - cz, p.getX(i + k) - cx));
      if (Math.max(...a) - Math.min(...a) > Math.PI) for (let k = 0; k < 3; k++) if (a[k] < 0) a[k] += 2 * Math.PI; // seam
      for (let k = 0; k < 3; k++) uv.setXY(i + k, a[k] * r * 0.5, p.getY(i + k) * 0.5);
    }
    uv.needsUpdate = true; }
  // concrete coping + flat roof
  K.loop(M.concrete, poly, [[0.12, top - 0.05], [0.12, top + 0.45], [-0.5, top + 0.45], [-0.5, top - 0.05]]);
  K.prism(M.concreteDark, poly.map(([x, z]) => [x * 0.97, z * 0.97]), top - 0.2, top + 0.2);
  // rooftop skylight / plant boxes (LiDAR bump to ~7.5 m)
  K.box(M.concreteDark, -3, top + 0.2, -2.5, 3, 7.3, 2.5); K.box(M.glass, -2.6, 7.3, -2.1, 2.6, 7.45, 2.1);
  // brick soldier course + base band
  K.loop(M.concrete, poly, [[0.04, yB], [0.04, 0.2], [0, 0.2], [0, yB]]);
  // r4-sweep: ivy over the rim as one continuous leafy mantle whose hem varies smoothly around the drum (heavier on the
  // south/west), instead of a fringe of axis-aligned green slabs that read as a stair-stepped placeholder
  { const ivyM = new THREE.MeshStandardMaterial({ map: leafTexture(), color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide, name: 'pimentelIvy' });
    const pos = [], nrm = [], uvs = []; let P = 0;
    const hem = (x, z, P) => { const w = Math.max(Math.min(1, Math.max(0, (6 - x) / 6)), Math.min(1, Math.max(0, (z - 2) / 6))); const k = 0.45 + 0.55 * w;
      return top + 0.45 - k * (0.5 + 1.5 * (0.55 + 0.25 * Math.sin(P * 0.83 + 1.3) + 0.2 * Math.sin(P * 2.1 + 0.4))); };
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); const n = Math.max(1, Math.ceil(R.L / 0.4));
      for (let j = 0; j < n; j++) {
        const s0 = R.L * j / n, s1 = R.L * (j + 1) / n, p0 = R.at(s0, 0.2), p1 = R.at(s1, 0.2);
        const P0 = P + s0, P1 = P + s1, h0 = hem(p0[0], p0[1], P0), h1 = hem(p1[0], p1[1], P1), yT = top + 0.58;
        const q = [[p0[0], yT, p0[1], P0, yT], [p1[0], yT, p1[1], P1, yT], [p1[0], h1, p1[1], P1, h1], [p0[0], h0, p0[1], P0, h0]];
        for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(q[k][0], q[k][1], q[k][2]); nrm.push(R.n[0], 0, R.n[1]); uvs.push(q[k][3] * 0.5, q[k][4] * 0.5); }
      }
      P += R.L;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    K.add(ivyM, g, { uvMode: 'keep' });
    K.loop(ivyM, poly, [[0.22, top + 0.58], [-0.15, top + 0.62]], { uvMode: 'box' }); } // leafy cap over the coping
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
