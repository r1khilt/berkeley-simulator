// Davis Hall: civil and environmental engineering, home of the structural testing laboratories, north of the Grimes terrace.
// A long light-grey precast concrete slab read in horizontal layers: tall smooth spandrel bands with thin floor ledges and grouped
// strip windows (3-4 lights, solid wall between groups), a recessed ground storey behind an arcade of round concrete arches on the
// south plaza, light wells, and a tall windowless stair tower; "DAVIS HALL" in serif capitals. (refine-north: façade language
// corrected from vertical piers to horizontal bands after photo review.) Massing follows the 2021 LiDAR: main roof ~28.5 m, north band ~30-31 m, light wells ~23.5 m, tower ~40 m.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, signText, storefront, polysGeo } from './lib/b03-kit.js';
import { planting, bikes, furniture, rnMats, panelMat } from './lib/rn-kit.js';

export const info = {
  id: 'davis-hall',
  name: 'Davis Hall',
  subtitle: 'Civil & Environmental Engineering',
  blurb: 'Home of civil and environmental engineering, with large structural testing laboratories where full-scale beams, columns and walls are loaded to failure. Named for Raymond E. Davis, a pioneer of concrete research.',
  replaces: ['w/24024351'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-15.8);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const CON = panelMat('davisPrecast', { pw: 1.975, ph: 7.9, span: 7.9, base: 0xe8e5db, joint: 0xb4b1a8, vary: 0.018, grain: 0.012, stagger: false, rough: 0.85 });
  const GL = B.glassGrey, FR = B.alumDark;
  const colliders = [], walkables = [];
  const u0 = -31.4, u1 = 31.4, v0 = -15.8, v1 = 15.7, ROOF = 27.9, VN = -4.6;
  const levels = [-2, 3.0, 7.6, 12.0, 16.4, 20.8, 25.0, ROOF];
  const runs = massBlock(K, { poly: rect(u0, VN, u1, v1), holes: [rect(-14.5, -2.6, -8.8, 4.0), rect(9.6, -2.6, 15.2, 4.0)], levels, top: ROOF, wall: CON, style: 'punched', depth: 0.5, rev: 0.4, glass: GL, frame: FR,
    win: { bay: 7.9, pierW: 1.7, spandrel: 2.2, head: 0.6, mull: 4 }, winAt: (k) => (k === 0 ? { spandrel: 0.6, head: 0.5, pierW: 1.2 } : k === levels.length - 2 ? { spandrel: 1.6, head: 0.3 } : null), style: 'grid', roof: B.roofMembrane, parapet: 1.1, pmat: CON, coping: CON, floorBand: { mat: CON, h: 0.16, p: 0.14 } });
  // light-well floors (LiDAR ~23.5 m)
  for (const r of [rect(-14.5, -2.6, -8.8, 4.0), rect(9.6, -2.6, 15.2, 4.0)]) K.prism(B.roofMembrane, r, -1, 23.5);
  // north band: a shed roof rising from ~26.6 m at the north edge to ~30.2 m (LiDAR), with a raised central plant block
  {
    const yN = 26.6, yS = 30.2, a0 = u0 + 0.3, a1 = u1 - 0.3, b0 = v0 + 0.3, b1 = VN;
    runs.push(...massBlock(K, { poly: rect(u0, v0, u1, VN), levels: levels.filter((y) => y < yN - 1).concat([yN]), top: yN, wall: CON, style: 'punched', depth: 0.5, rev: 0.4, glass: GL, frame: FR,
      win: { bay: 7.9, pierW: 1.7, spandrel: 2.2, head: 0.6, mull: 4 }, style: 'grid', floorBand: { mat: CON, h: 0.16, p: 0.14 }, roof: B.roofMembrane }));
    const P = (u, y, v) => [u, y, v];
    const wedge = [[P(a0, yN, b0), P(a1, yN, b0), P(a1, yS, b1), P(a0, yS, b1)], [P(a0, yN, b0), P(a0, yS, b1), P(a0, yN, b1)], [P(a1, yN, b0), P(a1, yN, b1), P(a1, yS, b1)], [P(a0, yN, b1), P(a0, yS, b1), P(a1, yS, b1), P(a1, yN, b1)]];
    K.add(B.roofMembrane, polysGeo([wedge[0].slice().reverse()]), { uvMode: 'roof' }); K.add(CON, polysGeo(wedge.slice(1)));
    massBlock(K, { poly: rect(-9.0, -14.2, 9.0, -8.0), levels: [28.5, 31.2], y0: 27, top: 31.2, wall: CON, style: 'blank', depth: 0.4, roof: B.roofMembrane, core: true });
    massBlock(K, { poly: rect(u0 + 0.6, 5.4, u1 - 0.6, 8.6), levels: [ROOF, 30.0], top: 30.0, wall: CON, style: 'blank', depth: 0.4, roof: B.roofMembrane, core: true });
  }
  // tall windowless stair / lift tower near the west end (LiDAR ~38-43 m) with vertical ribbing
  massBlock(K, { poly: rect(-26.5, 4.2, -17.0, 13.2), levels: [ROOF, 39.5], top: 39.5, wall: CON, style: 'blank', depth: 0.5, roof: B.roofMembrane, core: true, parapet: 0.6, pmat: CON });
  for (let u = -26.3; u < -17.1; u += 0.6) K.box(CON, u, ROOF, 13.2, u + 0.25, 39.9, 13.45, { detail: true });
  // projecting concrete frame boxes around every strip window on the long faces (same bay maths as massBlock 'grid')
  for (const R of runs) {
    if (R.L < 20) continue; const nb = Math.max(1, Math.round(R.L / 7.9)); const bwid = R.L / nb;
    for (let k = 1; k < levels.length - 1; k++) {
      const fl = levels[k], a1 = levels[k + 1]; const top = k === levels.length - 2; const y0 = fl + (top ? 1.6 : 2.2), y1 = a1 - (top ? 0.3 : 0.6);
      if (y1 > (R.n[1] < -0.9 ? 26.6 : ROOF)) continue;
      for (let i = 0; i < nb; i++) { const a = bwid * i + 0.85 - 0.18, b = bwid * (i + 1) - 0.85 + 0.18; if (y0 < gAt(K, R, (a + b) / 2, 0.6) + 0.3) continue;
        K.rbox(R, CON, a, y1, -0.05, b, y1 + 0.2, 0.4); K.rbox(R, CON, a, y0 - 0.2, -0.05, b, y0, 0.45);
        K.rbox(R, CON, a, y0, -0.05, a + 0.18, y1, 0.4); K.rbox(R, CON, b - 0.18, y0, -0.05, b, y1, 0.4); }
    }
  }
  // south plaza front: an arcade of round concrete arches standing ~2.4 m proud of the recessed, darker ground storey; paired glass
  // entrance doors under the arcade, "DAVIS HALL" on the plain end panel, planting beds and bike racks along the plaza
  { const R = runs.find((r) => r.n[1] > 0.9 && r.L > 40); if (R) {
    const X = rnMats(M); const AD = 2.4; const RA = K.run(R.a, R.b, AD); const nb = 9; const bw = R.L / nb;
    const gy = (s) => gAt(K, R, s, AD + 0.6); let gmin = Infinity; for (let i = 0; i <= nb; i++) gmin = Math.min(gmin, gy(bw * i));
    const top = levels[1] + 1.4; const arches = []; for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5), w = bw - 1.4; const g = gy(c); arches.push({ s0: c - w / 2, s1: c + w / 2, y0: g - 0.05, y1: Math.min(top - 0.5, g + 2.2 + w / 2), arch: true }); }
    K.wall(RA, CON, 0, R.L, gmin - 1.2, top, arches, 0.55);
    K.rbox(R, CON, 0, top - 0.02, 0, R.L, top + 0.35, AD + 0.08); // arcade roof slab tying back to the façade
    K.rbox(R, M.concreteDark, 0.4, gmin - 0.6, -0.42, R.L - 0.4, levels[1] - 0.2, -0.38); // darker recessed storey behind
    for (const k of [0, nb]) { const s = bw * k; colliders.push(K.colPoly([RA.at(s - 0.6, -0.55), RA.at(s + 0.6, -0.55), RA.at(s + 0.6, 0), RA.at(s - 0.6, 0)], gmin - 1, top)); }
    for (let i = 1; i < nb; i++) { const s = bw * i; colliders.push(K.colPoly([RA.at(s - 0.7, -0.55), RA.at(s + 0.7, -0.55), RA.at(s + 0.7, 0), RA.at(s - 0.7, 0)], gmin - 1, top)); }
    const sD = bw * 3.5; const gD = Math.max(gAt(K, R, sD, 1.2), levels[0]);
    storefront(K, R, sD - 2.2, sD + 2.2, gD + 0.03, gD + 3.1, { glass: M.windowNight, frame: FR, rev: -0.42, transom: gD + 2.4, mw: 1.1 });
    signText(K, R, 'DAVIS HALL', bw * 0.5, Math.min(top + 1.2, levels[2] - 0.6), 0.5, { color: '#5c5a55', metal: 0.0, rough: 0.9, d: 0.16, spacing: 0.12 });
    planting(K, R, 0.5, R.L - 0.5, { d0: AD + 0.7, depth: 1.5, h: 0.9, skip: [[sD - 3, sD + 3]], seed: 3 });
    colliders.push(...bikes(K, R, sD + 7.5, AD + 3.4, 5, 3));
    colliders.push(furniture(K, R, 'bench', sD - 6.5, AD + 3.0, Math.PI), furniture(K, R, 'trashCan', sD - 4.2, AD + 2.9));
  } }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -3, ROOF + 1));
  const object3d = K.finish(); object3d.name = 'davis-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
