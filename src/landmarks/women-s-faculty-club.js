// Women's Faculty Club (John Galen Howard, 1923). A dark red-brown shingled block of three storeys over a white raised
// basement, under a low, wide-eaved hip roof, with paired cream double-hung windows and a crisp white Tuscan entrance
// portico topped by a balustraded balcony on the glade (south) side; a stair window sits off-level above the porch.
// Massing follows the 2021 LiDAR: eaves ~11 m, ridge ~13.5 m; an L-plan with a rear wing to the north.
import * as THREE from 'three';
import { Kit, mats, openWall, hipRoof, lamp, shingleMat } from './lib/b05b-kit.js';
import { balustrade } from './lib/classic-kit.js';

export const info = {
  id: 'women-s-faculty-club',
  name: "Women's Faculty Club",
  subtitle: 'John Galen Howard · 1923',
  blurb: 'Founded by women faculty and staff who were not admitted to the Faculty Club, this brown-shingled clubhouse beside Strawberry Creek has hosted members and overnight guests since 1923.',
  replaces: ['w/24025450'],
};

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M; const X = mats(M);
  const SH = shingleMat(0x6e5446), TRIM = X.creamPaint, WHITE = M.whitePaint;
  const GREEN = new THREE.MeshStandardMaterial({ color: 0x1f3b2e, roughness: 0.6 });
  const colliders = [], walkables = [];
  const gMin = K.gMin(-17.9, -13.0, 15.9, 8.1);
  const F0 = 0.3, SH0 = 1.5, ST = 3.5, EAVE = SH0 + 3 * ST, EAVE2 = EAVE - 0.4; // ground ~0.3; rear wing lower
  const win = (s, y0, h, w = 0.85, pair = false) => pair
    ? [{ s0: s - w - 0.08, s1: s - 0.08, y0, y1: y0 + h, mull: 2, muntins: 3, fw: 0.1, frame: TRIM, sillMat: TRIM }, { s0: s + 0.08, s1: s + w + 0.08, y0, y1: y0 + h, mull: 2, muntins: 3, fw: 0.1, frame: TRIM, sillMat: TRIM }]
    : [{ s0: s - w / 2, s1: s + w / 2, y0, y1: y0 + h, mull: 2, muntins: 3, fw: 0.1, frame: TRIM, sillMat: TRIM }];
  // façade: white basement band + shingled storeys, windows as described per run
  function facade(R, bays, { basementWins = false, porch = null, eave = EAVE } = {}) {
    const ops = [];
    for (const b of bays) {
      if (b.k === 'pair') { ops.push(...win(b.s, SH0 + 0.9, 1.8, 0.98, true)); for (const f of [1, 2]) ops.push(...win(b.s, SH0 + f * ST + 0.8, 1.55, 0.98, true)); }
      else if (b.k === 'single') { for (const f of [0, 1, 2]) if (SH0 + f * ST + 2.6 < (b.top ?? EAVE)) ops.push(...win(b.s, SH0 + f * ST + 0.8, f ? 1.55 : 1.8, 1.0)); }
      else if (b.k === 'triple') { ops.push({ s0: b.s - 1.35, s1: b.s + 1.35, y0: SH0 + 0.7, y1: SH0 + 2.5, mull: 2, tran: [SH0 + 1.9], frame: TRIM, sillMat: TRIM }); for (const f of [1, 2]) ops.push(...win(b.s, SH0 + f * ST + 0.8, 1.55, 0.98, true)); }
      else if (b.k === 'porch') { ops.push({ s0: b.s - 0.6, s1: b.s + 0.6, y0: SH0, y1: SH0 + 2.6, kind: 'door', doorTop: SH0 + 2.2, door: GREEN, frame: WHITE, sill: false }); ops.push({ s0: b.s - 0.55, s1: b.s + 0.55, y0: SH0 + ST + 1.75, y1: SH0 + ST + 3.65, mull: 2, muntins: 5, fw: 0.1, frame: TRIM, sillMat: TRIM }); }
    }
    openWall(K, R, SH, 0, R.L, SH0, eave, ops.filter((o) => o.y1 < eave - 0.3), { depth: 0.3, rev: 0.1, frame: TRIM });
    // raised white basement with low barred windows
    const bops = basementWins ? bays.filter((b) => b.k !== 'porch').map((b) => ({ s0: b.s - 0.35, s1: b.s + 0.35, y0: F0 - 0.2, y1: F0 + 0.55, mull: 2, frame: M.iron, sill: false })) : [];
    openWall(K, R, M.stuccoWhite, 0, R.L, gMin - 1.2, SH0, bops, { depth: 0.36, rev: 0.2, frame: M.iron, sill: false });
    K.rbox(R, M.stuccoWhite, -0.05, SH0 - 0.12, 0, R.L + 0.05, SH0 + 0.02, 0.1);
    // frieze strip under the soffit
    K.rbox(R, TRIM, -0.05, eave - 0.3, 0, R.L + 0.05, eave, 0.05);
  }
  // main bar (south front on the glade) and the rear wing
  const mx0 = -17.9, mx1 = 15.9, mz0 = -2.9, mz1 = 8.1;
  facade(K.run([mx0, mz1], [mx0 + 8.6, mz1]), [{ k: 'single', s: 2.2, top: EAVE - 0.4 }, { k: 'pair', s: 6.0 }], { eave: EAVE - 0.4 });
  facade(K.run([mx0 + 25.2, mz1], [mx1, mz1]), [{ k: 'pair', s: 2.7 }, { k: 'single', s: 6.5, top: EAVE - 0.4 }], { eave: EAVE - 0.4 });
  facade(K.run([mx0 + 8.6, mz1 + 0.8], [mx0 + 25.2, mz1 + 0.8]), [{ k: 'pair', s: 3.0 }, { k: 'porch', s: 8.3 }, { k: 'triple', s: 13.6 }]);
  facade(K.run([mx1, mz1], [mx1, mz0]), [{ k: 'single', s: 3.0, top: EAVE - 0.4 }, { k: 'pair', s: 7.6 }], { eave: EAVE - 0.4 });
  facade(K.run([mx0, mz0], [mx0, mz1]), [{ k: 'single', s: 3.0, top: EAVE - 0.4 }, { k: 'pair', s: 7.6 }], { eave: EAVE - 0.4 });
  facade(K.run([mx1, mz0], [8.5, mz0]), [{ k: 'single', s: 3.6, top: EAVE - 0.4 }], { eave: EAVE - 0.4 });
  facade(K.run([-3.2, mz0], [mx0, mz0]), [{ k: 'single', s: 4.0, top: EAVE - 0.4 }, { k: 'pair', s: 10.0 }], { eave: EAVE - 0.4 });
  const wx0 = -3.2, wx1 = 8.5, wz0 = -13.0;
  facade(K.run([wx1, mz0], [wx1, wz0]), [{ k: 'pair', s: 5.0 }], { eave: EAVE2 });
  facade(K.run([wx1, wz0], [wx0, wz0]), [{ k: 'pair', s: 3.4 }, { k: 'pair', s: 8.2 }], { eave: EAVE2 });
  facade(K.run([wx0, wz0], [wx0, mz0]), [{ k: 'pair', s: 5.0 }], { eave: EAVE2 });
  K.box(M.concreteDark, mx0 + 0.35, gMin - 1.2, mz0 + 0.35, mx1 - 0.35, EAVE, mz1 - 0.35);
  K.box(M.concreteDark, wx0 + 0.35, gMin - 1.2, wz0 + 0.35, wx1 - 0.35, EAVE2, mz0 + 0.4);
  // low hip roofs with boxed eaves and cream fascia
  const slope = 0.36;
  hipRoof(K, X.cedarRoof, mx0, mz0, mx1, mz1, EAVE - 0.4, slope, 0.55, { soffit: TRIM });
  { const c0 = mx0 + 8.6, c1 = mx0 + 25.2, cz = mz1 + 0.8; const R = K.run([c0, cz], [c1, cz]);
    K.box(M.concreteDark, c0 + 0.3, gMin - 1.2, mz1 - 0.5, c1 - 0.3, EAVE, cz - 0.32);
    for (const [a, b] of [[[c1, mz1], [c1, cz]], [[c0, cz], [c0, mz1]]]) { const R2 = K.run(a, b); K.rbox(R2, SH, 0, SH0, -0.3, R2.L, EAVE, 0); K.rbox(R2, M.stuccoWhite, 0, gMin - 1.2, -0.3, R2.L, SH0, 0.04); }
    hipRoof(K, X.cedarRoof, c0, mz0 + 1.5, c1, cz, EAVE + 0.05, slope, 0.6, { soffit: TRIM }); }
  hipRoof(K, X.cedarRoof, wx0, wz0, wx1, mz0 + 2.0, EAVE2 + 0.05, slope, 0.5, { soffit: TRIM });
  for (const [a, b] of [[[mx0 - 0.55, mz1 + 0.55], [mx1 + 0.55, mz1 + 0.55]], [[mx1 + 0.55, mz0 - 0.55], [mx0 - 0.55, mz0 - 0.55]]]) { const R = K.run(a, b); K.rbox(R, TRIM, -0.55, EAVE - 0.35 + 0.05, 0, R.L + 0.55, EAVE - 0.1, 0.06); }
  K.cyl(M.iron, 9, EAVE + 1.4, 2.5, 0.06, 0.06, 1.0, 6, { detail: true });
  colliders.push(K.colPoly([[mx0, mz0], [mx1, mz0], [mx1, mz1], [mx0, mz1]], gMin - 1.2, EAVE + 2), K.colPoly([[wx0, wz0], [wx1, wz0], [wx1, mz0], [wx0, mz0]], gMin - 1.2, EAVE + 2));
  // ---------- entrance portico: two Tuscan columns, entablature, balustraded balcony; brick steps ----------
  {
    const cx = mx0 + 16.9, z0 = mz1 + 0.8, z1 = mz1 + 2.4, w = 1.6, top = SH0 + 4.3;
    for (const sx of [-1, 1]) { const x = cx + sx * w; K.cyl(WHITE, x, SH0 + 0.15, z1 - 0.3, 0.23, 0.19, 3.5, 16); K.box(WHITE, x - 0.24, SH0, z1 - 0.54, x + 0.24, SH0 + 0.15, z1 - 0.06); K.box(WHITE, x - 0.25, SH0 + 3.65, z1 - 0.55, x + 0.25, SH0 + 3.8, z1 - 0.05); K.box(WHITE, x - 0.2, SH0, z0, x + 0.2, top, z0 + 0.15); colliders.push({ type: 'cyl', x, z: z1 - 0.3, r: 0.2, y0: SH0 - 1, y1: top }); }
    K.box(WHITE, cx - w - 0.35, SH0 + 3.8, z0, cx + w + 0.35, top + 0.1, z1 + 0.05);
    K.box(WHITE, cx - w + 0.3, SH0, z0 - 0.02, cx + w - 0.3, SH0 + 3.6, z0 + 0.03);
    K.box(WHITE, cx - w - 0.45, top + 0.1, z0, cx + w + 0.45, top + 0.25, z1 + 0.15);
    K.box(M.paving, cx - w - 0.3, SH0 - 0.25, z0, cx + w + 0.3, SH0, z1);
    const R = K.run([cx - w - 0.35, z1 - 0.05], [cx + w + 0.35, z1 - 0.05]);
    balustrade(K, R, WHITE, 0.15, R.L - 0.15, top + 0.25, 0.9, { pitch: 0.3, d: -0.12, piers: [0.25, R.L - 0.25] });
    for (const zz of [z0 + 0.5]) { const R2 = K.run([cx + w + 0.35, z0 + 0.05], [cx + w + 0.35, z1 - 0.1]); balustrade(K, R2, WHITE, 0.1, R2.L - 0.1, top + 0.25, 0.9, { pitch: 0.3, d: -0.12 }); const R3 = K.run([cx - w - 0.35, z1 - 0.1], [cx - w - 0.35, z0 + 0.05]); balustrade(K, R3, WHITE, 0.1, R3.L - 0.1, top + 0.25, 0.9, { pitch: 0.3, d: -0.12 }); }
    K.lathe(M.blackPaint, [[0.12, 0], [0.16, 0.2], [0.12, 0.4], [0.001, 0.45]], cx, top - 0.85, z0 + 0.8, 8, { detail: true });
    const gS = K.g(cx, z1 + 1.2); const n = Math.max(2, Math.round((SH0 - gS) / 0.17));
    walkables.push(K.stairs(M.brick, cx - 1.5, z1, cx + 1.5, z1 + n * 0.3, gS, SH0, '-v', n));
    walkables.push(K.walkPoly([[cx - w - 0.3, z0], [cx + w + 0.3, z0], [cx + w + 0.3, z1], [cx - w - 0.3, z1]], SH0));
    for (const sx of [-1, 1]) { K.box(M.iron, cx + sx * 1.55 - 0.02, gS, z1 + 0.2, cx + sx * 1.55 + 0.02, gS + 0.95, z1 + n * 0.3); }
    for (const sx of [-1, 1]) lamp(K, cx + sx * 3.6, K.g(cx + sx * 3.6, z1 + 3), z1 + 3, 3.2);
  }
  const object3d = K.finish();
  object3d.name = 'women-s-faculty-club';
  return { object3d, colliders, walkables };
}
