// Senior Hall (John Galen Howard, 1906): the "Senior Men's Hall", a long one-storey cabin of horizontal redwood logs with
// saddle-notched corners whose log ends stick out in ragged stacks, a mossy shake gable roof with deep eaves and exposed purlin
// ends, a nearly continuous ribbon of small-paned casements under the eaves, a brick chimney, and the entrance porch and
// timber stair at the low west gable. The floor steps up toward the east end with the slope (roof steps with it).
// Massing follows the 2021 LiDAR (frame rotated -26.7° to the OSM outline, 25.4 m × 12.2 m).
import * as THREE from 'three';
import { Kit, deg, mats, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'senior-hall',
  name: 'Senior Hall',
  subtitle: 'John Galen Howard · 1906',
  blurb: 'Built of redwood logs for the senior men of the class of 1906, the cabin is the meeting place of the Order of the Golden Bear and is listed on the National Register of Historic Places.',
  replaces: ['w/25887540'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-26.7)); const M = ctx.M; const X = mats(M);
  const LOG = new THREE.MeshStandardMaterial({ color: 0x7a6450, roughness: 0.9, map: M.wood.map, normalMap: M.wood.normalMap });
  const LOGEND = new THREE.MeshStandardMaterial({ color: 0xb08a66, roughness: 0.9 });
  const SHAKE = new THREE.MeshStandardMaterial({ color: 0x8a9478, roughness: 0.95, map: M.shingle.map, normalMap: M.shingle.normalMap });
  const FR = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.7 });
  const colliders = [], walkables = [];
  const D = 0.4, R0 = D / 2, PITCH = D * 0.9;
  const U0 = -12.7, U1 = 12.7, V0 = -6.1, V1 = 6.1, US = 3.5; // step between west and east floor levels
  // one horizontal log along the frame u (axis 'u') or v
  function log(axis, a0, a1, y, c, { r = R0, ends = true } = {}) {
    const len = a1 - a0; if (len < 0.2) return;
    const g = new THREE.CylinderGeometry(r, r, len, 8, 1, true); g.rotateZ(Math.PI / 2);
    if (axis === 'v') g.rotateY(Math.PI / 2);
    if (axis === 'u') g.translate((a0 + a1) / 2, y, c); else g.translate(c, y, (a0 + a1) / 2);
    K.add(LOG, g, { uvMode: 'keep' });
    if (ends) for (const e of [a0, a1]) { const cg = new THREE.CircleGeometry(r * 0.97, 8); if (axis === 'u') { cg.rotateY(e === a0 ? -Math.PI / 2 : Math.PI / 2); cg.translate(e, y, c); } else { cg.rotateY(e === a0 ? Math.PI : 0); cg.translate(c, y, e); } K.add(LOGEND, cg, { uvMode: 'keep' }); }
  }
  // a cabin section: u range [ua, ub], floor level f, wall height H; west/east gable flags
  function section(ua, ub, f, H, { westEnd = false, eastEnd = false } = {}) {
    const g0 = K.gMin(ua, V0, ub, V1);
    // underbuilding (dark log/stone) from below grade to the floor
    K.box(X.redwoodDark, ua + 0.05, g0 - 1.0, V0 + 0.05, ub - 0.05, f, V1 - 0.05);
    // inner core so nothing is see-through behind the windows
    K.box(M.woodDark, ua + 0.25, f, V0 + 0.25, ub - 0.25, f + H, V1 - 0.25);
    const nC = Math.floor(H / PITCH);
    const winY0 = f + 1.15, winY1 = f + 2.2;
    for (let k = 0; k < nC; k++) {
      const yL = f + R0 + k * PITCH, yS = yL + PITCH / 2; // long walls and gable walls interleave (saddle notch)
      const inRibbon = yL > winY0 - 0.05 && yL < winY1 + 0.05;
      for (const v of [V0, V1]) {
        if (!inRibbon) log('u', ua - (westEnd ? 0.55 : 0), ub + (eastEnd ? 0.55 : 0), yL, v);
        else { // posts between window groups: short vertical log stubs instead of courses
        }
      }
      for (const [u, on] of [[ua, westEnd], [ub, eastEnd]]) if (on && yS < f + H) log('v', V0 - 0.55, V1 + 0.55, yS, u);
    }
    // ribbon of casement groups under the eaves (long sides): glass + frames + muntins, log posts between groups
    const L = ub - ua; const nG = Math.max(2, Math.round(L / 2.6)); const gw = L / nG;
    for (const v of [V0, V1]) {
      const out = v < 0 ? -1 : 1;
      for (let i = 0; i < nG; i++) {
        const a = ua + gw * i + 0.25, b = ua + gw * (i + 1) - 0.25;
        K.box(M.windowNight, a, winY0, v - 0.04, b, winY1, v + 0.04);
        const nS = Math.max(2, Math.round((b - a) / 0.85));
        for (let k = 0; k <= nS; k++) { const u = a + (b - a) * k / nS; K.box(FR, u - 0.04, winY0, v + out * 0.04 - 0.03, u + 0.04, winY1, v + out * 0.04 + 0.03); }
        for (const y of [winY0, winY1]) K.box(FR, a, y - 0.05, v + out * 0.03 - 0.05, b, y + 0.05, v + out * 0.03 + 0.05);
        for (let k = 0; k < nS; k++) { const ua2 = a + (b - a) * k / nS, ub2 = a + (b - a) * (k + 1) / nS; const um = (ua2 + ub2) / 2; K.box(FR, um - 0.015, winY0, v + out * 0.05 - 0.01, um + 0.015, winY1, v + out * 0.05 + 0.01, { detail: true }); for (const t of [1 / 3, 2 / 3]) K.box(FR, ua2, winY0 + (winY1 - winY0) * t - 0.015, v + out * 0.05 - 0.01, ub2, winY0 + (winY1 - winY0) * t + 0.015, v + out * 0.05 + 0.01, { detail: true }); }
      }
      for (let i = 0; i <= nG; i++) { const u = ua + gw * i; const g = new THREE.CylinderGeometry(0.17, 0.17, winY1 - winY0 + 0.2, 8); g.translate(u, (winY0 + winY1) / 2, v); K.add(LOG, g, { uvMode: 'keep' }); }
      // sill and plate logs framing the ribbon
      log('u', ua - (westEnd ? 0.55 : 0), ub + (eastEnd ? 0.55 : 0), winY0 - 0.12, v, { r: 0.16 });
      log('u', ua - (westEnd ? 0.55 : 0), ub + (eastEnd ? 0.55 : 0), winY1 + 0.14, v, { r: 0.16 });
    }
    colliders.push(K.colPoly([[ua, V0], [ub, V0], [ub, V1], [ua, V1]], g0 - 1, f + H + 4));
    return { f, H };
  }
  // gable triangle of shortening logs + shake roof with deep eaves and purlin ends
  function roof(ua, ub, eave, rise, { gableW = false, gableE = false } = {}) {
    const ov = 0.95, rake = 0.6, vm = 0;
    for (const [u, on] of [[ua, gableW], [ub, gableE]]) if (on) {
      for (let y = eave + R0; y < eave + rise - 0.25; y += PITCH) { const half = (V1 - V0) / 2 * (1 - (y - eave) / rise); log('v', vm - half + 0.1, vm + half - 0.1, y, u, { ends: false }); }
      for (const vv of [V0 + 1.6, 0, V1 - 1.6]) { const g = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8); g.rotateZ(Math.PI / 2); g.translate(u + (u === ua ? -0.5 : 0.5), eave + rise * (1 - Math.abs(vv) / ((V1 - V0) / 2)) - 0.25, vv); K.add(LOG, g, { uvMode: 'keep' }); }
    }
    K.gable(SHAKE, ua - (gableW ? rake : -0.02), V0, ub + (gableE ? rake : -0.02), V1, eave, rise, 'u', { overhang: ov, thick: 0.18 });
    // fascia and ridge board
    const s = ov * rise / ((V1 - V0) / 2);
    for (const v of [V0 - ov, V1 + ov]) K.box(FR, ua - (gableW ? rake : 0), eave - s - 0.22, v - 0.04, ub + (gableE ? rake : 0), eave - s, v + 0.04);
    K.box(FR, ua - (gableW ? rake : 0), eave + rise - 0.05, -0.12, ub + (gableE ? rake : 0), eave + rise + 0.1, 0.12);
  }
  const fW = Math.max(1.0, K.gMax(U0, V0, U0 + 2, V1) + 0.55), fE = fW + 1.2, H = 2.8;
  section(U0, US, fW, H, { westEnd: true });
  section(US, U1, fE, H, { eastEnd: true });
  const rise = 4.3;
  roof(U0, US + 0.4, fW + H, rise, { gableW: true });
  roof(US, U1, fE + H, rise, { gableE: true });
  // step wall where the east roof rises above the west roof
  K.box(LOG, US - 0.1, fW + H, V0 + 0.2, US + 0.15, fE + H + rise - 0.5, V1 - 0.2);
  // brick chimney toward the east end of the ridge
  K.box(M.brick, 7.2, fE + 1.0, -0.5, 8.2, fE + H + rise + 1.1, 0.4);
  K.box(M.brick, 7.1, fE + H + rise + 1.0, -0.6, 8.3, fE + H + rise + 1.2, 0.5);
  // west gable end: door (offset), tall narrow window, small gable window
  {
    const u = U0 - 0.2;
    K.box(M.woodDark, u - 0.06, fW, -3.4, u + 0.02, fW + 2.15, -2.35);
    K.box(FR, u - 0.1, fW + 2.15, -3.5, u + 0.02, fW + 2.28, -2.25);
    K.box(M.windowNight, u - 0.05, fW + 0.85, -1.2, u + 0.02, fW + 2.45, -0.4);
    for (const z of [-1.2, -0.8, -0.4]) K.box(FR, u - 0.09, fW + 0.85, z - 0.03, u + 0.02, fW + 2.45, z + 0.03);
    for (let y = fW + 0.85; y <= fW + 2.46; y += 0.4) K.box(FR, u - 0.09, y - 0.025, -1.2, u + 0.02, y + 0.025, -0.4, { detail: true });
    K.box(M.windowNight, u - 0.05, fW + H + 1.2, -0.45, u + 0.02, fW + H + 1.9, 0.45);
    K.box(FR, u - 0.09, fW + H + 1.5, -0.45, u + 0.02, fW + H + 1.58, 0.45);
    // porch landing with stick railing, timber stair down along the wall, globe lamp
    const pu0 = U0 - 1.6, pv0 = -4.4, pv1 = -2.1;
    K.box(M.woodDark, pu0, fW - 0.15, pv0, U0, fW, pv1);
    for (const v of [pv0, pv1]) K.box(FR, pu0, fW + 0.9, v - 0.04, U0, fW + 0.98, v + 0.04);
    K.box(FR, pu0 - 0.04, fW + 0.9, pv0, pu0 + 0.04, fW + 0.98, pv1);
    for (let k = 0; k <= 6; k++) { const v = pv0 + (pv1 - pv0) * k / 6; K.box(FR, pu0 - 0.03, fW, v - 0.03, pu0 + 0.03, fW + 0.95, v + 0.03, { detail: true }); }
    for (const v of [pv0, pv1]) for (let k = 0; k <= 4; k++) { const uu = pu0 + 1.6 * k / 4; K.box(FR, uu - 0.03, fW, v - 0.03, uu + 0.03, fW + 0.95, v + 0.03, { detail: true }); }
    const gS = K.g(pu0 - 0.5, (pv0 + pv1) / 2); const n = Math.max(2, Math.round((fW - gS) / 0.18));
    for (let k = 0; k < 3; k++) K.box(M.woodDark, pu0 + 0.1, gS - 0.6, pv0 + 0.2 + k * 0.7, pu0 + 0.2, fW - 0.15, pv0 + 0.3 + k * 0.7);
    walkables.push(K.walkPoly([[pu0, pv0], [U0, pv0], [U0, pv1], [pu0, pv1]], fW));
    walkables.push(K.stairs(M.woodDark, pu0 - n * 0.28, pv0 + 0.1, pu0, pv1 - 0.1, gS, fW, '+u', n));
    K.box(FR, u - 0.35, fW + 2.2, -1.85, u - 0.05, fW + 2.26, -1.75);
    K.lathe(M.lampGlow, [[0.04, 0], [0.15, 0.06], [0.16, 0.18], [0.1, 0.3], [0.001, 0.32]], u - 0.4, fW + 1.95, -1.8, 10, { detail: true });
    lamp(K, U0 - 3.5, K.g(U0 - 3.5, -5.5), -5.5, 3.4);
  }
  const object3d = K.finish();
  object3d.name = 'senior-hall';
  return { object3d, colliders, walkables };
}
