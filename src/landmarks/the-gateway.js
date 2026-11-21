// The Gateway: the Barbara and Gerson Bakar Gateway, home of the College of Computing, Data Science, and Society (CDSS),
// 2300 Hearst Avenue at Arch Street on the former Tolman Hall site. Weiss/Manfredi (design) with Gensler; Turner; 2022-2026.
// Modelled as built from: UC Berkeley EIR Addendum No. 1 (2022: five floors above the Morgan Bikeway passage that runs through
// the building at grade, plus a basement; roof terrace at level 5 = 69 ft and roof coping = 91 ft above the passage; vision
// glass, etched spandrel glass, aluminium panels), Weiss/Manfredi + Metropolis (Oct 2026, Jason O'Rear / Ema Peter) photos,
// and 2025-26 ESRI imagery checked against OSM w/1460048471 (fits within relief displacement).
// Massing: two wings around a public plaza scooped out of the Hearst side (Arch St axis) and an amphitheatre courtyard scooped
// toward the campus park (white disc canopy over the cafe terrace). Outer walls: bowed champagne-aluminium panels alternating with
// glass on a 1.5 m module, staggered floor to floor; courtyard walls: flush glass ribbons. A recessed glazed ground floor with slim
// columns, an open passage under a stepped "funnel" portal on the campus side carrying the name, a set-back glass top floor under
// thin white roof planes, and a roof terrace (red decking, planting, elliptical atrium skylight) facing the Campanile.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { polyRuns, inset, std, tint } from './lib/b06-modern.js';
import { nightGlow } from '../materials.js';
import { inRing, distToRing, ringHits, nearestHit, ringPath, sagArc, drape, cutRanges, panelStorey, ribbonStorey, storefront, youngTree2, signMaterial, offsetPoly, flatDown, groundMat, engineTrees, interiorMap, dayNightGlow } from './lib/gw-kit.js';

export const info = {
  id: 'the-gateway',
  name: 'The Gateway',
  subtitle: 'Barbara and Gerson Bakar Gateway · Weiss/Manfredi with Gensler · 2026',
  blurb: 'Opened in 2026 on the former Tolman Hall site at Hearst Avenue and Arch Street, the 367,000 sq ft Bakar Gateway is the home of the College of Computing, Data Science, and Society, Berkeley\'s first new college in more than 50 years.',
  replaces: ['w/1460048471'],
};

const Y1 = 3.5;                                    // level 1 = Morgan Bikeway passage grade
const FH = 5.25;                                   // floor to floor (EIR: level 5 terrace 21.0 m above the passage)
const FL = [Y1 - FH, Y1, Y1 + FH, Y1 + 2 * FH, Y1 + 3 * FH, Y1 + 4 * FH]; // B1, L1 .. L5
const ROOF = Y1 + 27.7;                            // roof coping (91 ft above the passage)

export async function build(ctx) {
  const K = new Kit(ctx, 0); const M = ctx.M; const G = (x, z) => ctx.groundAt(x, z);
  const colliders = [], walkables = [], interactions = []; const treeSpec = [];
  const glassOpts = { rough: 0.05, metal: 0.55, envMapIntensity: 2.0, emissive: 0xffe2b8, emissiveIntensity: 0.9 };
  const mats = {
    get frame() { return this.mull; }, get column() { return this.white; }, get roofSoffit() { return this.white; },
    glass: dayNightGlow(std(0xbccad3, 'gwGlass', glassOpts), 0.05, 1.0),
    glassLow: dayNightGlow(std(0xb4c0c6, 'gwGlassLow', { ...glassOpts, metal: 0.25, rough: 0.08, emissiveIntensity: 1.3 }), 0.28, 1.0),
    glass5: dayNightGlow(std(0xc3d0d8, 'gwGlass5', { ...glassOpts, metal: 0.5, emissiveIntensity: 1.2 }), 0.08, 1.0),
    spandrel: std(0x8d9aa4, 'gwSpandrel', { rough: 0.25, metal: 0.5 }),
    band: std(0x6d7276, 'gwBand', { rough: 0.4, metal: 0.5 }),
    mull: std(0x3b3835, 'gwMull', { rough: 0.5, metal: 0.45 }),
    metal: std(0xd8d1c4, 'gwPanel', { rough: 0.3, metal: 0.6 }),
    silver: std(0xc6cbcf, 'gwSilver', { rough: 0.35, metal: 0.55 }),
    soffit: std(0xe6dccb, 'gwSoffit', { rough: 0.6, metal: 0.1, emissive: 0x4a4236 }),
    roofPlane: tint(M.concrete, 0xe4e4e0, 'gwRoofPlane'),
    deck: tint(M.wood, 0xa36a4c, 'gwDeck'),
    white: std(0xf2f2ef, 'gwWhite', { rough: 0.45 }),
    leaf: std(0x56783a, 'gwLeaf', { rough: 0.92 }), trunk: std(0x5b4b3d, 'gwTrunk', { rough: 0.9 }),
    core: tint(M.concrete, 0x8f9294, 'gwCore'),
    rail: (() => { const m = std(0xb9c7cc, 'gwRail', { rough: 0.05, metal: 0.3 }); m.transparent = true; m.opacity = 0.35; m.depthWrite = false; return m; })(),
  };
  { const t = interiorMap(FH, Y1, { seed: 3 }); for (const m of [mats.glass, mats.glassLow]) { m.map = t; m.emissiveMap = t; m.needsUpdate = true; } const t5 = interiorMap(ROOF - 0.45 - FL[5] - 0.55, FL[5] + 0.55, { seed: 9, blinds: 0.3 }); mats.glass5.map = t5; mats.glass5.emissiveMap = t5; }
  const paving = groundMat(tint(M.paving, 0xe2ded6, 'gwPaving')); 
  const apronM = groundMat(tint(M.paving, 0xd6d2c9, 'gwApron'));
  const lawn = groundMat(std(0x5a7442, 'gwLawn', { rough: 0.95 })); const walk = groundMat(tint(M.concrete, 0xd9d6cf, 'gwWalk'));

  // ---------- plan ----------
  const raw = ctx.footprints[0].outer.map(([x, z]) => [x, z]);
  // drop the near-collinear kink on the south wall (OSM node at -25.8, 34.5) so the campus facade is one straight run
  const fp = raw.filter(([x, z]) => Math.hypot(x + 25.8, z - 34.5) > 0.5);
  const P16 = [-55.6, 37.9], P18 = [22.7, 29.0];
  const sT = [(P18[0] - P16[0]), (P18[1] - P16[1])]; const sL = Math.hypot(...sT); sT[0] /= sL; sT[1] /= sL;
  const sN = [-sT[1], sT[0]];                                   // outward (south)
  const onS = (s) => [P16[0] + sT[0] * s, P16[1] + sT[1] * s];
  const sC = (-27 - P16[0]) / sT[0];                            // passage centre on the south wall
  // stepped "funnel" portal over the passage: slab-edge arcs per storey (chord half-width, sag into the building)
  const PORT = { 2: [14, 6.5], 3: [12.5, 4.2], 4: [9.5, 2.2] };
  const arcOf = (k, seg = 12) => { const [hw, sag] = PORT[k]; return sagArc(onS(sC - hw), onS(sC + hw), sag, [-sN[0], -sN[1]], seg); };
  // passage (open at grade): flared walls from the portal chord ends to the plaza apex
  const wallW = [onS(sC - 14), [-38.4, 29.6], [-35.9, 23.5], [-35.4, 15], [-35.6, 5], [-36.0, -5.45]];   // south -> north (faces east)
  const wallE = [[-22.5, -6.31], [-21.4, 5], [-21.0, 15], [-20.6, 23.5], [-17.0, 28.6], onS(sC + 14)];   // north -> south (faces west)
  const apex = [[-34.3, -3.0], [-30.8, -0.6], [-28.0, -0.8], [-27.1, -0.9], [-24.3, -3.1]];
  const passage = [...wallW, ...apex, ...wallE, ...arcOf(2).slice().reverse().slice(1, -1)];   // under the L2 slab
  const passOpen = [...wallW, ...apex, ...wallE];                                                // open at grade (incl. funnel floor)
  const scoopN = (m) => m[0] > -44.6 && m[0] < -17.4 && m[1] > -31 && m[1] < 0.6;
  const scoopSE = (m) => m[0] > 17.4 && m[0] < 58.5 && m[1] > -3 && m[1] < 27.5;

  // ---------- facades, per run ----------
  const gRange = (R, d = 0.6) => { let lo = Infinity, hi = -Infinity; for (let s = 0; s <= R.L + 0.01; s += Math.min(1.5, R.L / 2)) { const g = G(...R.at(Math.min(s, R.L), d)); lo = Math.min(lo, g); hi = Math.max(hi, g); } return [lo, hi]; };
  const passCuts = (R) => { const cuts = []; let a = null; const st = 0.25; for (let s = 0; s <= R.L + 1e-6; s += st) { const ins = inRing(...R.at(s, -0.3), passOpen); if (ins && a === null) a = s; if (!ins && a !== null) { cuts.push([a - st / 2, s - st / 2]); a = null; } } if (a !== null) cuts.push([a, R.L]); return cuts; };
  const runs = polyRuns(K, fp);
  for (const { R } of runs) {
    const mid = R.at(R.L / 2); const kind = scoopN(mid) ? 'N' : scoopSE(mid) ? 'SE' : 'out';
    const isSouth = Math.abs(R.a[0] - P16[0]) < 0.3 && Math.abs(R.b[0] - P18[0]) < 0.3;
    const [gLo, gHi] = gRange(R);
    // base: recessed glazed ground floor (and exposed garden level where the ground falls away)
    if (gLo < FL[2] - 0.8) {
      const cuts = passCuts(R); const yb = gLo - 1.0;
      for (const [a, b] of cutRanges(0, R.L, cuts)) {
        const cols = storefront(K, R, a, b, yb, FL[2] - 0.6, mats, { rec: kind === 'out' ? 1.9 : 1.2, colPitch: kind === 'out' ? 7.5 : 0, transoms: [FL[1], FL[1] + 3.1], skipStart: a > 0.01, skipEnd: b < R.L - 0.01 });
        for (const [x, z] of cols) colliders.push({ type: 'cyl', x, z, r: 0.3, y0: yb, y1: FL[2] });
        if (kind === 'out' && gLo < FL[1] - 1.2) K.rbox(R, mats.band, a, FL[1] - 0.15, -1.95, b, FL[1] + 0.3, 0.35);
      }
    }
    // L2 - L4
    for (let k = 2; k <= 4; k++) {
      const ya = FL[k], yb = FL[k + 1]; if (yb < gLo + 0.3) continue;
      const cut = isSouth ? [[sC - PORT[k][0], sC + PORT[k][0]]] : [];
      for (const [a, b] of cutRanges(0, R.L, cut)) {
        if (kind === 'out') panelStorey(K, R, a, b, Math.max(ya, gLo - 0.5), yb, k, mats); else ribbonStorey(K, R, a, b, Math.max(ya, gLo - 0.5), yb, mats);
      }
    }
    // top of L4: dark slab band, light coping, glass guard of the level-5 terrace ring
    K.rbox(R, mats.band, -0.02, FL[5] - 0.45, -0.16, R.L + 0.02, FL[5], 0.06);
    K.rbox(R, mats.silver, -0.02, FL[5], -0.3, R.L + 0.02, FL[5] + 0.12, 0.08);
    K.rbox(R, mats.rail, 0, FL[5] + 0.12, -0.24, R.L, FL[5] + 1.2, -0.2);
    K.rbox(R, mats.silver, 0, FL[5] + 1.16, -0.27, R.L, FL[5] + 1.22, -0.17, { detail: true });
  }

  // ---------- campus-side portal: stepped glass funnel over the passage ----------
  {
    const arcRuns = (pts) => { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(K.run(pts[i], pts[i + 1])); return out; };
    for (let k = 2; k <= 4; k++) {
      for (const R of arcRuns(arcOf(k))) ribbonStorey(K, R, 0, R.L, FL[k], FL[k + 1], mats);
      // slab edge fascia along the arc
      for (const R of arcRuns(arcOf(k, k === 2 ? 28 : 12))) K.rbox(R, k === 2 ? mats.mull : mats.silver, -0.03, FL[k] - (k === 2 ? 0.95 : 0.62), -0.05, R.L + 0.03, FL[k] + 0.1, 0.12);
    }
    // soffits (warm champagne under the sign slab, cooler above): lunes between successive arcs
    const chord = (k) => k === 5 ? [onS(sC - 15), onS(sC + 15)] : arcOf(k);
    for (let k = 2; k <= 4; k++) {
      const upper = k + 1; const lower = arcOf(k);
      const up = upper === 5 ? [onS(sC - PORT[k][0]), onS(sC + PORT[k][0])] : (() => { const a = arcOf(upper); const [hw] = PORT[k]; return [onS(sC - hw), ...a, onS(sC + hw)]; })();
      const lune = [...up, ...lower.slice().reverse().slice(1, -1)];
      flatDown(K, k === 2 ? mats.soffit : mats.silver, lune, FL[upper] - 0.62);
    }
    // name on the sign fascia (L2 slab edge), brushed aluminium letters following the curve
    const sm = signMaterial('BARBARA & GERSON BAKAR GATEWAY', { bg: '#3b3835' });
    const a2 = sagArc(onS(sC - 6.6), onS(sC + 6.6), 5.5 * (1 - (6.6 / 14) ** 2), [-sN[0], -sN[1]], 20);
    // the fascia sits on the full A2 parabola; re-sample the true curve so letters hug it
    const full = (s) => { const t = (s - (sC - 14)) / 28; const kk = 1 - (2 * t - 1) ** 2; const p = onS(s); return [p[0] - sN[0] * PORT[2][1] * kk, p[1] - sN[1] * PORT[2][1] * kk]; };
    const pos = [], uv = []; const n = 24; const y0 = FL[2] - 0.86, y1 = FL[2] - 0.06;
    for (let i = 0; i < n; i++) {
      const sa = sC - 8.2 + 16.4 * i / n, sb = sC - 8.2 + 16.4 * (i + 1) / n; const pa = full(sa), pb = full(sb);
      const tx = pb[0] - pa[0], tz = pb[1] - pa[1]; const L = Math.hypot(tx, tz); const nx = -tz / L * 0.2, nz = tx / L * 0.2;
      const A = [pa[0] + nx, pa[1] + nz], B = [pb[0] + nx, pb[1] + nz]; const u0 = i / n, u1 = (i + 1) / n;
      pos.push(A[0], y0, A[1], B[0], y0, B[1], B[0], y1, B[1], A[0], y0, A[1], B[0], y1, B[1], A[0], y1, A[1]);
      uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    }
    void a2;
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); sg.computeVertexNormals();
    K.add(sm, sg, { uvMode: 'keep' });
    void chord;
  }

  // ---------- passage: glazed walls (lobby west, cafe east), champagne soffit with downlights, paving ----------
  {
    const runsOf = (pts) => { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(K.run(pts[i], pts[i + 1])); return out; };
    for (const R of [...runsOf(wallW), ...runsOf(wallE)]) {
      const [gLo] = gRange(R, 0.8);
      storefront(K, R, 0, R.L, gLo - 0.8, FL[2] - 0.6, mats, { rec: 0.05, transoms: [Y1 + 3.2], glass: mats.glassLow });
    }
    flatDown(K, mats.soffit, passage, FL[2] - 0.6);
    // downlights (detail): small glowing discs on the soffit
    const dl = []; for (let z = -2; z < 30; z += 3.2) for (let x = -34; x < -21; x += 3.2) if (inRing(x, z, passage)) { const c = new THREE.CircleGeometry(0.16, 8); c.rotateX(Math.PI / 2); c.translate(x, FL[2] - 0.62, z); dl.push(c); }
    for (const c of dl) K.add(M.lampGlow, c, { uvMode: 'keep', detail: true });
    drape(K, paving, passOpen, 0.14, 2.0);
    // two dark paving bands across the passage
  }

  // ---------- cores (opaque fill behind the glass) ----------
  {
    const withArc = (k) => { const out = []; for (const p of fp) { out.push(p); if (Math.hypot(p[0] - P16[0], p[1] - P16[1]) < 0.3) out.push(...arcOf(k)); } return out; };
    for (let k = 2; k <= 4; k++) K.prism(mats.core, offsetPoly(withArc(k), 0.32, 2.0), FL[k] - 0.45, FL[k + 1] - 0.4);
  }
  const L1W = [[-36.0, -5.45], [-37.9, -8.2], [-41.1, -15.8], [-43.8, -24.4], [-74.1, -16.9], P16, ...wallW.slice(0, -1)];
  const L1E = [[-22.5, -6.31], [-22.0, -7.2], [-19.8, -14.1], [-18.7, -20.1], [-18.1, -32.2], [34.4, -40.5], [90.7, 16.3], [58.0, 23.0],
    [50.5, 13.5], [44.9, 7.5], [38.1, 1.8], [32.5, -1.3], [27.3, -2.4], [24.4, -1.9], [20.4, 0.9], [18.4, 6.1], [18.2, 12.5], [19.4, 19.2], [21.2, 25.1], P18, ...wallE.slice().reverse().slice(0, -1)];
  let gMin = Infinity; for (const [x, z] of raw) gMin = Math.min(gMin, G(x, z));
  for (const poly of [L1W, L1E]) {
    K.prism(mats.core, offsetPoly(poly, 2.05, 2.0), gMin - 1.5, FL[2] - 0.55);
    colliders.push({ type: 'poly', pts: offsetPoly(poly, 1.9, 2.0), y0: gMin - 6, y1: FL[5] - 0.6 });
  }
  colliders.push({ type: 'poly', pts: fp, y0: FL[2] - 0.6, y1: FL[5] - 0.6 });

  // ---------- level 5: set-back glass storey, roof terrace, thin white roof planes ----------
  const ring5 = offsetPoly(fp, 2.5, 2.2);
  const Q1 = nearestHit(ringHits(ring5, 'x', 47.5), [47.5, 10]);      // SE court, east side
  const Q2 = nearestHit(ringHits(ring5, 'z', 7.5), [16.5, 7.5]);      // SE court, west side
  const Qa = nearestHit(ringHits(ring5, 'x', -24), [-24, -1]);        // north court apex, east side
  const Qh = nearestHit(ringHits(ring5, 'x', -12), [-12, -31]);       // Hearst edge east of the court (imagery: court's east flank is low)
  const T_n = [[-12, -13], [12, -13], [14, -19.5], [50, -19.5]];
  const L5W = [...ringPath(ring5, Qa, Q2), [-12, 7.5], [-24, 7.5]];
  const L5N = [...ringPath(ring5, Q1, Qh), ...T_n];
  const TER = [...ringPath(ring5, Qh, Qa), [-24, 7.5], [-12, 7.5], ...ringPath(ring5, Q2, Q1), ...T_n.slice().reverse()];
  const L5 = L5W; void L5N;
  K.prism(apronM, fp, FL[5] - 0.6, FL[5]);
  K.prism(mats.deck, TER, FL[5], FL[5] + 0.12);
  {
    const mats5 = { glass: mats.glass5, spandrel: mats.band, silver: mats.mull };
    for (const poly of [L5W, L5N]) {
      for (const { R } of polyRuns(K, poly)) ribbonStorey(K, R, 0, R.L, FL[5] + 0.55, ROOF - 0.45, mats5, { module: 1.5 });
      K.prism(mats.core, offsetPoly(poly, 0.3), FL[5], ROOF - 0.5);
      const roofP = offsetPoly(poly, -1.25, 1.6);
      K.prism(mats.roofPlane, roofP, ROOF - 0.38, ROOF);
      K.prism(mats.silver, offsetPoly(roofP, 0.02), ROOF - 0.02, ROOF + 0.04);
      flatDown(K, mats.roofSoffit, roofP, ROOF - 0.39);
    }
    // rooftop mechanical yard behind louvred screens (north band, per imagery)
    const mech = new THREE.BoxGeometry(21, 2.2, 6.5); mech.rotateY(0.157); mech.translate(20, ROOF + 1.1, -29.5); K.add(mats.silver, mech);
    for (const [x, z, w, d, h] of [[-40, 10, 6, 4, 1.6], [-30, 22, 3, 3, 1.2], [-52, 0, 4, 2.5, 1.4], [62, -8, 7, 4, 1.8], [72, 2, 3, 2.4, 1.2], [5, 16, 5, 3, 1.4]]) { K.box(mats.silver, x - w / 2, ROOF, z - d / 2, x + w / 2, ROOF + h, z + d / 2); }
    for (let i = 0; i < 14; i++) { const x = -60 + (i * 37) % 130, z = -20 + (i * 23) % 45; if (!(inRing(x, z, L5W) || inRing(x, z, L5N)) || inRing(x, z, TER)) continue; K.cyl(mats.band, x, ROOF, z, 0.25, 0.25, 0.8, 8, { detail: true }); }
    for (let i = 0; i < 9; i++) { const l = new THREE.BoxGeometry(21.2, 0.05, 6.7); l.rotateY(0.157); l.translate(20, ROOF + 0.3 + i * 0.22, -29.5); K.add(mats.band, l, { detail: true }); }
  }
  // terrace furniture: elliptical atrium skylight ringed by planting, planters, louvred canopy, glass guard to the courtyard
  {
    const ec = [3, -3.5], ea = 9.5, eb = 6.0, rot = -0.14; const ell = (r1, r2, n = 40) => { const o = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const x = Math.cos(t) * r1, z = Math.sin(t) * r2; o.push([ec[0] + x * Math.cos(rot) - z * Math.sin(rot), ec[1] + x * Math.sin(rot) + z * Math.cos(rot)]); } return o; };
    const yT = FL[5] + 0.12;
    K.prism(M.concrete, ell(ea + 0.5, eb + 0.5), yT, yT + 0.55, undefined, [ell(ea, eb).reverse()]);
    K.prism(mats.leaf, ell(ea + 2.3, eb + 2.3), yT, yT + 0.75, undefined, [ell(ea + 0.5, eb + 0.5).reverse()]);
    K.prism(M.concrete, ell(ea + 2.5, eb + 2.5), yT, yT + 0.6, undefined, [ell(ea + 2.3, eb + 2.3).reverse()]);
    const sk = new THREE.SphereGeometry(1, 28, 6, 0, Math.PI * 2, 0, Math.PI / 2); sk.scale(ea, 1.1, eb); sk.rotateY(-rot); sk.translate(ec[0], yT + 0.5, ec[1]);
    K.add(mats.glass5, sk, { uvMode: 'keep' });
    // planters along the terrace edge and a louvred canopy over the east end
    for (const [x, z, w, d] of [[-9, 2.5, 7, 1.4], [30, -17.8, 9, 1.4], [44, -17.8, 6, 1.4], [8, -11.2, 6, 1.2]]) { K.box(M.concrete, x - w / 2, yT, z - d / 2, x + w / 2, yT + 0.65, z + d / 2); K.box(mats.leaf, x - w / 2 + 0.1, yT + 0.65, z - d / 2 + 0.1, x + w / 2 - 0.1, yT + 1.05, z + d / 2 - 0.1); }
    const cy = FL[5] + 4.2;
    for (const [x, z] of [[22, -17], [34, -17], [46, -17], [22, -7], [34, -6], [46, -4]]) { K.cyl(mats.column, x, yT, z, 0.12, 0.12, cy - yT, 10); }
    K.box(mats.white, 20.5, cy, -18, 47.5, cy + 0.3, -16.5); K.box(mats.white, 20.5, cy, -7.5, 47.5, cy + 0.3, -3.5);
    for (let x = 21; x < 47.4; x += 0.75) K.box(mats.metal, x - 0.06, cy, -16.5, x + 0.06, cy + 0.35, -7.5, { detail: x % 3 > 0.8 });
    walkables.push({ type: 'poly', pts: TER, y: yT });
  }

  // ---------- paved apron around the building (incl. under the colonnade) ----------
  { const fpS = fp.filter((p, i) => i === 0 || Math.hypot(p[0] - fp[i - 1][0], p[1] - fp[i - 1][1]) > 1.5); drape(K, apronM, offsetPoly(fpS, -3.2, 1.5), 0.09, 2.5, [offsetPoly(fpS, 2.0, 1.5)]); }

  // ---------- Hearst-side gateway plaza (Arch Street axis) ----------
  {
    const scoop = [[-18.1, -32.2], [-18.7, -20.1], [-19.8, -14.1], [-22.0, -7.2], [-24.3, -3.1], [-27.1, -0.9], [-28.0, -0.8], [-30.8, -0.6], [-34.3, -3.0], [-37.9, -8.2], [-41.1, -15.8], [-43.8, -24.4]];
    const plaza = [...scoop, [-45.6, -31.0], [-39.0, -36.6], [-31.0, -40.6], [-22.0, -43.8], [-16.0, -45.2], [-15.6, -33.0]];
    drape(K, paving, plaza, 0.14, 2.0);
    for (const zz of [-26, -16]) { const w = 0.45; const pts = [[-46, zz - w], [-15, zz - w], [-15, zz + w], [-46, zz + w]]; const clip = pts; void clip; }
    // planting beds and young trees along both flanks of the court, benches
    for (const [x, z] of [[-41.0, -27.5], [-38.2, -18.0], [-21.3, -18.5], [-20.4, -27.8]]) {
      const g = G(x, z); K.cyl(M.concrete, x, g - 0.3, z, 1.6, 1.6, 0.8, 20); K.cyl(mats.leaf, x, g + 0.45, z, 1.45, 1.2, 0.35, 16);
      treeSpec.push({ x, y: g + 0.5, z, h: 6.0, r: 1.9, sp: 'deciduous', rot: x });
    }
    for (const [x, z, a] of [[-35.5, -12, 1.1], [-25.3, -12.5, -1.1]]) { const g = G(x, z); const b = new THREE.BoxGeometry(4.0, 0.45, 0.6); b.rotateY(a); b.translate(x, g + 0.22, z); K.add(M.wood, b); }
  }

  // ---------- campus courtyard: disc canopy over the cafe terrace, lawn with concentric seat walls and curved walks, young trees ----------
  // (the real court steps down to the garden level; the engine terrain is the 2021 graded lot, so the lawn follows it)
  {
    const C = [31.8, 7.6], yP = FL[2];
    const circ = (r, n = 48) => { const o = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; o.push([C[0] + Math.cos(t) * r, C[1] + Math.sin(t) * r]); } return o; };
    // stepped round patio podium
    [[11.0, yP - 0.9], [10.0, yP - 0.45], [9.0, yP]].forEach(([r, y]) => K.prism(paving, circ(r), Math.min(G(...C), yP) - 3, y));
    walkables.push({ type: 'poly', pts: circ(9.0), y: yP }, { type: 'poly', pts: circ(10.0), y: yP - 0.45 }, { type: 'poly', pts: circ(11.0), y: yP - 0.9 });
    const disc = new THREE.CylinderGeometry(8.0, 8.0, 0.55, 64); disc.translate(C[0], yP + 4.9, C[1]); K.add(mats.white, disc);
    for (let i = 0; i < 10; i++) { const t = (i + 0.5) / 10 * Math.PI * 2; const x = C[0] + Math.cos(t) * 6.7, z = C[1] + Math.sin(t) * 6.7; K.cyl(mats.white, x, yP, z, 0.11, 0.11, 4.7, 10); colliders.push({ type: 'cyl', x, z, r: 0.2, y0: yP - 1, y1: yP + 4.7 }); }
    for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2 + 0.2; const r = i % 2 ? 4.0 : 5.8; const x = C[0] + Math.cos(t) * r, z = C[1] + Math.sin(t) * r; if (inRing(x, z, fp) || distToRing(x, z, fp) < 1.5) continue; K.cyl(mats.mull, x, yP, z, 0.04, 0.04, 0.74, 6, { detail: true }); K.cyl(mats.white, x, yP + 0.72, z, 0.45, 0.45, 0.04, 12, { detail: true }); }
    // lawn over the open courtyard (kept off the facade apron), around the podium
    const se = [[22.7, 29.0], [21.2, 25.1], [19.4, 19.2], [18.2, 12.5], [18.4, 6.1], [20.4, 0.9], [24.4, -1.9], [27.3, -2.4], [32.5, -1.3], [38.1, 1.8], [44.9, 7.5], [50.5, 13.5], [58.0, 23.0], [61.5, 31.0], [42.0, 36.5], [27.0, 35.5]];
    const lawnP = offsetPoly(se, 3.0, 1.6);
    drape(K, lawn, lawnP, 0.06, 2.0, [circ(11.2, 36).reverse()]);
    // concentric seat walls with a curved walk on their outer side, on the open sector only
    const openAt = (x, z) => inRing(x, z, lawnP) && Math.hypot(x - C[0], z - C[1]) > 11.5;
    for (const r of [14.6, 19.4]) {
      const st = Math.PI / 72; let prev = null; const walkPts = [];
      for (let t = 0; t <= Math.PI * 2 + 1e-6; t += st) {
        const P = [C[0] + Math.cos(t) * r, C[1] + Math.sin(t) * r]; const ok = openAt(...P);
        if (ok && prev) { const R = K.run(prev, P); const gm = Math.min(G(...prev), G(...P)); K.rbox(R, M.concrete, -0.02, gm - 0.6, -0.42, R.L + 0.02, (G(...prev) + G(...P)) / 2 + 0.46, 0.0); }
        prev = ok ? P : null;
      }
      for (let t = 0; t <= Math.PI * 2 + 1e-6; t += st) { const ta = t, tb = t + st; const pa = [C[0] + Math.cos(ta) * (r + 0.1), C[1] + Math.sin(ta) * (r + 0.1)]; const pb = [C[0] + Math.cos(tb) * (r + 0.1), C[1] + Math.sin(tb) * (r + 0.1)]; if (!openAt(...pa) || !openAt(...pb)) continue; const qa = [C[0] + Math.cos(ta) * (r + 1.9), C[1] + Math.sin(ta) * (r + 1.9)], qb = [C[0] + Math.cos(tb) * (r + 1.9), C[1] + Math.sin(tb) * (r + 1.9)]; if (!inRing(...qa, lawnP) || !inRing(...qb, lawnP)) continue; walkPts.push([pa, pb, qb, qa]); }
      for (const q of walkPts) drape(K, walk, q, 0.1, 3.0);
    }
    // young trees on the lawn between the walls (replacing the 2021 trees on the old lot)
    for (let i = 0; i < 9; i++) { const t = 0.35 + i * 0.27; const r = 17.0 + (i % 2) * 5.0; const x = C[0] + Math.cos(t) * r, z = C[1] + Math.sin(t) * r; if (!openAt(x, z) || distToRing(x, z, fp) < 3.5) continue; const gy = G(x, z); treeSpec.push({ x, y: gy, z, h: 6.2 + (i % 3) * 0.8, r: 2.1, sp: 'deciduous', rot: i * 1.7 }); colliders.push({ type: 'cyl', x, z, r: 0.22, y0: gy - 1, y1: gy + 3 }); }
  }

  // ---------- campus-side walk along the south facade (paved, as in 2025-26 imagery) ----------
  drape(K, walk, [[-57.6, 41.4], [21.6, 32.4], [24.6, 37.2], [12.0, 45.2], [-1.5, 47.0], [-30.0, 48.6], [-57.0, 47.6]], 0.07, 2.5);

  // ---------- elevator to the roof terrace and back ----------
  interactions.push({ id: 'gateway-roof', pos: [-28.5, Y1 + 1.2, 12], radius: 3.5, label: 'Ride up to the Gateway rooftop terrace', teleport: [26, FL[5] + 0.2, -12] });
  interactions.push({ id: 'gateway-down', pos: [24, FL[5] + 1.2, -15], radius: 3.0, label: 'Take the elevator down to the Morgan Bikeway passage', teleport: [-28.5, Y1 + 0.2, 10] });
  colliders.push({ type: 'poly', pts: offsetPoly(TER, 0.4, 2.0), y0: FL[5] - 0.1, y1: FL[5] + 1.2 });

  // ---------- site landscape: lawn from the building out to Hearst, the service road and the campus paths (hides the 2021 graded
  // lot), with the real OSM footways drawn on top ----------
  {
    const fpS = fp.filter((p, i) => i === 0 || Math.hypot(p[0] - fp[i - 1][0], p[1] - fp[i - 1][1]) > 1.5);
    const site = [[-84, -14.5], [-49, -30.5], [-46, -33.2], [-44, -31.5], [-46, -24], [-18, -32.5], [-15.5, -44.5], [39, -53.5], [43, -49.5], [53, -45.5], [62, -45.5], [64.5, -35], [67.5, -29.5], [74.5, -18.5], [86, -7.5], [99, 8], [105, 29.5], [85, 24.5], [66, 28.5], [30, 37.5], [14, 47.5], [-2.5, 63], [-40, 63], [-80, 57], [-82, 30]];
    drape(K, lawn, site, 0.05, 3.2, [offsetPoly(fpS, 2.4, 1.5)]);
    for (const c of ctx.packet.context || []) {
      const hw = c.tags && c.tags.highway; if (!['footway', 'path', 'cycleway', 'steps', 'pedestrian'].includes(hw)) continue; const pts = c.pts || []; const w = hw === 'cycleway' ? 1.4 : 1.25;
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (!inRing(m[0], m[1], site) || inRing(m[0], m[1], fp)) continue; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.3) continue; const nx = -(b[1] - a[1]) / L * w, nz = (b[0] - a[0]) / L * w; drape(K, walk, [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], 0.11, 3.0); }
    }
  }
  // trees: engine species in the game, simple crowns in the harness
  { const g = engineTrees(treeSpec); if (g) K.extra.push(g); else for (const t of treeSpec) youngTree2(K, mats, t.x, t.y, t.z, t.h, t.r * 0.85, t.rot); }

  const object3d = K.finish(); object3d.name = 'the-gateway';
  return { object3d, colliders, walkables, interactions };
}
