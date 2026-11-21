// Lewis Hall (1948), College of Chemistry, named for Gilbert N. Lewis. A long cream stone-faced block in the stripped
// classical manner of the core campus: raised base, three tall storeys of narrow punched windows in deep reveals, a strong
// cornice with a balustraded parapet hiding a low hip roof, and a round-arched entrance reached by semicircular steps; a lower
// angled wing at the south end. Massing from LiDAR: eaves ~19 m, roof ridge ~23 m, south wing ~12.5 m.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit, punchedBlock, punched, cols, runsOf, flatRoof, colFromXZ, tint , plain } from './lib/b04-kit.js';
import { balustrade, arcBand } from './lib/classic-kit.js';

export const info = {
  id: 'lewis-hall',
  name: 'Lewis Hall',
  subtitle: 'College of Chemistry · 1948',
  blurb: 'Named for Gilbert N. Lewis, the dean who built Berkeley\'s College of Chemistry into a powerhouse and devised the electron-pair theory of the chemical bond.',
  replaces: ['w/24025034'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-39.2)); const M = ctx.M;
  const S = tint(M, 'stuccoWhite', 0xe3dcc8), Sb = tint(M, 'stuccoWhite', 0xc9c1aa), FR = plain(M, 0x3a3d3f, { rough: 0.5, metal: 0.5 });
  const colliders = [], walkables = [];
  const u0 = -12.2, u1 = 13.7, v0 = -32.6, v1 = 13.6, eave = 18.6;
  const rows = [{ y0: 0.4, h: 1.4, w: 1.1, mull: 1 }, { y0: 3.4, h: 3.6, w: 1.25, mull: 1, tran: 0.75, muntins: 2 }, { y0: 8.6, h: 3.4, w: 1.25, mull: 1, tran: 0.75, muntins: 2 }, { y0: 13.6, h: 3.2, w: 1.25, mull: 1, muntins: 2 }];
  const runs = punchedBlock(K, u0, v0, u1, v1, { y0: -2.5, eave, mat: S, frame: FR, bay: 3.0, rows, plinth: { h: 2.6, mat: Sb, out: 0.15 }, cornice: { P: 0.6, H: 0.8, mat: S }, roof: { type: 'hip', slope: 0.14, overhang: -1.2, mat: tint(M, 'redTile', 0xc79a88) }, depth: 0.6, faces: { W: { skip: [7] } } });
  for (const R of Object.values(runs)) for (let y = -0.1; y < 2.6; y += 0.6) K.rbox(R, Sb, -0.17, y, 0, R.L + 0.17, y + 0.03, 0.17); // channel joints in the base
  for (const R of Object.values(runs)) balustrade(K, R, S, 0.3, R.L - 0.3, eave + 0.8, 1.0, { d: -0.25, piers: [0.6, R.L - 0.6] });
  // round-arched portal on the west front with semicircular steps
  { const R = runs.W; const cs = cols(0, R.L, Math.round((R.L - 1.6) / 3.0), 0.8); const s = cs[7]; const gy = Math.max(-0.5, K.g(...R.at(s, 3)));
    K.rbox(R, S, s - 3.4, -1, 0, s + 3.4, 10.2, 0.6);
    const op = { s0: s - 2.2, s1: s + 2.2, y0: 2.6, y1: 9.4, arch: true };
    K.wall(R, Sb, s - 3.4, s + 3.4, 2.6, 10.2, [op], 0.0001 + 0.01);
    arcBand(K, R, S, s, 7.2, 2.2, 2.65, 0, Math.PI, 0.6, 0.72);
    K.rbox(R, plain(M, 0x4a3a28, { rough: 0.5 }), s - 2.2, 2.6, -0.9, s + 2.2, 6.1, -0.8);
    K.rbox(R, M.windowNight, s - 2.2, 6.2, -0.9, s + 2.2, 7.2, -0.82);
    for (const k of [-1, 0, 1]) K.rbox(R, FR, s + k * 1.1 - 0.04, 2.6, -0.82, s + k * 1.1 + 0.04, 9.3, -0.76, { detail: true });
    { const sh = new THREE.Shape(); sh.absarc(0, 0, 2.2, 0, Math.PI, false); const g = new THREE.ShapeGeometry(sh, 12); g.translate(s, 7.2, -0.82); K.addRun(R, M.windowNight, g, { uvMode: 'keep' }); }
    for (const sx of [-1, 1]) K.rbox(R, S, s + sx * 2.2 - 0.6, 2.6, -0.9, s + sx * 2.2 + 0.6, 10.2, 0.0); // deep reveals of the portal
    K.rbox(R, S, s - 2.6, -1, -0.3, s + 2.6, 2.6, 0.6);
    const n = Math.max(1, Math.round((2.6 - gy) / 0.17));
    for (let k = 0; k < n; k++) { const r = 2.0 + (n - k) * 0.38; const g = new THREE.CylinderGeometry(r, r, gy + (k + 1) * (2.6 - gy) / n + 1.0, 24, 1, false, Math.PI / 2, Math.PI); g.translate(0, (gy + (k + 1) * (2.6 - gy) / n - 1.0) / 2, 0); g.translate(s, 0, 0.6); K.addRun(R, Sb, g); }
    const p = R.at(s, 0.6); walkables.push({ type: 'fn', bounds: [p[0] - 9, p[1] - 9, p[0] + 9, p[1] + 9], heightAt: (x, z) => { const [uu, vv] = K.uv(x, z); const along = (uu - R.a[0]) * R.t[0] + (vv - R.a[1]) * R.t[1]; const out = (uu - R.a[0]) * R.n[0] + (vv - R.a[1]) * R.n[1] - 0.6; if (out < 0) return null; const r = Math.hypot(along - s, out); if (r > 2.0 + n * 0.38) return null; const k = Math.min(n, Math.max(0, n - Math.floor((r - 2.0) / 0.38))); return gy + k * (2.6 - gy) / n; } });
  }
  // lower angled south wing
  const sw = [[13.7, 13.6], [10.0, 21.0], [2.6, 38.3], [-16.8, 30.2], [-9.4, 14.4], [-12.2, 13.6]];
  for (const { R } of runsOf(K, sw)) { if (R.L < 2) continue; const nb = Math.max(1, Math.round((R.L - 1.6) / 3.0)); punched(K, R, 0, R.L, -2.5, 12.0, S, cols(0, R.L, nb, 0.8), rows.slice(0, 3), { frame: M.whitePaint, depth: 0.5 }); K.rbox(R, Sb, -0.1, -2.5, 0, R.L + 0.1, 2.6, 0.12); }
  K.prism(M.concreteDark, sw.slice().reverse(), -2.5, 11.9);
  flatRoof(K, sw, 12.4, { parapet: 0.8, mat: S });
  colliders.push(colFromXZ(ctx.footprints[0].outer, -3, 23));
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'lewis-hall';
  return { object3d, colliders, walkables };
}
