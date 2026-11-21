// fields-osm (fields-east-2 batch): generic OSM-driven outdoor sports venues. Each OSM pitch / track / pool /
// playground outline becomes a canvas-painted surface draped on the terrain in its own fitted frame (minimum-area
// rectangle), levelled to the median ground with a low concrete skirt where it stands proud of the slope, plus the
// furniture its sport implies: goals, posts, nets, hoops, backstops, fences, bleachers and light poles.
// One texture per surface; everything else merges into the shared sports materials.
import * as THREE from 'three';
import { Kit, sportsMats, fieldsMats, fieldTexture, paintGrass, pen, ln, rect, arc, dot, fillPoly, text, surfaceMat, drapePoly, fence, lightTower, bleachers, deg, signTex, signPanel, tennisBlock, pad, basketballLines, hoop, fieldUV, lifeguardChair } from './fields-kit.js';
import { fitRect, soccerLines, footballLines, paintDiamond, trackOval, lanesTexture, soccerGoal, footballPosts, pool as poolBlock, hull } from './b11-sports.js';

const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
export function inPoly(pts, u, v) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) c = !c; } return c; }
let _s = 1; const rnd = () => { _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; };
function speckle(P, n, a = 0.05) { const c = P.c; for (let i = 0; i < n; i++) { c.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.8})`; c.fillRect(rnd() * c.canvas.width, rnd() * c.canvas.height, 1 + rnd() * 2, 1 + rnd() * 2); } }
export function paintAsphalt(P, col = '#55585b', seed = 5) {
  _s = seed; const c = P.c; c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height); speckle(P, Math.min(50000, P.LU * P.LV * 8), 0.06);
  for (let i = 0; i < P.LU * P.LV / 50; i++) { const x = rnd() * c.canvas.width, y = rnd() * c.canvas.height, r = (0.8 + rnd() * 3) * P.s; c.fillStyle = rnd() < 0.6 ? 'rgba(25,25,25,0.07)' : 'rgba(200,200,200,0.05)'; c.beginPath(); c.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, 7); c.fill(); }
  c.strokeStyle = 'rgba(20,20,20,0.18)'; c.lineWidth = 1; for (let i = 0; i < P.LU * P.LV / 120; i++) { let x = rnd() * c.canvas.width, y = rnd() * c.canvas.height; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 3 * P.s; y += (rnd() - 0.5) * 3 * P.s; c.lineTo(x, y); } c.stroke(); }
}
function paintChips(P, col = '#a3845f') { _s = 9; const c = P.c; c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height); for (let i = 0; i < Math.min(60000, P.LU * P.LV * 30); i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(60,40,20,0.18)' : 'rgba(230,200,150,0.15)'; c.fillRect(rnd() * c.canvas.width, rnd() * c.canvas.height, 1 + rnd() * 2, 1 + rnd()); } }
function paintRubber(P, col = '#3f6f8a', col2 = '#5f8f4f') { _s = 13; const c = P.c; c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height); c.fillStyle = col2; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(rnd() * c.canvas.width, rnd() * c.canvas.height, (3 + rnd() * 5) * P.s, 0, 7); c.fill(); } speckle(P, Math.min(40000, P.LU * P.LV * 10), 0.07); }

// vertical concrete skirt along a ring where the surface (Y) stands above the terrain
let _skirtMat = null;
function skirt(K, M, ring, Y, { maxSeg = 3 } = {}) {
  const pos = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.ceil(L / maxSeg));
    for (let k = 0; k < n; k++) {
      const p = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], q = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
      const yp = Y(p[0], p[1]) - 0.01, yq = Y(q[0], q[1]) - 0.01, gp = K.g(p[0], p[1]) - 0.4, gq = K.g(q[0], q[1]) - 0.4;
      if (yp - gp < 0.52 && yq - gq < 0.52) continue;
      pos.push(p[0], gp, p[1], q[0], gq, q[1], q[0], yq, q[1], p[0], gp, p[1], q[0], yq, q[1], p[0], yp, p[1]);
    }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  if (!_skirtMat || _skirtMat.userData.src !== M.concrete) { _skirtMat = M.concrete.clone(); _skirtMat.side = THREE.DoubleSide; _skirtMat.userData.src = M.concrete; }
  K.add(_skirtMat, g);
}
const rr = (cu, cv, L, W, m = 0) => [[cu - L / 2 - m, cv - W / 2 - m], [cu + L / 2 + m, cv - W / 2 - m], [cu + L / 2 + m, cv + W / 2 + m], [cu - L / 2 - m, cv + W / 2 + m]];

// ---------- painters by kind (item frame: u along the long side, centred on the fitted rectangle) ----------
function drapeItem(I, paint, { pxm = 12, rough = 0.95, off = 0.06, ring = null } = {}) {
  const { K, cu, cv, L, W, R, Y } = I; const LU = L + 2, LV = W + 2;
  const tex = fieldTexture(LU, LV, paint, { pxm });
  const mat = surfaceMat(tex, { rough });
  const o2 = (I.it && I.it.off != null) ? I.it.off : off; drapePoly(K, mat, ring || R, { maxEdge: 3, yFn: (u, v) => Y(u, v) + o2 - 0.06, uvFn: fieldUV(cu, cv, LU, LV) });
  return mat;
}
function soccerSmall(P, L, W, lw = 0.1) { // proportional markings for small pitches
  pen(P, '#f4f4ef', lw); rect(P, -L / 2, -W / 2, L / 2, W / 2); ln(P, 0, -W / 2, 0, W / 2); arc(P, 0, 0, Math.min(9.15, W / 6)); dot(P, 0, 0, 0.15);
  const bw = Math.min(40.3, W * 0.6), bd = Math.min(16.5, L * 0.16), gw = Math.min(18.3, W * 0.3), gd = Math.min(5.5, L * 0.055);
  for (const s of [-1, 1]) { const x = s * L / 2; rect(P, Math.min(x, x - s * bd), -bw / 2, Math.max(x, x - s * bd), bw / 2); rect(P, Math.min(x, x - s * gd), -gw / 2, Math.max(x, x - s * gd), gw / 2); }
}
const KINDS = {
  soccer(I) {
    const { K, S, cu, cv, L, W, level, it } = I; const pl = Math.min(105, L - (it.margin ?? 4)), pw = Math.min(68, W - (it.margin ?? 4));
    drapeItem(I, (P) => {
      paintGrass(P, { kind: it.turf ? 'turf' : 'grass', col: it.turf ? '#3f7d3d' : '#4f8a37', alt: it.turf ? '#448441' : '#5a9640', stripe: it.turf ? 4.6 : 6, seed: it.seed || 17, blotch: it.turf ? 0 : 1, wear: it.turf ? [] : [[-pl / 2 + 5, 0, 6, 7, 0.35], [pl / 2 - 5, 0, 6, 7, 0.35], [0, 0, 8, 5, 0.15]] });
      if (pl >= 90) soccerLines(P, { L: pl, W: pw, lw: 0.12 }); else soccerSmall(P, pl, pw);
    }, { pxm: 12 });
    const gw = pl < 70 ? 5.5 : 7.32, gh = pl < 70 ? 2.0 : 2.44;
    if (it.goals !== false) for (const s of [-1, 1]) soccerGoal(K, S, cu + s * pl / 2, cv, { dirU: -s, w: gw, h: gh, y0: level + 0.05 });
  },
  football(I) { // synthetic turf gridiron (multi-use) with yellow goalposts
    const { K, S, cu, cv, level, it } = I;
    drapeItem(I, (P) => {
      paintGrass(P, { kind: 'turf', col: '#3c7a3b', alt: '#418240', stripe: 4.572, seed: 23 });
      if (it.ez) for (const s of [-1, 1]) fillPoly(P, [[s * 45.72, -24.38], [s * 54.86, -24.38], [s * 54.86, 24.38], [s * 45.72, 24.38]], it.ez);
      if (it.soccer) { pen(P, it.soccer, 0.09); soccerSmall(P, Math.min(100, I.L - 4), Math.min(60, I.W - 3), 0.09); }
      footballLines(P, { col: '#f6f6f2', lw: 0.1 });
      if (it.ezText) for (const s of [-1, 1]) text(P, it.ezText, s * 50.29, 0, 5.0, { rot: s < 0 ? -Math.PI / 2 : Math.PI / 2, col: it.ezTextCol || '#f6f6f2' });
      if (it.mid) it.mid(P);
    }, { pxm: 12 });
    for (const s of [-1, 1]) footballPosts(K, S, cu + s * 54.86, cv, { axis: 'u', dirU: s, y0: level + 0.05 });
  },
  diamond(I) {
    const { K, S, F, R, cu, cv, Y, it, colliders } = I;
    // home plate: hull vertex with the smallest interior angle (the apex of the fan), ties broken by adjacent edge length
    const H = hull(R); let best = null;
    for (let i = 0; i < H.length; i++) {
      const p = H[(i + H.length - 1) % H.length], q = H[i], r = H[(i + 1) % H.length];
      const a1 = Math.atan2(p[1] - q[1], p[0] - q[0]), a2 = Math.atan2(r[1] - q[1], r[0] - q[0]); let da = Math.abs(a1 - a2); if (da > Math.PI) da = 2 * Math.PI - da;
      const len = Math.hypot(p[0] - q[0], p[1] - q[1]) + Math.hypot(r[0] - q[0], r[1] - q[1]);
      const sc = da - len * 0.002; if (!best || sc < best.sc) best = { sc, q, a1, a2 };
    }
    let home = it.home ? K.uv(it.home[0], it.home[1]) : best.q;
    let cx = 0, cz = 0; for (const [u, v] of R) { cx += u / R.length; cz += v / R.length; }
    const dir = it.homeDir != null ? it.homeDir - K.a : (it.home ? Math.atan2(cz - home[1], cx - home[0]) : Math.atan2(Math.sin(best.a1) + Math.sin(best.a2), Math.cos(best.a1) + Math.cos(best.a2)));
    if (!it.home) home = [home[0] + Math.cos(dir) * (it.homeIn ?? 5), home[1] + Math.sin(dir) * (it.homeIn ?? 5)];
    const [hu, hv] = home; let far = 0; for (const [u, v] of R) far = Math.max(far, Math.hypot(u - hu, v - hv));
    const softball = it.softball ?? far < 76; const base = softball ? 18.29 : (far < 95 ? 24.4 : 27.43);
    const dist = (u, v) => Math.hypot(u - hu, v - hv);
    const fenceLine = R.map(([u, v]) => ({ u, v, d: dist(u, v), a: Math.atan2(v - hv, u - hu) - dir })).map((p) => ({ ...p, a: Math.atan2(Math.sin(p.a), Math.cos(p.a)) }))
      .filter((p) => p.d > far * 0.62 && Math.abs(p.a) < deg(52)).sort((p, q) => p.a - q.a).map((p) => { const k = (p.d - 1.5) / p.d; return [hu + (p.u - hu) * k, hv + (p.v - hv) * k]; });
    const toF = (u, v) => [u - cu, v - cv];
    drapeItem(I, (P) => {
      if (it.surface === 'dirt') { const c = P.c; c.fillStyle = '#b58e66'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); speckle(P, 30000, 0.07); }
      else paintGrass(P, { col: '#4d8a3a', alt: '#579643', stripe: 4.5, seed: it.seed || 41, blotch: 0.8, angle: dir + deg(45) });
      paintDiamond(P, { home: toF(hu, hv), dir, softball, base, rubber: softball ? 13.11 : (base < 27 ? 15.24 : 18.44), arcR: softball ? 18.29 : base * 1.05, fence: fenceLine.length > 1 && it.fence !== false ? fenceLine.map(([u, v]) => toF(u, v)) : null, track: 2.5, dirt: '#c49a72', dirtDark: '#b48a63', lineTo: far, homeR: 3.5 });
    }, { pxm: 12 });
    const pts = []; for (let i = 0; i <= 8; i++) { const a = dir + Math.PI - deg(55) + deg(110) * i / 8; pts.push([hu + Math.cos(a) * 7.5, hv + Math.sin(a) * 7.5]); }
    fence(K, S, pts, { h: it.backstop || 6, every: 3, y: Y, colliders, postR: 0.06 });
    if (fenceLine.length > 1 && it.fence !== false) {
      fence(K, S, fenceLine, { h: it.fenceH || 2.4, every: 3, y: Y, colliders, wind: it.wind ? { h: Math.min(1.8, (it.fenceH || 2.4) - 0.2), mat: it.wind } : null });
      for (const p of [fenceLine[0], fenceLine[fenceLine.length - 1]]) { const g0 = Y(p[0], p[1]); K.cyl(S.goalYellow, p[0], g0 - 0.4, p[1], 0.08, 0.06, (it.fenceH || 2.4) + 4.4, 8); }
      for (const p of [fenceLine[0], fenceLine[fenceLine.length - 1]]) { const t0 = 0.12, t1 = 0.4; fence(K, S, [[hu + (p[0] - hu) * t0, hv + (p[1] - hv) * t0], [hu + (p[0] - hu) * t1, hv + (p[1] - hv) * t1]], { h: 1.8, every: 3, y: Y, colliders }); }
    }
    for (const s of [-1, 1]) {
      const a = dir + s * deg(45), off = it.benchOff ?? 6; const n = a + s * Math.PI / 2; const u = hu + Math.cos(a) * 12 + Math.cos(n) * off, v = hv + Math.sin(a) * 12 + Math.sin(n) * off;
      const y = Y(u, v); K.obox(S.benchGrey, u, y + 0.45, v, 7, 0.06, 0.4, a, { detail: true });
      for (const k of [-3, 0, 3]) K.obox(F.postBlack, u + Math.cos(a) * k, y + 0.22, v + Math.sin(a) * k, 0.06, 0.44, 0.06, a, { detail: true });
      if (it.dugoutRoof) K.obox(F.roofGreen, u - Math.cos(n) * 0.5, y + 2.3, v - Math.sin(n) * 0.5, 8, 0.1, 2.2, a);
    }
    for (const [a, b] of [[base / Math.SQRT2, -base / Math.SQRT2], [base * Math.SQRT2, 0], [base / Math.SQRT2, base / Math.SQRT2]]) { const u = hu + a * Math.cos(dir) - b * Math.sin(dir), v = hv + a * Math.sin(dir) + b * Math.cos(dir); K.obox(F.trimWhite, u, Y(u, v) + 0.03, v, 0.38, 0.08, 0.38, dir + Math.PI / 4, { detail: true }); }
    I.home = home; I.dir = dir; I.far = far; I.fenceLine = fenceLine;
  },
  basketball(I) {
    const { K, S, F, cu, cv, L, W, level, it } = I; const Lc = Math.min(28, L - 1.5), Wc = Math.min(15, W - 1.5);
    drapeItem(I, (P) => { paintAsphalt(P, it.col || '#4e5256', it.seed || 7); if (it.inCol) { P.c.fillStyle = it.inCol; P.c.fillRect(P.X(-Lc / 2), P.Y(-Wc / 2), Lc * P.s, Wc * P.s); } basketballLines(P, { L: Lc, W: Wc, key: it.key === undefined ? null : it.key, col: it.lines || '#f2f2ec' }); }, { pxm: 16 });
    for (const s of [-1, 1]) hoop(K, S, F, cu + s * (Lc / 2 - 1.2), cv, s < 0 ? 0 : Math.PI, level + 0.06);
  },
  asphalt(I) { const { it } = I; drapeItem(I, (P) => { paintAsphalt(P, it.col || '#585b5e', it.seed || 3); if (it.paint) it.paint(P, I); }, { pxm: it.pxm || 14 }); },
  kickball(I) { // asphalt diamond: painted base paths, pitching circle and foul lines from the corner of the yard
    const { L, W } = I;
    drapeItem(I, (P) => { paintAsphalt(P, '#55585b', 11); const b = Math.min(18, Math.min(L, W) * 0.55) / Math.SQRT2; const h0 = [-L / 2 + 3, W / 2 - 3]; const ca = Math.cos(-Math.PI / 4), sa = Math.sin(-Math.PI / 4);
      const at = (a, c) => [h0[0] + a * ca - c * sa, h0[1] + a * sa + c * ca]; pen(P, '#f1f1ea', 0.1); const pts = [at(0, 0), at(b, -b), at(2 * b, 0), at(b, b)]; P.c.beginPath(); pts.forEach(([u, v], i) => (i ? P.c.lineTo(P.X(u), P.Y(v)) : P.c.moveTo(P.X(u), P.Y(v)))); P.c.closePath(); P.c.stroke();
      for (const p of pts) { P.c.fillStyle = '#f1f1ea'; P.c.fillRect(P.X(p[0]) - 0.3 * P.s, P.Y(p[1]) - 0.3 * P.s, 0.6 * P.s, 0.6 * P.s); } const m = at(b, 0); arc(P, m[0], m[1], 1.5); for (const s of [-1, 1]) { const e = at(L * 0.8, s * L * 0.8); ln(P, h0[0], h0[1], e[0], e[1]); } }, { pxm: 14 });
  },
  turf(I) { const { L, W, it } = I; drapeItem(I, (P) => { paintGrass(P, { kind: 'turf', col: '#3f7f3e', alt: '#448643', stripe: 3, seed: 29 }); pen(P, '#f2f2ec', 0.08); rect(P, -L / 2 + 0.6, -W / 2 + 0.6, L / 2 - 0.6, W / 2 - 0.6); if (L > 14) { ln(P, 0, -W / 2 + 0.6, 0, W / 2 - 0.6); arc(P, 0, 0, Math.min(3, W / 5)); } }, { pxm: 16 });
    if (it.goals !== false && L > 14) for (const s of [-1, 1]) soccerGoal(I.K, I.S, I.cu + s * (L / 2 - 0.8), I.cv, { dirU: -s, w: 3.66, h: 1.83, depth: 1.0, y0: I.level + 0.05 }); },
  grass(I) { const { it } = I; drapeItem(I, (P) => { paintGrass(P, { col: '#527f3a', alt: '#5a8a40', stripe: it.stripe ?? 5, seed: it.seed || 33, blotch: 1.2 }); if (it.paint) it.paint(P, I); }, { pxm: 8 }); },
  atrack(I) { // painted running loop on asphalt (school yard)
    const { L, W, it } = I; const lanes = it.lanes || 4, lw = 1.0;
    drapeItem(I, (P) => { paintAsphalt(P, '#575a5d', 19); const c = P.c; pen(P, '#f1f1ea', 0.07);
      for (let k = 0; k <= lanes; k++) { const ins = 1.0 + k * lw; const r = W / 2 - ins; if (r <= 1) continue; const s2 = L / 2 - W / 2; c.beginPath(); c.moveTo(P.X(-s2), P.Y(-r)); c.lineTo(P.X(s2), P.Y(-r)); c.arc(P.X(s2), P.Y(0), r * P.s, -Math.PI / 2, Math.PI / 2); c.lineTo(P.X(-s2), P.Y(r)); c.arc(P.X(-s2), P.Y(0), r * P.s, Math.PI / 2, 1.5 * Math.PI); c.stroke(); }
      ln(P, 0, W / 2 - 1, 0, W / 2 - 1 - lanes * lw); if (it.paint) it.paint(P, I); }, { pxm: 12 });
  },
  playground(I) {
    const { K, S, F, cu, cv, L, W, Y, it } = I;
    drapeItem(I, (P) => (it.rubber ? paintRubber(P, it.rubber, it.rubber2) : paintChips(P)), { pxm: 14 });
    const mats = playMats(); const n = it.structures ?? Math.max(1, Math.min(3, Math.round(L * W / 180)));
    for (let k = 0; k < n; k++) { const u = cu + (k - (n - 1) / 2) * Math.min(12, L / n) - 1, v = cv; playStructure(K, F, mats, u, v, Y(u, v), k); }
    if (L > 16 && W > 9 && it.swings !== false) swingSet(K, F, mats, cu + L / 2 - 4, cv + Math.min(W / 2 - 3, 4), Y(cu + L / 2 - 4, cv + 3));
    if (it.fence) fence(K, S, rr(cu, cv, L, W, 0.4), { h: 1.2, every: 2.5, y: Y, closed: true, gapAt: [0] });
  },
};
let _pm = null;
function playMats() { if (_pm) return _pm; const std = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r }); return (_pm = { red: std(0xc8402e), yellow: std(0xf0c020), blue: std(0x2f6fb8), green: std(0x3e8a46), deck: std(0x3a3c3f, 0.7), tan: std(0xc9b48a) }); }
function playStructure(K, F, P, u, v, y, k) {
  const col = [P.blue, P.green, P.red][k % 3], roof = [P.yellow, P.red, P.blue][k % 3];
  for (const [a, b] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6], [4.8, -1.6], [4.8, 1.6]]) K.cyl(col, u + a, y - 0.3, v + b, 0.06, 0.06, (a > 3 ? 2.1 : 3.6) + 0.3, 8);
  K.box(P.deck, u - 1.6, y + 1.45, v - 1.6, u + 1.6, y + 1.55, v + 1.6); K.box(P.deck, u + 1.6, y + 0.85, v - 1.6, u + 4.8, y + 0.95, v + 1.6);
  K.obox(roof, u, y + 3.75, v, 3.6, 0.12, 3.6, 0); K.obox(roof, u, y + 4.05, v, 2.4, 0.5, 2.4, 0);
  const g = new THREE.BoxGeometry(3.4, 0.08, 0.9); g.rotateZ(-0.42); g.translate(u - 3.1, y + 0.82, v); K.add(P.yellow, g);
  for (const s of [-1, 1]) { const gs = new THREE.BoxGeometry(3.4, 0.35, 0.06); gs.rotateZ(-0.42); gs.translate(u - 3.1, y + 1.0, v + s * 0.45); K.add(P.yellow, gs, { detail: true }); }
  for (const b of [-1.6, 1.6]) K.box(col, u - 1.6, y + 1.55, v + b - 0.03, u + 1.6, y + 2.45, v + b + 0.03, { detail: true });
  for (let i = 0; i < 4; i++) K.box(P.tan, u + 4.85, y + 0.25 + i * 0.45, v - 0.5, u + 5.15, y + 0.3 + i * 0.45, v + 0.5, { detail: true });
}
function swingSet(K, F, P, u, v, y) {
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const g = new THREE.CylinderGeometry(0.05, 0.05, 2.75, 8); g.rotateX(t * 0.32); g.translate(u + s * 2.4, y + 1.3, v + t * 0.42); K.add(F.postGreen, g); }
  const gb = new THREE.CylinderGeometry(0.05, 0.05, 4.8, 8); gb.rotateZ(Math.PI / 2); gb.translate(u, y + 2.6, v); K.add(F.postGreen, gb);
  for (const a of [-1.1, 1.1]) { for (const s of [-0.22, 0.22]) K.box(F.postBlack, u + a + s - 0.01, y + 0.5, v - 0.01, u + a + s + 0.01, y + 2.6, v + 0.01, { detail: true }); K.box(F.postBlack, u + a - 0.25, y + 0.45, v - 0.1, u + a + 0.25, y + 0.5, v + 0.1); }
}

// ---------- the venue ----------
// items: [{osm, kind, ...opts}], drawn in order. kind: soccer|football|diamond|basketball|tennis|asphalt|kickball|turf|grass|atrack|playground|track|pool|deck
// common opts: level (local y), raise, follow (drape on terrain), lights {n,h}, perimeter {h,m,wind,gaps}, bleachers [{side,u0,u1,rows}], sign {text,side}
export function osmVenue(ctx, items, { colliders = [], walkables = [], before = null } = {}) {
  const { M } = ctx; const S = sportsMats(M); const F = fieldsMats(M); const parts = []; const fps = new Map(ctx.footprints.map((f) => [f.osm, f]));
  const res = { items: {}, colliders, walkables };
  const tennisGroups = new Map();
  for (const it of items) {
    const fp = fps.get(it.osm); if (!fp) { console.warn('fields-osm: missing footprint', it.osm); continue; }
    const ring = fp.outer; const fr = fitRect(ring); const ang = fr.ang + (it.turn || 0);
    if (it.kind === 'tennis') { const g = it.group || it.osm; if (!tennisGroups.has(g)) tennisGroups.set(g, []); tennisGroups.get(g).push({ it, fr, ring }); continue; }
    const K = new Kit(ctx, ang); parts.push(K);
    const R = ring.map(([x, z]) => K.uv(x, z)); const [cu, cv] = K.uv(fr.cx, fr.cz); let L = fr.L, W = fr.W; if (it.turn) [L, W] = [W, L];
    const gs = []; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const u = cu - L / 2 + L * i / 10, v = cv - W / 2 + W * j / 10; if (inPoly(R, u, v)) gs.push(K.g(u, v)); }
    if (!gs.length) gs.push(K.g(cu, cv));
    const level = it.level ?? (median(gs) + (it.raise || 0));
    const Y = it.follow ? ((u, v) => K.g(u, v) + 0.06) : ((u, v) => Math.max(K.g(u, v), level) + 0.06);
    const I = { K, S, F, M, R, cu, cv, L, W, level, Y, it, colliders, walkables, fr, ctx };
    if (it.kind === 'track') trackItem(I); else if (it.kind === 'pool') poolItem(I); else if (it.kind === 'deck') deckItem(I); else KINDS[it.kind](I);
    if (it.skirt !== false && !it.follow && it.kind !== 'track' && it.kind !== 'pool') skirt(K, M, R, Y);
    extras(I);
    res.items[it.osm] = I;
  }
  for (const [, list] of tennisGroups) {
    const it0 = list[0].it; const ang = list[0].fr.ang; const K = new Kit(ctx, ang); parts.push(K);
    const cs = list.map(({ fr }) => K.uv(fr.cx, fr.cz)); const lv = cs.map(([u, v]) => K.g(u, v)).sort((a, b) => a - b); const level = it0.level ?? lv[Math.floor(lv.length / 2)];
    const ru = it0.runU ?? 6.4, rv = it0.runV ?? 3.66;
    const u0 = Math.min(...cs.map((c) => c[0])) - 11.885 - ru, u1 = Math.max(...cs.map((c) => c[0])) + 11.885 + ru;
    const v0 = Math.min(...cs.map((c) => c[1])) - 5.485 - rv, v1 = Math.max(...cs.map((c) => c[1])) + 5.485 + rv;
    tennisBlock(K, S, M, F, { u0, v0, u1, v1, courts: cs.map(([u, v]) => [u, v, 0]), level, inCol: it0.inCol || '#2f6a3f', outCol: it0.outCol || '#7a3b33', windMat: it0.windMat || S.windGreen, fenceH: it0.fenceH || 3.6, windH: it0.windH || 2.4, gaps: it0.gaps || [], colliders, pxm: 14 });
    const I = { K, S, F, M, cu: (u0 + u1) / 2, cv: (v0 + v1) / 2, L: u1 - u0, W: v1 - v0, level, Y: () => level + 0.07, it: it0, colliders, walkables, ctx };
    extras(I); res.items[it0.osm] = I;
  }
  if (before) before(res);
  const root = new THREE.Group(); for (const k of parts) root.add(k.finish()); res.object3d = root;
  return res;
}
function extras(I) {
  const { K, S, M, F, cu, cv, L, W, level, Y, it, colliders, walkables } = I;
  if (it.lights) { const n = it.lights.n || 4, h = it.lights.h || 18, m = it.lights.m ?? 4; const nn = Math.ceil(n / 2); for (let k = 0; k < n; k++) { const s = k % 2 ? 1 : -1, j = Math.floor(k / 2); const u = cu + (nn === 1 ? 0 : -L / 2 + L * (j + 0.5) / nn) * (it.lights.spread ?? 1), v = cv + s * (W / 2 + m); const g0 = K.g(u, v); lightTower(K, S, M, u, v, { h, y0: g0, face: Math.atan2(cv - v, cu - u), nx: it.lights.nx || 3, ny: it.lights.ny || 2, colliders }); } }
  if (it.perimeter) { const p = it.perimeter; fence(K, S, rr(cu + (p.du || 0), cv + (p.dv || 0), L + (p.dl || 0), W + (p.dw || 0), p.m ?? 2), { h: p.h || 2.4, every: 3, y: p.flat ? (() => level + 0.05) : Y, closed: true, gapAt: p.gaps || [], colliders, wind: p.wind ? { h: p.windH || 1.6, mat: p.wind === true ? S.windGreen : p.wind } : null }); }
  for (const b of it.bleachers || []) {
    const s = b.side, v0 = cv + s * (W / 2 + (b.gap ?? 2)); const u0 = cu + (b.u0 ?? -10), u1 = cu + (b.u1 ?? 10); const rows = b.rows || 6;
    const yb = Math.max(level, K.gMax(u0, Math.min(v0, v0 + s * rows * 0.75), u1, Math.max(v0, v0 + s * rows * 0.75), 4) - 0.25);
    pad(K, M.concrete, u0 - 0.4, Math.min(v0 - s * 0.4, v0 + s * (rows * 0.75 + 0.4)), u1 + 0.4, Math.max(v0 - s * 0.4, v0 + s * (rows * 0.75 + 0.4)), yb + 0.02);
    walkables.push(bleachers(K, S, { u0, u1, v0, dir: s, rows, rise: 0.4, run: 0.75, y0: yb }));
    colliders.push(K.colPoly([[u0, v0], [u1, v0], [u1, v0 + s * 0.3], [u0, v0 + s * 0.3]], yb - 1, yb + 0.4));
    if (b.pressBox) { const vb = v0 + s * rows * 0.75; const yt = yb + rows * 0.4; K.box(F.trimWhite, cu - 3, yt, Math.min(vb, vb + s * 2.6), cu + 3, yt + 2.5, Math.max(vb, vb + s * 2.6)); K.box(F.glassDark, cu - 2.7, yt + 1.0, Math.min(vb, vb + s * 2.6) - 0.03, cu + 2.7, yt + 2.1, Math.max(vb, vb + s * 2.6) + 0.03); K.box(S.navy, cu - 3.3, yt + 2.5, Math.min(vb, vb + s * 2.6) - 0.3, cu + 3.3, yt + 2.7, Math.max(vb, vb + s * 2.6) + 0.3); }
  }
  if (it.sign) { const sg = it.sign; const tex = signTex(sg.text, { w: 1024, h: 128, bg: sg.bg || '#1b2a4a', fg: sg.fg || '#f2c230', size: 0.55 }); const v = cv + sg.side * (W / 2 + (sg.gap ?? 2.2)); const u = cu + (sg.u || 0); const y = Y(u, v); const w = sg.w || 7;
    signPanel(K, tex, u, y + (sg.y ?? 2.2), v + sg.side * 0.06, w, w / 8, sg.side < 0 ? -Math.PI / 2 : Math.PI / 2, { emissive: 0.05 });
    for (const s of [-1, 1]) K.box(F.postBlack, u + s * (w / 2 - 0.2) - 0.05, y - 0.4, v - 0.05, u + s * (w / 2 - 0.2) + 0.05, y + (sg.y ?? 2.2) + 0.4, v + 0.05); }
}
function trackItem(I) { // running track oval fitted inside the stadium outline, grass infield
  const { K, cu, cv, L, W, Y, it } = I; const lanes = it.lanes || 8, laneW = it.laneW || 1.22;
  const ow = Math.min(it.width || (W - 2 * (it.inset ?? 3)), 92.5); const rIn = it.rIn || (ow / 2 - lanes * laneW); const straight = it.straight || Math.min(84.39, L - 2 * (it.insetU ?? 4) - 2 * (rIn + lanes * laneW));
  const [tu, tv] = it.center ? K.uv(it.center[0], it.center[1]) : [cu + (it.du || 0), cv + (it.dv || 0)];
  const tmat = surfaceMat(lanesTexture(lanes, laneW, { col: it.col || '#a8473a' }), { rough: 0.9 });
  trackOval(K, tmat, { cu: tu, cv: tv, straight, rIn, lanes, laneW, yFn: Y, segC: 36, segS: 12 });
  const ring = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + Math.PI * i / 24; ring.push([tu + straight / 2 + Math.cos(a) * (rIn - 0.05), tv + Math.sin(a) * (rIn - 0.05)]); } for (let i = 0; i <= 24; i++) { const a = Math.PI / 2 + Math.PI * i / 24; ring.push([tu - straight / 2 + Math.cos(a) * (rIn - 0.05), tv + Math.sin(a) * (rIn - 0.05)]); }
  const LU = straight + 2 * rIn + 2, LV = 2 * rIn + 2; const tex = fieldTexture(LU, LV, (P) => paintGrass(P, { kind: it.infieldTurf ? 'turf' : 'grass', col: it.infieldTurf ? '#3c7a3b' : '#527f37', alt: it.infieldTurf ? '#418240' : '#5c8b3e', stripe: 6, seed: 51, blotch: it.infieldTurf ? 0 : 1 }), { pxm: 6 });
  drapePoly(K, surfaceMat(tex), ring, { maxEdge: 4, yFn: (u, v) => Y(u, v) - 0.015, uvFn: fieldUV(tu, tv, LU, LV) });
  const R2 = rIn + lanes * laneW + 0.25; const outer = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + Math.PI * i / 20; outer.push([tu + straight / 2 + Math.cos(a) * R2, tv + Math.sin(a) * R2]); } for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 + Math.PI * i / 20; outer.push([tu - straight / 2 + Math.cos(a) * R2, tv + Math.sin(a) * R2]); }
  I.outer = outer; I.track = { tu, tv, straight, rIn, lanes, laneW, R2 };
  skirt(K, I.M, outer, Y);
  if (it.rail !== false) fence(K, I.S, outer, { h: 1.1, every: 3, y: Y, closed: true, gapAt: it.railGaps || [5, 26], colliders: I.colliders });
}
function poolItem(I) {
  const { K, S, M, F, cu, cv, L, W, level, it, colliders, walkables } = I;
  const r = poolBlock(K, S, M, { u0: cu - L / 2, u1: cu + L / 2, v0: cv - W / 2, v1: cv + W / 2, lanes: it.lanes || Math.max(4, Math.round(W / 2.5)), along: 'u', deck: it.deck ?? 3.5, deckH: 0.3, blocks: 'u0', y: level, colliders, walkables });
  I.yd = r && r.yd != null ? r.yd : level + 0.3;
  if (it.guards) for (const s of [-1, 1]) lifeguardChair(K, S, F, cu + s * L * 0.3, cv + W / 2 + 2.0, I.yd, -Math.PI / 2);
}
function deckItem(I) { // concrete pool deck / plaza over a facility outline
  const { it } = I; drapeItem(I, (P) => { const c = P.c; c.fillStyle = it.col || '#d9d4c8'; c.fillRect(0, 0, c.canvas.width, c.canvas.height); speckle(P, Math.min(40000, P.LU * P.LV * 6), 0.05); c.strokeStyle = 'rgba(80,70,60,0.18)'; c.lineWidth = 1; for (let u = -P.LU / 2; u < P.LU / 2; u += 3) { c.beginPath(); c.moveTo(P.X(u), 0); c.lineTo(P.X(u), c.canvas.height); c.stroke(); } for (let v = -P.LV / 2; v < P.LV / 2; v += 3) { c.beginPath(); c.moveTo(0, P.Y(v)); c.lineTo(c.canvas.width, P.Y(v)); c.stroke(); } }, { pxm: 10, off: 0.04 });
}
