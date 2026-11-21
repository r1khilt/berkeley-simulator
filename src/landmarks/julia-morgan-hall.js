// Julia Morgan Hall (Julia Morgan, 1911; originally Girton Hall, the senior women's hall on central campus, moved to the UC
// Botanical Garden in Strawberry Canyon). A compact, rustic First Bay Tradition hall: dark grey-brown stained redwood
// shingle walls on a low stone base, a light-grey shingled hip roof with moderate eaves and a small gablet, banks of tall
// small-paned casements in dark frames, a stocky red-brick chimney at the west end, and a recessed entry porch with a heavy
// timber post and knee braces between the two projecting end wings. Massing from the OSM footprint and the 2021 LiDAR
// (main hall eaves ~4.8 m, ridge ~7.2 m; wings ~3.8/5.4 m), frame 38°.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { rmats, gothRange } from './lib/reastb-kit.js';

export const info = {
  id: 'julia-morgan-hall',
  name: "Julia Morgan Hall",
  subtitle: 'Julia Morgan · 1911',
  blurb: "Designed by Julia Morgan in 1911 as Girton Hall, a gathering place for Berkeley’s women students, this redwood Arts and Crafts hall was moved from central campus to the UC Botanical Garden, where it is now Julia Morgan Hall.",
  replaces: ['w/36985262', 'way/36985262'],
};

export async function build(ctx) {
  const M = ctx.M; const R = rmats(M);
  const K = new Kit(ctx, THREE.MathUtils.degToRad(38));
  const W = R.jmShingle, RF = R.jmRoof, TR = R.jmTrim, SA = R.jmSash;
  const colliders = [], walkables = [];
  const col = (u0, v0, u1, v1, y1) => colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, y1));
  const common = { mat: W, trim: TR, sash: SA, plinth: M.graniteDark, hipped: true, hood: false, string: false, cornice: false, noTransom: true,
    panes: 2, mullW: 0.1, lightW: 0.55, winH: 1.75, topH: 1.75, fh: 3.6, depth: 0.3, core: true };
  // main hall (tall wall plane, banks of 4-5 casements) and the two projecting end wings
  const main = { u0: -6.4, u1: 7.5, v0: -5.3, v1: 3.7, eave: 4.8, ridge: 7.2 };
  const west = { u0: -11.0, u1: -4.2, v0: -3.7, v1: 5.3, eave: 3.8, ridge: 5.5 };
  const east = { u0: 5.7, u1: 11.0, v0: -3.4, v1: 5.5, eave: 3.8, ridge: 5.5 };
  gothRange(K, { ...common, ...main, ridge: 0, bay: 3.4, lights: (i) => (i % 2 ? 5 : 4) });
  gothRange(K, { ...common, ...west, ridge: 0, bay: 2.6, lights: () => 3, lightW: 0.42 });
  gothRange(K, { ...common, ...east, ridge: 0, bay: 2.6, lights: () => 3, lightW: 0.42, skip: (f, s) => f === 'W' && s > 6.0 });
  // shingled hip roofs, moderate eaves with thin dark fascias
  for (const b of [main, west, east]) {
    const ov = 0.95, span = Math.min(b.u1 - b.u0, b.v1 - b.v0) / 2 + ov;
    K.hip(RF, b.u0 - ov, b.v0 - ov, b.u1 + ov, b.v1 + ov, b.eave - 0.12, (b.ridge - b.eave) / span);
    for (const [a, c] of [[[b.u0 - ov, b.v1 + ov], [b.u1 + ov, b.v1 + ov]], [[b.u1 + ov, b.v1 + ov], [b.u1 + ov, b.v0 - ov]], [[b.u1 + ov, b.v0 - ov], [b.u0 - ov, b.v0 - ov]], [[b.u0 - ov, b.v0 - ov], [b.u0 - ov, b.v1 + ov]]]) {
      const Rr = K.run(a, c); K.rbox(Rr, TR, 0, b.eave - 0.3, -0.02, Rr.L, b.eave - 0.12, 0.03);
    }
    K.box(M.woodDark, b.u0 - 0.9, b.eave - 0.16, b.v0 - 0.9, b.u1 + 0.9, b.eave - 0.12, b.v1 + 0.9); // soffit
    col(b.u0, b.v0, b.u1, b.v1, b.ridge + 0.5);
  }
  // small gablet at the west end of the main ridge
  { const yR = 7.2, u = -2.0; K.gable(RF, u - 0.9, -1.9, u + 0.2, -0.1, yR - 0.55, 0.65, 'v', { overhang: 0.1, wallMat: W }); }
  // stocky red-brick chimney at the west end with a corbelled cap
  { const u = -10.4, v = 0.8, g = K.g(u, v);
    K.box(M.brick, u - 0.6, g - 0.5, v - 0.35, u + 0.6, 6.6, v + 0.35);
    K.box(M.brick, u - 0.68, 6.6, v - 0.43, u + 0.68, 6.75, v + 0.43); K.box(M.brick, u - 0.74, 6.75, v - 0.49, u + 0.74, 6.9, v + 0.49);
    K.box(M.concreteDark, u - 0.45, 6.9, v - 0.22, u + 0.45, 6.95, v + 0.22); }
  // recessed entry porch between the main hall and the east wing: stone terrace, shed roof on a heavy timber post
  { const u0 = 1.2, u1 = 5.7, v0 = 3.7, v1 = 5.6; const g = K.gMin(u0, v0, u1, v1 + 1.5); const yT = Math.max(g + 0.25, K.g(3.5, 3.9) + 0.05);
    K.box(M.graniteDark, u0 - 0.6, g - 0.8, v0, u1, yT, v1 + 0.9);
    walkables.push(K.walkPoly([[u0 - 0.6, v0], [u1, v0], [u1, v1 + 0.9], [u0 - 0.6, v1 + 0.9]], yT));
    const Rs = K.run([u0, v0], [u1, v0]); // main hall south wall: double doors in the recess
    const o = { s0: 1.5, s1: 3.2, y0: yT, y1: yT + 2.4, doorTop: yT + 2.4, sill: false };
    K.box(M.woodDark, u0 + o.s0, yT, v0 - 0.05, u0 + o.s1, yT + 2.4, v0 + 0.06);
    K.box(TR, u0 + o.s0 - 0.12, yT, v0 - 0.02, u0 + o.s0, yT + 2.55, v0 + 0.1); K.box(TR, u0 + o.s1, yT, v0 - 0.02, u0 + o.s1 + 0.12, yT + 2.55, v0 + 0.1);
    K.box(TR, u0 + o.s0 - 0.12, yT + 2.4, v0 - 0.02, u0 + o.s1 + 0.12, yT + 2.55, v0 + 0.1);
    K.box(TR, u0 + (o.s0 + o.s1) / 2 - 0.02, yT, v0 + 0.06, u0 + (o.s0 + o.s1) / 2 + 0.02, yT + 2.4, v0 + 0.09);
    void Rs;
    // porch roof + timber post with knee braces
    const pu = u0 + 0.2, pv = v1 - 0.1, yE = 3.3;
    K.box(R.timber, pu - 0.13, yT, pv - 0.13, pu + 0.13, yE, pv + 0.13);
    for (const [du, dv] of [[1, 0], [0, -1]]) { const g2 = new THREE.BoxGeometry(0.12, 1.1, 0.12); g2.rotateZ(du ? -0.75 : 0); g2.rotateX(dv ? -0.75 : 0); g2.translate(pu + du * 0.4, yE - 0.4, pv + dv * 0.4); K.add(R.timber, g2); }
    K.box(R.timber, u0 - 0.2, yE - 0.05, pv - 0.15, u1, yE + 0.22, pv + 0.15);
    const sr = new THREE.BufferGeometry(); const yHi = 4.4;
    sr.setAttribute('position', new THREE.Float32BufferAttribute([u0 - 0.4, yE + 0.22, v1 + 0.4, u1, yE + 0.22, v1 + 0.4, u1, yHi, v0, u0 - 0.4, yE + 0.22, v1 + 0.4, u1, yHi, v0, u0 - 0.4, yHi, v0], 3));
    sr.computeVertexNormals(); K.add(RF, sr, { uvMode: 'roof' });
    colliders.push({ type: 'cyl', ...(() => { const [x, z] = K.xz(pu, pv); return { x, z }; })(), r: 0.2, y0: yT, y1: yE });
  }
  const object3d = K.finish();
  object3d.name = 'julia-morgan-hall';
  return { object3d, colliders, walkables };
}
