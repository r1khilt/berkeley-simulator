// Moffitt Undergraduate Library (John Carl Warnecke, 1970). Floors 4–5 were renovated in 2016; floors 1–3 reopened in August 2026
// as BNIM's Carol T. Christ Center for Connected Learning (interior work plus a re-done south entry; the Brutalist shell is unchanged).
// Cast-in-place concrete on a slope that falls ~9 m from Memorial Glade (east) to the west lawn:
//  - west, north and south faces: stacked deep cantilevered balconies (flat concrete spandrel band, block spacers and a floating
//    top rail) over dark glass set ~2 m back, tapered downstand beams in the soffits, and a heavier roof slab that overhangs most;
//  - four solid stair towers (warmer concrete, deep punched windows) push out through the north and south faces and rise above
//    the roof line; a louvred penthouse sits on the roof;
//  - a podium terrace at the floor-3 level wraps the west side (recessed glazing behind square piers, facing a sunken court),
//    with a red slatted pergola; a walkway runs along the south face to the main entrance (floor 3), where bronze letters spell
//    JAMES K. MOFFITT UNDERGRADUATE LIBRARY over a dark storefront, beside the glazed Free Speech Movement Café;
//  - on the east a plaza deck at the floor-4 level (lightwell + stair) meets Memorial Glade; there the façade is flush: a glass
//    storey, a solid spandrel and a glass band. Press café's kiosk stands on that deck (replaces its procedural stand-in).
// Levels from the 2021 LiDAR (y=0 = lowest footprint ground): F2 0, F3 4.4, F4 8.8, F5 13.2, roof 17.55, towers 18.9, penthouse 21.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { curtain, penthouse } from './lib/b06-modern.js';
import { signText } from './lib/b03-kit.js';
import { nightGlow } from '../materials.js';

// building frame (u along the long axis, v across) -> landmark-local x/z, for the static site polygons below
const A16 = THREE.MathUtils.degToRad(-16), CA = Math.cos(A16), SA = Math.sin(A16);
const rectXZ = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [+(u * CA - v * SA).toFixed(2), +(u * SA + v * CA).toFixed(2)]);

export const info = {
  id: 'moffitt-undergraduate-library',
  name: 'Moffitt Undergraduate Library',
  subtitle: 'John Carl Warnecke · 1970 · renovated 2026',
  blurb: 'The undergraduate library beside Memorial Glade, linked underground to the Main Stacks. Its top two floors became a 24-hour study space in 2016, and its lower three floors reopened in August 2026 as the Carol T. Christ Center for Connected Learning, with an expanded Free Speech Movement Café at the south entrance.',
  replaces: ['w/24025027', 'way/24025027', 'w/1098756727'],
  // site work outside the OSM outline (east plaza deck with Press, its stairs, north deck): hide stand-ins + 2021 LiDAR trees here
  clear: [rectXZ(30.5, -17.5, 50.6, 12.5), rectXZ(30.5, 12.5, 38.5, 20.5), rectXZ(50.6, -7.5, 56.5, 7.5), rectXZ(-22, -31, 26, -23.9)],
};

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const tint = (base, hex, name) => { const m = base.clone(); m.color.set(hex); m.name = name; return m; };
  const std = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, ...(o.extra || {}) }); m.name = name; return m; };
  const C = tint(M.concrete, 0xd9d7d2, 'mfConc');          // cast-in-place concrete, weathered warm grey (~#a9a69f)
  const CT = tint(M.concrete, 0xddd6cd, 'mfTower');        // the stair towers read a touch warmer
  const CD = tint(M.concrete, 0xaaa8a3, 'mfConcDark');     // soffits, recesses, weathered parapets
  const GL = nightGlow(std(0x1f2325, 'mfGlass', { rough: 0.22, metal: 0.3, extra: { envMapIntensity: 1.1, emissive: 0xffd09a, emissiveIntensity: 1.1 } }), 1.0);
  const FR = std(0x3a322b, 'mfBronze', { rough: 0.45, metal: 0.7 });   // dark bronze anodised frames
  const GLP = nightGlow(std(0x46505a, 'mfGlassPodium', { rough: 0.1, metal: 0.25, extra: { envMapIntensity: 1.8, emissive: 0xffd09a, emissiveIntensity: 1.1 } }), 1.0); // shaded podium glazing still catches the sky
  const PG = std(0x3a3633, 'mfPergola', { rough: 0.55, metal: 0.5 });  // dark steel pergola frame
  const GRN = std(0x3d4f2c, 'mfPlant', { rough: 0.95 });
  const WOOD = M.wood;
  const colliders = [], walkables = [];
  const F3 = 4.4, F4 = 8.8, F5 = 13.2, SOF = 16.35, RT = 17.55, TP = 19.6, DECK_E = 8.7, DECK_N = 4.6;
  const GW = -17.2, GN = -17.3, GS = 17.3, GE = 31.5; // glass lines of the main block (deep in shadow behind the balconies)
  const BP4 = 2.1, BP5 = 2.6, BP = 2.35, RP = 3.85;                           // balcony / roof projection beyond the glass
  const TW = [[-17, -5], [16, 28]];                    // tower spans along u
  const TNv = -23.6, TSv = 22.8;                       // tower outer faces (north / south)
  const PU = -30.5, PS = 25.5, PN = -24.5;             // west podium edges; south walkway edge
  const rectCol = (u0, v0, u1, v1, y0, y1) => K.colPoly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], y0, y1);

  // ---------- helpers ----------
  const beams = (R, s0, s1, ySof, dEdge, h0, h1, pitch = 3.6, w = 0.45) => { // tapered downstand beams under a cantilever
    const n = Math.max(1, Math.round((s1 - s0) / pitch));
    for (let i = 0; i <= n; i++) {
      const s = Math.min(s1 - w / 2, Math.max(s0 + w / 2, s0 + (s1 - s0) * i / n));
      const sh = new THREE.Shape(); sh.moveTo(-0.3, ySof); sh.lineTo(-0.3, ySof - h0); sh.lineTo(dEdge, ySof - h1); sh.lineTo(dEdge, ySof); sh.lineTo(-0.3, ySof);
      const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(s + w / 2, 0, 0);
      K.addRun(R, C, g);
    }
  };
  // signature balcony: cantilevered slab, flat spandrel band, block spacers, floating rail in ~6 m segments, soffit beams.
  // e0/e1 extend band + rail past the run ends (corner wraps); slabExt extends the slab too.
  const balcony = (R, s0, s1, yF, { e0 = 0, e1 = 0, slabExt = false } = {}) => {
    const a = s0 - e0, b = s1 + e1; const BP = yF > F4 + 1 ? BP5 : BP4;
    K.rbox(R, C, slabExt ? a : s0, yF - 0.32, -0.3, slabExt ? b : s1, yF, BP - 0.27);
    const sn = Math.max(1, Math.round((b - a) / 6.5));
    for (let i = 0; i < sn; i++) { const p = a + (b - a) * i / sn, q = a + (b - a) * (i + 1) / sn; K.rbox(R, C, p + (i ? 0.02 : 0), yF - 0.62, BP - 0.34, q - (i < sn - 1 ? 0.02 : 0), yF + 0.55, BP); }
    K.rbox(R, CD, a, yF - 0.6, BP - 0.38, b, yF + 0.53, BP - 0.33); // back of the panel joints
    const bn = Math.max(1, Math.round((b - a) / 5.5));
    for (let i = 0; i < bn; i++) { // separate top blocks on short square posts, open gaps between
      const p = a + (b - a) * i / bn + (i ? 0.13 : 0), q = a + (b - a) * (i + 1) / bn - (i < bn - 1 ? 0.13 : 0);
      const up = yF > F4 + 1, yT = up ? yF + 0.98 : yF + 0.8;          // the top tier's balustrade is lighter and more open
      for (const f of (up ? [0.1, 0.3, 0.5, 0.7, 0.9] : [0.18, 0.5, 0.82])) { const s = p + (q - p) * f; K.rbox(R, C, s - 0.13, yF + 0.55, BP - 0.3, s + 0.13, yT, BP - 0.05, { detail: true }); }
      K.rbox(R, C, p, yT, BP - 0.38, q, up ? yT + 0.36 : yF + 1.3, BP + 0.03);
    }
    const ent = R === RS && yF < F4 + 1 && s0 > 5;                  // plain square beam ends over the entrance
    beams(R, s0, s1, yF - 0.32, BP - 0.36, ent ? 0.5 : 0.62, ent ? 0.5 : 0.45, 6, 0.4);
    if (R === RW) globes(R, s0, s1, yF - 0.32, 6, BP);
  };
  const globeGeo = new THREE.SphereGeometry(0.17, 10, 6);
  const globes = (R, s0, s1, ySof, pitch, proj = BP) => { // white globe pendants under the west soffits, one per beam bay
    const n = Math.max(1, Math.round((s1 - s0) / pitch));
    for (let i = 0; i < n; i++) { const s = s0 + (s1 - s0) * (i + 0.5) / n; const g = globeGeo.clone(); g.translate(s, ySof - 0.42, proj * 0.45); K.addRun(R, M.lampGlow, g, { detail: true }); K.rbox(R, M.iron, s - 0.01, ySof - 0.27, proj * 0.45 - 0.01, s + 0.01, ySof, proj * 0.45 + 0.01, { detail: true }); }
  };
  const profileRun = (R, mat, s0, s1, pts) => { // extrude a (d, y) profile along a run
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const [d, y] of pts.slice(1)) sh.lineTo(d, y); sh.lineTo(pts[0][0], pts[0][1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: s1 - s0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(s1, 0, 0); K.addRun(R, mat, g);
  };
  const glassStorey = (R, s0, s1, y0, y1, o = {}) => {
    curtain(K, R, s0, s1, y0, y1, [], { glass: GL, mull: o.mull ?? 1.5, mullMat: FR, mullD: 0.07, band: 0, recess: 0.06 });
    const n = Math.max(1, Math.round((s1 - s0) / 6)); for (let i = 1; i < n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, FR, s - 0.07, y0, -0.08, s + 0.07, y1, 0.06); }
    K.rbox(R, FR, s0, y0, -0.1, s1, y0 + 0.12, 0.05); K.rbox(R, CD, s0, y1, -0.3, s1, y1 + 0.45, -0.02); // sill + head/slab edge
  };
  const gAt = (R, s, d) => { const p = R.at(s, d); return K.g(p[0], p[1]); };
  const rail = (R, s0, s1, y, d = 0, h = 1.05) => { // dark metal railing: posts, top rail, mid rail
    const n = Math.max(1, Math.round((s1 - s0) / 1.6));
    for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, M.iron, s - 0.03, y, d - 0.03, s + 0.03, y + h, d + 0.03, { detail: true }); }
    K.rbox(R, M.iron, s0, y + h - 0.05, d - 0.04, s1, y + h, d + 0.04, { detail: true }); K.rbox(R, M.iron, s0, y + 0.45, d - 0.015, s1, y + 0.48, d + 0.015, { detail: true });
  };
  const parapetRail = (R, s0, s1, y) => { // podium / walkway edge: solid upstand + spacers + floating rail (same family as balconies)
    K.rbox(R, C, s0, y - 0.02, -0.32, s1, y + 0.62, 0);
    const n = Math.max(1, Math.round((s1 - s0) / 3)); for (let i = 0; i <= n; i++) { const s = Math.min(s1 - 0.13, Math.max(s0 + 0.13, s0 + (s1 - s0) * i / n)); K.rbox(R, C, s - 0.12, y + 0.62, -0.28, s + 0.12, y + 0.8, -0.06, { detail: true }); }
    K.rbox(R, C, s0, y + 0.8, -0.33, s1, y + 1.1, 0.01);
  };

  // ---------- main block ----------
  K.box(CD, GW + 0.35, -5, GN + 0.35, GE - 0.35, SOF, GS - 0.35); // inner mass (closes the volume, casts shadow)
  const RW = K.run([GW, GN], [GW, GS]);   // west, N→S, s = v - GN
  const RS = K.run([GW, GS], [GE, GS]);   // south, W→E, s = u - GW
  const RN = K.run([GE, GN], [GW, GN]);   // north, E→W, s = GE - u
  const RE = K.run([GE, GS], [GE, GN]);   // east, S→N, s = GS - v
  const sS = (u) => u - GW, sN = (u) => GE - u, sE = (v) => GS - v;
  // west face: three glazed storeys above the podium terrace, balconies on F4 and F5 wrapping both corners
  glassStorey(RW, 0, RW.L, F3, F4 - 0.4); glassStorey(RW, 0, RW.L, F4, F5 - 0.4); glassStorey(RW, 0, RW.L, F5, SOF);
  for (const y of [F4, F5]) { const P = y > F4 + 1 ? BP5 : BP4; balcony(RW, 0, RW.L, y, { e0: P, e1: P, slabExt: true }); }
  // north and south faces: balconied bays between the towers and stubs at the west corners; flush east-style ends
  const balBays = (R, sf) => [[sf(TW[0][1]), sf(TW[1][0])], R === RS ? [0, sf(TW[0][0])] : [sf(TW[0][0]), R.L]].map((p) => p.slice().sort((x, y) => x - y));
  for (const [R, sf] of [[RS, sS], [RN, sN]]) {
    for (const [s0, s1] of balBays(R, sf)) {
      const stubS = R === RS && s0 <= 0.01, stubN = R === RN && s1 >= R.L - 0.01;
      if (!(R === RS && s0 > 5 && s0 < 20)) glassStorey(R, s0, s1, F3, F4 - 0.4); // south middle bay at F3 = entrance (below)
      glassStorey(R, s0, s1, F4, F5 - 0.4); glassStorey(R, s0, s1, F5, SOF);
      for (const y of [F4, F5]) { const P = y > F4 + 1 ? BP5 : BP4; balcony(R, s0, s1, y, { e0: stubS ? P - 0.34 : 0, e1: stubN ? P - 0.34 : 0 }); }
    }
    // flush end bay toward the east face (u 28..31.5)
    const [e0, e1] = [sf(TW[1][1]), sf(GE)].sort((x, y) => x - y);
    glassStorey(R, e0, e1, F4, 12.6); K.rbox(R, C, e0, 12.6, -0.2, e1, 13.9, 0.12); glassStorey(R, e0, e1, 13.9, SOF);
    K.wall(R, C, e0, e1, -1.5, F4, [], 0.4);
  }
  // east face: flush — glass storey (F4, with doors), solid spandrel, glass band (F5); floor 3 shows only down the lightwell
  {
    const dS0 = sE(9), dS1 = sE(5);
    glassStorey(RE, 0, dS0, F4, 12.6); glassStorey(RE, dS1, RE.L, F4, 12.6);
    for (let i = 0; i < 4; i++) { const a = dS0 + (dS1 - dS0) * i / 4, b = a + (dS1 - dS0) / 4; K.rbox(RE, GL, a, F4, -0.12, b, F4 + 2.6, -0.06); K.rbox(RE, FR, a, F4, -0.06, a + 0.09, F4 + 2.6, 0.04); K.rbox(RE, FR, (a + b) / 2 - 0.2, F4 + 1.0, -0.02, (a + b) / 2 + 0.2, F4 + 1.05, 0.06, { detail: true }); }
    K.rbox(RE, FR, dS1 - 0.09, F4, -0.06, dS1, F4 + 2.6, 0.04); K.rbox(RE, FR, dS0, F4 + 2.6, -0.1, dS1, F4 + 2.75, 0.05); K.rbox(RE, GL, dS0, F4 + 2.75, -0.12, dS1, 12.6, -0.06);
    K.rbox(RE, FR, dS0 - 1.2, 11.7, 0, dS1 + 1.2, 11.9, 2.4);         // slim steel canopy on thin columns
    for (const s of [dS0 - 0.9, dS1 + 0.9]) K.rbox(RE, FR, s - 0.07, F4, 2.15, s + 0.07, 11.7, 2.29);
    K.rbox(RE, C, 0, 12.6, -0.2, RE.L, 13.9, 0.12);                 // continuous solid spandrel
    glassStorey(RE, 0, RE.L, 13.9, SOF);
    glassStorey(RE, 0, RE.L, F3, F4 - 0.3);
  }
  // ---------- roof slab (deep fascia, overhangs most on W/N/S), beams beneath, membrane, penthouse ----------
  const roofPoly = [[GW - RP, GN - RP], [GE + 0.8, GN - RP], [GE + 0.8, GS + RP], [GW - RP, GS + RP]];
  K.prism(C, roofPoly, SOF, RT - 0.45);
  K.prism(M.concreteDark, [[GW - RP + 0.35, GN - RP + 0.35], [GE + 0.45, GN - RP + 0.35], [GE + 0.45, GS + RP - 0.35], [GW - RP + 0.35, GS + RP - 0.35]], RT - 0.45, RT - 0.05);
  {
    const ring = [[GW - RP, GN - RP], [GW - RP, GS + RP], [GE + 0.8, GS + RP], [GE + 0.8, GN - RP]];
    for (let i = 0; i < 4; i++) { const R = K.run(ring[i], ring[(i + 1) % 4]); profileRun(R, C, 0, R.L, [[-0.9, RT - 0.47], [0, RT - 0.47], [-0.26, RT + 0.05], [-0.9, RT + 0.05]]); K.rbox(R, CD, 0, SOF + 0.2, 0.0, R.L, SOF + 0.25, 0.012, { detail: true }); }
    beams(RW, 0, RW.L, SOF, RP - 0.12, 0.95, 0.6, 6, 0.45); globes(RW, 0, RW.L, SOF, 6, RP);
    for (const [R, sf] of [[RS, sS], [RN, sN]]) for (const [s0, s1] of balBays(R, sf)) beams(R, s0, s1, SOF, RP - 0.12, 0.95, 0.6, 6, 0.45);
  }
  penthouse(K, [[4, -8], [16, -8], [16, 6], [4, 6]], RT - 0.05, 3.45, { mat: C, louvreMat: CD });
  K.box(C, 3.8, RT + 3.4, -8.2, 16.2, RT + 3.6, 6.2);
  K.box(C, 18, RT - 0.05, -6.5, 22, 19.2, -3);
  for (const [u, v] of [[-8, -12], [-2, 10], [24, 12], [26, -9], [-12, 2]]) K.box(CD, u - 0.6, RT - 0.05, v - 0.6, u + 0.6, RT + 0.7, v + 0.6, { detail: true });
  colliders.push(rectCol(GW, GN, GE, GS, -5, RT + 3.5));

  // ---------- the four stair towers: solid walls with deep punched windows, parapet above the roof ----------
  for (const [u0, u1] of TW) for (const south of [true, false]) {
    const vo = south ? TSv : TNv, vi = south ? 13 : -13;
    const v0 = Math.min(vo, vi), v1 = Math.max(vo, vi);
    K.box(CT, u0, -2, south ? v0 : v0 + 0.55, u1, TP, south ? v1 - 0.55 : v1);
    const R = south ? K.run([u0, vo], [u1, vo]) : K.run([u1, vo], [u0, vo]);
    const yb = Math.min(gAt(R, 2, 1), gAt(R, R.L - 2, 1), south ? F3 : DECK_N);
    const ops = [];
    const pat = south ? (u0 > 0 ? [[], [], []] : [[], [0.3, 0.72], [0.3, 0.55]]) : [[0.3, 0.74], [0.22, 0.58], [0.36, 0.74]]; // loose, staggered; the SE tower beside the entrance is blank
    [F3, F4, F5].forEach((yF, k) => { for (const f of pat[k]) { const c = R.L * f; ops.push({ s0: c - 0.65, s1: c + 0.65, y0: yF + 0.8, y1: yF + 3.0 }); } });
    K.wall(R, CT, 0, R.L, yb - 1.5, TP, ops, 0.55);
    for (const o of ops) K.fill(R, o, { rev: 0.42, mull: 0, glass: GL, frame: FR });
    K.rbox(R, CT, -0.05, TP - 0.02, -0.6, R.L + 0.05, TP + 0.08, 0.05);
    for (const y of [F3, F4, F5, RT - 0.4]) if (y > yb) K.rbox(R, CD, 0.02, y - 0.03, -0.01, R.L - 0.02, y + 0.03, 0.006, { detail: true }); // pour joints
    colliders.push(rectCol(u0, v0, u1, v1, -3, TP));
  }

  // ---------- south entrance (floor 3): three door pairs in a dark storefront under a lettered fascia (2026) ----------
  {
    const R = RS; const e0 = sS(TW[0][1]), e1 = sS(TW[1][0]);       // bay between the south towers (u -5..16)
    const dA = sS(-3.7), dB = sS(10.3);                                // storefront u -3.7..10.3
    K.rbox(R, C, e0, F3 - 0.5, -0.3, dA, F4 - 0.3, 0.1);               // plain flanking pier (left)
    K.rbox(R, C, dB, F3 - 0.5, -0.3, e1, F4 - 0.3, 0.1);               // solid wall to the right (ribbed near the doors)
    for (let s = dB + 0.25; s < dB + 2.2; s += 0.24) K.rbox(R, C, s - 0.05, F3 + 0.1, 0.1, s + 0.05, 7.25, 0.18, { detail: true });
    const DW = 1.9, PW = (dB - dA - 3 * DW - 1.1) / 4;                // door pairs, black panels, sidelight
    const lobby = nightGlow(std(0xe8e2d6, 'mfLobbyLight', { rough: 0.6, extra: { emissive: 0xfff2dc, emissiveIntensity: 1.3 } }), 0.6);
    K.rbox(R, M.paving, dA, F3 - 0.05, -9, dB, F3 + 0.01, -0.3);       // lobby floor seen through the doors
    K.rbox(R, CD, dA, 7.4, -9, dB, 7.5, -0.3);                         // lobby ceiling
    for (let k = 0; k < 4; k++) K.rbox(R, lobby, dA + 0.5, 7.36, -1.2 - k * 2, dB - 0.5, 7.4, -1.0 - k * 2); // linear ceiling lights
    K.rbox(R, CD, dA, F3, -9.1, dB, 7.5, -9);                          // back wall
    let s = dA;
    for (let i = 0; i < 4; i++) {
      K.rbox(R, FR, s, F3, -0.32, s + PW, 7.3, -0.18); s += PW;         // solid black panel
      if (i < 3) { // a pair of glazed leaves in black frames
        const a = s, b = s + DW, m = (a + b) / 2;
        K.rbox(R, M.glassLight, a, F3 + 0.02, -0.3, b, 7.0, -0.26, { detail: true });
        for (const q of [a, m, b]) K.rbox(R, FR, q - 0.05, F3, -0.33, q + 0.05, 7.0, -0.19);
        for (const q of [a + 0.04, b - 0.04]) K.rbox(R, FR, q - 0.03, F3, -0.33, q + 0.03, 7.0, -0.19); 
        K.rbox(R, FR, a, F3, -0.33, b, F3 + 0.12, -0.19);
        for (const q of [m - 0.22, m + 0.22]) K.rbox(R, M.iron, q - 0.02, F3 + 0.9, -0.2, q + 0.02, F3 + 2.1, -0.12, { detail: true });
        K.rbox(R, FR, a, 7.0, -0.33, b, 7.3, -0.18);                    // dark transom band with closers
        s = b;
      }
    }
    K.rbox(R, M.glassLight, s, F3 + 0.02, -0.3, dB, 7.0, -0.26, { detail: true }); K.rbox(R, FR, s, 7.0, -0.33, dB, 7.3, -0.18); K.rbox(R, FR, dB - 0.08, F3, -0.33, dB, 7.3, -0.19); // sidelight
    K.rbox(R, C, dA - 0.3, 7.3, -0.25, dB + 0.3, F4 - 0.32, 0.08);     // recessed fascia (~1.2 m) over the doors
    signText(K, R, 'JAMES K. MOFFITT UNDERGRADUATE LIBRARY', (dA + dB) / 2, 7.68, 0.44, { color: '#7a6448', metal: 0.25, rough: 0.5, d: 0.095, font: 'Georgia, "Times New Roman", serif', weight: '700', spacing: 0.15 });
    // continuous concrete sidewalk in front of the doors (flush threshold)
    const SW = tint(M.concrete, 0xfaf7f1, 'mfWalk');
    const ga = Math.max(F3, K.gMax(2.5, GS, 16, GS + 9, 8)) + 0.02;
    K.box(SW, 2.5, ga - 0.4, GS, 16, ga, GS + 9);
    for (let k = 1; k < 6; k++) K.box(CD, 2.5, ga, GS + k * 1.5 - 0.01, 16, ga + 0.004, GS + k * 1.5 + 0.01, { detail: true });
    walkables.push(K.walkPoly([[2.5, GS], [16, GS], [16, GS + 9], [2.5, GS + 9]], ga));
  }

  // ---------- podium terrace (floor-3 level) on the west, walkway along the south, deck along the north ----------
  {
    // west podium: floors 1–2 recessed behind square piers, deep terrace slab, solid upstand + rail
    K.box(CD, PU + 3.0, -5, PN, GW + 0.4, F3 - 1.8, PS - 3.0);
    const RPw = K.run([PU + 3.0, PN], [PU + 3.0, PS - 3.0]);
    curtain(K, RPw, 0, RPw.L, -4.4, F3 - 1.85, [0], { glass: GLP, mull: 1.8, mullMat: FR, band: 0.25, bandMat: FR, bandD: 0.03, recess: 0.0 });
    K.box(C, PU, F3 - 1.8, PN, GW, F3 - 0.03, PS); K.box(M.paving, PU + 0.4, F3 - 0.03, PN, GW, F3, PS - 0.01);
    for (let v = PN + 4.0; v <= PS - 2.5; v += 7.5) { K.box(C, PU + 1.9, -5, v - 0.4, PU + 2.7, F3 - 1.8, v + 0.4); K.box(C, PU + 0.25, F3 - 2.25, v - 0.32, PU + 1.9, F3 - 1.8, v + 0.32); K.box(C, PU + 0.9, F3 - 2.7, v - 0.32, PU + 1.9, F3 - 2.25, v + 0.32); colliders.push(K.colCyl(PU + 2.3, v, 0.5, -5, F3)); }
    for (const u of [PU + 4.5, PU + 11.0]) K.box(C, u - 0.35, -5, PS - 2.7, u + 0.35, F3 - 1.8, PS - 2.0);
    const RPe = K.run([PU, PN], [PU, PS]); // podium edge (west-facing), open at the SW stair
    K.rbox(RPe, CD, 0, F3 - 0.02, -0.4, RPe.L, F3 + 1.3, 0); K.rbox(RPe, C, -0.03, F3 + 1.3, -0.45, RPe.L + 0.03, F3 + 1.42, 0.05);
    // podium south face (floors 1–2 recessed behind piers)
    const RPs = K.run([PU + 3.0, PS - 3.0], [GW + 0.4, PS - 3.0]);
    curtain(K, RPs, 0, RPs.L, -2, F3 - 1.85, [0], { glass: GLP, mull: 1.8, mullMat: FR, band: 0.25, bandMat: FR, bandD: 0.03, recess: 0.0 });
    // south walkway (east of the podium) to the entrance: solid slab, parapet where the lawn falls away
    K.box(C, GW, -5, GS, 2.5, F3 - 0.03, PS); K.box(CD, GW, F3 - 0.03, GS, 2.5, F3, PS);
    const RWk = K.run([PU, PS], [2.5, PS]);
    let sEnd = RWk.L; for (let s = 0; s <= RWk.L; s += 0.5) if (gAt(RWk, s, 1.2) > F3 - 0.7) { sEnd = s; break; }
    parapetRail(RWk, 0, Math.max(4, sEnd), F3);
    // planters on the terrace
    for (const [u0, v0, u1, v1] of [[-29.6, -21.5, -25.6, -16.5], [-29.6, 11.5, -25.6, 16.5], [-24.5, -23.6, -19.8, -21.4]]) { K.box(C, u0, F3, v0, u1, F3 + 0.7, v1); K.box(M.soil, u0 + 0.15, F3 + 0.66, v0 + 0.15, u1 - 0.15, F3 + 0.7, v1 - 0.15, { detail: true }); for (let k = 0; k < 4; k++) { const g = new THREE.IcosahedronGeometry(0.75 + 0.2 * (k % 2), 1); g.scale(1, 0.7, 1); g.translate(u0 + 0.9 + (k % 2) * (u1 - u0 - 1.8), F3 + 0.95, v0 + 1 + Math.floor(k / 2) * (v1 - v0 - 2)); K.add(GRN, g, { detail: true }); } colliders.push(rectCol(u0, v0, u1, v1, F3 - 0.5, F3 + 0.7)); }
    // red slatted pergola over the middle of the terrace
    { const u0 = -29.4, u1 = -21.6, v0 = -7.5, v1 = 7.5, y1 = 7.9;
      for (const u of [u0 + 0.3, u1 - 0.3]) for (let k = 0; k < 4; k++) { const v = v0 + 0.3 + k * (v1 - v0 - 0.6) / 3; K.box(PG, u - 0.1, F3, v - 0.1, u + 0.1, y1 - 0.45, v + 0.1); colliders.push(K.colCyl(u, v, 0.25, F3, y1)); }
      for (const u of [u0 + 0.3, u1 - 0.3]) K.box(PG, u - 0.12, y1 - 0.45, v0, u + 0.12, y1 - 0.2, v1);
      for (let k = 0; k <= 6; k++) { const v = v0 + (v1 - v0) * k / 6; K.box(PG, u0 - 0.3, y1 - 0.2, v - 0.06, u1 + 0.3, y1, v + 0.06); }
      K.box(M.glassLight, u0 - 0.3, y1 + 0.0, v0, u1 + 0.3, y1 + 0.03, v1, { detail: true }); }
    // north deck over the loading dock: slab, north face with dock doors, parapets
    const NE0 = -22, NE1 = 26, NV = -30.5;
    K.box(C, NE0, -5, NV, NE1, DECK_N, GN);
    const RNd = K.run([NE1, NV], [NE0, NV]);
    parapetRail(RNd, 0, RNd.L, DECK_N);
    for (const s of [10, 15, 30]) { const g = gAt(RNd, s, 1); if (DECK_N - g < 3.9) continue; K.rbox(RNd, CD, s - 2, g - 0.1, 0.0, s + 2, g + 3.4, 0.02); K.rbox(RNd, C, s - 2.2, g + 3.4, 0, s + 2.2, g + 3.7, 0.1); }
    for (const [a, b] of [[[NE0, NV], [NE0, GN]], [[NE1, GN], [NE1, NV]]]) { const R = K.run(a, b); parapetRail(R, 0, R.L, DECK_N); }
    walkables.push(K.walkPoly([[PU, PN], [GW, PN], [GW, PS], [PU, PS]], F3));
    walkables.push(K.walkPoly([[GW, GS], [2.5, GS], [2.5, PS], [GW, PS]], F3));
    walkables.push(K.walkPoly([[NE0, NV], [NE1, NV], [NE1, GN], [NE0, GN]], DECK_N));
    colliders.push(rectCol(PU, PN, GW, PS, -5, F3 - 0.05));
    colliders.push(rectCol(GW, GS, 2.5, PS, -5, F3 - 0.05));
    colliders.push(rectCol(NE0, NV, NE1, GN, -5, DECK_N - 0.05));
    // stair from the walkway down to the west lawn
  }

  // ---------- east plaza deck at the floor-4 level, lightwell with stair, steps to the south plaza and Memorial Glade ----------
  {
    const u0 = GE, u1 = 50.5, v0 = -17, v1 = 12, L0 = GE, L1 = 45.5, W0 = -4.2, W1 = 4.2, yF = DECK_E;
    const slabs = [[u0, v0, u1, W0], [u0, W1, u1, v1], [L1, W0, u1, W1]];
    for (const [a, b, c, d] of slabs) { K.box(C, a, 2.5, b, c, yF - 0.04, d); K.box(M.paving, a, yF - 0.04, b, c, yF, d); walkables.push(K.walkPoly([[a, b], [c, b], [c, d], [a, d]], yF)); colliders.push(rectCol(a, b, c, d, -2, yF - 0.05)); }
    // lightwell against the façade: walls, floor at floor 3, stair along its south side, railings
    K.box(M.paving, L0, F3 - 0.3, W0, L1, F3 + 0.02, W1); walkables.push(K.walkPoly([[L0, W0], [L1, W0], [L1, W1 - 1.9], [L0, W1 - 1.9]], F3 + 0.02));
    for (const [a, b] of [[[L0, W0], [L1, W0]], [[L1, W0], [L1, W1]], [[L1, W1], [L0, W1]]]) { const R = K.run(a, b); K.rbox(R, CD, 0, F3 - 0.3, 0, R.L, yF - 0.05, 0.25); }
    walkables.push(K.stairs(C, L0 + 0.6, W1 - 1.9, L1, W1 - 0.25, F3 + 0.02, yF, '+u', Math.round((yF - F3) / 0.165)));
    for (const [a, b] of [[[L0, W0], [L1, W0]], [[L1, W0], [L1, W1 - 2.0]], [[L1 - 0.1, W1], [L0, W1]]]) { const R = K.run(a, b); K.rbox(R, C, 0, yF - 0.02, -0.25, R.L, yF + 0.18, 0.05); rail(R, 0.1, R.L - 0.1, yF + 0.18, -0.12, 0.9); }
    // deck edges: concrete fascia + railing where the ground falls away
    const RSd = K.run([u0 + 7, v1], [u1, v1]); K.rbox(RSd, C, 0, 2.5, -0.3, RSd.L, yF + 0.15, 0.02); rail(RSd, 0, RSd.L, yF + 0.15, -0.15);
    const RNd2 = K.run([u1, v0], [u0, v0]); K.rbox(RNd2, C, 0, 2.5, -0.3, RNd2.L, yF + 0.15, 0.02); rail(RNd2, 0.5, RNd2.L - 0.5, yF + 0.15, -0.15);
    // stair down to the south plaza (beside the building's SE corner)
    { const g = K.g(35.5, v1 + 7); const n = Math.max(3, Math.round((yF - g) / 0.16)); walkables.push(K.stairs(C, u0 + 1.2, v1, u0 + 6.2, v1 + n * 0.3, g, yF, '-v', n)); }
    // broad steps east to Memorial Glade
    { const g = Math.min(K.g(u1 + 4, -6), K.g(u1 + 4, 6)); const n = Math.max(2, Math.round((yF - g) / 0.16)); if (yF - g > 0.25) walkables.push(K.stairs(C, u1, -7, u1 + n * 0.33, 7, g, yF, '-u', n)); }
    // planters and timber benches on the deck
    for (const [a, b] of [[37, 7.5], [43, 7.5], [48, -1]]) { K.box(C, a - 1.2, yF, b - 1.2, a + 1.2, yF + 0.55, b + 1.2); K.box(GRN, a - 1.05, yF + 0.55, b - 1.05, a + 1.05, yF + 0.75, b + 1.05, { detail: true }); colliders.push(rectCol(a - 1.2, b - 1.2, a + 1.2, b + 1.2, yF - 0.5, yF + 0.55)); }
    for (const [a, b] of [[38, -8], [42, -8], [48, 9.5]]) K.box(WOOD, a - 1.1, yF, b - 0.3, a + 1.1, yF + 0.45, b + 0.3, { detail: true });
    // Press café kiosk on the deck (NE corner): timber-clad box, glazed service front, flat overhanging roof, tables
    { const a = 41.5, b = -16.2, c = 47.8, d = -10.2, h = yF + 3.3;
      K.box(WOOD, a, yF, b, c, h, d);
      const R = K.run([a, d], [c, d]); K.rbox(R, GL, 0.6, yF + 0.95, 0.0, R.L - 0.6, yF + 2.6, 0.04); K.rbox(R, FR, 0.5, yF + 0.9, 0.0, R.L - 0.5, yF + 1.05, 0.5);
      K.box(FR, a - 0.8, h, b - 0.6, c + 0.8, h + 0.25, d + 1.4);
      signText(K, R, 'PRESS', R.L / 2, yF + 2.95, 0.42, { color: '#f2efe6', metal: 0.0, rough: 0.6, d: 0.06, font: 'Helvetica, Arial, sans-serif', weight: '700', spacing: 0.12 });
      colliders.push(rectCol(a, b, c, d, yF - 1, h + 0.3));
      for (const [x, z] of [[40.5, -6.5], [44.5, -6.0]]) { K.cyl(M.iron, x, yF, z, 0.04, 0.04, 0.72, 6, { detail: true }); K.cyl(WOOD, x, yF + 0.72, z, 0.45, 0.45, 0.04, 12, { detail: true }); }
    }
  }

  const object3d = K.finish(); object3d.name = 'moffitt-undergraduate-library';
  return { object3d, colliders, walkables };
}
