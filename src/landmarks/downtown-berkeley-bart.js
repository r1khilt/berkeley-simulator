// Downtown Berkeley BART (1973; plaza and entrances rebuilt 2016-18). The station lies under Shattuck Avenue
// (concourse level -1, platforms level -2), so there is no building above ground. What a pedestrian sees:
//  - the main entrance on the plaza at Shattuck & Center (SW corner): a sweeping glass shell on white steel ribs,
//    ~5.6 m tall on the plaza side, curving down toward Shattuck over the stair + two escalators;
//  - four sidewalk stair entrances (Addison end and Allston end, both sides of Shattuck), each a concrete-walled
//    stairwell with a glass hood canopy on brushed-aluminium fins at the top of the stairs;
//  - the elevator kiosk at the NW corner of Center Street.
// Canopy heights/profiles and stairwell positions are fitted to the 2021 LiDAR (the DEM shows the stair pits).
// Underground parts (stairwells, the concourse from the OSM indoor outline, the island platform with a parked train) are
// drawn BEFORE the terrain, and a depth-only "portal" over each opening hides the terrain there, so the stairwells read as
// real holes in the sidewalk. The returned `terrainHoles` (station outline + stairwells) make physics ignore the terrain
// there; continuous walkables (street surface outside the openings, stairs, escalators, concourse, platform stairs,
// platform, trackbeds) carry the player from the street down to the trains. UNDERGROUND_WALKABLE=false closes the stair
// tops and returns no holes, for engines without the terrainHoles hook.
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';

const UNDERGROUND_WALKABLE = true;

export const info = {
  id: 'downtown-berkeley-bart',
  name: 'Downtown Berkeley BART',
  subtitle: 'Shattuck Ave & Center St · 1973',
  blurb: 'The subway station under Shattuck Avenue opened in 1973 as Berkeley station and was later renamed Downtown Berkeley. The plaza was rebuilt in 2016-18, replacing the old rotunda with the glass entrance canopy. Walk down any entrance to the concourse and the platform.',
  replaces: [],
};

const RISE_N = 33, TREAD = 0.3, DEPTH = 6.0; // street level -> concourse level (-1)

function sign(text, w, h, bg, fg, { font = 'bold', vertical = false, logo = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (vertical) { g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.font = `${font} ${Math.floor(w * 0.5)}px Helvetica, Arial, sans-serif`; g.fillText(text, 0, 0); g.restore(); }
  else if (logo) { // BART logo: white rim, blue field, lettering
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88);
    g.fillStyle = bg; g.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
    g.fillStyle = fg; g.font = `bold ${Math.floor(h * 0.42)}px Helvetica, Arial, sans-serif`; g.fillText(text, w / 2, h * 0.53);
  } else { g.font = `${font} ${Math.floor(h * 0.55)}px Helvetica, Arial, sans-serif`; g.fillText(text, w / 2, h * 0.54); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const noShadow = (m) => { Object.defineProperty(m, 'castShadow', { get: () => false, set: () => {}, configurable: true }); return m; };
function mergePos(list) {
  const pos = []; for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) pos.push(p[i]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const triGeo = (pos) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };

export async function build(ctx) {
  const { M, groundAt, packet } = ctx;
  const K = new Kit(ctx, 0);        // above ground
  const KU = new Kit(ctx, 0);       // underground (drawn before the terrain)
  const colliders = [], walkables = [], holes = [];
  // ---------- local materials ----------
  const alu = new THREE.MeshStandardMaterial({ color: 0xb4b8ba, roughness: 0.38, metalness: 0.75 }); alu.name = 'bartAlu';
  const steelW = new THREE.MeshStandardMaterial({ color: 0xe2e4e3, roughness: 0.45, metalness: 0.25 }); steelW.name = 'bartWhiteSteel';
  const shellGlass = new THREE.MeshStandardMaterial({ color: 0xdde3e6, roughness: 0.22, metalness: 0.05, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.3 }); shellGlass.name = 'bartGlass';
  const hoodGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0e2, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 }); hoodGlass.name = 'bartHoodGlass';
  const sideGlass = new THREE.MeshStandardMaterial({ color: 0xb9cccc, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.58, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }); sideGlass.name = 'bartSideGlass';
  const parapet = M.concrete.clone(); parapet.color.set(0xd0cdc6); parapet.name = 'bartParapet';
  const nosing = new THREE.MeshStandardMaterial({ color: 0x6e6a62, roughness: 0.7 }); nosing.name = 'bartNosing';
  const brickD = M.brick.clone(); brickD.color.set(0x8a6a60); brickD.emissive = new THREE.Color(0x24160f); brickD.side = THREE.DoubleSide; brickD.name = 'bartBrick';
  const tread = M.concrete.clone(); tread.color.set(0xd2bb92); tread.emissive = new THREE.Color(0x2a2418); tread.name = 'bartTread';
  const terrazzo = M.marble.clone(); terrazzo.color.set(0xd8cbb0); terrazzo.roughness = 0.35; terrazzo.emissive = new THREE.Color(0x4a4334); terrazzo.name = 'bartTerrazzo';
  const ceilW = M.stuccoWhite.clone(); ceilW.color.set(0xe8e4da); ceilW.emissive = new THREE.Color(0x5a564c); ceilW.name = 'bartCeiling';
  const tube = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 2.2, roughness: 0.4 }); tube.name = 'bartLightStrip';
    const red = new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.5 }); red.name = 'bartRed';
  const plant = new THREE.MeshStandardMaterial({ color: 0x6f8450, roughness: 1 }); plant.name = 'bartPlanting';
  const bartBlue = '#0099d8';
  const logoMat = new THREE.MeshStandardMaterial({ map: sign('BART', 256, 256, bartBlue, '#ffffff', { logo: true }), roughness: 0.5 }); logoMat.name = 'bartLogo';
  const nameMat = new THREE.MeshStandardMaterial({ map: sign('Downtown Berkeley', 96, 768, '#f5f5f5', '#111111', { vertical: true }), roughness: 0.5 }); nameMat.name = 'bartName';
  const nameH = new THREE.MeshStandardMaterial({ map: sign('Downtown Berkeley', 1024, 128, '#1a1c1e', '#ffffff'), roughness: 0.5 }); nameH.name = 'bartNameH';
  const signGrey = new THREE.MeshStandardMaterial({ color: 0xc8cdd0, roughness: 0.4, metalness: 0.4 }); signGrey.name = 'bartSignGrey';
  const bandTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 232; const g = c.getContext('2d');
    g.fillStyle = '#c8cdd0'; g.fillRect(0, 0, 1024, 232); g.fillStyle = '#b4b9bc'; g.fillRect(510, 0, 4, 232);
    g.textBaseline = 'alphabetic'; g.font = 'bold 150px Helvetica, Arial, sans-serif'; g.fillStyle = '#111'; g.fillText('b', 40, 170); g.fillStyle = '#0099d8'; g.fillText('a', 128, 170);
    g.fillStyle = '#111'; g.fillRect(52, 34, 22, 22); g.fillRect(138, 34, 22, 22);
    g.fillStyle = '#3e4349'; let fs = 92; g.font = `bold ${fs}px Helvetica, Arial, sans-serif`; while (g.measureText('Downtown Berkeley').width > 1024 - 255 - 40 && fs > 30) { fs -= 2; g.font = `bold ${fs}px Helvetica, Arial, sans-serif`; } g.fillText('Downtown Berkeley', 255, 150);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const bandMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.45, metalness: 0.2 }); bandMat.name = 'bartBand';
  const portalMat = new THREE.MeshBasicMaterial({ colorWrite: false }); portalMat.name = 'bartPortal';
  const yellowM = new THREE.MeshStandardMaterial({ color: 0xf2b90f, roughness: 0.6, emissive: 0x3a2a00 }); yellowM.name = 'bartEdge';
  const darkWall = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.8 }); darkWall.name = 'bartTunnel';
  const trainM = new THREE.MeshStandardMaterial({ color: 0xd9dadb, roughness: 0.35, metalness: 0.7, emissive: 0x202020 }); trainM.name = 'bartTrain';
  const blueM = new THREE.MeshStandardMaterial({ color: 0x1f4fa0, roughness: 0.5 }); blueM.name = 'bartStripe';
  const apron = M.paving.clone(); apron.color.set(0xe0ddd6); apron.name = 'bartApron'; apron.polygonOffset = true; apron.polygonOffsetFactor = -1; apron.polygonOffsetUnits = -2;
  const lidMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); lidMat.name = 'bartShadowLid';
  const portals = [], lids = [];
  const rise = DEPTH / RISE_N;

  // ======================================================================================
  // Sidewalk stair entrances: frame (s across, y up from the sidewalk, t along the descent)
  // ======================================================================================
  const ENTR = [
    { id: 'NW', p: [-11.15, -90.7], d: [0.07, 0.9975], Lo: 12.4, Lf: 1.0, Lc: 4.1, hTop: 4.0 },
    { id: 'NE', p: [9.75, -90.5], d: [0.08, 0.9968], Lo: 8.4, Lf: 0.9, Lc: 3.5, hTop: 3.6 },
    { id: 'SE', p: [41.05, 51.7], d: [-0.07, 0.9975], Lo: 11.2, Lf: 2.6, Lc: 4.7, hTop: 4.1 },
    { id: 'SW', p: [4.35, 78.7], d: [-0.06, -0.9982], Lo: 13.2, Lf: 3.4, Lc: 4.6, hTop: 4.2 },
  ];
  const W = 2.8, WT = 0.2, PH = 1.05;
  const pip = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; };
  const way = (id) => ((packet && packet.context || []).find((w) => w.osm === id) || {}).pts;
  const CONC = way('w/765677493') || [[-8, -80], [26, -80], [26, 84], [-8, 84]];
  const STN = way('w/765677494') || CONC;
  const gM = groundAt(4, 8), yC = gM - DEPTH, yCe = yC + 3.4, yPl = yC - 6.5; // concourse floor / ceiling, platform floor
  const openings = [], stairRects = [], landings = [];
  for (const e of ENTR) {
    const [dx, dz] = e.d; const sx = dz, sz = -dx; // s = d x up (right-handed: s, y, t)
    const sideG = (sv, t) => groundAt(e.p[0] + dz * sv + dx * t, e.p[1] - dx * sv + dz * t);
    const g0 = [sideG(-(W / 2 + WT + 1.2), 0.4), sideG(W / 2 + WT + 1.2, 0.4), sideG(-(W / 2 + WT + 1.2), 2.0), sideG(W / 2 + WT + 1.2, 2.0)].sort((a, b) => a - b).slice(1, 3).reduce((a, b) => a + b) / 2;
    const E = new THREE.Matrix4().makeBasis(new THREE.Vector3(sx, 0, sz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz)).setPosition(e.p[0], g0, e.p[1]);
    const P = (s, t) => [e.p[0] + sx * s + dx * t, e.p[1] + sz * s + dz * t];
    const B = (kit, mat, s0, y0, t0, s1, y1, t1, opts) => { const g = new THREE.BoxGeometry(Math.abs(s1 - s0), Math.abs(y1 - y0), Math.abs(t1 - t0)); g.translate((s0 + s1) / 2, (y0 + y1) / 2, (t0 + t1) / 2); g.applyMatrix4(E); return kit.add(mat, g, opts); };
    const G = (kit, mat, geo, opts) => { geo.applyMatrix4(E); return kit.add(mat, geo, opts); };
    const depE = g0 - yC, riseE = depE / RISE_N;
    let TE = 0.8 + RISE_N * TREAD + 0.4; for (let t = 6; t < 30; t += 0.25) { const q = P(0, t); if (pip(q[0], q[1], CONC)) { TE = Math.max(TE, t + 0.6); break; } }
    const stairY = (t) => (t < 0.8 ? 0 : t > 0.8 + RISE_N * TREAD ? -depE : -Math.ceil((t - 0.8) / TREAD) * riseE);
    // ---- above ground: parapets with metal caps, end wall, handrails
    for (const sg of [-1, 1]) {
      const a = sg * W / 2, b = sg * (W / 2 + WT), lo = Math.min(a, b), hi = Math.max(a, b);
      B(K, parapet, lo, -0.02, 0.0, hi, PH, e.Lo + WT);
      B(K, alu, lo - 0.03, PH, -0.02, hi + 0.03, PH + 0.06, e.Lo + WT + 0.02);
      B(K, alu, sg * (W / 2 - 0.08) - 0.025, PH - 0.22, 0.1, sg * (W / 2 - 0.08) + 0.025, PH - 0.17, e.Lo - 0.1);
      colliders.push({ type: 'poly', pts: [P(lo, 0), P(hi, 0), P(hi, e.Lo + WT), P(lo, e.Lo + WT)], y0: g0 - 7, y1: g0 + PH + 0.1 });
      colliders.push({ type: 'poly', pts: [P(lo, e.Lo), P(hi, e.Lo), P(hi, 40), P(lo, 40)], y0: yC - 1, y1: g0 - 0.6 });
    }
    B(K, parapet, -W / 2, -0.02, e.Lo, W / 2, PH, e.Lo + WT);
    B(K, alu, -W / 2, PH, e.Lo - 0.02, W / 2, PH + 0.06, e.Lo + WT + 0.02);
    colliders.push({ type: 'poly', pts: [P(-W / 2, e.Lo), P(W / 2, e.Lo), P(W / 2, e.Lo + WT), P(-W / 2, e.Lo + WT)], y0: g0 - 0.6, y1: g0 + PH + 0.1 });
    if (!UNDERGROUND_WALKABLE) colliders.push({ type: 'poly', pts: [P(-W / 2, 0.35), P(W / 2, 0.35), P(W / 2, 0.45), P(-W / 2, 0.45)], y0: g0 - 7, y1: g0 + 3 });
    // ---- glazed hood over the stair head (photos of exits B1/B4): portal with a two-panel sign band, flat glass roof in a
    // grey perimeter frame curving down in a quarter circle to the parapet at the rear, side glass on a low curb with diagonal ribs
    const t0 = -0.3, encL = 7.0, hT = 3.9, R = hT - PH - 0.08, tC = t0 + encL - R, tEnd = tC + R;
    const prof = (t) => (t <= tC ? hT : PH + 0.08 + Math.sqrt(Math.max(0, R * R - (t - tC) * (t - tC))));
    const ts = [t0 - 0.45, t0, tC]; for (let i = 1; i <= 12; i++) ts.push(tC + R * Math.sin(i / 12 * Math.PI / 2));
    const sG = W / 2 + WT + 0.1;
    const ribAlong = (s, list, w, h, mat, opts) => { for (let i = 0; i < list.length - 1; i++) { const [ta, ya] = list[i], [tb, yb] = list[i + 1]; const L = Math.hypot(tb - ta, yb - ya); if (L < 1e-3) continue; const ang = Math.atan2(yb - ya, tb - ta);
      const g = new THREE.BoxGeometry(w, h, L + 0.02); g.rotateX(-ang); g.translate(s, (ya + yb) / 2 - h / 2, (ta + tb) / 2); G(K, mat, g, opts); } };
    for (const sg of [-1, 1]) {
      const s = sg * sG;
      ribAlong(s, ts.slice(1).map((t) => [t, prof(t)]), 0.14, 0.22, signGrey);              // perimeter frame / curved rib
      B(K, signGrey, s - 0.18, 0, t0 - 0.18, s + 0.18, hT, t0 + 0.18);                         // portal post
      B(K, parapet, s - 0.13, -0.02, t0 + 0.15, s + 0.13, 0.25, tEnd);                         // low curb under the glass
      const pos = []; const tl = ts.slice(1).filter((t) => t >= t0 + 0.15);
      for (let i = 0; i < tl.length - 1; i++) { const ta = Math.max(t0 + 0.15, tl[i]), tb = tl[i + 1]; const ya1 = prof(ta) - 0.2, yb1 = prof(tb) - 0.2; if (ya1 < 0.3 && yb1 < 0.3) continue;
        pos.push(s, 0.25, ta, s, 0.25, tb, s, yb1, tb, s, 0.25, ta, s, yb1, tb, s, ya1, ta); }
      G(K, hoodGlass, triGeo(pos));
      for (let k = 0; k < 7; k++) { // diagonal ribs at ~55 deg, leaning toward the portal
        const tA = tEnd - 0.2 - k * 0.75; let tB = tA, yB = 0.25; while (tB > t0 + 0.2 && yB < prof(tB) - 0.22) { tB -= 0.05; yB += 0.05 * Math.tan(0.96); }
        if (yB - 0.25 > 0.3) ribAlong(s, [[tB, Math.min(yB, prof(tB) - 0.2)], [tA, 0.25]], 0.08, 0.09, signGrey);
      }
    }
    { const tr = [t0 - 0.85, ...ts.slice(1)]; const lift = (t) => (t <= tC ? 0.1 : 0.1 * Math.max(0, 1 - (t - tC) / 0.6)); const sw = (t) => (t <= tC ? sG + 0.45 : sG + 0.12);
      const pos = []; for (let i = 0; i < tr.length - 1; i++) { const ta = tr[i], tb = tr[i + 1], ya = prof(Math.max(t0, ta)) + lift(ta), yb = prof(Math.max(t0, tb)) + lift(tb), wa = sw(ta), wb = sw(tb);
        pos.push(-wa, ya, ta, wa, ya, ta, wb, yb, tb, -wa, ya, ta, wb, yb, tb, -wb, yb, tb); }
      G(K, hoodGlass, triGeo(pos));
      B(K, alu, -sG - 0.47, hT + 0.04, t0 - 0.87, sG + 0.47, hT + 0.1, t0 - 0.8);
      for (const sg2 of [-1, 1]) B(K, alu, sg2 * (sG + 0.45) - 0.035, hT + 0.04, t0 - 0.85, sg2 * (sG + 0.45) + 0.035, hT + 0.1, tC);
      for (let t = t0 + 1.2; t < tC; t += 1.5) B(K, alu, -sG, hT - 0.12, t - 0.03, sG, hT - 0.04, t + 0.03);
    }
    // portal head: thin frame, two-panel sign band with the BART logo + station name, dark soffit strip, LED line
    B(K, alu, -sG - 0.15, hT - 0.12, t0 - 0.16, sG + 0.15, hT, t0 + 0.2);
    B(K, signGrey, -sG - 0.18, hT - 0.95, t0 - 0.24, sG + 0.18, hT - 0.12, t0 + 0.2);
    { const g = new THREE.PlaneGeometry(2 * sG + 0.34, 0.83); g.rotateY(Math.PI); g.translate(0, hT - 0.535, t0 - 0.25); G(K, bandMat, g, { uvMode: 'keep' }); }
    B(K, alu, -sG - 0.15, hT - 1.07, t0 - 0.1, sG + 0.15, hT - 0.95, t0 + 0.2);
    B(K, tube, -W / 2, hT - 1.1, t0 + 0.0, W / 2, hT - 1.07, t0 + 0.12);
    { const g = new THREE.PlaneGeometry(0.16, 0.26); g.rotateY(Math.PI); g.translate(-sG, 1.5, t0 - 0.16); G(K, logoMat, g, { uvMode: 'keep' }); }
    { // sidewalk apron around the stairwell (hides the smoothed DEM pit around the walls), with a skirt
      const so = W / 2 + WT + 1.3, te0 = -1.6, te1 = e.Lo + WT + 1.3, si = W / 2 + WT - 0.01, ti1 = e.Lo + WT - 0.01;
      const sh = new THREE.Shape(); sh.moveTo(-so, -te0); sh.lineTo(so, -te0); sh.lineTo(so, -te1); sh.lineTo(-so, -te1); sh.lineTo(-so, -te0);
      const hp = new THREE.Path(); hp.moveTo(-si, 0.01); hp.lineTo(-si, -ti1); hp.lineTo(si, -ti1); hp.lineTo(si, 0.01); hp.lineTo(-si, 0.01); sh.holes.push(hp);
      const ag = new THREE.ShapeGeometry(sh); ag.rotateX(-Math.PI / 2); ag.translate(0, 0.03, 0); G(K, apron, ag);
      for (const [a, b] of [[[-so, te0], [so, te0]], [[so, te0], [so, te1]], [[so, te1], [-so, te1]], [[-so, te1], [-so, te0]]]) {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.BoxGeometry(L, 0.6, 0.04); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, -0.27, (a[1] + b[1]) / 2); G(K, apron, g); }
    }
    // ---- underground: steps, landing, walls, sloped ceiling, end wall, lights
    B(KU, terrazzo, -W / 2, -0.4, -0.02, W / 2, 0, 0.8);
    for (let i = 0; i < RISE_N; i++) { const y = -(i + 1) * riseE; B(KU, tread, -W / 2, y - 0.35, 0.8 + i * TREAD, W / 2, y, 0.8 + (i + 1) * TREAD); B(KU, M.iron, -W / 2, y - 0.012, 0.8 + i * TREAD, W / 2, y + 0.004, 0.8 + i * TREAD + 0.05); }
    B(KU, terrazzo, -W / 2, -depE - 0.3, 0.8 + RISE_N * TREAD, W / 2, -depE, TE);
    { const tA = 0.9, tB = 0.8 + RISE_N * TREAD - 0.1, yA = 0.9, yB = -depE + 0.9; const L = Math.hypot(tB - tA, yB - yA), ang = Math.atan2(yB - yA, tB - tA);
      for (const so of [-0.09, 0.09]) { const g = new THREE.BoxGeometry(0.045, 0.045, L); g.rotateX(-ang); g.translate(so, (yA + yB) / 2, (tA + tB) / 2); G(KU, alu, g); }
      for (let t = tA + 0.4; t < tB; t += 2.4) B(KU, alu, -0.03, stairY(t), t - 0.03, 0.03, stairY(t) + 0.9, t + 0.03); }
    for (const sg of [-1, 1]) {
      const a = sg * W / 2, b = sg * (W / 2 + WT), lo = Math.min(a, b), hi = Math.max(a, b);
      B(KU, parapet, lo, -depE - 0.3, -0.02, hi, -0.03, TE);
      { const sI = sg * (W / 2 - 0.015); const tA = 0.8, tB = 0.8 + RISE_N * TREAD; const pos = [];
        const q = (t, y) => [sI, y, t]; const tTop = 0.8 + (1.25 / riseE) * TREAD; const A = q(0.8 + 0.06 / riseE * TREAD, -0.06), Bq = q(tB, -depE), C = q(tB, -depE + 1.2), D = q(tTop, -0.06);
        const E2 = q(TE, -depE), F2 = q(TE, -depE + 1.2);
        if (sg > 0) pos.push(...A, ...C, ...Bq, ...A, ...D, ...C, ...Bq, ...F2, ...E2, ...Bq, ...C, ...F2); else pos.push(...A, ...Bq, ...C, ...A, ...C, ...D, ...Bq, ...E2, ...F2, ...Bq, ...F2, ...C);
        G(KU, brickD, triGeo(pos)); }
      
    }
    const ceil = (t) => Math.min(-0.45, stairY(Math.min(t, 0.8 + RISE_N * TREAD)) + 3.1);
    { const tsC = []; for (let t = e.Lo; t < TE; t += 0.6) tsC.push(t); tsC.push(TE);
      for (let i = 0; i < tsC.length - 1; i++) { const ya = ceil(tsC[i]), yb = ceil(tsC[i + 1]); B(KU, ceilW, -W / 2, Math.min(ya, yb), tsC[i], W / 2, -0.03, tsC[i + 1]); }
      B(KU, parapet, -W / 2, ceil(e.Lo), e.Lo - 0.02, W / 2, -0.03, e.Lo + 0.02);
      for (let i = 1; i < tsC.length - 1; i += 4) B(KU, tube, -0.5, ceil(tsC[i]) - 0.06, tsC[i] - 0.06, 0.5, ceil(tsC[i]), tsC[i] + 0.06);
    }
    // portal (depth-only lid over the opening) and shadow lid over the covered part
    let gP = -1e9; for (let s = -W / 2 - 0.3; s <= W / 2 + 0.31; s += 0.5) for (let t = -0.3; t <= e.Lo + 0.31; t += 0.5) { const q = P(s, t); gP = Math.max(gP, groundAt(q[0], q[1])); }
    const yP = Math.min(0.3, Math.max(0, gP - g0)) + 0.07;
    const po = new THREE.PlaneGeometry(W, e.Lo); po.rotateX(-Math.PI / 2); po.translate(0, yP, e.Lo / 2); po.applyMatrix4(E); portals.push(po);
    openings.push([P(-W / 2, 0), P(W / 2, 0), P(W / 2, e.Lo), P(-W / 2, e.Lo)]);
    stairRects.push([P(-W / 2 - WT, -0.05), P(W / 2 + WT, -0.05), P(W / 2 + WT, TE), P(-W / 2 - WT, TE)]); landings.push(P(0, TE - 0.6));
    holes.push([P(-W / 2, 0), P(W / 2, 0), P(W / 2, TE), P(-W / 2, TE)]);
    { const cs = [P(-W / 2, 0), P(W / 2, 0), P(W / 2, TE), P(-W / 2, TE)];
      walkables.push({ type: 'fn', bounds: [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))],
        heightAt: (x, z) => { const rx = x - e.p[0], rz = z - e.p[1]; const s = rx * sx + rz * sz, t = rx * dx + rz * dz; if (Math.abs(s) > W / 2 || t < 0 || t > TE) return null; return g0 + stairY(t); } }); }
  }

  // ======================================================================================
  // Main entrance on the plaza: glass shell over the stair + two escalators (descending east)
  // ======================================================================================
  const hS = (x) => (x <= 1.5 ? 5.65 : 5.65 - 4.85 * Math.pow(Math.min(1, (x - 1.5) / 10.4), 2.2)) + gM;
  const WEST = [[4.4, -1.2], [6.0, -2.4], [8.0, -3.0], [10.5, -2.4], [13.0, -1.8], [16.2, -0.8]]; // [z, x]
  const xW = (z) => { for (let i = 0; i < WEST.length - 1; i++) { const [za, xa] = WEST[i], [zb, xb] = WEST[i + 1]; if (z <= zb) return xa + (xb - xa) * (z - za) / (zb - za); } return WEST[WEST.length - 1][1]; };
  const XE = 11.9, ZN = 4.4, ZS = 16.2;
  const xE = (z) => (z <= 11.5 ? XE : 11.8 - (z - 11.5) * (12.6 / 4.7));
  const NZ = 14, NX = 22;
  const vtx = (i, j) => { const z = ZN + (ZS - ZN) * j / NZ; const xa = xW(z), xb = Math.max(xa + 0.01, xE(z)); const x = xa + (xb - xa) * i / NX; return [x, hS(x), z]; };
  { const pos = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i + 1, j + 1), d = vtx(i, j + 1); pos.push(...a, ...c, ...b, ...a, ...d, ...c); }
    K.add(shellGlass, triGeo(pos)); }
  const beamAlong = (kit, mat, pts, w, h, opts) => { for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1]; const dxv = b[0] - a[0], dyv = b[1] - a[1], dzv = b[2] - a[2]; const L = Math.hypot(dxv, dyv, dzv); if (L < 1e-3) continue;
    const g = new THREE.BoxGeometry(w, h, L + 0.03); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dxv / L, dyv / L, dzv / L)); g.applyQuaternion(q); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h / 2, (a[2] + b[2]) / 2); kit.add(mat, g, opts); } };
  for (let k = 0; k <= 8; k++) { const z = ZN + (ZS - ZN - 0.05) * k / 8; const xa = xW(z), xb = xE(z); const pts = []; for (let i = 0; i <= 16; i++) { const x = xa + (xb - xa) * i / 16; pts.push([x, hS(x) - 0.03, z]); } beamAlong(K, steelW, pts, 0.14, 0.24); }
  { const se = []; for (let i = 0; i <= 12; i++) { const z = 11.5 + (ZS - 11.5) * i / 12; const x = xE(z); se.push([x, hS(x) - 0.02, z]); } beamAlong(K, steelW, se, 0.2, 0.26);
    beamAlong(K, steelW, WEST.map(([z, x]) => [x, hS(x) - 0.02, z]), 0.22, 0.32);
    const ne = []; for (let i = 0; i <= 16; i++) { const x = -1.2 + (XE + 1.2) * i / 16; ne.push([x, hS(x) - 0.02, ZN]); } beamAlong(K, steelW, ne, 0.2, 0.26); }
  for (const f of [0.18, 0.36, 0.54, 0.72, 0.88]) { const pts = []; for (let j = 0; j <= 10; j++) { const z = ZN + (ZS - ZN) * j / 10; const xa = xW(z), xb = xE(z); if (xb - xa < 0.5) break; const x = xa + (xb - xa) * f; pts.push([x, hS(x) - 0.03, z]); } beamAlong(K, steelW, pts, 0.07, 0.1); }
  // north end: glazed wall under the curve with slanted (V) struts
  { const pos = []; const N = 16; for (let i = 0; i < N; i++) { const xa = -1.2 + (XE + 1.2) * i / N, xb = -1.2 + (XE + 1.2) * (i + 1) / N; const ya = hS(xa) - 0.25, yb = hS(xb) - 0.25;
      pos.push(xa, gM, ZN, xb, yb, ZN, xb, gM, ZN, xa, gM, ZN, xa, ya, ZN, xb, yb, ZN); }
    K.add(shellGlass, triGeo(pos));
    const xs7 = (i) => -1.2 + (XE - 0.6 + 1.2) * i / 7;
    for (let i = 0; i <= 7; i++) { const x = xs7(i); K.box(steelW, x - 0.05, gM, ZN - 0.05, x + 0.05, hS(x) - 0.2, ZN + 0.05); }
    for (let i = 0; i < 7; i++) { const xa = xs7(i), xb = xs7(i + 1), xm = (xa + xb) / 2;
      beamAlong(K, steelW, [[xa, gM + 0.15, ZN], [xm, hS(xm) - 0.3, ZN]], 0.06, 0.06); beamAlong(K, steelW, [[xb, gM + 0.15, ZN], [xm, hS(xm) - 0.3, ZN]], 0.06, 0.06); }
    K.box(parapet, -1.3, gM - 0.4, ZN - 0.18, XE + 0.3, gM + 0.12, ZN + 0.18);
    colliders.push({ type: 'poly', pts: [[-1.3, ZN - 0.18], [XE + 0.3, ZN - 0.18], [XE + 0.3, ZN + 0.18], [-1.3, ZN + 0.18]], y0: gM - 1, y1: gM + 5 });
  }
  // footing curb on the Shattuck side, slender columns at the high (plaza) edge
  K.box(parapet, XE - 0.15, gM - 0.4, ZN, XE + 0.35, hS(XE) + 0.05, 11.7);
  colliders.push({ type: 'poly', pts: [[XE - 0.15, ZN], [XE + 0.35, ZN], [XE + 0.35, 11.7], [XE - 0.15, 11.7]], y0: gM - 1, y1: gM + 1.2 });
  // ---- stair well: opening x[-0.8, 11.9] z[5.0, 11.6]; glass balustrades along both long sides
  const OX0 = -0.8, OZ0 = 5.0, OZ1 = 11.6;
  for (const z of [OZ0, OZ1]) {
    K.box(shellGlass, OX0, gM + 0.05, z - 0.01, XE - 0.2, gM + 1.02, z + 0.01);
    K.box(alu, OX0, gM + 1.02, z - 0.035, XE - 0.2, gM + 1.08, z + 0.035);
    K.box(alu, OX0 - 0.02, gM - 0.15, z - 0.12, XE - 0.2, gM + 0.06, z + 0.12);
    for (let x = OX0; x <= XE - 0.2; x += 1.6) K.box(alu, x - 0.025, gM, z - 0.025, x + 0.025, gM + 1.05, z + 0.025);
    colliders.push({ type: 'poly', pts: [[OX0, z - 0.08], [XE, z - 0.08], [XE, z + 0.08], [OX0, z + 0.08]], y0: gM - 1, y1: gM + 1.1 });
  }
  if (!UNDERGROUND_WALKABLE) colliders.push({ type: 'poly', pts: [[OX0 - 0.05, OZ0], [OX0 + 0.05, OZ0], [OX0 + 0.05, OZ1], [OX0 - 0.05, OZ1]], y0: gM - 7, y1: gM + 3 });
  let gPM = -1e9; for (let x = OX0 - 0.3; x <= XE + 0.31; x += 0.5) for (let z = OZ0 - 0.3; z <= OZ1 + 0.31; z += 0.5) gPM = Math.max(gPM, groundAt(x, z));
  { const po = new THREE.PlaneGeometry(XE - OX0, OZ1 - OZ0); po.rotateX(-Math.PI / 2); po.translate((OX0 + XE) / 2, Math.max(gM, gPM) + 0.07, (OZ0 + OZ1) / 2); portals.push(po); openings.push([[OX0, OZ0], [XE, OZ0], [XE, OZ1], [OX0, OZ1]]); }
  // central stair (z 7.15..9.45) and two escalators, all descending east to the concourse (-6 m)
  const xBot = OX0 + 0.3 + RISE_N * TREAD;
  KU.box(terrazzo, OX0, gM - 0.4, OZ0, OX0 + 0.3, gM, OZ1);
  for (let i = 0; i < RISE_N; i++) { const y = gM - (i + 1) * rise, x0 = OX0 + 0.3 + i * TREAD; KU.box(tread, x0, y - 0.35, 7.15, x0 + TREAD, y, 9.45); KU.box(M.iron, x0, y - 0.01, 7.15, x0 + 0.05, y + 0.004, 9.45); }
  walkables.push({ type: 'fn', bounds: [OX0, 7.15, xBot + 1, 9.45], heightAt: (x, z) => { if (z < 7.15 || z > 9.45 || x < OX0 || x > xBot + 1) return null; const t = x - OX0 - 0.3; return t < 0 ? gM : t > RISE_N * TREAD ? yC : gM - Math.ceil(t / TREAD) * rise; } });
  for (const [z0, z1] of [[5.25, 6.85], [9.75, 11.35]]) {
    const xs = OX0 + 0.9, xe = xs + DEPTH / Math.tan(Math.PI / 6); // 30-degree escalator
    const L = Math.hypot(xe - xs, DEPTH); const ang = Math.atan2(DEPTH, xe - xs);
    const mk = (mat, zz0, zz1, yOff, h, opts) => { const g = new THREE.BoxGeometry(L, h, zz1 - zz0); g.rotateZ(-ang); g.translate((xs + xe) / 2, gM - DEPTH / 2 + yOff, (zz0 + zz1) / 2); KU.add(mat, g); };
    mk(M.iron, z0, z1, -0.55, 0.9);
    walkables.push({ type: 'fn', bounds: [OX0, z0 + 0.25, xe + 1.2, z1 - 0.25], heightAt: (x, z) => { if (z < z0 + 0.25 || z > z1 - 0.25 || x < OX0 || x > xe + 1.2) return null; return x < xs ? gM : x > xe ? yC : gM - DEPTH * (x - xs) / (xe - xs); } });
    mk(M.iron, z0 + 0.25, z1 - 0.25, -0.06, 0.1);
    for (let k = 0; k < 26; k++) { const f = k / 26; const x = xs + (xe - xs) * f; KU.box(M.iron, x, gM - DEPTH * f - 0.12, z0 + 0.25, x + 0.05, gM - DEPTH * f + 0.02, z1 - 0.25); }
    KU.box(M.iron, OX0 + 0.3, gM - 0.12, z0 + 0.25, xs, gM - 0.02, z1 - 0.25); KU.box(M.iron, xe, yC - 0.12, z0 + 0.25, xe + 1.2, yC - 0.02, z1 - 0.25);
    for (const zb of [z0 + 0.12, z1 - 0.12]) { mk(shellGlass, zb - 0.01, zb + 0.01, 0.55, 0.9); mk(M.blackPaint, zb - 0.05, zb + 0.05, 1.02, 0.08); }
  }
  // light-well walls (opening sides), the beam under Shattuck, solid under the stairs
  KU.box(parapet, OX0 - 0.3, yCe, OZ0 - 0.3, XE, gM - 0.03, OZ0);
  KU.box(parapet, OX0 - 0.3, yCe, OZ1, XE, gM - 0.03, OZ1 + 0.3);
  KU.box(parapet, OX0 - 0.3, yC - 0.3, OZ0, OX0, gM - 0.03, OZ1);
  KU.box(parapet, OX0, yC - 0.3, OZ0, xBot, yC - 0.05, OZ1);
  KU.box(parapet, XE - 0.15, gM - 2.6, OZ0 - 6, XE + 0.35, gM - 0.03, OZ1 + 8);
  // ======================================================================================
  // Concourse (level -1, OSM indoor outline) and island platform (level -2) with a train
  // ======================================================================================
  const inAny = (x, z, list) => list.some((r) => pip(x, z, r));
  // platform frame: centreline of the trackway (OSM platform level), s across, t along
  const PA = [-4.8, -116.5], PB = [15.7, 95.7]; const PL = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]);
  const pd = [(PB[0] - PA[0]) / PL, (PB[1] - PA[1]) / PL], ps = [pd[1], -pd[0]];
  const PX = (sv, t) => [PA[0] + ps[0] * sv + pd[0] * t, PA[1] + ps[1] * sv + pd[1] * t];
  const toST = (x, z) => { const rx = x - PA[0], rz = z - PA[1]; return [rx * ps[0] + rz * ps[1], rx * pd[0] + rz * pd[1]]; };
  const EP = new THREE.Matrix4().makeBasis(new THREE.Vector3(ps[0], 0, ps[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(pd[0], 0, pd[1])).setPosition(PA[0], 0, PA[1]);
  const BP = (mat, s0, y0, t0, s1, y1, t1, opts) => { const g = new THREE.BoxGeometry(Math.abs(s1 - s0), Math.abs(y1 - y0), Math.abs(t1 - t0)); g.translate((s0 + s1) / 2, (y0 + y1) / 2, (t0 + t1) / 2); g.applyMatrix4(EP); return KU.add(mat, g, opts); };
  // concourse -> platform stairs at the OSM stair positions (level -1;-2), 36 risers each, descending along t
  const PSTAIRS = [[0.6, -61.2], [5.1, -14.7], [6.6, 1.15], [7.95, 15.25], [13.35, 71.1]].map(([x, z], i) => ({ tm: toST(x, z)[1], dir: i % 2 ? -1 : 1 }));
  const PSN = 36, PSW = 2.4, pRise = (yC - yPl) / PSN, PSLen = PSN * TREAD;
  const psOpen = PSTAIRS.map((q) => [PX(-PSW / 2 - 0.1, q.tm - PSLen / 2 - 0.1), PX(PSW / 2 + 0.1, q.tm - PSLen / 2 - 0.1), PX(PSW / 2 + 0.1, q.tm + PSLen / 2 + 0.1), PX(-PSW / 2 - 0.1, q.tm + PSLen / 2 + 0.1)]);
  const lightWell = [[OX0 - 0.3, OZ0 - 0.3], [XE + 0.35, OZ0 - 0.3], [XE + 0.35, OZ1 + 0.3], [OX0 - 0.3, OZ1 + 0.3]];
  { // floor + ceiling as 1 m cells inside the concourse outline
    const xs = CONC.map((p) => p[0]), zs = CONC.map((p) => p[1]); const fl = [], ce = [];
    for (let x = Math.floor(Math.min(...xs)); x < Math.max(...xs); x += 1) for (let z = Math.floor(Math.min(...zs)); z < Math.max(...zs); z += 1) {
      const cx = x + 0.5, cz = z + 0.5; if (!pip(cx, cz, CONC)) continue;
      if (!inAny(cx, cz, psOpen)) fl.push(x, yC, z, x, yC, z + 1, x + 1, yC, z + 1, x, yC, z, x + 1, yC, z + 1, x + 1, yC, z);
      if (!pip(cx, cz, lightWell) && !inAny(cx, cz, stairRects)) ce.push(x, yCe, z, x + 1, yCe, z + 1, x, yCe, z + 1, x, yCe, z, x + 1, yCe, z, x + 1, yCe, z + 1);
    }
    KU.add(terrazzo, triGeo(fl)); KU.add(ceilW, triGeo(ce));
    // perimeter walls (openings where the stairs land), BART brick
    for (let i = 0; i < CONC.length; i++) { const a = CONC[i], b2 = CONC[(i + 1) % CONC.length]; const L = Math.hypot(b2[0] - a[0], b2[1] - a[1]); if (L < 0.2) continue;
      const mx = (a[0] + b2[0]) / 2, mz = (a[1] + b2[1]) / 2;
      if (landings.some((q) => Math.hypot(q[0] - mx, q[1] - mz) < 3.6) || inAny(mx, mz, stairRects) || pip(mx, mz, lightWell)) continue;
      const g = new THREE.BoxGeometry(L + 0.3, yCe - yC + 0.4, 0.3); g.rotateY(-Math.atan2(b2[1] - a[1], b2[0] - a[0])); g.translate(mx, (yC + yCe) / 2, mz); KU.add(brickD, g);
      colliders.push({ type: 'poly', pts: [[a[0], a[1]], [b2[0], b2[1]], [b2[0] + 0.01, b2[1] + 0.01], [a[0] + 0.01, a[1] + 0.01]], y0: yC - 0.5, y1: yCe + 0.3 }); }
    // light strips across the ceiling along the platform direction, plus hanging signs
    for (let sv = -6; sv <= 22; sv += 4) { const pts = []; for (let t = 30; t < PL - 20; t += 1) { const q = PX(sv, t); if (pip(q[0], q[1], CONC) && !inAny(q[0], q[1], stairRects) && !pip(q[0], q[1], lightWell)) pts.push(t); }
      if (pts.length) { let t0 = pts[0], prev = pts[0]; for (const t of [...pts.slice(1), 1e9]) { if (t - prev > 1.01) { if (prev - t0 > 1) BP(tube, sv - 0.09, yCe - 0.06, t0, sv + 0.09, yCe, prev + 1); t0 = t; } prev = t; } } }
    // fare gates (red paddles) across the concourse near the turnstile nodes, agent booth
    for (const [cx, cz] of [[2.76, 15.07], [-0.14, -13.03], [10.46, 65.77]]) { const [sv0, t0] = toST(cx, cz);
      for (let sv = -7; sv <= 18; sv += 1.05) { const q = PX(sv, t0); if (!pip(q[0], q[1], CONC) || pip(q[0], q[1], lightWell) || inAny(q[0], q[1], psOpen)) continue;
        BP(alu, sv - 0.15, yC, t0 - 0.7, sv + 0.15, yC + 1.0, t0 + 0.7); BP(red, sv + 0.15, yC + 0.55, t0 - 0.06, sv + 0.5, yC + 0.95, t0 + 0.06); } }
    { const [sv, t] = toST(14.5, 30); BP(shellGlass, sv - 1.5, yC, t - 1.6, sv + 1.5, yC + 2.4, t + 1.6); BP(alu, sv - 1.6, yC + 2.4, t - 1.7, sv + 1.6, yC + 2.6, t + 1.7); BP(alu, sv - 1.4, yC, t - 1.5, sv + 1.4, yC + 1.0, t + 1.5); }
    for (const [x, z] of [[4, -40], [9, -5], [12, 40], [16, 60]]) { const [sv, t] = toST(x, z); BP(M.blackPaint, sv - 0.8, yCe - 0.55, t - 0.04, sv + 0.8, yCe - 0.25, t + 0.04); for (const o of [-0.6, 0.6]) BP(alu, sv + o - 0.01, yCe - 0.25, t - 0.01, sv + o + 0.01, yCe, t + 0.01); }
    walkables.push({ type: 'fn', bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)], heightAt: (x, z) => (pip(x, z, CONC) && !inAny(x, z, psOpen) ? yC : null) });
  }
  { // platform level: island platform, two trackbeds with rails, dark walls, lit coffered ceiling
    const pw = 4.75, tw = 4.2, yT = yPl - 1.1, yPc = yPl + 3.9;
    BP(terrazzo, -pw, yT, 0, pw, yPl, PL);
    for (const sg of [-1, 1]) {
      BP(yellowM, sg * (pw - 0.62) - 0.0, yPl, 0, sg * pw, yPl + 0.01, PL);
      BP(darkWall, sg * pw, yT - 0.3, 0, sg * (pw + tw), yT, PL);
      for (const r of [1.4, 2.83]) BP(M.iron, sg * (pw + r) - 0.04, yT, 0, sg * (pw + r) + 0.04, yT + 0.16, PL);
      BP(parapet, sg * (pw + 3.6) - 0.15, yT, 0, sg * (pw + 3.6) + 0.15, yT + 0.25, PL); // third-rail cover
      BP(darkWall, sg * (pw + tw), yT - 0.3, 0, sg * (pw + tw + 0.3), yPc + 0.6, PL);
      BP(parapet, sg * pw, yPc + 0.35, 0, sg * (pw + tw), yPc + 0.6, PL);
      for (let t = 4; t < PL - 2; t += 6) BP(tube, sg * (pw + 1.2) - 0.08, yPc + 0.3, t, sg * (pw + 1.2) + 0.08, yPc + 0.35, t + 1.2);
      colliders.push({ type: 'poly', pts: [PX(sg * (pw + tw), 0), PX(sg * (pw + tw + 0.3), 0), PX(sg * (pw + tw + 0.3), PL), PX(sg * (pw + tw), PL)], y0: yT - 1, y1: yPc + 1 });
    }
    for (const t of [0, PL]) { BP(darkWall, -pw - tw - 0.3, yT - 0.3, t - (t ? 0 : 0.3), pw + tw + 0.3, yPc + 0.6, t + (t ? 0.3 : 0)); colliders.push({ type: 'poly', pts: [PX(-pw - tw, t - 0.15), PX(pw + tw, t - 0.15), PX(pw + tw, t + 0.15), PX(-pw - tw, t + 0.15)], y0: yT - 1, y1: yPc + 1 }); }
    BP(ceilW, -pw, yPc, 0, pw, yPc + 0.25, PL);
    for (let t = 2; t < PL - 2; t += 3.0) for (const sv of [-2.6, 0, 2.6]) BP(tube, sv - 0.75, yPc - 0.04, t, sv + 0.75, yPc, t + 1.4);
    // concourse floor openings for the platform stairs: stairs, glass rails, soffits
    for (const q of PSTAIRS) {
      const t0 = q.tm - PSLen / 2;
      for (let i = 0; i < PSN; i++) { const y = yC - (i + 1) * pRise; const ta = q.dir > 0 ? t0 + i * TREAD : t0 + PSLen - (i + 1) * TREAD; BP(tread, -PSW / 2, y - 0.35, ta, PSW / 2, y, ta + TREAD); BP(M.iron, -PSW / 2, y - 0.01, q.dir > 0 ? ta : ta + TREAD - 0.05, PSW / 2, y + 0.004, q.dir > 0 ? ta + 0.05 : ta + TREAD); }
      for (const sg of [-1, 1]) { BP(shellGlass, sg * (PSW / 2 + 0.05) - 0.01, yC, t0, sg * (PSW / 2 + 0.05) + 0.01, yC + 1.0, t0 + PSLen); BP(alu, sg * (PSW / 2 + 0.05) - 0.03, yC + 1.0, t0, sg * (PSW / 2 + 0.05) + 0.03, yC + 1.06, t0 + PSLen);
        BP(parapet, sg * (PSW / 2 + 0.02), yPl, t0, sg * (PSW / 2 + 0.25), yC, t0 + PSLen);
        colliders.push({ type: 'poly', pts: [PX(sg * (PSW / 2 + 0.02), t0), PX(sg * (PSW / 2 + 0.25), t0), PX(sg * (PSW / 2 + 0.25), t0 + PSLen), PX(sg * (PSW / 2 + 0.02), t0 + PSLen)], y0: yPl + 2.2, y1: yC + 1.1 }); }
      const tEndHigh = q.dir > 0 ? t0 + PSLen : t0; // far end at concourse level is the deep end: rail across it
      const tEndLow = q.dir > 0 ? t0 : t0 + PSLen;
      BP(shellGlass, -PSW / 2, yC, q.dir > 0 ? t0 + PSLen - 0.02 : t0, PSW / 2, yC + 1.0, q.dir > 0 ? t0 + PSLen : t0 + 0.02);
      colliders.push({ type: 'poly', pts: [PX(-PSW / 2, tEndHigh - 0.05), PX(PSW / 2, tEndHigh - 0.05), PX(PSW / 2, tEndHigh + 0.05), PX(-PSW / 2, tEndHigh + 0.05)], y0: yC - 0.2, y1: yC + 1.1 });
      walkables.push({ type: 'fn', bounds: (() => { const cs = [PX(-PSW / 2 - 0.2, t0 - 0.2), PX(PSW / 2 + 0.2, t0 - 0.2), PX(PSW / 2 + 0.2, t0 + PSLen + 0.2), PX(-PSW / 2 - 0.2, t0 + PSLen + 0.2)]; return [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))]; })(),
        heightAt: (x, z) => { const [sv, t] = toST(x, z); if (Math.abs(sv) > PSW / 2 + 0.12 || t < t0 - 0.15 || t > t0 + PSLen + 0.15) return null; const k = q.dir > 0 ? (t - t0) / TREAD : (t0 + PSLen - t) / TREAD; return yC - Math.max(0, Math.min(PSN, Math.ceil(k))) * pRise; } });
    }
    // a parked BART train on the west track: ten aluminium cars with blue stripes and dark windows
    for (let c = 0; c < 10; c++) { const ta = 6 + c * 21.0, tb = ta + 20.4, sv = -(pw + 2.1), yb = yT + 0.9;
      BP(trainM, sv - 1.6, yb, ta, sv + 1.6, yb + 3.0, tb); BP(trainM, sv - 1.35, yb + 3.0, ta + 0.3, sv + 1.35, yb + 3.25, tb - 0.3);
      for (const sg of [-1, 1]) { BP(M.glass, sv + sg * 1.6 - 0.02, yb + 1.55, ta + 1.0, sv + sg * 1.6 + 0.02, yb + 2.45, tb - 1.0); BP(blueM, sv + sg * 1.6 - 0.025, yb + 0.95, ta + 0.2, sv + sg * 1.6 + 0.025, yb + 1.15, tb - 0.2); BP(blueM, sv + sg * 1.6 - 0.025, yb + 1.25, ta + 0.2, sv + sg * 1.6 + 0.025, yb + 1.33, tb - 0.2); }
      BP(darkWall, sv - 1.2, yT + 0.1, ta + 2, sv + 1.2, yb, tb - 2); }
    walkables.push({ type: 'fn', bounds: (() => { const cs = [PX(-pw - tw, 0), PX(pw + tw, 0), PX(pw + tw, PL), PX(-pw - tw, PL)]; return [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))]; })(),
      heightAt: (x, z) => { const [sv, t] = toST(x, z); if (t < 0 || t > PL || Math.abs(sv) > pw + tw) return null; return Math.abs(sv) <= pw ? yPl : yT; } });
    holes.push([PX(-pw - tw - 0.3, -0.3), PX(pw + tw + 0.3, -0.3), PX(pw + tw + 0.3, PL + 0.3), PX(-pw - tw - 0.3, PL + 0.3)]);
  }
  holes.push(CONC.map((p) => [p[0], p[1]]));
  // ======================================================================================
  // Plaza: paving, planters with hoop rails, benches, globe sculpture, light poles, pylon
  // ======================================================================================
  { const X0 = -6.5, X1 = 13.6, Z0 = -6, Z1 = 35; const pos = [];
    for (let z = Z0; z < Z1; z += 1) for (let x = X0; x < X1; x += 1) {
      const rects = []; const ox0 = Math.max(x, OX0), ox1 = Math.min(x + 1, XE), oz0 = Math.max(z, OZ0), oz1 = Math.min(z + 1, OZ1);
      if (ox0 >= ox1 || oz0 >= oz1) rects.push([x, z, x + 1, z + 1]);
      else { if (ox0 > x) rects.push([x, z, ox0, z + 1]); if (ox1 < x + 1) rects.push([ox1, z, x + 1, z + 1]); if (oz0 > z) rects.push([ox0, z, ox1, oz0]); if (oz1 < z + 1) rects.push([ox0, oz1, ox1, z + 1]); }
      for (const [ax, az, bx, bz] of rects) { const a = [ax, groundAt(ax, az) + 0.03, az], b = [bx, groundAt(bx, az) + 0.03, az], c = [bx, groundAt(bx, bz) + 0.03, bz], d = [ax, groundAt(ax, bz) + 0.03, bz];
        pos.push(...a, ...d, ...c, ...a, ...c, ...b); }
    }
    K.add(apron, triGeo(pos)); }
  for (const [x0, z0, x1, z1] of [[9.4, 17.5, 11.2, 24.5], [9.4, 26.5, 11.2, 33.5], [-5.6, 18.0, -3.8, 25.0], [-0.5, -5.0, 6.5, -3.4]]) {
    const g = groundAt((x0 + x1) / 2, (z0 + z1) / 2);
    K.box(parapet, x0, g - 0.3, z0, x1, g + 0.15, z1);
    K.box(M.soil, x0 + 0.1, g + 0.05, z0 + 0.1, x1 - 0.1, g + 0.13, z1 - 0.1);
    for (const [a, b] of [[[x0 - 0.2, z0 - 0.2], [x1 + 0.2, z0 - 0.2]], [[x1 + 0.2, z0 - 0.2], [x1 + 0.2, z1 + 0.2]], [[x1 + 0.2, z1 + 0.2], [x0 - 0.2, z1 + 0.2]], [[x0 - 0.2, z1 + 0.2], [x0 - 0.2, z0 - 0.2]]]) { K.box(alu, Math.min(a[0], b[0]) - 0.02, g + 0.46, Math.min(a[1], b[1]) - 0.02, Math.max(a[0], b[0]) + 0.02, g + 0.5, Math.max(a[1], b[1]) + 0.02); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let k = 0; k <= L; k += 1.2) { const px = a[0] + (b[0] - a[0]) * k / L, pz = a[1] + (b[1] - a[1]) * k / L; K.box(alu, px - 0.02, g, pz - 0.02, px + 0.02, g + 0.5, pz + 0.02); } }
    const n = Math.round((Math.max(x1 - x0, z1 - z0)) * 1.6);
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, r = (k * 0.618) % 1; const long = (z1 - z0) > (x1 - x0); const px = long ? x0 + 0.35 + r * (x1 - x0 - 0.7) : x0 + 0.3 + f * (x1 - x0 - 0.6), pz = long ? z0 + 0.3 + f * (z1 - z0 - 0.6) : z0 + 0.35 + r * (z1 - z0 - 0.7); K.cyl(plant, px, g + 0.12, pz, 0.36, 0.22, 0.35 + (k % 3) * 0.1, 7); }
    colliders.push({ type: 'poly', pts: [[x0 - 0.2, z0 - 0.2], [x1 + 0.2, z0 - 0.2], [x1 + 0.2, z1 + 0.2], [x0 - 0.2, z1 + 0.2]], y0: g - 1, y1: g + 0.6 });
  }
  for (const [x, z] of [[-2.0, 21.0], [0.4, 23.6], [-2.6, 26.2], [1.2, 28.4], [4.0, 21.8]]) { const g = groundAt(x, z);
    K.cyl(red, x, g + 0.71, z, 0.33, 0.33, 0.03, 14); K.cyl(M.iron, x, g, z, 0.04, 0.04, 0.72, 6); K.cyl(M.iron, x, g, z, 0.25, 0.25, 0.02, 10);
    for (const a of [0.4, 2.5, 4.6]) { const cx = x + Math.cos(a) * 0.62, cz = z + Math.sin(a) * 0.62; K.box(red, cx - 0.21, g + 0.44, cz - 0.21, cx + 0.21, g + 0.47, cz + 0.21); K.obox(red, cx + Math.cos(a) * 0.2, g + 0.68, cz + Math.sin(a) * 0.2, 0.42, 0.42, 0.03, -a + Math.PI / 2); for (const [ox, oz] of [[-0.17, -0.17], [0.17, -0.17], [0.17, 0.17], [-0.17, 0.17]]) K.box(red, cx + ox - 0.012, g, cz + oz - 0.012, cx + ox + 0.012, g + 0.45, cz + oz + 0.012); }
    colliders.push({ type: 'cyl', x, z, r: 0.95, y0: g - 1, y1: g + 0.8 }); }
  { // perforated bronze globe on a tilted axis, low round plinth
    const x = 3.6, z = 1.2, g = groundAt(x, z);
    K.cyl(parapet, x, g - 0.2, z, 1.25, 1.25, 0.6, 24);
    const sg = new THREE.SphereGeometry(1.5, 22, 14); const pos = sg.attributes.position; const keep = [];
    const idx = sg.index.array; for (let i = 0; i < idx.length; i += 3) { const a = idx[i]; const vy = pos.getY(a), vx = pos.getX(a), vz = pos.getZ(a); const lat = Math.floor((Math.asin(Math.max(-1, Math.min(1, vy / 1.5))) + 1.6) * 3.2), lon = Math.floor((Math.atan2(vz, vx) + 3.2) * 2.6); if ((lat + lon) % 3 !== 0) keep.push(idx[i], idx[i + 1], idx[i + 2]); }
    sg.setIndex(keep); const gg = sg.toNonIndexed(); gg.rotateZ(0.41); gg.translate(x, g + 0.4 + 1.5, z);
    const bz = M.darkBronze.clone(); bz.side = THREE.DoubleSide; bz.name = 'bartGlobe'; K.add(bz, gg);
    colliders.push({ type: 'cyl', x, z, r: 1.3, y0: g - 1, y1: g + 3.5 });
  }
  for (const [x, z] of [[-6.0, 0.2], [8.2, -1.0], [12.6, 17.0], [12.8, 30.5]]) { const g = groundAt(x, z); K.box(alu, x - 0.125, g, z - 0.125, x + 0.125, g + 8.0, z + 0.125);
    for (const [ax, az, hy] of [[1, 0, 7.4], [-0.5, 0.86, 6.8], [-0.5, -0.86, 7.1]]) { K.box(alu, x + Math.min(0, ax * 0.9) - 0.04, g + hy, z + Math.min(0, az * 0.9) - 0.04, x + Math.max(0, ax * 0.9) + 0.04, g + hy + 0.08, z + Math.max(0, az * 0.9) + 0.04); K.box(M.lampGlow, x + ax * 0.9 - 0.16, g + hy - 0.12, z + az * 0.9 - 0.12, x + ax * 0.9 + 0.16, g + hy, z + az * 0.9 + 0.12); }
    colliders.push({ type: 'cyl', x, z, r: 0.18, y0: g - 1, y1: g + 8 }); }
  { // tall BART pylon on the plaza corner (Center St side)
    const x = 11.6, z = 1.6, g = groundAt(x, z);
    K.box(M.blackPaint, x - 0.2, g, z - 0.2, x + 0.2, g + 3.2, z + 0.2);
    for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const pg = new THREE.PlaneGeometry(0.36, 0.36); pg.translate(0, 0, 0.205); pg.rotateY(r); pg.translate(x, g + 2.85, z); K.add(logoMat, pg, { uvMode: 'keep' }); }
    for (const r of [0, Math.PI]) { const pg = new THREE.PlaneGeometry(0.3, 2.2); pg.translate(0, 0, 0.205); pg.rotateY(r + Math.PI / 2); pg.translate(x, g + 1.4, z); K.add(nameMat, pg, { uvMode: 'keep' }); }
    colliders.push({ type: 'box', min: [x - 0.2, g - 1, z - 0.2], max: [x + 0.2, g + 3.2, z + 0.2] });
  }
  // ---- elevator kiosk (NW corner of Center St) and its covered stair
  {
    const x = -6.5, z = -34.0, g = groundAt(x, z), w = 2.6;
    K.box(M.concreteDark, x - w / 2, g - 0.3, z - w / 2, x + w / 2, g + 0.12, z + w / 2);
    K.box(shellGlass, x - w / 2 + 0.08, g + 0.12, z - w / 2 + 0.08, x + w / 2 - 0.08, g + 3.0, z + w / 2 - 0.08);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(alu, x + a * w / 2 - 0.1, g, z + b * w / 2 - 0.1, x + a * w / 2 + 0.1, g + 3.3, z + b * w / 2 + 0.1);
    K.box(alu, x - w / 2 - 0.25, g + 3.0, z - w / 2 - 0.25, x + w / 2 + 0.25, g + 3.35, z + w / 2 + 0.25);
    K.box(alu, x - 0.55, g + 0.12, z + w / 2 - 0.1, x + 0.55, g + 2.3, z + w / 2 - 0.04);
    { const pg = new THREE.PlaneGeometry(0.5, 0.5); pg.translate(x, g + 2.7, z + w / 2 + 0.26); K.add(logoMat, pg, { uvMode: 'keep' }); }
    colliders.push({ type: 'box', min: [x - w / 2, g - 1, z - w / 2], max: [x + w / 2, g + 3.4, z + w / 2] });
    const sx0 = -6.9, sx1 = -4.7, sz0 = -31.7, sz1 = -26.3, gs = groundAt(-5.8, -29);
    for (const xx of [sx0 - 0.25, sx1]) { K.box(parapet, xx, gs - 0.02, sz0, xx + 0.25, gs + PH, sz1); colliders.push({ type: 'box', min: [xx, gs - 1, sz0], max: [xx + 0.25, gs + PH, sz1] }); }
    for (const [xx, zz] of [[sx0 - 0.2, sz1], [sx1 + 0.2, sz1], [sx0 - 0.2, sz0 + 1.6], [sx1 + 0.2, sz0 + 1.6]]) K.box(alu, xx - 0.06, gs, zz - 0.06, xx + 0.06, gs + 3.1, zz + 0.06);
    K.box(shellGlass, sx0 - 0.35, gs + 3.1, sz0 + 1.4, sx1 + 0.35, gs + 3.14, sz1 + 0.2); K.box(alu, sx0 - 0.4, gs + 3.0, sz1 + 0.1, sx1 + 0.4, gs + 3.2, sz1 + 0.25);
  }

  // ---------- assemble ----------
  const object3d = K.finish(); object3d.name = 'downtown-berkeley-bart';
  object3d.traverse((o) => { if (o.isMesh && o.material === shellGlass) noShadow(o); });
  const under = KU.finish(); under.name = 'bart-underground';
  under.traverse((o) => { if (o.isMesh) { o.renderOrder = -3; if (o.material === shellGlass) noShadow(o); } });
  object3d.add(under);
  const portal = new THREE.Mesh(mergePos(portals), portalMat); portal.renderOrder = -2; portal.name = 'bart-portals'; noShadow(portal); object3d.add(portal);
  { const sh = new THREE.Shape(); const X0 = -40, X1 = 70, Z0 = -130, Z1 = 110; sh.moveTo(X0, -Z0); sh.lineTo(X1, -Z0); sh.lineTo(X1, -Z1); sh.lineTo(X0, -Z1); sh.lineTo(X0, -Z0);
    for (const o of openings) { const hp = new THREE.Path(); hp.moveTo(o[0][0], -o[0][1]); for (let i = 1; i < o.length; i++) hp.lineTo(o[i][0], -o[i][1]); hp.lineTo(o[0][0], -o[0][1]); sh.holes.push(hp); }
    const lg = new THREE.ShapeGeometry(sh); lg.rotateX(-Math.PI / 2); lg.translate(0, gM - 0.35, 0); lids.push(lg); }
  const lid = new THREE.Mesh(mergePos(lids), lidMat); lid.name = 'bart-shadow-lid'; object3d.add(lid);
  // street surface inside the physics holes (everything that is not an opening stands on the terrain height)
  { const all = holes.flat(); walkables.push({ type: 'fn', bounds: [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))],
      heightAt: (x, z) => (inAny(x, z, holes) && !inAny(x, z, openings) ? groundAt(x, z) : null) }); }
  return { object3d, colliders, walkables: UNDERGROUND_WALKABLE ? walkables : [], terrainHoles: UNDERGROUND_WALKABLE ? holes : [], interactions: [] };
}
