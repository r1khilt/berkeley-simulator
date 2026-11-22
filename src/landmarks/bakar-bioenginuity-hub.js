// Bakar BioEnginuity Hub: Mario Ciampi's 1970 University Art Museum (with Richard Jorasch and Ronald Wagner), renovated
// in 2023 as a life-science incubator. Massing from the 2021 LiDAR, clipped from the fan-shaped OSM outline: windowless
// board-formed concrete boxes stepping up from a low west wing (~5 m) through the north galleries (~9-11 m) and the
// central block (~15 m) to the tall east block (~19 m), each oversailing a dark recessed glass base so the concrete seems to
// float; the new low black-framed glass pavilion with a thin oversailing roof on the garden side; folded concrete plaza wedges.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, inset, std } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';

export const info = {
  id: 'bakar-bioenginuity-hub',
  name: 'Bakar BioEnginuity Hub',
  subtitle: 'Mario Ciampi · 1970 · renovated 2023',
  blurb: "Built as the University Art Museum, Mario Ciampi's brutalist fan of cantilevered concrete galleries reopened in 2023 as the Bakar BioEnginuity Hub, a lab and incubator space for life-science startups.",
  replaces: ['w/24025033'],
};

function boardTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#bdbcb6'; g.fillRect(0, 0, 512, 512);
  let y = 0, k = 0; while (y < 512) { const h = 26 + ((k * 7) % 5) * 3; const v = 186 + ((k * 37) % 13) - 6; g.fillStyle = `rgb(${v},${v},${v - 5})`; g.fillRect(0, y, 512, h - 1); g.fillStyle = 'rgba(120,118,112,0.35)'; g.fillRect(0, y + h - 1, 512, 1);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,115,108,0.12)'; g.fillRect((i * 97 + k * 31) % 512, y + 3 + (i % 3) * 6, 40 + (i % 5) * 30, 1); } y += h; k++; }
  for (let x = 0; x < 512; x += 154) { g.fillStyle = 'rgba(90,88,84,0.5)'; g.fillRect(x, 0, 2, 512); }
  for (let x = 38; x < 512; x += 154) for (let yy = 77; yy < 512; yy += 154) { g.fillStyle = '#77736c'; g.beginPath(); g.arc(x, yy, 3, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(70,66,60,0.6)'; g.fillRect(0, 255, 512, 3);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Sutherland-Hodgman clip of polygon P by convex polygon C (both [x,z], C counter-clockwise in x,z with z down... any winding)
function clip(P, C) {
  let area = 0; for (let i = 0; i < C.length; i++) { const a = C[i], b = C[(i + 1) % C.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1; let out = P.slice();
  for (let i = 0; i < C.length && out.length; i++) {
    const a = C[i], b = C[(i + 1) % C.length]; const inside = (p) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) >= 0;
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) { const p = inp[j], q = inp[(j + 1) % inp.length]; const pi = inside(p), qi = inside(q);
      if (pi) out.push(p); if (pi !== qi) { const dx = q[0] - p[0], dz = q[1] - p[1]; const ex = b[0] - a[0], ez = b[1] - a[1]; const t = ((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / (dx * ez - dz * ex); out.push([p[0] + dx * t, p[1] + dz * t]); } }
  }
  return out.filter((p, i, arr) => i === 0 || Math.hypot(p[0] - arr[i - 1][0], p[1] - arr[i - 1][1]) > 0.05);
}

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M;
  const fp = ctx.footprints[0].outer.map(([x, z]) => [x, z]);
  const conc = new THREE.MeshStandardMaterial({ map: boardTex(), color: 0xd9d9d5, roughness: 0.9 }); // [r4-sweep-outer] cool raw-concrete grey (#a8a7a1 in photos); the warm tint read as beige stucco in-game // refine-south-west: weathered board-formed concrete, not near-white conc.name = 'bakarConcrete';
  const dark = std(0x1e1f22, 'bakarFrame', { rough: 0.45, metal: 0.4 });
  const pglass = new THREE.MeshStandardMaterial({ color: 0x9fb3b8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }); pglass.name = 'bakarPavilionGlass';
  const warm = nightGlow(std(0xe8b878, 'bakarInterior', { rough: 0.9, emissive: 0xe8b878, emissiveIntensity: 0.8 }), 1.0);
  const glass = nightGlow(std(0x2c3238, 'bakarGlass', { rough: 0.06, metal: 0.5, envMapIntensity: 1.4, emissive: 0xffd9a0, emissiveIntensity: 1.1 }), 1.0);
  const soffitD = std(0x3a3a3a, 'bakarSoffit', { rough: 0.8 });
  const rail = std(0x6f7174, 'bakarRail', { rough: 0.5, metal: 0.6 }); // [r4-sweep-outer] terrace guardrails
  const colliders = [];
  const BIG = 200;
  // volumes: [clip region (convex, x/z), top height (local y)]
  const VOL = [
    { C: [[-BIG, -BIG], [-28.5, -BIG], [-28.5, BIG], [-BIG, BIG]], top: 7.2, base: 0 },                 // low west wing
    // [r4-sweep-outer] Bancroft front: a ~6-9 m board-formed plinth wall with the galleries stepping back behind it (photo),
    // instead of one sheer 13 m box over a glass band
    { C: [[-28.5, -BIG], [0.5, -BIG], [0.5, -25.4], [-28.5, -25.4]], top: 8.6, base: 0, terrace: true },  // north plinth wall
    { C: [[-28.5, -25.4], [0.5, -25.4], [0.5, -14.5], [-28.5, -14.5]], top: 13.6, base: 4.2 },          // north galleries
    { C: [[0.5, -BIG], [26.5, -BIG], [26.5, -25.0], [0.5, -25.0]], top: 6.8, base: 0, terrace: true },    // north-east plinth wall
    { C: [[0.5, -25.0], [26.5, -25.0], [26.5, -16.8], [0.5, -16.8]], top: 10.6, base: 4.2 },            // north-east low gallery
    { C: [[-28.5, -14.5], [7.5, -14.5], [7.5, 24.5], [-28.5, 24.5]], top: 17.4, base: 5.8 },            // central block
    { C: [[7.5, -16.8], [BIG, -16.8], [BIG, 24.5], [7.5, 24.5]], top: 21.2, base: 5.5 },                // tall east block
    { C: [[-BIG, 24.5], [BIG, 24.5], [BIG, BIG], [-BIG, BIG]], top: 0, base: 0, pavilion: true },       // 2023 glass pavilion
  ];
  for (const V of VOL) {
    const P = clip(fp, V.C); if (P.length < 3) continue;
    const g0 = Math.min(...P.map(([x, z]) => K.g(x, z))); const gMax = Math.max(...P.map(([x, z]) => K.g(x, z)));
    if (V.pavilion) {
      // long low glass box with slim black mullions under a thin dark roof slab that oversails ~1.8 m
      const yT = gMax + 4.6; const Pi = inset(P, 0.4);
      K.prism(M.concreteDark, inset(P, 1.4), g0 - 1, yT - 0.4);
      for (const { R } of polyRuns(K, Pi)) { K.rbox(R, pglass, 0, g0 - 0.5, -0.06, R.L, yT - 0.35, 0); K.rbox(R, warm, 0.3, g0 - 0.5, -1.25, R.L - 0.3, yT - 0.5, -1.2); for (let s = 0; s <= R.L + 0.01; s += Math.max(1, R.L / Math.max(1, Math.round(R.L / 1.5)))) K.rbox(R, dark, s - 0.04, g0 - 0.5, 0, s + 0.04, yT - 0.35, 0.12); }
      K.prism(dark, inset(P, -1.8), yT - 0.4, yT);
      colliders.push({ type: 'poly', pts: Pi, y0: g0 - 1, y1: yT });
      continue;
    }
    const yB = g0 + V.base; // underside of the concrete box (base recessed below)
    if (V.base > 0) {
      const Pi = inset(P, 3.6);
      K.prism(M.concreteDark, inset(P, 4.2), g0 - 1, yB);
      for (const { R } of polyRuns(K, Pi)) { if (R.L < 0.8) continue; K.rbox(R, glass, 0, g0 - 1, -0.06, R.L, yB, 0); for (let s = 1.5; s < R.L - 0.5; s += 1.5) K.rbox(R, dark, s - 0.04, g0 - 1, 0, s + 0.04, yB, 0.1); }
      K.prism(soffitD, inset(P, 0.02), yB - 0.02, yB + 0.02); // dark soffit under the oversail
      colliders.push({ type: 'poly', pts: Pi, y0: g0 - 1, y1: yB + 0.5 });
    }
    // windowless board-formed concrete box with crisp edges
    K.prism(conc, P, V.base > 0 ? yB : g0 - 1, V.top);
    colliders.push({ type: 'poly', pts: P, y0: V.base > 0 ? yB : g0 - 1, y1: V.top });
    // [r4-sweep-outer] crisp projecting parapet cap (strong horizontal shadow line) + thin terrace guardrails
    K.prism(conc, inset(P, -0.14), V.top - 0.05, V.top + 0.32);
    if (V.top > 6) for (const { R } of polyRuns(K, inset(P, 0.35))) { if (R.L < 1.2) continue; K.rbox(R, rail, 0, V.top + 1.28, -0.03, R.L, V.top + 1.34, 0.03); K.rbox(R, rail, 0, V.top + 0.7, -0.015, R.L, V.top + 0.73, 0.015, { detail: true }); for (let s = 0; s <= R.L + 0.01; s += Math.max(0.8, R.L / Math.max(1, Math.round(R.L / 1.8)))) K.rbox(R, rail, s - 0.025, V.top + 0.32, -0.025, s + 0.025, V.top + 1.32, 0.025, { detail: true }); }
    // deep skylight slots / roof baffles on the gallery roofs
    if (V.top > 12) { const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); for (let k = -1; k <= 1; k++) K.box(glass, c[0] - 6, V.top, c[1] + k * 4 - 0.6, c[0] + 6, V.top + 0.5, c[1] + k * 4 + 0.6); }
  }
  // a few slender white steel columns under the deepest oversails and the entrance on Bancroft (north)
  const white = std(0xf0f0ee, 'bakarWhite', { rough: 0.5 });
  for (const [x, z] of [[12, -18.5], [20, -19.5], [-10, -16.5], [-2, -16.0]]) { const g = K.g(x, z); K.cyl(white, x, g - 0.5, z, 0.15, 0.15, 5.3, 10); colliders.push({ type: 'cyl', x, z, r: 0.2, y0: g - 1, y1: g + 5 }); }
  // folded concrete plaza wedges on the garden side
  { const W = (x, z, w, d, h, a) => { const g = K.g(x, z); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(d, 0); sh.lineTo(d, h); sh.lineTo(0, 0.25);
      const eg = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); eg.translate(-d / 2, g - 0.05, -w / 2); eg.rotateY(a); eg.translate(x, 0, z); K.add(M.concrete, eg); };
    W(-14, 33, 3, 6, 1.1, 0.4); W(-20, 28, 2.5, 5, 0.9, 0.9); W(8, 46, 3, 7, 1.2, -0.2); }
  // blue wayfinding post
  { const x = -9.5, z = 40.5, g = K.g(x, z); K.box(dark, x - 0.12, g, z - 0.05, x + 0.12, g + 2.2, z + 0.05); K.box(M.calBlue, x - 0.1, g + 1.2, z - 0.06, x + 0.1, g + 2.1, z + 0.06); }
  const object3d = K.finish(); object3d.name = 'bakar-bioenginuity-hub';
  return { object3d, colliders };
}
