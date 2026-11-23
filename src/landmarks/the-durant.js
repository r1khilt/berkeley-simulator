// The Durant, 2631 Durant Avenue (Stanley Saitowitz | Natoma Architects): five storeys of student apartments on the
// north side of Durant Avenue, between the board-formed concrete of the old University Art Museum (Bakar BioEnginuity
// Hub) and the brown-shingle Theta Xi house. A white gridded frame (projecting slab bands at every floor, two full-height
// fins per front) holds dark fibre-cement panels and tall black-framed windows; the plan is two wings joined by a waist
// (elevator + laundry). The street front is a double-height garden porch either side of a glazed stair slot marked
// "2631", raised on a charcoal plinth behind a planting strip; the roof is a common deck with stair and elevator
// penthouses. Massing from the 2021 LiDAR (main roof ~17 m over the street corner, stair penthouses ~20 m, elevator
// core ~22 m); facades from the architect's photos and livethedurant.com. [r6-durant]
import * as THREE from 'three';
import { Kit } from './lib/classic-kit.js';
import { tint, offset } from './lib/b06a-kit.js';

export const info = {
  id: 'the-durant',
  name: 'The Durant',
  subtitle: 'Stanley Saitowitz | Natoma Architects · 2631 Durant Avenue',
  blurb: 'A five-storey student apartment building a block south of campus. A white gridded frame holds dark fibre-cement panels and tall windows, and a glazed stair rises from the double-height garden porch on Durant Avenue to a shared roof deck.',
  replaces: ['w/1007177038'],
};

const _mats = {};
function mats(M) {
  if (_mats.panel) return _mats;
  _mats.panel = new THREE.MeshStandardMaterial({ color: 0x575b61, roughness: 0.72, name: 'durant-fibre-cement' });
  _mats.white = tint(M, 'whitePaint', '#dcdedf', { roughness: 0.45 });
  _mats.plinth = tint(M, 'concrete', '#6f747c');
  _mats.slot = tint(M, 'glass', '#22303d', { roughness: 0.05, metalness: 0.35 }); // stair-slot glass (no rooms behind it)
  _mats.slot.userData.interior = false;
  _mats.roof = tint(M, 'concrete', '#f4f3ef');
  _mats.mulch = tint(M, 'soil', '#5c4e44');
  _mats.step = tint(M, 'concrete', '#8d9095');
  _mats.shrub = new THREE.MeshStandardMaterial({ color: 0xb4baae, roughness: 0.95, flatShading: true, name: 'durant-shrub' });
  _mats.leaf = new THREE.MeshStandardMaterial({ color: 0x627a40, roughness: 0.9, flatShading: true, name: 'durant-leaf' });
  _mats.solar = new THREE.MeshStandardMaterial({ color: 0x1c2533, roughness: 0.22, metalness: 0.45, name: 'durant-pv' });
  _mats.stucco = tint(M, 'stucco', '#9a9b9c');
  try { // "2631" in white numerals on the stair-slot glass
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 96); x.fillStyle = '#ffffff'; x.font = '600 80px Helvetica, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('2631', 128, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    _mats.sign = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.5, name: 'durant-sign' });
    _mats.sign.userData.interior = false;
  } catch (e) { _mats.sign = null; }
  return _mats;
}

export async function build(ctx) {
  const ANG = THREE.MathUtils.degToRad(-8.7);   // Durant Ave street grid
  const K = new Kit(ctx, ANG); const M = ctx.M; const X = mats(M);
  const PANEL = X.panel, WHITE = X.white, FR = M.blackPaint, GLASS = M.windowNight;
  const colliders = [], walkables = [];
  // floor lines (local y; 0 = lowest ground on the footprint, the street corner by the museum drive)
  const FFL = 1.7, LV = [1.7, 4.9, 7.85, 10.8, 13.75, 16.7], TOP = 17.2, BH = 0.11, IN = 0.15;
  // building frame: u east along Durant, v south toward the street. Wings + waist from the OSM outline.
  const S = { u0: -9.1, u1: 9.41, v0: 1.2, v1: 17.26 }, N = { u0: -9.37, u1: 8.95, v0: -17.5, v1: -1.2 };
  const WA = { u0: -4.8, u1: 5.52 };
  const SL = { u0: -1.05, u1: 1.36, v: 16.76 };            // front stair slot (glazed, recessed)
  const NN = { u0: -1.28, u1: 0.93, v: -16.2 };            // rear notch (glazed corridor end)
  const PW = { u0: -4.935, u1: SL.u0 }, PE = { u0: SL.u1, u1: 5.245 }, PV = 13.76; // double-height porch halves
  const rear = [[S.u1, S.v0], [WA.u1, S.v0], [WA.u1, N.v1], [N.u1, N.v1], [N.u1, N.v0], [NN.u1, N.v0], [NN.u1, NN.v], [NN.u0, NN.v], [NN.u0, N.v0],
    [N.u0, N.v0], [N.u0, N.v1], [WA.u0, N.v1], [WA.u0, S.v0], [S.u0, S.v0]];
  const outline = (porch) => [
    [S.u0, S.v1], ...(porch ? [[PW.u0, S.v1], [PW.u0, PV], [PW.u1, PV]] : [[SL.u0, S.v1]]), [SL.u0, SL.v], [SL.u1, SL.v],
    ...(porch ? [[PE.u0, PV], [PE.u1, PV], [PE.u1, S.v1]] : [[SL.u1, S.v1]]), [S.u1, S.v1], ...rear];

  // ---------- core volume (dark fibre-cement), inset so windows sit in real reveals ----------
  K.prism(PANEL, offset(outline(true), -IN), -1.0, LV[2]);
  K.prism(PANEL, offset(outline(false), -IN), LV[2], LV[5]);
  K.prism(X.plinth, offset(outline(true), 0.03), -1.2, FFL - 0.02);             // charcoal concrete base
  K.flat(X.roof, offset(outline(false), -IN), LV[5] + 0.02);

  // ---------- facade cells (run coords: s along, y up, d outward from the outline; core face at d = -IN) ----------
  // window: full storey height, black frame, a 75/25 split with the narrow operable lite next to the panel
  const win = (R, c0, c1, y0, y1, narrowLeft) => {
    K.rbox(R, GLASS, c0, y0, -IN, c1, y1, -IN + 0.04);
    const fd = -IN + 0.08, fw = 0.055;
    K.rbox(R, FR, c0, y0, -IN, c0 + fw, y1, fd); K.rbox(R, FR, c1 - fw, y0, -IN, c1, y1, fd);
    K.rbox(R, FR, c0, y1 - fw, -IN, c1, y1, fd); K.rbox(R, FR, c0, y0, -IN, c1, y0 + 0.08, fd);
    const m = narrowLeft ? c0 + 0.5 : c1 - 0.5; K.rbox(R, FR, m - 0.03, y0, -IN, m + 0.03, y1, fd, { detail: true });
  };
  const panel = (R, c0, c1, y0, y1) => {
    K.rbox(R, PANEL, c0, y0, -IN, c1, y1, 0);
    const m = (c0 + c1) / 2; K.rbox(R, FR, m - 0.01, y0, 0, m + 0.01, y1, 0.012, { detail: true });
  };
  // storefront: floor-to-ceiling glass, mullions ~0.95 m
  const store = (R, c0, c1, y0, y1, door) => {
    K.rbox(R, GLASS, c0, y0, -IN, c1, y1, -IN + 0.04);
    const n = Math.max(2, Math.round((c1 - c0) / 0.95)); const fd = -IN + 0.1;
    for (let i = 0; i <= n; i++) { const s = c0 + (c1 - c0) * i / n; K.rbox(R, FR, Math.max(c0, s - 0.03), y0, -IN, Math.min(c1, s + 0.03), y1, fd, { detail: i > 0 && i < n }); }
    K.rbox(R, FR, c0, y1 - 0.06, -IN, c1, y1, fd); K.rbox(R, FR, c0, y0, -IN, c1, y0 + 0.1, fd);
    if (door) K.rbox(R, FR, door - 0.95, y0 + 2.3, -IN, door + 0.95, y0 + 2.36, fd, { detail: true }); // door head
  };
  // one storey of cells: [s0, s1, type] with 'W' window, 'P' panel, 'S' storefront
  const cellsY = (k) => [k === 0 ? FFL : LV[k] + BH, k === 4 ? LV[5] - 0.15 : LV[k + 1] - BH];
  const row = (R, cells, k) => {
    const [y0, y1] = cellsY(k);
    cells.forEach(([c0, c1, t], i) => {
      if (t === 'P') panel(R, c0, c1, y0, y1);
      else if (t === 'W') { const l = cells[i - 1], r = cells[i + 1]; win(R, c0, c1, y0, y1, l ? l[2] === 'P' : !(r && r[2] === 'P')); }
      else if (t === 'S') store(R, c0, c1, y0, y1);
    });
  };
  const band = (R, s0, s1, y, e0 = 0.32, e1 = 0.32) => K.rbox(R, WHITE, s0 - e0, y - BH, -IN, s1 + e1, y + BH, 0.32); // ends overlap the next face's band: wraps the corners
  const fin = (R, s, y0 = FFL, y1 = LV[5]) => K.rbox(R, WHITE, s - 0.14, y0, -IN, s + 0.14, y1, 0.36);
  const parapet = (R, s0, s1) => { K.rbox(R, PANEL, s0, LV[5] - 0.15, -IN, s1, TOP, 0); K.rbox(R, FR, s0, TOP, -0.3, s1, TOP + 0.05, 0.02); };
  const split = (s0, s1, n) => Array.from({ length: n }, (_, i) => [s0 + (s1 - s0) * i / n, s0 + (s1 - s0) * (i + 1) / n]);
  // a side face of 4 bays x 2 cells, staggered window/panel pairs; the glazed corner cell is at s=0 (or s=L if cornerAtEnd)
  const sideFace = (R, L, cornerAtEnd, store0) => {
    const cs = split(0, L, 8);
    for (let k = 0; k < 5; k++) {
      const cells = cs.map(([a, b], i) => {
        const bay = cornerAtEnd ? 3 - (i >> 1) : i >> 1; const first = cornerAtEnd ? (i & 1) === 1 : (i & 1) === 0;
        if (store0 && bay === 0 && k <= 1) return [a, b, 'S'];
        const winFirst = bay === 0 ? true : ((bay + k) % 2 === 0);
        return [a, b, first === winFirst ? 'W' : 'P'];
      });
      row(R, cells, k);
    }
    for (let k = 1; k < 5; k++) band(R, 0, L, LV[k]);
    for (const s of [L / 4, L / 2, 3 * L / 4]) fin(R, s);
    parapet(R, 0, L);
  };
  // short notch / waist faces
  const shortFace = (R, L, pat) => {
    const cs = pat === 'mid' ? [[0, L / 2 - 0.45, 'P'], [L / 2 - 0.45, L / 2 + 0.45, 'W'], [L / 2 + 0.45, L, 'P']] : split(0, L, 2).map(([a, b], i) => [a, b, i === 0 ? 'W' : 'P']);
    for (let k = 0; k < 5; k++) row(R, k % 2 && pat !== 'mid' ? cs.map(([a, b, t]) => [a, b, t === 'W' ? 'P' : 'W']) : cs, k);
    for (let k = 1; k < 5; k++) band(R, 0, L, LV[k]);
    parapet(R, 0, L);
  };

  // --- street front (south) ---
  {
    const R = K.run([S.u0, S.v1], [S.u1, S.v1]); const o = -S.u0;
    const sl0 = SL.u0 + o, sl1 = SL.u1 + o, f0 = -5.075 + o, f1 = 5.385 + o, L = R.L;
    const wl = split(0, f0, 2), wr = split(f0, sl0, 2), el = split(sl1, f1, 2), er = split(f1, L, 2);
    const upper = [[...wl[0], 'W'], [...wl[1], 'P'], [...wr[0], 'P'], [...wr[1], 'W'], [...el[0], 'W'], [...el[1], 'P'], [...er[0], 'P'], [...er[1], 'W']];
    for (let k = 2; k < 5; k++) row(R, upper, k);
    for (let k = 0; k < 2; k++) { const [y0, y1] = cellsY(k); store(R, 0, f0 - 0.14, y0, y1); store(R, f1 + 0.14, L, y0, y1); }
    band(R, 0, f0, LV[1], 0.32, 0); band(R, f1, L, LV[1], 0, 0.32);
    for (let k = 2; k < 5; k++) { band(R, 0, sl0, LV[k], 0.32, 0); band(R, sl1, L, LV[k], 0, 0.32); }
    fin(R, f0); fin(R, f1);
    parapet(R, 0, sl0); parapet(R, sl1, L);
    // porch halves: back storefront (lobby / lounge) with doors, dark upper wall, white band returns, paving, downlights
    for (const P of [PW, PE]) {
      const B = K.run([P.u0, PV], [P.u1, PV]);
      store(B, 0, B.L, FFL, LV[1] - 0.1, B.L / 2);
      K.rbox(B, WHITE, 0, LV[1] - BH, -IN, B.L, LV[1] + BH, -IN + 0.12);
      const Rs = P === PW ? K.run([PW.u0, S.v1], [PW.u0, PV]) : K.run([PE.u1, PV], [PE.u1, S.v1]);
      K.rbox(Rs, WHITE, 0, LV[1] - BH, -IN, Rs.L, LV[1] + BH, -IN + 0.12);
      K.box(M.paving, P.u0, FFL - 0.4, PV - IN, P.u1, FFL, S.v1);
      for (const t of [0.3, 0.7]) K.cyl(M.lampGlow, P.u0 + (P.u1 - P.u0) * t, LV[2] - 0.03, (PV + S.v1) / 2, 0.09, 0.09, 0.03, 10, { detail: true });
    }
    // glazed stair slot: full height, rising above the roof to the white-capped stair penthouse
    const SR = K.run([SL.u0 - IN, SL.v], [SL.u1 + IN, SL.v]); const md = -IN + 0.1;
    K.rbox(SR, X.slot, IN, FFL, -IN, SR.L - IN, LV[2], -IN + 0.04);
    K.rbox(SR, X.slot, 0, LV[2], -IN, SR.L, 18.8, -IN + 0.04);
    for (const s of [IN + 0.04, SR.L / 2, SR.L - IN - 0.04]) K.rbox(SR, FR, s - 0.04, FFL, -IN + 0.04, s + 0.04, 18.8, md);
    for (const y of [FFL + 0.05, ...LV.slice(1, 5), 16.7]) K.rbox(SR, FR, y < LV[2] ? IN : 0, y - 0.05, -IN + 0.04, y < LV[2] ? SR.L - IN : SR.L, y + 0.05, md);
    // the slot's sides inside the porch are glass too (a glass tower standing in the porch)
    for (const Rs of [K.run([SL.u0, PV], [SL.u0, SL.v - IN]), K.run([SL.u1, SL.v - IN], [SL.u1, PV])]) {
      K.rbox(Rs, X.slot, 0, FFL, -0.04, Rs.L, LV[2], 0);
      for (const s of [0.04, Rs.L - 0.04]) K.rbox(Rs, FR, s - 0.04, FFL, 0, s + 0.04, LV[2], 0.06);
      K.rbox(Rs, FR, 0, LV[1] - 0.05, 0, Rs.L, LV[1] + 0.05, 0.06);
    }
    if (X.sign) { const g = new THREE.PlaneGeometry(1.7, 0.64); g.translate((SL.u0 + SL.u1) / 2, LV[2] - 0.47, SL.v - IN + 0.12); K.add(X.sign, g, { uvMode: 'keep' }); }
  }
  // --- sides of the street wing ---
  sideFace(K.run([S.u1, S.v1], [S.u1, S.v0]), S.v1 - S.v0, false, true);       // east
  sideFace(K.run([S.u0, S.v0], [S.u0, S.v1]), S.v1 - S.v0, true, true);        // west
  // --- notches and waist ---
  shortFace(K.run([WA.u0, S.v0], [S.u0, S.v0]), WA.u0 - S.u0);
  shortFace(K.run([S.u1, S.v0], [WA.u1, S.v0]), S.u1 - WA.u1);
  shortFace(K.run([N.u0, N.v1], [WA.u0, N.v1]), WA.u0 - N.u0);
  shortFace(K.run([WA.u1, N.v1], [N.u1, N.v1]), N.u1 - WA.u1);
  shortFace(K.run([WA.u0, N.v1], [WA.u0, S.v0]), S.v0 - N.v1, 'mid');
  shortFace(K.run([WA.u1, S.v0], [WA.u1, N.v1]), S.v0 - N.v1, 'mid');
  // --- rear wing sides ---
  sideFace(K.run([N.u0, N.v0], [N.u0, N.v1]), N.v1 - N.v0, false, false);      // west
  sideFace(K.run([N.u1, N.v1], [N.u1, N.v0]), N.v1 - N.v0, true, false);       // east
  // --- rear (north) face with the glazed notch ---
  {
    const R = K.run([N.u1, N.v0], [N.u0, N.v0]); const n0 = N.u1 - NN.u1, n1 = N.u1 - NN.u0, L = R.L;
    const a = split(0, n0 / 2, 2), b = split(n0 / 2, n0, 2), c = split(n1, (n1 + L) / 2, 2), d = split((n1 + L) / 2, L, 2);
    const cells = [[...a[0], 'W'], [...a[1], 'P'], [...b[0], 'P'], [...b[1], 'W'], [...c[0], 'W'], [...c[1], 'P'], [...d[0], 'P'], [...d[1], 'W']];
    for (let k = 0; k < 5; k++) row(R, cells, k);
    for (let k = 1; k < 5; k++) { band(R, 0, n0, LV[k], 0.32, 0); band(R, n1, L, LV[k], 0, 0.32); }
    fin(R, n0 / 2); fin(R, (n1 + L) / 2); parapet(R, 0, n0); parapet(R, n1, L);
    const G = K.run([NN.u1 + IN, NN.v], [NN.u0 - IN, NN.v]);
    K.rbox(G, X.slot, 0, FFL, -IN, G.L, LV[5] - 0.15, -IN + 0.04); K.rbox(G, FR, G.L / 2 - 0.04, FFL, -IN + 0.04, G.L / 2 + 0.04, LV[5] - 0.15, -IN + 0.1);
    for (const y of LV.slice(1, 5)) K.rbox(G, FR, 0, y - 0.05, -IN + 0.04, G.L, y + 0.05, -IN + 0.1);
    parapet(G, 0, G.L);
    parapet(K.run([NN.u1, N.v0], [NN.u1, NN.v]), 0, NN.v - N.v0); parapet(K.run([NN.u0, NN.v], [NN.u0, N.v0]), 0, NN.v - N.v0);
  }
  // thin black corner edges at the outer corners
  for (const [u, v, du, dv] of [[S.u0, S.v1, 1, -1], [S.u1, S.v1, -1, -1], [S.u0, S.v0, 1, 1], [S.u1, S.v0, -1, 1], [N.u0, N.v0, 1, 1], [N.u1, N.v0, -1, 1], [N.u0, N.v1, 1, -1], [N.u1, N.v1, -1, -1]])
    K.box(FR, Math.min(u, u + du * 0.07), FFL, Math.min(v, v + dv * 0.07), Math.max(u, u + du * 0.07), TOP, Math.max(v, v + dv * 0.07));

  // ---------- roof: deck, penthouses, solar ----------
  const RF = LV[5] + 0.02;
  const pent = (u0, v0, u1, v1, top, capH) => { K.box(PANEL, u0, RF, v0, u1, top - capH, v1); K.box(WHITE, u0 - 0.05, top - capH, v0 - 0.05, u1 + 0.05, top, v1 + 0.05); };
  pent(SL.u0 - IN, 8.6, SL.u1 + IN, SL.v - IN - 0.05, 20.0, 1.2);         // front stair (its street face is the slot glass)
  K.box(WHITE, SL.u0 - IN - 0.05, 18.8, 15.6, SL.u1 + IN + 0.05, 20.0, SL.v - IN + 0.1);
  pent(-1.0, -14.0, 2.0, -9.5, 20.0, 1.0);                                  // rear stair
  pent(-4.4, -2.3, -0.2, 1.9, 22.0, 0.8);                                   // elevator core
  // deck between the vent-screen walls, pergola, planters
  K.box(M.paving, -2.6, RF, -9.4, 3.6, RF + 0.08, 8.5);
  for (const [u, v0, v1] of [[-2.75, -12.5, -2.3], [-2.75, 1.9, 8.4], [3.75, -12.0, 8.4]]) { K.box(PANEL, u - 0.1, RF, v0, u + 0.1, RF + 1.0, v1); K.box(FR, u - 0.13, RF + 1.0, v0, u + 0.13, RF + 1.04, v1, { detail: true }); }
  for (const [u0, v0, u1, v1] of [[-2.5, 6.6, -1.3, 8.3], [2.2, -9.2, 3.5, -7.4], [2.3, -5.0, 3.5, -3.2]]) { K.box(PANEL, u0, RF, v0, u1, RF + 0.45, v1); K.box(X.mulch, u0 + 0.06, RF + 0.45, v0 + 0.06, u1 - 0.06, RF + 0.47, v1 - 0.06); }
  { // white steel pergola over the dining end of the deck
    const u0 = -0.6, u1 = 3.3, v0 = 2.6, v1 = 6.8, yT = RF + 2.7;
    for (const [u, v] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) K.box(WHITE, u - 0.06, RF + 0.08, v - 0.06, u + 0.06, yT, v + 0.06, { detail: true });
    for (const v of [v0, v1]) K.box(WHITE, u0 - 0.1, yT - 0.18, v - 0.05, u1 + 0.1, yT, v + 0.05, { detail: true });
    for (let i = 0; i <= 8; i++) { const v = v0 + (v1 - v0) * i / 8; K.box(WHITE, u0 - 0.1, yT, v - 0.03, u1 + 0.1, yT + 0.08, v + 0.03, { detail: true }); }
  }
  // tilted PV arrays over the apartments (the LiDAR shows four ~1.5 m blocks), high edge to the north
  for (const [u0, v0, u1, v1] of [[-6.6, 9.8, -3.2, 12.2], [3.9, 9.8, 8.1, 12.2], [3.9, -13.6, 8.1, -11.3], [-7.0, -16.4, -3.2, -14.4]]) {
    const d = v1 - v0, tilt = 0.26, y0 = RF + 0.45;
    const g = new THREE.BoxGeometry(u1 - u0, 0.05, d / Math.cos(tilt)); g.rotateX(tilt); g.translate((u0 + u1) / 2, y0 + Math.tan(tilt) * d / 2, (v0 + v1) / 2);
    K.add(X.solar, g);
    for (const u of [u0 + 0.2, (u0 + u1) / 2, u1 - 0.2]) { K.box(M.concrete, u - 0.04, RF, v1 - 0.25, u + 0.04, y0 + 0.05, v1 - 0.15, { detail: true }); K.box(M.concrete, u - 0.04, RF, v0 + 0.15, u + 0.04, y0 + Math.tan(tilt) * d - 0.05, v0 + 0.25, { detail: true }); }
  }
  for (const [u, v] of [[-7.5, -9], [-6.5, -5], [6.8, -6], [7.2, -3.5], [-7.2, 5], [6.6, 4.5], [-5.5, 15.2], [6.0, 15.0], [-6.0, -12.0], [6.2, -15.8]])
    K.box(M.concrete, u - 0.15, RF, v - 0.15, u + 0.15, RF + 0.55, v + 0.15, { detail: true }); // vent hoods

  // ---------- street edge: plinth wall, planting strip, west entry stair and landing ----------
  const gAt = (u, v) => K.g(u, v);
  const PL = { v0: S.v1, v1: S.v1 + 0.36, top: FFL + 0.1 };
  const strip = { v0: PL.v1, v1: 19.0 };
  const LD = { u0: -6.4, u1: SL.u0 };                        // landing in front of the west porch
  const ST = { u0: -9.6, u1: LD.u0 };                        // stair climbing east in front of the west office
  K.box(X.plinth, -10.1, -1.0, PL.v0, LD.u0, PL.top, PL.v1);
  K.box(X.plinth, LD.u1, -1.0, PL.v0, S.u1 + 1.0, PL.top, PL.v1);
  colliders.push(K.colPoly([[-10.1, PL.v0], [LD.u0, PL.v0], [LD.u0, PL.v1], [-10.1, PL.v1]], -1, PL.top));
  colliders.push(K.colPoly([[LD.u1, PL.v0], [S.u1 + 1, PL.v0], [S.u1 + 1, PL.v1], [LD.u1, PL.v1]], -1, PL.top));
  // planting strip at grade (mulch following the slope), silver shrubs, young staked street trees in front of the fins
  { // sloped ribbon: mulch top following the sidewalk grade, a low concrete edge to the sidewalk
    const pos = [], cpos = []; const quad = (A, B, C, D, out) => out.push(...A, ...B, ...C, ...A, ...C, ...D);
    const P = (u, y, v) => [u, y, v];
    for (let u = LD.u1; u < S.u1 + 1.0 - 1e-6; u += 0.5) {
      const u1 = Math.min(S.u1 + 1.0, u + 0.5); const ga = gAt(u, strip.v1) + 0.07, gb = gAt(u1, strip.v1) + 0.07;
      const ka = Math.max(ga, gAt(u, strip.v0) + 0.07), kb = Math.max(gb, gAt(u1, strip.v0) + 0.07);
      quad(P(u, ka, strip.v0), P(u, ga, strip.v1 - 0.12), P(u1, gb, strip.v1 - 0.12), P(u1, kb, strip.v0), pos);
      quad(P(u, ga + 0.06, strip.v1 - 0.12), P(u, ga + 0.06, strip.v1), P(u1, gb + 0.06, strip.v1), P(u1, gb + 0.06, strip.v1 - 0.12), cpos);
      quad(P(u, ga + 0.06, strip.v1), P(u, ga - 0.5, strip.v1), P(u1, gb - 0.5, strip.v1), P(u1, gb + 0.06, strip.v1), cpos);
    }
    const mk = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    K.add(X.mulch, mk(pos)); K.add(M.concreteDark, mk(cpos));
  }
  const shrub = (u, v, y, r) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, 0.72, 1); g.translate(u, y + r * 0.55, v); K.add(X.shrub, g, { detail: true }); };
  for (let u = LD.u1 + 0.45, i = 0; u < S.u1 + 0.7; u += 0.72, i++) if (Math.abs(u - 5.385) > 0.45) shrub(u, (strip.v0 + strip.v1) / 2 - 0.05 + (i % 2 ? 0.1 : -0.08), gAt(u, 18.3) + 0.05, 0.4 + (i % 3) * 0.04);
  const tree = (u, v, y) => { // young columnar street tree, staked
    K.cyl(M.woodDark, u, y, v, 0.065, 0.045, 2.3, 7);
    for (const [du, dy, dv, r, sy] of [[0, 2.55, 0, 0.62, 1.15], [0.12, 3.35, 0.08, 0.6, 1.3], [-0.1, 4.15, -0.06, 0.5, 1.3], [0.04, 4.8, 0.03, 0.34, 1.2]]) { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, sy, 1); g.translate(u + du, y + dy, v + dv); K.add(X.leaf, g); }
    for (const s of [-1, 1]) K.box(M.wood, u + s * 0.3 - 0.03, y - 0.3, v - 0.03, u + s * 0.3 + 0.03, y + 1.6, v + 0.03, { detail: true });
    K.box(M.wood, u - 0.33, y + 1.25, v - 0.02, u + 0.33, y + 1.31, v + 0.02, { detail: true });
  };
  tree(5.385, 18.35, gAt(5.385, 18.35) + 0.07);
  // landing at porch level behind a grey planter wall to the sidewalk (shrubs and the second tree on top)
  K.box(M.paving, LD.u0, -0.8, PL.v0, LD.u1, FFL, strip.v1);
  K.box(X.stucco, LD.u0, -0.8, strip.v1 - 0.55, LD.u1, FFL + 0.5, strip.v1);
  K.box(X.mulch, LD.u0 + 0.08, FFL + 0.5, strip.v1 - 0.47, LD.u1 - 0.08, FFL + 0.52, strip.v1 - 0.08);
  for (let u = LD.u0 + 0.5, i = 0; u < LD.u1 - 0.3; u += 0.9, i++) if (Math.abs(u + 5.075) > 0.6) shrub(u, strip.v1 - 0.28, FFL + 0.52, 0.3 + (i % 2) * 0.05);
  tree(-5.075, strip.v1 - 0.28, FFL + 0.52);
  walkables.push(K.walkPoly([[LD.u0, PL.v0], [LD.u1, PL.v0], [LD.u1, strip.v1 - 0.55], [LD.u0, strip.v1 - 0.55]], FFL));
  walkables.push(K.walkPoly([[PW.u0, PV], [PW.u1, PV], [PW.u1, S.v1], [PW.u0, S.v1]], FFL));
  colliders.push(K.colPoly([[LD.u0, strip.v1 - 0.55], [LD.u1, strip.v1 - 0.55], [LD.u1, strip.v1], [LD.u0, strip.v1]], -1, FFL + 0.5));
  // stair: from the sidewalk at the west end up to the landing (dark concrete, black rail on the street side)
  {
    const yLo = Math.min(gAt(ST.u0, strip.v0), gAt(ST.u0, strip.v1)); const n = Math.max(4, Math.round((FFL - yLo) / 0.165));
    walkables.push(K.stairs(X.step, ST.u0, PL.v1, ST.u1, strip.v1 - 0.1, yLo, FFL, '+u', n));
    const R = K.run([ST.u0, strip.v1 - 0.06], [LD.u0 + 0.3, strip.v1 - 0.06]); const run = ST.u1 - ST.u0;
    const yAt = (s) => (s < run ? yLo + (FFL - yLo) * s / run : FFL);
    for (let i = 0; i < 8; i++) { const s0 = run * i / 8, s1 = run * (i + 1) / 8; const g = new THREE.BoxGeometry(Math.hypot(s1 - s0, yAt(s1) - yAt(s0)) + 0.02, 0.05, 0.05); g.rotateZ(Math.atan2(yAt(s1) - yAt(s0), s1 - s0)); g.translate((s0 + s1) / 2, (yAt(s0) + yAt(s1)) / 2 + 0.95, 0); K.addRun(R, FR, g, { detail: true }); }
    for (const s of [0.05, run / 3, 2 * run / 3, run - 0.05]) K.rbox(R, FR, s - 0.025, yAt(s) - 0.05, -0.025, s + 0.025, yAt(s) + 0.95, 0.025, { detail: true });
  }
  // black picket fence and gate at the east end of the frontage (side-yard path)
  {
    const R = K.run([S.u1 + 1.0, PL.v0 + 0.2], [S.u1 + 2.9, PL.v0 + 0.2]); const g0 = gAt(S.u1 + 1.9, PL.v0 + 0.2);
    for (let s = 0.03; s < R.L; s += 0.12) K.rbox(R, FR, s - 0.015, g0 - 0.2, -0.015, s + 0.015, g0 + 1.5, 0.015, { detail: true });
    for (const y of [0.15, 1.4]) K.rbox(R, FR, 0, g0 + y - 0.025, -0.02, R.L, g0 + y + 0.025, 0.02, { detail: true });
    colliders.push(K.colPoly([[S.u1 + 1.0, PL.v0 + 0.15], [S.u1 + 2.9, PL.v0 + 0.15], [S.u1 + 2.9, PL.v0 + 0.25], [S.u1 + 1.0, PL.v0 + 0.25]], g0 - 1, g0 + 1.5));
  }

  // ---------- collision: building walls (the west porch half is open below the third floor) ----------
  colliders.push(K.colPoly(outline(false), LV[2], TOP));
  colliders.push(K.colPoly([[S.u0, S.v1], [PW.u0, S.v1], [PW.u0, PV], [PW.u1, PV], [PW.u1, S.v1], [S.u1, S.v1], ...rear], -1, LV[2]));

  const object3d = K.finish();
  object3d.name = 'the-durant';
  return { object3d, colliders, walkables };
}
