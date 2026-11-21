// Earl Warren Hall, 2195 Hearst Avenue (1955; seismically renovated 2003). Long three-storey block facing Hearst
// Avenue: a two-storey tan stone base with punched vertical windows, a recessed light-panel third floor with a ribbon of
// paired windows and thin sunshade fins, a taller panel-clad central bar set back above, a faceted round corner tower at
// the Oxford Street end crowned by a thin circular canopy disc, and a double-height glazed entrance in the recessed
// centre of the street front. Massing from the 2021 LiDAR (wings ~13.5 m, central bar ~17.5 m).
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { concreteMat, plainMat, glazing, block } from './lib/b06c-kit.js';

export const info = {
  id: 'earl-warren-hall',
  name: 'Earl Warren Hall',
  subtitle: '2195 Hearst Avenue · 1955',
  blurb: 'Named for Earl Warren, Berkeley alumnus, California governor and Chief Justice of the United States. Completed in 1955 and later renovated, it houses campus research computing and the university data center.',
  replaces: ['w/31871980'],
};

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-6.8);
  const K = new Kit(ctx, ANG); const M = ctx.M;
  const ST = new THREE.MeshStandardMaterial({ color: 0xe0bf8f, roughness: 0.9, map: M.ashlar.map, normalMap: M.ashlar.normalMap, roughnessMap: M.ashlar.roughnessMap });
  ST.normalScale = new THREE.Vector2(0.7, 0.7); ST.name = 'b06c-ewh-stone';
  const PN = concreteMat(0xf2efe8, 'precast', { rough: 0.6, normal: 0.3 }); // light metal panels
  const AL = plainMat(0x8c9298, { roughness: 0.4, metalness: 0.6 });        // aluminium frames / fins / canopies
  const GL = M.windowNight;
  const colliders = [], walkables = [], interactions = [];
  const gRef = K.g(0, 0); const F1 = 4.3, F2 = 4.3, F3 = 4.2; // storey heights
  const yS = gRef + F1 + F2, yW = yS + F3 + 0.5;              // top of stone base, wing parapet (~13.5 m)
  const punched = (f, R, tag, y0, y1) => { if (R.L < 3) return []; const n = Math.max(1, Math.round(R.L / 3.3)); const o = []; for (let k = 0; k < n; k++) { const s = R.L * (k + 0.5) / n; for (const yy of [gRef + 1.0, gRef + F1 + 0.9]) o.push({ s0: s - 0.75, s1: s + 0.75, y0: yy, y1: yy + 2.3, pitch: 0.75, tr: [yy + 1.7] }); } return o; };
  const ribbon = (f, R) => { if (R.L < 3) return []; const n = Math.max(1, Math.round(R.L / 3.3)); const o = []; for (let k = 0; k < n; k++) { const s0 = R.L * k / n, s1 = R.L * (k + 1) / n; o.push({ s0: s0 + 0.35, s1: s1 - 0.35, y0: yS + 0.8, y1: yS + F3 - 0.4, pitch: (s1 - s0 - 0.7) / 2 }); } return o; };
  // [u0, v0, u1, v1]
  const W = [[-32.0, -16.6, -4.0, 16.3], [-4.0, -14.0, 12.0, 11.2], [12.0, -14.0, 33.5, 13.8], [22.0, -16.9, 32.0, -14.0]];
  for (const [u0, v0, u1, v1] of W) {
    const gm = K.gMin(u0, v0, u1, v1, 4);
    block(K, ST, u0, v0, u1, v1, gm - 1.5, yS, { ops: punched, coping: 0, depth: 0.45, fill: (R, q) => glazing(K, R, q.s0, q.s1, q.y0, q.y1, { d: -0.3, pitch: q.pitch, transoms: q.tr, frame: AL, glass: GL }) });
    K.box(ST, u0 - 0.12, yS - 0.25, v0 - 0.12, u1 + 0.12, yS, v1 + 0.12); // stone string course
    const runs = block(K, PN, u0 + 0.5, v0 + 0.5, u1 - 0.5, v1 - 0.5, yS, yW, { ops: ribbon, depth: 0.35, copingMat: AL, fill: (R, q) => glazing(K, R, q.s0, q.s1, q.y0, q.y1, { d: -0.22, pitch: q.pitch, frame: AL, glass: GL }) });
    // thin projecting sunshade fins + ledge on the third-floor ribbon
    for (const R of Object.values(runs)) { if (R.L < 3) continue; const n = Math.max(1, Math.round(R.L / 3.3)); for (let k = 0; k <= n; k++) { const s = R.L * k / n; K.rbox(R, AL, s - 0.05, yS + 0.6, 0, s + 0.05, yS + F3 - 0.2, 0.6, { detail: true }); } K.rbox(R, AL, 0, yS + F3 - 0.25, 0, R.L, yS + F3 - 0.12, 0.7); }
    K.box(AL, u0 + 0.3, yW, v0 + 0.3, u1 - 0.3, yW + 0.18, v1 - 0.3);
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], gm - 2, yW));
  }
  // taller panel-clad central bar, set back above the wings
  block(K, PN, -13.0, -11.0, 12.0, 4.0, yW, gRef + 17.6, { ops: (f, R) => (R.L > 6 ? [{ s0: 1.0, s1: R.L - 1.0, y0: yW + 0.8, y1: yW + 3.0, pitch: 1.65 }] : []), copingMat: AL, depth: 0.35, fill: (R, q) => glazing(K, R, q.s0, q.s1, q.y0, q.y1, { d: -0.22, pitch: q.pitch, frame: AL, glass: GL }) });
  // faceted round corner tower toward Oxford Street, crowned by a thin circular canopy disc
  {
    const cu = 29.8, cv = 10.0, r = 4.6, n = 10, yT = yW - 0.2;
    const g = K.g(cu, cv);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const R = K.run([cu + Math.cos(a1) * r, cv + Math.sin(a1) * r], [cu + Math.cos(a0) * r, cv + Math.sin(a0) * r]);
      const ops = [0, 1, 2].map((k) => ({ s0: 0.35, s1: R.L - 0.35, y0: g + 0.8 + k * 4.2, y1: g + 3.6 + k * 4.2 }));
      K.wall(R, k3(i) ? PN : ST, 0, R.L, g - 1.5, yT, ops, 0.4);
      for (const o of ops) glazing(K, R, o.s0, o.s1, o.y0, o.y1, { d: -0.28, pitch: 1.4, frame: AL, glass: GL });
    }
    K.cyl(M.concreteDark, cu, g - 1.5, cv, r - 0.3, r - 0.3, yT - g + 1.4, n);
    K.cyl(AL, cu, yT + 1.4, cv, 6.4, 6.4, 0.3, 32);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; K.cyl(AL, cu + Math.cos(a) * 3.6, yT, cv + Math.sin(a) * 3.6, 0.09, 0.09, 1.4, 8, { detail: true }); }
    colliders.push(K.colCyl(cu, cv, r, g - 2, yT));
  }
  function k3(i) { return false; }
  // double-height glazed entrance in the recessed centre of the street front, flat cantilevered metal canopy
  {
    const v = 11.2, s0 = 0.5, s1 = 8.5; const g = K.g(4.5, v + 2);
    const R = K.run([s0, v + 0.02], [s1, v + 0.02]);
    K.rbox(R, M.windowNight, 0, g + 0.02, -0.1, R.L, g + 7.6, 0.0);
    glazing(K, R, 0, R.L, g + 0.02, g + 7.6, { d: 0.05, pitch: 1.33, transoms: [g + 2.7, g + 5.0], frame: AL, glass: GL });
    K.rbox(R, AL, -1.0, g + 3.3, 0, R.L + 1.0, g + 3.55, 3.2);
    K.rbox(R, M.paving, -1.5, g - 0.3, 0, R.L + 1.5, g + 0.04, 4.5);
    const [ex, ez] = K.xz(4.5, v + 2.5); interactions.push({ id: 'ewh-entrance', pos: [ex, g + 1, ez], radius: 3, label: 'Earl Warren Hall' });
  }

  const object3d = K.finish();
  object3d.name = 'earl-warren-hall';
  return { object3d, colliders, walkables, interactions };
}
