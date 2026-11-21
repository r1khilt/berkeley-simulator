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
import { inRing, distToRing, ringHits, nearestHit, ringPath, sagArc, drape, cutRanges, panelStorey, ribbonStorey, storefront, youngTree, signMaterial, offsetPoly } from './lib/gw-kit.js';

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
  const colliders = [], walkables = [], interactions = [];
  const glassOpts = { rough: 0.05, metal: 0.62, envMapIntensity: 1.7, emissive: 0xffd7a0, emissiveIntensity: 0.9 };
  const mats = {
    glass: nightGlow(std(0x6f8796, 'gwGlass', glassOpts), 1.0),
    glassLow: nightGlow(std(0x5a6a73, 'gwGlassLow', { ...glassOpts, metal: 0.32, rough: 0.08, emissiveIntensity: 1.4 }), 1.0),
    glass5: nightGlow(std(0x7f95a3, 'gwGlass5', { ...glassOpts, metal: 0.5, emissiveIntensity: 1.2 }), 1.0),
    spandrel: std(0x7d8a91, 'gwSpandrel', { rough: 0.3, metal: 0.45 }),
    band: std(0x4a4642, 'gwBand', { rough: 0.45, metal: 0.45 }),
    mull: std(0x3b3835, 'gwMull', { rough: 0.5, metal: 0.45 }),
    metal: std(0xd6cfc3, 'gwPanel', { rough: 0.3, metal: 0.5 }),
    silver: std(0xc6cbcf, 'gwSilver', { rough: 0.35, metal: 0.55 }),
    frame: std(0x35332f, 'gwFrame', { rough: 0.5, metal: 0.4 }),
    soffit: std(0xd2c1a4, 'gwSoffit', { rough: 0.55, metal: 0.2 }),
    column: std(0xdcdcd8, 'gwColumn', { rough: 0.5, metal: 0.15 }),
    roofPlane: std(0xdcdcd7, 'gwRoofPlane', { rough: 0.75, metal: 0.05 }),
    deck: tint(M.wood, 0xa36a4c, 'gwDeck'),
    white: std(0xf2f2ef, 'gwWhite', { rough: 0.45 }),
    leaf: std(0x56783a, 'gwLeaf', { rough: 0.92 }), trunk: std(0x5b4b3d, 'gwTrunk', { rough: 0.9 }),
    core: std(0x2b2f33, 'gwCore', { rough: 0.9 }),
    rail: (() => { const m = std(0xb9c7cc, 'gwRail', { rough: 0.05, metal: 0.3 }); m.transparent = true; m.opacity = 0.35; m.depthWrite = false; return m; })(),
  };
  const paving = tint(M.paving, 0xd8d4cb, 'gwPaving'); const roofDeck = tint(M.paving, 0xbdb9b1, 'gwRoofDeck');
  const darkPave = tint(M.paving, 0x6d6c69, 'gwPaveDark');

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
  const PORT = { 2: [14, 5.5], 3: [12.5, 3.5], 4: [9.5, 2.0] };
  const arcOf = (k, seg = 12) => { const [hw, sag] = PORT[k]; return sagArc(onS(sC - hw), onS(sC + hw), sag, [-sN[0], -sN[1]], seg); };
  // passage (open at grade): flared walls from the portal chord ends to the plaza apex
  const wallW = [onS(sC - 14), [-37.6, 30.6], [-35.7, 24], [-35.4, 15], [-35.6, 5], [-36.0, -5.45]];   // south -> north (faces east)
  const wallE = [[-22.5, -6.31], [-21.4, 5], [-21.0, 15], [-20.8, 24], [-18.1, 30.2], onS(sC + 14)];   // north -> south (faces west)
  const apex = [[-34.3, -3.0], [-30.8, -0.6], [-28.0, -0.8], [-27.1, -0.9], [-24.3, -3.1]];
  const passage = [...wallW, ...apex, ...wallE, ...arcOf(2).slice().reverse().slice(1, -1)];
  const scoopN = (m) => m[0] > -44.6 && m[0] < -17.4 && m[1] > -31 && m[1] < 0.6;
  const scoopSE = (m) => m[0] > 17.4 && m[0] < 58.5 && m[1] > -3 && m[1] < 27.5;

  // ---------- facades, per run ----------
  const gRange = (R, d = 0.6) => { let lo = Infinity, hi = -Infinity; for (let s = 0; s <= R.L + 0.01; s += Math.min(1.5, R.L / 2)) { const g = G(...R.at(Math.min(s, R.L), d)); lo = Math.min(lo, g); hi = Math.max(hi, g); } return [lo, hi]; };
  const passCuts = (R) => { const cuts = []; let a = null; const st = 0.25; for (let s = 0; s <= R.L + 1e-6; s += st) { const ins = inRing(...R.at(s, -0.3), passage); if (ins && a === null) a = s; if (!ins && a !== null) { cuts.push([a - st / 2, s - st / 2]); a = null; } } if (a !== null) cuts.push([a, R.L]); return cuts; };
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
      for (const R of arcRuns(arcOf(k))) K.rbox(R, mats.silver, -0.03, FL[k] - 0.62, -0.05, R.L + 0.03, FL[k] + 0.1, 0.12);
    }
    // soffits (warm champagne under the sign slab, cooler above): lunes between successive arcs
    const chord = (k) => k === 5 ? [onS(sC - 15), onS(sC + 15)] : arcOf(k);
    for (let k = 2; k <= 4; k++) {
      const upper = k + 1; const lower = arcOf(k);
      const up = upper === 5 ? [onS(sC - PORT[k][0]), onS(sC + PORT[k][0])] : (() => { const a = arcOf(upper); const [hw] = PORT[k]; return [onS(sC - hw), ...a, onS(sC + hw)]; })();
      const lune = [...up, ...lower.slice().reverse().slice(1, -1)];
      K.flat(k === 2 ? mats.soffit : mats.silver, lune, FL[upper] - 0.62, [], true);
    }
    // name on the sign fascia (L2 slab edge), brushed aluminium letters following the curve
    const sm = signMaterial('BARBARA & GERSON BAKAR GATEWAY');
    const a2 = sagArc(onS(sC - 6.6), onS(sC + 6.6), 5.5 * (1 - (6.6 / 14) ** 2), [-sN[0], -sN[1]], 20);
    // the fascia sits on the full A2 parabola; re-sample the true curve so letters hug it
    const full = (s) => { const t = (s - (sC - 14)) / 28; const kk = 1 - (2 * t - 1) ** 2; const p = onS(s); return [p[0] - sN[0] * 5.5 * kk, p[1] - sN[1] * 5.5 * kk]; };
    const pos = [], uv = []; const n = 24; const y0 = FL[2] - 0.5, y1 = FL[2] - 0.02;
    for (let i = 0; i < n; i++) {
      const sa = sC - 6.6 + 13.2 * i / n, sb = sC - 6.6 + 13.2 * (i + 1) / n; const pa = full(sa), pb = full(sb);
      const tx = pb[0] - pa[0], tz = pb[1] - pa[1]; const L = Math.hypot(tx, tz); const nx = -tz / L * 0.135, nz = tx / L * 0.135;
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
    K.flat(mats.soffit, passage, FL[2] - 0.6, [], true);
    // downlights (detail): small glowing discs on the soffit
    const dl = []; for (let z = -2; z < 30; z += 3.2) for (let x = -34; x < -21; x += 3.2) if (inRing(x, z, passage)) { const c = new THREE.CircleGeometry(0.16, 8); c.rotateX(Math.PI / 2); c.translate(x, FL[2] - 0.62, z); dl.push(c); }
    for (const c of dl) K.add(M.lampGlow, c, { uvMode: 'keep', detail: true });
    drape(K, paving, passage, 0.075, 2.0);
    // two dark paving bands across the passage
    for (const zz of [10, 20]) drape(K, darkPave, [[-36, zz - 0.4], [-20, zz - 0.4], [-20, zz + 0.4], [-36, zz + 0.4]].map(([x, z]) => [Math.max(Math.min(x, -20.9), -35.5), z]), 0.075, 2.0);
  }

  // ---------- cores (opaque fill behind the glass) ----------
  {
    const withArc = (k) => { const out = []; for (const p of fp) { out.push(p); if (Math.hypot(p[0] - P16[0], p[1] - P16[1]) < 0.3) out.push(...arcOf(k)); } return out; };
    for (let k = 2; k <= 4; k++) K.prism(mats.core, inset(withArc(k), 0.32), FL[k] - 0.45, FL[k + 1] - 0.4);
  }
  const L1W = [[-36.0, -5.45], [-37.9, -8.2], [-41.1, -15.8], [-43.8, -24.4], [-74.1, -16.9], P16, ...wallW.slice(0, -1)];
  const L1E = [[-22.5, -6.31], [-22.0, -7.2], [-19.8, -14.1], [-18.7, -20.1], [-18.1, -32.2], [34.4, -40.5], [90.7, 16.3], [58.0, 23.0],
    [50.5, 13.5], [44.9, 7.5], [38.1, 1.8], [32.5, -1.3], [27.3, -2.4], [24.4, -1.9], [20.4, 0.9], [18.4, 6.1], [18.2, 12.5], [19.4, 19.2], [21.2, 25.1], P18, ...wallE.slice().reverse().slice(0, -1)];
  let gMin = Infinity; for (const [x, z] of raw) gMin = Math.min(gMin, G(x, z));
  for (const poly of [L1W, L1E]) {
    K.prism(mats.core, inset(poly, 2.05), gMin - 1.5, FL[2] - 0.55);
    colliders.push({ type: 'poly', pts: inset(poly, 1.9), y0: gMin - 6, y1: FL[5] - 0.6 });
  }
  colliders.push({ type: 'poly', pts: fp, y0: FL[2] - 0.6, y1: FL[5] - 0.6 });

  // ---------- level 5: set-back glass storey, roof terrace, thin white roof planes ----------
  const ring5 = offsetPoly(fp, 2.5, 2.2);
  const Q1 = nearestHit(ringHits(ring5, 'x', 47.5), [47.5, 10]);
  const Q2 = nearestHit(ringHits(ring5, 'z', 4.5), [21.5, 4.5]);
  const T_in = [[-14, 4.5], [-14, -13], [12, -13], [14, -19.5], [50, -19.5]];
  const L5 = [...ringPath(ring5, Q1, Q2), ...T_in];
  const TER = [...ringPath(ring5, Q2, Q1), ...T_in.slice().reverse()];
  K.prism(roofDeck, fp, FL[5] - 0.6, FL[5]);
  K.prism(mats.deck, TER, FL[5], FL[5] + 0.12);
  {
    const mats5 = { glass: mats.glass5, spandrel: mats.band, silver: mats.mull };
    for (const { R } of polyRuns(K, L5)) ribbonStorey(K, R, 0, R.L, FL[5] + 0.55, ROOF - 0.45, mats5, { module: 1.5 });
    K.prism(mats.core, offsetPoly(L5, 0.3), FL[5], ROOF - 0.5);
    const roofP = offsetPoly(L5, -1.25, 1.6);
    K.prism(mats.roofPlane, roofP, ROOF - 0.45, ROOF);
    K.flat(mats.soffit, roofP, ROOF - 0.46, [], true);
    // rooftop mechanical yard behind louvred screens (north band, per imagery)
    const mech = new THREE.BoxGeometry(21, 2.2, 6.5); mech.rotateY(0.157); mech.translate(20, ROOF + 1.1, -29.5); K.add(mats.silver, mech);
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
  drape(K, tint(M.paving, 0xcfcbc2, 'gwApron'), offsetPoly(fp, -3.2, 1.5), 0.03, 2.5, [offsetPoly(fp, 2.0, 1.5)]);

  // ---------- Hearst-side gateway plaza (Arch Street axis) ----------
  {
    const scoop = [[-18.1, -32.2], [-18.7, -20.1], [-19.8, -14.1], [-22.0, -7.2], [-24.3, -3.1], [-27.1, -0.9], [-28.0, -0.8], [-30.8, -0.6], [-34.3, -3.0], [-37.9, -8.2], [-41.1, -15.8], [-43.8, -24.4]];
    const plaza = [...scoop, [-45.6, -31.0], [-39.0, -36.6], [-31.0, -40.6], [-22.0, -43.8], [-16.0, -45.2], [-15.6, -33.0]];
    drape(K, paving, plaza, 0.075, 2.0);
    for (const zz of [-26, -16]) { const w = 0.45; const pts = [[-46, zz - w], [-15, zz - w], [-15, zz + w], [-46, zz + w]]; const clip = pts; void clip; }
    // planting beds and young trees along both flanks of the court, benches
    for (const [x, z] of [[-41.0, -27.5], [-38.2, -18.0], [-21.3, -18.5], [-20.4, -27.8]]) {
      const g = G(x, z); K.cyl(darkPave, x, g - 0.3, z, 1.6, 1.6, 0.75, 16); K.cyl(mats.leaf, x, g + 0.4, z, 1.45, 1.45, 0.12, 16);
      youngTree(K, mats, x, g + 0.4, z, 6.5, 1.9, x * 3 + z);
    }
    for (const [x, z, a] of [[-35.5, -12, 1.1], [-25.3, -12.5, -1.1]]) { const g = G(x, z); const b = new THREE.BoxGeometry(4.0, 0.45, 0.6); b.rotateY(a); b.translate(x, g + 0.22, z); K.add(M.wood, b); }
  }

  // ---------- campus courtyard: disc canopy over the cafe terrace, stepped lawn terraces with seat walls, young trees ----------
  {
    const C = [31.8, 7.6], yP = FL[2];
    const pat = []; for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; pat.push([C[0] + Math.cos(t) * 9.0, C[1] + Math.sin(t) * 9.0]); }
    K.prism(paving, pat, Math.min(G(...C), yP) - 2.5, yP);
    const disc = new THREE.CylinderGeometry(8.0, 8.0, 0.55, 64); disc.translate(C[0], yP + 4.9, C[1]); K.add(mats.white, disc);
    for (let i = 0; i < 10; i++) { const t = (i + 0.5) / 10 * Math.PI * 2; const x = C[0] + Math.cos(t) * 6.7, z = C[1] + Math.sin(t) * 6.7; K.cyl(mats.white, x, yP, z, 0.11, 0.11, 4.7, 10); colliders.push({ type: 'cyl', x, z, r: 0.2, y0: yP - 1, y1: yP + 4.7 }); }
    // cafe tables (detail)
    for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2 + 0.2; const r = i % 2 ? 4.2 : 6.0; const x = C[0] + Math.cos(t) * r, z = C[1] + Math.sin(t) * r; if (inRing(x, z, fp)) continue; K.cyl(mats.white, x, yP, z, 0.45, 0.45, 0.06, 12, { detail: true }); K.cyl(mats.mull, x, yP, z, 0.04, 0.04, 0.74, 6, { detail: true }); K.box(mats.white, x - 0.45, yP + 0.73, z - 0.45, x + 0.45, yP + 0.76, z + 0.45, { detail: true }); }
    // terraces: annular sectors stepping down from the patio toward the campus path, clipped to the open courtyard
    const radii = [9.0, 12.8, 16.6, 20.4, 24.2];
    const tHeights = [];
    for (let k = 0; k < radii.length - 1; k++) {
      const r0 = radii[k], r1 = radii[k + 1]; const pos = []; const st = Math.PI / 90;
      let hMax = -Infinity; for (let t = 0; t < Math.PI * 2; t += st) { const rm = (r0 + r1) / 2; const x = C[0] + Math.cos(t) * rm, z = C[1] + Math.sin(t) * rm; if (inRing(x, z, fp) || distToRing(x, z, fp) < 1.3 || z > 31) continue; hMax = Math.max(hMax, G(x, z)); }
      const h = Math.max(yP - 0.45 * (k + 1), hMax + 0.08); tHeights.push(h);
      const keep = []; for (let t = 0; t < Math.PI * 2 - 1e-6; t += st) { const tm = t + st / 2, rm = (r0 + r1) / 2; const x = C[0] + Math.cos(tm) * rm, z = C[1] + Math.sin(tm) * rm; keep.push(!(inRing(x, z, fp) || distToRing(x, z, fp) < 1.3 || z > 31)); }
      for (let i = 0; i < keep.length; i++) {
        if (!keep[i]) continue; const ta = i * st, tb = ta + st;
        const p = (t, r) => [C[0] + Math.cos(t) * r, C[1] + Math.sin(t) * r];
        const [a0, a1, b0, b1] = [p(ta, r0), p(ta, r1), p(tb, r0), p(tb, r1)];
        pos.push(a0[0], h, a0[1], b0[0], h, b0[1], b1[0], h, b1[1], a0[0], h, a0[1], b1[0], h, b1[1], a1[0], h, a1[1]);
      }
      if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const uv = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3] * 0.5; uv[i * 2 + 1] = pos[i * 3 + 2] * 0.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); if (g.attributes.normal.getY(0) < 0) { for (let i = 0; i < pos.length; i += 9) { for (let j = 0; j < 3; j++) { const t = pos[i + 3 + j]; pos[i + 3 + j] = pos[i + 6 + j]; pos[i + 6 + j] = t; } } g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); } K.add(M.turf, g, { uvMode: 'keep' }); }
      // seat wall on the inner edge of each terrace (concrete), down to below grade
      for (let i = 0; i < keep.length; i++) {
        if (!keep[i]) continue; const ta = i * Math.PI / 90, tb = ta + Math.PI / 90;
        const A = [C[0] + Math.cos(ta) * r0, C[1] + Math.sin(ta) * r0], B = [C[0] + Math.cos(tb) * r0, C[1] + Math.sin(tb) * r0];
        const R = K.run(B, A); const top = Math.max(h + 0.05, (k === 0 ? yP : tHeights[k - 1]) + 0.0); K.rbox(R, M.concrete, -0.02, Math.min(G(...A), G(...B)) - 0.8, -0.35, R.L + 0.02, top, 0.0);
      }
    }
    walkables.push({ type: 'fn', bounds: [C[0] - 26, C[1] - 26, C[0] + 26, C[1] + 26], heightAt: (x, z) => { const r = Math.hypot(x - C[0], z - C[1]); if (inRing(x, z, fp) || z > 31) return null; if (r <= radii[0]) return yP; for (let k = 0; k < radii.length - 1; k++) if (r <= radii[k + 1]) return tHeights[k] ?? null; return null; } });
    // young trees in an arc on the middle terraces
    for (let i = 0; i < 8; i++) { const t = 0.5 + i * 0.29; const r = 19.1; const x = C[0] + Math.cos(t) * r, z = C[1] + Math.sin(t) * r; if (inRing(x, z, fp) || distToRing(x, z, fp) < 2.5 || z > 30) continue; const h = tHeights[2] ?? G(x, z); youngTree(K, mats, x, h, z, 6 + (i % 3) * 0.6, 1.9, i); colliders.push({ type: 'cyl', x, z, r: 0.25, y0: h - 1, y1: h + 3 }); }
  }

  // ---------- elevator to the roof terrace and back ----------
  interactions.push({ id: 'gateway-roof', pos: [-28.5, Y1 + 1.2, 12], radius: 3.5, label: 'Ride up to the Gateway rooftop terrace', teleport: [26, FL[5] + 0.2, -12] });
  interactions.push({ id: 'gateway-down', pos: [24, FL[5] + 1.2, -15], radius: 3.0, label: 'Take the elevator down to the Morgan Bikeway passage', teleport: [-28.5, Y1 + 0.2, 10] });
  colliders.push({ type: 'poly', pts: inset(TER, 0.4), y0: FL[5] - 0.1, y1: FL[5] + 1.2 });

  const object3d = K.finish(); object3d.name = 'the-gateway';
  return { object3d, colliders, walkables, interactions };
}
