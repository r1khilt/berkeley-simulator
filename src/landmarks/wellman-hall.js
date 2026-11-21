// Wellman Hall (John Galen Howard, 1912; built as Agriculture Hall). Granite-faced three-storey Beaux-Arts block with a red
// tile hip roof and copper eaves; on its south side a semicircular two-storey drum under a conical tile roof with a copper
// lantern, entered through a round-arched, rusticated doorway. Massing from LiDAR: eaves ~12.6 m, ridge ~19 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, tint, solid, stoneBlock, hipPoly, rect, dentils, orient } from './lib/b02-kit.js';
import { arcBand } from './lib/classic-kit.js';

export const info = {
  id: 'wellman-hall',
  name: 'Wellman Hall',
  subtitle: 'John Galen Howard · 1912',
  blurb: 'Built as Agriculture Hall, the first of Howard\'s agricultural group on the west side of campus, and later renamed for UC president Harry R. Wellman, an agricultural economist.',
  replaces: ['w/24025041', 'way/24025041'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const ST = tint(M.ashlar, 0xe6e2d8), BASE = tint(M.granite, 0xcfc9bd), CU = tint(M.copper, 0x6f9c8a), FR = solid(0x2f3a33, 0.5, 0.3);
  const colliders = [], walkables = [];
  const FL = 1.2, EAVE = 12.0;
  const main = rect(-25.3, -12.1, 25.4, 9.0);
  const win = (k) => k === 2 ? { w: 1.1, h: 1.7, sill: 0.8, mull: 1, muntins: 1 } : { w: 1.25, h: 2.2, sill: 0.9, mull: 1, muntins: 2 };
  stoneBlock(K, { poly: main, FL, levels: [FL, 4.8, 8.3, 11.1], eave: EAVE, mat: ST, baseMat: BASE, win, bay: 3.4, frame: FR,
    baseWin: { w: 1.0, h: 0.6, sill: 0.25, mull: 1 }, belts: [4.8], cornice: { mat: ST, P: 0.5, H: 0.6 },
    edge: (i, R) => (R.L < 12 ? { nb: Math.max(1, Math.round(R.L / 3.6)) } : {}) });
  dentils(K, main, ST, EAVE - 0.62);
  hipPoly(K, main, EAVE + 0.1, 0.6, { ov: 0.95, soffit: CU });
  K.loop(CU, orient(main).map(([u, v]) => [u, v]), [[0.95, EAVE + 0.1], [1.0, EAVE + 0.1], [1.0, EAVE - 0.25], [0.95, EAVE - 0.25]]);
  // chimneys
  for (const u of [-12, 12]) { K.box(BASE, u - 0.6, 15.5, -2.6, u + 0.6, 19.6, -1.4); K.box(ST, u - 0.75, 19.6, -2.75, u + 0.75, 19.85, -1.25); }
  colliders.push(K.colPoly(main, -2, 20));
  // ---- south drum (semicircle r=10 about (0, 8)) ----
  const cx = 0, cz = 8.0, r = 10.0, segs = 18; const DE = 12.2;
  const arc = []; for (let k = 0; k <= segs; k++) { const a = Math.PI * k / segs; arc.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  // drum walls: segment runs going around (west->east through the south) facing outward
  const gD = Math.min(K.g(0, 18), K.g(-9, 12), K.g(9, 12)) - 1.5;
  for (let k = segs; k > 0; k--) {
    const a = arc[k], b = arc[k - 1]; const R = K.run(a, b); const sMid = R.L / 2;
    const door = k === segs / 2 + 0;
    const ops = door ? [] : [{ s0: sMid - 0.55, s1: sMid + 0.55, y0: FL + 1.2, y1: FL + 2.3 }];
    K.wall(R, BASE, -0.05, R.L + 0.05, gD, FL, [], 0.6);
    K.wall(R, ST, -0.05, R.L + 0.05, FL, 6.0, door ? [{ s0: sMid - 0.9, s1: sMid + 0.9, y0: FL, y1: FL + 3.6, arch: true }] : ops, 0.6);
    const up = [{ s0: sMid - 0.6, s1: sMid + 0.6, y0: 6.6, y1: 9.9 }];
    K.wall(R, ST, -0.05, R.L + 0.05, 6.0, 11.0, up, 0.6);
    K.wall(R, ST, -0.05, R.L + 0.05, 11.0, DE, [], 0.6);
    for (const o of door ? [] : ops) K.fill(R, o, { mull: 1, rev: 0.45, frame: FR });
    for (const o of up) K.fill(R, o, { mull: 1, tran: [o.y1 - 0.9], rev: 0.45, frame: FR });
    K.rbox(R, ST, sMid - 0.82, 6.0, -0.6, sMid - 0.62, 11.0, 0.12); // pilaster strips between the upper windows
    if (door) { K.fill(R, { s0: sMid - 0.9, s1: sMid + 0.9, y0: FL, y1: FL + 3.6, arch: true, doorTop: FL + 2.7 }, { kind: 'door', door: tint(M.woodDark, 0x7a3a24), rev: 0.5 });
      arcBand(K, R, BASE, sMid, FL + 2.7, 0.9, 1.75, 0, Math.PI, 0, 0.12); K.rbox(R, BASE, sMid - 0.22, FL + 3.45, 0, sMid + 0.22, FL + 4.5, 0.18);
      const n = Math.max(2, Math.round((FL - K.g(...R.at(sMid, 3))) / 0.16)); }
  }
  K.loop(ST, arc.concat([[cx, cz - 0.5]]).reverse(), [[0, 5.85], [0.12, 5.85], [0.12, 6.1], [0, 6.1]]);
  // conical tile roof with copper lantern
  const cone = new THREE.ConeGeometry(r + 1.0, 4.9, 36, 1, true, -Math.PI / 2, Math.PI); // half cone
  cone.translate(cx, DE + 2.45, cz); K.add(M.redTile, cone, { uvMode: 'roof' });
  K.lathe(CU, [[r + 1.05, 0], [r + 1.05, 0.3], [r + 0.2, 0.3]], cx, DE - 0.2, cz, 36);
  K.lathe(CU, [[0.9, 0], [0.9, 1.0], [1.1, 1.05], [1.1, 1.25], [0.3, 1.9], [0.06, 2.4], [0.001, 2.45]], cx, DE + 4.6, cz, 12);
  colliders.push({ type: 'poly', pts: K.polyXZ(arc), y0: -2, y1: 17 });
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'wellman-hall';
  return { object3d, colliders, walkables };
}
