// Bancroft Parking Structure (UC Berkeley, 2641 Bancroft Way at Bowditch St; WRNS Studio, opened 2 September 2026).
// It replaced the Hearst tennis courts and the old garage beneath them, so the 2021 LiDAR (a ~3 m court deck) predates
// it: massing here follows the new design (OSM 8 levels, ~660 stalls): a recessed glazed ground storey, six precast
// parking decks behind a continuous screen of warm terracotta/wood-tone vertical fins with slab-edge bands, a round
// corten stair drum at the north-west corner, corten canopies along Bancroft Way and one continuous solar canopy over the roof deck.
import * as THREE from 'three';
import { GarageKit, matColor, plainMat } from './lib/b06p-garage.js';

export const info = {
  id: 'bancroft-parking-structure',
  name: 'Bancroft Parking Structure',
  subtitle: 'WRNS Studio · 2026',
  blurb: 'A roughly 660-space UC Berkeley parking structure on Bancroft Way, opened in September 2026 on the site of the former Hearst tennis courts and garage.',
  replaces: ['w/24025044'],
};

export async function build(ctx) {
  const K = new GarageKit(ctx, -9.25, 2641); const M = ctx.M, G = K.G;
  const pre = plainMat(0xd9d5cc), fin = plainMat(0xc4a888, { roughness: 0.8 }), band = plainMat(0xa89a88), trim = plainMat(0xa89a88);
  const corten = matColor(M.concrete, 0x96502c, { roughness: 0.85 }), pv = new THREE.MeshStandardMaterial({ color: 0x3b3f7a, roughness: 0.3, metalness: 0.3 }), pvLine = plainMat(0x1c2450), bronzeTop = plainMat(0x5a4e44), mesh = G.chain;
  const TOP = 20.6, LEV = [1.0, 4.6, 7.8, 11.0, 14.2, 17.4, TOP];
  const u0 = -25.0, u1 = 25.0, v0 = -35.58, v1 = 35.58;
  const P = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
  const runs = [];
  const fac = (a, b, opt = {}) => { const R = K.run(a, b); const f = K.facade(R, { levels: LEV, top: TOP, bay: 8.4, colW: 0.6, guard: 1.1, wallMat: trim, colMat: trim, screen: { type: 'fins', mat: fin, band, pitch: 0.48, depth: 0.4, w: 0.12, major: 9.0, bandRecessed: true, y0: LEV[1] - 0.6, over: 1.6, cap: band }, ...opt }); runs.push({ R, ...f }); return { R, ...f }; };
  const S = fac([u0, v1], [u1, v1], { ent: [{ s0: 38, s1: 46.5, level: 0 }] });
  const E = fac([u1, v1], [u1, v0]);
  const N = fac([u1, v0], [u0, v0], { solid: [[50 - 7.2, 50]] });
  const W = fac([u0, v0], [u0, v1], { solid: [[0, 7.2]] });
  K.decks(P, LEV, { core: 12, runs, skipTop: true, cars: 0.62, depth: 12 });
  K.prism(G.deck, P.map(([u, v]) => [u - Math.sign(u) * 0.36, v - Math.sign(v) * 0.36]), TOP - 0.3, TOP);
  // recessed glazed lobby in the ground storey at the south-west corner (Bancroft Way and Bowditch)
  { const R = K.run([u0 + 0.8, v1 - 2.0], [u0 + 17, v1 - 2.0]); K.rbox(R, M.glassLight, 0.3, LEV[0], -0.05, 16, LEV[1] - 0.6, 0.0); for (let s = 0.3; s <= 16.01; s += 1.95) K.rbox(R, M.iron, s - 0.04, LEV[0], 0, s + 0.04, LEV[1] - 0.6, 0.06, { detail: true }); }
  // corten canopies along Bancroft Way: a short one over the lobby, a long one by the car entrance
  for (const [a, b] of [[1.0, 13.0], [27.0, 48.0]]) { const R = S.R; K.rbox(R, corten, a, 3.9, 0.2, b, 4.9, 2.6); K.rbox(R, corten, a, 3.75, 0.2, b, 3.9, 2.6); }
  for (const R of [S.R, W.R]) K.rbox(R, plainMat(0x3a3a3a), 0.5, LEV[0], -2.2, R.L - 0.5, LEV[1] - 0.7, -2.0);
  // corten panels glinting behind the fins at the corners
  K.sign(S.R, 37.5, 4.4, 2.62, 'BANCROFT PARKING', { w: 9.0, h: 0.95, bg: '#8e3f1f', fg: '#f2ead8', P: false });
  K.sign(S.R, 7.0, 4.4, 2.62, 'LOBBY', { w: 3.2, h: 0.95, bg: '#8e3f1f', fg: '#f2ead8', P: false });
  K.sign(S.R, 42.2, 3.3, 0.5, 'ENTRANCE', { w: 2.6, h: 0.6, P: true });
  // round corten stair drum at the north-west corner: a hollow ring rising ~2 m above the solar canopy
  const cu = u0 + 3.0, cv = v0 + 3.0, CY = TOP + 2.6;
  { const og = new THREE.CylinderGeometry(3.5, 3.5, CY + 2.2 + 1, 36, 1, true); og.translate(cu, (CY + 2.2 - 1) / 2, cv); K.add(corten, og);
    const ig = new THREE.CylinderGeometry(3.2, 3.2, 3.0, 36, 1, true); ig.scale(-1, 1, 1); ig.translate(cu, CY + 2.2 - 1.5, cv); K.add(corten, ig);
    const rg = new THREE.RingGeometry(3.2, 3.5, 36); rg.rotateX(-Math.PI / 2); rg.translate(cu, CY + 2.2, cv); K.add(corten, rg, { uvMode: 'keep' });
    K.cyl(G.interior, cu, CY + 0.6, cv, 3.2, 3.2, 0.1, 36); }
  // one continuous solar canopy over the deck (overhanging the façades) with a central void lined by a mesh screen
  { const ov = 0.8, h0 = CY; const vu0 = -7, vu1 = 7, vv0 = -16, vv1 = 22;
    const outer = [[u0 - ov, v1 + ov], [u1 + ov, v1 + ov], [u1 + ov, v0 - ov], [u0 - ov, v0 - ov]];
    const circ = []; for (let k = 0; k < 24; k++) { const a = -k / 24 * Math.PI * 2; circ.push([cu + Math.cos(a) * 3.55, cv + Math.sin(a) * 3.55]); }
    for (let v = v0 - ov + 2.0; v < v1 + ov - 1.9; v += 4.0) { for (const [a2, b2] of [[u0 - ov, vu0 - 0.4], [vu1 + 0.4, u1 + ov]]) { if (v + 1.9 > vv0 && v - 1.9 < vv1) { /* beside the open screened court */ } else if (a2 > -1) continue; const A = (v + 1.9 > vv0 && v - 1.9 < vv1) ? a2 : u0 - ov, B = (v + 1.9 > vv0 && v - 1.9 < vv1) ? b2 : u1 + ov; const lo = Math.max(A, a2 < -1 ? A : A); const near = Math.hypot(cu - Math.max(A, Math.min(cu, B)), cv - v) < 4.0; const A2 = near && A < cu + 4 ? cu + 3.8 : A; if (B - A2 < 1) continue; const g = new THREE.BoxGeometry(B - A2, 0.1, 3.7); g.rotateX(0.14); g.translate((A2 + B) / 2, h0 + 0.25, v); K.add(pv, g); } }
    K.box(G.steel, u0 - ov, h0 - 0.45, v0 - ov, u1 + ov, h0, v0 - ov + 0.3); K.box(G.steel, u0 - ov, h0 - 0.45, v1 + ov - 0.3, u1 + ov, h0, v1 + ov);
    // raised rooftop box above the PV: translucent grey mesh walls, dark bronze top
    const HB = CY + 1.6;
    for (const [a2, b2, c2, d2] of [[vu0, vv0, vu1, vv0], [vu1, vv0, vu1, vv1], [vu1, vv1, vu0, vv1], [vu0, vv1, vu0, vv0]]) { const R = K.run([a2, b2], [c2, d2]); K.rbox(R, mesh, 0, TOP, -0.02, R.L, HB, 0.02); for (let s2 = 0; s2 <= R.L; s2 += 1.5) K.rbox(R, G.steel, s2 - 0.04, TOP, -0.05, s2 + 0.04, HB, 0.05, { detail: true }); }
    for (let u = u0 + 4; u <= u1 - 3.9; u += 8.4) for (let v = v0 + 9; v <= v1 - 4; v += 9.0) { if (u > vu0 - 1 && u < vu1 + 1 && v > vv0 - 1 && v < vv1 + 1) continue; K.cyl(G.steel, u, TOP, v, 0.16, 0.16, h0 - TOP, 8); } }
  K.roofParking(P, TOP, { rows: 'u', margin: 1.3, occ: 0.5, poles: 1e9, keep: (u, v) => !(u < u0 + 9 && v < v0 + 9) });
  K.walkables.push(K.walkPoly(P.map(([u, v]) => [u - Math.sign(u) * 0.4, v - Math.sign(v) * 0.4]), TOP));
  K.perimeterColliders(P, -3, TOP + 1.1, {});
  K.colliders.push(K.colCyl(cu, cv, 3.5, -2, TOP + 6));
  { const [x, z] = K.xz(cu + 2.6, cv - 3.2); const [tx, tz] = K.xz(cu + 7, cv + 6); K.interactions.push({ id: 'bps-roof', pos: [x, K.g(cu + 2.6, cv - 3.2) + 1, z], radius: 3, label: 'Climb the corten stair to the roof deck', teleport: [tx, TOP + 0.1, tz] }); }
  const object3d = K.done('bancroft-parking-structure');
  return { object3d, colliders: K.colliders, walkables: K.walkables, interactions: K.interactions };
}
