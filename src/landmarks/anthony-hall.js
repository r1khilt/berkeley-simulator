// Anthony Hall — the Pelican Building (Joseph Esherick, 1957), built for the California Pelican humor magazine and
// named for its founder Earle C. Anthony. A one-storey Bay Region building: rust-red stucco walls, dark-stained timber
// posts framing big gridded window walls, low red clay-tile gables with deep open eaves, and a vine-covered pergola
// porch on round concrete columns. A carved pelican medallion sits over the door and a bronze pelican spreads its
// wings in the lawn in front.
import * as THREE from 'three';
import { siteDress } from './lib/rc-finish.js';
import { Kit } from './lib/classic-kit.js';
import { tint, paleGlass, textPanel, shrubRow, drapeStrip } from './lib/b05a-kit.js';
import { loadSculpt, sculptMaterial } from '../props/sculpt.js'; // r4-props2: baked Laughing Pelican

export const info = {
  id: 'anthony-hall',
  name: 'Anthony Hall',
  subtitle: 'Joseph Esherick · 1957',
  blurb: 'Built as the offices of the California Pelican, the student humor magazine founded in 1903 by Earle C. Anthony, this small Bay Region building by Strawberry Creek still wears a carved pelican over its door.',
  replaces: ['w/24025030'],
};

export async function build(ctx) {
  const M = ctx.M; const K = new Kit(ctx, THREE.MathUtils.degToRad(-19.0));
  // r4-props2: Frances Rich's Laughing Pelican as a baked SDF sculpt (tools/sculpt/pelican.mjs) [hi, lo]; null -> primitive bird
  const pelGeo = await Promise.all([loadSculpt('pelican', { uvScale: 0.6 }), loadSculpt('pelican-lo', { uvScale: 0.6 })]).catch((e) => { console.warn('pelican sculpt unavailable', e); return null; });
  const ST = tint(K, M.stucco, 0xb04a32, 'ahStucco'), TM = tint(K, M.woodDark, 0x5a3a26, 'ahTimber'), CP = tint(K, M.concrete, 0xdccfb2, 'ahCol');
  const GL = paleGlass(); const FR = tint(K, M.whitePaint, 0xe6e4dc, 'ahFrame');
  const colliders = [], walkables = [];
  const FL = Math.max(K.g(0, 0), K.g(-8, 5), K.g(7, -2), K.g(2, -10)) + 0.25, WP = FL + 3.2;
  // walls with gridded window walls between timber posts
  function wallRun(a, b, glazed = true, door = null) {
    const R = K.run(a, b); const L = R.L; const nb = Math.max(1, Math.round(L / 2.6)); const bw = L / nb;
    const ops = [];
    if (glazed) for (let i = 0; i < nb; i++) { const s0 = i * bw + 0.22, s1 = (i + 1) * bw - 0.22; if (door != null && Math.abs((s0 + s1) / 2 - door) < bw / 2) ops.push({ s0, s1, y0: FL, y1: FL + 2.6, door: true }); else if (i % 3 !== 1 || nb < 3) ops.push({ s0, s1, y0: FL + 0.75, y1: FL + 2.75 }); }
    K.wall(R, ST, 0, L, -1.2, WP, ops, 0.3);
    for (const o of ops) {
      if (o.door) K.fill(R, { ...o, doorTop: FL + 2.2, sill: false }, { kind: 'door', rev: 0.18, door: TM, frame: TM, glass: GL });
      else K.fill(R, { ...o, muntins: 3, sill: false }, { glass: GL, frame: FR, mull: 4, rev: 0.16 });
    }
    for (let i = 0; i <= nb; i++) { const s = i * bw; K.rbox(R, TM, s - 0.11, FL - 0.05, 0, s + 0.11, WP, 0.12); K.rbox(R, CP, s - 0.15, WP - 0.35, 0, s + 0.15, WP - 0.15, 0.16); }
    K.rbox(R, TM, -0.1, WP - 0.15, 0, L + 0.1, WP, 0.14); // timber plate
    return R;
  }
  // main block (ridge along u), north wing and south porch wing (ridges along v)
  const A = { u0: -9.55, u1: 8.79, v0: -3.5, v1: 6.6 }, N = { u0: -2.35, u1: 5.3, v0: -11.07, v1: -3.5 }, P = { u0: -2.9, u1: 2.7, v0: 6.6, v1: 9.65 };
  wallRun([A.u0, A.v1], [P.u0, A.v1]); wallRun([P.u1, A.v1], [A.u1, A.v1]);
  wallRun([A.u1, A.v1], [A.u1, A.v0]); wallRun([A.u1, A.v0], [N.u1, A.v0], false); wallRun([N.u0, A.v0], [A.u0, A.v0], false);
  wallRun([A.u0, A.v0], [A.u0, A.v1]);
  wallRun([N.u1, A.v0], [N.u1, N.v0], true, 5.5); wallRun([N.u1, N.v0], [N.u0, N.v0]); wallRun([N.u0, N.v0], [N.u0, A.v0]);
  wallRun([P.u0, P.v1], [P.u1, P.v1], true, 2.8); wallRun([P.u1, P.v1], [P.u1, A.v1], false); wallRun([P.u0, A.v1], [P.u0, P.v1], false);
  for (const B of [A, N, P]) { K.box(M.concreteDark, B.u0 + 0.35, -1.2, B.v0 + 0.35, B.u1 - 0.35, WP - 0.05, B.v1 - 0.35); colliders.push(K.colPoly([[B.u0, B.v0], [B.u1, B.v0], [B.u1, B.v1], [B.u0, B.v1]], -1.2, WP + 2)); }
  // low clay-tile gables with deep open eaves and exposed rafters
  const ov = 0.95, pitch = 0.32; const TILE = tint(K, M.redTile, 0xc59a88, 'ahTile');
  const roof = (B, axis) => {
    const span = axis === 'u' ? B.v1 - B.v0 : B.u1 - B.u0; const rise = span / 2 * pitch;
    K.gable(TILE, B.u0, B.v0, B.u1, B.v1, WP + 0.05, rise, axis, { overhang: ov, wallMat: ST, thick: 0.18 });
    // rafter tails under the eaves (detail)
    const n = Math.floor((axis === 'u' ? B.u1 - B.u0 : B.v1 - B.v0) / 0.9);
    for (let i = 0; i <= n; i++) {
      const t = (axis === 'u' ? B.u0 : B.v0) + i * 0.9;
      for (const sgn of [-1, 1]) {
        if (axis === 'u') { const v = sgn < 0 ? B.v0 - ov * 0.45 : B.v1 + ov * 0.45; K.box(TM, t - 0.06, WP - 0.3, v - ov * 0.5, t + 0.06, WP - 0.1, v + ov * 0.5, { detail: true }); }
        else { const u = sgn < 0 ? B.u0 - ov * 0.45 : B.u1 + ov * 0.45; K.box(TM, u - ov * 0.5, WP - 0.3, t - 0.06, u + ov * 0.5, WP - 0.1, t + 0.06, { detail: true }); }
      }
    }
    return rise;
  };
  roof(A, 'u'); roof({ ...N, v1: N.v1 + 1.0 }, 'v');
  // brick chimney at the east end of the main ridge
  K.box(M.brick, A.u1 - 2.6, WP - 0.5, 1.0, A.u1 - 1.8, WP + 3.3, 1.8); K.box(TM, A.u1 - 2.7, WP + 3.3, 0.9, A.u1 - 1.7, WP + 3.4, 1.9);
  // pergola porch on round concrete columns, partly vine-covered (in front of the south wing)
  const pv0 = P.v1, pv1 = P.v1 + 4.2;
  for (const u of [P.u0 - 1.6, P.u0 + 0.9, P.u1 - 0.9, P.u1 + 1.6]) for (const v of [pv0 + 0.4, pv1]) {
    const g0 = K.g(u, v); K.cyl(CP, u, g0 - 0.3, v, 0.17, 0.15, FL + 2.75 - g0 + 0.3, 12); K.box(CP, u - 0.22, FL + 2.65, v - 0.22, u + 0.22, FL + 2.85, v + 0.22);
    colliders.push(K.colCyl(u, v, 0.2, g0 - 0.3, FL + 3));
  }
  for (const v of [pv0 + 0.4, pv1]) { K.box(TM, P.u0 - 2.2, FL + 2.85, v - 0.16, P.u1 + 2.2, FL + 3.1, v - 0.04); K.box(TM, P.u0 - 2.2, FL + 2.85, v + 0.04, P.u1 + 2.2, FL + 3.1, v + 0.16); }
  for (let u = P.u0 - 2.0; u <= P.u1 + 2.01; u += 0.6) K.box(TM, u - 0.05, FL + 3.1, pv0 - 0.4, u + 0.05, FL + 3.3, pv1 + 0.8, { detail: true });
  { // shallow mono-pitch clay-tile porch roof, falling away from the building
    const yA = FL + 4.0, yB = FL + 3.25; const u0 = P.u0 - 2.6, u1 = P.u1 + 2.6, v0 = pv0 - 0.5, v1 = pv1 + 0.9;
    const pts = [[u0, yA, v0], [u1, yA, v0], [u1, yB, v1], [u0, yB, v1]];
    const g = new THREE.BufferGeometry(); const q = [pts[0], pts[2], pts[1], pts[0], pts[3], pts[2]].flat(); g.setAttribute('position', new THREE.Float32BufferAttribute(q, 3)); g.computeVertexNormals();
    K.add(TILE, g, { uvMode: 'roof' });
    const g2 = g.clone(); g2.translate(0, -0.15, 0); const ix = g2.index; const p2 = g2.attributes.position; for (let i = 0; i < p2.count; i += 3) { const x = p2.getX(i + 1), y = p2.getY(i + 1), z = p2.getZ(i + 1); p2.setXYZ(i + 1, p2.getX(i + 2), p2.getY(i + 2), p2.getZ(i + 2)); p2.setXYZ(i + 2, x, y, z); } g2.computeVertexNormals(); K.add(TM, g2);
    K.box(TM, u0, yB - 0.3, v1 - 0.08, u1, yB, v1); // fascia
  }
  K.box(M.paving, P.u0 - 2.2, FL - 0.25, pv0, P.u1 + 2.2, FL, pv1 + 0.4);
  walkables.push(K.walkPoly([[P.u0 - 2.2, pv0], [P.u1 + 2.2, pv0], [P.u1 + 2.2, pv1 + 0.4], [P.u0 - 2.2, pv1 + 0.4]], FL));
  // carved pelican medallion over the door + timber name board
  {
    const R = K.run([P.u0, P.v1], [P.u1, P.v1]); const L = R.L; const sc = 2.8;
    textPanel(K, R, sc - 0.95, sc + 0.95, FL + 2.38, FL + 3.12, 0.04, 'PELICAN\n( ◎ )\nFOUNDED · 1903 · BY EARLE C. ANTHONY', { bg: '#bdb8a8', fg: '#5d574b', px: 64, lineGap: 1.15 });
    textPanel(K, R, sc - 1.0, sc + 1.0, FL + 2.2, FL + 2.38, 0.06, 'ANTHONY HALL', { bg: '#3a2618', fg: '#e6cf8a', px: 120, lineGap: 1.0 });
  }
  // bronze pelican with raised wings in the lawn
  {
    const pu = P.u1 + 4.6, pvv = pv1 + 2.6; const g0 = K.g(pu, pvv); const B = tint(K, M.bronze, 0x4f6a68, 'ahPel');
    const f = new THREE.CylinderGeometry(1.1, 1.2, 0.25, 9); f.translate(pu, g0 + 0.05, pvv); K.add(tint(K, M.granite, 0xa9a8a2, 'ahStone'), f);
    if (pelGeo) { // r4-props2: the baked sculpt (beak toward +u, like the primitive bird it replaces), standing on the stone base
      const lod = new THREE.LOD(); lod.name = 'laughing-pelican'; lod.userData.keep = true; // keep: mergeStatic must not fuse the LOD levels
      const mat = sculptMaterial(B, { color: 0x55695f });
      for (const [lvl, dist] of [[0, 0], [1, 35]]) { const g = pelGeo[lvl]; g.rotateY(Math.PI / 2); g.translate(pu, g0 + 0.175, pvv); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; lod.addLevel(m, dist); }
      K.extra.push(lod);
    }
    const add = (g) => { if (!pelGeo) K.add(B, g); }; // primitive fallback only
    const body = new THREE.SphereGeometry(0.5, 12, 9); body.scale(1.15, 0.85, 0.8); body.translate(pu, g0 + 0.8, pvv); add(body);
    const tail = new THREE.ConeGeometry(0.3, 0.6, 8); tail.rotateZ(Math.PI / 2 + 0.3); tail.translate(pu - 0.75, g0 + 0.75, pvv); add(tail);
    // S-curved neck: three tilted segments, head high, long beak raised ~60 degrees with a hanging pouch
    const seg = (x0, y0, x1, y1, r0, r1) => { const L = Math.hypot(x1 - x0, y1 - y0); const c = new THREE.CylinderGeometry(r1, r0, L, 8); c.rotateZ(-Math.atan2(x1 - x0, y1 - y0)); c.translate(pu + (x0 + x1) / 2, g0 + (y0 + y1) / 2, pvv); add(c); };
    seg(0.35, 1.05, 0.55, 1.45, 0.2, 0.15); seg(0.55, 1.45, 0.42, 1.85, 0.15, 0.12); seg(0.42, 1.85, 0.5, 2.1, 0.12, 0.13);
    const head = new THREE.SphereGeometry(0.17, 10, 8); head.translate(pu + 0.52, g0 + 2.15, pvv); add(head);
    const beak = new THREE.ConeGeometry(0.075, 0.95, 6); beak.translate(0, 0.475, 0); beak.rotateZ(-0.55); beak.translate(pu + 0.6, g0 + 2.12, pvv); add(beak);
    const pouch = new THREE.SphereGeometry(0.12, 8, 6); pouch.scale(1.0, 2.4, 0.9); pouch.rotateZ(-0.55); pouch.translate(pu + 0.78, g0 + 2.25, pvv); add(pouch);
    // two raised, tapered wing blades
    for (const sd of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.35, 0.25); sh.lineTo(1.25, 0.5); sh.lineTo(0.9, 0.55); sh.lineTo(0.6, 0.5); sh.lineTo(0.0, 0.32); sh.lineTo(0, 0);
      const w = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
      w.rotateY(-Math.PI / 2); w.rotateX(sd * -0.75); // fan the blade up and outward
      w.translate(pu - 0.2, g0 + 1.0, pvv + sd * 0.25); add(w);
    }
    colliders.push(K.colCyl(pu, pvv, 1.1, g0 - 0.5, g0 + 2.2));
  }
  shrubRow(K, [A.u0, A.v1], [P.u0 - 2.4, A.v1], 0.7, { h: 0.7 });
  siteDress(K, ctx, ctx.footprints[0].outer.map(([x, z]) => K.uv(x, z)), { d: 1.0 }); // refine-central: planting, lamps, bike rack where paths arrive
  const object3d = K.finish(); object3d.name = 'anthony-hall';
  return { object3d, colliders, walkables };
}
