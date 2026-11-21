// Jean Gray Hargrove Music Library (Mack Scogin Merrill Elam, 2004). A compact library box set into the slope beside the
// music buildings: a board-formed concrete base where the ground falls away to the west, dark slate-shingled upper walls,
// a long deep-set ribbon window at the reading-room level, vertical slot windows, a canted glazed prow cantilevering from
// the south-west corner, a raised zinc clerestory monitor on the flat roof, and a recessed glazed entrance on the uphill side.
// Massing follows the 2021 LiDAR (frame -12°): roof ~14 m, monitor ~16 m; ground falls ~4 m from east to west.
import * as THREE from 'three';
import { Kit, deg, mats, openWall, curtain, boardMat, shingleMat, lamp } from './lib/b05b-kit.js';

export const info = {
  id: 'hargrove-music-library',
  name: 'Hargrove Music Library',
  subtitle: 'Mack Scogin Merrill Elam · 2004',
  blurb: 'The Jean Gray Hargrove Music Library holds UC Berkeley\'s collections of scores, recordings and music manuscripts in a slate- and concrete-clad building beside Morrison Hall.',
  replaces: ['w/24025047'],
};

export async function build(ctx) {
  const K = new Kit(ctx, deg(-12)); const M = ctx.M; const X = mats(M);
  const CON = boardMat(0xd8d6cf), SL = shingleMat(0x7a828a);
  const ZN = new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.45, metalness: 0.55 });
  const GL = new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.08, metalness: 0.4 });
  const FR = X.frameDark;
  const colliders = [];
  const u0 = -14.4, u1 = 14.8, v0 = -16.6, v1 = 16.3, TOP = 13.9, BASE_TOP = 4.3;
  const gm = K.gMin(u0, v0, u1, v1), base = gm - 1.2;
  const faces = { S: [[u0, v1], [u1, v1]], E: [[u1, v1], [u1, v0]], N: [[u1, v0], [u0, v0]], W: [[u0, v0], [u0, v1]] };
  for (const [f, [a, b]] of Object.entries(faces)) {
    const R = K.run(a, b); const L = R.L;
    // concrete base (exposed where the ground is low)
    const bops = (f === 'W' || f === 'S') ? [0.25, 0.55, 0.8].map((t) => ({ s0: L * t - 1.2, s1: L * t + 1.2, y0: 1.0, y1: 3.4, mull: 2, frame: FR, sill: false })) : [];
    openWall(K, R, CON, 0, L, base, BASE_TOP, bops, { depth: 0.5, rev: 0.3, frame: FR, sill: false });
    // slate upper body: reading-room ribbon (S, W), slot windows (N, E)
    const ops = [];
    if (f === 'S') ops.push({ s0: 9.0, s1: L - 1.2, y0: 8.4, y1: 10.8, noFill: true });
    if (f === 'W') ops.push({ s0: 1.2, s1: L - 9.5, y0: 8.4, y1: 10.8, noFill: true });
    const slots = f === 'N' ? [3, 6.5, 11, 17, 22, 26] : f === 'E' ? [3.5, 9, 14, 24, 29] : f === 'W' ? [4, 9, 16, 24, 29] : [4, 10];
    for (const s of slots) if (s < L - 1) ops.push({ s0: s - 0.35, s1: s + 0.35, y0: BASE_TOP + 0.9, y1: (f === 'S' || f === 'W') ? 7.6 : 12.4, mull: 0, frame: FR, sill: false });
    if (f === 'E') ops.push({ s0: L / 2 - 3.2, s1: L / 2 + 3.2, y0: K.g(u1 + 1, (v0 + v1) / 2) + 0.1, y1: BASE_TOP + 3.6, noFill: true, entrance: true });
    openWall(K, R, SL, 0, L, BASE_TOP, TOP + 0.9, ops, { depth: 0.5, rev: 0.32, frame: FR, sill: false });
    for (const o of ops.filter((x) => x.noFill)) {
      K.rbox(R, GL, o.s0, o.y0, -0.44, o.s1, o.y1, -0.42);
      const n = Math.round((o.s1 - o.s0) / 1.5); for (let i = 0; i <= n; i++) { const s = o.s0 + (o.s1 - o.s0) * i / n; K.rbox(R, FR, s - 0.04, o.y0, -0.42, s + 0.04, o.y1, -0.34); }
      if (o.entrance) { K.rbox(R, FR, o.s0, o.y0 + 2.6, -0.42, o.s1, o.y0 + 2.7, -0.32); const g = new THREE.BoxGeometry(o.s1 - o.s0 + 1.6, 0.25, 3.0); g.rotateX(-0.12); g.translate((o.s0 + o.s1) / 2, o.y1 + 0.4, 1.2); K.addRun(R, ZN, g); K.rbox(R, M.paving, o.s0 - 1, o.y0 - 0.4, 0, o.s1 + 1, o.y0, 3.5); }
      else K.rbox(R, CON, o.s0 - 0.2, o.y1, 0, o.s1 + 0.2, o.y1 + 0.35, 0.6); // deep concrete hood over the ribbon
    }
    // metal coping
    K.rbox(R, ZN, -0.1, TOP + 0.85, -0.55, L + 0.1, TOP + 1.0, 0.08);
    K.rbox(R, CON, -0.04, BASE_TOP - 0.15, 0, L + 0.04, BASE_TOP + 0.1, 0.15);
  }
  K.box(M.concreteDark, u0 + 0.5, base, v0 + 0.5, u1 - 0.5, TOP, v1 - 0.5);
  K.box(M.concreteDark, u0 + 0.3, TOP - 0.2, v0 + 0.3, u1 - 0.3, TOP, v1 - 0.3);
  // canted glazed prow cantilevering from the south-west corner
  {
    const sk = new THREE.Group();
    const pu0 = u0 - 2.4, pu1 = u0 + 7.5, pv0 = v1 - 7.5, pv1 = v1 + 2.2, y0 = 7.6, y1 = 12.4;
    const g = new THREE.BoxGeometry(pu1 - pu0, y1 - y0, pv1 - pv0); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); if (yy > 0) { p.setX(i, p.getX(i) - 0.8); p.setZ(i, p.getZ(i) + 0.6); } }
    g.translate((pu0 + pu1) / 2, (y0 + y1) / 2, (pv0 + pv1) / 2); g.computeVertexNormals(); K.add(GL, g, { uvMode: 'keep' });
    for (let k = 0; k <= 6; k++) { const t = k / 6; K.box(FR, pu0 + (pu1 - pu0) * t - 0.05 - 0.4, y0, pv1 + 0.25, pu0 + (pu1 - pu0) * t + 0.05 - 0.4, y1, pv1 + 0.4, { detail: true }); }
    K.box(ZN, pu0 - 1.0, y1, pv0, pu1, y1 + 0.45, pv1 + 0.9);
    K.box(ZN, pu0 - 0.2, y0 - 0.4, pv0, pu1, y0, pv1 + 0.2);
  }
  // raised zinc clerestory monitor on the roof (sloped planes)
  {
    const mu0 = 0.5, mu1 = 5.0, mv0 = -6.0, mv1 = 10.0, y0 = TOP;
    const g = new THREE.BufferGeometry(); const A = [mu0, y0, mv0], B = [mu1, y0, mv0], C = [mu1, y0 + 2.4, mv0], D = [mu0, y0 + 1.6, mv0], E = [mu0, y0, mv1], F = [mu1, y0, mv1], G = [mu1, y0 + 2.4, mv1], H = [mu0, y0 + 1.6, mv1];
    const quads = [[D, C, G, H], [A, D, H, E], [B, F, G, C], [A, B, C, D], [E, H, G, F]]; const pos = [];
    for (const q of quads) pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); K.add(ZN, g);
    K.box(GL, mu1 - 0.05, y0 + 0.3, mv0 + 0.4, mu1 + 0.02, y0 + 2.1, mv1 - 0.4);
  }
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], base, TOP + 1));
  lamp(K, u1 + 5, K.g(u1 + 5, 6), 6, 3.8);
  const object3d = K.finish();
  object3d.name = 'hargrove-music-library';
  return { object3d, colliders };
}
