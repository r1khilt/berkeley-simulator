// Jacobs Hall (2015; LMS Architects): the Jacobs Institute for Design Innovation, a maker space on Ridge Road / Le Roy.
// Shifted volumes clad in large flush silver-grey panels: a solid block cantilevering ~2 m over a fully glazed ground floor,
// a recessed, almost fully glazed centre bay, a smaller projecting panel box at the other end, horizontal sunshades, and a deep
// flat roof with a warm timber soffit carried on a row of slender white steel outriggers that reach ~4.5 m out to a continuous
// edge tube and run past the end of the building. LiDAR roof ~14-16 m above the lowest grade.
import * as THREE from 'three';
import { Kit, mats, massBlock, rect, gAt, curtain, storefront } from './lib/b03-kit.js';
import { panelMat, bakeMat, pathEntrances, planting, bikes, rnMats } from './lib/rn-kit.js';

export const info = {
  id: 'jacobs-hall',
  name: 'Jacobs Hall',
  subtitle: 'Jacobs Institute for Design Innovation · 2015',
  blurb: 'A 24,000-square-foot maker space for design and engineering students, with studios, a fabrication shop, laser cutters and 3D printers. It opened in 2015 on the north side next to Soda Hall.',
  replaces: ['w/440146220'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-9.4);
  const K = new Kit(ctx, ANG); const M = ctx.M; const B = mats(ctx);
  const PAN = panelMat('jacobsPanel', { pw: 1.2, ph: 3.6, span: 7.2, base: 0xa9b6c3, joint: 0x58616b, jw: 0.02, vary: 0.035, grain: 0.01, rough: 0.35, metal: 0.4 });
  const GL = M.windowNight, FR = new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.35, metalness: 0.7 });
  const PV = bakeMat('pvCells', (x, y) => { const fu = (x * 2) % 1, fv = (y * 1.25) % 1; const fr = fu < 0.03 || fv < 0.025; const cu = (x * 12) % 1, cv = (y * 10) % 1; const cell = cu < 0.04 || cv < 0.04; return fr ? [175, 180, 185, 0.7, 0.3] : cell ? [60, 72, 90, 0.45, 0.25] : [36, 46, 62, 0.4, 0.18]; }, { span: 2, rough: 0.2, metal: 0.4, normal: 1.5 });
  const WHITE = new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.45, metalness: 0.3 });
  const SOFFIT = new THREE.MeshStandardMaterial({ color: 0xd8dbde, roughness: 0.5, metalness: 0.3 });
  const colliders = [], walkables = [];
  const u0 = -18.8, u1 = 18.8, v0 = -8.5, v1 = 9.25, ROOF = 15.4;
  const L1 = 4.4, L2 = 8.2, L3 = 11.9, TOPW = ROOF - 0.4;
  // glazed ground floor across the whole bar (recessed 2 m under the cantilevers)
  massBlock(K, { poly: rect(u0 + 2.0, v0 + 1.2, u1 - 1.2, v1 - 2.0), levels: [-1.0, L1], top: L1, wall: PAN, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.0, tran: 2.4 }, core: true, roof: M.concreteDark });
  // right (east) solid block: levels 2-4, nearly windowless, cantilevering over the glass
  const blkE = massBlock(K, { poly: rect(3.5, v0, u1, v1), levels: [L1 - 0.4, L2, L3, TOPW], y0: L1 - 0.4, top: TOPW, wall: PAN, style: 'punched', depth: 0.3, rev: 0.22, glass: GL, frame: FR,
    win: { w: 1.15, h: 3.0, sill: 0.25, bay: 3.4, mull: 0 }, winAt: (k) => ({ off: [0.0, 1.2, -1.0][k % 3], w: [1.15, 0.9, 1.4][k % 3] }), roof: B.roofMembrane });
  // recessed, almost fully glazed centre bay
  massBlock(K, { poly: rect(-10.5, v0 + 2.5, 3.5, v1 - 2.5), levels: [L1 - 0.4, L2, L3, TOPW], y0: L1 - 0.4, top: TOPW, wall: PAN, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.6, tran: 2.4 }, core: true, roof: B.roofMembrane });
  // horizontal sunshade blades over the centre glazing (both long sides)
  for (const vv of [v0 + 2.5, v1 - 2.5]) for (const y of [L2 - 0.6, L3 - 0.6, TOPW - 0.6]) { const d = vv < 0 ? -1 : 1; K.box(WHITE, -10.5, y, Math.min(vv, vv + d * 1.1), 3.5, y + 0.08, Math.max(vv, vv + d * 1.1)); }
  // left (west) panel box: levels 2-3, projecting, with glass below and a clerestory band above
  massBlock(K, { poly: rect(u0, v0 + 0.6, -10.5, v1 - 0.6), levels: [L1 - 0.4, L2, L3], y0: L1 - 0.4, top: L3, wall: PAN, style: 'punched', depth: 0.3, rev: 0.22, glass: GL, frame: FR, win: { w: 0.9, h: 2.9, sill: 0.35, bay: 3.0, mull: 0 }, winAt: (k) => ({ off: [0.6, -0.8][k % 2] }), roof: M.concreteDark });
  massBlock(K, { poly: rect(u0 + 0.8, v0 + 1.4, -10.5, v1 - 1.4), levels: [L3, TOPW], top: TOPW, wall: PAN, style: 'curtain', glass: GL, frame: FR, win: { mw: 1.5, spandrel: 0.3 }, core: true, roof: B.roofMembrane });
  // deep roof plate with timber soffit, and the white steel outriggers + edge tubes (4.5 m out on the long faces)
  const OV = 1.8, OUT = 4.5;
  K.prism(PAN, rect(u0 - OV, v0 - OV, u1 + OV, v1 + OV), ROOF - 0.4, ROOF);
  K.prism(SOFFIT, rect(u0 - OV + 0.05, v0 - OV + 0.05, u1 + OV - 0.05, v1 + OV - 0.05), ROOF - 0.46, ROOF - 0.4);
  for (const [vv, d] of [[v0, -1], [v1, 1]]) {
    const ext0 = u0 - 3.0, ext1 = u1 + (d < 0 ? 3.0 : 0.5);
    for (let u = ext0; u <= ext1 + 0.01; u += 3.0) {
      const g = new THREE.BufferGeometry(); // tapered arm: deep at the wall, shallow at the tip
      const w = 0.09, y1 = ROOF - 0.05, yr = ROOF - 0.9, yt = ROOF - 0.35, a = vv, b = vv + d * OUT;
      K.box(WHITE, u - w, yt, Math.min(a, b), u + w, y1, Math.max(a, b));
      K.obox(WHITE, u, (yr + yt) / 2 + 0.05, vv + d * OUT * 0.3, 0.1, 0.12, OUT * 0.62, 0, { detail: true });
    }
    const tube = new THREE.CylinderGeometry(0.13, 0.13, ext1 - ext0 + 0.4, 12); tube.rotateZ(Math.PI / 2); tube.translate((ext0 + ext1) / 2, ROOF - 0.2, vv + d * OUT); K.add(WHITE, tube);
  }
  // louvred trellis between the outriggers past the west end
  for (let v = v0 - OUT; v <= v1 + OUT; v += 0.45) K.box(WHITE, u0 - 3.0, ROOF - 0.3, v - 0.035, u0 - OV, ROOF - 0.05, v + 0.035, { detail: true });
  // sage-tile plaza wall with maroon base band and pale cap along the north edge
  { const gy = K.g(0, v0 - 3); const tile = new THREE.MeshStandardMaterial({ color: 0x8fa58c, roughness: 0.4 });
    K.box(tile, u0 + 2, gy - 0.5, v0 - 3.4, u1 - 2, gy + 0.85, v0 - 3.0); K.box(B.burgundy, u0 + 2, gy - 0.1, v0 - 3.42, u1 - 2, gy + 0.05, v0 - 2.98); K.box(M.marble, u0 + 1.9, gy + 0.85, v0 - 3.45, u1 - 1.9, gy + 1.0, v0 - 2.95);
    colliders.push(K.colPoly(rect(u0 + 2, v0 - 3.4, u1 - 2, v0 - 3.0), gy - 1, gy + 1.0)); }
  // dark solar array on the roof plate (the canopy carries PV)
  K.prism(PV, rect(u0 - OV + 0.6, v0 - OV + 0.6, u1 + OV - 0.6, v1 + OV - 0.6), ROOF, ROOF + 0.12);
  // ground floor: glazed lobby doors where the paths arrive, dark steel + timber trellis over the south entry, planter strip, bikes
  { const X = rnMats(M); const runsG = [K.run([u0 + 2.0, v1 - 2.0], [u1 - 1.2, v1 - 2.0]), K.run([u1 - 1.2, v1 - 2.0], [u1 - 1.2, v0 + 1.2]), K.run([u1 - 1.2, v0 + 1.2], [u0 + 2.0, v0 + 1.2]), K.run([u0 + 2.0, v0 + 1.2], [u0 + 2.0, v1 - 2.0])];
    for (const e of pathEntrances(K, ctx, runsG, { maxDist: 5 }).slice(0, 2)) { const g = Math.max(gAt(K, e.R, e.s, 1.2), -1.0); const s = Math.min(e.R.L - 2.5, Math.max(2.5, e.s));
      for (const ds of [-0.95, 0.95]) K.rbox(e.R, X.steel, s + ds - 0.4, g + 1.0, 0.0, s + ds + 0.4, g + 1.05, 0.06, { detail: true });
      K.rbox(e.R, FR, s - 1.95, g, -0.13, s + 1.95, g + 0.1, 0.02); K.rbox(e.R, FR, s - 0.05, g, -0.13, s + 0.05, g + 2.4, 0.02, { detail: true }); }
    const STEELD = new THREE.MeshStandardMaterial({ color: 0x3a3f3a, roughness: 0.5, metalness: 0.5 });
    const RS = K.run([u0, v1], [u1, v1]); const tA = 4.0, tB = 14.0; const gT = gAt(K, RS, (tA + tB) / 2, 2.0);
    for (let s = tA; s <= tB + 0.01; s += 2.5) { const g = gAt(K, RS, s, 3.0); K.rbox(RS, STEELD, s - 0.08, g - 0.3, 2.85, s + 0.08, gT + 4.0, 3.0); colliders.push(K.colCyl(...RS.at(s, 2.92), 0.12, g - 0.5, gT + 4)); }
    K.rbox(RS, STEELD, tA - 0.2, gT + 3.85, 0.0, tB + 0.2, gT + 4.05, 3.1);
    for (let s = tA; s <= tB; s += 0.5) K.rbox(RS, M.wood, s - 0.05, gT + 4.05, 0.0, s + 0.05, gT + 4.25, 3.1, { detail: true });
    planting(K, RS, 15.5, RS.L - 1.0, { d0: 0.3, depth: 1.2, h: 0.7, seed: 41 });
    colliders.push(...bikes(K, RS, 22.0, 3.6, 6, 3)); }
  colliders.push(K.colPoly(rect(u0, v0, u1, v1), -2, ROOF + 0.2));
  const object3d = K.finish(); object3d.name = 'jacobs-hall';
  return { object3d, colliders: colliders.filter(Boolean), walkables };
}
