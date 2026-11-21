// Evans Manor — the former Barrington Hall (2315 Dwight Way), the legendary Berkeley Student Cooperative house (1935–1990),
// built as the Lafayette apartment hotel and now private apartments. A long four-storey flat-roofed block of cream stucco,
// with shallow projecting window bays along both sides, paired double-hung sash windows, a coped parapet, rooftop stair
// and machinery penthouses, and a Dwight Way front with a recessed centre bay of stacked balconies.
// Massing from the 2021 LiDAR: roof ≈12.5 m, penthouses to ≈16 m.
import * as THREE from 'three';
import { Kit, pal, wing, facade, rail, roof } from './lib/b08a-kit.js';
import { signMat, runSign, shrubRow, fdc, bikeRack, charcoalMat } from './lib/rsw-site.js';

export const info = {
  id: 'evans-manor',
  name: 'Evans Manor (Barrington Hall)',
  subtitle: '2315 Dwight Way',
  blurb: 'Barrington Hall was one of the largest and most famous houses of the Berkeley Student Cooperative from 1935 until 1990; the building is now private apartments known as Evans Manor.',
  replaces: ['w/306071491'],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-9.2)); const M = ctx.M; const P = pal(ctx);
  const ST = M.stuccoWhite.clone(); ST.color = new THREE.Color(0xfaf1dc); const FR = P.trimWhite;
  const Y0 = -1.5, G = 0.55, TOP = 12.25; const fl = [G, G + 3.0, G + 5.9, G + 8.8];
  const pairWins = (L, nb, opts = {}) => { const out = []; const bw = L / nb;
    for (let i = 0; i < nb; i++) { if (opts.skip?.includes(i)) continue; const c = bw * (i + 0.5);
      fl.forEach((y, k) => { for (const sx of [-1, 1]) { const s = c + sx * 0.48; out.push({ s0: s - 0.4, s1: s + 0.4, y0: y + 0.85, y1: y + 2.4, mull: 2, tran: 0.5 }); } }); }
    return out; };
  const colliders = [], walkables = [];
  // main block (u: west→east, v: north→south; Dwight Way is to the south)
  const u0 = -7.79, u1 = 8.3, v0 = -38.5, v1 = 37.47;
  const runs = wing(K, { u0, u1, v0, v1, y0: Y0, y1: TOP, mat: ST, depth: 0.22, frame: FR, sillMat: ST,
    faces: {
      W: (R) => pairWins(R.L, 21), E: (R) => pairWins(R.L, 21),
      N: (R) => pairWins(R.L, 4),
      S: (R) => { const L = R.L; const out = []; // Dwight Way front (camera-left = east end): triple + single window, recessed loggia stack, single, wide three-part group
        fl.forEach((y) => { out.push({ s0: 1.0, s1: 2.9, y0: y + 0.85, y1: y + 2.4, mull: 1, tran: 0.5 }); out.push({ s0: 3.7, s1: 4.4, y0: y + 1.2, y1: y + 2.2, mull: 0, tran: 0 });
          out.push({ s0: 9.3, s1: 10.0, y0: y + 0.85, y1: y + 2.4, mull: 0, tran: 0.5 }); out.push({ s0: 10.9, s1: 15.3, y0: y + 0.8, y1: y + 2.45, mull: 2, tran: 0 }); });
        out.push({ s0: 5.9, s1: 8.4, y0: G - 0.2, y1: TOP - 0.7, noFill: true });
        return out; },
    }, plinth: { h: G + 0.05, mat: P.concreteBuff, out: 0.05 } });
  // parapet + coping (flat roof)
  roof(K, { type: 'flat', u0, u1, v0, v1, y: TOP + 0.35, ovFlat: 0.5, slab: P.trimWhite });  // thin projecting flat eave
  K.box(ST, u0 + 0.05, TOP - 0.3, v0 + 0.05, u1 - 0.05, TOP + 0.1, v1 - 0.05);
  // recessed Dwight Way balcony bay: back wall, slabs and railings
  { const R = runs.S; const L = R.L; const s0 = 5.9, s1 = 8.4, D = 2.0;
    K.rbox(R, ST, s0, Y0, -D - 0.3, s1, TOP - 0.7, -D);
    for (const s of [s0, s1]) K.rbox(R, ST, s - 0.15, Y0, -D, s + 0.15, TOP - 0.7, -0.3);
    fl.forEach((y, k) => {
      // French door + window on the back wall
      K.rbox(R, M.windowNight, s0 + 0.35, y + 0.05, -D + 0.01, s0 + 1.25, y + 2.3, -D + 0.04, { uvMode: 'keep' });
      K.rbox(R, FR, s0 + 0.3, y + 2.3, -D + 0.01, s0 + 1.3, y + 2.38, -D + 0.08, { detail: true });
      if (k > 0) { K.rbox(R, ST, s0 - 0.05, y - 0.22, -D, s1 + 0.05, y, 0.35); rail(K, R, P.trimWhite, s0 + 0.05, s1 - 0.05, y, 0.28, 1.0, 0.13); }
    });
    K.rbox(R, ST, s0, TOP - 0.7, -D, s1, TOP + 0.1, 0.0);
    // entrance steps at grade
    const g = K.g(...R.at(L / 2, 1.5)); K.rbox(R, P.concreteBuff, s0 + 0.3, g - 0.6, 0, s1 - 0.3, G, 0.9);
  }
  // shallow projecting window bays along the sides (from the footprint)
  const bays = [[-8.67, u0, -17.69, -8.49], [u1, 9.1, -17.68, -8.48], [u1, 9.11, 6.71, 16.35], [-8.66, u0, 5.54, 13.82], [-10.73, u0, 13.82, 25.6]];
  for (const [a0, a1, b0, b1] of bays) {
    const west = a0 < 0; const deep = a1 - a0 > 1.5;
    wing(K, { u0: a0, u1: a1 + (west ? 0.2 : 0), v0: b0, v1: b1, y0: Y0, y1: TOP, mat: ST, depth: 0.28, frame: FR, sillMat: P.trimCream, core: false,
      faces: { [west ? 'E' : 'W']: false, N: deep ? (R) => fl.map((y) => ({ s0: R.L / 2 - 0.45, s1: R.L / 2 + 0.45, y0: y + 0.85, y1: y + 2.4, mull: 0, tran: 0.5 })) : [], S: deep ? (R) => fl.map((y) => ({ s0: R.L / 2 - 0.45, s1: R.L / 2 + 0.45, y0: y + 0.85, y1: y + 2.4, mull: 0, tran: 0.5 })) : [],
        [west ? 'W' : 'E']: (R) => { const nb = Math.max(1, Math.round(R.L / 3.0)); const out = []; const bw = R.L / nb; for (let i = 0; i < nb; i++) { const c = bw * (i + 0.5); fl.forEach((y) => out.push({ s0: c - 0.75, s1: c + 0.75, y0: y + 0.85, y1: y + 2.4, mull: 1, tran: 0.5 })); } return out; } } });
    K.box(P.trimWhite, Math.min(a0, a1) - 0.5, TOP + 0.1, b0 - 0.5, Math.max(a0, a1) + 0.5, TOP + 0.35, b1 + 0.5);
    colliders.push(K.colPoly([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], -2, TOP + 1));
  }
  // refine-south-west: Dwight Way entrance per photos — "Evans Manor" maroon serif letters over reddish-brown glazed double
  // doors in the recess, pipe handrails at the steps, wall lanterns, iron grilles on the ground-floor windows, FDC, planting
  { const R = runs.S; const s0 = 5.9, s1 = 8.4, D = 2.0, sc = (s0 + s1) / 2; const dk = charcoalMat(M);
    const doorF = new THREE.MeshStandardMaterial({ color: 0x7b4b3a, roughness: 0.6 }); doorF.name = 'evansDoor';
    K.rbox(R, doorF, sc - 0.95, G, -D + 0.02, sc + 0.95, G + 2.55, -D + 0.09);
    for (const sg of [-1, 1]) K.rbox(R, M.windowNight, sc + sg * 0.47 - 0.33, G + 0.35, -D + 0.09, sc + sg * 0.47 + 0.33, G + 2.2, -D + 0.1, { uvMode: 'keep' });
    K.rbox(R, M.iron, sc - 0.12, G + 1.0, -D + 0.1, sc - 0.08, G + 1.4, -D + 0.16, { detail: true }); K.rbox(R, M.iron, sc + 0.08, G + 1.0, -D + 0.1, sc + 0.12, G + 1.4, -D + 0.16, { detail: true });
    runSign(K, R, signMat(M, 'Evans Manor', { bg: null, fg: '#6e2b2b', font: 'bold', size: 0.62, track: 0.02, family: 'Georgia, "Times New Roman", serif' }), sc, G + 2.62, 2.3, 0.4, -D + 0.04);
    for (const s of [s0 + 0.05, s1 - 0.05]) K.rbox(R, M.lampGlow, s - 0.09, G + 2.3, -0.32, s + 0.09, G + 2.6, -0.2, { detail: true });
    const g = K.g(...R.at(sc, 1.5));
    for (const s of [s0 + 0.4, s1 - 0.4]) { K.rbox(R, dk, s - 0.02, G + 0.9, 0.0, s + 0.02, G + 0.94, 0.9, { detail: true }); K.rbox(R, dk, s - 0.02, g, 0.85, s + 0.02, G + 0.94, 0.89, { detail: true }); }
    // grilles on the street-front ground-floor windows
    for (const [a, b] of [[1.0, 2.9], [3.7, 4.4], [9.3, 10.0], [10.9, 15.3]]) {
      for (let x = a + 0.06; x < b - 0.02; x += 0.13) K.rbox(R, dk, x - 0.012, G + 0.8, 0.04, x + 0.012, G + 2.45, 0.065, { detail: true });
      for (const y of [G + 1.2, G + 2.05]) K.rbox(R, dk, a - 0.03, y - 0.015, 0.035, b + 0.03, y + 0.015, 0.07, { detail: true });
    }
    fdc(K, R, 16.2, g);
    shrubRow(K, R, 0.3, 5.5, 0.7, (ss, dd) => K.g(...R.at(ss, dd)), { r: 0.5, gap: 0.9, seed: 5 }); shrubRow(K, R, 8.9, R.L - 0.3, 0.7, (ss, dd) => K.g(...R.at(ss, dd)), { r: 0.5, gap: 0.95, seed: 9 });
  }
  // rooftop penthouses (stairs / machinery) from the LiDAR
  for (const [a0, a1, b0, b1, h] of [[-6.9, 7.4, -36.3, -32.6, 3.4], [-6.9, 7.4, -22.6, -18.2, 2.9], [1.5, 7.4, -4.6, -1.0, 2.0]]) {
    K.box(ST, a0 + 1.2, TOP - 0.3, b0, a1 - 1.2, TOP + h, b1);
    K.box(P.trimWhite, a0 + 1.1, TOP + h, b0 - 0.1, a1 - 1.1, TOP + h + 0.12, b1 + 0.1);
  }
  colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], -2, TOP + 1));
  const object3d = K.finish(); object3d.name = info.id;
  return { object3d, colliders, walkables };
}
