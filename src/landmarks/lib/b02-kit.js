// b02 (west campus) helpers on top of classic-kit: polygon façades, flat roofs with parapets, tile hip roofs with
// exposed rafter tails / brackets, greenhouses, simple modern curtain walls. Building frame (u,v,y) as in classic-kit.
import * as THREE from 'three';
import { Kit, corniceProfile, polysGeo } from './classic-kit.js';
export { Kit, corniceProfile, polysGeo };

const _tints = new Map();
// cached tinted clone of a shared material (keeps the texture, changes the base colour)
export function tint(mat, hex, extra = {}) {
  const key = mat.uuid + ':' + hex + JSON.stringify(extra);
  if (_tints.has(key)) return _tints.get(key);
  const m = mat.clone(); m.color = new THREE.Color(hex); Object.assign(m, extra); _tints.set(key, m); return m;
}
export function solid(hex, rough = 0.8, metal = 0) {
  const key = 'solid:' + hex + ':' + rough + ':' + metal;
  if (_tints.has(key)) return _tints.get(key);
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }); _tints.set(key, m); return m;
}
// polygon orientation so that K.run(a,b) faces outward (signed area < 0 in u-right / v-down coordinates)
export function orient(poly) { let a = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? poly.slice().reverse() : poly.slice(); }
export function rect(u0, v0, u1, v1) { return [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]; }
export function inPoly(u, v, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if (((p[i][1] > v) !== (p[j][1] > v)) && (u < (p[j][0] - p[i][0]) * (v - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0])) c = !c; } return c; }

// Walls with window bands on every edge of a polygon. stories: [{y0,y1,mat,win:{w,h,sill,mull,tran,arch}}]
// edge(i, R) may return false (skip the edge), or {nb, bay, stories, skip, plain}
export function polyWalls(K, poly, { stories, bay = 3.6, depth = 0.45, minLen = 2.4, edge = null, frame, glass } = {}) {
  poly = orient(poly); const runs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) continue;
    const R = K.run(a, b); const eo = edge ? edge(i, R) : null; if (eo === false) continue;
    const st = eo?.stories || stories;
    const nb = (R.L < minLen || eo?.plain) ? 0 : (eo?.nb ?? Math.max(1, Math.round(R.L / (eo?.bay || bay))));
    if (!nb) { for (const s of st) K.wall(R, s.mat, 0, R.L, s.y0, s.y1, [], depth); }
    else K.bands(R, 0, R.L, nb, st, { depth, skip: eo?.skip || [], frame: eo?.frame || frame, glass });
    R.idx = i; runs.push(R);
  }
  return runs;
}
// flat roof deck + parapet (with coping) around a polygon
export function flatRoof(K, poly, y, { mat, parapet = 0.9, coping, deck, th = 0.3 } = {}) {
  const M = K.M; poly = orient(poly);
  K.flat(deck || M.concreteDark, poly, y);
  K.prism(deck || M.concreteDark, poly, y - th, y);
  if (parapet > 0) K.loop(mat || M.concrete, poly, [[0.0, y - 0.05], [0.0, y + parapet], [-0.3, y + parapet], [-0.3, y]]);
  if (coping) K.loop(coping, poly, [[-0.35, y + parapet], [0.06, y + parapet], [0.06, y + parapet + 0.08], [-0.35, y + parapet + 0.08], [-0.35, y + parapet]]);
}
// simple moulded cornice / belt course all round a polygon
export function cornice(K, poly, mat, y, P = 0.6, H = 0.7) { K.loop(mat, orient(poly), corniceProfile(y, P, H)); }
export function belt(K, poly, mat, y, P = 0.12, H = 0.3) { K.loop(mat, orient(poly), [[0, y - H / 2], [P, y - H / 2], [P, y + H / 2], [0, y + H / 2]]); }

// Red-tile hip roof over a rectangle with soffit, fascia and (optional) rafter tails / brackets under the eave.
export function tileHip(K, u0, v0, u1, v1, yE, { slope = 0.42, ov = 0.9, tails = 0, tailMat, fascia, yTop = Infinity, hipU = true, hipV = true } = {}) {
  const M = K.M; const tm = tailMat || M.woodDark;
  const top = K.hip(M.redTile, u0 - ov, v0 - ov, u1 + ov, v1 + ov, yE, slope, { yTop, hipU, hipV });
  // soffit (underside) + fascia board
  K.box(fascia || tm, u0 - ov, yE - 0.2, v0 - ov, u1 + ov, yE + 0.02, v1 + ov);
  if (tails > 0) { // rafter tails / brackets along all four eaves
    const mk = (a0, a1, fixed, alongU, sgn) => { const n = Math.max(1, Math.floor((a1 - a0) / tails)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; if (alongU) K.box(tm, a - 0.07, yE - 0.42, Math.min(fixed, fixed + sgn * ov * 0.9), a + 0.07, yE - 0.18, Math.max(fixed, fixed + sgn * ov * 0.9), { detail: true }); else K.box(tm, Math.min(fixed, fixed + sgn * ov * 0.9), yE - 0.42, a - 0.07, Math.max(fixed, fixed + sgn * ov * 0.9), yE - 0.18, a + 0.07, { detail: true }); } };
    mk(u0, u1, v0, true, -1); mk(u0, u1, v1, true, 1); mk(v0, v1, u0, false, -1); mk(v0, v1, u1, false, 1);
  }
  return top;
}
// Greenhouse: glazed gable (ridge along u) on low wall, with white mullions every `pitch` m. Returns nothing.
export function greenhouse(K, u0, v0, u1, v1, y0, wallH, rise, { pitch = 1.2, wallMat, glassMat, frameMat, ridgeVent = true } = {}) {
  const M = K.M; const gl = glassMat || M.glassLight; const fr = frameMat || M.whitePaint; const wm = wallMat || M.concrete;
  const yw = y0 + wallH, kneeH = 0.8;
  // knee wall
  K.box(wm, u0, y0 - 0.8, v0, u1, y0 + kneeH, v0 + 0.2); K.box(wm, u0, y0 - 0.8, v1 - 0.2, u1, y0 + kneeH, v1);
  K.box(wm, u0, y0 - 0.8, v0, u0 + 0.2, y0 + kneeH, v1); K.box(wm, u1 - 0.2, y0 - 0.8, v0, u1, y0 + kneeH, v1);
  // glazed side walls
  K.box(gl, u0 + 0.05, y0 + kneeH, v0 + 0.05, u1 - 0.05, yw, v0 + 0.1); K.box(gl, u0 + 0.05, y0 + kneeH, v1 - 0.1, u1 - 0.05, yw, v1 - 0.05);
  K.box(gl, u0 + 0.05, y0 + kneeH, v0 + 0.1, u0 + 0.1, yw, v1 - 0.1); K.box(gl, u1 - 0.1, y0 + kneeH, v0 + 0.1, u1 - 0.05, yw, v1 - 0.1);
  // glazed roof (two slopes) + gable-end glass triangles
  const vm = (v0 + v1) / 2, yR = yw + rise;
  K.add(gl, polysGeo([[[u0, yw, v0], [u0, yR, vm], [u1, yR, vm], [u1, yw, v0]], [[u1, yw, v1], [u1, yR, vm], [u0, yR, vm], [u0, yw, v1]], [[u0, yw, v1], [u0, yR, vm], [u0, yw, v0]], [[u1, yw, v0], [u1, yR, vm], [u1, yw, v1]]]));
  // frame members: rafters/posts every pitch, eave + ridge beams
  const n = Math.max(1, Math.round((u1 - u0) / pitch)); const hw = (v1 - v0) / 2; const rl = Math.hypot(hw, rise); const ang = Math.atan2(rise, hw);
  for (let i = 0; i <= n; i++) {
    const u = u0 + (u1 - u0) * i / n;
    K.box(fr, u - 0.04, y0 + kneeH, v0 - 0.02, u + 0.04, yw, v0 + 0.12, { detail: true }); K.box(fr, u - 0.04, y0 + kneeH, v1 - 0.12, u + 0.04, yw, v1 + 0.02, { detail: true });
    for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.08, 0.08, rl); g.rotateX(s * ang); g.translate(u, yw + rise / 2 + 0.03, vm - s * hw / 2); K.add(fr, g, { detail: true }); }
  }
  const nv = Math.max(1, Math.round((v1 - v0) / pitch));
  for (let j = 0; j <= nv; j++) { const v = v0 + (v1 - v0) * j / nv; const hh = yw + rise * (1 - Math.abs(v - vm) / hw); for (const u of [u0, u1]) K.box(fr, u - 0.06, y0 + kneeH, v - 0.04, u + 0.06, hh, v + 0.04, { detail: true }); }
  K.box(fr, u0, yw - 0.06, v0 - 0.04, u1, yw + 0.06, v0 + 0.14); K.box(fr, u0, yw - 0.06, v1 - 0.14, u1, yw + 0.06, v1 + 0.04);
  K.box(fr, u0, y0 + kneeH - 0.05, v0 - 0.03, u1, y0 + kneeH + 0.05, v0 + 0.13, { detail: true }); K.box(fr, u0, y0 + kneeH - 0.05, v1 - 0.13, u1, y0 + kneeH + 0.05, v1 + 0.03, { detail: true });
  K.box(fr, u0, yR - 0.08, vm - 0.12, u1, yR + 0.12, vm + 0.12);
  if (ridgeVent) { // continuous ridge vent sash propped open on one side
    const g = new THREE.BoxGeometry(u1 - u0 - 0.4, 0.04, 0.9); g.rotateX(-ang * 0.6); g.translate((u0 + u1) / 2, yR - 0.05, vm + 0.5); K.add(gl, g);
  }
}
// Curtain wall on a run: glass panel s0..s1 x y0..y1 with mullion grid (pitch along, rows up), recessed rev.
export function curtain(K, R, s0, s1, y0, y1, { pitch = 1.5, rows = [], rev = 0.1, glass, frame, depth = 0.12 } = {}) {
  const M = K.M; glass = glass || M.glass; frame = frame || M.darkBronze;
  K.rbox(R, glass, s0, y0, -rev - 0.04, s1, y1, -rev);
  const n = Math.max(1, Math.round((s1 - s0) / pitch));
  for (let i = 0; i <= n; i++) { const s = s0 + (s1 - s0) * i / n; K.rbox(R, frame, s - 0.04, y0, -rev, s + 0.04, y1, -rev + depth, { detail: i > 0 && i < n }); }
  for (const y of [y0, ...rows, y1]) K.rbox(R, frame, s0, y - 0.05, -rev, s1, y + 0.05, -rev + depth, { detail: y !== y0 && y !== y1 });
}
// Seat a rectangular plinth/foundation from below ground up to y.
export function footing(K, mat, poly, y, below = 1.5) { const gmin = Math.min(...poly.map(([u, v]) => K.g(u, v))); K.prism(mat, orient(poly), gmin - below, y); }
// Incised/raised lettering panel on a run (canvas texture). Letters darker than the stone, as weathered incised capitals.
export function inscription(K, R, s0, s1, y0, y1, d, text, { bg = '#e2dccd', fg = '#8f8572', font = 'Georgia, serif', weight = '600', spacing = 0.18, cut = false } = {}) {
  const W = 2048, H = Math.max(64, Math.round(W * (y1 - y0) / (s1 - s0)));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  if (!cut) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  let fs = H * 0.72; g.font = `${weight} ${fs}px ${font}`;
  const sp = text.split('').join(String.fromCharCode(8202).repeat(Math.round(spacing * 10)));
  let tw = g.measureText(sp).width; if (tw > W * 0.96) { fs *= W * 0.96 / tw; g.font = `${weight} ${fs}px ${font}`; tw = g.measureText(sp).width; }
  g.textBaseline = 'middle'; g.textAlign = 'center';
  if (!cut) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText(sp, W / 2 + 2, H / 2 + 3); }
  g.fillStyle = fg; g.fillText(sp, W / 2, H / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, transparent: false, alphaTest: cut ? 0.5 : 0 });
  const pg = new THREE.PlaneGeometry(s1 - s0, y1 - y0); pg.translate((s0 + s1) / 2, (y0 + y1) / 2, d);
  K.addRun(R, m, pg, { uvMode: 'keep' });
}
// inward-facing walls around a courtyard polygon (hole)
export function courtWalls(K, poly, opts) { const p = orient(poly).reverse(); return polyWallsRaw(K, p, opts); }
function polyWallsRaw(K, poly, { stories, bay = 3.6, depth = 0.45, minLen = 2.4, frame, glass } = {}) {
  const runs = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); if (R.L < minLen) { for (const s of stories) K.wall(R, s.mat, 0, R.L, s.y0, s.y1, [], depth); continue; } K.bands(R, 0, R.L, Math.max(1, Math.round(R.L / bay)), stories, { depth, frame, glass }); runs.push(R); }
  return runs;
}

// ---------- hip roof over any CONVEX polygon (lower envelope of the eave planes) ----------
// poly: building-frame [[u,v],...] (any orientation). yE: eave height at the (overhung) eave line. slope: rise/run.
// opts: ov (overhang), yTop (flat deck cap), gables: edge indices that get vertical gable walls instead of a slope, wallMat.
export function hipPoly(K, poly, yE, slope, { ov = 0.8, yTop = Infinity, gables = [], mat, wallMat, soffit, uvMode = 'roof' } = {}) {
  const M = K.M; mat = mat || M.redTile; poly = orient(poly); const n = poly.length;
  // inward unit normals: for our orientation (signed area < 0) the outward normal of run a->b is (-t.v, t.u), so inward = (t.v, -t.u)
  const lines = poly.map((a, i) => { const b = poly[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; const inw = [t[1], -t[0]]; return { a, t, inw }; });
  // offset outward by ov
  const off = lines.map((l) => ({ ...l, a: [l.a[0] - l.inw[0] * ov, l.a[1] - l.inw[1] * ov] }));
  const isect = (l1, l2) => { const d = l1.t[0] * l2.t[1] - l1.t[1] * l2.t[0]; if (Math.abs(d) < 1e-9) return [l2.a[0], l2.a[1]]; const s = ((l2.a[0] - l1.a[0]) * l2.t[1] - (l2.a[1] - l1.a[1]) * l2.t[0]) / d; return [l1.a[0] + l1.t[0] * s, l1.a[1] + l1.t[1] * s]; };
  const P = off.map((l, i) => isect(off[(i - 1 + n) % n], l));
  const dist = (l, p) => (p[0] - l.a[0]) * l.inw[0] + (p[1] - l.a[1]) * l.inw[1];
  const live = off.map((l, i) => !gables.includes(i));
  const h = (i, p) => yE + slope * dist(off[i], p);
  const clip = (pts, f) => { const out = []; for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; const fp = f(p), fq = f(q); if (fp <= 0) out.push(p); if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } } return out; };
  const faces = [];
  for (let i = 0; i < n; i++) {
    if (!live[i]) continue;
    let R = P.slice();
    for (let j = 0; j < n && R.length >= 3; j++) if (j !== i && live[j]) R = clip(R, (p) => dist(off[i], p) - dist(off[j], p));
    if (isFinite(yTop)) R = clip(R, (p) => h(i, p) - yTop);
    if (R.length >= 3) faces.push(R.map((p) => [p[0], h(i, p), p[1]]));
  }
  // orient every face upward (Newell normal), drop degenerate ones
  const up = []; for (const f of faces) { let ny = 0; for (let k = 0; k < f.length; k++) { const p = f[k], q = f[(k + 1) % f.length]; ny += (p[2] - q[2]) * (p[0] + q[0]); } if (Math.abs(ny) < 1e-6) continue; up.push(ny < 0 ? f.slice().reverse() : f); }
  const geo = polysGeo(up);
  K.add(mat, geo, { uvMode });
  if (isFinite(yTop)) { let T = P.slice(); for (let j = 0; j < n; j++) if (live[j]) T = clip(T, (p) => yTop - h(j, p)); if (T.length >= 3) K.flat(mat, T, yTop); }
  // gable walls: vertical triangles/trapezoids under the roof along gable edges
  for (const gi of gables) {
    const a = P[gi], b = P[(gi + 1) % n]; const N = 24; const pts = [];
    for (let k = 0; k <= N; k++) { const p = [a[0] + (b[0] - a[0]) * k / N, a[1] + (b[1] - a[1]) * k / N]; let y = Infinity; for (let j = 0; j < n; j++) if (live[j]) y = Math.min(y, h(j, p)); pts.push([p, Math.min(y, yTop)]); }
    const tri = []; for (let k = 0; k < N; k++) { const [p, y0] = pts[k], [q, y1] = pts[k + 1]; tri.push([[p[0], yE, p[1]], [q[0], yE, q[1]], [q[0], y1, q[1]], [p[0], y0, p[1]]]); }
    K.add(wallMat || M.stucco, polysGeo(tri)); K.add(wallMat || M.stucco, polysGeo(tri.map((f) => f.slice().reverse())));
  }
  if (soffit !== false) K.flat(soffit || M.woodDark, P, yE - 0.12, [], true);
  return P;
}

// ---------- Howard-era Beaux-Arts block: stone/stucco walls, granite base, belt + cornice ----------
// spec: {poly, FL, levels:[y...] (floor-to-floor boundaries from FL up to the frieze), eave, mat, baseMat, win(level)->win|null,
//        bay, edge(i,R), cornice:{P,H,mat}, frieze}
export function stoneBlock(K, sp) {
  const M = K.M; const poly = orient(sp.poly); const mat = sp.mat || M.granite, baseMat = sp.baseMat || M.graniteDark;
  const g0 = Math.min(...poly.map(([u, v]) => K.g(u, v))) - 1.5;
  const lv = sp.levels; const stories = [{ y0: g0, y1: sp.FL, mat: baseMat, win: sp.baseWin || null }];
  for (let k = 0; k < lv.length - 1; k++) stories.push({ y0: lv[k], y1: lv[k + 1], mat, win: sp.win ? sp.win(k) : { w: 1.3, h: 2.1, sill: 0.9, mull: 1, muntins: 2 } });
  if (lv[lv.length - 1] < sp.eave) stories.push({ y0: lv[lv.length - 1], y1: sp.eave, mat: sp.friezeMat || mat, win: null });
  const runs = polyWalls(K, poly, { stories, bay: sp.bay || 3.6, edge: sp.edge, frame: sp.frame, depth: sp.depth ?? 0.45 });
  belt(K, poly, baseMat, sp.FL, 0.14, 0.3);
  if (sp.belts) for (const y of sp.belts) belt(K, poly, sp.beltMat || mat, y, 0.1, 0.22);
  const c = sp.cornice || {}; if (c !== false) cornice(K, poly, c.mat || mat, sp.eave, c.P ?? 0.55, c.H ?? 0.7);
  return runs;
}
// ring of small dentil blocks under a cornice around a polygon
export function dentils(K, poly, mat, y, { pitch = 0.36, size = 0.16, P = 0.18 } = {}) {
  poly = orient(poly);
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const R = K.run(a, b); for (let s = 0.2; s < R.L - 0.2; s += pitch) K.rbox(R, mat, s, y - size, 0, s + size * 0.75, y, P, { detail: true }); }
}
