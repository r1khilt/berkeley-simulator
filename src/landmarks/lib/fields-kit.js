// fields kit (fields-east batch): helpers layered on b11-sports for the canyon / Clark Kerr / tennis venues.
// Everything is authored in a Kit building frame (u along the venue axis, v across, y up) and merged per material.
import * as THREE from 'three';
import { Kit, sportsMats, fieldTexture, paintGrass, pen, ln, rect, arc, dot, fillPoly, text, surfaceMat, drapePoly, rectRing, fieldUV,
  fence, netWall, lightTower, scoreboard, bleachers, deg, canvasTex, signTex, signPanel, paintTennis } from './b11-sports.js';
export { Kit, sportsMats, fieldTexture, paintGrass, pen, ln, rect, arc, dot, fillPoly, text, surfaceMat, drapePoly, rectRing, fieldUV, fence, netWall, lightTower, scoreboard, bleachers, deg, canvasTex, signTex, signPanel, paintTennis };

const _fm = new WeakMap();
// extra shared materials for this batch (one set per material library)
export function fieldsMats(M) {
  if (_fm.has(M)) return _fm.get(M);
  const std = (color, rough = 0.8, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  const F = {
    postGreen: std(0x1f3b2d, 0.6, 0.3), postBlack: std(0x1c1d1f, 0.5, 0.4), netBand: std(0xf2f2ee, 0.7),
    acrylic: std(0xf4f6f6, 0.35, 0.0), rim: std(0xe0531f, 0.45, 0.4), padNavy: std(0x132447, 0.75),
    canvasNavy: std(0x14254a, 0.85, 0, { side: THREE.DoubleSide }), canvasGold: std(0xf2b51c, 0.85, 0, { side: THREE.DoubleSide }),
    canvasWhite: std(0xf1efe8, 0.85, 0, { side: THREE.DoubleSide }), canvasTeal: std(0x2c7f86, 0.85, 0, { side: THREE.DoubleSide }),
    chairWhite: std(0xeeeeea, 0.55), chairBlue: std(0x2a63a8, 0.55), lifeguard: std(0xd9d4c4, 0.6),
    redwood: std(0x7a4a32, 0.85), cedar: std(0x8a6a4c, 0.85), seatBlue: std(0x2d47a3, 0.5), seatNavy: std(0x1b2b5c, 0.55),
    clay: std(0xb26b45, 1.0), warning: std(0x9b6a47, 1.0), concLight: std(0xd9d6cf, 0.9), stuccoBuff: std(0xd8ccb0, 0.92),
    roofGreen: std(0x3b4a3c, 0.8), glassDark: std(0x26313b, 0.2, 0.3), trimWhite: std(0xefefea, 0.6),
  };
  _fm.set(M, F); return F;
}

// Painted, draped field block centred at (cu,cv) in the Kit frame (LU along u, LV along v). Y(u,v) gives the surface height.
export function fieldBlock(K, { cu, cv, LU, LV, paint, Y, pxm = 14, maxEdge = 4, rough = 0.95, ring = null, holes = [] }) {
  const tex = fieldTexture(LU, LV, paint, { pxm });
  const mat = surfaceMat(tex, { rough });
  drapePoly(K, mat, ring || rectRing(cu - LU / 2, cv - LV / 2, cu + LU / 2, cv + LV / 2), { holes, maxEdge, yFn: Y, uvFn: fieldUV(cu, cv, LU, LV) });
  return mat;
}
// flat-ish surface function: never below terrain, never below `level`
export const levelY = (K, level, off = 0.06) => (u, v) => Math.max(K.g(u, v), level) + off;

// ---------- tennis ----------
export function tennisNet(K, S, F, u, v, rot, y) { // rot: court long-axis angle in the Kit frame; net runs across it
  const c = Math.cos(rot), s = Math.sin(rot); const at = (b) => [u - s * b, v + c * b]; const half = 6.4; // posts 0.914 m outside doubles
  for (const sg of [-1, 1]) { const p = at(sg * half); K.cyl(F.postGreen, p[0], y - 0.3, p[1], 0.05, 0.05, 1.37, 8); }
  const g = new THREE.PlaneGeometry(2 * half, 0.95); g.rotateY(-rot - Math.PI / 2); g.translate(u, y + 0.5, v); K.add(S.netBlack, g, { uvMode: 'keep', detail: true });
  const L = 2 * half; const band = new THREE.BoxGeometry(0.05, 0.07, L); band.rotateY(-rot); band.translate(u, y + 0.95, v); K.add(F.netBand, band);
  K.obox(F.netBand, u, y + 0.48, v, 0.05, 0.95, 0.05, rot, { detail: true });
}
// A fenced block of tennis courts. courts: [[cu, cv, rot]] (court centre, long-axis angle in Kit frame).
export function tennisBlock(K, S, M, F, { u0, v0, u1, v1, courts, level, inCol = '#2f5f9e', outCol = '#3f7a54', fenceH = 3.6, windH = 2.6, windMat = null, gaps = [], colliders = null, pxm = 12, logo = null }) {
  const LU = u1 - u0, LV = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; const Y = levelY(K, level, 0.07);
  fieldBlock(K, { cu, cv, LU, LV, Y, pxm, paint: (P) => {
    const c = P.c; c.fillStyle = outCol; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    for (let i = 0; i < 4000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.03)'; c.fillRect(Math.random() * c.canvas.width, Math.random() * c.canvas.height, 2, 2); }
    for (const [u, v, rot] of courts) paintTennis(P, { cu: u - cu, cv: v - cv, rot: rot, inCol, outCol: null });
    if (logo) logo(P);
  } });
  // concrete pad: its sides become the retaining wall where the terrain falls away
  pad(K, M.concrete, u0, v0, u1, v1, level + 0.03);
  for (const [u, v, rot] of courts) tennisNet(K, S, F, u, v, rot, level + 0.07);
  const ring = [[u0 + 0.15, v0 + 0.15], [u1 - 0.15, v0 + 0.15], [u1 - 0.15, v1 - 0.15], [u0 + 0.15, v1 - 0.15]];
  fence(K, S, ring, { h: fenceH, closed: true, every: 3, y: () => level + 0.05, wind: { h: windH, mat: windMat || S.windGreen }, gapAt: gaps, colliders });
  return { Y };
}

// Solid pad from below the lowest terrain under it up to `top` (sides read as a retaining wall on slopes), built in strips.
export function pad(K, mat, u0, v0, u1, v1, top, { strip = 6 } = {}) {
  const n = Math.max(1, Math.round((u1 - u0) / strip));
  for (let i = 0; i < n; i++) { const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n; const gm = K.gMin(a, v0, b, v1, 4); K.box(mat, a, Math.min(gm, top - 0.3) - 0.6, v0, b, top, v1); }
}
// ---------- basketball ----------
export function basketballLines(P, { cu = 0, cv = 0, rot = 0, L = 28, W = 15, col = '#f4f4ef', key = '#9e3b2c', inCol = null }) {
  const c = P.c; c.save(); c.translate(P.X(cu), P.Y(cv)); c.rotate(rot); c.translate(-P.X(cu), -P.Y(cv));
  if (inCol) { c.fillStyle = inCol; c.fillRect(P.X(cu - L / 2), P.Y(cv - W / 2), L * P.s, W * P.s); }
  for (const s of [-1, 1]) { const x0 = cu + s * L / 2; const x1 = x0 - s * 5.8; if (key) fillPoly(P, [[x0, cv - 2.45], [x1, cv - 2.45], [x1, cv + 2.45], [x0, cv + 2.45]], key); }
  pen(P, col, 0.06); rect(P, cu - L / 2, cv - W / 2, cu + L / 2, cv + W / 2); ln(P, cu, cv - W / 2, cu, cv + W / 2); arc(P, cu, cv, 1.8);
  for (const s of [-1, 1]) {
    const x0 = cu + s * L / 2, x1 = x0 - s * 5.8; rect(P, Math.min(x0, x1), cv - 2.45, Math.max(x0, x1), cv + 2.45);
    if (s < 0) arc(P, x1, cv, 1.8, -Math.PI / 2, Math.PI / 2); else arc(P, x1, cv, 1.8, Math.PI / 2, 1.5 * Math.PI);
    const hx = x0 - s * 1.575; const t = Math.asin(6.6 / 6.75); // three-point line
    if (s < 0) arc(P, hx, cv, 6.75, -t, t); else arc(P, hx, cv, 6.75, Math.PI - t, Math.PI + t);
    for (const sv of [-1, 1]) ln(P, x0, cv + sv * 6.6, hx + (s < 0 ? 1 : -1) * Math.cos(t) * 6.75, cv + sv * 6.6);
  }
  c.restore();
}
// hoop on a gooseneck pole at the court end (u,v); faces the court along angle `face` (Kit frame)
export function hoop(K, S, F, u, v, face, y) {
  const c = Math.cos(face), s = Math.sin(face); const P = (a) => [u + c * a, v + s * a];
  const p = P(-1.2); K.cyl(F.postBlack, p[0], y - 0.5, p[1], 0.09, 0.08, 3.9, 8);
  const arm = P(-0.55); K.obox(F.postBlack, arm[0], y + 3.25, arm[1], 1.3, 0.1, 0.1, face);
  const bb = P(0.0); K.obox(F.acrylic, bb[0], y + 3.4, bb[1], 0.04, 1.05, 1.8, face);
  const r = P(0.38); const tor = new THREE.TorusGeometry(0.23, 0.018, 6, 16); tor.rotateX(Math.PI / 2); tor.translate(r[0], y + 3.05, r[1]); K.add(F.rim, tor, { detail: true });
  const net = new THREE.CylinderGeometry(0.23, 0.15, 0.42, 12, 1, true); net.translate(r[0], y + 2.84, r[1]); K.add(S.netWhite, net, { uvMode: 'keep', detail: true });
}

// ---------- pool furniture ----------
export function umbrella(K, F, u, v, y, mat, { r = 1.3, h = 2.3 } = {}) {
  K.cyl(F.trimWhite, u, y, v, 0.025, 0.025, h, 6, { detail: true });
  const g = new THREE.ConeGeometry(r, 0.45, 8, 1, true); g.translate(u, y + h - 0.1, v); K.add(mat, g, { uvMode: 'keep' });
}
export function lounger(K, F, u, v, y, rot, mat) {
  K.obox(mat || F.chairWhite, u, y + 0.32, v, 1.8, 0.06, 0.62, rot);
  const c = Math.cos(rot), s = Math.sin(rot); const b = [u - c * 0.75, v - s * 0.75];
  const g = new THREE.BoxGeometry(0.6, 0.06, 0.62); g.rotateZ(-0.7); g.rotateY(-rot); g.translate(b[0], y + 0.55, b[1]); K.add(mat || F.chairWhite, g, { detail: true });
  for (const a of [-0.8, 0.8]) for (const w of [-0.26, 0.26]) K.obox(F.postBlack, u + c * a - s * w, y + 0.15, v + s * a + c * w, 0.04, 0.3, 0.04, rot, { detail: true });
}
export function lifeguardChair(K, S, F, u, v, y, face) {
  const c = Math.cos(face), s = Math.sin(face);
  for (const a of [-0.35, 0.35]) for (const w of [-0.35, 0.35]) K.cyl(F.lifeguard, u + c * a - s * w, y, v + s * a + c * w, 0.04, 0.04, 1.9, 6, { detail: true });
  K.obox(F.lifeguard, u, y + 1.9, v, 0.8, 0.08, 0.8, face); K.obox(F.lifeguard, u - c * 0.36, y + 2.3, v - s * 0.36, 0.08, 0.8, 0.8, face);
  umbrella(K, F, u, v, y + 1.9, F.canvasWhite, { r: 0.9, h: 1.6 });
}
// simple lit light pole (single head) for courts / paths
export function polePair(K, S, M, F, u, v, y, face, h = 10) {
  K.cyl(F.postBlack, u, y - 0.4, v, 0.12, 0.08, h + 0.4, 8);
  const c = Math.cos(face), s = Math.sin(face);
  K.obox(S.housing, u + c * 0.5, y + h - 0.1, v + s * 0.5, 1.0, 0.18, 0.6, face);
  K.obox(M.lampGlow, u + c * 0.5, y + h - 0.21, v + s * 0.5, 0.9, 0.03, 0.5, face);
}
// a row of flags / banner on a pole
export function flagPole(K, F, M, u, v, y, h = 9, mat = null) {
  K.cyl(F.trimWhite, u, y, v, 0.06, 0.04, h, 8);
  const g = new THREE.PlaneGeometry(1.8, 1.1); g.translate(0.95, 0, 0); g.translate(u, y + h - 0.7, v); K.add(mat || F.canvasNavy, g, { uvMode: 'keep', detail: true });
}
