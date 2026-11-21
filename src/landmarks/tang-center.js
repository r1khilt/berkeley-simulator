// University Health Services Tang Center, Bancroft Way. Massing from the 2021 LiDAR: a long three-storey bar
// (~80 x 27 m, parapet ~11 m) with a three-storey west wing, linear roof monitors and a raised four-storey glazed bay.
// Façades from photos: red-orange brick piers framing bays of teal-framed green-blue curtain glazing with teal spandrel
// bands, under deep thin flat canopy roofs with teal fascias carried on diagonal steel struts.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, curtain, inset, std } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'tang-center',
  name: 'Tang Center',
  subtitle: 'University Health Services',
  blurb: 'The Tang Center houses University Health Services: the campus clinic, pharmacy, and counseling and psychological services for UC Berkeley students.',
  replaces: ['w/24025444'],
};

export async function build(ctx) {
  const ANG = -0.164; const K = new Kit(ctx, ANG); const M = ctx.M;
  const brick = M.brick.clone(); brick.color.set(0xffc2a2); brick.name = 'tangBrick';
  const roofM = std(0x84cbb9, 'tangRoof', { rough: 0.45, metal: 0.35 });
  const frameG = std(0x2f5d50, 'tangFrame', { rough: 0.45, metal: 0.4 }); const spand = std(0x5fa596, 'tangSpandrel', { rough: 0.5, metal: 0.3 });
  const teal = std(0x3e8f86, 'tangTeal', { rough: 0.45, metal: 0.4 });
  const soffit = std(0x9cc3bc, 'tangSoffit', { rough: 0.6 });
  const glass = nightGlow(std(0x8fc1bc, 'tangGlass', { rough: 0.08, metal: 0.6, envMapIntensity: 1.5, emissive: 0xffd9a0, emissiveIntensity: 0.9 }), 1.0);
  const colliders = [];
  const MAIN = [[-7.8, -38.2], [19.6, -38.2], [19.5, 42.5], [-7.9, 42.4]];
  const WEST = [[-35.5, -18.7], [-7.8, -18.7], [-7.8, 2.9], [-35.5, 2.9]];
  const yTop = 11.9;

  function volume(poly, skipInner, ridgeAlongV) {
    const g0 = Math.min(...poly.map(([u, v]) => K.g(u, v))) - 1;
    K.prism(M.concreteDark, inset(poly, 0.7), g0, yTop - 0.2);
    for (const { R } of polyRuns(K, poly)) {
      if (skipInner && skipInner(R)) continue;
      const gA = Math.min(K.g(...R.at(0.5, 1.5)), K.g(...R.at(R.L - 0.5, 1.5)));
      const fl = [gA + 4.1, gA + 7.7];
      // broad brick panels (~4.5 m) alternating with recessed glazed bays (~7 m)
      const bp = 4.5, gb = 7.0; const n = Math.max(1, Math.round((R.L - bp) / (bp + gb))); const gw = (R.L - bp * (n + 1)) / n;
      for (let i = 0; i < n; i++) {
        const a = bp + i * (bp + gw), b = a + gw;
        curtain(K, R, a, b, g0, yTop, fl, { glass, mull: 1.6, mullMat: frameG, mullD: 0.12, band: 0.4, bandMat: spand, bandD: 0.05, recess: 0.4 });
        K.rbox(R, frameG, a, yTop - 0.5, -0.4, b, yTop, -0.2);
        for (const x of [a, b]) K.rbox(R, frameG, x - 0.08, g0, -0.4, x + 0.08, yTop, 0.05);
      }
      for (let i = 0; i <= n; i++) { const a = i * (bp + gw); K.rbox(R, brick, a, g0, -0.3, a + bp, yTop + 0.2, 0.15); K.rbox(R, frameG, a - 0.01, yTop - 0.05, 0.15, a + bp + 0.01, yTop + 0.2, 0.2, { detail: true });
        // prominent diagonal outrigger struts from the pier heads to the eave
        for (const x of [a + 0.4, a + bp - 0.4]) { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1.9, 1.9).normalize()); const gg = new THREE.BoxGeometry(0.26, 0.26, Math.hypot(1.9, 1.9)); gg.applyQuaternion(q); gg.translate(x, yTop - 0.75, 0.15 + 0.95); K.addRun(R, frameG, gg); } }
    }
    // shallow hipped standing-seam verdigris roof with ~2 m overhang and a thin teal fascia
    const pts = poly.map((p) => p); const us = pts.map((p) => p[0]), vs = pts.map((p) => p[1]);
    const u0 = Math.min(...us) - 2.2, u1 = Math.max(...us) + 2.2, v0 = Math.min(...vs) - 2.2, v1 = Math.max(...vs) + 2.2;
    K.box(teal, u0, yTop + 0.2, v0, u1, yTop + 0.45, v1);
    K.hip(roofM, u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, yTop + 0.45, 0.1, { yTop: yTop + 1.4 });
    K.box(soffit, u0 + 0.05, yTop + 0.12, v0 + 0.05, u1 - 0.05, yTop + 0.2, v1 - 0.05);
    colliders.push({ type: 'poly', pts: K.polyXZ(poly), y0: g0, y1: yTop + 1 });
  }
  volume(MAIN, (R) => false);
  volume(WEST, (R) => R.n[0] > 0.8);

  // glazed clerestory lanterns on the ridges, each with its own small hipped verdigris roof
  const lantern = (u0, v0, u1, v1, y0, h) => {
    K.box(glass, u0, y0, v0, u1, y0 + h, v1);
    const along = (u1 - u0) > (v1 - v0); const n = Math.round((along ? u1 - u0 : v1 - v0) / 1.6);
    for (let i = 0; i <= n; i++) { const t = i / n; if (along) K.box(frameG, u0 + (u1 - u0) * t - 0.06, y0, v0 - 0.03, u0 + (u1 - u0) * t + 0.06, y0 + h, v1 + 0.03); else K.box(frameG, u0 - 0.03, y0, v0 + (v1 - v0) * t - 0.06, u1 + 0.03, y0 + h, v0 + (v1 - v0) * t + 0.06); }
    K.box(teal, u0 - 0.8, y0 + h, v0 - 0.8, u1 + 0.8, y0 + h + 0.25, v1 + 0.8);
    K.hip(roofM, u0 - 0.75, v0 - 0.75, u1 + 0.75, v1 + 0.75, y0 + h + 0.25, 0.25, {});
  };
  lantern(3.0, -30.0, 9.0, 36.0, yTop + 1.5, 2.2);
  lantern(-31.0, -11.6, -11.0, -6.0, yTop + 1.5, 1.8);
  lantern(1.2, -11.5, 9.4, -3.2, yTop + 1.5, 3.4);
  // main entrance on the north (Bancroft) end: recessed glass doors under a projecting teal canopy
  { const R = K.run([19.6, -38.2], [-7.8, -38.2]); const s = R.L / 2; const gA = K.g(5.9, -39.5);
    K.rbox(R, teal, s - 4.5, gA + 3.4, 0, s + 4.5, gA + 3.7, 3.2); K.rbox(R, soffit, s - 4.4, gA + 3.3, 0, s + 4.4, gA + 3.4, 3.1);
    for (const x of [s - 4.2, s + 4.2]) { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1.4, 2.8).normalize()); const gg = new THREE.BoxGeometry(0.1, 0.1, Math.hypot(1.4, 2.8)); gg.applyQuaternion(q); gg.translate(x, gA + 2.7, 1.5); K.addRun(R, teal, gg); } }

  const object3d = K.finish(); object3d.name = 'tang-center';
  return { object3d, colliders };
}
