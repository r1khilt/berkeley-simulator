// b11 athletics kit: canvas-marked fields (grass / turf / dirt), running tracks, courts, pools, bleachers and
// concrete stands, chain-link fences and netting, light towers, scoreboards, goals and dugouts.
// Everything is authored in a Kit building frame (u along the venue axis, v across, y up) and merged per material.
import * as THREE from 'three';
import { Kit, polysGeo } from './classic-kit.js';
import { canvasTex, pointInPoly } from './venue-util.js';
export { Kit, polysGeo, pointInPoly, canvasTex };

// ---------- 2D helpers ----------
export function hull(pts) {
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
// Minimum-area oriented rectangle. Returns {ang, L, W, cx, cz} with the u axis (cos ang, sin ang) along the long side.
export function fitRect(poly) {
  const h = hull(poly); let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(ang), s = Math.sin(ang); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of h) { const u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0); if (!best || area < best.area) best = { area, ang, u0, u1, v0, v1 };
  }
  let { ang, u0, u1, v0, v1 } = best;
  if (v1 - v0 > u1 - u0) { ang += Math.PI / 2; [u0, u1, v0, v1] = [v0, v1, -u1, -u0]; }
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, c = Math.cos(ang), s = Math.sin(ang);
  return { ang, L: u1 - u0, W: v1 - v0, cx: cu * c - cv * s, cz: cu * s + cv * c };
}
export const deg = (d) => d * Math.PI / 180;
export function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }

// ---------- shared materials (one set per material library) ----------
const _cache = new WeakMap();
function meshTex(cells, lw, col, diag = true) {
  return canvasTex(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'square'; const s = w / cells;
    c.beginPath();
    if (diag) for (let i = -cells; i <= 2 * cells; i++) { c.moveTo(i * s, 0); c.lineTo(i * s + h, h); c.moveTo(i * s, 0); c.lineTo(i * s - h, h); }
    else for (let i = 0; i <= cells; i++) { c.moveTo(i * s, 0); c.lineTo(i * s, h); c.moveTo(0, i * s); c.lineTo(w, i * s); }
    c.stroke();
  }, { repeat: true });
}
export function sportsMats(M) {
  if (_cache.has(M)) return _cache.get(M);
  const see = (map, color, rough = 0.6, metal = 0.3) => new THREE.MeshStandardMaterial({ map, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: rough, metalness: metal, alphaTest: 0.01 });
  const S = {
    alu: new THREE.MeshStandardMaterial({ color: 0xc3c7cb, metalness: 0.65, roughness: 0.42 }),
    galv: new THREE.MeshStandardMaterial({ color: 0x9ea4a9, metalness: 0.6, roughness: 0.45 }),
    chain: see(meshTex(9, 2.2, 'rgba(205,210,214,0.95)'), 0xffffff),
    netBlack: see(meshTex(14, 1.6, 'rgba(30,30,32,0.9)', false), 0xffffff, 0.8, 0.0),
    netWhite: see(meshTex(12, 2.0, 'rgba(250,250,250,0.95)', false), 0xffffff, 0.7, 0.0),
    windGreen: new THREE.MeshStandardMaterial({ color: 0x223a2c, roughness: 0.9, side: THREE.DoubleSide }),
    windBlue: new THREE.MeshStandardMaterial({ color: 0x1b2a46, roughness: 0.9, side: THREE.DoubleSide }),
    padBlue: new THREE.MeshStandardMaterial({ color: 0x1c2847, roughness: 0.75 }),
    goalWhite: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4, metalness: 0.2 }),
    goalYellow: new THREE.MeshStandardMaterial({ color: 0xf3c419, roughness: 0.45, metalness: 0.2 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe8661c, roughness: 0.5, metalness: 0.2 }),
    housing: new THREE.MeshStandardMaterial({ color: 0x5d6166, roughness: 0.5, metalness: 0.6 }),
    benchGrey: new THREE.MeshStandardMaterial({ color: 0xc9d3dc, roughness: 0.6, metalness: 0.2 }),
    standConc: M.concrete.clone(),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.9 }),
    poolTile: new THREE.MeshStandardMaterial({ color: 0x9fd3e3, roughness: 0.35 }),
    deck: M.concrete.clone(),
    sand: new THREE.MeshStandardMaterial({ color: 0xd9ccaa, roughness: 1.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x14254a, roughness: 0.6, metalness: 0.2 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xfdb515, roughness: 0.55 }),
  };
  S.standConc.color = new THREE.Color(0xe9e2d0);
  S.deck.color = new THREE.Color(0xe6e1d6);
  _cache.set(M, S); return S;
}
// material for a draped painted surface (wins the depth test against the terrain beneath it)
export function surfaceMat(map, { rough = 0.95, color = 0xffffff, metal = 0 } = {}) {
  return new THREE.MeshStandardMaterial({ map, color, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
}

// ---------- canvas field painting ----------
// Field frame: fu ∈ [-LU/2, LU/2] along the canvas x axis, fv ∈ [-LV/2, LV/2] along canvas y (down).
export function fieldTexture(LU, LV, paint, { pxm = 14, maxPx = 2048 } = {}) {
  let s = pxm; if (LU * s > maxPx) s = maxPx / LU; if (LV * s > maxPx) s = Math.min(s, maxPx / LV);
  const W = Math.max(16, Math.round(LU * s)), H = Math.max(16, Math.round(LV * s));
  const tex = canvasTex(W, H, (c) => {
    const P = { c, s: W / LU, sy: H / LV, LU, LV, X: (u) => (u + LU / 2) * (W / LU), Y: (v) => (v + LV / 2) * (H / LV) };
    paint(P);
  });
  tex.anisotropy = 16;
  return tex;
}
let _seed = 1; const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
// Base grass. kind: 'grass' (mowing stripes) or 'turf' (synthetic, roll seams). stripe: band width (m) along u.
export function paintGrass(P, { kind = 'grass', col = '#4b7f35', alt = '#5a8f3f', stripe = 5, angle = 0, seed = 7, wear = [], blotch = 0 } = {}) {
  const { c } = P; _seed = seed;
  c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.save(); c.translate(P.X(0), P.Y(0)); c.rotate(angle);
  const R = Math.hypot(P.LU, P.LV) * P.s;
  if (stripe > 0) { c.fillStyle = alt; for (let k = -Math.ceil(R / (stripe * P.s)); k * stripe * P.s < R; k++) if (((k % 2) + 2) % 2 === 0) c.fillRect(k * stripe * P.s, -R, stripe * P.s, 2 * R); }
  c.restore();
  for (let i = 0; i < blotch * P.LU * P.LV / 40; i++) { // large soft colour blotches (patchy natural grass)
    const x = rnd() * c.canvas.width, y = rnd() * c.canvas.height, r = (2 + rnd() * 6) * P.s; const g = c.createRadialGradient(x, y, 0, x, y, r);
    const col2 = rnd() < 0.5 ? '120,140,70' : '60,95,40'; g.addColorStop(0, `rgba(${col2},0.18)`); g.addColorStop(1, `rgba(${col2},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // speckle
  const n = Math.min(60000, Math.round(P.LU * P.LV * (kind === 'turf' ? 2 : 5)));
  for (let i = 0; i < n; i++) {
    const x = rnd() * c.canvas.width, y = rnd() * c.canvas.height, r = rnd();
    c.fillStyle = r < 0.5 ? 'rgba(20,45,10,0.10)' : r < 0.85 ? 'rgba(120,160,70,0.08)' : 'rgba(160,140,80,0.07)';
    c.fillRect(x, y, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  for (const [u, v, ru, rv, a = 0.35] of wear) { // worn patches (goal mouths)
    const g = c.createRadialGradient(P.X(u), P.Y(v), 0, P.X(u), P.Y(v), Math.max(ru, rv) * P.s);
    g.addColorStop(0, `rgba(150,128,82,${a})`); g.addColorStop(1, 'rgba(150,128,82,0)');
    c.save(); c.translate(P.X(u), P.Y(v)); c.scale(ru / Math.max(ru, rv), rv / Math.max(ru, rv)); c.translate(-P.X(u), -P.Y(v));
    c.fillStyle = g; c.beginPath(); c.arc(P.X(u), P.Y(v), Math.max(ru, rv) * P.s, 0, Math.PI * 2); c.fill(); c.restore();
  }
}
export function pen(P, col = '#f4f4ef', w = 0.12) { P.c.strokeStyle = col; P.c.fillStyle = col; P.c.lineWidth = Math.max(1.3, w * P.s); P.c.lineCap = 'butt'; P.c.setLineDash([]); }
export function ln(P, u0, v0, u1, v1) { const c = P.c; c.beginPath(); c.moveTo(P.X(u0), P.Y(v0)); c.lineTo(P.X(u1), P.Y(v1)); c.stroke(); }
export function rect(P, u0, v0, u1, v1) { P.c.strokeRect(P.X(u0), P.Y(v0), (u1 - u0) * P.s, (v1 - v0) * P.s); }
export function arc(P, u, v, r, a0 = 0, a1 = Math.PI * 2) { const c = P.c; c.beginPath(); c.arc(P.X(u), P.Y(v), r * P.s, a0, a1); c.stroke(); }
export function dot(P, u, v, r) { const c = P.c; c.beginPath(); c.arc(P.X(u), P.Y(v), Math.max(1.2, r * P.s), 0, Math.PI * 2); c.fill(); }
export function fillPoly(P, pts, col) { const c = P.c; c.fillStyle = col; c.beginPath(); pts.forEach(([u, v], i) => (i ? c.lineTo(P.X(u), P.Y(v)) : c.moveTo(P.X(u), P.Y(v)))); c.closePath(); c.fill(); }
export function text(P, str, u, v, h, { rot = 0, col = '#ffffff', font = 'bold', family = 'Arial, Helvetica, sans-serif', stroke = null, sw = 0.3 } = {}) {
  const c = P.c; c.save(); c.translate(P.X(u), P.Y(v)); c.rotate(rot); c.font = `${font} ${Math.round(h * P.s)}px ${family}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineWidth = sw * P.s; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(str, 0, 0); }
  c.fillStyle = col; c.fillText(str, 0, 0); c.restore();
}
// Association football (soccer) markings centred at (cu,cv), touchlines along u.
export function soccerLines(P, { cu = 0, cv = 0, L = 105, W = 68, col = '#f4f4ef', lw = 0.12 } = {}) {
  pen(P, col, lw); const hl = L / 2, hw = W / 2;
  rect(P, cu - hl, cv - hw, cu + hl, cv + hw); ln(P, cu, cv - hw, cu, cv + hw);
  arc(P, cu, cv, 9.15); dot(P, cu, cv, 0.16);
  for (const s of [-1, 1]) {
    const gx = cu + s * hl;
    const pa = [gx, gx - s * 16.5].sort((a, b) => a - b); rect(P, pa[0], cv - 20.16, pa[1], cv + 20.16);
    const ga = [gx, gx - s * 5.5].sort((a, b) => a - b); rect(P, ga[0], cv - 9.16, ga[1], cv + 9.16);
    dot(P, gx - s * 11, cv, 0.15);
    const t = Math.acos(5.5 / 9.15); // penalty arc outside the box
    if (s < 0) arc(P, gx + 11, cv, 9.15, -t, t); else arc(P, gx - 11, cv, 9.15, Math.PI - t, Math.PI + t);
    for (const sv of [-1, 1]) { const a0 = s < 0 ? (sv < 0 ? 0 : -Math.PI / 2) : (sv < 0 ? Math.PI / 2 : Math.PI); arc(P, gx, cv + sv * hw, 1, a0, a0 + Math.PI / 2); }
  }
}
// Rugby union markings: try lines L apart, in-goal ig deep.
export function rugbyLines(P, { cu = 0, cv = 0, L = 100, W = 70, ig = 10, col = '#f4f4ef', lw = 0.12 } = {}) {
  pen(P, col, lw); const hl = L / 2, hw = W / 2, c = P.c;
  rect(P, cu - hl - ig, cv - hw, cu + hl + ig, cv + hw);
  for (const x of [-hl, -hl + 22, 0, hl - 22, hl]) ln(P, cu + x, cv - hw, cu + x, cv + hw);
  c.setLineDash([2.0 * P.s, 1.5 * P.s]);
  for (const x of [-10, 10]) ln(P, cu + x, cv - hw, cu + x, cv + hw);
  for (const y of [-hw + 5, -hw + 15, hw - 15, hw - 5]) ln(P, cu - hl, cv + y, cu + hl, cv + y);
  for (const x of [-hl + 5, hl - 5]) ln(P, cu + x, cv - hw, cu + x, cv + hw);
  c.setLineDash([]);
}
// Field hockey: 91.4 x 55 m, shooting circles r 14.63 m.
export function hockeyLines(P, { cu = 0, cv = 0, L = 91.4, W = 55, col = '#f4f4ef', lw = 0.075 } = {}) {
  pen(P, col, lw); const hl = L / 2, hw = W / 2;
  rect(P, cu - hl, cv - hw, cu + hl, cv + hw); ln(P, cu, cv - hw, cu, cv + hw);
  for (const x of [-hl + 22.9, hl - 22.9]) ln(P, cu + x, cv - hw, cu + x, cv + hw);
  for (const s of [-1, 1]) {
    const gx = cu + s * hl, r = 14.63, gp = 1.83;
    const c = P.c; c.beginPath();
    if (s < 0) { c.arc(P.X(gx), P.Y(cv - gp), r * P.s, -Math.PI / 2, 0); c.lineTo(P.X(gx + r), P.Y(cv + gp)); c.arc(P.X(gx), P.Y(cv + gp), r * P.s, 0, Math.PI / 2); }
    else { c.arc(P.X(gx), P.Y(cv + gp), r * P.s, Math.PI / 2, Math.PI); c.lineTo(P.X(gx - r), P.Y(cv - gp)); c.arc(P.X(gx), P.Y(cv - gp), r * P.s, Math.PI, 1.5 * Math.PI); }
    c.stroke();
    P.c.setLineDash([3 * P.s, 2 * P.s]); c.beginPath();
    if (s < 0) { c.arc(P.X(gx), P.Y(cv - gp), (r + 5) * P.s, -Math.PI / 2, 0); c.lineTo(P.X(gx + r + 5), P.Y(cv + gp)); c.arc(P.X(gx), P.Y(cv + gp), (r + 5) * P.s, 0, Math.PI / 2); }
    else { c.arc(P.X(gx), P.Y(cv + gp), (r + 5) * P.s, Math.PI / 2, Math.PI); c.lineTo(P.X(gx - r - 5), P.Y(cv - gp)); c.arc(P.X(gx), P.Y(cv - gp), (r + 5) * P.s, Math.PI, 1.5 * Math.PI); }
    c.stroke(); P.c.setLineDash([]);
    dot(P, gx - s * 6.475, cv, 0.08);
  }
}
// Men's lacrosse: 110 x 60 yd, goals 80 yd apart, crease r 9 ft.
export function lacrosseLines(P, { cu = 0, cv = 0, col = '#fdb515', lw = 0.1 } = {}) {
  const yd = 0.9144; pen(P, col, lw); const hl = 55 * yd, hw = 30 * yd;
  rect(P, cu - hl, cv - hw, cu + hl, cv + hw); ln(P, cu, cv - hw, cu, cv + hw);
  for (const s of [-1, 1]) {
    ln(P, cu + s * 20 * yd, cv - hw, cu + s * 20 * yd, cv + hw); // restraining lines
    rect(P, Math.min(cu + s * hl, cu + s * 20 * yd), cv - 20 * yd, Math.max(cu + s * hl, cu + s * 20 * yd), cv + 20 * yd);
    arc(P, cu + s * 40 * yd, cv, 2.74);
  }
  for (const s of [-1, 1]) ln(P, cu - 10 * yd, cv + s * (hw - 10 * yd), cu + 10 * yd, cv + s * (hw - 10 * yd)); // wing lines
}
// American football (high school): 120 x 53.33 yd with numbers and hashes.
export function footballLines(P, { cu = 0, cv = 0, col = '#f4f4ef', lw = 0.1, hashFrac = 1 / 3, ez = null, ezText = null, ezCol = '#ffffff' } = {}) {
  const yd = 0.9144, fl = 60 * yd, fw = 26.667 * yd; const c = P.c;
  if (ez) for (const s of [-1, 1]) { const x0 = s < 0 ? cu - fl : cu + 50 * yd; fillPoly(P, [[x0, cv - fw], [x0 + 10 * yd, cv - fw], [x0 + 10 * yd, cv + fw], [x0, cv + fw]], ez); if (ezText) text(P, ezText, x0 + 5 * yd, cv, 4.2, { rot: s < 0 ? -Math.PI / 2 : Math.PI / 2, col: ezCol }); }
  pen(P, col, lw); rect(P, cu - fl, cv - fw, cu + fl, cv + fw);
  for (let y = -50; y <= 50; y += 5) ln(P, cu + y * yd, cv - fw, cu + y * yd, cv + fw);
  const hh = fw * (1 - 2 * hashFrac);
  for (let y = -49; y <= 49; y++) { if (y % 5 === 0) continue; for (const v0 of [-fw, fw - 0.61, -hh / 2 - 0.3, hh / 2 - 0.3]) ln(P, cu + y * yd, cv + v0, cu + y * yd, cv + v0 + 0.61); }
  for (let y = -40; y <= 40; y += 10) { const lab = String(50 - Math.abs(y)); for (const s of [-1, 1]) text(P, lab, cu + y * yd, cv + s * (fw - 9 * yd - 0.9), 1.83, { rot: s < 0 ? Math.PI : 0, col }); }
  c.lineWidth = Math.max(1.3, lw * 2 * P.s); for (const s of [-1, 1]) ln(P, cu + s * 50 * yd, cv - fw, cu + s * 50 * yd, cv + fw);
}
// Baseball / softball diamond. home: [u,v]; dir: angle (rad, field frame) from home toward 2nd base.
export function paintDiamond(P, { home, dir, base = 27.43, rubber = 18.44, arcR = 28.96, softball = false, dirt = '#b9875f', dirtDark = '#a87650', grassIn = null, fence = null, track = 4.6, chalk = '#f6f4ee', mound = 2.74, homeR = 3.96, lineTo = 140 } = {}) {
  const c = P.c; const ca = Math.cos(dir), sa = Math.sin(dir);
  const at = (a, b) => [home[0] + a * ca - b * sa, home[1] + a * sa + b * ca]; // a along home->2B, b to the right
  const rub = at(rubber, 0);
  // warning track along the fence line (fence: [[u,v],...] polyline from the LF line to the RF line)
  if (fence) { c.save(); c.strokeStyle = dirt; c.lineJoin = 'round'; c.lineWidth = 2 * track * P.s; c.beginPath(); fence.forEach(([u, v], i) => (i ? c.lineTo(P.X(u), P.Y(v)) : c.moveTo(P.X(u), P.Y(v)))); c.stroke(); c.restore(); }
  // infield skin: arc around the rubber, clipped to a wedge from home
  c.save(); c.beginPath(); const W1 = at(-3, 0), wr = 200;
  const wa = deg(softball ? 50 : 49);
  c.moveTo(P.X(W1[0]), P.Y(W1[1])); const p1 = at(wr * Math.cos(wa), -wr * Math.sin(wa)), p2 = at(wr * Math.cos(wa), wr * Math.sin(wa));
  c.lineTo(P.X(p1[0]), P.Y(p1[1])); c.lineTo(P.X(p2[0]), P.Y(p2[1])); c.closePath(); c.clip();
  c.fillStyle = dirt; c.beginPath(); c.arc(P.X(rub[0]), P.Y(rub[1]), arcR * P.s, 0, Math.PI * 2); c.fill(); c.restore();
  // infield grass (baseball): square inside the base paths
  const d = base / Math.SQRT2;
  if (!softball) {
    const ins = 0.95; const sq = [[ins * 1.6, 0], [d, -d + ins * 1.42], [2 * d - ins * 1.6, 0], [d, d - ins * 1.42]].map(([a, b]) => at(a, b));
    fillPoly(P, sq, grassIn || '#5c9143');
    c.fillStyle = dirtDark; c.beginPath(); c.arc(P.X(at(rubber - 0.45, 0)[0]), P.Y(at(rubber - 0.45, 0)[1]), mound * P.s, 0, Math.PI * 2); c.fill();
    // base cut-outs (dirt around the bases)
    for (const bp of [at(d, -d), at(2 * d, 0), at(d, d)]) { c.fillStyle = dirt; c.beginPath(); c.arc(P.X(bp[0]), P.Y(bp[1]), 3.0 * P.s, 0, Math.PI * 2); c.fill(); }
  }
  c.fillStyle = softball ? dirt : dirtDark; c.beginPath(); c.arc(P.X(home[0]), P.Y(home[1]), homeR * P.s, 0, Math.PI * 2); c.fill();
  // grass ring texture on the skin (drag marks)
  c.save(); c.globalAlpha = 0.08; c.strokeStyle = '#6b4a30'; c.lineWidth = 1;
  for (let r = 4; r < arcR; r += 0.6) { c.beginPath(); c.arc(P.X(rub[0]), P.Y(rub[1]), r * P.s, dir - 0.9, dir + 0.9); c.stroke(); }
  c.restore();
  // chalk: foul lines, batter's boxes, rubber, bases, home plate
  pen(P, chalk, 0.1);
  for (const s of [-1, 1]) { const e = at(lineTo * Math.SQRT1_2, s * lineTo * Math.SQRT1_2); ln(P, home[0], home[1], e[0], e[1]); }
  for (const s of [-1, 1]) { // batter's boxes 4 x 6 ft
    const q = [at(-0.9, s * 0.25), at(-0.9, s * 1.47), at(0.93, s * 1.47), at(0.93, s * 0.25)];
    c.beginPath(); q.forEach(([u, v], i) => (i ? c.lineTo(P.X(u), P.Y(v)) : c.moveTo(P.X(u), P.Y(v)))); c.closePath(); c.stroke();
  }
  if (softball) arc(P, rub[0], rub[1], 2.44);
  const quad = (cen, hw, rot, col) => { const pts = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]].map(([a, b]) => { const aa = a * Math.cos(rot) - b * Math.sin(rot), bb = a * Math.sin(rot) + b * Math.cos(rot); return at(cen[0] + aa, cen[1] + bb); }); fillPoly(P, pts, col); };
  quad([rubber, 0], 0.3, 0, '#ffffff');
  for (const [a, b] of [[d - 0.27, -d + 0.27], [2 * d, 0], [d - 0.27, d - 0.27]]) quad([a, b], 0.19, Math.PI / 4, '#ffffff');
  fillPoly(P, [at(0, 0), at(0.22, -0.22), at(0.43, -0.22), at(0.43, 0.22), at(0.22, 0.22)], '#ffffff');
}
// Tennis court markings (doubles 23.77 x 10.97) centred at (cu,cv), long axis along u (rot = 0) or v (rot = 90deg).
export function paintTennis(P, { cu, cv, rot = 0, inCol = '#2f5f9e', outCol = '#3e7a5a', pad = [6.4, 3.66], col = '#ffffff' } = {}) {
  const c = P.c; c.save(); c.translate(P.X(cu), P.Y(cv)); c.rotate(rot); c.translate(-P.X(cu), -P.Y(cv));
  if (outCol) { c.fillStyle = outCol; c.fillRect(P.X(cu - 11.885 - pad[0]), P.Y(cv - 5.485 - pad[1]), (23.77 + 2 * pad[0]) * P.s, (10.97 + 2 * pad[1]) * P.s); }
  c.fillStyle = inCol; c.fillRect(P.X(cu - 11.885), P.Y(cv - 5.485), 23.77 * P.s, 10.97 * P.s);
  pen(P, col, 0.05); rect(P, cu - 11.885, cv - 5.485, cu + 11.885, cv + 5.485); ln(P, cu - 11.885, cv - 4.115, cu + 11.885, cv - 4.115); ln(P, cu - 11.885, cv + 4.115, cu + 11.885, cv + 4.115);
  ln(P, cu - 6.4, cv - 4.115, cu - 6.4, cv + 4.115); ln(P, cu + 6.4, cv - 4.115, cu + 6.4, cv + 4.115); ln(P, cu - 6.4, cv, cu + 6.4, cv);
  ln(P, cu - 11.885, cv, cu - 11.6, cv); ln(P, cu + 11.6, cv, cu + 11.885, cv);
  c.restore();
}

// ---------- draped surfaces ----------
// Split triangles until no edge exceeds maxEdge (positions are [u,v] pairs; returns flat list of triangles)
function tessTris(tris, maxEdge) {
  const out = []; const st = tris.slice();
  while (st.length) {
    const t = st.pop(); const [a, b, c] = t;
    const e = [Math.hypot(a[0] - b[0], a[1] - b[1]), Math.hypot(b[0] - c[0], b[1] - c[1]), Math.hypot(c[0] - a[0], c[1] - a[1])];
    const k = e.indexOf(Math.max(...e));
    if (e[k] <= maxEdge) { out.push(t); continue; }
    if (k === 0) { const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; st.push([a, m, c], [m, b, c]); }
    else if (k === 1) { const m = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]; st.push([a, b, m], [a, m, c]); }
    else { const m = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2]; st.push([a, b, m], [m, b, c]); }
  }
  return out;
}
// Drape a polygon (building-frame [u,v] ring, optional holes) over the terrain. uvFn(u,v) -> [s,t]; yFn(u,v) overrides height.
export function drapePoly(K, mat, ring, { holes = [], maxEdge = 3, off = 0.05, uvFn = null, yFn = null, detail = false, down = false } = {}) {
  const shape = new THREE.Shape(ring.map(([u, v]) => new THREE.Vector2(u, v)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
  const sg = new THREE.ShapeGeometry(shape); const p = sg.attributes.position; const idx = sg.index ? Array.from(sg.index.array) : [...Array(p.count).keys()];
  const tris = []; for (let i = 0; i < idx.length; i += 3) tris.push([0, 1, 2].map((k) => [p.getX(idx[i + k]), p.getY(idx[i + k])]));
  const T = tessTris(tris, maxEdge); const pos = [], uv = [];
  const Y = yFn || ((u, v) => K.g(u, v) + off);
  for (const [a, b, c] of T) {
    // shape is in (u, v) = (x, y) of the 2D plane; we want normals up: order a, c, b when v maps to +z
    const ord = down ? [a, b, c] : [a, c, b];
    let cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const o = cr > 0 ? ord : (down ? [a, c, b] : [a, b, c]);
    for (const q of o) { pos.push(q[0], Y(q[0], q[1]), q[1]); if (uvFn) { const t = uvFn(q[0], q[1]); uv.push(t[0], t[1]); } else uv.push(q[0] * 0.5, q[1] * 0.5); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return K.add(mat, g, { uvMode: 'keep', detail });
}
export const rectRing = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
// uv mapper for a field texture of size LU x LV centred at (cu,cv) in the building frame, optionally rotated by rot
export function fieldUV(cu, cv, LU, LV, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (u, v) => { const du = u - cu, dv = v - cv; const fu = du * c + dv * s, fv = -du * s + dv * c; return [(fu + LU / 2) / LU, 1 - (fv + LV / 2) / LV]; };
}

// ---------- running track ----------
// Standard oval: straights of length `straight` along u, inner radius rIn, lanes x laneW, centred at (cu,cv).
export function lanesTexture(lanes, laneW, { col = '#c0533a', line = '#f2f0ea', tile = 8 } = {}) {
  const Wm = lanes * laneW;
  return canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    _seed = 3; for (let i = 0; i < 9000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    c.fillStyle = line; const px = w / Wm;
    for (let k = 0; k <= lanes; k++) { const x = Math.min(w - 2, Math.max(0, k * laneW * px - 1.5)); c.fillRect(x, 0, Math.max(2, 0.05 * px), h); }
  }, { repeat: true });
}
export function trackOval(K, mat, { cu, cv, straight = 84.39, rIn = 36.5, lanes = 8, laneW = 1.22, off = 0.06, tile = 8, segC = 40, segS = 12, yFn = null }) {
  const Wd = lanes * laneW; const pts = []; // centreline param along the inner edge
  const pos = [], uv = []; const Y = yFn || ((u, v) => K.g(u, v) + off);
  const ringPt = (t, w) => { // t in [0, P) along inner edge, w lateral offset outward
    const S = straight, P1 = S, P2 = S + Math.PI * rIn, P3 = 2 * S + Math.PI * rIn;
    if (t < P1) return [cu - S / 2 + t, cv + rIn + w];                    // south straight (+v side), running +u
    if (t < P2) { const a = Math.PI / 2 - (t - P1) / rIn; return [cu + S / 2 + Math.cos(a) * (rIn + w), cv + Math.sin(a) * (rIn + w)]; }
    if (t < P3) return [cu + S / 2 - (t - P2), cv - rIn - w];
    const a = -Math.PI / 2 - (t - P3) / rIn; return [cu - S / 2 + Math.cos(a) * (rIn + w), cv + Math.sin(a) * (rIn + w)];
  };
  const Ptot = 2 * straight + 2 * Math.PI * rIn; const ts = [];
  for (let i = 0; i < segS; i++) ts.push(straight * i / segS);
  for (let i = 0; i < segC; i++) ts.push(straight + Math.PI * rIn * i / segC);
  for (let i = 0; i < segS; i++) ts.push(straight + Math.PI * rIn + straight * i / segS);
  for (let i = 0; i < segC; i++) ts.push(2 * straight + Math.PI * rIn + Math.PI * rIn * i / segC);
  ts.push(Ptot);
  const ws = [0, Wd / 2, Wd];
  for (let i = 0; i < ts.length - 1; i++) for (let j = 0; j < ws.length - 1; j++) {
    const A = ringPt(ts[i], ws[j]), B = ringPt(ts[i + 1] % Ptot, ws[j]), C = ringPt(ts[i + 1] % Ptot, ws[j + 1]), D = ringPt(ts[i], ws[j + 1]);
    const sA = ts[i] / tile, sB = ts[i + 1] / tile, wA = ws[j] / Wd, wB = ws[j + 1] / Wd;
    const V = (q) => [q[0], Y(q[0], q[1]), q[1]];
    // orientation: compute and fix so normal is up
    const tri = (p, q, r, tp, tq, tr) => { const cr = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); const o = cr < 0 ? [[p, tp], [q, tq], [r, tr]] : [[p, tp], [r, tr], [q, tq]]; for (const [pp, tt] of o) { pos.push(...V(pp)); uv.push(tt[0], tt[1]); } };
    tri(A, B, C, [wA, sA], [wA, sB], [wB, sB]); tri(A, C, D, [wA, sA], [wB, sB], [wB, sA]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  K.add(mat, g, { uvMode: 'keep' });
  return { ringPt, Ptot, Wd };
}

// ---------- bleachers & stands ----------
// Aluminium bleacher bank between u0..u1; front edge at v0, rows climb toward v0 + dir*k*run. Returns a walkable.
export function bleachers(K, S, { u0, u1, v0, dir = 1, rows = 8, rise = 0.4, run = 0.75, y0 = null, rail = true, frameEvery = 2.6, closed = false }) {
  const yb = y0 ?? Math.min(K.g(u0, v0), K.g(u1, v0), K.g(u0, v0 + dir * rows * run), K.g(u1, v0 + dir * rows * run));
  const vv = (k) => v0 + dir * k * run; const len = u1 - u0;
  for (let k = 0; k < rows; k++) {
    const yT = yb + rise * (k + 1); const a = vv(k), b = vv(k + 1);
    K.box(S.alu, u0, yT - 0.05, Math.min(a, a + dir * 0.32), u1, yT, Math.max(a, a + dir * 0.32)); // foot board
    K.box(S.alu, u0, yT + 0.38, Math.min(b - dir * 0.36, b - dir * 0.04), u1, yT + 0.43, Math.max(b - dir * 0.36, b - dir * 0.04)); // seat plank
    if (closed) K.box(S.alu, u0, yT - rise, Math.min(a, a + dir * 0.02), u1, yT - 0.05, Math.max(a, a + dir * 0.02));
  }
  const nF = Math.max(2, Math.round(len / frameEvery) + 1);
  for (let i = 0; i < nF; i++) { // stringers: sloped beam + rear leg
    const u = u0 + 0.1 + (len - 0.2) * i / (nF - 1);
    const vA = vv(0), vB = vv(rows), yA = yb + rise * 0.5, yB = yb + rise * rows;
    const L = Math.hypot(vB - vA, yB - yA); const g = new THREE.BoxGeometry(0.08, 0.16, L); g.rotateX(dir * Math.atan2(yB - yA, Math.abs(vB - vA)) * -1); g.translate(u, (yA + yB) / 2, (vA + vB) / 2); K.add(S.galv, g, { detail: true });
    K.box(S.galv, u - 0.05, yb - 0.3, Math.min(vB, vB - dir * 0.1), u + 0.05, yB, Math.max(vB, vB - dir * 0.1), { detail: true });
    K.box(S.galv, u - 0.05, yb - 0.3, Math.min(vv(rows / 2), vv(rows / 2) - dir * 0.1), u + 0.05, yb + rise * rows / 2, Math.max(vv(rows / 2), vv(rows / 2) - dir * 0.1), { detail: true });
  }
  if (rail) { // rear and side guard rails
    const yR = yb + rise * rows + 1.05, vB = vv(rows) - dir * 0.05;
    K.box(S.galv, u0, yR - 0.03, vB - 0.03, u1, yR + 0.03, vB + 0.03, { detail: true });
    for (let i = 0; i <= Math.round(len / 2.4); i++) { const u = u0 + len * i / Math.round(len / 2.4); K.box(S.galv, u - 0.025, yb + rise * rows, vB - 0.025, u + 0.025, yR, vB + 0.025, { detail: true }); }
    for (const u of [u0, u1]) for (let k = 0; k < rows; k++) { const yT = yb + rise * (k + 1); K.box(S.galv, u - 0.02, yT + 0.9, Math.min(vv(k), vv(k + 1)), u + 0.02, yT + 0.95, Math.max(vv(k), vv(k + 1)), { detail: true }); }
  }
  const vmin = Math.min(vv(0), vv(rows)), vmax = Math.max(vv(0), vv(rows));
  return K.walkFn(u0, vmin, u1, vmax, (u, v) => { if (u < u0 || u > u1 || v < vmin || v > vmax) return null; const k = Math.min(rows - 1, Math.max(0, Math.floor(((v - v0) * dir) / run))); return yb + rise * (k + 1); });
}
// Stepped concrete stand. rows climb from vFront in direction dir. Row k spans u in [uS(k), uN(k)] (taper = [dS, dN] metres per row).
// Returns {walk, top, vBack, rowAt}. benches: 'paint' (painted plank on each tread) or null.
export function concreteStand(K, S, { u0, u1, vFront, dir = 1, rows = 20, run = 0.8, rise = 0.4, y0, taper = [0, 0], frontWall = 1.0, benchMat = null, backWall = 1.1, aisleEvery = 0, aisleW = 1.2, mat = null, endWalls = true, under = true }) {
  const cm = mat || S.standConc; const vv = (k) => vFront + dir * k * run; const yk = (k) => y0 + frontWall + rise * k;
  const uS = (k) => u0 + taper[0] * k, uN = (k) => u1 - taper[1] * k;
  const isAisle = (u) => aisleEvery > 0 && (((u - u0) % aisleEvery) + aisleEvery) % aisleEvery < aisleW;
  // front wall
  K.box(cm, u0, y0 - 1.0, Math.min(vFront, vFront - dir * 0.3), u1, y0 + frontWall + 0.05, Math.max(vFront, vFront - dir * 0.3));
  for (let k = 0; k < rows; k++) {
    const a = vv(k), b = vv(k + 1); const top = yk(k + 1); const lo = Math.min(a, b), hi = Math.max(a, b);
    const s0 = uS(k), s1 = uN(k); if (s1 - s0 < 1) break;
    K.box(cm, s0, yk(k) - 0.25, lo, s1, top, hi); // tread block (riser face at a)
    if (benchMat) { // bench plank on the back half of the tread, split at aisles
      let s = s0; const segs = [];
      if (aisleEvery > 0) { for (let u = u0; u < s1; u += aisleEvery) { const e0 = u, e1 = u + aisleW; if (e0 > s) segs.push([s, Math.min(e0, s1)]); s = Math.max(s, e1); } }
      if (s < s1) segs.push([s, s1]);
      for (const [p, q] of segs) if (q - p > 0.5) K.box(benchMat, p, top + 0.36, Math.min(b - dir * 0.42, b - dir * 0.1), q, top + 0.42, Math.max(b - dir * 0.42, b - dir * 0.1));
    }
  }
  const nR = rows; const vB = vv(nR); const yTop = yk(nR);
  // back wall / parapet and ends
  if (backWall > 0) K.box(cm, uS(nR - 1), y0 - 1, Math.min(vB, vB + dir * 0.35), uN(nR - 1), yTop + backWall, Math.max(vB, vB + dir * 0.35));
  if (under) { // enclosed underside: sloped soffit is hidden; close with the back wall down to grade and end walls
    for (const sgn of [-1, 1]) {
      if (!endWalls) break;
      const pts = []; // stepped end wall profile in (v, y)
      for (let k = 0; k < nR; k++) { const uu = sgn < 0 ? uS(k) : uN(k); pts.push([uu, vv(k), yk(k + 1)], [uu, vv(k + 1), yk(k + 1)]); }
      // build as boxes per row column (thin wall following the taper)
      for (let k = 0; k < nR; k++) { const uu = sgn < 0 ? uS(k) : uN(k); const lo = Math.min(vv(k), vv(k + 1)), hi = Math.max(vv(k), vv(k + 1)); K.box(cm, uu - (sgn < 0 ? 0.3 : 0), y0 - 1, lo, uu + (sgn < 0 ? 0 : 0.3), yk(k + 1) + 0.02, hi); }
    }
  }
  const vmin = Math.min(vFront, vB), vmax = Math.max(vFront, vB);
  const rowAt = (u, v) => { const k = Math.floor(((v - vFront) * dir) / run); if (k < 0 || k >= nR) return null; if (u < uS(k) || u > uN(k)) return null; return yk(k + 1); };
  return { walk: K.walkFn(u0, vmin, u1, vmax, rowAt), yTop, vB, rowAt, yk, vv, uS, uN };
}

// ---------- fences & nets ----------
// Fence along a polyline of building-frame points. mesh: material (S.chain/S.netBlack); wind: {h, mat}; returns colliders.
export function fence(K, S, pts, { h = 2.4, mesh = null, post = null, every = 3, wind = null, rail = true, y = null, base = 0, gapAt = [], colliders = null, closed = false, postR = 0.04 } = {}) {
  mesh = mesh || S.chain; post = post || S.galv; const Y = y || ((u, v) => K.g(u, v));
  const P = closed ? [...pts, pts[0]] : pts; const pos = [], uv = [], wpos = [];
  let acc = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
    const n = Math.max(1, Math.round(L / every)); const gap = gapAt.includes(i);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n; const p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const g0 = Y(p0[0], p0[1]) + base, g1 = Y(p1[0], p1[1]) + base; const s0 = (acc + L * t0) / 2, s1 = (acc + L * t1) / 2;
      if (!gap) {
        pos.push(p0[0], g0, p0[1], p1[0], g1, p1[1], p1[0], g1 + h, p1[1], p0[0], g0, p0[1], p1[0], g1 + h, p1[1], p0[0], g0 + h, p0[1]);
        uv.push(s0, g0 / 2, s1, g1 / 2, s1, (g1 + h) / 2, s0, g0 / 2, s1, (g1 + h) / 2, s0, (g0 + h) / 2);
        if (wind) { const wh = Math.min(h, wind.h); wpos.push(p0[0], g0 + 0.05, p0[1], p1[0], g1 + 0.05, p1[1], p1[0], g1 + wh, p1[1], p0[0], g0 + 0.05, p0[1], p1[0], g1 + wh, p1[1], p0[0], g0 + wh, p0[1]); }
      }
      if (!gap || k === 0) K.cyl(post, p0[0], g0 - 0.5, p0[1], postR, postR, h + 0.55, 6, { detail: true });
    }
    if (rail && !gap) { const ga = Y(a[0], a[1]) + base + h, gb = Y(b[0], b[1]) + base + h; const g = new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(L, gb - ga), 5); g.rotateZ(Math.PI / 2); g.rotateZ(Math.atan2(gb - ga, L)); g.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); g.translate((a[0] + b[0]) / 2, (ga + gb) / 2, (a[1] + b[1]) / 2); K.add(post, g, { detail: true }); }
    if (colliders && !gap) { const nx = -(b[1] - a[1]) / L * 0.08, nz = (b[0] - a[0]) / L * 0.08; const gmin = Math.min(Y(a[0], a[1]), Y(b[0], b[1])) + base; colliders.push(K.colPoly([[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], gmin - 1, gmin + h)); }
    acc += L;
  }
  const last = P[P.length - 1]; if (!closed) K.cyl(post, last[0], Y(last[0], last[1]) + base - 0.5, last[1], postR, postR, h + 0.55, 6, { detail: true });
  if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); K.add(mesh, g, { uvMode: 'keep' }); }
  if (wpos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); g.computeVertexNormals(); K.add(wind.mat, g); }
}
// Tall ball-stop netting on poles (soccer/baseball backstops)
export function netWall(K, S, pts, { h = 9, every = 9, y = null, colliders = null } = {}) {
  return fence(K, S, pts, { h, mesh: S.netBlack, every, rail: true, y, colliders, postR: 0.11 });
}

// ---------- lights, scoreboards, goals ----------
// Light tower at (u,v) with lamp head of nx x ny fixtures facing angle `face` (building frame radians, 0 = +u)
export function lightTower(K, S, M, u, v, { h = 24, face = 0, nx = 4, ny = 3, y0 = null, colliders = null, lattice = false } = {}) {
  const g0 = y0 ?? K.g(u, v);
  if (lattice) { // three-legged lattice mast
    for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3; K.cyl(S.galv, u + Math.cos(a) * 0.5, g0 - 0.5, v + Math.sin(a) * 0.5, 0.07, 0.05, h + 0.5, 6); }
    for (let y = 1.5; y < h; y += 1.5) K.cyl(S.galv, u, g0 + y, v, 0.58, 0.58, 0.06, 6, { detail: true });
  } else { K.cyl(S.galv, u, g0 - 0.5, v, 0.32, 0.17, h + 0.5, 10); K.cyl(S.concrete || M.concreteDark, u, g0 - 0.5, v, 0.6, 0.6, 1.2, 10); }
  const cf = Math.cos(face), sf = Math.sin(face); const W = nx * 0.75, H = ny * 0.75;
  const hu = u + cf * 0.6, hv = v + sf * 0.6;
  // frame
  K.obox(S.galv, hu, g0 + h - H / 2, hv, 0.12, H + 0.3, W + 0.4, face, { detail: true });
  K.obox(S.galv, u + cf * 0.3, g0 + h - 0.1, v + sf * 0.3, 0.7, 0.12, 0.12, face);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const lat = (i - (nx - 1) / 2) * 0.75, y = g0 + h - 0.38 - j * 0.75;
    const cu = hu + cf * 0.25 - sf * lat, cv = hv + sf * 0.25 + cf * lat;
    K.obox(S.housing, cu, y, cv, 0.38, 0.55, 0.6, face);
    K.obox(M.lampGlow, cu + cf * 0.2, y - 0.02, cv + sf * 0.2, 0.03, 0.45, 0.5, face);
  }
  if (colliders) colliders.push(K.colCyl(u, v, 0.4, g0 - 1, g0 + h));
}
// Scoreboard: face texture drawn by draw(ctx,w,h); centre (u,v), facing angle `face`; legs below.
export function scoreboard(K, S, u, v, { face = 0, w = 8, h = 3.2, y = 3.5, depth = 0.6, draw = null, legs = 2, legMat = null, colliders = null } = {}) {
  const g0 = K.g(u, v); const cf = Math.cos(face), sf = Math.sin(face);
  const tex = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
    c.fillStyle = '#101418'; c.fillRect(0, 0, W, H);
    if (draw) draw(c, W, H); else { c.fillStyle = '#fdb515'; c.font = `bold ${Math.round(H * 0.22)}px Arial`; c.textAlign = 'center'; c.fillText('HOME   GUEST', W / 2, H * 0.3); c.fillStyle = '#ffb000'; c.font = `bold ${Math.round(H * 0.35)}px Courier New, monospace`; c.fillText('0   0', W / 2, H * 0.75); }
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
  K.obox(S.navy, u, g0 + y + h / 2, v, depth, h + 0.3, w + 0.3, face);
  const pg = new THREE.PlaneGeometry(w, h); pg.rotateY(Math.PI / 2 - face); pg.translate(u + cf * (depth / 2 + 0.01), g0 + y + h / 2, v + sf * (depth / 2 + 0.01)); K.add(mat, pg, { uvMode: 'keep' });
  for (let i = 0; i < legs; i++) { const lat = legs === 1 ? 0 : (i / (legs - 1) - 0.5) * (w * 0.7); K.obox(legMat || S.galv, u - sf * lat, g0 + y / 2 - 0.25, v + cf * lat, 0.3, y + 0.5, 0.3, face); if (colliders) colliders.push(K.colCyl(u - sf * lat, v + cf * lat, 0.3, g0 - 1, g0 + y)); }
}
// Soccer goal on the goal line at (u,v); faces +u if dirU = 1 (net extends toward -u*dirU... i.e. behind the line)
export function soccerGoal(K, S, u, v, { dirU = 1, axis = 'u', w = 7.32, h = 2.44, depth = 2.0, y0 = null, mat = null } = {}) {
  const fm = mat || S.goalWhite; const g = y0 ?? K.g(u, v); const P = (a, b) => (axis === 'u' ? [u + a, v + b] : [u + b, v + a]);
  const r = 0.06; const back = -dirU * depth;
  for (const s of [-1, 1]) { const p = P(0, s * w / 2); K.cyl(fm, p[0], g, p[1], r, r, h, 8); const q = P(back, s * w / 2); K.cyl(fm, q[0], g, q[1], 0.03, 0.03, 1.0, 6, { detail: true }); }
  const bar = (a0, b0, y0b, a1, b1, y1b, rr) => { const p0 = P(a0, b0), p1 = P(a1, b1); const L = Math.hypot(p1[0] - p0[0], y1b - y0b, p1[1] - p0[1]); const gg = new THREE.CylinderGeometry(rr, rr, L, 6); gg.translate(0, L / 2, 0); const dir = new THREE.Vector3(p1[0] - p0[0], y1b - y0b, p1[1] - p0[1]).normalize(); gg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); gg.translate(p0[0], y0b, p0[1]); return gg; };
  K.add(fm, bar(0, -w / 2, g + h, 0, w / 2, g + h, r));
  for (const s of [-1, 1]) { K.add(fm, bar(0, s * w / 2, g + h, back * 0.45, s * w / 2, g + h * 0.95, 0.03), { detail: true }); K.add(fm, bar(back * 0.45, s * w / 2, g + h * 0.95, back, s * w / 2, g + 1.0, 0.03), { detail: true }); }
  K.add(fm, bar(back, -w / 2, g + 0.03, back, w / 2, g + 0.03, 0.03), { detail: true });
  // nets: roof, back, sides
  const pos = [], uv = []; const Q = (a, b, c, d) => { for (const [p, y] of [a, b, c, a, c, d]) { const pp = P(p[0], p[1]); pos.push(pp[0], y, pp[1]); uv.push((p[0] + p[1]) * 0.5, y * 0.5); } };
  Q([[0, -w / 2], g + h], [[0, w / 2], g + h], [[back * 0.45, w / 2], g + h * 0.95], [[back * 0.45, -w / 2], g + h * 0.95]);
  Q([[back * 0.45, -w / 2], g + h * 0.95], [[back * 0.45, w / 2], g + h * 0.95], [[back, w / 2], g + 0.02], [[back, -w / 2], g + 0.02]);
  for (const s of [-1, 1]) { Q([[0, s * w / 2], g], [[0, s * w / 2], g + h], [[back * 0.45, s * w / 2], g + h * 0.95], [[back, s * w / 2], g]); }
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ng.computeVertexNormals(); K.add(S.netWhite, ng, { uvMode: 'keep', detail: true });
}
export function rugbyPosts(K, S, u, v, { axis = 'u', w = 5.6, bar = 3.0, h = 14, pad = 2.0, padMat = null, y0 = null, colliders = null } = {}) {
  const g = y0 ?? K.g(u, v); const P = (b) => (axis === 'u' ? [u, v + b] : [u + b, v]);
  for (const s of [-1, 1]) { const p = P(s * w / 2); K.cyl(S.goalWhite, p[0], g - 0.3, p[1], 0.09, 0.07, h + 0.3, 8); K.cyl(padMat || S.padBlue, p[0], g, p[1], 0.32, 0.32, pad, 8); if (colliders) colliders.push(K.colCyl(p[0], p[1], 0.35, g - 1, g + pad)); }
  const p0 = P(-w / 2), p1 = P(w / 2); const L = w; const gg = new THREE.CylinderGeometry(0.08, 0.08, L, 8); gg.rotateZ(Math.PI / 2); if (axis === 'u') gg.rotateY(Math.PI / 2); gg.translate((p0[0] + p1[0]) / 2, g + bar, (p0[1] + p1[1]) / 2); K.add(S.goalWhite, gg);
}
export function footballPosts(K, S, u, v, { axis = 'u', dirU = 1, w = 7.1, bar = 3.05, h = 6.1, y0 = null } = {}) {
  const g = y0 ?? K.g(u, v); const P = (a, b) => (axis === 'u' ? [u + a, v + b] : [u + b, v + a]);
  const base = P(dirU * 1.8, 0); K.cyl(S.goalYellow, base[0], g - 0.3, base[1], 0.14, 0.12, bar + 0.3, 8); K.cyl(S.padBlue, base[0], g, base[1], 0.3, 0.3, 1.8, 8);
  const top = P(0, 0); K.obox(S.goalYellow, (base[0] + top[0]) / 2, g + bar, (base[1] + top[1]) / 2, 1.8, 0.14, 0.14, axis === 'u' ? 0 : Math.PI / 2);
  K.obox(S.goalYellow, top[0], g + bar, top[1], 0.12, 0.12, w, axis === 'u' ? 0 : Math.PI / 2);
  for (const s of [-1, 1]) { const p = P(0, s * w / 2); K.cyl(S.goalYellow, p[0], g + bar, p[1], 0.06, 0.05, h, 6); }
}
export function smallGoal(K, S, u, v, { axis = 'u', dirU = 1, w = 3.66, h = 2.14, depth = 1.2, mat = null, board = true, y0 = null } = {}) {
  soccerGoal(K, S, u, v, { axis, dirU, w, h, depth, mat, y0 });
  if (board) { const g = y0 ?? K.g(u, v); const P = (a, b) => (axis === 'u' ? [u + a, v + b] : [u + b, v + a]); const p = P(-dirU * depth, 0); K.obox(S.navy, p[0], g + 0.23, p[1], axis === 'u' ? 0.05 : w, 0.46, axis === 'u' ? w : 0.05, 0); }
}
// Dugout at field level: back wall, ends, roof slab, bench; opening faces direction `face`.
export function dugout(K, S, M, u, v, { face = 0, len = 12, depth = 2.4, h = 2.5, roofMat = null, wallMat = null, colliders = null } = {}) {
  const cf = Math.cos(face), sf = Math.sin(face); const g = K.g(u, v); const wm = wallMat || M.concrete;
  const at = (a, b) => [u + cf * a - sf * b, v + sf * a + cf * b]; // a toward the field, b along
  const bw = at(-depth, 0); K.obox(wm, bw[0], g + h / 2 - 0.5, bw[1], 0.3, h + 1, len, face);
  for (const s of [-1, 1]) { const e = at(-depth / 2, s * len / 2); K.obox(wm, e[0], g + h / 2 - 0.5, e[1], depth, h + 1, 0.3, face); }
  const r = at(-depth / 2 + 0.2, 0); K.obox(roofMat || S.navy, r[0], g + h + 0.12, r[1], depth + 0.6, 0.25, len + 0.4, face);
  const fr = at(0.1, 0); K.obox(wm, fr[0], g + 0.5, fr[1], 0.25, 1.0, len, face);
  const bn = at(-depth + 0.5, 0); K.obox(S.benchGrey, bn[0], g + 0.45, bn[1], 0.4, 0.06, len - 0.6, face, { detail: true });
  K.obox(S.galv, fr[0], g + 1.05, fr[1], 0.06, 0.06, len, face, { detail: true });
  const fl = at(-depth / 2, 0); K.obox(M.concreteDark, fl[0], g + 0.02, fl[1], depth, 0.06, len, face);
  if (colliders) { const c = [at(0.2, -len / 2), at(0.2, len / 2), at(-depth - 0.15, len / 2), at(-depth - 0.15, -len / 2)]; colliders.push(K.colPoly(c, g - 1, g + 1.0)); }
}

// ---------- pools ----------
export function poolWaterTex(Lm, Wm, lanes, { along = 'u', col = '#3fb3d6' } = {}) {
  return fieldTexture(Lm, Wm, (P) => {
    const c = P.c; c.fillStyle = col; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    _seed = 11; for (let i = 0; i < 3000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,60,90,0.08)'; const x = rnd() * c.canvas.width, y = rnd() * c.canvas.height; c.fillRect(x, y, 6 + rnd() * 18, 1.5 + rnd() * 2); }
    const lw = along === 'u' ? Wm / lanes : Lm / lanes; c.fillStyle = 'rgba(16,38,72,0.75)';
    for (let k = 0; k < lanes; k++) {
      const m = -((along === 'u' ? Wm : Lm) / 2) + lw * (k + 0.5);
      if (along === 'u') { c.fillRect(P.X(-Lm / 2 + 2), P.Y(m - 0.13), (Lm - 4) * P.s, 0.26 * P.s); for (const e of [-1, 1]) c.fillRect(P.X(e * (Lm / 2 - 2) - 0.5), P.Y(m - 0.5), 1.0 * P.s, 1.0 * P.s); }
      else { c.fillRect(P.X(m - 0.13), P.Y(-Wm / 2 + 2), 0.26 * P.s, (Wm - 4) * P.s); for (const e of [-1, 1]) c.fillRect(P.X(m - 0.5), P.Y(e * (Wm / 2 - 2) - 0.5), 1.0 * P.s, 1.0 * P.s); }
    }
  }, { pxm: 10, maxPx: 1024 });
}
// Pool: water rectangle (u0..u1, v0..v1) with deck slab around it, lane ropes, starting blocks. Water sits just above terrain.
export function pool(K, S, M, { u0, u1, v0, v1, lanes = 8, along = 'u', deck = 3, deckH = 0.3, blocks = 'u0', y = null, waterTex = null, ropes = true, colliders = null, walkables = null }) {
  const g = y ?? Math.max(K.g(u0, v0), K.g(u1, v0), K.g(u0, v1), K.g(u1, v1)); const yw = g + deckH - 0.22, yd = g + deckH;
  const Lm = u1 - u0, Wm = v1 - v0;
  const tex = waterTex || poolWaterTex(Lm, Wm, lanes, { along });
  const wmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.06, metalness: 0.15, envMapIntensity: 1.2, transparent: true, opacity: 0.93 });
  const wg = new THREE.PlaneGeometry(Lm, Wm); wg.rotateX(-Math.PI / 2); wg.translate((u0 + u1) / 2, yw, (v0 + v1) / 2); K.add(wmat, wg, { uvMode: 'keep' });
  // deck ring with the hole
  const ring = rectRing(u0 - deck, v0 - deck, u1 + deck, v1 + deck);
  K.prism(S.deck, ring, g - 1.0, yd, {}, [rectRing(u0, v0, u1, v1)]);
  // coping + gutter (tile band inside the pool edge)
  for (const [a, b, c, d] of [[u0, v0 - 0.0, u1, v0 + 0.3], [u0, v1 - 0.3, u1, v1], [u0, v0, u0 + 0.3, v1], [u1 - 0.3, v0, u1, v1]]) K.box(S.poolTile, a, yw - 0.3, b, c, yd - 0.04, d);
  if (ropes) {
    const n = lanes; const lw = (along === 'u' ? Wm : Lm) / n;
    for (let k = 1; k < n; k++) {
      const m = (along === 'u' ? v0 : u0) + lw * k;
      const L = along === 'u' ? Lm : Wm; const seg = 24;
      for (let i = 0; i < seg; i++) { const t0 = i / seg, t1 = (i + 1) / seg; const mat = (i < 2 || i >= seg - 2) ? S.navy : i % 2 ? S.gold : S.goalWhite;
        if (along === 'u') K.box(mat, u0 + L * t0, yw - 0.04, m - 0.06, u0 + L * t1, yw + 0.07, m + 0.06, { detail: true }); else K.box(mat, m - 0.06, yw - 0.04, v0 + L * t0, m + 0.06, yw + 0.07, v0 + L * t1, { detail: true }); }
    }
  }
  if (blocks) { // starting blocks at one or both ends
    const ends = blocks === 'both' ? ['a', 'b'] : [blocks === 'u1' || blocks === 'v1' ? 'b' : 'a'];
    const n = lanes; const lw = (along === 'u' ? Wm : Lm) / n;
    for (const e of ends) for (let k = 0; k < n; k++) {
      const m = (along === 'u' ? v0 : u0) + lw * (k + 0.5);
      if (along === 'u') { const uu = e === 'a' ? u0 - 0.45 : u1 + 0.45; K.box(S.goalWhite, uu - 0.3, yd, m - 0.27, uu + 0.3, yd + 0.7, m + 0.27); K.box(S.navy, uu - 0.32, yd + 0.7, m - 0.29, uu + 0.32, yd + 0.76, m + 0.29); }
      else { const vv = e === 'a' ? v0 - 0.45 : v1 + 0.45; K.box(S.goalWhite, m - 0.27, yd, vv - 0.3, m + 0.27, yd + 0.7, vv + 0.3); K.box(S.navy, m - 0.29, yd + 0.7, vv - 0.32, m + 0.29, yd + 0.76, vv + 0.32); }
    }
  }
  if (walkables) walkables.push({ ...K.walkFn(u0 - deck, v0 - deck, u1 + deck, v1 + deck, (u, v) => (u >= u0 - deck && u <= u1 + deck && v >= v0 - deck && v <= v1 + deck && !(u > u0 && u < u1 && v > v0 && v < v1)) ? yd : null) });
  if (colliders) colliders.push(K.colPoly(rectRing(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2), yw - 3, yw + 0.3));
  return { yw, yd };
}

// ---------- LiDAR helpers ----------
export function lidarAt(packet) { const lt = packet.lidarTop; return (x, z) => { const i = Math.round((z - lt.z0) / lt.step), j = Math.round((x - lt.x0) / lt.step); if (i < 0 || j < 0 || i >= lt.nz || j >= lt.nx) return NaN; return lt.h[i][j]; }; }
// Find thin tall spikes (light poles) in the LiDAR: local maxima > minH above ground with a small crown. Returns [[x,z,hAboveGround]]
export function findPoles(packet, groundAt, { minH = 12, inside = null, maxCells = 40 } = {}) {
  const lt = packet.lidarTop; const out = [];
  for (let i = 2; i < lt.nz - 2; i++) for (let j = 2; j < lt.nx - 2; j++) {
    const x = lt.x0 + j * lt.step, z = lt.z0 + i * lt.step; if (inside && !inside(x, z)) continue;
    const h = lt.h[i][j] - groundAt(x, z); if (h < minH) continue;
    let isMax = true, cnt = 0;
    for (let di = -8; di <= 8 && isMax; di++) for (let dj = -8; dj <= 8; dj++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= lt.nz || jj >= lt.nx) continue; const hh = lt.h[ii][jj] - groundAt(lt.x0 + jj * lt.step, lt.z0 + ii * lt.step); if (hh > h + 1e-6) { isMax = false; break; } if (hh > h - 6) cnt++; }
    if (isMax && cnt <= maxCells) out.push([x, z, h, cnt]);
  }
  // dedupe within 4 m
  const res = []; for (const p of out.sort((a, b) => b[2] - a[2])) if (!res.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 4)) res.push(p);
  return res;
}
export function signTex(str, { w = 1024, h = 128, bg = '#003262', fg = '#fdb515', font = 'bold', family = 'Arial, Helvetica, sans-serif', size = 0.62 } = {}) {
  return canvasTex(w, h, (c, W, H) => { if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); } else c.clearRect(0, 0, W, H); c.fillStyle = fg; c.font = `${font} ${Math.round(H * size)}px ${family}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, W / 2, H * 0.54); });
}
// Flat sign panel facing angle `face` (building frame), centred at (u, y, v)
export function signPanel(K, tex, u, y, v, w, h, face, { transparent = false, emissive = 0.15 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent, alphaTest: transparent ? 0.3 : 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive });
  const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.PI / 2 - face); g.translate(u, y, v); K.add(mat, g, { uvMode: 'keep' });
}
