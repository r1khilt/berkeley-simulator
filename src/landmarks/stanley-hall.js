// Stanley Hall (2007), the Stanley Biosciences and Bioengineering Facility (QB3), at the north-east corner of the core campus.
// A nine-storey laboratory tower stepping down through 25 m and 20 m wings to a three-storey west wing, all in white metal
// panels with ribbon windows of blue-green glass, teal spandrels and a big teal-clad rooftop mechanical penthouse.
// Massing from LiDAR: tower ~39 m (plant to ~44 m), middle block ~25 m, wings ~20 m, west wing ~15.5 m.
import * as THREE from 'three';
import { Kit, grid, curtain, flatRoof, rect, runsOf, entrance, penthouse, colFromXZ, tint, plain, glassTint } from './lib/b04-kit.js';
import { panelMat, planter, planting, tube, rnMats } from './lib/rn-kit.js';
import { signText } from './lib/b03-kit.js';

export const info = {
  id: 'stanley-hall',
  name: 'Stanley Hall',
  subtitle: 'Biosciences & bioengineering · 2007',
  blurb: 'Rebuilt in 2007 on the site of the original Stanley Hall (named for biochemist Wendell Stanley), it houses bioengineering labs and the Berkeley arm of the California Institute for Quantitative Biosciences (QB3).',
  replaces: ['w/24025051'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16.2)); const M = ctx.M;
  const Wp = panelMat('stanleyPanel', { pw: 1.5, ph: 3.0, span: 6.0, base: 0xe6e6e1, joint: 0xc3c4c0, vary: 0.012, grain: 0.01, stagger: false }), Tl = plain(M, 0x6f9496, { rough: 0.2, metal: 0.5 });
  const GL = glassTint(M, 0x56656c, { metal: 0.4 }), GR = glassTint(M, 0x667a84, { rough: 0.06, metal: 0.45 }), FR = plain(M, 0x4a5a5c, { rough: 0.5, metal: 0.6 });
  const PJ = tint(M, 'stuccoWhite', 0xcfcbc1);
  const colliders = [], walkables = [];
  const levels = (top, g = 0) => { const out = [g]; let y = g + 5.0; while (y < top - 2.5) { out.push(y); y += 4.2; } out.push(top); return out; };
  const block = (poly, top, o = {}) => {
    for (const { R, i } of runsOf(K, poly)) {
      const lv = levels(top, -1.5);
      if (o.ribbon) { // continuous green ribbon glazing between white spandrels, sunshade fin at each floor line
        grid(K, R, 0, R.L, lv, { mat: Wp, bay: 1.5, pier: 0.08, pierMat: FR, sill: 1.35, head: 0.95, rec: 0.5, mull: 0, glass: GR, frame: FR, endPier: 0.5, topBand: 0.5 });
        for (const y of lv.slice(1, -1)) K.rbox(R, Wp, 0, y - 0.2, 0, R.L, y - 0.1, 0.6, { detail: true });
      } else grid(K, R, 0, R.L, lv, { mat: Wp, bay: o.bay ?? 2.4, pier: o.pier ?? 1.2, sill: 1.2, head: 1.5, rec: 0.3, mull: 1, glass: GL, frame: FR, endPier: 0.8, topBand: 0.4, ...o.g });
      for (let ss = 1.5; ss < R.L; ss += 1.5) K.rbox(R, PJ, ss - 0.012, -1.5, 0, ss + 0.012, top, 0.012, { detail: true });
    }
    flatRoof(K, poly, top + 0.4, { parapet: 0.7, mat: Wp });
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    if (o.core !== false) K.box(M.concreteDark, Math.min(...xs) + 0.6, -1.5, Math.min(...ys) + 0.6, Math.max(...xs) - 0.6, top, Math.max(...ys) - 0.6);
  };
  const GREEN = panelMat('stanleyRoof', { pw: 0.5, ph: 6.0, span: 6.0, base: 0x4e8c82, joint: 0x3c6e66, jw: 0.03, vary: 0.02, grain: 0.01, stagger: false, rough: 0.45, metal: 0.5 });
  const SOFF = new THREE.MeshStandardMaterial({ color: 0xb8794a, roughness: 0.8, map: M.wood.map, normalMap: M.wood.normalMap });
  const greenRoof = (u0, v0, u1, v1, top) => { const ov = 1.3, y = top + 0.75; K.hip(GREEN, u0 - ov, v0 - ov, u1 + ov, v1 + ov, y, 0.085, { yTop: y + 1.2 }); K.box(SOFF, u0 - ov, y - 0.12, v0 - ov, u1 + ov, y, v1 + ov); K.box(FR, u0 - ov - 0.02, y - 0.3, v0 - ov - 0.02, u1 + ov + 0.02, y - 0.1, v1 + ov + 0.02); };
  // west wing (three storeys)
  block(rect(-35.1, -23.9, -20.0, 32.9), 15.2, { ribbon: true });
  block(rect(-20.0, 6.0, -12.0, 32.9), 15.2, { ribbon: true });
  // 20 m bar and the 25 m block
  block(rect(-20.0, -29.5, -12.0, 6.0), 19.6, { ribbon: true });
  block(rect(-12.0, -31.0, 14.0, 6.0), 24.6, { ribbon: true });
  block(rect(-12.0, 6.0, 5.0, 24.2), 19.6, { ribbon: true });
  greenRoof(-35.1, -23.9, -20.0, 32.9, 15.2); greenRoof(-20.0, 6.0, -12.0, 32.9, 15.2); greenRoof(-20.0, -29.5, -12.0, 6.0, 19.6); greenRoof(-12.0, -31.0, 14.0, 6.0, 24.6); greenRoof(-12.0, 6.0, 5.0, 24.2, 19.6);
  // the tower: dense punched grid, teal spandrel bands
  const tower = [[-1.0, 33.0], [26.0, 32.7], [26.0, -31.5], [14.0, -31.5], [14.0, 6.0], [5.0, 6.0], [5.0, 24.2], [-1.0, 24.2]];
  block(tower, 30.4, { core: false });
  // blue-green glass crown: the top floors and plant wrapped in a curtain wall, set back 1 m
  { const crown = [[0.0, 32.0], [25.0, 31.7], [25.0, -30.5], [15.0, -30.5], [15.0, 7.0], [6.0, 7.0], [6.0, 23.2], [0.0, 23.2]];
    for (const { R } of runsOf(K, crown)) curtain(K, R, 0, R.L, 30.4, 39.4, { glass: GR, frame: FR, mw: 1.5, levels: [30.4, 34.6, 39.4] });
    flatRoof(K, crown, 39.6, { parapet: 0.9, mat: GREEN }); K.box(Wp, -0.6, 30.0, -31.1, 25.6, 30.5, 32.6); }
  K.box(M.concreteDark, 14.6, -1.5, -30.9, 25.4, 30.2, 32.1); K.box(M.concreteDark, -0.4, -1.5, 6.6, 14.6, 30.2, 32.1);
  K.box(M.concreteDark, 16.0, 30.2, -29.5, 23.8, 39.2, 30.5); K.box(M.concreteDark, 1.2, 30.2, 8.2, 16.0, 39.2, 30.5);
  // full-height glazed stair slot on the north face of the tower
  { const R = K.run([24.0, -31.5], [17.0, -31.5], 0.02); curtain(K, R, 0, R.L, -1.5, 38.6, { glass: GL, frame: FR, mw: 1.4, levels: levels(38.6, -1.5) }); }
  // teal-clad rooftop mechanical penthouse and exhaust stacks
  penthouse(K, 7.5, 6.5, 24.5, 19.5, 39.0, 43.6, { mat: Tl, cap: Wp, louvre: true });
  penthouse(K, 16.0, -27.0, 24.5, -14.0, 39.0, 41.4, { mat: Tl, cap: Wp });
  for (const [u, v] of [[17, -8], [20, -8], [23, -8], [17, 1], [20, 1], [23, 1], [17, -20], [20, -20]]) K.cyl(plain(M, 0xcfcfcf, { rough: 0.5, metal: 0.4 }), u, 39.6, v, 0.4, 0.4, 3.6, 10);
  { const MB = plain(M, 0xcfcfcf, { rough: 0.6, metal: 0.2 }); let k = 0; for (const [u, v, w, d] of [[-30, -18, 3, 2], [-27, 0, 2, 3], [-31, 14, 3, 3], [-26, 26, 2, 2], [-17, -24, 2, 3], [-16, -6, 2, 2], [-6, -26, 3, 2], [4, -20, 2, 3], [-8, 12, 3, 2], [0, 18, 2, 2]]) { k++; const top = u < -20 ? 15.6 : (u < -12 ? 20.0 : (v < 6 ? 25.0 : 20.0)); K.box(MB, u, top, v, u + w, top + 1.0 + (k % 3) * 0.6, v + d); } }
  // east wing with the curved east front
  const east = [[26.0, -23.3], [30.5, -23.3], [32.8, -10.8], [36.8, -0.1], [38.6, 5.7], [39.4, 11.4], [38.3, 19.6], [37.2, 23.2], [31.2, 23.4], [31.0, 30.6], [26.0, 30.9]];
  block(east, 19.6, { core: false, skip: [10], g: { bay: 3.2 } });
  K.prism(M.concreteDark, east.map(([u, v]) => [u + (u > 26 ? -0.6 : 0.2), v]), -1.5, 19.4);
  // north entrance pavilion / canopy (LiDAR ~5 m)
  { const P = rect(-28.0, -35.0, 8.0, -31.0); for (const { R, i } of runsOf(K, P)) { if (i === 0) continue; curtain(K, R, 0, R.L, -1.5, 4.6, { glass: GL, frame: FR, mw: 2.0, levels: [-1.5, 4.6] }); } flatRoof(K, P, 5.0, { parapet: 0.3, mat: Wp }); K.box(Wp, -29.0, 4.7, -36.2, 9.0, 5.1, -31.0); }
  entrance(K, K.run([8.0, -35.0], [-28.0, -35.0]), 18.0, Math.max(0, K.g(-8, -36)), { w: 5.0, h: 3.2, rec: 0.1, surround: false, glass: GL, frame: FR });
  // grand west entrance where the packet's stair arrives (v≈11.2): two square stone piers, a deep lintel cut "STANLEY HALL",
  // five tall timber doors under a glazed transom, a 12 m granite stair with steel handrails, planters either side
  { const X = rnMats(M); const R = K.run([-35.1, -23.9], [-35.1, 32.9]); const s = 35.1; const STONE = tint(M, 'granite', 0xd4cfc4);
    const gD = K.g(-36.0, 11.2), gB = K.g(-41.5, 11.6); const FL = Math.max(gD + 0.3, gB + 1.8); const H = 5.0;
    for (const ds of [-5.4, 5.4]) { K.rbox(R, STONE, s + ds - 0.6, Math.min(gD, FL) - 1.0, 0, s + ds + 0.6, FL + H + 1.5, 1.4); colliders.push(K.colPoly([R.at(s + ds - 0.6, 0), R.at(s + ds + 0.6, 0), R.at(s + ds + 0.6, 1.4), R.at(s + ds - 0.6, 1.4)], FL - 1, FL + H + 1.5)); }
    K.rbox(R, STONE, s - 6.0, FL + H, 0, s + 6.0, FL + H + 1.5, 2.0);
    signText(K, R, 'STANLEY HALL', s, FL + H + 0.75, 0.55, { d: 2.012, color: '#6d6a63', metal: 0.1, rough: 0.8, spacing: 0.14, font: 'Helvetica, Arial, sans-serif', weight: '600' });
    K.rbox(R, M.concreteDark, s - 4.8, FL, -0.05, s + 4.8, FL + H, 0.08); K.rbox(R, M.windowNight, s - 4.8, FL + 3.1, 0.08, s + 4.8, FL + H, 0.1);
    const DOOR = new THREE.MeshStandardMaterial({ color: 0xa0612f, roughness: 0.6, map: M.wood.map, normalMap: M.wood.normalMap });
    for (let i = 0; i < 5; i++) { const c = s - 3.84 + i * 1.92; K.rbox(R, DOOR, c - 0.86, FL, 0.08, c + 0.86, FL + 3.0, 0.14); K.rbox(R, X.steel, c - 0.04, FL + 0.9, 0.14, c + 0.04, FL + 1.8, 0.2, { detail: true }); }
    for (let i = 0; i <= 5; i++) K.rbox(R, FR, s - 4.8 + i * 1.92 - 0.05, FL, 0.1, s - 4.8 + i * 1.92 + 0.05, FL + H, 0.16, { detail: true });
    K.rbox(R, FR, s - 4.8, FL + 3.0, 0.1, s + 4.8, FL + 3.12, 0.16, { detail: true });
    K.rbox(R, STONE, s - 6.6, Math.min(gD, FL) - 1.0, 0, s + 6.6, FL, 1.6); walkables.push(K.walkPoly([R.at(s - 6.6, 0), R.at(s + 6.6, 0), R.at(s + 6.6, 1.6), R.at(s - 6.6, 1.6)], FL));
    if (FL - gB > 0.2) { const n = Math.max(2, Math.round((FL - gB) / 0.15)); const tr = 0.36; const rr = (FL - gB) / n;
      for (let i = 0; i < n; i++) K.rbox(R, STONE, s - 6.0, gB - 0.8, 1.6 + tr * i, s + 6.0, FL - rr * (i + 1), 1.6 + tr * (i + 1));
      const d0 = 1.6, d1 = 1.6 + tr * n; const cs = [R.at(s - 6, d0), R.at(s + 6, d0), R.at(s + 6, d1), R.at(s - 6, d1)].map(([u, v]) => K.xz(u, v));
      walkables.push({ type: 'fn', bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))], heightAt: (x, z) => { const [u, v] = K.uv(x, z); const du = u - R.a[0], dv = v - R.a[1]; const ss = du * R.t[0] + dv * R.t[1], dd = du * R.n[0] + dv * R.n[1]; if (Math.abs(ss - s) > 6.05 || dd < d0 - 0.05 || dd > d1 + 0.05) return null; const i = Math.min(n - 1, Math.max(0, Math.floor((dd - d0) / tr))); return FL - rr * (i + 1); } });
      for (const sx of [s - 6.0, s - 3.0, s, s + 3.0, s + 6.0]) tube(K, R, X.steel, [sx, FL + 0.9, d0], [sx, gB + 0.9, d1], 0.022); }
    for (const ds of [-8.6, 8.6]) colliders.push(planter(K, R, s + ds, 0.4, 3.0, 2.0, 0.7, { mat: STONE }));
    planting(K, R, 1.0, R.L - 1.0, { d0: 0.2, depth: 1.4, h: 0.9, skip: [[s - 10.5, s + 10.5]], seed: 81 }); }
  colliders.push(colFromXZ(ctx.footprints[0].outer, -2, 44));
  const object3d = K.finish(); object3d.name = 'stanley-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
