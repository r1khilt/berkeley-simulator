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
import { nightGlow, textures, TEX_M } from '../materials.js';
import { adoptPBR } from '../world/pbr.js'; // r4: board-formed concrete set for the towers

// building frame (u along the long axis, v across) -> landmark-local x/z, for the static site polygons below
const A16 = THREE.MathUtils.degToRad(-16), CA = Math.cos(A16), SA = Math.sin(A16);
const rectXZ = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [+(u * CA - v * SA).toFixed(2), +(u * SA + v * CA).toFixed(2)]);

export const info = {
  id: 'moffitt-undergraduate-library',
  name: 'Moffitt Undergraduate Library',
  subtitle: 'John Carl Warnecke · 1970 · renovated 2026',
  blurb: 'The undergraduate library beside Memorial Glade, linked underground to the Main Stacks. Its top two floors became a 24-hour study space in 2016, and its lower three floors reopened in August 2026 as the Carol T. Christ Center for Connected Learning, with an expanded Free Speech Movement Café at the south entrance.',
  replaces: ['w/24025027', 'way/24025027', 'w/1098756727', 'r/21101303'], // r4: + the Main Stacks vent stand-in east of the deck
  // site work outside the OSM outline (east plaza deck with Press, its stairs, north deck): hide stand-ins + 2021 LiDAR trees here
  clear: [rectXZ(1.5, 32.5, 10.5, 41.5), /* r4: the tree in front of the doors */ rectXZ(30.5, -17.5, 50.6, 12.5), rectXZ(30.5, 12.5, 38.5, 20.5), rectXZ(50.6, -7.5, 56.5, 7.5), rectXZ(-22, -31, 26, -23.9)],
};

// r4: black perforated metal (Press kiosk): per-face "pixel gradient" of round holes, densest low in the middle and
// fading to the corners (photos). The white-lit interior shows through the holes, so they read as light dots by day
// and glow warm at night; the sheet itself has a satin metallic sheen.
let _perf = null, _perfTile = null;
function perfCanvas(tile) {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const e = document.createElement('canvas'); e.width = W; e.height = H; const ge = e.getContext('2d');
  g.fillStyle = '#26272a'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  g.fillStyle = '#34363a'; g.fillRect(0, H * 0.5 - 1, W, 2);                                   // mid-height panel seam
  for (let y = 4; y < H; y += 8) for (let x = 4 + ((y / 8) % 2) * 4; x < W; x += 8) {
    const dx = (x / W - 0.5) * 1.6, dy = (y / H - 0.68) * 1.9, k = tile ? 0.55 + 0.25 * Math.sin(x * 0.07) * Math.cos(y * 0.09) : Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    const r = 0.4 + 3.1 * k; if (r < 0.7) continue;
    g.fillStyle = `rgb(${150 + 60 * k | 0},${148 + 58 * k | 0},${140 + 55 * k | 0})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    ge.fillStyle = '#fff'; ge.beginPath(); ge.arc(x, y, r, 0, 7); ge.fill();
  }
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e);
  for (const x of [t, te]) { x.colorSpace = THREE.SRGBColorSpace; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; }
  const m = nightGlow(new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, emissive: 0xffc68a, emissiveMap: te, emissiveIntensity: 1.1, roughness: 0.38, metalness: 0.6, envMapIntensity: 1.4 }), 1.0);
  m.name = tile ? 'mfPerfTile' : 'mfPerf'; return m;
}
function perfMetal(tile = false) { if (tile) return _perfTile || (_perfTile = perfCanvas(true)); return _perf || (_perf = perfCanvas(false)); }

// r4: ivy cover (leafy canvas, darker undersides) for the vent wall beside Press
let _ivy = null;
function ivyMat() {
  if (_ivy) return _ivy;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#1a2614'; g.fillRect(0, 0, S, S); let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 2600; k++) { const x = r() * S, y = r() * S, w = 3 + r() * 6; const l = r(); g.fillStyle = l < 0.3 ? '#2b4320' : l < 0.7 ? '#40612b' : '#628341'; g.beginPath(); g.ellipse(x, y, w, w * 0.7, r() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  _ivy = new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, roughness: 0.9 }); _ivy.name = 'mfIvy'; return _ivy;
}

// r4: the shared concrete map shows a small regular panel grid that read as CMU on the big blank towers; the towers,
// pylon and vent get the CC0 board-formed concrete set instead (falls back to the procedural concrete with ?pbr=0)
let _bc = null;
function boardConc() {
  if (_bc) return _bc;
  const T = textures().concrete;
  _bc = { map: T.map.clone(), normalMap: T.normalMap && T.normalMap.clone(), roughnessMap: T.roughnessMap && T.roughnessMap.clone() };
  adoptPBR('mfBoardConc', _bc, [190, 187, 180], TEX_M, 'boardconc');
  return _bc;
}

// r4: newspaper front pages for the display cases (masthead, headline, photo block, columns)
let _news = null;
function newsMat() {
  if (_news) return _news;
  const W = 128, H = 96, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#ece8df'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1d1d'; g.fillRect(8, 6, 112, 9);
  g.fillStyle = '#333'; g.fillRect(8, 20, 70, 5); g.fillStyle = '#7d8a96'; g.fillRect(84, 20, 36, 26);
  g.fillStyle = '#8a8a8a'; for (let col = 0; col < 3; col++) for (let y = 30; y < 90; y += 3) if (!(col === 2 && y < 48)) g.fillRect(8 + col * 38, y, 34, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  _news = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); _news.name = 'mfNews'; return _news;
}

export async function build(ctx) {
  const K = new Kit(ctx, THREE.MathUtils.degToRad(-16)); const M = ctx.M;
  const tint = (base, hex, name) => { const m = base.clone(); m.color.set(hex); m.name = name; return m; };
  const std = (hex, name, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: hex, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, ...(o.extra || {}) }); m.name = name; return m; };
  const C = tint(M.concrete, 0xa8abaf, 'mfConc');          // cast-in-place concrete: neutral light grey (the shared map is warm, so the tint leans cool)
  const CT = tint(M.concrete, 0xaaabac, 'mfTower');        // the stair towers read a touch warmer / board-marked
  for (const m of [C, CT]) { const bc = boardConc(); m.map = bc.map; if (bc.normalMap) m.normalMap = bc.normalMap; if (bc.roughnessMap) m.roughnessMap = bc.roughnessMap; } // board-formed, no panel grid
  const CD = tint(M.concrete, 0x7f8388, 'mfConcDark');     // soffits, recesses, weathered parapets
  const GL = nightGlow(std(0x33373b, 'mfGlass', { rough: 0.16, metal: 0.3, extra: { envMapIntensity: 1.25, emissive: 0xffd09a, emissiveIntensity: 0.38 } }), 1.0);
  const FR = std(0x2a2623, 'mfBronze', { rough: 0.45, metal: 0.6 });   // dark bronze anodised frames (near black in the photos)
  GL.userData.interior = false; // r4: the glass deep behind the balconies stays dark (no lit-room shader); east/podium glass keeps it
  const GLP = nightGlow(std(0x3d464f, 'mfGlassPodium', { rough: 0.1, metal: 0.25, extra: { envMapIntensity: 1.4, emissive: 0xffd09a, emissiveIntensity: 0.45 } }), 1.0); // r4: a little less mirror-bright // shaded podium glazing still catches the sky
  const PG = std(0x3a3633, 'mfPergola', { rough: 0.55, metal: 0.5 });  // dark steel pergola frame
  const GRN = std(0x3d4f2c, 'mfPlant', { rough: 0.95 });
  const CS = tint(M.concrete, 0x5f6266, 'mfSoffit');      // r4: soffits under the cantilevers read as deep shadow in the photos
  const LOBBY = nightGlow(std(0xe8e2d6, 'mfLobbyLight', { rough: 0.6, extra: { emissive: 0xfff2dc, emissiveIntensity: 1.3 } }), 0.6); // lit lobby / café interiors
  const WOOD = M.wood;
  const colliders = [], walkables = [];
  const F3 = 4.4, F4 = 8.8, F5 = 13.2, SOF = 16.35, RT = 17.55, TP = 19.6, DECK_E = 8.7, DECK_N = 4.6;
  const GW = -17.2, GN = -17.3, GS = 17.3, GE = 31.5; // glass lines of the main block (deep in shadow behind the balconies)
  const BP4 = 2.6, BP5 = 3.1, BP = 2.85, RP = 3.85; // r4: deeper (was 2.1 / 2.6)                           // balcony / roof projection beyond the glass
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
    K.rbox(R, CS, slabExt ? a : s0, yF - 0.335, -0.3, slabExt ? b : s1, yF - 0.32, BP - 0.36); // dark soffit
    const sn = Math.max(1, Math.round((b - a) / 6.5));
    for (let i = 0; i < sn; i++) { const p = a + (b - a) * i / sn, q = a + (b - a) * (i + 1) / sn; K.rbox(R, C, p + (i ? 0.02 : 0), yF - 0.62, BP - 0.34, q - (i < sn - 1 ? 0.02 : 0), yF + 0.55, BP); }
    K.rbox(R, CD, a, yF - 0.6, BP - 0.38, b, yF + 0.53, BP - 0.33); // back of the panel joints
    const bn = sn; // r4: rail segments break at the spandrel panel joints
    for (let i = 0; i < bn; i++) { // separate top blocks on short square posts, open gaps between
      const p = a + (b - a) * i / bn + (i ? 0.13 : 0), q = a + (b - a) * (i + 1) / bn - (i < bn - 1 ? 0.13 : 0);
      const yT = yF + 0.85;                                             // r4: ~0.3 m open slot under a 0.38 m rail on chunky blocks (photos)
      for (const f of [0.2, 0.8]) { const s = p + (q - p) * f; K.rbox(R, C, s - 0.16, yF + 0.55, BP - 0.33, s + 0.16, yT, BP - 0.02, { detail: true }); }
      K.rbox(R, C, p, yT, BP - 0.38, q, yT + 0.38, BP + 0.03);
    }
    const ent = R === RS && yF < F4 + 1 && s0 > 5;                  // plain square beam ends over the entrance
    beams(R, s0, s1, yF - 0.335, BP - 0.36, ent ? 0.55 : 0.75, ent ? 0.55 : 0.5, 4.5, 0.45);
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
  const GLo = std(0x33373b, 'mfGlassUnlit', { rough: 0.16, metal: 0.3, extra: { envMapIntensity: 1.25 } }); // same by day; dark at night
  GLo.userData.interior = false; const GLD = GLo; // entrance doors read dark in shade (photos)
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const glassStorey = (R, s0, s1, y0, y1, o = {}) => {
    if (o.glass) curtain(K, R, s0, s1, y0, y1, [], { glass: o.glass, mull: o.mull ?? 1.5, mullMat: FR, mullD: 0.07, band: 0, recess: 0.06 });
    else { const nb = Math.max(1, Math.round((s1 - s0) / 6)); for (let i = 0; i < nb; i++) curtain(K, R, s0 + (s1 - s0) * i / nb, s0 + (s1 - s0) * (i + 1) / nb, y0, y1, [], { glass: rnd() < 0.72 ? GL : GLo, mull: o.mull ?? 1.5, mullMat: FR, mullD: 0.07, band: 0, recess: 0.06 }); } // some rooms lit at night
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
    glassStorey(R, e0, e1, F4, 12.6); K.rbox(R, C, e0, 12.6, -0.2, e1, 13.9, 0.45); glassStorey(R, e0, e1, 13.9, SOF);
    K.wall(R, C, e0, e1, -1.5, F4, [], 0.4);
  }
  // east face: flush — glass storey (F4, with doors), solid spandrel, glass band (F5); floor 3 shows only down the lightwell
  {
    const dS0 = sE(9), dS1 = sE(5);
    glassStorey(RE, 0, dS0, F4, 12.6, { glass: GLP }); glassStorey(RE, dS1, RE.L, F4, 12.6, { glass: GLP });
    for (let i = 0; i < 4; i++) { const a = dS0 + (dS1 - dS0) * i / 4, b = a + (dS1 - dS0) / 4; K.rbox(RE, GL, a, F4, -0.12, b, F4 + 2.6, -0.06); K.rbox(RE, FR, a, F4, -0.06, a + 0.09, F4 + 2.6, 0.04); K.rbox(RE, FR, (a + b) / 2 - 0.2, F4 + 1.0, -0.02, (a + b) / 2 + 0.2, F4 + 1.05, 0.06, { detail: true }); }
    K.rbox(RE, FR, dS1 - 0.09, F4, -0.06, dS1, F4 + 2.6, 0.04); K.rbox(RE, FR, dS0, F4 + 2.6, -0.1, dS1, F4 + 2.75, 0.05); K.rbox(RE, GL, dS0, F4 + 2.75, -0.12, dS1, 12.6, -0.06);
    K.rbox(RE, FR, dS0 - 1.2, 11.7, 0, dS1 + 1.2, 11.9, 2.4);         // slim steel canopy on thin columns
    for (const s of [dS0 - 0.9, dS1 + 0.9]) K.rbox(RE, FR, s - 0.07, F4, 2.15, s + 0.07, 11.7, 2.29);
    K.rbox(RE, C, 0, 12.6, -0.2, RE.L, 13.9, 0.45); K.rbox(RE, CD, 0, 12.52, -0.2, RE.L, 12.6, 0.43); // continuous solid spandrel band, projecting ~0.45 m (terrace photos)
    glassStorey(RE, 0, RE.L, 13.9, SOF, { glass: GLP });
    glassStorey(RE, 0, RE.L, F3, F4 - 0.3);
  }
  // ---------- roof slab (deep fascia, overhangs most on W/N/S), beams beneath, membrane, penthouse ----------
  const RE_ = 1.2; // r4: east roof overhang
  const roofPoly = [[GW - RP, GN - RP], [GE + RE_, GN - RP], [GE + RE_, GS + RP], [GW - RP, GS + RP]];
  K.prism(C, roofPoly, SOF, RT - 0.45); K.prism(CS, roofPoly, SOF - 0.015, SOF); // r4: dark soffit under the overhang
  K.prism(M.concreteDark, [[GW - RP + 0.35, GN - RP + 0.35], [GE + RE_ - 0.35, GN - RP + 0.35], [GE + RE_ - 0.35, GS + RP - 0.35], [GW - RP + 0.35, GS + RP - 0.35]], RT - 0.45, RT - 0.05);
  {
    const ring = [[GW - RP, GN - RP], [GW - RP, GS + RP], [GE + RE_, GS + RP], [GE + RE_, GN - RP]];
    for (let i = 0; i < 4; i++) { const R = K.run(ring[i], ring[(i + 1) % 4]); profileRun(R, C, 0, R.L, [[-0.9, RT - 0.47], [0, RT - 0.47], [-0.26, RT + 0.05], [-0.9, RT + 0.05]]); K.rbox(R, CD, 0, SOF + 0.2, 0.0, R.L, SOF + 0.25, 0.012, { detail: true }); }
    beams(RW, 0, RW.L, SOF - 0.015, RP - 0.12, 0.95, 0.6, 4.5, 0.5); globes(RW, 0, RW.L, SOF, 6, RP);
    for (const [R, sf] of [[RS, sS], [RN, sN]]) for (const [s0, s1] of balBays(R, sf)) beams(R, s0, s1, SOF - 0.015, RP - 0.12, 0.95, 0.6, 4.5, 0.5);
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
    // r4: tall narrow stair slots in one stacked column (the old square punched windows read as an apartment block);
    // the SE tower beside the entrance stays blank, as in the photos
    const pat = south ? (u0 > 0 ? [[], [], []] : [[], [0.26], [0.26]]) : [[0.24], [0.24], [0.24]];
    [F3, F4, F5].forEach((yF, k) => { for (const f of pat[k]) { const c = R.L * f; ops.push({ s0: c - 0.24, s1: c + 0.24, y0: yF + 0.55, y1: yF + 3.75 }); } });
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
    const lobby = LOBBY;
    K.rbox(R, M.paving, dA, F3 - 0.05, -9, dB, F3 + 0.01, -0.3);       // lobby floor seen through the doors
    K.rbox(R, CD, dA, 7.4, -9, dB, 7.5, -0.3);                         // lobby ceiling
    for (let k = 0; k < 4; k++) K.rbox(R, lobby, dA + 0.5, 7.36, -1.2 - k * 2, dB - 0.5, 7.4, -1.0 - k * 2); // linear ceiling lights
    K.rbox(R, CD, dA, F3, -9.1, dB, 7.5, -9);                          // back wall
    let s = dA;
    for (let i = 0; i < 4; i++) {
      K.rbox(R, FR, s, F3, -0.32, s + PW, 7.3, -0.18); s += PW;         // solid black panel
      if (i < 3) { // a pair of glazed leaves in black frames
        const a = s, b = s + DW, m = (a + b) / 2;
        K.rbox(R, GLD, a, F3 + 0.02, -0.3, b, 7.0, -0.26, { detail: true });
        for (const q of [a, m, b]) K.rbox(R, FR, q - 0.05, F3, -0.33, q + 0.05, 7.0, -0.19);
        for (const q of [a + 0.04, b - 0.04]) K.rbox(R, FR, q - 0.03, F3, -0.33, q + 0.03, 7.0, -0.19); 
        K.rbox(R, FR, a, F3, -0.33, b, F3 + 0.12, -0.19);
        for (const q of [m - 0.22, m + 0.22]) K.rbox(R, M.iron, q - 0.02, F3 + 0.9, -0.2, q + 0.02, F3 + 2.1, -0.12, { detail: true });
        K.rbox(R, FR, a, 7.0, -0.33, b, 7.3, -0.18);                    // dark transom band with closers
        s = b;
      }
    }
    K.rbox(R, GLD, s, F3 + 0.02, -0.3, dB, 7.0, -0.26, { detail: true }); K.rbox(R, FR, s, 7.0, -0.33, dB, 7.3, -0.18); K.rbox(R, FR, dB - 0.08, F3, -0.33, dB, 7.3, -0.19); // sidelight
    K.rbox(R, C, dA - 0.3, 7.3, -0.25, dB + 0.3, F4 - 0.32, 0.08);     // recessed fascia (~1.2 m) over the doors
    signText(K, R, 'JAMES K. MOFFITT UNDERGRADUATE LIBRARY', (dA + dB) / 2, 7.85, 0.52, { color: '#3a3129', metal: 0.35, rough: 0.4, d: 0.095, font: 'Georgia, "Times New Roman", serif', weight: '700', spacing: 0.15 });
    // continuous concrete sidewalk in front of the doors (flush threshold)
    const SW = tint(M.concrete, 0xfaf7f1, 'mfWalk');
    const ga = Math.max(F3, K.gMax(2.5, GS, 16, GS + 9, 8)) + 0.02;
    K.box(SW, 2.5, ga - 0.4, GS, 16, ga, GS + 9);
    for (let k = 1; k < 6; k++) K.box(CD, 2.5, ga, GS + k * 1.5 - 0.01, 16, ga + 0.004, GS + k * 1.5 + 0.01, { detail: true });
    walkables.push(K.walkPoly([[2.5, GS], [16, GS], [16, GS + 9], [2.5, GS + 9]], ga));
    // r4: entrance forecourt furniture from the photos. The Free Speech Movement Café pylon: stacked, slightly
    // offset board-marked concrete blocks, raised letters on the south face and flyer-covered cork boards on both
    // faces; a row of redwood post-and-beam newspaper display cases; a low concrete planter ledge students sit on.
    { const pu = 38.8, pv = 23.4, g = K.g(pu, pv) - 0.3; // pylon stands in the café plaza at the south-east corner
      for (let k = 0; k < 3; k++) { const o = [0, 0.07, -0.05][k]; K.box(CT, pu - 0.8 + o, g + k * 1.15, pv - 0.3, pu + 0.8 + o, g + (k + 1) * 1.15 - 0.02, pv + 0.3); K.box(CD, pu - 0.78 + o, g + (k + 1) * 1.15 - 0.02, pv - 0.28, pu + 0.78 + o, g + (k + 1) * 1.15, pv + 0.28, { detail: true }); }
      const RSp = K.run([pu - 0.8, pv + 0.3], [pu + 0.8, pv + 0.3]), RNp = K.run([pu + 0.8, pv - 0.3], [pu - 0.8, pv - 0.3]);
      const ink = { color: '#45443f', metal: 0.0, rough: 0.85, d: 0.03, font: '"Courier New", Courier, monospace', weight: '700', spacing: 0.0 };
      signText(K, RSp, 'FREE SPEECH', RSp.L / 2, g + 3.12, 0.22, ink); signText(K, RSp, 'MOVEMENT', RSp.L / 2, g + 2.86, 0.22, ink); signText(K, RSp, 'CAFE', RSp.L / 2, g + 2.6, 0.22, ink);
      const CORK = std(0x9a7448, 'mfCork', { rough: 0.95 });
      for (const R of [RSp, RNp]) { K.rbox(R, CORK, 0.22, g + 0.75, 0, R.L - 0.22, g + 1.85, 0.03, { detail: true });
        for (let k = 0; k < 9; k++) { const fx = 0.3 + ((k * 37) % 7) / 7 * (R.L - 0.75), fy = g + 0.85 + ((k * 23) % 5) / 5 * 0.8; K.rbox(R, [M.whitePaint, M.calGold, M.seatBlue, M.whitePaint][k % 4] || M.whitePaint, fx, fy, 0.03, fx + 0.2, fy + 0.27, 0.035, { detail: true }); } }
      colliders.push(rectCol(pu - 0.9, pv - 0.38, pu + 0.9, pv + 0.38, g, g + 3.5));
      // newspaper display cases on redwood posts, east side of the forecourt
      const RW8 = std(0x5a3c2b, 'mfRedwood', { rough: 0.85 }); const NEWS = newsMat();
      for (let k = 0; k < 4; k++) { const u = 10.8 + k * 1.9, v = 30.2, gg = K.g(u, v) - 0.2;
        for (const du of [-0.8, 0.8]) K.box(RW8, u + du - 0.07, gg, v - 0.07, u + du + 0.07, gg + 2.35, v + 0.07, { detail: true });
        K.box(RW8, u - 0.95, gg + 2.2, v - 0.09, u + 0.95, gg + 2.34, v + 0.09, { detail: true });
        K.box(FR, u - 0.68, gg + 1.05, v - 0.08, u + 0.68, gg + 1.95, v + 0.08, { detail: true }); K.box(NEWS, u - 0.6, gg + 1.12, v - 0.085, u + 0.6, gg + 1.88, v + 0.085, { detail: true, uvMode: 'keep' });
        K.box(M.glassLight, u - 0.64, gg + 1.08, v - 0.1, u + 0.64, gg + 1.92, v + 0.1, { detail: true });
        colliders.push(rectCol(u - 0.95, v - 0.12, u + 0.95, v + 0.12, gg, gg + 2.3)); }
      // low planter ledge with shrubs along the west side of the forecourt (sitting height)
      { const a = -6.3, b = -3.9, v0 = 26.0, v1 = 35.5, gg = K.gMin(a, v0, b, v1, 4) - 0.2, yt = K.gMax(a, v0, b, v1, 4) + 0.46;
        K.box(C, a, gg, v0, b, yt, v1); K.box(M.soil, a + 0.15, yt - 0.04, v0 + 0.15, b - 0.15, yt + 0.01, v1 - 0.15, { detail: true });
        for (let k = 0; k < 5; k++) { const gm = new THREE.IcosahedronGeometry(0.55 + 0.12 * (k % 2), 1); gm.scale(1, 0.75, 1); gm.translate((a + b) / 2, yt + 0.35, v0 + 1.0 + k * (v1 - v0 - 2) / 4); K.add(GRN, gm, { detail: true }); }
        colliders.push(rectCol(a, v0, b, v1, gg, yt)); walkables.push(K.walkPoly([[a, v0], [b, v0], [b, v1], [a, v1]], yt)); }
    }
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
    // r4: the Free Speech Movement Café sits on the ground floor under the deck's south edge (u 38.5..49.5), its glazed
    // front set back ~2.4 m behind a row of square columns, so that strip of the deck is only a slab (CU..v1)
    const CU0 = 38.5, CU1 = 49.5, CV = 9.6;
    for (const [a, b, c, d] of slabs) {
      K.box(M.paving, a, yF - 0.04, b, c, yF, d); walkables.push(K.walkPoly([[a, b], [c, b], [c, d], [a, d]], yF));
      if (d !== v1) { K.box(C, a, 2.5, b, c, yF - 0.04, d); colliders.push(rectCol(a, b, c, d, -2, yF - 0.05)); continue; }
      K.box(C, a, yF - 0.65, b, c, yF - 0.04, d);                                  // slab over the whole strip
      for (const [p0, p1] of [[a, CU0], [CU1, c]]) { K.box(C, p0, 2.5, b, p1, yF - 0.65, d); colliders.push(rectCol(p0, b, p1, d, -2, yF - 0.05)); }
      K.box(C, CU0, 2.5, b, CU1, yF - 0.65, 4.5);                                  // behind the café (lightwell wall)
      colliders.push(rectCol(CU0, b, CU1, CV, -2, yF - 0.05), rectCol(CU0, CV, CU1, d, yF - 0.65, yF - 0.05));
    }
    // lightwell against the façade: walls, floor at floor 3, stair along its south side, railings
    const LW = Math.max(F3, K.gMax(L0, W0, L1, W1, 8)) + 0.04;          // well floor sits just above the bare-earth terrain
    K.box(M.paving, L0, LW - 0.35, W0, L1, LW, W1); walkables.push(K.walkPoly([[L0, W0], [L1, W0], [L1, W1 - 1.9], [L0, W1 - 1.9]], LW));
    for (const [a, b] of [[[L0, W0], [L1, W0]], [[L1, W0], [L1, W1]], [[L1, W1], [L0, W1]]]) { const R = K.run(a, b); K.rbox(R, CD, 0, F3 - 0.3, 0, R.L, yF - 0.05, 0.25); }
    walkables.push(K.stairs(C, L0 + 0.6, W1 - 1.9, L1, W1 - 0.25, LW, yF, '+u', Math.round((yF - LW) / 0.165)));
    for (const [a, b] of [[[L0, W0], [L1, W0]], [[L1, W0], [L1, W1 - 2.0]], [[L1 - 0.1, W1], [L0, W1]]]) { const R = K.run(a, b); K.rbox(R, C, 0, yF - 0.02, -0.25, R.L, yF + 0.18, 0.05); rail(R, 0.1, R.L - 0.1, yF + 0.18, -0.12, 0.9); }
    // deck edges: concrete fascia + railing where the ground falls away
    const RSd = K.run([u0 + 7, v1], [u1, v1]); K.rbox(RSd, C, 0, yF - 0.85, -0.3, RSd.L, yF + 0.15, 0.02); K.rbox(RSd, C, CU1 - (u0 + 7), 2.5, -0.3, RSd.L, yF - 0.85, 0.02); rail(RSd, 0, RSd.L, yF + 0.15, -0.15);
    signText(K, RSd, 'FREE SPEECH MOVEMENT CAFE', (CU0 + CU1) / 2 - (u0 + 7), yF - 0.36, 0.44, { color: '#3b3a36', metal: 0.2, rough: 0.6, d: 0.05, font: 'Helvetica, Arial, sans-serif', weight: '700', spacing: 0.06 });
    { // the café front: dark bronze storefront on a low concrete upstand (the plaza rises ~1.7 m eastward), door pair,
      // warm interior; square columns carry the deck edge
      const segs = [[CU0 + 0.3, 42.2], [42.2, 46.0], [46.0, CU1 - 0.3]];
      const CAFE = LOBBY;
      for (const [p0, p1] of segs) {
        const yb = Math.max(K.g(p0, v1), K.g(p1, v1)) + 0.12, Rc = K.run([p0, CV], [p1, CV]);
        K.rbox(Rc, C, 0, 2.5, -0.3, Rc.L, yb, 0.05);
        curtain(K, Rc, 0, Rc.L, yb, yF - 0.7, [], { glass: GLP, mull: 1.6, mullMat: FR, mullD: 0.07, band: 0, recess: 0.04 });
        K.rbox(Rc, FR, 0, yb + 2.35, -0.05, Rc.L, yb + 2.45, 0.06); // transom bar
        K.rbox(Rc, CAFE, 0, yb - 0.1, -5.1, Rc.L, yF - 0.7, -4.95); K.rbox(Rc, CD, 0, yF - 0.75, -5.1, Rc.L, yF - 0.65, -0.1); K.rbox(Rc, M.paving, 0, yb - 0.2, -5.1, Rc.L, yb, -0.1); // lit interior, ceiling, floor
        K.rbox(Rc, M.wood, 0.4, yb, -2.2, Rc.L - 0.4, yb + 0.75, -1.6, { detail: true }); // café counter / tables seen inside
      }
      { const R = K.run([42.2, CV], [46.0, CV]), yb = Math.max(K.g(42.2, v1), K.g(46, v1)) + 0.12, m = R.L / 2; // door pair
        for (const q of [m - 0.95, m, m + 0.95]) K.rbox(R, FR, q - 0.05, yb, -0.02, q + 0.05, yb + 2.3, 0.1);
        for (const q of [m - 0.25, m + 0.25]) K.rbox(R, M.iron, q - 0.02, yb + 0.9, 0.06, q + 0.02, yb + 1.9, 0.12, { detail: true }); }
      for (const u of [CU0 + 0.25, 44.0, CU1 - 0.25]) { const g = K.g(u, 11.6) - 0.5; K.box(C, u - 0.28, g, 11.3, u + 0.28, yF - 0.6, 11.86); colliders.push(rectCol(u - 0.3, 11.28, u + 0.3, 11.88, g, yF - 0.6)); }
    }
    const RNd2 = K.run([u1, v0], [u0, v0]); K.rbox(RNd2, C, 0, 2.5, -0.3, RNd2.L, yF + 0.15, 0.02); rail(RNd2, 0.5, RNd2.L - 0.5, yF + 0.15, -0.15);
    // stair down to the south plaza (beside the building's SE corner)
    { const g = K.g(35.5, v1 + 7); const n = Math.max(3, Math.round((yF - g) / 0.16)); const sa = u0 + 1.2, sb = u0 + 6.2, ve = v1 + n * 0.3;
      walkables.push(K.stairs(C, sa, v1, sb, ve, g, yF, '-v', n));
      // r4: board-formed cheek walls following the flight, brushed-steel handrails on short posts
      for (const [ua, ub] of [[sa - 0.3, sa], [sb, sb + 0.3]]) {
        const pv = [[v1 - 0.01, g - 0.6], [ve + 0.4, g - 0.6], [ve + 0.4, g + 0.95], [ve, g + 0.95], [v1 - 0.01, yF + 0.95]];  // (v, y) outline
        const sh = new THREE.Shape(pv.map(([v, y]) => new THREE.Vector2(-v, y)));                        // x = -v so rotateY(90°) lands on +v
        const gm = new THREE.ExtrudeGeometry(sh, { depth: ub - ua, bevelEnabled: false }); gm.rotateY(Math.PI / 2); // (x, z) -> (u = z, v = -x)
        gm.translate(ua, 0, 0); K.add(CT, gm); colliders.push(rectCol(ua, v1, ub, ve + 0.4, g - 0.6, g + 0.95 + (yF - g) * 0.5));
      }
      const STL = std(0xb9bcbf, 'mfSteel', { rough: 0.3, metal: 0.9 }), seg = (p0, p1, t) => { const d = new THREE.Vector3().subVectors(p1, p0), L = d.length(); const gm = new THREE.BoxGeometry(t, t, L); gm.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())); gm.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2); K.add(STL, gm, { detail: true }); };
      for (const u of [sa + 0.25, (sa + sb) / 2, sb - 0.25]) { seg(new THREE.Vector3(u, yF + 0.9, v1 + 0.15), new THREE.Vector3(u, g + 0.9, ve), 0.05);
        for (let k = 0; k <= 3; k++) { const v = v1 + 0.15 + (ve - v1 - 0.15) * k / 3, y = yF - (yF - g) * (v - v1) / (ve - v1); seg(new THREE.Vector3(u, y, v), new THREE.Vector3(u, y + 0.9, v), 0.04); } }
    }
    // broad steps east to Memorial Glade
    { const g = Math.min(K.g(u1 + 4, -6), K.g(u1 + 4, 6)); const n = Math.max(2, Math.round((yF - g) / 0.16)); if (yF - g > 0.25) walkables.push(K.stairs(C, u1, -7, u1 + n * 0.33, 7, g, yF, '-u', n)); }
    // planters and timber benches on the deck
    // r4: the two south planters gave way to the OSM benches below
    for (const [a, b] of [[48, -1]]) { K.box(C, a - 1.2, yF, b - 1.2, a + 1.2, yF + 0.55, b + 1.2); K.box(GRN, a - 1.05, yF + 0.55, b - 1.05, a + 1.05, yF + 0.75, b + 1.05, { detail: true }); colliders.push(rectCol(a - 1.2, b - 1.2, a + 1.2, b + 1.2, yF - 0.5, yF + 0.55)); }
    // r4: Press café kiosk (2017, NE corner of the deck; OSM w/1098756727): a black perforated-metal box whose holes
    // glow at night, a full-length top-hinged flap propped open as an awning over the white service counter, PRESS in
    // white letters on the dark back wall, a warm LED line at the base. No tables (the photos show benches only).
    { const a = 40.3, b = -15.4, c = 48.6, d = -11.7, h = yF + 3.3;
      const PERF = perfMetal(), PERFT = perfMetal(true);
      K.box(PERF, a, yF, b, c, h, d, { uvMode: 'keep' }); K.box(FR, a - 0.04, h, b - 0.04, c + 0.04, h + 0.12, d + 0.04); K.box(M.concreteDark, a + 0.15, h + 0.12, b + 0.15, c - 0.15, h + 0.14, d - 0.15); // thin dark edge, grey roof membrane (it read as a void from above)
      const R = K.run([a, d], [c, d]); const L = R.L;                              // service side faces the terrace (south)
      const WHT = std(0xf4f2ee, 'mfPressWhite', { rough: 0.5, extra: { emissive: 0xfff6e8, emissiveIntensity: 1.0 } }); // lit by day too (the bright interior is what reads from the plaza)
      K.rbox(R, WHT, 0.5, yF + 0.95, -1.1, L - 0.5, yF + 2.55, -0.02);          // lit white interior seen through the opening
      K.rbox(R, M.blackPaint || FR, 1.6, yF + 1.7, -1.05, L - 1.6, yF + 2.5, -1.0); // dark back wall band
      for (let k = 0; k < 3; k++) K.rbox(R, M.blackPaint || FR, 0.9 + k * 0.75, yF + 1.55, -1.04, 1.5 + k * 0.75, yF + 2.35, -1.0, { detail: true }); // menu boards
      signText(K, R, 'PRESS', L / 2, yF + 2.13, 0.5, { color: '#ffffff', metal: 0.0, rough: 0.5, d: -0.99, font: 'Helvetica, Arial, sans-serif', weight: '800', spacing: 0.08 });
      K.rbox(R, M.concreteDark, 0.5, yF + 0.95, -0.4, L - 0.5, yF + 1.05, 0.12);  // counter top
      K.rbox(R, PERFT, 0.5, yF, 0.0, L - 0.5, yF + 0.95, 0.03);                   // counter front (perforated)
      { const fd = 1.35, tilt = THREE.MathUtils.degToRad(16), g = new THREE.BoxGeometry(L - 0.6, 0.06, fd);   // the propped flap
        g.translate(0, 0, fd / 2); g.rotateX(-tilt); g.translate(L / 2, yF + 2.62, 0.02); K.addRun(R, PERFT, g);
        for (const sx of [0.7, L - 0.7]) K.rbox(R, M.iron, sx - 0.02, yF + 2.2, 0.9, sx + 0.02, yF + 2.62 + fd * Math.sin(tilt) - 0.05, 0.94, { detail: true }); }
      const LED = M.lampGlow;
      K.box(LED, a + 0.05, yF, b - 0.06, c - 0.05, yF + 0.05, b - 0.02, { detail: true }); K.box(LED, a - 0.06, yF, b, a - 0.02, yF + 0.05, d, { detail: true }); K.box(LED, c + 0.02, yF, b, c + 0.06, yF + 0.05, d, { detail: true });
      for (const [p0, p1] of [[[c, d], [c, b]], [[a, b], [a, d]]]) { const Re = K.run(p0, p1); K.rbox(Re, M.blackPaint || FR, 0.45, yF + 2.05, 0, Re.L - 0.45, yF + 2.75, 0.04); signText(K, Re, 'PRESS', Re.L / 2, yF + 2.4, 0.46, { color: '#ffffff', metal: 0.0, rough: 0.5, d: 0.06, font: 'Helvetica, Arial, sans-serif', weight: '800', spacing: 0.08 }); }
      colliders.push(rectCol(a, b, c, d, yF - 1, h + 0.3));
      for (const u of [41.0, 47.9]) { K.cyl(FR, u, yF, d + 1.9, 0.09, 0.09, 0.95, 10, { detail: true }); K.cyl(LED, u, yF + 0.82, d + 1.9, 0.095, 0.095, 0.1, 10, { detail: true }); } // bollard lights
    }
    // r4: terrace furniture from the photos and OSM benches: long hardwood slat benches on low concrete plinths,
    // slim dark pole lights with a single horizontal arm
    for (const [u0, u1, v, w] of [[34.1, 37.4, 6.6, 0.55], [40.7, 45.2, 6.6, 0.55], [33.2, 38.6, 11.2, 0.6], [42.4, 45.2, 11.2, 0.6]]) {
      K.box(C, u0 + 0.15, yF, v - w / 2 + 0.06, u1 - 0.15, yF + 0.34, v + w / 2 - 0.06);
      for (let k = 0; k < 5; k++) { const vv = v - w / 2 + (k + 0.5) * w / 5; K.box(WOOD, u0, yF + 0.34, vv - w / 12, u1, yF + 0.45, vv + w / 12, { detail: true }); }
      colliders.push(rectCol(u0, v - w / 2, u1, v + w / 2, yF - 0.5, yF + 0.45));
    }
    for (const [u, v] of [[47.2, -7.6], [49.6, 10.8]]) {
      K.cyl(FR, u, yF, v, 0.07, 0.06, 5.6, 8, { detail: true }); K.box(FR, u - 0.05, yF + 5.5, v - 0.05, u + 1.25, yF + 5.62, v + 0.05, { detail: true });
      K.box(M.lampGlow, u + 0.2, yF + 5.46, v - 0.04, u + 1.2, yF + 5.5, v + 0.04, { detail: true }); colliders.push(K.colCyl(u, v, 0.15, yF, yF + 5.6));
    }
  }

  // r4: Main Stacks ventilation shaft east of the deck (OSM r/21101303; LiDAR top 11.2 m): board-formed concrete
  // enclosure with a band of dark louvres under a thin cap (replaces the stand-in granite box with painted windows)
  { const u0 = 52.6, u1 = 55.8, v0 = -15.6, v1 = -8.2, yT = 11.2, g0 = K.gMin(u0, v0, u1, v1, 4) - 0.6;
    K.box(CT, u0, g0, v0, u1, yT - 0.6, v1);
    const IVY = ivyMat(); const ring = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    for (let i = 0; i < 4; i++) { const R = K.run(ring[(i + 1) % 4], ring[i]); const nb = Math.max(2, Math.round(R.L / 0.9));
      for (let k = 0; k < nb; k++) { const a0 = R.L * k / nb - 0.02, a1 = R.L * (k + 1) / nb + 0.02, top = g0 + 1.2 + (yT - g0 - 2.2) * (0.35 + 0.6 * Math.abs(Math.sin(k * 2.3 + i * 1.7))); K.rbox(R, IVY, a0, g0 + 0.4, 0, a1, top, 0.12); } }
    for (let i = 0; i < 4; i++) { const R = K.run(ring[(i + 1) % 4], ring[i]); for (let y = yT - 0.55; y < yT - 0.2; y += 0.14) K.rbox(R, FR, 0.15, y, -0.12, R.L - 0.15, y + 0.06, 0.0, { detail: true }); }
    K.box(CD, u0 + 0.1, yT - 0.6, v0 + 0.1, u1 - 0.1, yT - 0.2, v1 - 0.1); K.box(C, u0 - 0.1, yT - 0.2, v0 - 0.1, u1 + 0.1, yT, v1 + 0.1);
    colliders.push(rectCol(u0, v0, u1, v1, g0, yT));
  }

  const object3d = K.finish(); object3d.name = 'moffitt-undergraduate-library';
  return { object3d, colliders, walkables };
}
